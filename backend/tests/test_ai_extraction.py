"""
Comprehensive test suite for the AI/ML Extraction Layer (Step 19).

Verifies:
1. Extraction contracts and Pydantic schema validation
2. Model registry tracking, availability, and documented limitations
3. Classical CV building footprint extraction and demo benchmark mode
4. Unavailable model handling (PyTorch Mask-RCNN, Open3D PointNet)
5. Floor segmentation and vertical stratification logic
6. Unit delineation and honest failure when interior evidence is missing
7. Coordinated vertical elevation bounds delineation
8. Deterministic candidate validation gate (validity, containment, non-overlap, confidence)
9. Spatial comparison engine (IoU, discrepancy, containment)
10. Strict architectural boundary enforcement (AI never bypasses deterministic validation)
11. Full REST API endpoint integration
"""

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, mapping

from app.main import app
from app.schemas.ai_extraction import (
    ExtractionType,
    CandidateStatus,
    ConfidenceLevel,
    ExtractionMethod,
    BuildingExtractionRequest,
    FloorSegmentationRequest,
    UnitDelineationRequest,
    VerticalDelineationRequest,
    CandidateValidationRequest,
    CandidateComparisonRequest,
    CandidateFeature,
    ExtractionProvenance,
)
from app.services.model_registry import model_registry
from app.services.ai_extraction_service import ai_extraction_service


@pytest.fixture
def client():
    return TestClient(app)


# -----------------------------------------------------------------------------
# 1. Model Registry Tests
# -----------------------------------------------------------------------------
def test_model_registry_defaults():
    """Verify registered models, task classifications, and availability flags."""
    models = model_registry.list_models()
    assert len(models) >= 7

    bld_model = model_registry.get_model("bld_cv_otsu_v1")
    assert bld_model is not None
    assert bld_model.availability == "AVAILABLE"
    assert bld_model.task == ExtractionType.BUILDING
    assert "numpy" in bld_model.framework

    # Heavyweight external models must be reported honestly as MODEL_UNAVAILABLE
    torch_model = model_registry.get_model("pytorch_mask_rcnn_v1")
    assert torch_model is not None
    assert torch_model.availability == "MODEL_UNAVAILABLE"

    open3d_model = model_registry.get_model("open3d_pointnet_v1")
    assert open3d_model is not None
    assert open3d_model.availability == "MODEL_UNAVAILABLE"


# -----------------------------------------------------------------------------
# 2. Building Footprint Extraction Tests
# -----------------------------------------------------------------------------
def test_building_extraction_demo_mode():
    """Verify reproducible benchmark extraction for Tower 1."""
    req = BuildingExtractionRequest(source_id="TOWER1_SURFACE", demo_mode=True)
    res = ai_extraction_service.extract_buildings(req)

    assert res.status == CandidateStatus.CANDIDATE
    assert len(res.candidates) == 1
    cand = res.candidates[0]
    assert cand.candidate_id == "AI-BLD-CAND-001"
    assert cand.feature_type == ExtractionType.BUILDING
    assert cand.confidence_level == ConfidenceLevel.HIGH
    assert cand.extraction_method == ExtractionMethod.SYNTHETIC_BENCHMARK
    assert cand.geometry_2d is not None
    assert cand.geometry_2d["type"] == "Polygon"


def test_building_extraction_classical_cv():
    """Verify real classical CV Otsu thresholding produces candidate footprints."""
    req = BuildingExtractionRequest(
        source_id="AERIAL_GRID_001",
        model_id="bld_cv_otsu_v1",
        min_area_m2=15.0,
        demo_mode=False,
    )
    res = ai_extraction_service.extract_buildings(req)

    assert res.status == CandidateStatus.CANDIDATE
    assert len(res.candidates) >= 1
    for cand in res.candidates:
        assert cand.extraction_method == ExtractionMethod.AI_CV_MORPHOLOGICAL
        assert cand.status == CandidateStatus.CANDIDATE
        assert cand.confidence is not None
        assert "compactness_score" in cand.estimated_attributes


def test_building_extraction_unavailable_model():
    """Verify honest failure when requesting an unavailable deep-learning pipeline."""
    req = BuildingExtractionRequest(
        source_id="AERIAL_GRID_001",
        model_id="pytorch_mask_rcnn_v1",
        demo_mode=False,
    )
    res = ai_extraction_service.extract_buildings(req)

    assert res.status == CandidateStatus.UNAVAILABLE
    assert len(res.candidates) == 0
    assert any("MODEL_UNAVAILABLE" in w for w in res.warnings)


# -----------------------------------------------------------------------------
# 3. Floor Strata Segmentation Tests
# -----------------------------------------------------------------------------
def test_floor_segmentation_valid():
    """Verify derivation of floor elevation strata intervals."""
    req = FloorSegmentationRequest(
        building_id="BLD-TEST-001",
        total_height_m=15.0,
        ground_elevation_m=920.0,
        standard_floor_height_m=3.0,
    )
    res = ai_extraction_service.segment_floors(req)

    assert res.status == CandidateStatus.CANDIDATE
    assert len(res.candidates) == 5

    # Check contiguous vertical stacking
    for idx, fl in enumerate(res.candidates, start=1):
        assert fl.estimated_attributes["floor_number"] == idx
        expected_base = round(920.0 + (idx - 1) * 3.0, 2)
        expected_top = round(920.0 + idx * 3.0, 2)
        assert fl.estimated_attributes["base_elevation_m"] == expected_base
        assert fl.estimated_attributes["top_elevation_m"] == expected_top


