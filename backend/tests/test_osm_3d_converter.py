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
        assert body["glb_url"] == "/api/v1/export/glb/latest"

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

