import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

RECT_A = {
    "type": "Polygon",
    "coordinates": [[
        [77.100, 28.600],
        [77.102, 28.600],
        [77.102, 28.602],
        [77.100, 28.602],
        [77.100, 28.600]
    ]]
}

RECT_INSIDE = {
    "type": "Polygon",
    "coordinates": [[
        [77.1005, 28.6005],
        [77.1015, 28.6005],
        [77.1015, 28.6015],
        [77.1005, 28.6015],
        [77.1005, 28.6005]
    ]]
}

RECT_ADJACENT = {
    "type": "Polygon",
    "coordinates": [[
        [77.102, 28.600],
        [77.104, 28.600],
        [77.104, 28.602],
        [77.102, 28.602],
        [77.102, 28.600]
    ]]
}

RECT_FAR = {
    "type": "Polygon",
    "coordinates": [[
        [77.200, 28.700],
        [77.202, 28.700],
        [77.202, 28.702],
        [77.200, 28.702],
        [77.200, 28.700]
    ]]
}


def test_combined_spatial_query_containment():
    payload = {
        "dataset_id": "ds_test",
        "object_a": {
            "id": "BLD-01",
            "type": "building",
            "dataset_id": "ds_test",
            "geometry": RECT_A,
            "base_elevation": 0.0,
            "top_elevation": 12.0
        },
        "object_b": {
            "id": "U101",
            "type": "unit",
            "dataset_id": "ds_test",
            "geometry": RECT_INSIDE,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "relations": ["containment", "vertical", "proximity"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PASS"
    assert data["containment"]["result"] is True
    assert data["containment"]["horizontal_contained"] is True
    assert data["containment"]["vertical_contained"] is True
    assert data["vertical"]["relationship"] in ["SAME_LEVEL", "OVERLAPPING_Z_RANGE"]


def test_combined_spatial_query_party_wall_touch():
    payload = {
        "dataset_id": "ds_test",
        "object_a": {
            "id": "U101",
            "type": "unit",
            "dataset_id": "ds_test",
            "geometry": RECT_A,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "object_b": {
            "id": "U102",
            "type": "unit",
            "dataset_id": "ds_test",
            "geometry": RECT_ADJACENT,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "relations": ["intersection", "proximity"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intersection"]["intersects"] is False
    assert data["intersection"]["boundary_touch"] is True
    assert data["intersection"]["intersection_area_sqm"] == 0.0
    assert data["proximity"]["distance_2d_m"] == 0.0


def test_cross_dataset_query_rejection():
    payload = {
        "dataset_id": "ds_alpha",
        "object_a": {
            "id": "U101",
            "type": "unit",
            "dataset_id": "ds_alpha",
            "geometry": RECT_A,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "object_b": {
            "id": "U201",
            "type": "unit",
            "dataset_id": "ds_beta",
            "geometry": RECT_INSIDE,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "relations": ["containment"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "different datasets" in str(data).lower()


def test_combined_spatial_query_vertical_relationships():
    payload_above = {
        "dataset_id": "ds_test",
        "object_a": {
            "id": "U201",
            "type": "unit",
            "dataset_id": "ds_test",
            "geometry": RECT_A,
            "base_elevation": 3.0,
            "top_elevation": 6.0
        },
        "object_b": {
            "id": "U101",
            "type": "unit",
            "dataset_id": "ds_test",
            "geometry": RECT_A,
            "base_elevation": 0.0,
            "top_elevation": 3.0
        },
        "relations": ["vertical"]
    }
    response = client.post("/api/v1/spatial-analysis/query", json=payload_above)
    assert response.status_code == 200
    data = response.json()
    assert data["vertical"]["relationship"] == "ABOVE"
    assert data["vertical"]["vertical_separation_m"] == 0.0
