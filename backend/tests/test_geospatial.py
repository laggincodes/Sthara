import pytest
import io
import json
from fastapi import status

from app.services.geojson_validator import GeoJSONValidator
from app.services.parcel_normalizer import ParcelNormalizer
from app.utils.crs import inspect_crs, validate_crs, suggest_utm_crs, transform_geometry
from shapely.geometry import Polygon


# Fixtures
@pytest.fixture
def valid_single_parcel_geojson():
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "survey_no": "TEST-101",
                    "land_use": "Residential",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [73.856, 18.520],
                            [73.858, 18.520],
                            [73.858, 18.522],
                            [73.856, 18.522],
                            [73.856, 18.520],
                        ]
                    ],
                },
            }
        ],
    }


@pytest.fixture
def invalid_self_intersecting_polygon():
    """A 'bowtie' polygon that self-intersects at (1.0, 1.0)"""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"plot_id": "BAD-BOWTIE"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [0.0, 0.0],
                            [2.0, 2.0],
                            [2.0, 0.0],
                            [0.0, 2.0],
                            [0.0, 0.0],
                        ]
                    ],
                },
            }
        ],
    }


@pytest.fixture
def empty_geometry_feature():
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"id": "EMPTY-01"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [],
                },
            }
        ],
    }


# Unit Tests: CRS Utility
def test_crs_inspection_default_and_explicit():
    rfc_data = {"type": "FeatureCollection", "features": []}
    crs, src = inspect_crs(rfc_data)
    assert crs == "EPSG:4326"
    assert src == "rfc7946_default_wgs84"

    legacy_data = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::32643"}},
        "features": [],
    }
    crs_leg, src_leg = inspect_crs(legacy_data)
    assert crs_leg == "EPSG:32643"
    assert "explicit" in src_leg


def test_crs_validation_and_utm_suggestion():
    val_wgs = validate_crs("EPSG:4326")
    assert val_wgs["valid"] is True
    assert val_wgs["is_geographic"] is True

    val_utm = validate_crs("EPSG:32643")
    assert val_utm["valid"] is True
    assert val_utm["is_projected"] is True

    # Pune/Mumbai coordinates (~73.85°E, 18.52°N) -> Zone 43 North (EPSG:32643)
    suggested = suggest_utm_crs(73.856, 18.520)
    assert suggested == "EPSG:32643"


def test_geometry_transformation_explicit_recording():
    poly = Polygon([(73.856, 18.520), (73.858, 18.520), (73.858, 18.522), (73.856, 18.522)])
    transformed, meta = transform_geometry(poly, "EPSG:4326", "EPSG:32643")
    assert meta["transformed"] == "true"
    assert meta["source_crs"] == "EPSG:4326"
    assert meta["target_crs"] == "EPSG:32643"
    # In UTM, coordinates are in meters (large values)
    assert transformed.bounds[0] > 100000


# Unit Tests: GeoJSONValidator
def test_validator_accepts_valid_dataset(valid_single_parcel_geojson):
    result = GeoJSONValidator.validate_dataset(valid_single_parcel_geojson)
    assert result.valid is True
    assert result.feature_count == 1
    assert result.geometry_types == ["Polygon"]
    assert result.suggested_projected_crs == "EPSG:32643"
    assert len(result.errors) == 0


def test_validator_detects_self_intersecting_polygon(invalid_self_intersecting_polygon):
    result = GeoJSONValidator.validate_dataset(invalid_self_intersecting_polygon)
    assert result.valid is False
    assert len(result.errors) == 1
    error = result.errors[0]
    assert error.issue_type == "TOPOLOGICAL_VIOLATION"
    assert "Self-intersection" in error.message


def test_validator_detects_empty_geometry(empty_geometry_feature):
    result = GeoJSONValidator.validate_dataset(empty_geometry_feature)
    assert result.valid is False
    assert len(result.errors) >= 1
    assert any(e.issue_type in ("EMPTY_GEOMETRY", "EMPTY_COORDINATES") for e in result.errors)


def test_validator_rejects_malformed_structure():
    result = GeoJSONValidator.validate_dataset({"type": "InvalidRoot", "data": []})
    assert result.valid is False
    assert result.errors[0].issue_type == "INVALID_GEOJSON_TYPE"


# Unit Tests: ParcelNormalizer
def test_normalizer_detects_property_id(valid_single_parcel_geojson):
    val_result = GeoJSONValidator.validate_dataset(valid_single_parcel_geojson)
    dataset = ParcelNormalizer.normalize_dataset(valid_single_parcel_geojson, val_result)
    assert dataset.total_parcels == 1
    parcel = dataset.parcels[0]
    assert parcel.parcel_id == "TEST-101"
    assert parcel.is_system_generated_id is False
    assert parcel.detected_id_field == "survey_no"


def test_normalizer_assigns_system_generated_id_when_missing():
    raw_feature = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"other_field": "no_id_here"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                },
            }
        ],
    }
    val_result = GeoJSONValidator.validate_dataset(raw_feature)
    dataset = ParcelNormalizer.normalize_dataset(raw_feature, val_result)
    parcel = dataset.parcels[0]
    assert parcel.parcel_id.startswith("SYS-PARCEL-")
    assert parcel.is_system_generated_id is True
    assert parcel.detected_id_field is None


# Integration Tests: API Endpoints
def test_api_validate_endpoint_success(client, valid_single_parcel_geojson):
    response = client.post("/api/v1/datasets/validate", json=valid_single_parcel_geojson)
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "success"
    assert body["data"]["validation"]["valid"] is True
    assert len(body["data"]["normalized_dataset"]["parcels"]) == 1


def test_api_validate_endpoint_failure(client, invalid_self_intersecting_polygon):
    response = client.post("/api/v1/datasets/validate", json=invalid_self_intersecting_polygon)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    body = response.json()
    assert body["status"] == "error"
    assert body["error_code"] == "GEOMETRY_VALIDATION_FAILED"
    assert body["data"]["validation"]["valid"] is False


def test_api_upload_endpoint_success(client, valid_single_parcel_geojson):
    file_bytes = json.dumps(valid_single_parcel_geojson).encode("utf-8")
    files = {"file": ("test_cadastre.geojson", io.BytesIO(file_bytes), "application/geo+json")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "success"
    assert body["data"]["total_parcels"] == 1
    assert body["data"]["source_filename"] == "test_cadastre.geojson"


def test_api_upload_endpoint_rejects_non_geojson_extension(client):
    files = {"file": ("malicious.exe", io.BytesIO(b"dummy binary"), "application/octet-stream")}
    response = client.post("/api/v1/datasets/upload", files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    body = response.json()
    assert "Invalid file format" in body["message"]


def test_api_list_datasets_includes_demo(client):
    response = client.get("/api/v1/datasets")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "success"
    datasets = body["data"]
    assert any(d["dataset_id"] == "demo_parcels" for d in datasets)


def test_api_get_demo_dataset(client):
    response = client.get("/api/v1/datasets/demo_parcels")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "success"
    assert body["data"]["dataset_id"] == "demo_parcels"
    assert "raw_geojson" in body["data"]
