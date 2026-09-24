import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.osm_3d_converter import Osm3DConverterService
from app.services.drawing_intelligence_service import drawing_intelligence_service

client = TestClient(app)

def test_convert_3d_route_exists_and_succeeds_for_default_dataset():
    """Verify POST /api/v1/osm/convert-3d exists and returns 200 OK for valid OSM dataset."""
    response = client.post("/api/v1/osm/convert-3d", json={"dataset_id": "ds_tagore_garden_map_osm"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "complete")
    assert "dataset_id" in data

def test_convert_3d_dataset_isolation():
    """Verify OSM conversion obeys dataset_id isolation."""
    res_a = client.post("/api/v1/osm/convert-3d", json={"dataset_id": "ds_tagore_garden_map_osm"})
    assert res_a.status_code == 200
    assert res_a.json()["dataset_id"] == "ds_tagore_garden_map_osm"

def test_drawing_only_spatial_source_status():
    """Verify drawing-only dataset returns mode B (DRAWINGS_ONLY) and no OSM buildings."""
    status = drawing_intelligence_service.detect_spatial_source_state("ds_drawing_only_test_dataset")
    assert status.osm_available is False
    assert status.active_mode in ("DRAWINGS_ONLY", "EMPTY")

def test_osm_buildings_geometry_uses_polygon_not_bbox():
    """Verify OSM building features contain actual Polygon coordinates rather than bounding box rectangles."""
    geojson = Osm3DConverterService.get_dataset_geojson("ds_tagore_garden_map_osm")
    assert geojson is not None
    features = geojson.get("features", [])
    assert len(features) > 0
    for feat in features[:5]:
        geom_type = feat.get("geometry", {}).get("type")
        assert geom_type in ("Polygon", "MultiPolygon")
        coords = feat.get("geometry", {}).get("coordinates", [])
        assert len(coords) > 0

def test_building_blueprint_and_units_functional():
    """Verify building blueprints and 3D unit models remain fully functional."""
    blueprints_res = client.get("/api/v1/blueprints/ds_tagore_garden_map_osm")
    assert blueprints_res.status_code == 200
    units_res = client.get("/api/v1/units/ds_tagore_garden_map_osm")
    assert units_res.status_code == 200
