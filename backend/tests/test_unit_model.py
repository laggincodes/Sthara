import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.unit import (
    Unit,
    UnitType,
    UnitStatus,
    UnitSourceType,
    UnitValidationRequest,
    UnitBatchValidationRequest,
)
from app.services.unit_service import UnitService

client = TestClient(app)

# Standard test building footprint (box)
TEST_BUILDING_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8560, 18.5200],
            [73.8570, 18.5200],
            [73.8570, 18.5210],
            [73.8560, 18.5210],
            [73.8560, 18.5200]
        ]
    ]
}

# Standard test floor (Floor 5)
TEST_PARENT_FLOOR = {
    "floor_id": "BLD-01-FL05",
    "building_id": "BLD-01",
    "floor_index": 5,
    "base_elevation": 100.0,
    "top_elevation": 103.0,
    "footprint_geometry": TEST_BUILDING_FOOTPRINT,
}

TEST_PARENT_BUILDING = {
    "building_id": "BLD-01",
    "parcel_id": "PARCEL-01",
    "footprint_geometry": TEST_BUILDING_FOOTPRINT,
}

TEST_PARENT_PARCEL = {
    "parcel_id": "PARCEL-01",
}


def test_valid_unit_validation():
    """Valid unit with valid geometry, vertical interval, and parent hierarchy."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8561, 18.5201],
                    [73.8564, 18.5201],
                    [73.8564, 18.5204],
                    [73.8561, 18.5204],
                    [73.8561, 18.5201]
                ]
            ]
        },
        source="SYNTHETIC_DEMO",
        source_type=UnitSourceType.DEMO,
    )

    result = UnitService.validate_unit(
        unit=unit,
        parent_floor=TEST_PARENT_FLOOR,
        parent_building=TEST_PARENT_BUILDING,
        parent_parcel=TEST_PARENT_PARCEL,
    )

    assert result.valid is True
    assert result.status == UnitStatus.VALID
    assert len(result.errors) == 0
    assert result.details.get("footprint_area_sqm", 0) > 0
    assert result.details.get("volume_cubic_m", 0) > 0


def test_duplicate_unit_id_in_batch():
    """Duplicate unit IDs in batch validation must be marked INVALID."""
    u1 = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
    )
    u2 = Unit(
        unit_id="BLD-01-FL05-U501", # Duplicate ID!
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="502",
        base_elevation=100.0,
        top_elevation=103.0,
    )

    resp = UnitService.validate_batch(
        units=[u1, u2],
        floors=[TEST_PARENT_FLOOR],
        buildings=[TEST_PARENT_BUILDING],
        parcels=[TEST_PARENT_PARCEL],
    )

    assert resp.total_units == 2
    assert resp.invalid_units == 2
    assert any("Duplicate unit_id" in err for r in resp.results for err in r.errors)


def test_duplicate_unit_number_on_same_floor():
    """Two different unit IDs with the same unit_number on the same floor must fail."""
    u1 = Unit(
        unit_id="BLD-01-FL05-U501A",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
    )
    u2 = Unit(
        unit_id="BLD-01-FL05-U501B",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501", # Duplicate number on same floor!
        base_elevation=100.0,
        top_elevation=103.0,
    )

    res = UnitService.validate_unit(
        unit=u1,
        parent_floor=TEST_PARENT_FLOOR,
        sibling_units=[u2],
    )

    assert res.valid is False
    assert any("Duplicate unit_number" in err for err in res.errors)


def test_hierarchy_mismatches():
    """Mismatched parent references must fail validation."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-02", # Wrong parcel!
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
    )

    res = UnitService.validate_unit(
        unit=unit,
        parent_parcel={"parcel_id": "PARCEL-01"}, # Expects PARCEL-01
        parent_building=TEST_PARENT_BUILDING, # Belongs to PARCEL-01
    )

    assert res.valid is False
    assert any("Mismatched parent parcel" in err or "belongs to parcel 'PARCEL-01'" in err for err in res.errors)


def test_invalid_vertical_extent():
    """top_elevation <= base_elevation must be rejected."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=105.0,
        top_elevation=100.0, # Top is lower than base!
    )

    res = UnitService.validate_unit(unit=unit, parent_floor=TEST_PARENT_FLOOR)
    assert res.valid is False
    assert any("top_elevation" in err and "greater than base_elevation" in err for err in res.errors)


def test_vertical_extent_outside_parent_floor():
    """Unit vertical interval exceeding floor vertical interval must fail (no silent clamping)."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=98.0, # Below floor base 100.0!
        top_elevation=103.0,
    )

    res = UnitService.validate_unit(unit=unit, parent_floor=TEST_PARENT_FLOOR)
    assert res.valid is False
    assert any("extends outside parent floor vertical span" in err for err in res.errors)


