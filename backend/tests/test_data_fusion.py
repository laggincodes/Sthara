"""
Unit and Integration Tests for Step 18: Multi-Source Georeferencing and Spatial Data Fusion.
"""

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, Point, box

from app.main import app
from app.schemas.fusion import (
    SourceType,
    SourceStatus,
    FusionStatus,
    FusionQualityLevel,
    ConflictSeverity,
    DatasetMetadata,
    GNSSReferencePoint,
    LiDARSourceReference,
    PropertyContextRequest,
)
from app.services.georeferencing_service import GeoreferencingService
from app.services.fusion_service import SpatialFusionService


@pytest.fixture
def client():
    return TestClient(app)


# ==============================================================================
# 1. CRS & Georeferencing Service Tests
# ==============================================================================

def test_crs_inspection_and_validation():
    # Valid EPSG code
    val = GeoreferencingService.validate_crs_string("EPSG:4326")
    assert val["valid"] is True
    assert val["is_geographic"] is True
    assert val["is_projected"] is False

    # Projected metric CRS
    val_proj = GeoreferencingService.validate_crs_string("EPSG:32643")
    assert val_proj["valid"] is True
    assert val_proj["is_projected"] is True
    assert GeoreferencingService.is_metric_projected("EPSG:32643") is True

    # Invalid CRS
    val_inv = GeoreferencingService.validate_crs_string("EPSG:999999999")
    assert val_inv["valid"] is False
    assert val_inv["error"] is not None


def test_crs_same_target_no_op():
    poly = Polygon([(73.856, 18.520), (73.857, 18.520), (73.857, 18.521), (73.856, 18.521), (73.856, 18.520)])
    transformed, record = GeoreferencingService.transform_geometry(poly, "EPSG:4326", "EPSG:4326")
    assert record.transformed is False
    assert record.method == "identity_no_op"
    assert transformed.equals(poly)


def test_crs_reprojection_different_crs():
    poly = Polygon([(73.856, 18.520), (73.857, 18.520), (73.857, 18.521), (73.856, 18.521), (73.856, 18.520)])
    transformed, record = GeoreferencingService.transform_geometry(poly, "EPSG:4326", "EPSG:32643")
    assert record.transformed is True
    assert record.source_crs == "EPSG:4326"
    assert record.target_crs == "EPSG:32643"
    # Projected coordinates in UTM 43N should have X ~ 379000, Y ~ 2048000
    centroid = transformed.centroid
    assert 300000 < centroid.x < 450000
    assert 2000000 < centroid.y < 2100000


def test_target_crs_selection_strategy():
    # 1. Explicit target CRS respected
    target, reason = GeoreferencingService.select_target_crs("EPSG:32644")
    assert target == "EPSG:32644"
    assert reason == "explicit_user_target_crs"

    # 2. Geometry-derived UTM zone (Delhi: 77.2 E -> UTM Zone 43N)
    delhi_poly = box(77.1, 28.6, 77.2, 28.7)
    target_delhi, reason_delhi = GeoreferencingService.select_target_crs(None, [delhi_poly])
    assert target_delhi == "EPSG:32643"
    assert reason_delhi == "derived_from_feature_centroid"

    # 3. Default fallback
    target_def, reason_def = GeoreferencingService.select_target_crs(None, None)
    assert target_def == "EPSG:32643"
    assert reason_def == "default_configured_project_crs"


def test_feature_normalization_preserves_source():
    feature = {
        "type": "Feature",
        "id": "TEST-F-01",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[73.856, 18.520], [73.857, 18.520], [73.857, 18.521], [73.856, 18.521], [73.856, 18.520]]],
        },
        "properties": {"name": "Test Boundary", "category": "parcel"},
    }
    norm_feat, rec = GeoreferencingService.normalize_feature(feature, "EPSG:4326", "EPSG:32643")
    assert norm_feat["id"] == "TEST-F-01"
    assert norm_feat["properties"]["_source_crs"] == "EPSG:4326"
    assert norm_feat["properties"]["_target_crs"] == "EPSG:32643"
    assert norm_feat["properties"]["_transformed"] is True
    # Source coordinates preserved in properties
    assert norm_feat["properties"]["_source_geometry"] == feature["geometry"]
    # Transformed geometry is in meters
    assert norm_feat["geometry"]["coordinates"][0][0][0] > 10000.0


# ==============================================================================
# 2. Spatial Fusion Service & Multi-Source Context Tests
# ==============================================================================

def test_multi_source_validation_service():
    datasets = [
        DatasetMetadata(
            dataset_id="DS-CADASTRAL",
            source_type=SourceType.CADASTRAL_GIS,
            source_format="GeoJSON",
            source_crs="EPSG:4326",
            units={"horizontal": "degrees", "vertical": "meters"},
            is_cadastral=True,
        ),
        DatasetMetadata(
            dataset_id="DS-DEM",
            source_type=SourceType.DEM,
            source_format="GeoTIFF",
            source_crs="EPSG:4326",
            units={"horizontal": "degrees", "vertical": "meters"},
            is_cadastral=False,
        ),
    ]

    resp = SpatialFusionService.validate_multi_source(datasets, target_crs="EPSG:32643")
    assert resp.valid is True
    assert resp.target_crs == "EPSG:32643"
    assert resp.target_crs_is_projected is True
    assert resp.sources_evaluated == 2
    assert resp.source_alignment["cadastral_gis"] is True
    assert resp.source_alignment["dem"] is True


