import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.geometry_3d import Geometry3DStatus, FeatureType
from app.schemas.property_volume import (
    BuildingFloors3DRequest,
    BatchBuildingFloors3DRequest,
)
from app.services.floor_volume_service import FloorVolumeService

client = TestClient(app)

# Standard test square footprint (10m x 10m = 100 m² in EPSG:32643)
SQUARE_COORDS_4326 = [
    [73.85600, 18.52000],
    [73.85610, 18.52000],
    [73.85610, 18.52010],
    [73.85600, 18.52010],
    [73.85600, 18.52000],
]
SQUARE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [SQUARE_COORDS_4326],
}


def test_vertical_config_1_floor_0_basement():
    """Validates 1 floor / 0 basement vertical configuration."""
    req = BuildingFloors3DRequest(
        building_id="BLD-VCONF-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=4.0,
        number_of_floors=1,
        number_of_basements=0,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 1
    assert len(res.floors) == 1

    fl0 = res.floors[0]
    assert fl0.floor_id == "BLD-VCONF-001-FL00"
    assert fl0.floor_name == "Ground Floor"
    assert fl0.level_number == 0
    assert fl0.level_type == "Above Ground"
    assert fl0.base_elevation == 0.0
    assert fl0.top_elevation == 4.0
    assert fl0.height == 4.0
    assert fl0.source == "Configured / Derived"
    assert fl0.geometry_status == Geometry3DStatus.VALID
    assert fl0.geometry is not None
    assert len(fl0.geometry.parts) == 1


def test_vertical_config_5_floors_0_basement():
    """Validates 5 floors / 0 basement configuration sliced evenly."""
    req = BuildingFloors3DRequest(
        building_id="BLD-VCONF-002",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=18.0,
        number_of_floors=5,
        number_of_basements=0,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 5
    assert len(res.floors) == 5

    expected_names = ["Ground Floor", "Floor 1", "Floor 2", "Floor 3", "Floor 4"]
    for idx, fl in enumerate(res.floors):
        assert fl.floor_index == idx
        assert fl.level_number == idx
        assert fl.level_type == "Above Ground"
        assert fl.floor_name == expected_names[idx]
        assert fl.source == "Configured / Derived"
        assert fl.height == 3.6
        assert fl.geometry_status == Geometry3DStatus.VALID
        assert fl.geometry is not None
        assert fl.volume_cubic_m > 0
        assert fl.surface_area_sqm > 0

    assert res.floors[0].base_elevation == 0.0
    assert res.floors[-1].top_elevation == 18.0


def test_vertical_config_5_floors_1_basement():
    """
    Validates:
    Floors = 5, Basements = 1, Height = 18m
    Generates:
    - Basement -1 (Z: -3.0m - 0.0m)
    - Ground Floor (Z: 0.0m - 3.6m)
    - Floor 1 (Z: 3.6m - 7.2m)
    - Floor 2 (Z: 7.2m - 10.8m)
    - Floor 3 (Z: 10.8m - 14.4m)
    - Floor 4 (Z: 14.4m - 18.0m)
    Total 6 separate 3D solid volumes.
    """
    req = BuildingFloors3DRequest(
        building_id="BLD-VCONF-003",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=18.0,
        number_of_floors=5,
        number_of_basements=1,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 6
    assert len(res.floors) == 6

    # 1. Basement
    b1 = res.floors[0]
    assert b1.floor_name == "Basement -1"
    assert b1.floor_index == -1
    assert b1.level_number == -1
    assert b1.level_type == "Basement"
    assert b1.base_elevation == -3.0
    assert b1.top_elevation == 0.0
    assert b1.height == 3.0
    assert b1.source == "Configured / Derived"
    assert b1.geometry_status == Geometry3DStatus.VALID
    assert b1.geometry is not None

    # 2. Ground Floor
    gf = res.floors[1]
    assert gf.floor_name == "Ground Floor"
    assert gf.floor_index == 0
    assert gf.level_number == 0
    assert gf.level_type == "Above Ground"
    assert gf.base_elevation == 0.0
    assert gf.top_elevation == 3.6
    assert gf.height == 3.6

    # 3. Upper Floors
    f1 = res.floors[2]
    assert f1.floor_name == "Floor 1"
    assert f1.base_elevation == 3.6
    assert f1.top_elevation == 7.2

    f2 = res.floors[3]
    assert f2.floor_name == "Floor 2"
    assert f2.base_elevation == 7.2
    assert f2.top_elevation == 10.8

    f3 = res.floors[4]
    assert f3.floor_name == "Floor 3"
    assert f3.base_elevation == 10.8
    assert f3.top_elevation == 14.4

    f4 = res.floors[5]
    assert f4.floor_name == "Floor 4"
    assert f4.base_elevation == 14.4
    assert f4.top_elevation == 18.0

    # Ensure every level is an independent 3D volume
    floor_ids = [fl.floor_id for fl in res.floors]
    assert len(set(floor_ids)) == 6


def test_vertical_config_invalid_floor_count():
    """Validates that floor count < 1 is rejected."""
    req = BuildingFloors3DRequest(
        building_id="BLD-VCONF-INVALID-FC",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=12.0,
        number_of_floors=0,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.UNAVAILABLE
    assert res.floor_count == 0


def test_vertical_config_invalid_height():
    """Validates that negative or zero building height is rejected."""
    req = BuildingFloors3DRequest(
        building_id="BLD-VCONF-INVALID-H",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=-5.0,
        number_of_floors=3,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.UNAVAILABLE
    assert res.floor_count == 0


def test_vertical_config_multiple_buildings():
    """Validates batch generation for multiple buildings with distinct vertical configurations."""
    req_a = BuildingFloors3DRequest(
        building_id="BLD-MULTI-A",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=12.0,
        number_of_floors=3,
        number_of_basements=1,
    )
    req_b = BuildingFloors3DRequest(
        building_id="BLD-MULTI-B",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=9.0,
        number_of_floors=3,
        number_of_basements=0,
    )
    batch_req = BatchBuildingFloors3DRequest(
        buildings=[req_a, req_b],
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )
    res = FloorVolumeService.generate_floors_batch(batch_req)
    assert res.summary.successful == 2
    assert len(res.results) == 2

    # Building A: 1 basement + 3 floors = 4 volumes
    res_a = next(r for r in res.results if r.building_id == "BLD-MULTI-A")
    assert res_a.floor_count == 4
    assert res_a.floors[0].level_type == "Basement"
    assert res_a.floors[1].level_type == "Above Ground"

    # Building B: 0 basements + 3 floors = 3 volumes
    res_b = next(r for r in res.results if r.building_id == "BLD-MULTI-B")
    assert res_b.floor_count == 3
    assert all(fl.level_type == "Above Ground" for fl in res_b.floors)


def test_api_endpoint_generate_floors_3d_with_vertical_config():
    """Tests the HTTP POST endpoint /api/v1/buildings/generate-floors-3d."""
    payload = {
        "buildings": [
            {
                "building_id": "BLD-API-TEST",
                "footprint_geometry": SQUARE_GEOJSON,
                "ground_elevation": 0.0,
                "building_height": 18.0,
                "number_of_floors": 5,
                "number_of_basements": 1,
                "source_crs": "EPSG:4326",
                "target_crs": "EPSG:32643",
            }
        ],
        "target_crs": "EPSG:32643",
        "compute_shared_origin": True,
    }
    response = client.post("/api/v1/buildings/generate-floors-3d", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["successful"] == 1
    bld_result = data["results"][0]
    assert bld_result["floor_count"] == 6
    assert bld_result["floors"][0]["level_type"] == "Basement"
    assert bld_result["floors"][0]["level_number"] == -1
    assert bld_result["floors"][0]["source"] == "Configured / Derived"
    assert bld_result["floors"][1]["floor_name"] == "Ground Floor"
    assert bld_result["floors"][-1]["floor_name"] == "Floor 4"


def test_dynamic_vertical_config_test_a():
    """TEST A: 3 floors / 9 m total height."""
    req = BuildingFloors3DRequest(
        building_id="BLD-TEST-A",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=9.0,
        number_of_floors=3,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 3
    assert res.height == 9.0
    assert res.base_elevation == 0.0
    assert res.top_elevation == 9.0
    assert res.floors[0].base_elevation == 0.0
    assert res.floors[0].top_elevation == 3.0
    assert res.floors[1].base_elevation == 3.0
    assert res.floors[1].top_elevation == 6.0
    assert res.floors[2].base_elevation == 6.0
    assert res.floors[2].top_elevation == 9.0


def test_dynamic_vertical_config_test_b():
    """TEST B: 6 floors / 30 m total height."""
    req = BuildingFloors3DRequest(
        building_id="BLD-TEST-B",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=30.0,
        number_of_floors=6,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 6
    assert res.height == 30.0
    assert res.base_elevation == 0.0
    assert res.top_elevation == 30.0
    for idx, fl in enumerate(res.floors):
        assert fl.base_elevation == idx * 5.0
        assert fl.top_elevation == (idx + 1) * 5.0
        assert fl.height == 5.0


def test_dynamic_vertical_config_test_c():
    """TEST C: 5 floors / 10 m total height."""
    req = BuildingFloors3DRequest(
        building_id="BLD-TEST-C",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=10.0,
        number_of_floors=5,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 5
    assert res.height == 10.0
    for idx, fl in enumerate(res.floors):
        assert fl.base_elevation == idx * 2.0
        assert fl.top_elevation == (idx + 1) * 2.0
        assert fl.height == 2.0


def test_dynamic_vertical_config_test_d_regeneration():
    """TEST D: Change 5 floors / 10 m to 5 floors / 25 m."""
    req_10m = BuildingFloors3DRequest(
        building_id="BLD-TEST-D",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=10.0,
        number_of_floors=5,
    )
    res_10m = FloorVolumeService.generate_building_floors(req_10m)
    vol_10m = sum(fl.volume_cubic_m for fl in res_10m.floors)

    req_25m = BuildingFloors3DRequest(
        building_id="BLD-TEST-D",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=25.0,
        number_of_floors=5,
    )
    res_25m = FloorVolumeService.generate_building_floors(req_25m)
    vol_25m = sum(fl.volume_cubic_m for fl in res_25m.floors)

    assert res_25m.height == 25.0
    assert res_25m.top_elevation == 25.0
    assert res_25m.floors[-1].top_elevation == 25.0
    assert vol_25m > vol_10m * 2.0


def test_dynamic_vertical_config_test_e_regeneration():
    """TEST E: Change 5 floors / 25 m to 8 floors / 40 m."""
    req_40m = BuildingFloors3DRequest(
        building_id="BLD-TEST-E",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=0.0,
        building_height=40.0,
        number_of_floors=8,
    )
    res_40m = FloorVolumeService.generate_building_floors(req_40m)
    assert res_40m.floor_count == 8
    assert res_40m.height == 40.0
    assert res_40m.top_elevation == 40.0
    assert res_40m.floors[0].height == 5.0
    assert res_40m.floors[-1].top_elevation == 40.0


def test_extrusion_service_explicit_building_height_priority():
    """Verifies that explicit building_height in Building3DRequest resolves top elevation."""
    from app.schemas.geometry_3d import Building3DRequest
    from app.services.extrusion_service import ExtrusionService

    req = Building3DRequest(
        building_id="BLD-PRIORITY-TEST",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=100.0,
        building_height=30.0,  # Explicit 30m height
    )
    base_z, top_z, height, source, warnings = ExtrusionService.resolve_height_and_elevations(req)
    assert base_z == 100.0
    assert top_z == 130.0
    assert height == 30.0
    assert source == "EXPLICIT_BUILDING_HEIGHT"