def test_footprint_outside_parent_building():
    """Unit footprint extending outside parent building boundary must be rejected."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8550, 18.5190], # Outside building [73.8560, 18.5200]!
                    [73.8565, 18.5190],
                    [73.8565, 18.5205],
                    [73.8550, 18.5205],
                    [73.8550, 18.5190]
                ]
            ]
        },
    )

    res = UnitService.validate_unit(unit=unit, parent_building=TEST_PARENT_BUILDING)
    assert res.valid is False
    assert any("extends beyond parent building" in err for err in res.errors)


def test_overlapping_units_on_same_floor():
    """Two units with positive area overlap on the same floor are INVALID."""
    u1 = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8561, 18.5201],
                    [73.8565, 18.5201],
                    [73.8565, 18.5205],
                    [73.8561, 18.5205],
                    [73.8561, 18.5201]
                ]
            ]
        },
    )
    u2 = Unit(
        unit_id="BLD-01-FL05-U502",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="502",
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8564, 18.5204], # Overlaps u1 from [73.8564, 18.5204] to [73.8565, 18.5205]!
                    [73.8568, 18.5204],
                    [73.8568, 18.5208],
                    [73.8564, 18.5208],
                    [73.8564, 18.5204]
                ]
            ]
        },
    )

    res = UnitService.validate_unit(unit=u1, parent_floor=TEST_PARENT_FLOOR, sibling_units=[u2])
    assert res.valid is False
    assert any("Positive area overlap detected" in err for err in res.errors)


def test_touching_unit_boundaries_is_allowed():
    """Units touching along a shared wall boundary (zero area overlap) are VALID."""
    u1 = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8561, 18.5201],
                    [73.8565, 18.5201],
                    [73.8565, 18.5205],
                    [73.8561, 18.5205],
                    [73.8561, 18.5201]
                ]
            ]
        },
    )
    u2 = Unit(
        unit_id="BLD-01-FL05-U502",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="502",
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d={
            "type": "Polygon",
            "coordinates": [
                [
                    [73.8565, 18.5201], # Touches u1 along x = 73.8565 line!
                    [73.8569, 18.5201],
                    [73.8569, 18.5205],
                    [73.8565, 18.5205],
                    [73.8565, 18.5201]
                ]
            ]
        },
    )

    res = UnitService.validate_unit(unit=u1, parent_floor=TEST_PARENT_FLOOR, sibling_units=[u2])
    assert res.valid is True
    assert res.status == UnitStatus.VALID


def test_deterministic_unit_id_generation():
    """Verifies deterministic unit ID naming convention."""
    uid1 = UnitService.generate_unit_id("BLD-DEMO-002", "BLD-DEMO-002-FL05", "501")
    assert uid1 == "BLD-DEMO-002-FL05-U501"

    uid2 = UnitService.generate_unit_id("BLD-01", "03", "304")
    assert uid2 == "BLD-01-FL03-U304"


def test_unit_property_record_creation():
    """Conceptual 3D property record generation and disclaimer."""
    unit = Unit(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Executive Suite 501",
        base_elevation=100.0,
        top_elevation=103.0,
        footprint_area=52.5,
        volume_cubic_m=157.5,
        status=UnitStatus.VALID,
    )

    rec = UnitService.create_property_record(unit)
    assert rec.unit_id == "BLD-01-FL05-U501"
    assert rec.unit_number == "501"
    assert rec.z_range_amsl == {"min_z": 100.0, "max_z": 103.0}
    assert rec.volume_cubic_m == 157.5
    assert "NOT AN OFFICIAL GOVERNMENT TITLE" in rec.disclaimer


# --- API Endpoint Tests ---

def test_api_demo_units_endpoint():
    """GET /api/v1/units/demo returns the synthetic demo dataset."""
    response = client.get("/api/v1/units/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 4

    feat0 = data["features"][0]
    assert feat0["properties"]["unit_number"] == "501"
    assert feat0["properties"]["building_id"] == "BLD-DEMO-002"
    assert feat0["properties"]["floor_id"] == "BLD-DEMO-002-FL05"


def test_api_validate_unit_endpoint():
    """POST /api/v1/units/validate validates a unit payload."""
    payload = {
        "unit": {
            "unit_id": "BLD-01-FL05-U501",
            "parcel_id": "PARCEL-01",
            "building_id": "BLD-01",
            "floor_id": "BLD-01-FL05",
            "unit_number": "501",
            "base_elevation": 100.0,
            "top_elevation": 103.0,
            "geometry_2d": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [73.8561, 18.5201],
                        [73.8564, 18.5201],
                        [73.8564, 18.5204],
                        [73.8561, 18.5204],
                        [73.8561, 18.5201]
                    ]
                ]
            }
        },
        "parent_floor": TEST_PARENT_FLOOR,
        "parent_building": TEST_PARENT_BUILDING,
        "parent_parcel": TEST_PARENT_PARCEL
    }

    response = client.post("/api/v1/units/validate", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["valid"] is True
    assert res_data["status"] == "VALID"


def test_api_query_units_by_building_and_floor():
    """GET /api/v1/units/building/{building_id} and /floor/{floor_id}."""
    bld_resp = client.get("/api/v1/units/building/BLD-DEMO-002")
    assert bld_resp.status_code == 200
    bld_units = bld_resp.json()
    assert len(bld_units) >= 4

    fl_resp = client.get("/api/v1/units/floor/BLD-DEMO-002-FL05")
    assert fl_resp.status_code == 200
    fl_units = fl_resp.json()
    assert len(fl_units) >= 4
    assert all(u["floor_id"] == "BLD-DEMO-002-FL05" for u in fl_units)


def test_api_property_record_endpoint():
    """GET /api/v1/units/property-record/{unit_id}."""
    resp = client.get("/api/v1/units/property-record/BLD-DEMO-002-FL05-U501")
    assert resp.status_code == 200
    rec = resp.json()
    assert rec["unit_number"] == "501"
    assert rec["z_range_amsl"]["min_z"] == 577.48
    assert rec["z_range_amsl"]["max_z"] == 580.48
    assert "CONCEPTUAL 3D PROPERTY RECORD" in rec["disclaimer"]
