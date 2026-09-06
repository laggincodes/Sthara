import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.elevation_service import ElevationService
from app.schemas.elevation import ElevationSamplePoint, ElevationStatus

client = TestClient(app)


def test_dem_metadata_inspection():
    meta = ElevationService.get_dem_metadata()
    assert meta.filename == "demo_elevation.tif"
    assert meta.format == "GTiff"
    assert meta.crs == "EPSG:4326"
    assert meta.width == 60
    assert meta.height == 50
    assert meta.nodata_value == -9999.0
    assert 559.0 <= meta.min_elevation_m <= 561.0
    assert 564.0 <= meta.max_elevation_m <= 566.0
    assert meta.vertical_unit == "meters"
    assert "AMSL" in meta.vertical_reference


def test_dem_missing_file_raises():
    with pytest.raises(FileNotFoundError, match="not found"):
        ElevationService.get_dem_metadata("non_existent_dem.tif")


def test_sample_point_valid_centroid():
    # Centroid inside demo parcel
    pt = ElevationSamplePoint(
        feature_id="PARCEL-DEMO-101",
        longitude=73.85615,
        latitude=18.52012,
        crs="EPSG:4326",
    )
    res = ElevationService.sample_batch([pt])
    assert res.total_samples == 1
    assert res.successful_samples == 1
    assert res.outside_coverage_samples == 0
    assert res.nodata_samples == 0

    item = res.results[0]
    assert item.feature_id == "PARCEL-DEMO-101"
    assert item.status == ElevationStatus.SUCCESS
    assert item.elevation_m is not None
    assert 560.0 <= item.elevation_m <= 565.0
    assert item.vertical_unit == "meters"
    assert "AMSL" in item.vertical_reference


def test_sample_point_outside_dem_bounds():
    pt = ElevationSamplePoint(
        feature_id="OUT-01",
        longitude=73.90000,
        latitude=18.60000,
        crs="EPSG:4326",
    )
    res = ElevationService.sample_batch([pt])
    assert res.outside_coverage_samples == 1
    item = res.results[0]
    assert item.status == ElevationStatus.OUTSIDE_COVERAGE
    assert item.elevation_m is None


def test_sample_point_nodata_pixel():
    # Top-left corner pixel at row 0, col 0 was set to -9999.0
    pt = ElevationSamplePoint(
        feature_id="NODATA-01",
        longitude=73.85551,
        latitude=18.52079,
        crs="EPSG:4326",
    )
    res = ElevationService.sample_batch([pt])
    assert res.nodata_samples == 1
    item = res.results[0]
    assert item.status == ElevationStatus.NODATA
    assert item.elevation_m is None


def test_sample_point_with_crs_transformation():
    # Provide coordinates in UTM Zone 43N (EPSG:32643) for approx [73.85615, 18.52012]
    # In UTM 43N: Easting ~379200, Northing ~2048000
    import pyproj
    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)
    utm_x, utm_y = transformer.transform(73.85615, 18.52012)

    pt = ElevationSamplePoint(
        feature_id="UTM-SAMPLE",
        longitude=utm_x,
        latitude=utm_y,
        crs="EPSG:32643",
    )
    res = ElevationService.sample_batch([pt])
    assert res.successful_samples == 1
    item = res.results[0]
    assert item.status == ElevationStatus.SUCCESS
    assert item.transformed_coords is not None
    assert abs(item.transformed_coords[0] - 73.85615) < 1e-4
    assert abs(item.transformed_coords[1] - 18.52012) < 1e-4
    assert item.elevation_m is not None
    assert 560.0 <= item.elevation_m <= 565.0


def test_api_get_dem_info_endpoint():
    response = client.get("/api/v1/elevation/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["filename"] == "demo_elevation.tif"
    assert data["data"]["format"] == "GTiff"
    assert data["data"]["vertical_unit"] == "meters"


def test_api_sample_elevation_endpoint_success():
    payload = {
        "points": [
            {"feature_id": "P-101", "longitude": 73.85615, "latitude": 18.52012, "crs": "EPSG:4326"},
            {"feature_id": "OUT-1", "longitude": 73.99999, "latitude": 18.99999, "crs": "EPSG:4326"}
        ]
    }
    response = client.post("/api/v1/elevation/sample", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["total_samples"] == 2
    assert data["data"]["successful_samples"] == 1
    assert data["data"]["outside_coverage_samples"] == 1


def test_api_sample_elevation_endpoint_empty_points():
    response = client.post("/api/v1/elevation/sample", json={"points": []})
    assert response.status_code == 400
