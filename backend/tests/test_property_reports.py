import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_building_report():
    response = client.get("/api/v1/reports/default/building/BLD-01")
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == "building"
    assert data["dataset_id"] == "default"
    assert "spatial_metrics" in data
    assert "disclaimer" in data
    assert "NOT establish legal ownership" in data["disclaimer"]


def test_get_floor_report():
    response = client.get("/api/v1/reports/default/floor/FL01")
    assert response.status_code == 200
    data = response.json()
    assert data["level"] == "floor"
    assert "spatial_metrics" in data
    assert "disclaimer" in data


def test_get_unit_report():
    response = client.get("/api/v1/reports/default/unit/U101")
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert data["level"] == "unit"
        assert "disclaimer" in data
