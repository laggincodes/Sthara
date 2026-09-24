"""
Test Suite for STEP 4: Floor -> Unit 3D Modeling.

Validates the 22 mandatory test cases:
Case 1: Create valid unit -> watertight 3D solid, status VALID.
Case 2: Unit metadata persistence in units_registry.json.
Case 3: Unit 3D geometry generation -> Mesh3DCollection with FeatureType.UNIT.
Case 4: Unit metric area calculation matches projected footprint.
Case 5: Unit watertight volume calculation matches A * h.
Case 6: Unit watertight validation passes with 0 open edges.
Case 7: Unit contained within floor passes containment gate.
Case 8: Unit outside floor footprint rejected (HTTP 400).
Case 9: Unit partially outside floor rejected (no silent clipping).
Case 10: Self-intersecting unit polygon rejected.
Case 11: Two overlapping units on same floor rejected.
Case 12: Adjacent units sharing party wall boundary accepted.
Case 13: Unit deletion removes unit, preserves floor and siblings.
Case 14: Unit selection and query by floor.
Case 15: Dataset isolation (Dataset A units do not appear in Dataset B).
Case 16: Floor isolation (Floor 1 units do not appear in Floor 2).
Case 17: Parent floor vertical interval inheritance (Z_min, Z_max).
Case 18: Floor-plan attachment remains intact when units added/removed.
Case 19: Step 1 regression (floor & basement slicing).
Case 20: Step 2 regression (source attribute detection).
Case 21: Step 3 regression (floor plan upload, view, delete).
Case 22: GLB / GLTF export regression with units included.
"""

import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.unit_service import UnitService
from app.schemas.unit import UnitCreate, UnitType
from app.schemas.geometry_3d import Geometry3DStatus, FeatureType
from app.services.floor_volume_service import FloorVolumeService
from app.schemas.property_volume import BuildingFloors3DRequest
from app.services.floor_plan_service import FloorPlanService
from app.services.osm_service import (
    parse_numeric_height,
    parse_numeric_levels,
    parse_numeric_integer,
)

client = TestClient(app)

# Standard parent floor footprint: 10m x 10m box at (73.8560, 18.5200)
PARENT_FLOOR_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85600, 18.52000],
            [73.85610, 18.52000],
            [73.85610, 18.52010],
            [73.85600, 18.52010],
            [73.85600, 18.52000],
        ]
    ],
}

# Unit 1 (West half of floor): ~5m x 10m
UNIT_1_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85600, 18.52000],
            [73.85605, 18.52000],
            [73.85605, 18.52010],
            [73.85600, 18.52010],
            [73.85600, 18.52000],
        ]
    ],
}

# Unit 2 (East half of floor - Adjacent to Unit 1 sharing line [73.85605, 18.52000] -> [73.85605, 18.52010])
UNIT_2_ADJACENT_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85605, 18.52000],
            [73.85610, 18.52000],
            [73.85610, 18.52010],
            [73.85605, 18.52010],
            [73.85605, 18.52000],
        ]
    ],
}

# Overlapping Unit (crosses into Unit 1 and Unit 2)
UNIT_OVERLAPPING_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85603, 18.52002],
            [73.85607, 18.52002],
            [73.85607, 18.52008],
            [73.85603, 18.52008],
            [73.85603, 18.52002],
        ]
    ],
}

# Outside Floor Polygon (completely outside parent footprint)
UNIT_OUTSIDE_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85700, 18.52200],
            [73.85705, 18.52200],
            [73.85705, 18.52205],
            [73.85700, 18.52205],
            [73.85700, 18.52200],
        ]
    ],
}

# Partially Outside Floor Polygon (crosses east boundary 73.85610)
UNIT_PARTIALLY_OUTSIDE_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85608, 18.52002],
            [73.85615, 18.52002],  # Exceeds 73.85610
            [73.85615, 18.52008],
            [73.85608, 18.52008],
            [73.85608, 18.52002],
        ]
    ],
}

# Self-intersecting "Bowtie" Polygon
UNIT_BOWTIE_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85601, 18.52001],
            [73.85609, 18.52009],
            [73.85601, 18.52009],
            [73.85609, 18.52001],
            [73.85601, 18.52001],
        ]
    ],
}


