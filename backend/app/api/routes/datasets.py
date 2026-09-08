from typing import Dict, Any, List, Optional
import os
import json
import re
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas.common import ResponseEnvelope, ErrorEnvelope
from app.schemas.cadastre import (
    GeoJSONValidationResult,
    NormalizedParcelDataset,
)
from app.services.geojson_validator import GeoJSONValidator
from app.services.parcel_normalizer import ParcelNormalizer
from app.core.logging import logger

router = APIRouter(prefix="/datasets", tags=["Datasets"])

# Maximum allowed upload size: 10 MB
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Base data directory
DATA_PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "processed"

# In-memory storage cache for normalized datasets during runtime
IN_MEMORY_DATASET_STORE: Dict[str, NormalizedParcelDataset] = {}
RAW_DATASET_STORE: Dict[str, Dict[str, Any]] = {}


def sanitize_filename(filename: str) -> str:
    """Removes path traversals and special characters from uploaded filename."""
    base_name = os.path.basename(filename)
    return re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)


@router.get("", response_model=ResponseEnvelope[List[Dict[str, Any]]], summary="List Available Datasets")
async def list_datasets():
    """Lists preloaded demo datasets, real OSM datasets, and user-submitted datasets."""
    datasets_list = []

    # 1. Check disk for demo_parcels.geojson
    demo_file = DATA_PROCESSED_DIR / "demo_parcels.geojson"
    if demo_file.exists():
        try:
            with open(demo_file, "r", encoding="utf-8-sig") as f:
                demo_data = json.load(f)
            datasets_list.append({
                "dataset_id": "demo_parcels",
                "name": "DEMO DATA — 3D Cadastral Test Parcels",
                "description": "Synthetic cadastral parcel boundaries designed for geometric pipeline testing.",
                "feature_count": len(demo_data.get("features", [])),
                "is_demo": True,
                "source": "filesystem_preloaded",
            })
        except Exception as e:
            logger.warning(f"Failed to load demo_parcels.geojson from disk: {e}")

    # 2. Check disk for demo_buildings.geojson
    demo_bld_file = DATA_PROCESSED_DIR / "demo_buildings.geojson"
    if demo_bld_file.exists():
        try:
            with open(demo_bld_file, "r", encoding="utf-8-sig") as f:
                bld_data = json.load(f)
            datasets_list.append({
                "dataset_id": "demo_buildings",
                "name": "DEMO DATA — 3D Cadastral Test Buildings",
                "description": "Synthetic building footprint polygons designed for spatial association testing.",
                "feature_count": len(bld_data.get("features", [])),
                "is_demo": True,
                "source": "filesystem_preloaded",
            })
        except Exception as e:
            logger.warning(f"Failed to load demo_buildings.geojson from disk: {e}")

    # 3. Check disk for real OSM building dataset
    real_bld_file = DATA_PROCESSED_DIR / "real" / "osm_buildings.geojson"
    if real_bld_file.exists():
        try:
            with open(real_bld_file, "r", encoding="utf-8-sig") as f:
                osm_data = json.load(f)
            datasets_list.append({
                "dataset_id": "real_osm_buildings",
                "name": "REAL DATA — OpenStreetMap Building Footprints",
                "description": "Real-world building footprints extracted from OpenStreetMap map.osm for Tagore Garden, New Delhi.",
                "feature_count": len(osm_data.get("features", [])),
                "is_demo": False,
                "is_cadastral": False,
                "source": "filesystem_real",
            })
        except Exception as e:
            logger.warning(f"Failed to load real/osm_buildings.geojson from disk: {e}")

    # 3b. Check disk for demo_units.geojson
    demo_units_file = DATA_PROCESSED_DIR / "demo_units.geojson"
    if demo_units_file.exists():
        try:
            with open(demo_units_file, "r", encoding="utf-8-sig") as f:
                units_data = json.load(f)
            datasets_list.append({
                "dataset_id": "demo_units",
                "name": "DEMO DATA — 3D Cadastral Apartment Units",
                "description": "Synthetic unit/apartment subdivisions on Floor 5 of Residential Tower 1 for vertical property mapping.",
                "feature_count": len(units_data.get("features", [])),
                "is_demo": True,
                "source": "filesystem_preloaded",
            })
        except Exception as e:
            logger.warning(f"Failed to load demo_units.geojson from disk: {e}")

    # 4. Add in-memory uploaded datasets
    for ds_id, ds in IN_MEMORY_DATASET_STORE.items():
        datasets_list.append({
            "dataset_id": ds_id,
            "name": ds.source_filename or ds_id,
            "description": f"Uploaded dataset with {ds.total_parcels} normalized parcels.",
            "feature_count": ds.total_parcels,
            "is_demo": False,
            "source": "session_memory",
        })

    return ResponseEnvelope(
        data=datasets_list,
        message=f"Found {len(datasets_list)} dataset(s)",
    )