def test_floor_segmentation_invalid_height():
    """Verify schema validation rejects non-positive building height."""
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        FloorSegmentationRequest(
            building_id="BLD-TEST-001",
            total_height_m=-5.0,
            ground_elevation_m=920.0,
        )


# -----------------------------------------------------------------------------
# 4. Unit Interior Delineation Tests
# -----------------------------------------------------------------------------
def test_unit_delineation_honest_failure_when_no_input():
    """Verify system does NOT invent units when floor geometry/plan is absent."""
    req = UnitDelineationRequest(
        building_id="BLD-TEST-001",
        floor_number=3,
        floor_polygon=None,
        demo_mode=False,
    )
    res = ai_extraction_service.delineate_units(req)

    assert res.status == CandidateStatus.UNAVAILABLE
    assert len(res.candidates) == 0
    assert any("UNIT_EXTRACTION_UNAVAILABLE" in w for w in res.warnings)


def test_unit_delineation_with_floor_polygon():
    """Verify orthogonal partitioning into non-overlapping candidate units."""
    floor_box = Polygon([[0, 0], [40, 0], [40, 30], [0, 30], [0, 0]])
    req = UnitDelineationRequest(
        building_id="BLD-TEST-001",
        floor_number=2,
        floor_polygon=mapping(floor_box),
        corridor_width_m=2.0,
        demo_mode=False,
    )
    res = ai_extraction_service.delineate_units(req)

    assert res.status == CandidateStatus.CANDIDATE
    assert len(res.candidates) == 2

    u1_geom = Polygon(res.candidates[0].geometry_2d["coordinates"][0])
    u2_geom = Polygon(res.candidates[1].geometry_2d["coordinates"][0])

    # Must be disjoint or party-wall touching, zero area overlap
    assert u1_geom.intersection(u2_geom).area == 0.0


# -----------------------------------------------------------------------------
# 5. Vertical Delineation Tests
# -----------------------------------------------------------------------------
def test_vertical_delineation_valid():
    """Verify coordinated candidate vertical strata bounds."""
    req = VerticalDelineationRequest(
        building_id="BLD-TEST-001",
        base_elevation_m=920.0,
        top_elevation_m=935.0,
        floor_count=5,
    )
    res = ai_extraction_service.delineate_vertical(req)

    assert res.status == CandidateStatus.CANDIDATE
    assert len(res.candidates) == 1
    assert res.candidates[0].estimated_attributes["total_height_m"] == 15.0
    assert res.candidates[0].estimated_attributes["average_floor_height_m"] == 3.0


# -----------------------------------------------------------------------------
# 6. Deterministic Candidate Validation Gate Tests
# -----------------------------------------------------------------------------
def test_candidate_validation_gate_acceptance():
    """Verify candidate passing spatial and confidence checks is accepted."""
    poly = Polygon([[10, 10], [30, 10], [30, 30], [10, 30], [10, 10]])
    parcel_poly = Polygon([[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]])

    cand = CandidateFeature(
        candidate_id="AI-BLD-CAND-TEST",
        feature_type=ExtractionType.BUILDING,
        source_reference="AERIAL",
        geometry_2d=mapping(poly),
        confidence=0.85,
        confidence_level=ConfidenceLevel.HIGH,
        confidence_threshold=0.60,
        extraction_method=ExtractionMethod.AI_CV_MORPHOLOGICAL,
        status=CandidateStatus.CANDIDATE,
        provenance=ExtractionProvenance(
            source_dataset="TEST",
            model_id="bld_cv_otsu_v1",
            model_version="1.0.0",
            extraction_timestamp="2026-09-07T00:00:00Z",
        ),
    )

    req = CandidateValidationRequest(
        candidates=[cand],
        target_parcel=mapping(parcel_poly),
    )
    resp = ai_extraction_service.validate_candidates(req)

    assert resp.all_valid is True
    assert resp.accepted_count == 1
    assert resp.validated_candidates[0].status == CandidateStatus.ACCEPTED


def test_candidate_validation_gate_rejection_outside_parcel():
    """Verify candidate outside parcel boundary is rejected."""
    poly = Polygon([[100, 100], [130, 100], [130, 130], [100, 130], [100, 100]])
    parcel_poly = Polygon([[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]])

    cand = CandidateFeature(
        candidate_id="AI-BLD-CAND-OUTSIDE",
        feature_type=ExtractionType.BUILDING,
        source_reference="AERIAL",
        geometry_2d=mapping(poly),
        confidence=0.90,
        extraction_method=ExtractionMethod.AI_CV_MORPHOLOGICAL,
        provenance=ExtractionProvenance(
            source_dataset="TEST",
            model_id="bld_cv_otsu_v1",
            model_version="1.0.0",
            extraction_timestamp="2026-09-07T00:00:00Z",
        ),
    )

    req = CandidateValidationRequest(
        candidates=[cand],
        target_parcel=mapping(parcel_poly),
    )
    resp = ai_extraction_service.validate_candidates(req)

    assert resp.all_valid is False
    assert resp.rejected_count == 1
    assert resp.validated_candidates[0].status == CandidateStatus.REJECTED