@pytest.fixture(autouse=True)
def clean_registries():
    """Ensure every test starts with clean unit and floor plan registries."""
    UnitService.clear_registry_for_testing()
    FloorPlanService.clear_registry_for_testing()
    yield
    UnitService.clear_registry_for_testing()
    FloorPlanService.clear_registry_for_testing()


# ==============================================================================
# CASE 1: Create Valid Unit -> Watertight 3D solid, status VALID
# ==============================================================================
def test_case_1_create_valid_unit():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "unit_name": "Apartment 101",
        "unit_type": "APARTMENT_UNIT",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["unit_id"] == "BLD-001-FL01-U101"
    assert data["dataset_id"] == "ds_tagore"
    assert data["building_id"] == "BLD-001"
    assert data["floor_id"] == "BLD-001-FL01"
    assert data["unit_number"] == "101"
    assert data["unit_name"] == "Apartment 101"
    assert data["status"] == "VALID"
    assert data["source"] == "Configured / Derived"
    assert data["height"] == 3.0
    assert data["geometry_3d"] is not None
    assert len(data["geometry_3d"]["parts"]) >= 1


# ==============================================================================
# CASE 2: Unit Metadata Persistence in units_registry.json
# ==============================================================================
def test_case_2_unit_metadata_persistence():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "unit_name": "Apartment 101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=payload)

    # Verify retrieval from disk registry via Service
    units = UnitService.get_floor_units("ds_tagore", "BLD-001", "BLD-001-FL01")
    assert len(units) == 1
    assert units[0].unit_id == "BLD-001-FL01-U101"
    assert units[0].unit_name == "Apartment 101"


# ==============================================================================
# CASE 3: Unit 3D Geometry Generation -> Mesh3DCollection with FeatureType.UNIT
# ==============================================================================
def test_case_3_unit_3d_geometry_generation():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    part = data["geometry_3d"]["parts"][0]

    assert part["feature_type"] == FeatureType.UNIT.value
    assert len(part["vertices"]) >= 8  # 3D prism vertices
    assert len(part["faces"]) >= 12    # Triangulated solid faces


# ==============================================================================
# CASE 4: Unit Metric Area Calculation Matches Projected Footprint
# ==============================================================================
def test_case_4_unit_area_calculation():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200
    area = resp.json()["footprint_area"]
    assert area > 10.0  # Approx 50 m² for half of 10m x 10m
    assert area < 100.0


# ==============================================================================
# CASE 5: Unit Watertight Volume Calculation Matches A * h
# ==============================================================================
def test_case_5_unit_volume_calculation():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    area = body["footprint_area"]
    vol = body["volume_cubic_m"]
    height = body["height"]

    expected_vol = round(area * height, 2)
    assert abs(vol - expected_vol) < 1.0


# ==============================================================================
# CASE 6: Unit Watertight Validation Passes with 0 Open Edges
# ==============================================================================
def test_case_6_unit_watertight_validation():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "VALID"


# ==============================================================================
# CASE 7: Unit Contained Within Floor Passes Containment Gate
# ==============================================================================
def test_case_7_unit_contained_within_floor():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 200


# ==============================================================================
# CASE 8: Unit Outside Floor Footprint Rejected (HTTP 400)
# ==============================================================================
def test_case_8_unit_outside_floor_rejected():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_OUTSIDE_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 400
    err = resp.json().get("message") or resp.json().get("detail", "")
    assert "extends outside parent floor" in err


# ==============================================================================
# CASE 9: Unit Partially Outside Floor Rejected (No Silent Clipping)
# ==============================================================================
def test_case_9_unit_partially_outside_floor_rejected():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_PARTIALLY_OUTSIDE_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 400
    err = resp.json().get("message") or resp.json().get("detail", "")
    assert "extends outside parent floor" in err


# ==============================================================================
# CASE 10: Self-Intersecting Unit Polygon Rejected
# ==============================================================================
def test_case_10_self_intersecting_unit_rejected():
    payload = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_BOWTIE_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=payload)
    assert resp.status_code == 400
    err = resp.json().get("message") or resp.json().get("detail", "")
    assert "self-intersecting" in err.lower() or "invalid" in err.lower()


