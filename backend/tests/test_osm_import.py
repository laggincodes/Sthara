import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.services.osm_service import (
    OSMBuildingExtractor,
    parse_numeric_height,
    parse_numeric_levels,
    DEFAULT_RAW_OSM_PATH,
    DEFAULT_PROCESSED_BUILDINGS_PATH,
)
from app.services.building_validator import BuildingValidator

client = TestClient(app)

SAMPLE_OSM_WAY_XML = """<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="test">
  <bounds minlat="28.640" minlon="77.110" maxlat="28.650" maxlon="77.120"/>
  <node id="1" lat="28.641" lon="77.111"/>
  <node id="2" lat="28.641" lon="77.113"/>
  <node id="3" lat="28.643" lon="77.113"/>
  <node id="4" lat="28.643" lon="77.111"/>
  <way id="101">
    <nd ref="1"/>
    <nd ref="2"/>
    <nd ref="3"/>
    <nd ref="4"/>
    <nd ref="1"/>
    <tag k="building" v="residential"/>
    <tag k="name" v="Tagore Villa"/>
    <tag k="height" v="12.5 m"/>
    <tag k="building:levels" v="4"/>
    <tag k="addr:street" v="Main Road"/>
  </way>
</osm>
"""

SAMPLE_OSM_MULTIPOLYGON_XML = """<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="test">
  <node id="10" lat="28.645" lon="77.115"/>
  <node id="11" lat="28.645" lon="77.119"/>
  <node id="12" lat="28.649" lon="77.119"/>
  <node id="13" lat="28.649" lon="77.115"/>
  
  <node id="20" lat="28.646" lon="77.116"/>
  <node id="21" lat="28.646" lon="77.118"/>
  <node id="22" lat="28.648" lon="77.118"/>
  <node id="23" lat="28.648" lon="77.116"/>

  <way id="201">
    <nd ref="10"/>
    <nd ref="11"/>
    <nd ref="12"/>
    <nd ref="13"/>
    <nd ref="10"/>
  </way>

  <way id="202">
    <nd ref="20"/>
    <nd ref="21"/>
    <nd ref="22"/>
    <nd ref="23"/>
    <nd ref="20"/>
  </way>

  <relation id="301">
    <member type="way" ref="201" role="outer"/>
    <member type="way" ref="202" role="inner"/>
    <tag k="type" v="multipolygon"/>
    <tag k="building" v="commercial"/>
    <tag k="name" v="Courtyard Complex"/>
  </relation>
</osm>
"""


def test_numeric_tag_parsers():
    """Verify height and floor level parsing handles strings, units, and missing values safely."""
    assert parse_numeric_height("15.5") == 15.5
    assert parse_numeric_height("12m") == 12.0
    assert parse_numeric_height(" 24.0 m ") == 24.0
    assert parse_numeric_height("unknown") is None
    assert parse_numeric_height(None) is None
    assert parse_numeric_height("-5") is None

    assert parse_numeric_levels("3") == 3
    assert parse_numeric_levels(" 5 ") == 5
    assert parse_numeric_levels("ground") is None
    assert parse_numeric_levels(None) is None


def test_osm_way_building_extraction():
    """Verify extraction of standard OSM building ways into GeoJSON features with strict semantics."""
    geojson, summary = OSMBuildingExtractor.extract_from_xml_string(SAMPLE_OSM_WAY_XML, "test_way.osm")

    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) == 1

    feature = geojson["features"][0]
    props = feature["properties"]

    # Deterministic ID
    assert feature["id"] == "OSM-BUILDING-WAY-101"
    assert props["building_id"] == "OSM-BUILDING-WAY-101"
    assert props["osm_id"] == "101"
    assert props["osm_type"] == "way"
    assert props["building"] == "residential"
    assert props["name"] == "Tagore Villa"
    assert props["height"] == 12.5
    assert props["building_levels"] == 4
    assert props["addr:street"] == "Main Road"

    # CRITICAL NON-CADASTRAL SEMANTIC ASSERTIONS
    assert props["is_cadastral"] is False
    assert props["legal_status"] == "UNVERIFIED_PHYSICAL_SURFACE"
    assert props["ownership_status"] == "UNKNOWN_UNREGISTERED"

    # Geometry verification
    assert feature["geometry"]["type"] == "Polygon"
    coords = feature["geometry"]["coordinates"][0]
    assert len(coords) == 5
    assert coords[0] == coords[-1]

    # Topology validation via BuildingValidator
    val = BuildingValidator.validate_buildings(geojson)
    assert val.valid is True
    assert len(val.errors) == 0


