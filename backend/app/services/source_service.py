import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from shapely.geometry import shape
from shapely.validation import make_valid

from app.schemas.sources import (
    SpatialSource,
    SourceRegisterRequest,
    SourceStatus,
    SourceType,
)
from app.services.measurement_service import MeasurementService
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
SOURCES_REGISTRY_PATH = PROCESSED_DIR / "sources_registry.json"


def _clean_token(val: str) -> str:
    """Sanitizes dataset_id and source_id against path traversal attacks."""
    if not val:
        return ""
    if ".." in val or "/" in val or "\\" in val:
        raise ValueError("Invalid identifier: path traversal sequence detected.")
    return re.sub(r"[^a-zA-Z0-9_\-\.]", "_", val.strip())


def _make_source_key(dataset_id: str, source_id: str) -> str:
    return f"{dataset_id.strip()}:{source_id.strip()}"


class SourceService:
    """
    Authoritative domain service for registering, managing, and isolating spatial reference sources.
    Enforces strict 1-to-1 dataset-source ownership and validates reference geometries without
    converting arbitrary reference data into cadastral building or parcel records.
    """

    DEFAULT_WORKING_CRS = "EPSG:32643"  # UTM Zone 43N (Metric working CRS)

    @classmethod
    def _load_registry(cls) -> Dict[str, Dict[str, Any]]:
        """Loads persistent source registry, seeding defaults if file does not exist."""
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        if not SOURCES_REGISTRY_PATH.exists():
            default_registry = cls._build_default_seeds()
            cls._save_registry(default_registry)
            return default_registry

        try:
            with open(SOURCES_REGISTRY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception as e:
            logger.error(f"Failed to read sources_registry.json: {e}")
            return cls._build_default_seeds()

    @classmethod
    def _save_registry(cls, registry: Dict[str, Dict[str, Any]]) -> None:
        """Atomically saves sources registry to disk."""
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        temp_path = SOURCES_REGISTRY_PATH.with_suffix(".tmp")
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(registry, f, indent=2)
            temp_path.replace(SOURCES_REGISTRY_PATH)
        except Exception as e:
            logger.error(f"Failed to save sources_registry.json: {e}")
            if temp_path.exists():
                temp_path.unlink()

    @classmethod
    def _build_default_seeds(cls) -> Dict[str, Dict[str, Any]]:
        """Seeds initial verifiable sources for standard benchmark dataset."""
        now_iso = datetime.now(timezone.utc).isoformat()
        seeds = {
            "ds_tagore_garden_map_osm:SRC-OSM-TAGORE": {
                "source_id": "SRC-OSM-TAGORE",
                "dataset_id": "ds_tagore_garden_map_osm",
                "source_name": "OpenStreetMap Building Footprints",
                "source_type": SourceType.OSM.value,
                "file_name": "map.osm",
                "format": "OSM XML / GeoJSON",
                "crs": "EPSG:4326",
                "working_crs": cls.DEFAULT_WORKING_CRS,
                "feature_count": 155,
                "imported_at": now_iso,
                "status": SourceStatus.IMPORTED.value,
                "provenance": {
                    "source": "OpenStreetMap contributors (ODbL)",
                    "transformation": "EPSG:4326 -> EPSG:32643",
                    "transformation_status": "PASS",
                },
                "description": "Physical surface building observations extracted from OpenStreetMap.",
                "disclaimer": "This source represents reference spatial geometry only and does not establish legal ownership or title.",
            },
            "ds_tagore_garden_map_osm:SRC-DATAMEET-TAGORE": {
                "source_id": "SRC-DATAMEET-TAGORE",
                "dataset_id": "ds_tagore_garden_map_osm",
                "source_name": "DataMeet Delhi Assembly Boundary (AC 27)",
                "source_type": SourceType.DATAMEET.value,
                "file_name": "delhi_assembly_boundaries.geojson",
                "format": "GeoJSON",
                "crs": "EPSG:4326",
                "working_crs": cls.DEFAULT_WORKING_CRS,
                "feature_count": 1,
                "imported_at": now_iso,
                "status": SourceStatus.IMPORTED.value,
                "provenance": {
                    "source": "DataMeet Maps (ODbL / CC-BY 2.5 India)",
                    "transformation": "EPSG:4326 -> EPSG:32643",
                    "transformation_status": "PASS",
                },
                "description": "Administrative spatial reference boundary for Rajouri Garden / Tagore Garden.",
                "disclaimer": "This source represents reference spatial geometry only and does not establish legal ownership or title.",
            },
        }
        return seeds

    @classmethod
    def _features_path(cls, dataset_id: str, source_id: str) -> Path:
        clean_ds = _clean_token(dataset_id)
        clean_src = _clean_token(source_id)
        return PROCESSED_DIR / f"reference_features_{clean_ds}_{clean_src}.geojson"

    # =========================================================================
    # CORE SOURCE CRUD & VALIDATION
    # =========================================================================
    @classmethod
    def register_source(cls, req: SourceRegisterRequest) -> SpatialSource:
        """
        Registers a new spatial source associated with a dataset.
        Validates dataset, uniqueness, CRS, and optional GeoJSON features.
        """
        clean_ds = _clean_token(req.dataset_id)
        MeasurementService.validate_dataset_exists(clean_ds)

        # Generate source_id if not supplied
        clean_src = _clean_token(req.source_id) if req.source_id else ""
        if not clean_src:
            registry = cls._load_registry()
            existing_count = sum(1 for k in registry.keys() if k.startswith(f"{clean_ds}:"))
            clean_src = f"SRC-{existing_count + 1:03d}"

        source_key = _make_source_key(clean_ds, clean_src)
        registry = cls._load_registry()
        if source_key in registry:
            raise ValueError(f"Source with ID '{clean_src}' already exists in dataset '{clean_ds}'.")

        # CRS detection & validation
        input_crs = req.crs
        status = SourceStatus.VALID.value
        provenance: Dict[str, Any] = {
            "source_type": req.source_type,
            "working_crs": cls.DEFAULT_WORKING_CRS,
        }

        if not input_crs:
            # Check if inline features have CRS property
            if req.features and isinstance(req.features, dict):
                crs_prop = req.features.get("crs", {}).get("properties", {}).get("name")
                if crs_prop:
                    input_crs = str(crs_prop)

        if not input_crs:
            input_crs = "EPSG:4326 (Defaulted - missing from input)"
            status = SourceStatus.WARNING.value
            provenance["crs_warning"] = "Original CRS was unavailable and defaulted to EPSG:4326"
            provenance["transformation_status"] = "WARNING"
        else:
            provenance["transformation_status"] = "PASS"

        provenance["original_crs"] = input_crs

        # Handle features if attached
        feature_count = 0
        if req.features is not None:
            feature_count = cls._process_and_save_features(
                clean_ds, clean_src, req.features, req.source_type, input_crs
            )

        source_obj = SpatialSource(
            source_id=clean_src,
            dataset_id=clean_ds,
            source_name=req.source_name.strip(),
            source_type=req.source_type.strip(),
            file_name=req.file_name,
            format=req.format or "GeoJSON",
            crs=input_crs,
            working_crs=cls.DEFAULT_WORKING_CRS,
            feature_count=feature_count,
            imported_at=datetime.now(timezone.utc).isoformat(),
            status=status,
            provenance=provenance,
            description=req.description,
        )

        registry[source_key] = source_obj.model_dump()
        cls._save_registry(registry)
        return source_obj

    @classmethod
    def list_sources(cls, dataset_id: str) -> List[SpatialSource]:
        """Lists all spatial sources belonging to the specified dataset."""
        clean_ds = _clean_token(dataset_id)
        MeasurementService.validate_dataset_exists(clean_ds)
        registry = cls._load_registry()

        results: List[SpatialSource] = []
        for key, val in registry.items():
            if key.startswith(f"{clean_ds}:") or val.get("dataset_id") == clean_ds:
                results.append(SpatialSource(**val))
        return results

    @classmethod
    def get_source(cls, dataset_id: str, source_id: str) -> SpatialSource:
        """
        Retrieves a source by dataset_id and source_id.
        Rejects cross-dataset source access with ValueError.
        """
        clean_ds = _clean_token(dataset_id)
        clean_src = _clean_token(source_id)
        source_key = _make_source_key(clean_ds, clean_src)
        registry = cls._load_registry()

        if source_key not in registry:
            # Check if source exists in another dataset to produce specific isolation rejection
            for k, val in registry.items():
                if val.get("source_id") == clean_src and val.get("dataset_id") != clean_ds:
                    raise ValueError(f"Source '{clean_src}' does not belong to dataset '{clean_ds}'.")
            raise KeyError(f"Source '{clean_src}' not found in dataset '{clean_ds}'.")

        return SpatialSource(**registry[source_key])

    @classmethod
    def delete_source(cls, dataset_id: str, source_id: str) -> bool:
        """Deletes a source and its associated reference features."""
        clean_ds = _clean_token(dataset_id)
        clean_src = _clean_token(source_id)
        # Validates ownership
        cls.get_source(clean_ds, clean_src)

        source_key = _make_source_key(clean_ds, clean_src)
        registry = cls._load_registry()
        if source_key in registry:
            del registry[source_key]
            cls._save_registry(registry)

        feat_file = cls._features_path(clean_ds, clean_src)
        if feat_file.exists():
            feat_file.unlink()
        return True

    # =========================================================================
    # REFERENCE GEOJSON FEATURES
    # =========================================================================
    @classmethod
    def _process_and_save_features(
        cls,
        dataset_id: str,
        source_id: str,
        features_payload: Dict[str, Any],
        source_type: str,
        source_crs: str,
    ) -> int:
        """
        Validates GeoJSON features, enriches properties with reference provenance,
        and writes reference GeoJSON to disk.
        """
        if not isinstance(features_payload, dict):
            raise ValueError("Features payload must be a valid GeoJSON dictionary.")

        raw_features = features_payload.get("features")
        if not isinstance(raw_features, list):
            # Check if single feature
            if features_payload.get("type") == "Feature" and "geometry" in features_payload:
                raw_features = [features_payload]
            else:
                raise ValueError("Invalid GeoJSON: must be a FeatureCollection or Feature.")

        valid_features: List[Dict[str, Any]] = []
        for idx, feat in enumerate(raw_features):
            if not isinstance(feat, dict) or "geometry" not in feat:
                continue
            geom = feat.get("geometry")
            if not geom or not isinstance(geom, dict):
                continue

            # Validate geometry validity using Shapely
            try:
                g = shape(geom)
                if not g.is_valid:
                    g = make_valid(g)
                if g.is_empty:
                    continue
            except Exception as e:
                raise ValueError(f"Feature index {idx} has invalid geometry: {e}")

            orig_props = feat.get("properties") or {}
            orig_id = feat.get("id") or orig_props.get("id") or f"{source_id}-{idx + 1}"

            # Enforce reference geometry classification and provenance
            enriched_props = {
                **orig_props,
                "source_id": source_id,
                "source_type": source_type,
                "original_feature_id": str(orig_id),
                "original_crs": source_crs,
                "working_crs": cls.DEFAULT_WORKING_CRS,
                "classification": "REFERENCE GEOMETRY",
                "import_status": "Imported",
            }

            valid_features.append({
                "type": "Feature",
                "id": str(orig_id),
                "geometry": geom,
                "properties": enriched_props,
            })

        feature_collection = {
            "type": "FeatureCollection",
            "metadata": {
                "dataset_id": dataset_id,
                "source_id": source_id,
                "source_type": source_type,
                "crs": source_crs,
                "working_crs": cls.DEFAULT_WORKING_CRS,
                "classification": "REFERENCE GEOMETRY",
            },
            "features": valid_features,
        }

        save_path = cls._features_path(dataset_id, source_id)
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(feature_collection, f, indent=2)

        return len(valid_features)

    @classmethod
    def get_source_features(cls, dataset_id: str, source_id: str) -> Dict[str, Any]:
        """Retrieves reference GeoJSON FeatureCollection for a registered source."""
        # Validates ownership
        source = cls.get_source(dataset_id, source_id)
        clean_ds = _clean_token(dataset_id)
        clean_src = _clean_token(source_id)

        feat_path = cls._features_path(clean_ds, clean_src)
        if feat_path.exists():
            try:
                with open(feat_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading reference features from {feat_path}: {e}")

        # Fallback empty FeatureCollection
        return {
            "type": "FeatureCollection",
            "metadata": {
                "dataset_id": dataset_id,
                "source_id": source_id,
                "source_name": source.source_name,
                "source_type": source.source_type,
            },
            "features": [],
        }

    @classmethod
    def add_source_features(
        cls, dataset_id: str, source_id: str, features_payload: Dict[str, Any], crs: Optional[str] = None
    ) -> SpatialSource:
        """Attaches or updates reference features for an existing registered source."""
        source = cls.get_source(dataset_id, source_id)
        clean_ds = _clean_token(dataset_id)
        clean_src = _clean_token(source_id)

        source_crs = crs or source.crs
        count = cls._process_and_save_features(
            clean_ds, clean_src, features_payload, source.source_type, source_crs
        )

        # Update registry
        source_key = _make_source_key(clean_ds, clean_src)
        registry = cls._load_registry()
        if source_key in registry:
            registry[source_key]["feature_count"] = count
            if crs:
                registry[source_key]["crs"] = crs
            cls._save_registry(registry)
            return SpatialSource(**registry[source_key])
        return source
