import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status

from app.schemas.unit import (
    Unit,
    UnitValidationRequest,
    UnitValidationResult,
    UnitBatchValidationRequest,
    UnitBatchValidationResponse,
    UnitPropertyRecord,
    UnitStatus,
    Unit3DRequest,
    BatchUnit3DRequest,
    Unit3DResult,
    GenerateUnits3DResponse,
)
from app.services.unit_service import UnitService
from app.core.logging import logger

router = APIRouter(prefix="/units", tags=["Units / Apartments"])

DATA_PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "processed"


def load_demo_units_from_disk() -> List[Unit]:
    """
    Loads synthetic demo units from data/processed/demo_units.geojson.
    """
    demo_file = DATA_PROCESSED_DIR / "demo_units.geojson"
    if not demo_file.exists():
        logger.warning("demo_units.geojson not found on disk.")
        return []

    try:
        with open(demo_file, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        units: List[Unit] = []
        for feat in data.get("features", []):
            props = feat.get("properties", {})
            geom = feat.get("geometry")
            unit_data = {
                **props,
                "geometry_2d": geom,
            }
            units.append(Unit(**unit_data))
        return units
    except Exception as e:
        logger.error(f"Failed to load demo_units.geojson: {e}")
        return []


@router.get("/demo", summary="Get Synthetic Demo Units (GeoJSON FeatureCollection)")
async def get_demo_units():
    """
    Retrieves synthetic demo apartment units designed for vertical 3D property mapping tests.
    Clearly marked as SYNTHETIC DEMO DATA.
    """
    demo_file = DATA_PROCESSED_DIR / "demo_units.geojson"
    if not demo_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Synthetic demo units dataset not found on disk."
        )

    try:
        with open(demo_file, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read demo units: {str(e)}"
        )


@router.post("/validate", response_model=UnitValidationResult, summary="Validate Single Unit")
async def validate_unit(request: UnitValidationRequest):
    """
    Validates a single unit entity against spatial containment, vertical bounds, and parent hierarchy rules.
    """
    return UnitService.validate_unit(
        unit=request.unit,
        parent_floor=request.parent_floor,
        parent_building=request.parent_building,
        parent_parcel=request.parent_parcel,
        sibling_units=request.sibling_units,
    )


@router.post("/validate-batch", response_model=UnitBatchValidationResponse, summary="Validate Batch of Units")
async def validate_units_batch(request: UnitBatchValidationRequest):
    """
    Validates a collection of units with full duplicate checks and sibling non-overlap enforcement.
    """
    return UnitService.validate_batch(
        units=request.units,
        floors=request.floors,
        buildings=request.buildings,
        parcels=request.parcels,
    )


@router.get("/building/{building_id}", response_model=List[Unit], summary="Get Units by Building ID")
async def get_units_by_building(building_id: str):
    """
    Retrieves all available units associated with the specified building ID from the demo store.
    """
    all_units = load_demo_units_from_disk()
    matching = [u for u in all_units if u.building_id == building_id]
    return matching


@router.get("/floor/{floor_id}", response_model=List[Unit], summary="Get Units by Floor ID")
async def get_units_by_floor(floor_id: str):
    """
    Retrieves all available units associated with the specified floor ID from the demo store.
    """
    all_units = load_demo_units_from_disk()
    matching = [u for u in all_units if u.floor_id == floor_id]
    return matching


@router.get("/property-record/{unit_id}", response_model=UnitPropertyRecord, summary="Get Conceptual 3D Property Record")
async def get_unit_property_record(unit_id: str):
    """
    Returns a conceptual 3D Property Record for a unit, conforming to the SIH Presentation specification.
    """
    all_units = load_demo_units_from_disk()
    matching = next((u for u in all_units if u.unit_id == unit_id), None)
    if not matching:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unit '{unit_id}' not found in active unit registry."
        )

    return UnitService.create_property_record(matching)


@router.post("/generate-3d", response_model=GenerateUnits3DResponse, summary="Generate 3D Unit Solids")
async def generate_units_3d(request: BatchUnit3DRequest):
    """
    Generates closed, watertight 3D polyhedral solids for requested units conforming to 3D Geometry Contract v1.0.
    Enforces same-floor non-overlap and isolated error handling.
    """
    return UnitService.generate_batch_units_3d(request)


@router.get("/demo-3d", response_model=GenerateUnits3DResponse, summary="Get Synthetic Demo Units in 3D")
async def get_demo_units_3d():
    """
    Generates and returns canonical 3D solids for the reference synthetic demo units on Tower 1 Floor 5.
    """
    demo_units = load_demo_units_from_disk()
    if not demo_units:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Synthetic demo units dataset not found on disk."
        )

    unit_reqs = [
        Unit3DRequest(
            unit_id=u.unit_id,
            property_id=u.property_id,
            parcel_id=u.parcel_id,
            building_id=u.building_id,
            floor_id=u.floor_id,
            unit_number=u.unit_number,
            unit_name=u.unit_name,
            unit_type=u.unit_type,
            geometry_2d=u.geometry_2d,
            base_elevation=u.base_elevation,
            top_elevation=u.top_elevation,
            height=u.height,
            parent_floor_base=577.48,
            parent_floor_top=580.48,
            source_crs="EPSG:4326",
            target_crs="EPSG:32643",
        )
        for u in demo_units
    ]

    batch_req = BatchUnit3DRequest(
        units=unit_reqs,
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )
    return UnitService.generate_batch_units_3d(batch_req)
