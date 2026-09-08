import io
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.services.osm_3d_converter import (
    Osm3DConverterService,
    OUTPUT_GLB_PATH,
    OUTPUT_GLTF_PATH,
    OUTPUT_METADATA_PATH,
    auto_detect_utm_crs,
)
from app.services.osm_service import DEFAULT_RAW_OSM_PATH
from app.schemas.osm_converter import Osm3DConversionConfig, HeightSourceOption

client = TestClient(app)

SAMPLE_OSM_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="pytest">
  <bounds minlat="28.640" minlon="77.110" maxlat="28.650" maxlon="77.120"/>
  <node id="1" lat="28.641" lon="77.111"/>
  <node id="2" lat="28.641" lon="77.113"/>
  <node id="3" lat="28.643" lon="77.113"/>
  <node id="4" lat="28.643" lon="77.111"/>
  <way id="101">
    <nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
    <tag k="building" v="residential"/>
    <tag k="name" v="Test Villa"/>
    <tag k="height" v="15"/>
    <tag k="building:levels" v="5"/>
  </way>
</osm>"""

SAMPLE_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "building_id": "BLD-GEO-01",
                "name": "Tower A",
                "height": 24.0,
                "building:levels": 8,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.111, 28.641],
                        [77.113, 28.641],
                        [77.113, 28.643],
                        [77.111, 28.643],
                        [77.111, 28.641],
                    ]
                ],
            },
        }
    ],
}


class TestUtmCrsCalculation:
    def test_delhi_utm_zone(self):
        crs = auto_detect_utm_crs(77.11, 28.64)
        assert crs == "EPSG:32643"

    def test_london_utm_zone(self):
        crs = auto_detect_utm_crs(-0.12, 51.50)
        assert crs == "EPSG:32630"

    def test_sydney_utm_zone_south(self):
        crs = auto_detect_utm_crs(151.20, -33.86)
        assert crs == "EPSG:32756"


class TestOsm3DConverterPipeline:
    def test_convert_sample_xml(self):
        config = Osm3DConversionConfig(
            height_source=HeightSourceOption.AUTOMATIC,
            default_floor_height_m=3.0,
            default_building_height_m=9.0,
        )
        res = Osm3DConverterService.convert_osm_to_3d(
            config=config,
            raw_xml_content=SAMPLE_OSM_XML.decode("utf-8"),
            source_name_override="sample.osm",
        )
        assert res.success is True
        assert res.summary.buildings == 1
        assert res.summary.vertices > 0
        assert res.summary.faces > 0
        assert len(res.stages) == 8
        assert all(s.status == "complete" for s in res.stages)
        assert res.buildings_metadata[0].height == 15.0

    def test_convert_levels_priority(self):
        config = Osm3DConversionConfig(
            height_source=HeightSourceOption.BUILDING_LEVELS,
            default_floor_height_m=3.5,
            default_building_height_m=10.0,
        )
        res = Osm3DConverterService.convert_osm_to_3d(
            config=config,
            raw_xml_content=SAMPLE_OSM_XML.decode("utf-8"),
            source_name_override="sample.osm",
        )
        assert res.success is True
        assert res.buildings_metadata[0].height == 17.5

    def test_convert_default_height_priority(self):
        config = Osm3DConversionConfig(
            height_source=HeightSourceOption.DEFAULT_HEIGHT,
            default_floor_height_m=3.0,
            default_building_height_m=12.0,
        )
        res = Osm3DConverterService.convert_osm_to_3d(
            config=config,
            raw_xml_content=SAMPLE_OSM_XML.decode("utf-8"),
            source_name_override="sample.osm",
        )
        assert res.success is True
        assert res.buildings_metadata[0].height == 12.0

    @pytest.mark.skipif(
        not DEFAULT_RAW_OSM_PATH.exists(),
        reason="Real map.osm not found on disk",
    )
    def test_convert_real_map_osm_155_buildings(self):
        config = Osm3DConversionConfig(
            height_source=HeightSourceOption.AUTOMATIC,
            default_floor_height_m=3.0,
            default_building_height_m=9.0,
            target_crs="auto",
        )
        res = Osm3DConverterService.convert_osm_to_3d(config)
        assert res.success is True
        assert res.summary.buildings == 155
        assert res.summary.vertices >= 1000
        assert res.summary.faces >= 1500
        assert OUTPUT_GLB_PATH.exists()
        assert OUTPUT_GLB_PATH.stat().st_size > 50000


class TestOsmConverterApiEndpoints:
    def test_post_convert_3d_endpoint(self):
        payload = {
            "height_source": "automatic",
            "default_floor_height_m": 3.0,
            "default_building_height_m": 9.0,
            "target_crs": "auto",
            "export_format": "both",
        }
        resp = client.post("/api/v1/osm/convert-3d", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["summary"]["buildings"] >= 1
        assert "/api/v1/export/glb/" in body["glb_url"]

    def test_get_conversion_status_endpoint(self):
        resp = client.get("/api/v1/osm/conversion-status")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

    def test_download_glb_endpoint(self):
        resp = client.get("/api/v1/export/glb/latest")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "model/gltf-binary"
        assert resp.content[:4] == b"glTF"

    def test_download_gltf_endpoint(self):
        resp = client.get("/api/v1/export/gltf/latest")
        assert resp.status_code == 200

    def test_download_metadata_endpoint(self):
        resp = client.get("/api/v1/export/metadata/latest")
        assert resp.status_code == 200
        data = resp.json()
        assert "buildings_count" in data
        assert "buildings" in data

    def test_upload_and_convert_endpoint(self):
        resp = client.post(
            "/api/v1/osm/upload-and-convert",
            files={"file": ("test_upload.osm", io.BytesIO(SAMPLE_OSM_XML), "application/octet-stream")},
            data={
                "height_source": "automatic",
                "default_floor_height_m": "3.0",
                "default_building_height_m": "9.0",
                "target_crs": "auto",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["summary"]["buildings"] == 1
        assert body["dataset_id"].startswith("ds_")

    def test_multi_dataset_isolation_and_no_stale_data(self):
        # 1. Convert Dataset A (Tagore Garden)
        resp_a = client.post("/api/v1/osm/convert-3d", json={"source_file": str(DEFAULT_RAW_OSM_PATH)})
        assert resp_a.status_code == 200
        data_a = resp_a.json()
        ds_id_a = data_a["dataset_id"]
        assert data_a["summary"]["buildings"] == 155

        # 2. Upload & Convert Dataset B (Single building)
        resp_b = client.post(
            "/api/v1/osm/upload-and-convert",
            files={"file": ("custom_area_b.osm", io.BytesIO(SAMPLE_OSM_XML), "application/octet-stream")},
            data={"height_source": "automatic"},
        )
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        ds_id_b = data_b["dataset_id"]
        assert data_b["summary"]["buildings"] == 1
        assert ds_id_a != ds_id_b

        # 3. Verify status endpoint for dataset A returns dataset A's 155 buildings, not B
        status_a = client.get(f"/api/v1/osm/conversion-status?dataset_id={ds_id_a}")
        assert status_a.status_code == 200
        assert status_a.json()["data"]["summary"]["buildings"] == 155
        assert status_a.json()["data"]["dataset_id"] == ds_id_a

        # 4. Verify status endpoint for dataset B returns dataset B's 1 building, not A
        status_b = client.get(f"/api/v1/osm/conversion-status?dataset_id={ds_id_b}")
        assert status_b.status_code == 200
        assert status_b.json()["data"]["summary"]["buildings"] == 1
        assert status_b.json()["data"]["dataset_id"] == ds_id_b

        # 5. Verify dataset-specific GLB downloads exist for both
        glb_a = client.get(f"/api/v1/export/glb/{ds_id_a}")
        assert glb_a.status_code == 200
        assert glb_a.headers["content-type"] == "model/gltf-binary"

        glb_b = client.get(f"/api/v1/export/glb/{ds_id_b}")
        assert glb_b.status_code == 200
        assert glb_b.headers["content-type"] == "model/gltf-binary"

    def test_restore_and_verify_real_map_osm_conversion(self):
        """Ensures that the final state after tests retains the real 155-building dataset."""
        if DEFAULT_RAW_OSM_PATH.exists():
            config = Osm3DConversionConfig(
                height_source=HeightSourceOption.AUTOMATIC,
                default_floor_height_m=3.0,
                default_building_height_m=9.0,
                target_crs="auto",
            )
            res = Osm3DConverterService.convert_osm_to_3d(config)
            assert res.success is True
            assert res.summary.buildings == 155
            assert res.mesh_data is not None
            assert len(res.mesh_data["results"]) == 155