def test_osm_multipolygon_relation_extraction():
    """Verify extraction of OSM multipolygon building relations with outer and inner rings."""
    geojson, summary = OSMBuildingExtractor.extract_from_xml_string(SAMPLE_OSM_MULTIPOLYGON_XML, "test_mp.osm")

    assert len(geojson["features"]) == 1
    feature = geojson["features"][0]
    props = feature["properties"]

    assert feature["id"] == "OSM-BUILDING-REL-301"
    assert props["building_id"] == "OSM-BUILDING-REL-301"
    assert props["osm_type"] == "relation"
    assert props["building"] == "commercial"
    assert props["name"] == "Courtyard Complex"
    assert props["is_cadastral"] is False

    # Polygon with inner hole has 2 coordinate rings (outer + inner)
    assert feature["geometry"]["type"] == "Polygon"
    assert len(feature["geometry"]["coordinates"]) == 2

    # Validation
    val = BuildingValidator.validate_buildings(geojson)
    assert val.valid is True


def test_osm_extraction_skips_degenerate_and_non_buildings():
    """Verify unclosed ways, open lines, and non-building ways are not extracted as buildings."""
    bad_osm = """<?xml version="1.0" encoding="UTF-8"?>
    <osm version="0.6">
      <node id="1" lat="28.641" lon="77.111"/>
      <node id="2" lat="28.641" lon="77.113"/>
      <!-- Highway way without building tag -->
      <way id="901">
        <nd ref="1"/>
        <nd ref="2"/>
        <tag k="highway" v="residential"/>
      </way>
      <!-- Building way with < 4 nodes (open) -->
      <way id="902">
        <nd ref="1"/>
        <nd ref="2"/>
        <tag k="building" v="yes"/>
      </way>
    </osm>
    """
    geojson, summary = OSMBuildingExtractor.extract_from_xml_string(bad_osm, "degenerate.osm")
    assert len(geojson["features"]) == 0
    assert summary["total_extracted_buildings"] == 0
    assert summary["degenerate_or_skipped"] >= 1


@pytest.mark.skipif(not DEFAULT_RAW_OSM_PATH.exists(), reason="map.osm raw dataset not found")
def test_real_map_osm_file_extraction():
    """Test extraction of the actual map.osm file."""
    geojson, summary = OSMBuildingExtractor.extract_from_file(DEFAULT_RAW_OSM_PATH)

    assert summary["total_extracted_buildings"] == 155
    assert summary["ways_extracted"] == 154
    assert summary["relations_extracted"] == 1
    assert summary["validation"]["valid"] is True
    assert summary["validation"]["errors_count"] == 0

    # Ensure no fabricated heights or levels
    assert summary["buildings_with_height"] == 0
    assert summary["buildings_with_levels"] == 0

    # Check bounds
    bbox = summary["bounding_box"]["bbox"]
    assert 77.11 <= bbox[0] <= 77.12
    assert 28.64 <= bbox[1] <= 28.65


def test_datasets_api_lists_real_osm():
    """Verify GET /api/v1/datasets includes the real OSM building dataset."""
    response = client.get("/api/v1/datasets")
    assert response.status_code == 200
    datasets = response.json()["data"]
    osm_ds = next((d for d in datasets if d["dataset_id"] == "real_osm_buildings"), None)
    assert osm_ds is not None
    assert osm_ds["is_demo"] is False
    assert osm_ds["is_cadastral"] is False
    assert osm_ds["feature_count"] == 155


def test_get_real_osm_dataset_endpoint():
    """Verify GET /api/v1/datasets/real_osm_buildings returns valid FeatureCollection."""
    response = client.get("/api/v1/datasets/real_osm_buildings")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["dataset_id"] == "real_osm_buildings"
    assert data["is_cadastral"] is False
    features = data["raw_geojson"]["features"]
    assert len(features) == 155


def test_buildings_real_osm_endpoints():
    """Verify buildings router endpoints for real OSM import and summary."""
    # Test summary endpoint
    sum_resp = client.get("/api/v1/buildings/real-osm/summary")
    assert sum_resp.status_code == 200
    summary = sum_resp.json()["data"]
    assert summary["total_extracted_buildings"] == 155
    assert summary["validation"]["valid"] is True

    # Test real-osm GeoJSON endpoint
    osm_resp = client.get("/api/v1/buildings/real-osm")
    assert osm_resp.status_code == 200
    assert osm_resp.json()["feature_count"] == 155

    # Test re-import trigger
    imp_resp = client.post("/api/v1/buildings/import-osm")
    assert imp_resp.status_code == 200
    assert imp_resp.json()["status"] == "success"
