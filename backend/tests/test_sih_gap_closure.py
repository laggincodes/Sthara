"""
Comprehensive Integration Tests for SIH Gap Closures:
- GNSS & CORS Reference-Control Workflow (Part B)
- Real Local AI Extraction on Raster (Part C & D)
- Canonical Demo Property Record P001 -> B01 -> F05 -> U501 (Part G & H)
- Controlled Topology Scenarios: VALID vs CONFLICT (Part I)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_extraction_service import AiExtractionService
from app.schemas.ai_extraction import BuildingExtractionRequest, ExtractionType, CandidateStatus
from app.services.fusion_service import SpatialFusionService
from app.services.topology_service import TopologyService
from app.schemas.topology import TopologyStatus

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. GNSS & CORS Reference-Control Workflow (Part B)
# -----------------------------------------------------------------------------
def test_get_reference_control_points():
    """GET /api/v1/fusion/control-points returns validated reference network."""
    resp = client.get("/api/v1/fusion/control-points?target_crs=EPSG:32643")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["target_crs"] == "EPSG:32643"
    pts = data["validated_points"]
    assert len(pts) >= 2

    # Check CORS reference
    cors_pt = next((p for p in pts if p["reference_type"] == "CORS_REFERENCE"), None)
    assert cors_pt is not None
    assert cors_pt["elevation"] == 562.48
    assert cors_pt["accuracy_metadata"]["solution_type"] == "CONTINUOUS_NETWORK_FIXED"
    assert cors_pt["target_coordinates"] is not None
    assert len(cors_pt["target_coordinates"]) == 2
    assert cors_pt["transformation_applied"] is True

    # Check GNSS Ground Control Point
    gcp_pt = next((p for p in pts if p["reference_type"] == "GNSS_CONTROL_POINT"), None)
    assert gcp_pt is not None
    assert gcp_pt["accuracy_metadata"]["solution_type"] == "RTK_FIXED"
    assert gcp_pt["target_coordinates"] is not None


def test_validate_control_points_endpoint():
    """POST /api/v1/fusion/control-points/validate transforms and validates."""
    req_body = {
        "target_crs": "EPSG:32643",
        "control_points": [
            {
                "station_id": "TEST-GCP-01",
                "control_point_id": "TEST-GCP-01",
                "name": "Test Benchmark",
                "coordinate": [73.8560, 18.5200],
                "coordinates": [73.8560, 18.5200],
                "elevation": 560.0,
                "crs": "EPSG:4326",
                "reference_type": "GNSS_CONTROL_POINT",
                "status": "ACTIVE",
            }
        ]
    }
    resp = client.post("/api/v1/fusion/control-points/validate", json=req_body)
    assert resp.status_code == 200
    res = resp.json()
    assert res["valid"] is True
    assert len(res["validated_points"]) == 1
    pt = res["validated_points"][0]
    assert pt["target_coordinates"] is not None
    # UTM 43N coordinates around Pune are approximately X: 379000, Y: 2048000
    assert 300000 < pt["target_coordinates"][0] < 450000
    assert 2000000 < pt["target_coordinates"][1] < 2100000
    assert len(res["transformations"]) == 1
    assert res["transformations"][0]["method"] == "pyproj_exact"


# -----------------------------------------------------------------------------
# 2. Real Local AI Extraction on Raster (Part C & D)
# -----------------------------------------------------------------------------
def test_ai_building_extraction_on_raster():
    """AiExtractionService executes real Otsu thresholding on raster GeoTIFF."""
    service = AiExtractionService()
    req = BuildingExtractionRequest(
        source_id="demo_elevation.tif",
        raster_file="data/raw/demo_elevation.tif",
        min_area_m2=10.0,
        target_crs="EPSG:32643",
        demo_mode=False,
    )
    result = service.extract_buildings(req)
    assert result.extraction_type == ExtractionType.BUILDING
    assert result.model_id == "bld_cv_otsu_v1"
    assert result.status == CandidateStatus.CANDIDATE
    assert len(result.candidates) > 0
    cand = result.candidates[0]
    assert cand.status == CandidateStatus.CANDIDATE
    assert cand.confidence is not None
    assert 0.0 < cand.confidence <= 1.0
    assert "compactness_score" in cand.estimated_attributes
    assert cand.provenance.transformation_applied is True


# -----------------------------------------------------------------------------
# 3. Canonical Demo Property Record P001 -> B01 -> F05 -> U501 (Part G & H)
# -----------------------------------------------------------------------------
def test_canonical_demo_property_record():
    """GET /api/v1/units/canonical-demo returns SIH canonical structure."""
    resp = client.get("/api/v1/units/canonical-demo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["canonical_parcel_id"] == "P001"
    assert data["canonical_building_id"] == "B01"
    assert data["canonical_floor_id"] == "05"
    assert data["canonical_unit_id"] == "501"
    assert data["canonical_path"] == "P001/B01/05/501"
    assert data["unit_number"] == "501"
    assert data["z_range_amsl"]["min_z"] == 577.48
    assert data["z_range_amsl"]["max_z"] == 580.48
    assert data["volume_cubic_m"] == 133.5
    assert data["status"] == "VALID"
    assert "3DULPIN-V1-P001-B01-FL05-U501" in data["ulpin_prototype"]
    assert "3D ULPIN PROTOTYPE" in data["disclaimer"]


def test_property_record_alias_lookup():
    """GET /api/v1/units/property-record/501 resolves alias to canonical unit."""
    for alias in ["501", "U501", "P001"]:
        resp = client.get(f"/api/v1/units/property-record/{alias}")
        assert resp.status_code == 200
        rec = resp.json()
        assert rec["canonical_unit_id"] == "501"
        assert rec["canonical_parcel_id"] == "P001"


# -----------------------------------------------------------------------------
# 4. Controlled Topology Scenarios: VALID vs CONFLICT (Part I)
# -----------------------------------------------------------------------------
def test_topology_controlled_scenarios():
    """Topology demo returns VALID for clean scenario and CONFLICT for invalid scenario."""
    # Scenario A: VALID
    resp_valid = client.get("/api/v1/topology/demo?scenario=valid")
    assert resp_valid.status_code == 200
    data_valid = resp_valid.json()
    assert data_valid["validation_result"]["summary"]["overall_status"] == "VALID"
    assert len(data_valid["validation_result"]["conflicts"]) == 0

    # Scenario B: CONFLICT
    resp_conflict = client.get("/api/v1/topology/demo?scenario=conflict")
    assert resp_conflict.status_code == 200
    data_conflict = resp_conflict.json()
    assert data_conflict["validation_result"]["summary"]["overall_status"] == "CONFLICT"
    assert len(data_conflict["validation_result"]["conflicts"]) >= 1
    # Check that positive area overlap is detected without silent repair
    overlap_conf = next(
        (c for c in data_conflict["validation_result"]["conflicts"] if "OVERLAP" in c["conflict_type"]),
        None,
    )
    assert overlap_conf is not None
    assert overlap_conf["overlap_metric"] == 40.0
