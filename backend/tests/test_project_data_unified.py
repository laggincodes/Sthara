"""
Unit and Integration Tests for STHARA Unified Project Data Entry Subsystem.
Verifies multi-source file ingestion, auto-classification, cross-source correlation,
empty map fallback, 10-stage processing status, and dataset isolation.
"""

import io
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.project_data import ProjectSourceCategory
from app.services.drawing_fixture_generator import generate_golden_drawing_fixtures

client = TestClient(app)


@pytest.fixture(scope="module")
def golden_fixtures():
    return generate_golden_drawing_fixtures()


class TestUnifiedProjectDataEntry:
    """Verifies end-to-end multi-source project data ingestion and correlation."""

    def test_load_golden_demo_unified(self, golden_fixtures):
        dataset_id = "ds_golden_project_data_01"
        res = client.post(f"/api/v1/project-data/load-golden-demo?dataset_id={dataset_id}&dataset_name=Tagore%20Garden%20Unified%20Project")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["dataset_id"] == dataset_id
        assert data["dataset_name"] == "Tagore Garden Unified Project"
        assert len(data["manifest"]) >= 4

        # Verify Manifest Items and Categories
        manifest = {m["filename"]: m for m in data["manifest"]}
        assert "20 ARCH PLAN.pdf" in manifest
        assert manifest["20 ARCH PLAN.pdf"]["category"] == ProjectSourceCategory.ARCHITECTURAL_DRAWING.value

        assert "20 STRU PLAN 1.pdf" in manifest
        assert manifest["20 STRU PLAN 1.pdf"]["category"] == ProjectSourceCategory.STRUCTURAL_DRAWING.value

        # Verify Processing Stages (10 stages completed)
        stages = data["processing_stages"]
        assert len(stages) == 10
        assert all(s["status"] == "complete" for s in stages)
        assert stages[0]["stage_name"] == "Reading project files"
        assert stages[7]["stage_name"] == "Correlating map + drawings"

        # Verify Spatial Evidence Summary
        evidence = data["spatial_evidence_summary"]
        assert evidence["site_plan_detected"] is True
        assert evidence["building_plan_detected"] is True
        assert evidence["floor_plans_detected"] is True
        assert evidence["structural_evidence_available"] is True

        # Verify Building Correlations
        correlations = data["building_correlations"]
        assert len(correlations) >= 1
        corr = correlations[0]
        assert corr["drawing_building_name"] == "Building 01"
        assert corr["drawing_area_sqm"] == 280.0
        assert corr["match_score"] >= 0.70

    def test_upload_arbitrary_bundle_and_analyze(self, golden_fixtures):
        dataset_id = "ds_unified_upload_test"
        
        sample_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": "PARCEL-MAP-001",
                    "properties": {"building": "yes", "name": "Community Hall"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[77.2185, 28.6325], [77.2187, 28.6325], [77.2187, 28.6323], [77.2185, 28.6323], [77.2185, 28.6325]]]
                    }
                }
            ]
        }
        geo_bytes = json.dumps(sample_geojson).encode("utf-8")
        
        arch_pdf_path = golden_fixtures["20 ARCH PLAN.pdf"]
        with open(arch_pdf_path, "rb") as f:
            arch_pdf_bytes = f.read()

        files = [
            ("files", ("project_site.geojson", io.BytesIO(geo_bytes), "application/geo+json")),
            ("files", ("20 ARCH PLAN.pdf", io.BytesIO(arch_pdf_bytes), "application/pdf")),
        ]

        res = client.post(
            "/api/v1/project-data/upload-and-analyze",
            data={"dataset_id": dataset_id, "dataset_name": "Custom Upload Project"},
            files=files,
        )
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["dataset_id"] == dataset_id
        assert len(data["manifest"]) == 2
        assert data["map_feature_count"] == 1
        assert data["drawing_analysis"] is not None

        # Verify Latest endpoint
        latest_res = client.get(f"/api/v1/project-data/latest?dataset_id={dataset_id}")
        assert latest_res.status_code == 200
        assert latest_res.json()["analysis_id"] == data["analysis_id"]

    def test_empty_map_fallback_in_unified_entry(self, golden_fixtures):
        """When an empty map is uploaded alongside drawings, system smoothly falls back to Mode B (Drawings Only)."""
        empty_dataset_id = "ds_unified_empty_map_test"

        empty_geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        empty_geo_bytes = json.dumps(empty_geojson).encode("utf-8")

        arch_pdf_path = golden_fixtures["20 ARCH PLAN.pdf"]
        with open(arch_pdf_path, "rb") as f:
            arch_pdf_bytes = f.read()

        files = [
            ("files", ("empty_map.geojson", io.BytesIO(empty_geo_bytes), "application/geo+json")),
            ("files", ("20 ARCH PLAN.pdf", io.BytesIO(arch_pdf_bytes), "application/pdf")),
        ]

        res = client.post(
            "/api/v1/project-data/upload-and-analyze",
            data={"dataset_id": empty_dataset_id, "dataset_name": "Empty Map Project"},
            files=files,
        )
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["spatial_source_status"]["active_mode"] == "DRAWINGS_ONLY"
        assert data["map_feature_count"] == 0
        assert len(data["building_correlations"]) >= 1
        assert data["building_correlations"][0]["status"] == "DRAWING_ONLY"

    def test_correlation_status_update(self, golden_fixtures):
        dataset_id = "ds_corr_update_test"
        res = client.post(f"/api/v1/project-data/load-golden-demo?dataset_id={dataset_id}")
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["analysis_id"]
        corr_id = data["building_correlations"][0]["correlation_id"]

        patch_res = client.patch(
            f"/api/v1/project-data/{analysis_id}/correlations/{corr_id}",
            json={"status": "CONFIRMED", "target_osm_building_id": "B001-CUSTOM"},
        )
        assert patch_res.status_code == 200
        patch_data = patch_res.json()
        assert patch_data["status"] == "CONFIRMED"
        assert patch_data["osm_building_id"] == "B001-CUSTOM"

    def test_empty_osm_fallback_with_four_pdfs_canonical_endpoint(self, golden_fixtures):
        """
        Tests the exact user scenario:
        Staged files:
        - 20 STRU PLAN 1.pdf
        - 20 STRU PLAN 2.pdf
        - 20 STRU PLAN 3.pdf
        - 20 ARCH PLAN.pdf
        - west bengall.osm (zero building geometry)
        Calls POST /api/v1/project-data/analyze.
        Verifies:
        - HTTP 200 success
        - mode == "DRAWING_ONLY"
        - map_status == "EMPTY"
        - drawing_mode == "AVAILABLE"
        - Zero fake OSM buildings or bounding box rectangles
        - Descriptive warning present
        """
        dataset_id = "ds_west_bengal_empty_osm_test"
        
        # XML without building ways (e.g. only highway nodes)
        empty_osm_xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="CGImap 0.8.8">
  <bounds minlat="22.5" minlon="88.3" maxlat="22.6" maxlon="88.4"/>
  <node id="101" lat="22.55" lon="88.35">
    <tag k="highway" v="bus_stop"/>
  </node>
  <way id="201">
    <nd ref="101"/>
    <tag k="highway" v="primary"/>
  </way>
