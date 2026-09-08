"""
Tests for the new POST /api/v1/buildings/upload-osm endpoint.

Tests cover:
- Valid .osm upload - buildings extracted
- Wrong file extension - 400
- Malformed XML - 400
- Valid XML but wrong root element - 400
- Empty <osm> (no nodes/ways/relations) - 400
- OSM with buildings - building count > 0
- OSM without buildings (only roads) - 200 with 0 buildings extracted
- Oversized file - 413
- Deterministic repeated import - identical feature count
- Non-cadastral semantics verified on extracted features
"""
import io
import shutil
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.services.osm_service import (
    DEFAULT_RAW_OSM_PATH,
    DEFAULT_PROCESSED_BUILDINGS_PATH,
)

client = TestClient(app)


VALID_OSM_WITH_BUILDINGS = b"""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="pytest">
  <bounds minlat="28.640" minlon="77.110" maxlat="28.650" maxlon="77.120"/>
  <node id="1" lat="28.641" lon="77.111"/>
  <node id="2" lat="28.641" lon="77.113"/>
  <node id="3" lat="28.643" lon="77.113"/>
  <node id="4" lat="28.643" lon="77.111"/>
  <way id="101">
    <nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
    <tag k="building" v="residential"/>
    <tag k="name" v="Test House"/>
    <tag k="height" v="6"/>
    <tag k="building:levels" v="2"/>
  </way>
</osm>"""

VALID_OSM_WITHOUT_BUILDINGS = b"""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="pytest">
  <bounds minlat="28.640" minlon="77.110" maxlat="28.650" maxlon="77.120"/>
  <node id="10" lat="28.640" lon="77.110"/>
  <node id="11" lat="28.641" lon="77.111"/>
  <way id="901">
    <nd ref="10"/><nd ref="11"/>
    <tag k="highway" v="residential"/>
  </way>
</osm>"""

MALFORMED_XML = b"<osm version='0.6'><unclosed_tag>"

NON_OSM_XML = b'<?xml version="1.0"?><geojson><feature/></geojson>'

EMPTY_OSM = b'<?xml version="1.0" encoding="UTF-8"?><osm version="0.6"></osm>'

OSM_WITH_TWO_BUILDINGS = b"""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="pytest">
  <bounds minlat="28.640" minlon="77.110" maxlat="28.660" maxlon="77.130"/>
  <node id="1" lat="28.641" lon="77.111"/>
  <node id="2" lat="28.641" lon="77.113"/>
  <node id="3" lat="28.643" lon="77.113"/>
  <node id="4" lat="28.643" lon="77.111"/>
  <node id="5" lat="28.651" lon="77.121"/>
  <node id="6" lat="28.651" lon="77.123"/>
  <node id="7" lat="28.653" lon="77.123"/>
  <node id="8" lat="28.653" lon="77.121"/>
  <way id="101">
    <nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
    <tag k="building" v="residential"/>
  </way>
  <way id="102">
    <nd ref="5"/><nd ref="6"/><nd ref="7"/><nd ref="8"/><nd ref="5"/>
    <tag k="building" v="commercial"/>
  </way>
</osm>"""


def _post_osm(content: bytes, filename: str = "map.osm"):
    return client.post(
        "/api/v1/buildings/upload-osm",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
    )


def _get_error_message(resp) -> str:
    """Returns the error message from either 'message' or 'detail' key."""
    body = resp.json()
    return (body.get("message") or body.get("detail") or "").lower()


@pytest.fixture(autouse=True)
def restore_real_osm_after_test():
    """
    Saves the real map.osm before each test and restores it afterwards.
    This prevents destructive upload tests from corrupting the real dataset.
    """
    backup_path: Path | None = None
    if DEFAULT_RAW_OSM_PATH.exists():
        backup_path = DEFAULT_RAW_OSM_PATH.with_suffix(".osm.bak")
        shutil.copy2(DEFAULT_RAW_OSM_PATH, backup_path)
    yield
    # Restore real map.osm
    if backup_path is not None and backup_path.exists():
        shutil.copy2(backup_path, DEFAULT_RAW_OSM_PATH)
        backup_path.unlink()


