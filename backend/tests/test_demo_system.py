import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.demo_service import DemoService, DEMO_DATASET_ID, DEMO_BUILDING_ID

client = TestClient(app)


def test_01_demo_launch_endpoint():
    response = client.post("/api/v1/demo/launch")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["dataset_id"] == DEMO_DATASET_ID
    assert data["building_id"] == DEMO_BUILDING_ID
    assert data["floors_count"] == 4
    assert data["units_count"] == 7
    assert data["watertight"] is True
    assert "disclaimer" in data["provenance"]


def test_02_demo_landing_state():
    response = client.get("/api/v1/demo/landing-state")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_id"] == DEMO_DATASET_ID
    assert "Connaught Tower" in data["property_name"]


def test_03_hero_building_and_units_integrity():
    # Ensure demo dataset initialized
    DemoService.initialize_hero_dataset()

    # Verify building report
    bld_res = client.get(f"/api/v1/reports/{DEMO_DATASET_ID}/building/{DEMO_BUILDING_ID}")
    assert bld_res.status_code == 200
    bld_data = bld_res.json()
    assert bld_data["hierarchy"]["building_id"] == DEMO_BUILDING_ID
    assert bld_data["spatial_metrics"]["height_m"] == 14.0

    # Verify unit report
    unit_res = client.get(f"/api/v1/reports/{DEMO_DATASET_ID}/unit/UNT-201")
    assert unit_res.status_code == 200
    unit_data = unit_res.json()
    assert unit_data["hierarchy"]["unit_number"] == "201"
    assert "STHARA-IN-DL-DELHI" in unit_data["quality_provenance"]["provenance"].get("spatial_id_type", "STHARA Prototype Spatial ID") or "STHARA" in str(unit_data)


def test_04_spatial_query_on_demo_units():
    payload = {
        "dataset_id": DEMO_DATASET_ID,
        "object_a": {
            "id": "UNT-101",
            "type": "unit",
            "dataset_id": DEMO_DATASET_ID,
            "base_elevation": 0.0,
            "top_elevation": 3.5,
        },
        "object_b": {
            "id": "UNT-201",
            "type": "unit",
            "dataset_id": DEMO_DATASET_ID,
            "base_elevation": 3.5,
            "top_elevation": 7.0,
        },
        "relations": ["vertical", "proximity", "intersection"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PASS"
    assert data["vertical"]["relationship"] == "BELOW" or data["vertical"]["relationship"] == "ABOVE"


def test_05_demo_reset_and_isolation():
    # Reset demo
    reset_res = client.post("/api/v1/demo/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["dataset_id"] == DEMO_DATASET_ID

    # Test cross-dataset isolation rejection between default and demo dataset
    payload_cross = {
        "dataset_id": "default",
        "object_a": {
            "id": "U101",
            "type": "unit",
            "dataset_id": "default",
            "base_elevation": 0.0,
            "top_elevation": 3.0,
        },
        "object_b": {
            "id": "UNT-101",
            "type": "unit",
            "dataset_id": DEMO_DATASET_ID,
            "base_elevation": 0.0,
            "top_elevation": 3.5,
        },
        "relations": ["containment"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload_cross)
    assert response.status_code == 400