def test_multi_source_validation_invalid_crs():
    datasets = [
        DatasetMetadata(
            dataset_id="DS-BAD",
            source_type=SourceType.CADASTRAL_GIS,
            source_format="GeoJSON",
            source_crs="EPSG:INVALID_CODE_999",
            units={"horizontal": "degrees", "vertical": "meters"},
        )
    ]
    resp = SpatialFusionService.validate_multi_source(datasets, target_crs="EPSG:32643")
    assert resp.valid is False
    assert len(resp.errors) > 0


def test_build_demo_fused_context():
    context = SpatialFusionService.build_demo_fused_context(target_crs="EPSG:32643")

    # Context structure
    assert context.context_id.startswith("FUSION-DEMO-")
    assert context.target_project_crs == "EPSG:32643"
    assert context.parcel is not None
    assert context.parcel["parcel_id"] in ("PARCEL-DEMO-101", "DEMO-401/1")
    assert context.parcel["project_crs"] == "EPSG:32643"

    # Multi-source layers participating
    assert context.source_alignment["cadastral_gis"] is True
    assert context.source_alignment["building_data"] is True
    assert context.source_alignment["dem"] is True
    assert context.source_alignment["lidar"] is True
    assert context.source_alignment["floor_data"] is True
    assert context.source_alignment["unit_data"] is True
    assert context.source_alignment["gnss_cors"] is True

    # Quality level should be FULL since all 7 layers are aligned
    assert context.quality_level == FusionQualityLevel.FULL

    # Buildings
    assert len(context.buildings) >= 2
    bld1 = next(b for b in context.buildings if b.building_id == "BLD-DEMO-001")
    assert bld1.is_cadastral is True
    assert bld1.associated_parcel_id in ("PARCEL-DEMO-101", "DEMO-401/1")
    assert bld1.ground_elevation is not None
    assert bld1.lidar_evidence is not None
    assert bld1.floors_count == 4
    assert len(bld1.floors) == 4

    bld2 = next(b for b in context.buildings if b.building_id == "BLD-DEMO-002")
    assert len(bld2.units) == 4  # Tower 2 Floor 5 units

    # GNSS Station
    assert context.gnss_reference is not None
    assert context.gnss_reference.station_id == "CORS-DL-01"

    # LiDAR Source
    assert context.lidar_source is not None
    assert context.lidar_source.total_points == 15420


def test_real_osm_fusion_honesty():
    context = SpatialFusionService.fuse_real_osm(target_crs="EPSG:32643", max_buildings=5)

    assert context.context_id.startswith("FUSION-REAL-OSM-")
    assert context.target_project_crs == "EPSG:32643"
    assert context.parcel is None  # OSM has no cadastral parcel
    assert context.quality_level == FusionQualityLevel.LIMITED
    assert context.fusion_status == FusionStatus.PARTIAL

    # Non-cadastral flag strictly preserved
    assert len(context.buildings) == 5
    for bld in context.buildings:
        assert bld.is_cadastral is False
        assert bld.legal_status == "UNVERIFIED_PHYSICAL_SURFACE"
        assert bld.associated_parcel_id is None
        assert bld.association_status == "UNRESOLVED"

    # Conflicts/notices clearly report crowd-sourced nature
    assert any(c.conflict_type == "NON_CADASTRAL_OBSERVATION" for c in context.conflicts)


# ==============================================================================
# 3. API Route Tests
# ==============================================================================

def test_api_fusion_validate(client):
    payload = {
        "datasets": [
            {
                "dataset_id": "PARCEL-DS",
                "source_type": "CADASTRAL_GIS",
                "source_format": "GeoJSON",
                "source_crs": "EPSG:4326",
                "units": {"horizontal": "degrees", "vertical": "meters"},
                "is_cadastral": True,
            }
        ],
        "target_crs": "EPSG:32643",
    }
    resp = client.post("/api/v1/fusion/validate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["target_crs"] == "EPSG:32643"
    assert data["target_crs_is_projected"] is True


def test_api_fusion_normalize(client):
    payload = {
        "features": [
            {
                "type": "Feature",
                "id": "PARCEL-101",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[73.856, 18.520], [73.857, 18.520], [73.857, 18.521], [73.856, 18.521], [73.856, 18.520]]],
                },
                "properties": {"name": "Demo Parcel"},
            }
        ],
        "source_crs": "EPSG:4326",
        "target_crs": "EPSG:32643",
    }
    resp = client.post("/api/v1/fusion/normalize", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["target_crs"] == "EPSG:32643"
    assert len(data["normalized_features"]) == 1
    assert len(data["transformations"]) == 1
    assert data["transformations"][0]["transformed"] is True


def test_api_fusion_demo(client):
    resp = client.get("/api/v1/fusion/demo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["schema_version"] == "1.0"
    ctx = data["context"]
    assert ctx["quality_level"] == "FULL"
    assert len(ctx["buildings"]) >= 2
    assert ctx["gnss_reference"]["station_id"] == "CORS-DL-01"


def test_api_fusion_real_osm(client):
    resp = client.get("/api/v1/fusion/real-osm?max_buildings=4")
    assert resp.status_code == 200
    data = resp.json()
    ctx = data["context"]
    assert ctx["quality_level"] == "LIMITED"
    assert len(ctx["buildings"]) == 4
    assert ctx["buildings"][0]["is_cadastral"] is False
