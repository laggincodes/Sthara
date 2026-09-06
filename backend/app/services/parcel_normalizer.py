from typing import Dict, Any, List, Optional, Tuple
import uuid
from shapely.geometry import shape

from app.schemas.cadastre import (
    NormalizedParcel,
    NormalizedParcelDataset,
    GeoJSONValidationResult,
)

# Common field names representing parcel identifiers in Indian and international land records
CANDIDATE_ID_FIELDS = [
    "parcel_id",
    "parcelid",
    "parcel_no",
    "parcelno",
    "id",
    "survey_no",
    "survey_number",
    "surveyno",
    "khasra_no",
    "khasra",
    "plot_no",
    "plot_id",
    "pin",
    "ulpin",
    "lot_id",
    "cadastral_id",
    "gid",
]


class ParcelNormalizer:
    """Transforms validated GeoJSON into consistent, normalized internal parcel representations."""

    @staticmethod
    def resolve_parcel_id(
        feature: Dict[str, Any], index: int
    ) -> Tuple[str, bool, Optional[str]]:
        """
        Resolves a parcel identifier from feature properties or feature 'id'.
        Returns (parcel_id, is_system_generated, detected_field_name).
        """
        properties = feature.get("properties") or {}

        # 1. Search candidate property fields (case-insensitive)
        for candidate in CANDIDATE_ID_FIELDS:
            for key, value in properties.items():
                if key.lower() == candidate and value is not None and str(value).strip():
                    return str(value).strip(), False, key

        # 2. Check top-level feature 'id'
        feature_id = feature.get("id")
        if feature_id is not None and str(feature_id).strip():
            return str(feature_id).strip(), False, "__feature_id__"

        # 3. Fallback: Assign explicit, temporary system-generated identifier
        sys_id = f"SYS-PARCEL-{index + 1}"
        return sys_id, True, None

    @classmethod
    def normalize_dataset(
        cls,
        geojson_data: Dict[str, Any],
        validation_result: GeoJSONValidationResult,
        source_filename: Optional[str] = None,
        dataset_id: Optional[str] = None,
    ) -> NormalizedParcelDataset:
        """Normalizes all features in a validated GeoJSON dataset."""
        features = geojson_data.get("features", [])
        parcels: List[NormalizedParcel] = []
        is_projected = validation_result.crs_is_projected
        area_unit = "square_meters" if is_projected else "square_degrees"
        active_dataset_id = dataset_id or f"ds_{uuid.uuid4().hex[:10]}"

        for idx, feature in enumerate(features):
            parcel_id, is_sys, detected_field = cls.resolve_parcel_id(feature, idx)
            geometry = feature.get("geometry", {})
            properties = feature.get("properties") or {}
            
            shapely_geom = shape(geometry)
            bounds = (
                float(shapely_geom.bounds[0]),
                float(shapely_geom.bounds[1]),
                float(shapely_geom.bounds[2]),
                float(shapely_geom.bounds[3]),
            )
            area = float(shapely_geom.area)
            centroid = [float(shapely_geom.centroid.x), float(shapely_geom.centroid.y)]

            parcels.append(
                NormalizedParcel(
                    parcel_id=parcel_id,
                    is_system_generated_id=is_sys,
                    detected_id_field=detected_field,
                    geometry_type=geometry.get("type", "Unknown"),
                    geometry=geometry,
                    bounds=bounds,
                    area=area,
                    area_unit=area_unit,
                    centroid=centroid,
                    properties=properties,
                )
            )

        return NormalizedParcelDataset(
            dataset_id=active_dataset_id,
            source_filename=source_filename,
            crs=validation_result.crs,
            crs_source=validation_result.crs_source,
            total_parcels=len(parcels),
            parcels=parcels,
            validation=validation_result,
        )