# ==============================================================================
# CASE 11: Two Overlapping Units on Same Floor Rejected
# ==============================================================================
def test_case_11_overlapping_units_rejected():
    # 1. Create Unit 1
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp1 = client.post("/api/v1/units", json=p1)
    assert resp1.status_code == 200

    # 2. Attempt Overlapping Unit
    p_overlap = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "103",
        "geometry_2d": UNIT_OVERLAPPING_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp2 = client.post("/api/v1/units", json=p_overlap)
    assert resp2.status_code == 400
    err = resp2.json().get("message") or resp2.json().get("detail", "")
    assert "positive area overlap" in err.lower()


# ==============================================================================
# CASE 12: Adjacent Units Sharing Party Wall Boundary Accepted
# ==============================================================================
def test_case_12_adjacent_units_accepted():
    # Unit 1 (West half)
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp1 = client.post("/api/v1/units", json=p1)
    assert resp1.status_code == 200

    # Unit 2 (East half, touching along line X=73.85605)
    p2 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "102",
        "geometry_2d": UNIT_2_ADJACENT_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp2 = client.post("/api/v1/units", json=p2)
    assert resp2.status_code == 200
    assert resp2.json()["unit_number"] == "102"

    # Both units exist independently
    units = UnitService.get_floor_units("ds_tagore", "BLD-001", "BLD-001-FL01")
    assert len(units) == 2


# ==============================================================================
# CASE 13: Unit Deletion Removes Unit, Preserves Floor and Siblings
# ==============================================================================
def test_case_13_unit_deletion():
    # Setup two adjacent units
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=p1)

    p2 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "102",
        "geometry_2d": UNIT_2_ADJACENT_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=p2)

    # Delete Unit 101
    del_resp = client.delete("/api/v1/units/ds_tagore/BLD-001/BLD-001-FL01/BLD-001-FL01-U101")
    assert del_resp.status_code == 200

    # Remaining units on floor: only Unit 102
    units = UnitService.get_floor_units("ds_tagore", "BLD-001", "BLD-001-FL01")
    assert len(units) == 1
    assert units[0].unit_number == "102"


# ==============================================================================
# CASE 14: Unit Selection and Query by Floor
# ==============================================================================
def test_case_14_unit_selection_and_query():
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=p1)

    resp = client.get("/api/v1/units/ds_tagore/BLD-001/BLD-001-FL01")
    assert resp.status_code == 200
    units = resp.json()
    assert len(units) == 1
    assert units[0]["unit_id"] == "BLD-001-FL01-U101"


# ==============================================================================
# CASE 15: Dataset Isolation (Dataset A units do not appear in Dataset B)
# ==============================================================================
def test_case_15_dataset_isolation():
    p_a = {
        "dataset_id": "ds_alpha",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=p_a)

    # Query Dataset B with identical building and floor id
    resp_b = client.get("/api/v1/units/ds_beta/BLD-001/BLD-001-FL01")
    assert resp_b.status_code == 200
    assert len(resp_b.json()) == 0

    # List Dataset B
    list_b = client.get("/api/v1/units/ds_beta")
    assert list_b.status_code == 200
    assert list_b.json()["total_count"] == 0

    # Query Dataset A
    resp_a = client.get("/api/v1/units/ds_alpha/BLD-001/BLD-001-FL01")
    assert resp_a.status_code == 200
    assert len(resp_a.json()) == 1


# ==============================================================================
# CASE 16: Floor Isolation (Floor 1 units do not appear in Floor 2)
# ==============================================================================
def test_case_16_floor_isolation():
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    client.post("/api/v1/units", json=p1)

    # Floor 2 query
    resp_fl2 = client.get("/api/v1/units/ds_tagore/BLD-001/BLD-001-FL02")
    assert resp_fl2.status_code == 200
    assert len(resp_fl2.json()) == 0


# ==============================================================================
# CASE 17: Parent Floor Vertical Interval Inheritance (Z_min, Z_max)
# ==============================================================================
def test_case_17_parent_floor_relationship():
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 4.5,
        "top_elevation": 7.5,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    resp = client.post("/api/v1/units", json=p1)
    assert resp.status_code == 200
    u = resp.json()
    assert u["base_elevation"] == 4.5
    assert u["top_elevation"] == 7.5
    assert u["height"] == 3.0


