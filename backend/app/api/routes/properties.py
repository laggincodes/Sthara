from typing import List, Dict, Any
from pathlib import Path
import json
from fastapi import APIRouter, HTTPException, status
from shapely.geometry import shape

from app.schemas.property_volume import (
    BatchPropertyVolumeRequest,
    PropertyVolumeRequest,
    GeneratePropertyVolumeResponse,
    BuildingFloors3DRequest,
    BatchBuildingFloors3DRequest,
    VolumeType,
)
from app.schemas.elevation import ElevationSamplePoint
from app.schemas.ulpin import (
    ULPINRequest,
    ULPINResult,
    ULPINVerificationRequest,
    ULPINVerificationResult,
    BatchULPINResponse,
)
from app.services.floor_volume_service import FloorVolumeService
from app.services.elevation_service import ElevationService
from app.services.ulpin_service import ULPINService
from app.api.routes.buildings import DEMO_BUILDING_SPECS

router = APIRouter(prefix="/properties", tags=["3D Properties & Stratified Volumes"])

DATA_PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "processed"

# Pre-defined synthetic demo property configurations for testing
DEMO_PROPERTY_SPECS: List[PropertyVolumeRequest] = [
    PropertyVolumeRequest(
        property_id="PROP-DEMO-101-U01",
        parcel_id="PARCEL-DEMO-101",
        building_id="BLD-DEMO-001",
        floor_ids=["BLD-DEMO-001-FL00"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Plaza A — Ground Retail Unit 101",
    ),
    PropertyVolumeRequest(
        property_id="PROP-DEMO-101-U02",
        parcel_id="PARCEL-DEMO-101",
        building_id="BLD-DEMO-001",
        floor_ids=["BLD-DEMO-001-FL01"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Plaza A — Floor 1 Commercial Office",
    ),
    PropertyVolumeRequest(
        property_id="PROP-DEMO-101-DUP",
        parcel_id="PARCEL-DEMO-101",
        building_id="BLD-DEMO-001",
        floor_ids=["BLD-DEMO-001-FL02", "BLD-DEMO-001-FL03"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Plaza A — Penthouse Duplex Suite (FL02 + FL03)",
    ),
    PropertyVolumeRequest(
        property_id="PROP-DEMO-102-U01",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_ids=["BLD-DEMO-002-FL00"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Residential Tower 1 — Lobby & Concierge",
    ),
    PropertyVolumeRequest(
        property_id="PROP-DEMO-102-U03",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_ids=["BLD-DEMO-002-FL02"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Residential Tower 1 — Unit 302 Residence",
    ),
    PropertyVolumeRequest(
        property_id="PROP-DEMO-102-U501",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_ids=["BLD-DEMO-002-FL05"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Residential Tower 1 — Unit 501 Residence (Floor 5)",
    ),
]


def _load_demo_building_floors_map() -> Dict[str, Any]:
    """Helper to load and extrude demo building floors."""
    demo_file = DATA_PROCESSED_DIR / "demo_buildings.geojson"
    if not demo_file.exists():
        return {}

    with open(demo_file, "r", encoding="utf-8-sig") as f:
        geojson_data = json.load(f)

    features = geojson_data.get("features", [])
    sample_points = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"
        try:
            poly = shape(geom)
            centroid = poly.centroid
            sample_points.append(ElevationSamplePoint(point_id=b_id, longitude=centroid.x, latitude=centroid.y))
        except Exception:
            pass

    sampled_elevations = {}
    if sample_points:
        try:
            sample_res = ElevationService.sample_batch(sample_points)
            for r in sample_res.results:
                if r.status.value == "SUCCESS" and r.elevation_m is not None:
                    sampled_elevations[r.point_id] = r.elevation_m
        except Exception:
            pass

    building_floor_requests = []
    for feat in features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        b_id = props.get("building_id") or feat.get("id") or "BLD-UNKNOWN"
        spec = DEMO_BUILDING_SPECS.get(b_id)
        ground_z = sampled_elevations.get(b_id, 562.48)
        roof_z = props.get("roof_elevation") or (spec.roof_elevation if spec else None)
        height = props.get("building_height") or (spec.building_height if spec else None)
        num_floors = props.get("number_of_floors") or (spec.number_of_floors if spec else 4)
        floor_h = props.get("floor_height") or (spec.floor_height if spec else 3.0)
        p_id = "PARCEL-DEMO-101" if b_id in ["BLD-DEMO-001", "BLD-DEMO-003", "BLD-DEMO-004"] else "PARCEL-DEMO-102"

        building_floor_requests.append(
            BuildingFloors3DRequest(
                building_id=b_id,
                parcel_id=p_id,
                footprint_geometry=geom,
                ground_elevation=ground_z,
                roof_elevation=roof_z,
                building_height=height,
                number_of_floors=num_floors,
                floor_height=floor_h,
                source_crs="EPSG:4326",
                target_crs="EPSG:32643",
            )
        )

    batch_req = BatchBuildingFloors3DRequest(
        buildings=building_floor_requests,
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )
    floors_res = FloorVolumeService.generate_floors_batch(batch_req)
    return {b.building_id: b for b in floors_res.results}


@router.get(
    "/demo-properties",
    response_model=List[PropertyVolumeRequest],
    summary="List synthetic demo property volume specifications",
    description="Returns pre-defined property volume units referencing cadastral parcels, buildings, and constituent floors.",
)
async def get_demo_property_specs() -> List[PropertyVolumeRequest]:
    return DEMO_PROPERTY_SPECS


@router.post(
    "/generate-volume-3d",
    response_model=GeneratePropertyVolumeResponse,
    summary="Generate canonical 3D property volumes from building and floor constituents",
    description="Constructs verified 3D property volume meshes conforming to 3D Geometry Contract v1.0.",
)
async def generate_property_volume_3d(request: BatchPropertyVolumeRequest) -> GeneratePropertyVolumeResponse:
    try:
        # Build building floors map
        building_floors_map = {}
        if request.building_requests:
            b_req = BatchBuildingFloors3DRequest(
                buildings=request.building_requests,
                target_crs=request.target_crs or "EPSG:32643",
                compute_shared_origin=request.compute_shared_origin,
            )
            floors_batch = FloorVolumeService.generate_floors_batch(b_req)
            building_floors_map = {b.building_id: b for b in floors_batch.results}
        else:
            # Fallback to demo buildings
            building_floors_map = _load_demo_building_floors_map()

        return FloorVolumeService.generate_properties_batch(request, building_floors_map)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating 3D property volume: {str(e)}",
        )


@router.post(
    "/extrude-demo-properties",
    response_model=GeneratePropertyVolumeResponse,
    summary="Extrude all preloaded demo property volumes",
    description="Generates canonical 3D property volumes for all pre-defined demo properties referencing demo parcels and buildings.",
)
async def extrude_demo_properties() -> GeneratePropertyVolumeResponse:
    try:
        building_floors_map = _load_demo_building_floors_map()
        batch_req = BatchPropertyVolumeRequest(
            properties=DEMO_PROPERTY_SPECS,
            target_crs="EPSG:32643",
            compute_shared_origin=True,
        )
        return FloorVolumeService.generate_properties_batch(batch_req, building_floors_map)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extruding demo properties: {str(e)}",
        )


@router.post(
    "/generate-ulpin",
    response_model=ULPINResult,
    summary="Generate deterministic 3D ULPIN prototype for a cadastral property entity",
    description=(
        "Generates a versioned, reproducible 3D ULPIN prototype from canonical property identity "
        "(parcel, building, and floor components). Rejects unavailable or invalid spatial volume extents. "
        "Explicitly documented as a project prototype, NOT an official government specification."
    ),
)
async def generate_property_ulpin(request: ULPINRequest) -> ULPINResult:
    try:
        # If building/floor info is omitted, check if it matches a known demo property
        effective_req = request
        if not request.building_id and not request.building_ids:
            for demo_spec in DEMO_PROPERTY_SPECS:
                if demo_spec.property_id == request.property_id:
                    effective_req = ULPINRequest(
                        property_id=demo_spec.property_id,
                        parcel_id=demo_spec.parcel_id,
                        building_id=demo_spec.building_id,
                        building_ids=demo_spec.building_ids,
                        floor_ids=demo_spec.floor_ids if not request.floor_ids else request.floor_ids,
                        source_identity=request.source_identity,
                        geometry_status=request.geometry_status,
                    )
                    break

        return ULPINService.generate_3d_ulpin(effective_req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating 3D ULPIN prototype: {str(e)}",
        )


@router.post(
    "/verify-ulpin",
    response_model=ULPINVerificationResult,
    summary="Verify a 3D ULPIN prototype against canonical property identity",
    description="Reconstructs the canonical property identity and cryptographically verifies the provided ULPIN string.",
)
async def verify_property_ulpin(request: ULPINVerificationRequest) -> ULPINVerificationResult:
    try:
        return ULPINService.verify_3d_ulpin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying 3D ULPIN prototype: {str(e)}",
        )


@router.get(
    "/demo-ulpins",
    response_model=List[ULPINResult],
    summary="Generate deterministic 3D ULPIN prototypes for all pre-defined demo properties",
    description="Computes canonical 3D ULPIN prototypes across all standard synthetic demonstration properties.",
)
async def get_demo_ulpins() -> List[ULPINResult]:
    try:
        results: List[ULPINResult] = []
        for spec in DEMO_PROPERTY_SPECS:
            req = ULPINRequest(
                property_id=spec.property_id,
                parcel_id=spec.parcel_id,
                building_id=spec.building_id,
                building_ids=spec.building_ids,
                floor_ids=spec.floor_ids,
                source_identity="demo_cadastral_dataset",
            )
            res = ULPINService.generate_3d_ulpin(req)
            results.append(res)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating demo 3D ULPINs: {str(e)}",
        )

