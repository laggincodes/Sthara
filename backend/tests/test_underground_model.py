"""
Comprehensive Test Suite for Underground & Subsurface Spatial Modeling (Step 20).

Validates:
1. Depth derivation logic and Z-up elevation constraints.
2. Watertight 3D solid extrusion for basements and utility corridors.
3. Cadastral relationship auditing (WITHIN, INTERSECTS, OUTSIDE).
4. Subsurface clash detection, clearance buffers, and allowed easements.
5. Synthetic demonstration bundle integrity.
6. REST API endpoint responses and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, LineString, mapping

from app.main import app
from app.schemas.geometry_3d import Geometry3DStatus
from app.schemas.underground import (
    UndergroundFeatureType,
    UtilityType,
    UndergroundConflictClass,
    UndergroundSpatialStatus,
    UndergroundProvenance,
    UndergroundFeature,
    Underground3DRequest,
    UndergroundValidationRequest,
    UndergroundConflictRequest,
)
from app.services.underground_service import underground_service

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. Depth Derivation & Elevation Constraint Tests
# -----------------------------------------------------------------------------

def test_derive_depths_valid():
    """Verify normal subsurface depth calculation."""
    d_top, d_base, thick, warns = underground_service.derive_depths(
        ground_elevation_m=920.0,
        top_elevation_m=916.0,
        base_elevation_m=912.0,
    )
    assert d_top == 4.0
    assert d_base == 8.0
    assert thick == 4.0
    assert len(warns) == 0


def test_derive_depths_inverted_elevations():
    """Verify error raised when base_elevation >= top_elevation."""
    with pytest.raises(ValueError, match="must be strictly less than"):
        underground_service.derive_depths(
            ground_elevation_m=920.0,
            top_elevation_m=912.0,
            base_elevation_m=916.0,
        )


def test_derive_depths_daylighting_warning():
    """Verify warning when top elevation protrudes above surface."""
    d_top, d_base, thick, warns = underground_service.derive_depths(
        ground_elevation_m=920.0,
        top_elevation_m=922.0,
        base_elevation_m=916.0,
    )
    assert d_top == 0.0
    assert d_base == 4.0
    assert thick == 6.0
    assert len(warns) == 1
    assert "above reference ground" in warns[0]


# -----------------------------------------------------------------------------
# 2. 3D Solid Extrusion Tests
# -----------------------------------------------------------------------------

def test_generate_underground_3d_basement_polygon():
    """Verify basement polygon extrudes to valid watertight Mesh3D."""
    poly = Polygon([(775910, 1297150), (775950, 1297150), (775950, 1297180), (775910, 1297180)])
    req = Underground3DRequest(
        underground_feature_id="BSM-TEST-001",
        feature_type=UndergroundFeatureType.BASEMENT,
        footprint_geometry=mapping(poly),
        ground_elevation_m=920.0,
        top_elevation_m=920.0,
        base_elevation_m=916.0,
    )
    res = underground_service.generate_underground_3d(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.mesh_3d is not None
    assert res.volume_cubic_m == pytest.approx(40 * 30 * 4.0, rel=1e-2)
    assert res.depth_to_top_m == 0.0
    assert res.depth_to_base_m == 4.0


def test_generate_underground_3d_utility_corridor():
    """Verify linear utility corridor buffered footprint extrudes to valid solid."""
    line = LineString([(775890, 1297170), (775920, 1297170)])
    buffered = line.buffer(1.0)
    req = Underground3DRequest(
        underground_feature_id="UTL-TEST-001",
        feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
        utility_type=UtilityType.WATER_SUPPLY,
        footprint_geometry=mapping(buffered),
        ground_elevation_m=920.0,
        top_elevation_m=918.5,
        base_elevation_m=917.0,
    )
    res = underground_service.generate_underground_3d(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.mesh_3d is not None
    assert res.volume_cubic_m > 0.0
    assert res.depth_to_top_m == 1.5
    assert res.depth_to_base_m == 3.0


def test_generate_underground_3d_batch():
    """Verify batch 3D extrusion returns consolidated response."""
    poly = Polygon([(775910, 1297150), (775930, 1297150), (775930, 1297170), (775910, 1297170)])
    req1 = Underground3DRequest(
        underground_feature_id="B-1",
        feature_type=UndergroundFeatureType.BASEMENT,
        footprint_geometry=mapping(poly),
        ground_elevation_m=920.0,
        top_elevation_m=920.0,
        base_elevation_m=917.0,
    )
    req2 = Underground3DRequest(
        underground_feature_id="U-1",
        feature_type=UndergroundFeatureType.UNDERGROUND_UTILITY,
        footprint_geometry=mapping(poly),
        ground_elevation_m=920.0,
        top_elevation_m=915.0,
        base_elevation_m=914.0,
    )
    batch_res = underground_service.generate_underground_3d_batch([req1, req2])
    assert batch_res.total_requested == 2
    assert batch_res.successful == 2
    assert batch_res.failed == 0
    assert len(batch_res.results) == 2


# -----------------------------------------------------------------------------
# 3. Validation & Cadastral Relationship Tests
# -----------------------------------------------------------------------------

def test_validate_feature_within_parcel():
    """Verify feature contained within parcel gets WITHIN status."""
    parcel_poly = Polygon([(775900, 1297140), (775970, 1297140), (775970, 1297200), (775900, 1297200)])
    feat_poly = Polygon([(775910, 1297150), (775940, 1297150), (775940, 1297180), (775910, 1297180)])
    
    feat = UndergroundFeature(
        underground_feature_id="BSM-V-01",
        feature_type=UndergroundFeatureType.BASEMENT,
        parcel_id="DEMO-401/1",
        building_id="BLD-01",
        name="Test Basement",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=920.0,
        base_elevation_m=916.0,
        depth_to_top_m=0.0,
        depth_to_base_m=4.0,
        thickness_m=4.0,
        geometry_2d=mapping(feat_poly),
        provenance=UndergroundProvenance(
            source_dataset="Test",
            source_type="TEST",
            source_file="test.geojson",
            crs="EPSG:32643",
            vertical_datum="AMSL",
            created_at="2026-09-07T00:00:00Z",
        ),
    )
    val = underground_service.validate_underground_feature(
        UndergroundValidationRequest(
            feature=feat,
            parcel_geometry=mapping(parcel_poly),
            building_geometry=mapping(feat_poly),
        )
    )
    assert val.is_valid is True
    assert val.spatial_status == UndergroundSpatialStatus.WITHIN
    assert val.depth_consistent is True
    assert len(val.validation_errors) == 0


def test_validate_feature_outside_parcel():
    """Verify feature outside parcel flags spatial violation."""
    parcel_poly = Polygon([(775900, 1297140), (775970, 1297140), (775970, 1297200), (775900, 1297200)])
    feat_poly = Polygon([(775700, 1297000), (775750, 1297000), (775750, 1297050), (775700, 1297050)])
    
    feat = UndergroundFeature(
        underground_feature_id="BSM-OUT-01",
        feature_type=UndergroundFeatureType.BASEMENT,
        parcel_id="DEMO-401/1",
        building_id="BLD-01",
        name="Outside Basement",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=920.0,
        base_elevation_m=916.0,
        depth_to_top_m=0.0,
        depth_to_base_m=4.0,
        thickness_m=4.0,
        geometry_2d=mapping(feat_poly),
        provenance=UndergroundProvenance(
            source_dataset="Test",
            source_type="TEST",
            source_file="test.geojson",
            crs="EPSG:32643",
            vertical_datum="AMSL",
            created_at="2026-09-07T00:00:00Z",
        ),
    )
    val = underground_service.validate_underground_feature(
        UndergroundValidationRequest(
            feature=feat,
            parcel_geometry=mapping(parcel_poly),
        )
    )
    assert val.is_valid is False
    assert val.spatial_status == UndergroundSpatialStatus.OUTSIDE
    assert any("lies entirely outside parcel" in err for err in val.validation_errors)


def test_validate_basement_missing_building_id():
    """Verify basement without building_id is rejected."""
    feat_poly = Polygon([(775910, 1297150), (775940, 1297150), (775940, 1297180), (775910, 1297180)])
    feat = UndergroundFeature(
        underground_feature_id="BSM-NO-BLD",
        feature_type=UndergroundFeatureType.BASEMENT,
        parcel_id="DEMO-401/1",
        building_id=None,
        name="Orphan Basement",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=920.0,
        base_elevation_m=916.0,
        depth_to_top_m=0.0,
        depth_to_base_m=4.0,
        thickness_m=4.0,
        geometry_2d=mapping(feat_poly),
        provenance=UndergroundProvenance(
            source_dataset="Test",
            source_type="TEST",
            source_file="test.geojson",
            crs="EPSG:32643",
            vertical_datum="AMSL",
            created_at="2026-09-07T00:00:00Z",
        ),
    )
    val = underground_service.validate_underground_feature(
        UndergroundValidationRequest(feature=feat)
    )
    assert val.is_valid is False
    assert any("Missing parent building_id" in err for err in val.validation_errors)


# -----------------------------------------------------------------------------
# 4. Conflict & Clash Detection Tests
# -----------------------------------------------------------------------------

def test_evaluate_conflicts_allowed_utility_intersection():
    """Verify municipal utility penetrating basement is classified as ALLOWED_INTERSECTION."""
    bundle = underground_service.get_demo_underground_bundle()
    basement = next(f for f in bundle.features if f.feature_type == UndergroundFeatureType.BASEMENT)
    water_pipe = next(f for f in bundle.features if f.utility_type == UtilityType.WATER_SUPPLY)
    
    req = UndergroundConflictRequest(
        candidate_feature=water_pipe,
        existing_features=[basement],
    )
    res = underground_service.evaluate_conflicts(req)
    assert res.total_conflicts_found == 1
    assert res.has_invalid_clash is False
    assert res.conflicts[0].conflict_class == UndergroundConflictClass.ALLOWED_INTERSECTION
    assert res.conflicts[0].is_3d_clash is True


def test_evaluate_conflicts_review_required_proximity():
    """Verify two subsurface features separated by < 1.0m vertically flag REVIEW_REQUIRED."""
    poly = Polygon([(775910, 1297150), (775930, 1297150), (775930, 1297170), (775910, 1297170)])
    
    prov = UndergroundProvenance(
        source_dataset="Test",
        source_type="TEST",
        source_file="test.geojson",
        crs="EPSG:32643",
        vertical_datum="AMSL",
        created_at="2026-09-07T00:00:00Z",
    )
    feat_a = UndergroundFeature(
        underground_feature_id="F-A",
        feature_type=UndergroundFeatureType.SUBSURFACE_VOLUME,
        parcel_id="DEMO-401/1",
        name="Vault A",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=918.0,
        base_elevation_m=916.0,
        depth_to_top_m=2.0,
        depth_to_base_m=4.0,
        thickness_m=2.0,
        geometry_2d=mapping(poly),
        provenance=prov,
    )
    feat_b = UndergroundFeature(
        underground_feature_id="F-B",
        feature_type=UndergroundFeatureType.SUBSURFACE_VOLUME,
        parcel_id="DEMO-401/1",
        name="Vault B",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=915.5,  # 0.5m clearance below A
        base_elevation_m=914.0,
        depth_to_top_m=4.5,
        depth_to_base_m=6.0,
        thickness_m=1.5,
        geometry_2d=mapping(poly),
        provenance=prov,
    )
    req = UndergroundConflictRequest(
        candidate_feature=feat_a,
        existing_features=[feat_b],
        clearance_threshold_m=1.0,
    )
    res = underground_service.evaluate_conflicts(req)
    assert res.total_conflicts_found == 1
    assert res.conflicts[0].conflict_class == UndergroundConflictClass.REVIEW_REQUIRED
    assert res.conflicts[0].vertical_clearance_m == pytest.approx(0.5, abs=1e-2)
    assert res.conflicts[0].is_3d_clash is False


def test_evaluate_conflicts_invalid_overlap():
    """Verify two conflicting basements/subsurface volumes physically intersecting trigger INVALID_OVERLAP."""
    poly = Polygon([(775910, 1297150), (775930, 1297150), (775930, 1297170), (775910, 1297170)])
    prov = UndergroundProvenance(
        source_dataset="Test",
        source_type="TEST",
        source_file="test.geojson",
        crs="EPSG:32643",
        vertical_datum="AMSL",
        created_at="2026-09-07T00:00:00Z",
    )
    feat_a = UndergroundFeature(
        underground_feature_id="VAULT-1",
        feature_type=UndergroundFeatureType.SUBSURFACE_VOLUME,
        parcel_id="DEMO-401/1",
        name="Vault 1",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=918.0,
        base_elevation_m=915.0,
        depth_to_top_m=2.0,
        depth_to_base_m=5.0,
        thickness_m=3.0,
        geometry_2d=mapping(poly),
        provenance=prov,
    )
    feat_b = UndergroundFeature(
        underground_feature_id="VAULT-2",
        feature_type=UndergroundFeatureType.SUBSURFACE_VOLUME,
        parcel_id="DEMO-401/1",
        name="Vault 2",
        source="TEST",
        ground_elevation_m=920.0,
        top_elevation_m=917.0,  # Physically penetrates 1.0m into Vault 1
        base_elevation_m=913.0,
        depth_to_top_m=3.0,
        depth_to_base_m=7.0,
        thickness_m=4.0,
        geometry_2d=mapping(poly),
        provenance=prov,
    )
    req = UndergroundConflictRequest(
        candidate_feature=feat_a,
        existing_features=[feat_b],
    )
    res = underground_service.evaluate_conflicts(req)
    assert res.total_conflicts_found == 1
    assert res.has_invalid_clash is True
    assert res.conflicts[0].conflict_class == UndergroundConflictClass.INVALID_OVERLAP
    assert res.conflicts[0].is_3d_clash is True


# -----------------------------------------------------------------------------
# 5. Demonstration Bundle Integrity Tests
# -----------------------------------------------------------------------------

def test_demo_bundle_structure():
    """Verify demo bundle has 3 features, correct types, and watertight solids."""
    bundle = underground_service.get_demo_underground_bundle()
    assert bundle.total_features == 3
    assert bundle.basement_count == 1
    assert bundle.utility_count == 2
    assert bundle.parcel_id == "DEMO-401/1"

    basement = next(f for f in bundle.features if f.feature_type == UndergroundFeatureType.BASEMENT)
    assert basement.is_cadastral_property is True
    assert basement.building_id == "BLD-DEMO-101"
    assert basement.property_id is not None
    assert basement.geometry_status == Geometry3DStatus.VALID
    assert basement.mesh_3d is not None

    utilities = [f for f in bundle.features if f.feature_type == UndergroundFeatureType.UNDERGROUND_UTILITY]
    assert len(utilities) == 2
    for u in utilities:
        assert u.is_cadastral_property is False
        assert u.property_id is None
        assert u.geometry_status == Geometry3DStatus.VALID
        assert u.mesh_3d is not None


# -----------------------------------------------------------------------------
# 6. REST API Endpoint Tests
# -----------------------------------------------------------------------------

def test_api_get_demo():
    """Verify GET /api/v1/underground/demo."""
    res = client.get("/api/v1/underground/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["total_features"] == 3
    assert data["basement_count"] == 1
    assert data["utility_count"] == 2
    assert len(data["features"]) == 3


def test_api_get_feature_by_id():
    """Verify GET /api/v1/underground/{feature_id}."""
    res = client.get("/api/v1/underground/BSM-DEMO-101")
    assert res.status_code == 200
    data = res.json()
    assert data["underground_feature_id"] == "BSM-DEMO-101"
    assert data["feature_type"] == "BASEMENT"

    res_missing = client.get("/api/v1/underground/NON-EXISTENT")
    assert res_missing.status_code == 404


def test_api_validate_endpoint():
    """Verify POST /api/v1/underground/validate."""
    bundle = underground_service.get_demo_underground_bundle()
    feat_dict = bundle.features[0].model_dump()
    payload = {
        "feature": feat_dict,
    }
    res = client.post("/api/v1/underground/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["underground_feature_id"] == "BSM-DEMO-101"


def test_api_generate_3d_endpoint():
    """Verify POST /api/v1/underground/generate-3d."""
    poly = Polygon([(775910, 1297150), (775950, 1297150), (775950, 1297180), (775910, 1297180)])
    payload = {
        "underground_feature_id": "API-EXT-01",
        "feature_type": "BASEMENT",
        "footprint_geometry": mapping(poly),
        "ground_elevation_m": 920.0,
        "top_elevation_m": 920.0,
        "base_elevation_m": 916.0,
        "target_crs": "EPSG:32643",
        "source_crs": "EPSG:32643",
    }
    res = client.post("/api/v1/underground/generate-3d", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["geometry_status"] == "VALID"
    assert data["volume_cubic_m"] > 0.0
    assert data["mesh_3d"] is not None


def test_api_conflicts_endpoint():
    """Verify POST /api/v1/underground/conflicts."""
    bundle = underground_service.get_demo_underground_bundle()
    f1 = bundle.features[0].model_dump()
    f2 = bundle.features[1].model_dump()
    payload = {
        "candidate_feature": f2,
        "existing_features": [f1],
    }
    res = client.post("/api/v1/underground/conflicts", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["candidate_feature_id"] == "UTL-DEMO-001"
    assert data["total_conflicts_found"] == 1
    assert data["has_invalid_clash"] is False
