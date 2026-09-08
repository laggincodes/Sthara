"""
Comprehensive Integration Tests for STHARA Gap Closures:
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
    """GET /api/v1/units/canonical-demo returns canonical cadastral structure."""
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
    assert data["property_record_reference"] == "P001-B01-FL05-U501"
    assert data["ulpin_prototype"].startswith("3DULPIN-V1-")
    assert len(data["ulpin_prototype"].split("-")[-1]) == 64
    assert data["ulpin_status"] == "VALID"
    assert "3D ULPIN PROTOTYPE" in data["disclaimer"]

    # Verify canonical ULPIN verifies successfully via /api/v1/ulpin/verify
    v_res = client.post(
        "/api/v1/ulpin/verify",
        json={
            "ulpin": data["ulpin_prototype"],
            "property_id": data["property_id"],
            "parcel_id": data["parcel_id"],
            "building_ids": [data["building_id"]],
            "floor_ids": [data["floor_id"]],
        },
    )
    assert v_res.status_code == 200
    assert v_res.json()["verified"] is True
    assert v_res.json()["match"] is True

    # Tampered ULPIN fails verification
    tampered = data["ulpin_prototype"][:-1] + ("A" if data["ulpin_prototype"][-1] != "A" else "B")
    v_fail = client.post(
        "/api/v1/ulpin/verify",
        json={
            "ulpin": tampered,
            "property_id": data["property_id"],
            "parcel_id": data["parcel_id"],
            "building_ids": [data["building_id"]],
            "floor_ids": [data["floor_id"]],
        },
    )
    assert v_fail.status_code == 200
    assert v_fail.json()["verified"] is False

    # Human-readable reference must NOT be accepted as canonical ULPIN
    v_ref = client.post(
        "/api/v1/ulpin/verify",
        json={
            "ulpin": data["property_record_reference"],
            "property_id": data["property_id"],
            "parcel_id": data["parcel_id"],
            "building_ids": [data["building_id"]],
            "floor_ids": [data["floor_id"]],
        },
    )
    assert v_ref.status_code == 200
    assert v_ref.json()["verified"] is False


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


# -----------------------------------------------------------------------------
# 5. Unit-Level 3D ULPIN Determinism & Geometry Decoupling Tests
# -----------------------------------------------------------------------------
def test_unit_ulpin_determinism_and_decoupling():
    """Unit ULPIN is strictly deterministic and invariant to geometry/mesh variations."""
    from app.services.ulpin_service import ULPINService
    from app.schemas.unit import Unit, UnitType, UnitStatus
    from app.schemas.geometry_3d import Geometry3DStatus

    unit1 = Unit(
        unit_id="BLD-DEMO-002-FL05-U501",
        property_id="PROP-DEMO-102-U501",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_id="BLD-DEMO-002-FL05",
        unit_number="501",
        unit_type=UnitType.APARTMENT_UNIT,
        status=UnitStatus.VALID,
        volume_cubic_m=133.5,
    )
    # Exact duplicate unit identity
    unit2 = Unit(
        unit_id="BLD-DEMO-002-FL05-U501",
        property_id="PROP-DEMO-102-U501",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_id="BLD-DEMO-002-FL05",
        unit_number="501",
        unit_type=UnitType.APARTMENT_UNIT,
        status=UnitStatus.VALID,
        volume_cubic_m=999.9,  # different volume, same entity
    )

    res1 = ULPINService.generate_for_unit(unit1)
    res2 = ULPINService.generate_for_unit(unit2)

    assert res1.ulpin == res2.ulpin
    assert res1.identifier_status.value == "VALID"
    assert len(res1.ulpin.split("-")[-1]) == 64

    # Different unit_id / property_id -> different ULPIN
    unit_diff = Unit(
        unit_id="BLD-DEMO-002-FL05-U502",
        property_id="PROP-DEMO-102-U502",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_id="BLD-DEMO-002-FL05",
        unit_number="502",
        unit_type=UnitType.APARTMENT_UNIT,
        status=UnitStatus.VALID,
    )
    res_diff = ULPINService.generate_for_unit(unit_diff)
    assert res_diff.ulpin != res1.ulpin

    # Different floor -> different ULPIN
    unit_diff_floor = Unit(
        unit_id="BLD-DEMO-002-FL04-U501",
        property_id="PROP-DEMO-102-U501",
        parcel_id="PARCEL-DEMO-102",
        building_id="BLD-DEMO-002",
        floor_id="BLD-DEMO-002-FL04",
        unit_number="501",
        unit_type=UnitType.APARTMENT_UNIT,
        status=UnitStatus.VALID,
    )
    res_diff_floor = ULPINService.generate_for_unit(unit_diff_floor)
    assert res_diff_floor.ulpin != res1.ulpin


def test_api_endpoint_ulpin_consistency():
    """All relevant API endpoints return identical canonical ULPIN for the same property."""
    # 1. /api/v1/units/canonical-demo
    resp1 = client.get("/api/v1/units/canonical-demo")
    assert resp1.status_code == 200
    ulpin1 = resp1.json()["ulpin_prototype"]

    # 2. /api/v1/properties/demo-ulpins
    resp2 = client.get("/api/v1/properties/demo-ulpins")
    assert resp2.status_code == 200
    demo_ulpins = {item["property_id"]: item["ulpin"] for item in resp2.json()}
    assert "PROP-DEMO-102-U501" in demo_ulpins
    ulpin2 = demo_ulpins["PROP-DEMO-102-U501"]

    # 3. Direct generation via /api/v1/ulpin/generate
    resp3 = client.post(
        "/api/v1/ulpin/generate",
        json={
            "property_id": "PROP-DEMO-102-U501",
            "parcel_id": "PARCEL-DEMO-102",
            "building_ids": ["BLD-DEMO-002"],
            "floor_ids": ["BLD-DEMO-002-FL05"],
        },
    )
    assert resp3.status_code == 200
    ulpin3 = resp3.json()["ulpin"]

    # All 3 must strictly match
    assert ulpin1 == ulpin2
    assert ulpin2 == ulpin3
