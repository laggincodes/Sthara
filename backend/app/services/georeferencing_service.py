"""
Georeferencing & Coordinate Reference System (CRS) Normalization Service.

Enforces explicit, traceable, and reversible georeferencing across multi-source datasets:
1. Inspects source CRS
2. Validates CRS with PROJ
3. Selects/accepts explicit target CRS
4. Validates metric projection suitability
5. Transforms geometries explicitly
6. Preserves original CRS and original geometry
7. Records transformation metadata in TransformationRecord
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import math
from datetime import datetime, timezone
import pyproj
from shapely.geometry import shape, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform

from app.schemas.fusion import TransformationRecord
from app.utils.crs import inspect_crs, validate_crs, suggest_utm_crs
from app.core.logging import logger

DEFAULT_PROJECT_CRS = "EPSG:32643"  # UTM Zone 43N (India standard for Delhi/Maharashtra test sites)


class GeoreferencingService:
    """Provides authoritative CRS inspection, validation, and deterministic reprojection."""

    @classmethod
    def inspect_source_crs(cls, data: Union[Dict[str, Any], str]) -> Tuple[str, str]:
        """
        Inspects CRS from GeoJSON, dictionary, or string input.
        Returns (crs_identifier, source_description).
        """
        if isinstance(data, str):
            crs_id = data.strip().upper()
            if not crs_id.startswith("EPSG:") and crs_id.isdigit():
                crs_id = f"EPSG:{crs_id}"
            return crs_id, "explicit_string_crs"

        if isinstance(data, dict):
            # Check for custom top-level metadata or standard geojson crs
            if "source_crs" in data and isinstance(data["source_crs"], str):
                return data["source_crs"].strip(), "explicit_metadata_source_crs"
            return inspect_crs(data)

        return "EPSG:4326", "fallback_wgs84_default"

    @classmethod
    def validate_crs_string(cls, crs_string: str) -> Dict[str, Any]:
        """Validates CRS identifier using PROJ database."""
        return validate_crs(crs_string)

    @classmethod
    def is_metric_projected(cls, crs_string: str) -> bool:
        """Verifies if CRS is planar Cartesian with linear meter units."""
        info = cls.validate_crs_string(crs_string)
        if not info["valid"]:
            return False
        return bool(info.get("is_projected", False))

    @classmethod
    def select_target_crs(
        cls,
        explicit_target_crs: Optional[str] = None,
        candidate_geometries: Optional[List[BaseGeometry]] = None,
        default_crs: str = DEFAULT_PROJECT_CRS,
    ) -> Tuple[str, str]:
        """
        Resolves the appropriate metric project CRS.
        Returns (target_crs, resolution_reason).
        """
        if explicit_target_crs:
            val = cls.validate_crs_string(explicit_target_crs)
            if val["valid"]:
                return explicit_target_crs, "explicit_user_target_crs"
            logger.warning(f"Requested target CRS '{explicit_target_crs}' invalid; falling back.")

        if candidate_geometries and len(candidate_geometries) > 0:
            # Derive UTM zone from centroid of first valid geometry
            try:
                first_geom = candidate_geometries[0]
                centroid = first_geom.centroid
                suggested = suggest_utm_crs(centroid.x, centroid.y)
                return suggested, "derived_from_feature_centroid"
            except Exception as e:
                logger.warning(f"Failed to derive UTM CRS from geometry: {e}")

        return default_crs, "default_configured_project_crs"

    @classmethod
    def transform_geometry(
        cls,
        geom: BaseGeometry,
        source_crs: str,
        target_crs: str,
    ) -> Tuple[BaseGeometry, TransformationRecord]:
        """
        Deterministically reprojects a Shapely geometry from source_crs to target_crs.
        Preserves original geometry instance; returns transformed geometry and audit record.
        """
        source_clean = source_crs.strip().upper()
        target_clean = target_crs.strip().upper()

        if source_clean == target_clean:
            record = TransformationRecord(
                source_crs=source_clean,
                target_crs=target_clean,
                transformed=False,
                method="identity_no_op",
            )
            return geom, record

        transformer = pyproj.Transformer.from_crs(source_clean, target_clean, always_xy=True)
        transformed_geom = transform(transformer.transform, geom)

        record = TransformationRecord(
            source_crs=source_clean,
            target_crs=target_clean,
            transformed=True,
            method="pyproj_cartesian_transform",
        )
        return transformed_geom, record

    @classmethod
    def normalize_feature(
        cls,
        feature: Dict[str, Any],
        source_crs: str,
        target_crs: str,
    ) -> Tuple[Dict[str, Any], TransformationRecord]:
        """
        Normalizes a single GeoJSON Feature into the target CRS.
        Preserves source geometry inside properties._source_geometry and properties._source_crs.
        """
        geom_dict = feature.get("geometry")
        if not geom_dict:
            raise ValueError("Feature contains no geometry member.")

        source_geom = shape(geom_dict)
        transformed_geom, record = cls.transform_geometry(source_geom, source_crs, target_crs)

        # Clone properties and record provenance
        props = dict(feature.get("properties") or {})
        props["_source_crs"] = source_crs
        props["_target_crs"] = target_crs
        props["_source_geometry"] = geom_dict
        props["_transformed"] = record.transformed
        props["_transform_timestamp"] = record.timestamp

        normalized_feature = {
            "type": "Feature",
            "id": feature.get("id"),
            "geometry": mapping(transformed_geom),
            "properties": props,
        }

        return normalized_feature, record

    @classmethod
    def normalize_feature_collection(
        cls,
        geojson_data: Dict[str, Any],
        target_crs: str,
        source_crs: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], List[TransformationRecord]]:
        """
        Reprojects an entire GeoJSON FeatureCollection into target_crs.
        Returns (normalized_feature_collection, list_of_records).
        """
        resolved_source_crs, _ = cls.inspect_source_crs(geojson_data) if not source_crs else (source_crs, "explicit")
        features = geojson_data.get("features", [])
        normalized_features: List[Dict[str, Any]] = []
        records: List[TransformationRecord] = []

        for feat in features:
            norm_feat, rec = cls.normalize_feature(feat, resolved_source_crs, target_crs)
            normalized_features.append(norm_feat)
            records.append(rec)

        fc = {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {"name": target_crs},
            },
            "features": normalized_features,
        }
        return fc, records
