"""
Comprehensive Test Suite for STHARA Drawing Intelligence v1.
Validates Golden Test Case, Uploads, PDF Rendering, Sheet Classification,
Region Detection, Candidate Extraction, Human Review, STHARA Model Generation,
3D Floor & Unit Modeling, Spatial ID, Provenance, and Dataset Isolation.
"""

import io
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.drawing_intelligence import DrawingType, CandidateType, CandidateStatus
from app.services.drawing_fixture_generator import generate_golden_drawing_fixtures

client = TestClient(app)


@pytest.fixture(scope="module")
def golden_fixtures():
    return generate_golden_drawing_fixtures()


class TestDrawingIntelligenceGoldenPipeline:
    """End-to-End Golden Test Case covering the 4 project drawings."""

    def test_golden_demo_load_and_classification(self, golden_fixtures):
        dataset_id = "ds_golden_test_01"
        res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={dataset_id}")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["dataset_id"] == dataset_id
        assert data["status"] == "ANALYZED"
        assert len(data["documents"]) == 4

        # Document roles and classifications
        docs = {d["filename"]: d for d in data["documents"]}
        assert "20 ARCH PLAN.pdf" in docs
        assert docs["20 ARCH PLAN.pdf"]["role"] == "PRIMARY_SPATIAL"

        assert "20 STRU PLAN 1.pdf" in docs
        assert docs["20 STRU PLAN 1.pdf"]["role"] == "SUPPORTING_STRUCTURAL"
        assert docs["20 STRU PLAN 1.pdf"]["primary_drawing_type"] == "FOUNDATION_PLAN"

        assert "20 STRU PLAN 2.pdf" in docs
        assert docs["20 STRU PLAN 2.pdf"]["role"] == "SUPPORTING_STRUCTURAL"
        assert docs["20 STRU PLAN 2.pdf"]["primary_drawing_type"] == "STRUCTURAL_PLAN"

        # Summary checks
        summary = data["summary"]
        assert summary["total_documents"] == 4
        assert summary["total_regions"] >= 7
        assert summary["building_candidates_count"] >= 1
        assert summary["detected_floors_count"] == 7  # GF + 6 Typical Floors
        assert summary["estimated_total_height_m"] == 22.80

    def test_arch_plan_region_and_evidence_extraction(self, golden_fixtures):
        dataset_id = "ds_golden_test_02"
        res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={dataset_id}")
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["analysis_id"]

        # Fetch regions
        r_res = client.get(f"/api/v1/drawing-intelligence/{analysis_id}/regions")
        assert r_res.status_code == 200
        regions = r_res.json()
        region_types = {r["drawing_type"] for r in regions}

        assert DrawingType.SITE_PLAN.value in region_types
        assert DrawingType.GROUND_FLOOR_PLAN.value in region_types
        assert DrawingType.TYPICAL_FLOOR_PLAN.value in region_types
        assert DrawingType.SECTION.value in region_types
        assert DrawingType.ELEVATION.value in region_types

        # Check that evidence contains scale and floor range
        evidence = data["evidence"]
        facts = {e["fact"]: e["value"] for e in evidence}
        assert "typical_floor_range" in facts
        assert facts["typical_floor_range"] == [1, 2, 3, 4, 5, 6]
        assert "vertical_elevation_spec" in facts
        assert facts["vertical_elevation_spec"]["total_height"] == 22.8

    def test_candidate_extraction_and_unit_detection(self, golden_fixtures):
        dataset_id = "ds_golden_test_03"
        res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={dataset_id}")
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["analysis_id"]

        # Fetch candidates
        c_res = client.get(f"/api/v1/drawing-intelligence/{analysis_id}/candidates")
        assert c_res.status_code == 200
        candidates = c_res.json()

        # Check Building Footprint candidate
        bld_cand = next((c for c in candidates if c["candidate_type"] == "BUILDING_FOOTPRINT"), None)
        assert bld_cand is not None
        assert bld_cand["area_sqm"] == 280.0
        assert len(bld_cand["polygon_normalized"]) >= 4

        # Check Units A-01, A-02, A-03
        unit_cands = [c for c in candidates if c["candidate_type"] == "UNIT"]
        assert len(unit_cands) == 3
        unit_names = {u["name"] for u in unit_cands}
        assert "Unit A-01 (3 BHK)" in unit_names
        assert "Unit A-02 (2 BHK)" in unit_names
        assert "Unit A-03 (2 BHK)" in unit_names

    def test_candidate_human_confirmation_and_patch(self, golden_fixtures):
        dataset_id = "ds_golden_test_04"
        res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={dataset_id}")
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["analysis_id"]

        cand = data["candidates"][0]
        cand_id = cand["candidate_id"]

        # Reject candidate
        rej_res = client.post(f"/api/v1/drawing-intelligence/{analysis_id}/candidates/{cand_id}/reject")
        assert rej_res.status_code == 200
        assert rej_res.json()["status"] == CandidateStatus.REJECTED.value

        # Confirm candidate
        conf_res = client.post(f"/api/v1/drawing-intelligence/{analysis_id}/candidates/{cand_id}/confirm")
        assert conf_res.status_code == 200
        assert conf_res.json()["status"] == CandidateStatus.CONFIRMED.value

        # Patch candidate name
        patch_res = client.patch(
            f"/api/v1/drawing-intelligence/{analysis_id}/candidates/{cand_id}",
            json={"name": "Custom Modified Boundary"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["name"] == "Custom Modified Boundary"

    def test_build_sthara_model_end_to_end(self, golden_fixtures):
        dataset_id = "ds_golden_test_05"
        res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={dataset_id}")
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["analysis_id"]

        build_req = {
            "target_building_id": "BLD-DRAWING-TEST-001",
            "target_building_name": "Residency Tower (Drawing Intelligence)",
            "ground_elevation": 560.0,
            "apply_units_to_all_typical_floors": True,
        }

        build_res = client.post(f"/api/v1/drawing-intelligence/{analysis_id}/build-model", json=build_req)
        assert build_res.status_code == 200, build_res.text
        model_data = build_res.json()

        assert model_data["status"] == "SUCCESS"
        assert model_data["building_id"] == "BLD-DRAWING-TEST-001"
        assert model_data["number_of_floors"] == 7
        assert model_data["total_height_m"] == 23.0 # 3.8m GF + 6 * 3.2m
        assert model_data["units_created_count"] == 18  # 3 units * 6 typical floors
        assert model_data["watertight_3d"] is True

        # Check ULPIN Spatial IDs
        ulpins = model_data["ulpin_prototypes"]
        assert len(ulpins) == 18
        for unit_id, spatial_id in ulpins.items():
            assert spatial_id.startswith("3DULPIN-V1-")

        # Verify Blueprint attachment in building blueprint service
        bp_res = client.get(f"/api/v1/building-blueprints/{dataset_id}/BLD-DRAWING-TEST-001")
        assert bp_res.status_code == 200
        bp_data = bp_res.json()
        assert bp_data["success"] is True
        assert bp_data["blueprint"] is not None
        assert "20_ARCH_PLAN" in bp_data["blueprint"]["filename"]


class TestDrawingIntelligenceUploadAndValidation:
    """Tests file upload safety, size restrictions, and image streaming."""

    def test_upload_single_pdf(self, golden_fixtures):
        arch_path = golden_fixtures["20 ARCH PLAN.pdf"]
        with open(arch_path, "rb") as f:
            pdf_bytes = f.read()

        dataset_id = "ds_upload_test"
        res = client.post(
            "/api/v1/drawing-intelligence/upload",
            data={"dataset_id": dataset_id},
            files=[("files", ("20 ARCH PLAN.pdf", io.BytesIO(pdf_bytes), "application/pdf"))],
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["documents"]) == 1
        assert data["documents"][0]["filename"] == "20 ARCH PLAN.pdf"

        # Verify page image streaming
        analysis_id = data["analysis_id"]
        page_id = data["documents"][0]["pages"][0]["page_id"]
        
        img_res = client.get(f"/api/v1/drawing-intelligence/{analysis_id}/pages/{page_id}/image?type=original")
        assert img_res.status_code == 200
        assert img_res.headers["content-type"] == "image/png"
        assert len(img_res.content) > 1000

        proc_img_res = client.get(f"/api/v1/drawing-intelligence/{analysis_id}/pages/{page_id}/image?type=processed")
        assert proc_img_res.status_code == 200
        assert proc_img_res.headers["content-type"] == "image/png"

    def test_upload_invalid_file_extension(self):
        res = client.post(
            "/api/v1/drawing-intelligence/upload",
            data={"dataset_id": "ds_invalid_test"},
            files=[("files", ("malicious.exe", io.BytesIO(b"malicious_bytes"), "application/x-msdownload"))],
        )
        assert res.status_code == 400
        msg = res.json().get("message") or res.json().get("detail", "")
        assert "Unsupported file type" in msg

    def test_upload_oversized_file(self):
        # 21MB fake payload
        oversized = b"0" * (21 * 1024 * 1024)
        res = client.post(
            "/api/v1/drawing-intelligence/upload",
            data={"dataset_id": "ds_oversize_test"},
            files=[("files", ("huge_drawing.pdf", io.BytesIO(oversized), "application/pdf"))],
        )
        assert res.status_code == 413
        msg = res.json().get("message") or res.json().get("detail", "")
        assert "exceeds 20MB limit" in msg


class TestDrawingIntelligenceDatasetIsolation:
    """Verifies that analyses and candidates remain strictly isolated across datasets."""

    def test_dataset_isolation(self, golden_fixtures):
        ds_a = "ds_alpha_iso"
        ds_b = "ds_beta_iso"

        res_a = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={ds_a}")
        assert res_a.status_code == 200
        analysis_a = res_a.json()

        res_b = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={ds_b}")
        assert res_b.status_code == 200
        analysis_b = res_b.json()

        assert analysis_a["analysis_id"] != analysis_b["analysis_id"]

        # Latest for ds_a
        latest_a = client.get(f"/api/v1/drawing-intelligence/latest?dataset_id={ds_a}").json()
        assert latest_a["analysis_id"] == analysis_a["analysis_id"]

        # Latest for ds_b
        latest_b = client.get(f"/api/v1/drawing-intelligence/latest?dataset_id={ds_b}").json()
        assert latest_b["analysis_id"] == analysis_b["analysis_id"]


class TestSpatialSourceModes:
    """Tests Mode A (OSM + Drawings), Mode B (Drawings Only / Empty OSM Fallback), and Mode C."""

    def test_mode_b_empty_osm_fallback(self, golden_fixtures):
        empty_dataset_id = "ds_empty_osm_fallback_test"
        from app.services.osm_3d_converter import PROCESSED_REAL_DIR
        geojson_file = PROCESSED_REAL_DIR / f"{empty_dataset_id}_buildings.geojson"
        if geojson_file.exists():
            geojson_file.unlink()
        from app.services.drawing_intelligence_service import drawing_intelligence_service
        latest = drawing_intelligence_service.get_latest_analysis_for_dataset(empty_dataset_id)
        if latest:
            drawing_intelligence_service.delete_analysis(latest.analysis_id)
        
        # 1. Initial status before drawings uploaded -> EMPTY
        status_res = client.get(f"/api/v1/drawing-intelligence/source-status?dataset_id={empty_dataset_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["active_mode"] == "EMPTY"
        assert status_data["osm_building_count"] == 0
        assert status_data["drawing_available"] is False

        # 2. Upload/Load drawings into empty dataset -> automatically switches to DRAWINGS_ONLY (Mode B)
        load_res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={empty_dataset_id}")
        assert load_res.status_code == 200
        analysis_data = load_res.json()
        analysis_id = analysis_data["analysis_id"]

        status_res2 = client.get(f"/api/v1/drawing-intelligence/source-status?dataset_id={empty_dataset_id}")
        assert status_res2.status_code == 200
        status_data2 = status_res2.json()
        assert status_data2["active_mode"] == "DRAWINGS_ONLY"
        assert status_data2["active_mode_label"] == "Mode B — Drawing-Only Mode"
        assert status_data2["drawing_available"] is True
        assert status_data2["geographic_status"] == "UNRESOLVED_LOCAL_SPACE"

        # 3. Build model from drawings only without OSM footprint
        build_req = {
            "target_building_name": "Skyline Residencies (Pure Drawing Source)",
            "ground_elevation": 0.0,
            "apply_units_to_all_typical_floors": True,
            "create_as_drawing_only": True,
        }
        build_res = client.post(f"/api/v1/drawing-intelligence/{analysis_id}/build-model", json=build_req)
        assert build_res.status_code == 200, build_res.text
        model_data = build_res.json()

        assert model_data["status"] == "SUCCESS"
        assert model_data["building_id"] == "DRAWING-B001"
        assert model_data["geographic_status"] == "UNRESOLVED_LOCAL_SPACE"
        assert model_data["provenance"]["spatial_source_mode"] == "DRAWINGS_ONLY"
        assert model_data["watertight_3d"] is True
        assert len(model_data["floors_created"]) == 7
        assert model_data["units_created_count"] == 18

    def test_mode_a_osm_and_drawings(self, golden_fixtures):
        osm_dataset_id = "ds_tagore_garden_map_osm"
        
        # Load drawings into existing OSM dataset
        load_res = client.post(f"/api/v1/drawing-intelligence/load-demo?dataset_id={osm_dataset_id}")
        assert load_res.status_code == 200
        analysis_id = load_res.json()["analysis_id"]

        status_res = client.get(f"/api/v1/drawing-intelligence/source-status?dataset_id={osm_dataset_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["active_mode"] == "OSM_AND_DRAWINGS"
        assert status_data["osm_building_count"] > 0
        assert status_data["drawing_available"] is True

        build_req = {
            "target_building_id": "OSM-WAY-101",
            "target_building_name": "Tagore Garden Community Center",
            "match_to_osm_footprint": True,
            "apply_units_to_all_typical_floors": True,
        }
        build_res = client.post(f"/api/v1/drawing-intelligence/{analysis_id}/build-model", json=build_req)
        assert build_res.status_code == 200
        model_data = build_res.json()
        assert model_data["building_id"] == "OSM-WAY-101"
        assert model_data["geographic_status"] == "POSITIONED"

