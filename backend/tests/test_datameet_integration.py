import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_datameet_metadata():
    response = client.get("/api/v1/datameet/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["source_name"] == "DataMeet Maps"
    assert "https://github.com/datameet/maps.git" in data["repository_url"]
    assert "Creative Commons" in data["license"] or "ODbL" in data["license"]
    assert data["source_crs"] == "EPSG:4326"
    assert "delhi_assembly_constituencies" in data["datasets"]
    assert "delhi_districts" in data["datasets"]


def test_list_datameet_layers():
    response = client.get("/api/v1/datameet/layers")
    assert response.status_code == 200
    layers = response.json()
    assert isinstance(layers, list)
    assert len(layers) >= 3

    layer_ids = [l["layer_id"] for l in layers]
    assert "delhi_assembly_constituencies" in layer_ids
    assert "delhi_districts" in layer_ids
    assert "delhi_state_boundary" in layer_ids

    ac_layer = next(l for l in layers if l["layer_id"] == "delhi_assembly_constituencies")
    assert ac_layer["feature_count"] == 70
    assert ac_layer["source_crs"] == "EPSG:4326"


def test_get_datameet_layer_geojson():
    response = client.get("/api/v1/datameet/layers/delhi_assembly_constituencies")
    assert response.status_code == 200
    geojson_data = response.json()
    assert geojson_data["type"] == "FeatureCollection"
    assert len(geojson_data["features"]) == 70

    # Test districts layer
    dist_resp = client.get("/api/v1/datameet/layers/delhi_districts")
    assert dist_resp.status_code == 200
    dist_data = dist_resp.json()
    assert dist_data["type"] == "FeatureCollection"
    assert len(dist_data["features"]) == 9


def test_get_datameet_layer_not_found():
    response = client.get("/api/v1/datameet/layers/non_existent_layer")
    assert response.status_code == 404


def test_datameet_align_osm_rajouri_garden():
    payload = {
        "layer_id": "delhi_assembly_constituencies",
        "aoi_name": "Rajouri Garden",
        "working_crs": "EPSG:32643",
    }
    response = client.post("/api/v1/datameet/align-osm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["aoi_name"] == "Rajouri Garden"
    assert data["state_name"] == "DELHI" or "Delhi" in data["state_name"]
    assert data["source_crs"] == "EPSG:4326"
    assert data["working_crs"] == "EPSG:32643"
    assert data["total_osm_buildings"] == 155
    assert data["buildings_inside_aoi"] == 155
    assert data["buildings_outside_aoi"] == 0
    assert "ALIGNED" in data["alignment_status"]
    assert len(data["boundary_rings"]) > 0
    assert "DataMeet Maps" in data["source_attribution"]["source"]


def test_datameet_align_osm_district_west():
    payload = {
        "layer_id": "delhi_districts",
        "aoi_name": "West",
        "working_crs": "EPSG:32643",
    }
    response = client.post("/api/v1/datameet/align-osm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["aoi_name"] == "West"
    assert data["buildings_inside_aoi"] == 155
    assert data["buildings_outside_aoi"] == 0