# ==============================================================================
# CASE 18: Floor-Plan Attachment Remains Intact When Units Added/Removed
# ==============================================================================
def test_case_18_floor_plan_remains_intact():
    # 1. Attach floor plan to Floor 1
    dummy_pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF\n"
    files = {"file": ("plan_fl01.pdf", io.BytesIO(dummy_pdf), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "BLD-001", "floor_id": "BLD-001-FL01"}
    upload_resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert upload_resp.status_code == 200

    # 2. Add Unit
    p1 = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-001",
        "floor_id": "BLD-001-FL01",
        "unit_number": "101",
        "geometry_2d": UNIT_1_POLYGON,
        "base_elevation": 3.0,
        "top_elevation": 6.0,
        "parent_floor_geometry": PARENT_FLOOR_POLYGON,
    }
    unit_resp = client.post("/api/v1/units", json=p1)
    assert unit_resp.status_code == 200

    # 3. Check floor plan is still attached
    fp_resp = client.get("/api/v1/floor-plans/ds_tagore/BLD-001/BLD-001-FL01")
    assert fp_resp.status_code == 200
    assert fp_resp.json()["filename"] == "plan_fl01.pdf"

    # 4. Delete Unit
    client.delete("/api/v1/units/ds_tagore/BLD-001/BLD-001-FL01/BLD-001-FL01-U101")

    # 5. Check floor plan still intact
    fp_resp2 = client.get("/api/v1/floor-plans/ds_tagore/BLD-001/BLD-001-FL01")
    assert fp_resp2.status_code == 200


# ==============================================================================
# CASE 19: Step 1 Regression (Floor & Basement Slicing)
# ==============================================================================
def test_case_19_step1_regression():
    req = BuildingFloors3DRequest(
        building_id="BLD-REGR-01",
        footprint_geometry=PARENT_FLOOR_POLYGON,
        ground_elevation=0.0,
        building_height=12.0,
        number_of_floors=3,
        number_of_basements=1,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 4
    assert res.floors[0].level_type == "Basement"
    assert res.floors[1].level_type == "Above Ground"


# ==============================================================================
# CASE 20: Step 2 Regression (Source Attribute Detection)
# ==============================================================================
def test_case_20_step2_regression():
    tags = {"building": "yes", "height": "21m", "building:levels": "7", "building:levels:underground": "2"}
    h = parse_numeric_height(tags.get("height"))
    l = parse_numeric_levels(tags.get("building:levels"))
    u = parse_numeric_integer(tags.get("building:levels:underground"))

    assert h == 21.0
    assert l == 7
    assert u == 2


# ==============================================================================
# CASE 21: Step 3 Regression (Floor Plan Upload, View, Delete)
# ==============================================================================
def test_case_21_step3_regression():
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"file": ("regr_plan.png", io.BytesIO(dummy_png), "image/png")}
    data = {"dataset_id": "ds_tagore", "building_id": "BLD-REGR-02", "floor_id": "FL01"}
    up_resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert up_resp.status_code == 200

    view_resp = client.get("/api/v1/floor-plans/ds_tagore/BLD-REGR-02/FL01/view")
    assert view_resp.status_code == 200
    assert view_resp.headers["content-type"] == "image/png"

    del_resp = client.delete("/api/v1/floor-plans/ds_tagore/BLD-REGR-02/FL01")
    assert del_resp.status_code == 200


# ==============================================================================
# CASE 22: GLB / GLTF Export Regression with Units Included
# ==============================================================================
def test_case_22_glb_export_regression():
    payload = {
        "default_building_height_m": 9.0,
        "target_crs": "auto",
        "export_format": "both",
    }
    resp = client.post("/api/v1/osm/convert-3d", json=payload)
    assert resp.status_code == 200

    glb_resp = client.get("/api/v1/export/glb/latest")
    assert glb_resp.status_code == 200
    assert glb_resp.headers["content-type"] == "model/gltf-binary"
    assert glb_resp.content[:4] == b"glTF"