@router.get("/{dataset_id}", summary="Inspect Dataset")
async def get_dataset(dataset_id: str):
    """Retrieves raw GeoJSON and normalization status for a specified dataset ID."""
    # Check preloaded demo files
    if dataset_id == "demo_parcels":
        demo_file = DATA_PROCESSED_DIR / "demo_parcels.geojson"
        if demo_file.exists():
            with open(demo_file, "r", encoding="utf-8-sig") as f:
                raw_data = json.load(f)
            return ResponseEnvelope(
                data={
                    "dataset_id": "demo_parcels",
                    "raw_geojson": raw_data,
                },
                message="Loaded preloaded demo parcel dataset",
            )

    if dataset_id == "demo_buildings":
        demo_bld_file = DATA_PROCESSED_DIR / "demo_buildings.geojson"
        if demo_bld_file.exists():
            with open(demo_bld_file, "r", encoding="utf-8-sig") as f:
                raw_data = json.load(f)
            return ResponseEnvelope(
                data={
                    "dataset_id": "demo_buildings",
                    "raw_geojson": raw_data,
                },
                message="Loaded preloaded demo building footprint dataset",
            )

    if dataset_id in ("real_osm_buildings", "osm_buildings"):
        real_bld_file = DATA_PROCESSED_DIR / "real" / "osm_buildings.geojson"
        if real_bld_file.exists():
            with open(real_bld_file, "r", encoding="utf-8-sig") as f:
                raw_data = json.load(f)
            return ResponseEnvelope(
                data={
                    "dataset_id": "real_osm_buildings",
                    "raw_geojson": raw_data,
                    "is_cadastral": False,
                    "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
                },
                message="Loaded real OpenStreetMap building footprint dataset",
            )

    # Check in-memory store
    if dataset_id in RAW_DATASET_STORE:
        return ResponseEnvelope(
            data={
                "dataset_id": dataset_id,
                "raw_geojson": RAW_DATASET_STORE[dataset_id],
                "normalized": IN_MEMORY_DATASET_STORE.get(dataset_id),
            },
            message="Retrieved session dataset",
        )

    # Check Osm3DConverterService multi-dataset registry
    from app.services.osm_3d_converter import Osm3DConverterService
    osm_geo = Osm3DConverterService.get_dataset_geojson(dataset_id)
    if osm_geo:
        return ResponseEnvelope(
            data={
                "dataset_id": dataset_id,
                "raw_geojson": osm_geo,
                "is_cadastral": False,
                "legal_status": "UNVERIFIED_PHYSICAL_SURFACE",
            },
            message=f"Retrieved active OSM dataset '{dataset_id}'",
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Dataset with ID '{dataset_id}' not found",
    )


@router.post(
    "/validate",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Validate Raw GeoJSON Payload",
)
async def validate_geojson_payload(payload: Dict[str, Any]):
    """
    Directly validates a submitted GeoJSON dictionary without file upload.
    Returns structured validation metrics and normalized parcels if valid.
    """
    validation_result = GeoJSONValidator.validate_dataset(payload)

    if not validation_result.valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "error_code": "GEOMETRY_VALIDATION_FAILED",
                "message": "The submitted GeoJSON failed spatial topology or structure validation.",
                "data": {
                    "validation": validation_result.model_dump(),
                },
            },
        )

    normalized_dataset = ParcelNormalizer.normalize_dataset(
        geojson_data=payload,
        validation_result=validation_result,
        source_filename="inline_payload.geojson",
    )

    return ResponseEnvelope(
        data={
            "validation": validation_result.model_dump(),
            "normalized_dataset": normalized_dataset.model_dump(),
        },
        message="GeoJSON validation and normalization completed successfully",
    )


@router.post(
    "/upload",
    response_model=ResponseEnvelope[NormalizedParcelDataset],
    summary="Upload & Validate GeoJSON File",
)
async def upload_geojson_file(file: UploadFile = File(...)):
    """
    Uploads an untrusted GeoJSON file, applies size & extension safeguards,
    runs topological validation, and produces a normalized parcel dataset.
    """
    # 1. Security Check: File extension
    filename = file.filename or "unknown.geojson"
    clean_name = sanitize_filename(filename)
    lower_name = clean_name.lower()

    if not (lower_name.endswith(".geojson") or lower_name.endswith(".json")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .geojson or .json files are accepted.",
        )

    # 2. Security Check: File size
    try:
        content_bytes = await file.read(MAX_UPLOAD_BYTES + 1024)
        if len(content_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum permissible size limit of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading uploaded file '{clean_name}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file.",
        )

    # 3. Parse JSON
    try:
        raw_text = content_bytes.decode("utf-8-sig")
        parsed_geojson = json.loads(raw_text)
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be encoded in UTF-8 text.",
        )
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON syntax: {err.msg} at line {err.lineno}, column {err.colno}",
        )

    # 4. Validate Dataset & Geometry Topology
    validation_result = GeoJSONValidator.validate_dataset(parsed_geojson)

    if not validation_result.valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "error_code": "GEOMETRY_VALIDATION_FAILED",
                "message": "Uploaded GeoJSON failed cadastral topology validation.",
                "data": {
                    "source_filename": clean_name,
                    "validation": validation_result.model_dump(),
                },
            },
        )

    # 5. Normalize Dataset
    normalized_dataset = ParcelNormalizer.normalize_dataset(
        geojson_data=parsed_geojson,
        validation_result=validation_result,
        source_filename=clean_name,
    )

    # Cache in session memory
    IN_MEMORY_DATASET_STORE[normalized_dataset.dataset_id] = normalized_dataset
    RAW_DATASET_STORE[normalized_dataset.dataset_id] = parsed_geojson

    logger.info(
        f"Successfully validated & normalized dataset '{clean_name}' -> ID: {normalized_dataset.dataset_id} "
        f"({normalized_dataset.total_parcels} parcels, CRS: {normalized_dataset.crs})"
    )

    return ResponseEnvelope(
        data=normalized_dataset,
        message=f"Successfully validated and normalized {normalized_dataset.total_parcels} cadastral parcel(s).",
    )
