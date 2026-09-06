import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.building_height import (
    HeightCalculationRequest,
    HeightStatus,
    HeightSource,
    FloorGenerationRequest,
    FloorGenerationMode,
    FloorValidationStatus,
)
from app.services.building_height_service import BuildingHeightService

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Height Calculation Unit Tests
# ---------------------------------------------------------------------------

def test_valid_height_calculation():
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.48,
        roof_elevation=574.48,
        unit="meters",
        ground_reference="AMSL",
        roof_reference="AMSL",
        source=HeightSource.SYNTHETIC_DEMO,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.AVAILABLE
    assert result.building_height == 12.0
    assert result.ground_elevation == 562.48
    assert result.roof_elevation == 574.48
    assert result.unit == "meters"
    assert len(result.warnings) == 0


def test_negative_height_rejected():
    # Roof elevation is lower than ground elevation
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=574.48,
        roof_elevation=562.48,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.INVALID
    assert result.building_height == -12.0
    assert any("less than ground elevation" in w for w in result.warnings)


def test_zero_height_rejected():
    # Roof elevation equals ground elevation
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.48,
        roof_elevation=562.48,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.INVALID
    assert result.building_height == 0.0
    assert any("zero building height" in w for w in result.warnings)


def test_missing_ground_elevation():
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=None,
        roof_elevation=574.48,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.UNAVAILABLE
    assert result.building_height is None
    assert any("Ground elevation is missing" in w for w in result.warnings)


def test_missing_roof_elevation():
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.48,
        roof_elevation=None,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.UNAVAILABLE
    assert result.building_height is None
    assert any("Roof elevation is missing" in w for w in result.warnings)


def test_incompatible_units():
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.48,
        roof_elevation=574.48,
        unit="feet",
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.INCONSISTENT
    assert result.building_height is None
    assert any("Unsupported or mismatched elevation unit" in w for w in result.warnings)


def test_incompatible_datum_references():
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.48,
        roof_elevation=574.48,
        ground_reference="AMSL",
        roof_reference="WGS84_ELLIPSOIDAL",
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.INCONSISTENT
    assert result.building_height is None
    assert any("reference mismatch" in w for w in result.warnings)


def test_sanity_constraint_exceeded():
    # Unrealistically huge height (e.g. 600m)
    req = HeightCalculationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=100.0,
        roof_elevation=750.0,
    )
    result = BuildingHeightService.calculate_height(req)
    assert result.status == HeightStatus.INVALID
    assert any("exceeds maximum structural sanity constraint" in w for w in result.warnings)


# ---------------------------------------------------------------------------
# 2. Floor Generation Unit Tests
# ---------------------------------------------------------------------------

def test_floor_generation_mode_a_known_floor_count():
    req = FloorGenerationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.5,
        building_height=12.0,
        mode=FloorGenerationMode.KNOWN_FLOOR_COUNT,
        floor_count=4,
    )
    res = BuildingHeightService.generate_floors(req)
    assert res.validation_status == FloorValidationStatus.VALID
    assert res.floor_count == 4
    assert len(res.floors) == 4
    assert res.building_height == 12.0

    # Ground floor
    f0 = res.floors[0]
    assert f0.floor_index == 0
    assert f0.floor_name == "Ground Floor"
    assert f0.base_elevation == 562.5
    assert f0.top_elevation == 565.5
    assert f0.floor_height == 3.0

    # Top floor (Floor 3)
    f3 = res.floors[3]
    assert f3.floor_index == 3
    assert f3.floor_name == "Floor 3"
    assert f3.base_elevation == 571.5
    assert f3.top_elevation == 574.5
    assert f3.floor_height == 3.0


def test_floor_generation_mode_b_explicit_heights_valid():
    req = FloorGenerationRequest(
        building_id="BLD-DEMO-003",
        ground_elevation=562.5,
        building_height=6.0,
        mode=FloorGenerationMode.EXPLICIT_FLOOR_HEIGHTS,
        floor_heights=[3.2, 2.8],
    )
    res = BuildingHeightService.generate_floors(req)
    assert res.validation_status == FloorValidationStatus.VALID
    assert res.floor_count == 2
    assert res.floors[0].floor_height == 3.2
    assert res.floors[0].top_elevation == 565.7
    assert res.floors[1].base_elevation == 565.7
    assert res.floors[1].top_elevation == 568.5
    assert res.floors[1].floor_height == 2.8
    assert res.difference_m == 0.0


def test_floor_generation_mode_b_height_mismatch():
    req = FloorGenerationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.5,
        building_height=12.0,
        mode=FloorGenerationMode.EXPLICIT_FLOOR_HEIGHTS,
        floor_heights=[3.0, 3.0, 3.0],  # Sum = 9.0m, mismatch vs 12.0m
        tolerance_m=0.05,
    )
    res = BuildingHeightService.generate_floors(req)
    assert res.validation_status == FloorValidationStatus.HEIGHT_MISMATCH
    assert res.difference_m == 3.0
    assert any("differs from building height" in w for w in res.warnings)


def test_floor_generation_zero_floors_rejected():
    req = FloorGenerationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.5,
        building_height=12.0,
        mode=FloorGenerationMode.KNOWN_FLOOR_COUNT,
        floor_count=0,
    )
    res = BuildingHeightService.generate_floors(req)
    assert res.validation_status == FloorValidationStatus.INVALID
    assert res.floor_count == 0


def test_floor_generation_negative_floor_height_rejected():
    req = FloorGenerationRequest(
        building_id="BLD-DEMO-001",
        ground_elevation=562.5,
        building_height=12.0,
        mode=FloorGenerationMode.EXPLICIT_FLOOR_HEIGHTS,
        floor_heights=[3.0, -1.0, 3.0],
    )
    res = BuildingHeightService.generate_floors(req)
    assert res.validation_status == FloorValidationStatus.INVALID
    assert any("must be positive numbers" in w for w in res.warnings)


# ---------------------------------------------------------------------------
# 3. FastApi HTTP API Tests
# ---------------------------------------------------------------------------

def test_api_calculate_height_endpoint():
    payload = {
        "building_id": "BLD-DEMO-002",
        "ground_elevation": 562.48,
        "roof_elevation": 583.48,
        "unit": "meters",
        "ground_reference": "AMSL",
        "roof_reference": "AMSL",
        "source": "SYNTHETIC_DEMO",
    }
    response = client.post("/api/v1/buildings/calculate-height", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["building_id"] == "BLD-DEMO-002"
    assert data["building_height"] == 21.0
    assert data["status"] == "AVAILABLE"
    assert data["method"] == "DIRECT_DIFFERENCE"


def test_api_generate_floors_endpoint():
    payload = {
        "building_id": "BLD-DEMO-002",
        "ground_elevation": 562.48,
        "building_height": 21.0,
        "mode": "KNOWN_FLOOR_COUNT",
        "floor_count": 7,
    }
    response = client.post("/api/v1/buildings/generate-floors", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["building_id"] == "BLD-DEMO-002"
    assert data["floor_count"] == 7
    assert data["validation_status"] == "VALID"
    assert len(data["floors"]) == 7


def test_api_demo_specs_endpoint():
    response = client.get("/api/v1/buildings/demo-specs")
    assert response.status_code == 200
    specs = response.json()
    assert len(specs) == 4
    ids = [s["building_id"] for s in specs]
    assert "BLD-DEMO-001" in ids
    assert "BLD-DEMO-002" in ids