class TestOsmUploadValidation:

    def test_wrong_extension_json(self):
        resp = _post_osm(VALID_OSM_WITH_BUILDINGS, filename="map.json")
        assert resp.status_code == 400
        assert "osm" in _get_error_message(resp)

    def test_wrong_extension_geojson(self):
        resp = _post_osm(VALID_OSM_WITH_BUILDINGS, filename="buildings.geojson")
        assert resp.status_code == 400

    def test_wrong_extension_txt(self):
        resp = _post_osm(b"<osm/>", filename="data.txt")
        assert resp.status_code == 400

    def test_malformed_xml(self):
        resp = _post_osm(MALFORMED_XML, filename="bad.osm")
        assert resp.status_code == 400
        msg = _get_error_message(resp)
        assert "xml" in msg or "malformed" in msg

    def test_non_osm_xml_root(self):
        resp = _post_osm(NON_OSM_XML, filename="geodata.osm")
        assert resp.status_code == 400
        assert "osm" in _get_error_message(resp)

    def test_empty_osm_no_elements(self):
        resp = _post_osm(EMPTY_OSM, filename="empty.osm")
        assert resp.status_code == 400

    def test_oversized_file(self):
        from app.api.routes.buildings import OSM_MAX_UPLOAD_BYTES
        big_content = b"x" * (OSM_MAX_UPLOAD_BYTES + 1)
        resp = _post_osm(big_content, filename="huge.osm")
        assert resp.status_code == 413


class TestOsmUploadSuccess:

    def test_valid_osm_with_buildings_extracts_correctly(self):
        resp = _post_osm(VALID_OSM_WITH_BUILDINGS, filename="test_map.osm")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["source_filename"] == "test_map.osm"
        data = body["data"]
        assert data["feature_count"] >= 1
        assert data["is_cadastral"] is False
        assert data["legal_status"] == "UNVERIFIED_PHYSICAL_SURFACE"
        assert data["source"] == "OpenStreetMap"
        summary = data["summary"]
        assert summary["total_extracted_buildings"] >= 1
        assert summary["validation"]["valid"] is True
        assert summary["validation"]["errors_count"] == 0

    def test_valid_osm_without_buildings_returns_zero_count(self):
        resp = _post_osm(VALID_OSM_WITHOUT_BUILDINGS, filename="roads_only.osm")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["data"]["feature_count"] == 0
        assert body["data"]["summary"]["total_extracted_buildings"] == 0

    def test_two_buildings_correctly_counted(self):
        resp = _post_osm(OSM_WITH_TWO_BUILDINGS, filename="two_buildings.osm")
        assert resp.status_code == 200
        assert resp.json()["data"]["feature_count"] == 2

    def test_non_cadastral_semantics_on_extracted_features(self):
        _post_osm(VALID_OSM_WITH_BUILDINGS, filename="map.osm")
        osm_resp = client.get("/api/v1/buildings/real-osm")
        assert osm_resp.status_code == 200
        features = osm_resp.json()["data"]["features"]
        for feat in features:
            props = feat["properties"]
            assert props["is_cadastral"] is False
            assert props["legal_status"] == "UNVERIFIED_PHYSICAL_SURFACE"
            assert props["source"] == "OpenStreetMap"

    def test_deterministic_repeated_import(self):
        resp1 = _post_osm(OSM_WITH_TWO_BUILDINGS, filename="repeat.osm")
        resp2 = _post_osm(OSM_WITH_TWO_BUILDINGS, filename="repeat.osm")
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["data"]["feature_count"] == resp2.json()["data"]["feature_count"] == 2

    def test_processed_geojson_written_to_disk(self):
        _post_osm(VALID_OSM_WITH_BUILDINGS, filename="disk_test.osm")
        assert DEFAULT_PROCESSED_BUILDINGS_PATH.exists()

    def test_osm_summary_contains_required_fields(self):
        resp = _post_osm(VALID_OSM_WITH_BUILDINGS, filename="map.osm")
        assert resp.status_code == 200
        summary = resp.json()["data"]["summary"]
        required_fields = [
            "source_file", "total_osm_nodes", "total_osm_ways",
            "total_osm_relations", "total_extracted_buildings",
            "ways_extracted", "relations_extracted", "degenerate_or_skipped",
            "buildings_with_height", "buildings_with_levels", "validation",
        ]
        for field in required_fields:
            assert field in summary, f"Missing summary field: {field}"


@pytest.mark.skipif(
    not DEFAULT_RAW_OSM_PATH.exists(),
    reason="Real map.osm not present on disk",
)
class TestRealMapOsmUpload:

    def test_real_map_osm_upload_returns_155_buildings(self):
        with open(DEFAULT_RAW_OSM_PATH, "rb") as f:
            content = f.read()
        resp = _post_osm(content, filename="map.osm")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["feature_count"] == 155
        assert data["summary"]["validation"]["valid"] is True
        assert data["summary"]["buildings_with_height"] == 0
        assert data["summary"]["buildings_with_levels"] == 0