</osm>
"""
        files = [
            ("files", ("west bengall.osm", io.BytesIO(empty_osm_xml), "application/xml")),
        ]
        for fname in ["20 ARCH PLAN.pdf", "20 STRU PLAN 1.pdf", "20 STRU PLAN 2.pdf", "20 STRU PLAN 3.pdf"]:
            with open(golden_fixtures[fname], "rb") as f:
                files.append(("files", (fname, io.BytesIO(f.read()), "application/pdf")))

        # Test canonical endpoint: /api/v1/project-data/analyze
        res = client.post(
            "/api/v1/project-data/analyze",
            data={"dataset_id": dataset_id, "dataset_name": "West Bengal Drawing Project"},
            files=files,
        )
        assert res.status_code == 200, res.text
        data = res.json()

        # Contract checks
        assert data["project_id"] == dataset_id
        assert data["dataset_id"] == dataset_id
        assert data["mode"] == "DRAWING_ONLY"
        assert data["map_status"] == "EMPTY"
        assert data["drawing_mode"] == "AVAILABLE"
        assert data["map_feature_count"] == 0

        # Files manifest check
        assert len(data["manifest"]) == 5
        osm_manifest = next(m for m in data["manifest"] if m["filename"] == "west bengall.osm")
        assert osm_manifest["category"] == "MAP_SOURCE"
        assert osm_manifest["feature_count"] == 0

        # Candidates and evidence
        assert len(data["building_candidates"]) >= 1
        assert len(data["floor_candidates"]) >= 1
        assert len(data["drawings"]) == 4

        # Invariant checks: NO fake bounding box rectangle, NO fake OSM building
        for corr in data["building_correlations"]:
            assert corr["osm_building_id"] is None
            assert corr["status"] == "DRAWING_ONLY"

        # Warnings check
        assert len(data["warnings"]) >= 1
        assert any("0 usable building" in w for w in data["warnings"])

