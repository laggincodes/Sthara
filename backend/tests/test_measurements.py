import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.spatial_analysis import SpatialObjectType, SpatialObjectRef
from app.schemas.measurements import DimensionsRequest, DistanceRequest
from app.services.measurement_service import MeasurementService
from app.services.unit_service import UnitService

client = TestClient(app)

# Test Geometries around Delhi (UTM Zone 43N)
POLY_A_GEOJSON = {
    "type": "Polygon",
    "coordinates": [
        [
            [77.12000, 28.65000],
            [77.12010, 28.65000],
            [77.12010, 28.65010],
            [77.12000, 28.65010],
            [77.12000, 28.65000],
        ]
    ],
}

POLY_B_ADJACENT = {
    "type": "Polygon",
    "coordinates": [
        [
            [77.12010, 28.65000],
            [77.12020, 28.65000],
            [77.12020, 28.65010],
            [77.12010, 28.65010],
            [77.12010, 28.65000],
        ]
    ],
}

POLY_C_SEPARATED = {
    "type": "Polygon",
    "coordinates": [
        [
            [77.12050, 28.65000],
            [77.12060, 28.65000],
            [77.12060, 28.65010],
            [77.12050, 28.65010],
            [77.12050, 28.65000],
        ]
    ],
}


class TestMeasurementService:
    """Automated tests for Step 7: 3D Measurement & Geometry Tools."""

    def test_01_building_dimensions(self):
        """Measures building dimensions: width, depth, height, area, volume."""
        req = DimensionsRequest(
            dataset_id="TEST_DS",
            object_id="BLD-TEST-01",
            object_type=SpatialObjectType.BUILDING,
            geometry=POLY_A_GEOJSON,
            base_elevation=0.0,
            top_elevation=12.0,
            height=12.0,
        )
        res = MeasurementService.calculate_dimensions(req)
        assert res.dataset_id == "TEST_DS"
        assert res.object_id == "BLD-TEST-01"
        assert res.object_type == "building"
        assert res.width_m > 0
        assert res.depth_m > 0
        assert res.height_m == 12.0
        assert res.area_sqm > 50.0  # ~90-110 sqm
        assert res.volume_cubic_m == round(res.area_sqm * 12.0, 2)
        assert res.z_min == 0.0
        assert res.z_max == 12.0

    def test_02_floor_dimensions(self):
        """Measures floor dimensions with specific 3m height."""
        req = DimensionsRequest(
            dataset_id="TEST_DS",
            object_id="BLD-TEST-01-FL02",
            object_type=SpatialObjectType.FLOOR,
            geometry=POLY_A_GEOJSON,
            base_elevation=3.0,
            top_elevation=6.0,
        )
        res = MeasurementService.calculate_dimensions(req)
        assert res.height_m == 3.0
        assert res.z_min == 3.0
        assert res.z_max == 6.0
        assert res.volume_cubic_m == round(res.area_sqm * 3.0, 2)

    def test_03_unit_dimensions_and_volume(self):
        """Measures unit dimensions from registered unit or inline geometry."""
        req = DimensionsRequest(
            dataset_id="TEST_DS",
            object_id="U101",
            object_type=SpatialObjectType.UNIT,
            geometry=POLY_A_GEOJSON,
            base_elevation=0.0,
            top_elevation=3.0,
            height=3.0,
        )
        res = MeasurementService.calculate_dimensions(req)
        assert res.object_type == "unit"
        assert res.height_m == 3.0
        assert res.area_sqm > 0
        assert res.volume_cubic_m > 0
        assert res.surface_area_sqm is not None

    def test_04_distance_between_adjacent_units_zero_distance(self):
        """Adjacent units sharing a boundary wall should report 0.00m horizontal distance."""
        obj_a = SpatialObjectRef(
            id="U101",
            type=SpatialObjectType.UNIT,
            dataset_id="TEST_DS",
            geometry=POLY_A_GEOJSON,
            base_elevation=0.0,
            top_elevation=3.0,
        )
        obj_b = SpatialObjectRef(
            id="U102",
            type=SpatialObjectType.UNIT,
            dataset_id="TEST_DS",
            geometry=POLY_B_ADJACENT,
            base_elevation=0.0,
            top_elevation=3.0,
        )
        req = DistanceRequest(
            dataset_id="TEST_DS",
            object_a=obj_a,
            object_b=obj_b,
        )
        res = MeasurementService.calculate_distance(req)
        assert res.horizontal_distance_m == 0.0
        assert res.vertical_distance_m == 0.0
        assert res.distance_3d_m == 0.0

    def test_05_distance_between_separated_buildings(self):
        """Computes metric distance between separated building polygons."""
        obj_a = SpatialObjectRef(
            id="BLD_A",
            type=SpatialObjectType.BUILDING,
            dataset_id="TEST_DS",
            geometry=POLY_A_GEOJSON,
            base_elevation=0.0,
            top_elevation=10.0,
        )
        obj_c = SpatialObjectRef(
            id="BLD_C",
            type=SpatialObjectType.BUILDING,
            dataset_id="TEST_DS",
            geometry=POLY_C_SEPARATED,
            base_elevation=0.0,
            top_elevation=10.0,
        )
        req = DistanceRequest(
            dataset_id="TEST_DS",
            object_a=obj_a,
            object_b=obj_c,
        )
        res = MeasurementService.calculate_distance(req)
        assert res.horizontal_distance_m > 20.0  # Separated by ~30-40 meters
        assert res.vertical_distance_m == 0.0
        assert res.distance_3d_m == res.horizontal_distance_m

    def test_06_distance_unit_to_building_with_vertical_gap(self):
        """Measures 3D distance between unit and building with vertical separation."""
        obj_u = SpatialObjectRef(
            id="U_ROOFTOP",
            type=SpatialObjectType.UNIT,
            dataset_id="TEST_DS",
            geometry=POLY_A_GEOJSON,
            base_elevation=20.0,
            top_elevation=23.0,
        )
        obj_b = SpatialObjectRef(
            id="BLD_GROUND",
            type=SpatialObjectType.BUILDING,
            dataset_id="TEST_DS",
            geometry=POLY_C_SEPARATED,
            base_elevation=0.0,
            top_elevation=10.0,
        )
        req = DistanceRequest(
            dataset_id="TEST_DS",
            object_a=obj_u,
            object_b=obj_b,
        )
        res = MeasurementService.calculate_distance(req)
        assert res.horizontal_distance_m > 20.0
        assert res.vertical_distance_m == 10.0  # 20.0 - 10.0 = 10.0m vertical gap
        assert res.distance_3d_m > res.horizontal_distance_m

    def test_07_invalid_object_geometry_rejected(self):
        """Invalid or non-polygonal geometry raises ValueError."""
        req = DimensionsRequest(
            dataset_id="TEST_DS",
            object_id="INVALID_GEOM",
            geometry={"type": "Point", "coordinates": [77.12, 28.65]},
        )
        with pytest.raises(ValueError, match="polygonal"):
            MeasurementService.calculate_dimensions(req)

    def test_08_cross_dataset_rejection(self):
        """Measurement between objects from different datasets is strictly rejected."""
        obj_a = SpatialObjectRef(
            id="U1",
            type=SpatialObjectType.UNIT,
            dataset_id="DATASET_ALPHA",
            geometry=POLY_A_GEOJSON,
        )
        obj_b = SpatialObjectRef(
            id="U2",
            type=SpatialObjectType.UNIT,
            dataset_id="DATASET_BETA",
            geometry=POLY_B_ADJACENT,
        )
        req = DistanceRequest(
            dataset_id="DATASET_ALPHA",
            object_a=obj_a,
            object_b=obj_b,
        )
        with pytest.raises(ValueError, match="different datasets"):
            MeasurementService.calculate_distance(req)

    def test_09_api_endpoints_integration(self):
        """Tests the FastAPI routes for dimensions and distance."""
        dim_payload = {
            "dataset_id": "TEST_DS",
            "object_id": "U101",
            "object_type": "unit",
            "geometry": POLY_A_GEOJSON,
            "base_elevation": 0.0,
            "top_elevation": 3.0,
        }
        res_dim = client.post("/api/v1/measurements/dimensions", json=dim_payload)
        assert res_dim.status_code == 200
        dim_data = res_dim.json()
        assert dim_data["width_m"] > 0
        assert dim_data["height_m"] == 3.0

        dist_payload = {
            "dataset_id": "TEST_DS",
            "object_a": {
                "id": "U101",
                "type": "unit",
                "dataset_id": "TEST_DS",
                "geometry": POLY_A_GEOJSON,
            },
            "object_b": {
                "id": "U102",
                "type": "unit",
                "dataset_id": "TEST_DS",
                "geometry": POLY_B_ADJACENT,
            },
        }
        res_dist = client.post("/api/v1/measurements/distance", json=dist_payload)
        assert res_dist.status_code == 200
        assert res_dist.json()["horizontal_distance_m"] == 0.0

        # Cross dataset via API returns 400
        bad_dist_payload = {
            "dataset_id": "TEST_DS",
            "object_a": {
                "id": "U101",
                "type": "unit",
                "dataset_id": "TEST_DS",
                "geometry": POLY_A_GEOJSON,
            },
            "object_b": {
                "id": "U102",
                "type": "unit",
                "dataset_id": "OTHER_DS",
                "geometry": POLY_B_ADJACENT,
            },
        }
        res_bad = client.post("/api/v1/measurements/distance", json=bad_dist_payload)
        assert res_bad.status_code == 400
        assert "different datasets" in (res_bad.json().get("message") or res_bad.json().get("detail"))
