import io
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dataset_a_tagore_garden_resolution():
    """Verify default Dataset A resolves explicitly without fallback and has 155 features."""
    resp = client.get("/api/v1/osm/buildings?dataset_id=ds_tagore_garden_map_osm")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "success"
    assert data["dataset_id"] == "ds_tagore_garden_map_osm"
    assert data["dataset_name"] == "map.osm"
    assert data["feature_count"] == 155
    assert data["data"]["type"] == "FeatureCollection"
    assert len(data["data"]["features"]) == 155
    # Verify features have valid geometry in Delhi bbox (~77.11, ~28.65)
    f0 = data["data"]["features"][0]
    geom = f0["geometry"]
    if geom["type"] == "Polygon":
        pt = geom["coordinates"][0][0]
    elif geom["type"] == "MultiPolygon":
        pt = geom["coordinates"][0][0][0]
    else:
        pt = [77.11, 28.65]
    lon, lat = float(pt[0]), float(pt[1])
    assert 77.0 < lon < 77.3
    assert 28.5 < lat < 28.8

def test_sequential_a_to_b_to_c_switching_and_isolation():
    """
    Verify full A -> B -> C sequential dataset switching:
    - Dataset A (Tagore Garden, 155 buildings, Delhi)
    - Dataset B (Bengaluru Tech Park, 5 buildings, Karnataka)
    - Dataset C (Mumbai Coastal Sector, 2 buildings, Maharashtra)
    - Verify complete feature isolation, correct building counts, coordinates far from Delhi, and zero cross-dataset pollution.
    """
    # 1. Verify Dataset A
    resp_a = client.get("/api/v1/osm/buildings?dataset_id=ds_tagore_garden_map_osm")
    assert resp_a.status_code == 200
    assert resp_a.json()["feature_count"] == 155

    # 2. Upload Dataset B: Bengaluru (77.59, 12.97) - 5 buildings
    geojson_b = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": f"BLR-BLD-00{i}",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[77.590 + i*0.001, 12.970], [77.591 + i*0.001, 12.970], [77.591 + i*0.001, 12.971], [77.590 + i*0.001, 12.971], [77.590 + i*0.001, 12.970]]]
                },
                "properties": {
                    "building_id": f"BLR-BLD-00{i}",
                    "name": f"Bengaluru Tech Block {i}",
                    "building:levels": 5 + i
                }
            }
            for i in range(1, 6)
        ]
    }
    b_bytes = json.dumps(geojson_b).encode("utf-8")
    resp_upload_b = client.post(
        "/api/v1/osm/upload",
        files={"file": ("bengaluru_tech_park.geojson", io.BytesIO(b_bytes), "application/geo+json")}
    )
    assert resp_upload_b.status_code == 200, resp_upload_b.text
    ds_b_info = resp_upload_b.json()
    ds_b_id = ds_b_info["dataset_id"]
    assert "bengaluru" in ds_b_id

    # 3. Query 2D buildings for Dataset B
    resp_b_geo = client.get(f"/api/v1/osm/buildings?dataset_id={ds_b_id}")
    assert resp_b_geo.status_code == 200
    b_data = resp_b_geo.json()
    assert b_data["dataset_id"] == ds_b_id
    assert b_data["feature_count"] == 5
    assert len(b_data["data"]["features"]) == 5
    assert b_data["data"]["features"][0]["properties"]["building_id"] == "BLR-BLD-001"
    # Verify Bengaluru coordinate range
    b_lon = b_data["data"]["features"][0]["geometry"]["coordinates"][0][0][0]
    b_lat = b_data["data"]["features"][0]["geometry"]["coordinates"][0][0][1]
    assert 77.5 < b_lon < 77.7
    assert 12.8 < b_lat < 13.1

    # 4. Convert Dataset B to 3D
    resp_conv_b = client.post("/api/v1/osm/convert-3d", json={"dataset_id": ds_b_id})
    assert resp_conv_b.status_code == 200, resp_conv_b.text
    conv_b = resp_conv_b.json()
    assert conv_b["dataset_id"] == ds_b_id
    assert conv_b["summary"]["buildings"] == 5

    # 5. Upload Dataset C: Mumbai (72.87, 19.07) - 2 buildings
    geojson_c = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "MUM-TOWER-1",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[72.870, 19.070], [72.872, 19.070], [72.872, 19.072], [72.870, 19.072], [72.870, 19.070]]]
                },
                "properties": {"building_id": "MUM-TOWER-1", "name": "Nariman Heights", "building:levels": 20}
            },
            {
                "type": "Feature",
                "id": "MUM-TOWER-2",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[72.874, 19.070], [72.876, 19.070], [72.876, 19.072], [72.874, 19.072], [72.874, 19.070]]]
                },
                "properties": {"building_id": "MUM-TOWER-2", "name": "Bandra Arcade", "building:levels": 14}
            }
        ]
    }
    c_bytes = json.dumps(geojson_c).encode("utf-8")
    resp_upload_c = client.post(
        "/api/v1/osm/upload",
        files={"file": ("mumbai_coastal.geojson", io.BytesIO(c_bytes), "application/geo+json")}
    )
    assert resp_upload_c.status_code == 200
    ds_c_id = resp_upload_c.json()["dataset_id"]

    # 6. Query 2D buildings for Dataset C
    resp_c_geo = client.get(f"/api/v1/osm/buildings?dataset_id={ds_c_id}")
    assert resp_c_geo.status_code == 200
    c_data = resp_c_geo.json()
    assert c_data["dataset_id"] == ds_c_id
    assert c_data["feature_count"] == 2
    assert len(c_data["data"]["features"]) == 2
    assert c_data["data"]["features"][0]["properties"]["building_id"] == "MUM-TOWER-1"
    # Verify Mumbai coordinates
    c_lon = c_data["data"]["features"][0]["geometry"]["coordinates"][0][0][0]
    c_lat = c_data["data"]["features"][0]["geometry"]["coordinates"][0][0][1]
    assert 72.8 < c_lon < 73.0
    assert 19.0 < c_lat < 19.2

    # 7. Convert Dataset C to 3D
    resp_conv_c = client.post("/api/v1/osm/convert-3d", json={"dataset_id": ds_c_id})
    assert resp_conv_c.status_code == 200
    assert resp_conv_c.json()["summary"]["buildings"] == 2

    # 8. Switch back to Dataset A (Tagore Garden) and verify integrity
    resp_a_back = client.get("/api/v1/osm/buildings?dataset_id=ds_tagore_garden_map_osm")
    assert resp_a_back.status_code == 200
    assert resp_a_back.json()["feature_count"] == 155
    assert len(resp_a_back.json()["data"]["features"]) == 155

def test_invalid_dataset_id_returns_404_no_fallback():
    """Verify requesting a non-existent dataset returns HTTP 404 and does NOT fall back to map.osm."""
    resp = client.get("/api/v1/osm/buildings?dataset_id=ds_non_existent_fake_12345")
    assert resp.status_code == 404, resp.text
    err_json = resp.json()
    assert err_json.get("status") == "error"
    assert err_json.get("error_code") == "HTTP_404"
    msg = (err_json.get("message") or err_json.get("detail") or "").lower()
    assert "no 2d" in msg or "not found" in msg or "found" in msg