def test_candidate_validation_low_confidence_review_required():
    """Verify candidate with low confidence transitions to REVIEW_REQUIRED."""
    poly = Polygon([[10, 10], [30, 10], [30, 30], [10, 30], [10, 10]])
    cand = CandidateFeature(
        candidate_id="AI-BLD-CAND-LOWCONF",
        feature_type=ExtractionType.BUILDING,
        source_reference="AERIAL",
        geometry_2d=mapping(poly),
        confidence=0.45,  # Below threshold 0.60
        confidence_level=ConfidenceLevel.LOW,
        confidence_threshold=0.60,
        extraction_method=ExtractionMethod.AI_CV_MORPHOLOGICAL,
        provenance=ExtractionProvenance(
            source_dataset="TEST",
            model_id="bld_cv_otsu_v1",
            model_version="1.0.0",
            extraction_timestamp="2026-09-07T00:00:00Z",
        ),
    )

    req = CandidateValidationRequest(candidates=[cand], confidence_override=False)
    resp = ai_extraction_service.validate_candidates(req)

    assert resp.accepted_count == 0
    assert resp.review_count == 1
    assert resp.validated_candidates[0].status == CandidateStatus.REVIEW_REQUIRED


# -----------------------------------------------------------------------------
# 7. Spatial Comparison Tests (IoU & Discrepancy)
# -----------------------------------------------------------------------------
def test_spatial_comparison_exact_match():
    """Verify IoU = 1.0 for identical footprints."""
    poly = Polygon([[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]])
    req = CandidateComparisonRequest(
        candidate_geometry=mapping(poly),
        reference_geometry=mapping(poly),
        candidate_id="AI-001",
        reference_id="OSM-001",
    )
    resp = ai_extraction_service.compare_candidate_to_reference(req)

    assert resp.iou == 1.0
    assert resp.centroid_offset_m == 0.0
    assert resp.area_difference_pct == 0.0
    assert resp.containment_status == "CONTAINS"


def test_spatial_comparison_partial_overlap():
    """Verify partial IoU calculation."""
    # Box A: [0,0] to [20,20] (Area 400)
    # Box B: [10,0] to [30,20] (Area 400)
    # Inter: [10,0] to [20,20] (Area 200)
    # Union: 600 -> IoU = 200/600 = 0.3333
    cand_box = Polygon([[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]])
    ref_box = Polygon([[10, 0], [30, 0], [30, 20], [10, 20], [10, 0]])

    req = CandidateComparisonRequest(
        candidate_geometry=mapping(cand_box),
        reference_geometry=mapping(ref_box),
    )
    resp = ai_extraction_service.compare_candidate_to_reference(req)

    assert 0.33 <= resp.iou <= 0.34
    assert resp.containment_status == "PARTIAL_OVERLAP"
    assert resp.intersection_area_m2 == 200.0


# -----------------------------------------------------------------------------
# 8. REST API Integration Tests
# -----------------------------------------------------------------------------
def test_api_models_endpoint(client):
    """GET /api/v1/ai/models returns registry."""
    res = client.get("/api/v1/ai/models")
    assert res.status_code == 200
    data = res.json()
    assert data["total_registered"] >= 7


def test_api_extract_buildings_endpoint(client):
    """POST /api/v1/ai/extract/buildings returns valid candidates."""
    res = client.post("/api/v1/ai/extract/buildings", json={"demo_mode": True})
    assert res.status_code == 200
    data = res.json()
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["status"] == "CANDIDATE"


def test_api_extract_floors_endpoint(client):
    """POST /api/v1/ai/extract/floors returns floor strata."""
    res = client.post(
        "/api/v1/ai/extract/floors",
        json={
            "building_id": "BLD-API-01",
            "total_height_m": 12.0,
            "ground_elevation_m": 900.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["candidates"]) == 4


def test_api_extract_units_endpoint(client):
    """POST /api/v1/ai/extract/units demo returns units."""
    res = client.post(
        "/api/v1/ai/extract/units",
        json={
            "building_id": "BLD-API-01",
            "floor_number": 1,
            "demo_mode": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["candidates"]) == 2


def test_api_compare_endpoint(client):
    """POST /api/v1/ai/compare returns IoU metrics."""
    geom = {"type": "Polygon", "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]}
    res = client.post(
        "/api/v1/ai/compare",
        json={"candidate_geometry": geom, "reference_geometry": geom},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["iou"] == 1.0


def test_api_demo_endpoint(client):
    """GET /api/v1/ai/demo returns complete candidate bundle."""
    res = client.get("/api/v1/ai/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["total_candidates"] == 9
    assert "separation_of_concerns" in data
