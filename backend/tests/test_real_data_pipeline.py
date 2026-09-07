"""
Tests for Real Multi-Source End-to-End Validation Pipeline.
Verifies Stage 01 through Stage 08, honest gap reporting, disjoint evaluation,
non-cadastral OSM semantics, canonical 3D geometry compliance, and REST endpoint.
"""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.integration.real_data_pipeline import (
    RealDataPipeline,
    OUTPUT_RESULT_PATH,
    OUTPUT_REPORT_PATH,
)
from app.schemas.geometry_3d import SCHEMA_VERSION

client = TestClient(app)


@pytest.fixture
def pipeline():
    return RealDataPipeline(target_crs="EPSG:32643")


def test_stage_01_data_ingestion_inventory(pipeline):
    """Verifies that physical files are accurately inventoried with real vs synthetic classification and honest gaps."""
    res = pipeline.stage_01_data_ingestion()
    assert res["stage"] == "01_DATA_INGESTION"
    assert res["status"] == "COMPLETED_WITH_HONEST_GAPS"
    assert res["total_available_datasets"] >= 5
    assert res["total_unavailable_datasets"] >= 5

    # Check real datasets
    real_ds = [d for d in res["available_datasets"] if d["category"] == "REAL"]
    assert len(real_ds) >= 1
    osm_ds = next(d for d in real_ds if d["dataset_id"] == "DS-REAL-OSM-BUILDINGS")
    assert osm_ds["is_cadastral"] is False
    assert osm_ds["feature_count"] == 155

    # Check unavailable datasets
    unavail_types = {u["source_type"] for u in res["unavailable_datasets"]}
    assert "LIDAR" in unavail_types
    assert "FLOOR_PLAN" in unavail_types
    assert "GNSS_CORS" in unavail_types
    assert "CADASTRAL_PARCEL" in unavail_types


def test_stage_02_georeferencing_normalization(pipeline):
    """Verifies coordinate reprojection into EPSG:32643 while preserving source geometry."""
    res = pipeline.stage_02_georeferencing()
    assert res["stage"] == "02_GEOREFERENCING"
    assert res["target_crs"] == "EPSG:32643"
    assert res["is_metric"] is True
    assert len(res["transformations"]) >= 3

    # Check OSM transformation
    osm_trans = next(t for t in res["transformations"] if t["dataset_id"] == "DS-REAL-OSM-BUILDINGS")
    assert osm_trans["source_crs"] == "EPSG:4326"
    assert osm_trans["target_crs"] == "EPSG:32643"
    assert len(osm_trans["sample_features"]) == 15
    for sf in osm_trans["sample_features"]:
        assert sf["area_sqm"] > 0.0
        assert sf["is_cadastral"] is False
        assert "coordinates" in sf["source_geometry"]
        assert "coordinates" in sf["projected_geometry"]


def test_stage_03_fusion_honest_disjoint_coverage(pipeline):
    """Verifies that regional separation (~1150 km) is reported as disjoint without fake overlaps."""
    georef = pipeline.stage_02_georeferencing()
    res = pipeline.stage_03_fusion_and_spatial_coverage(georef)
    assert res["stage"] == "03_FUSION_AND_SPATIAL_COVERAGE"
    assert res["separation_distance_km"] > 1000.0  # ~1173 km

    # Verify pairwise relationships
    osm_parcel_rel = next(r for r in res["relationships"] if "Real OSM" in r["pair"] and "Demo Parcels" in r["pair"])
    assert osm_parcel_rel["relationship"] == "DISJOINT"
    assert osm_parcel_rel["overlap_percentage"] == 0.0
    assert osm_parcel_rel["verdict"] == "NO_OVERLAP"

    # Verify synthetic demo coverage
    demo_bld_rel = next(r for r in res["relationships"] if "Demo Buildings" in r["pair"] and "Demo DEM" in r["pair"])
    assert demo_bld_rel["relationship"] == "OVERLAPPING_COVERAGE"
    assert demo_bld_rel["overlap_percentage"] == 100.0


def test_stage_04_ai_extraction_candidate_gate(pipeline):
    """Verifies CandidateValidationGate execution and transparent ModelRegistry reporting."""
    georef = pipeline.stage_02_georeferencing()
    res = pipeline.stage_04_ai_extraction_gate(georef)
    assert res["stage"] == "04_AI_EXTRACTION_GATE"
    assert len(res["gate_results"]) >= 1
    gr = res["gate_results"][0]
    assert gr["all_geometries_valid"] is True
    assert gr["total_candidates"] == 10

    # Model registry audit
    audit = {m["model_id"]: m["availability"] for m in res["model_registry_audit"]}
    assert audit.get("pytorch_mask_rcnn_v1") == "MODEL_UNAVAILABLE"
    assert audit.get("open3d_pointnet_v1") == "MODEL_UNAVAILABLE"
    assert audit.get("bld_cv_otsu_v1") == "AVAILABLE"


def test_stage_05_modelling_3d_canonical_contract(pipeline):
    """Verifies that generated 3D meshes conform to Canonical 3D Geometry Contract v1.0."""
    georef = pipeline.stage_02_georeferencing()
    res = pipeline.stage_05_modelling_3d(georef)
    assert res["stage"] == "05_MODELLING_3D"
    assert res["canonical_contract_compliant"] is True
    assert res["schema_version"] == SCHEMA_VERSION
    assert res["solids_count"] >= 5

    for solid in res["generated_solids"]:
        assert solid["closed"] is True
        assert solid["manifold"] is True
        assert solid["winding"] == "COUNTER_CLOCKWISE"
        assert solid["vertex_count"] >= 8
        assert solid["face_count"] >= 12
        assert solid["volume_m3"] > 0.0
        assert solid["surface_area_m2"] > 0.0
        if "OSM" in solid["id"]:
            assert solid["is_cadastral"] is False


def test_stage_06_topology_audit(pipeline):
    """Verifies that Unified Topology & Conflict Engine audits both demo stack and real OSM stack."""
    georef = pipeline.stage_02_georeferencing()
    model = pipeline.stage_05_modelling_3d(georef)
    res = pipeline.stage_06_topology_audit(georef, model)
    assert res["stage"] == "06_TOPOLOGY_AUDIT"
    assert res["demo_stack"]["total_checks"] > 0
    assert res["demo_stack"]["passed_checks"] > 0
    assert res["real_osm_stack"]["total_checks"] > 0
    assert res["real_osm_stack"]["passed_checks"] > 0


def test_stage_07_property_volume_and_ulpin_isolation(pipeline):
    """Strictly verifies that real OSM buildings NEVER receive property ULPINs while synthetic units do."""
    res = pipeline.stage_07_property_volume_and_ulpin()
    assert res["stage"] == "07_PROPERTY_VOLUME_AND_3D_ULPIN"
    assert res["cadastral_boundary_enforced"] is True

    # Real OSM must be rejected from ULPIN assignment
    osm_recs = [r for r in res["ulpin_records"] if not r["is_cadastral"]]
    assert len(osm_recs) >= 2
    for r in osm_recs:
        assert r["ulpin_assigned"] is False
        assert r["ulpin_code"] is None
        assert r["status"] == "NOT_ELIGIBLE_NON_CADASTRAL"

    # Synthetic units must receive deterministic ULPINs
    unit_recs = [r for r in res["ulpin_records"] if r["is_cadastral"]]
    assert len(unit_recs) == 4
    for r in unit_recs:
        assert r["ulpin_assigned"] is True
        assert r["ulpin_code"].startswith("3DULPIN-V1-")
        assert r["status"] == "VALID"


def test_full_pipeline_execution_and_file_exports(pipeline):
    """Verifies end-to-end execute() orchestration, resulting JSON and markdown report."""
    result = pipeline.execute()
    assert result["pipeline_id"] == "REAL-DATA-PIPELINE-E2E-001"
    assert result["fusion_status"] == "PARTIAL"
    assert result["pipeline_verdict"] == "VALIDATED_PARTIAL"
    assert result["quality_level"] == "LIMITED"
    assert result["target_crs"] == "EPSG:32643"
    assert result["execution_duration_sec"] >= 0.0

    # Verify JSON file on disk
    assert OUTPUT_RESULT_PATH.exists()
    with open(OUTPUT_RESULT_PATH, "r", encoding="utf-8") as f:
        saved_json = json.load(f)
    assert saved_json["pipeline_id"] == "REAL-DATA-PIPELINE-E2E-001"
    assert "stages" in saved_json

    # Verify Markdown report on disk
    assert OUTPUT_REPORT_PATH.exists()
    report_text = OUTPUT_REPORT_PATH.read_text(encoding="utf-8")
    assert "# Real Multi-Source End-to-End Validation Report" in report_text
    assert "Tagore Garden" in report_text
    assert "UNAVAILABLE" in report_text
    assert "PARTIAL" in report_text


def test_api_fusion_real_pipeline_route():
    """Tests the GET /api/v1/fusion/real-pipeline FastAPI route."""
    resp = client.get("/api/v1/fusion/real-pipeline?run_fresh=false")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pipeline_id"] == "REAL-DATA-PIPELINE-E2E-001"
    assert data["fusion_status"] == "PARTIAL"
    assert data["pipeline_verdict"] == "VALIDATED_PARTIAL"
    assert "stages" in data
    assert "01_data_ingestion" in data["stages"]
    assert "03_fusion_and_spatial_coverage" in data["stages"]
    assert "07_property_volume_and_3d_ulpin" in data["stages"]
