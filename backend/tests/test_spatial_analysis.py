"""
Test Suite for STEP 6: Basic 3D Spatial Analysis.

Validates the 14 mandatory test cases:
Case 1: Building contains floor (PASS).
Case 2: Floor contains unit (PASS).
Case 3: Valid unit containment (PASS).
Case 4: Invalid unit containment (FAIL - unit extends outside boundary).
Case 5: Unit/unit positive-area intersection (intersects=True, area > 0).
Case 6: Boundary-touching units (party wall: intersects=False, boundary_touch=True, area=0.0).
Case 7: Building/building intersection.
Case 8: Unit/unit proximity (metric Euclidean distance).
Case 9: Building/building proximity (metric Euclidean distance).
Case 10: Same Z level (SAME_LEVEL).
Case 11: Above/below relationship (ABOVE / BELOW).
Case 12: Overlapping Z ranges (OVERLAPPING_Z_RANGE).
Case 13: Disjoint Z ranges (DISJOINT_Z_RANGE).
Case 14: Cross-dataset analysis rejection (HTTP 400 'Objects belong to different datasets.').
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.spatial_analysis import (
    SpatialObjectRef,
    SpatialObjectType,
    ContainmentRequest,
    IntersectionRequest,
    ProximityRequest,
    VerticalRelationshipRequest,
    VerticalRelationshipType,
)
from app.services.spatial_analysis_service import SpatialAnalysisService

client = TestClient(app)

# 10m x 10m Building Footprint in Pune EPSG:4326
BUILDING_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85600, 18.52000],
            [73.85610, 18.52000],
            [73.85610, 18.52010],
            [73.85600, 18.52010],
            [73.85600, 18.52000],
        ]
    ],
}

# Floor Footprint (concentric/identical to building)
FLOOR_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85600, 18.52000],
            [73.85610, 18.52000],
            [73.85610, 18.52010],
            [73.85600, 18.52010],
            [73.85600, 18.52000],
        ]
    ],
}

# Unit 1: West half of floor (~5m x 10m)
UNIT_WEST_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85600, 18.52000],
            [73.85605, 18.52000],
            [73.85605, 18.52010],
            [73.85600, 18.52010],
            [73.85600, 18.52000],
        ]
    ],
}

# Unit 2: East half of floor, sharing party wall line [73.85605, 18.52000] -> [73.85605, 18.52010]
UNIT_EAST_PARTY_WALL_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85605, 18.52000],
            [73.85610, 18.52000],
            [73.85610, 18.52010],
            [73.85605, 18.52010],
            [73.85605, 18.52000],
        ]
    ],
}

# Overlapping Unit: covers middle section overlapping both West and East units
UNIT_OVERLAPPING_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85603, 18.52002],
            [73.85607, 18.52002],
            [73.85607, 18.52008],
            [73.85603, 18.52008],
            [73.85603, 18.52002],
        ]
    ],
}

# Disjoint Unit 3: separated to the East
UNIT_DISJOINT_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85620, 18.52000],
            [73.85625, 18.52000],
            [73.85625, 18.52010],
            [73.85620, 18.52010],
            [73.85620, 18.52000],
        ]
    ],
}

# Unit partially outside container
UNIT_OUTSIDE_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.85608, 18.52005],
            [73.85615, 18.52005],
            [73.85615, 18.52015],
            [73.85608, 18.52015],
            [73.85608, 18.52005],
        ]
    ],
}


class TestSpatialAnalysis:
    def test_01_building_contains_floor(self):
        """Case 1: Building contains floor within its horizontal footprint and Z bounds."""
        req = ContainmentRequest(
            object_a=SpatialObjectRef(
                id="BLD-01",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=BUILDING_POLYGON,
                base_elevation=0.0,
                top_elevation=12.0,
            ),
            object_b=SpatialObjectRef(
                id="FL01",
                type=SpatialObjectType.FLOOR,
                dataset_id="TEST_DS",
                building_id="BLD-01",
                geometry=FLOOR_POLYGON,
                base_elevation=0.0,
                top_elevation=3.0,
            ),
        )
        res = SpatialAnalysisService.analyze_containment(req)
        assert res.result is True
        assert res.status == "PASS"
        assert res.horizontal_contained is True
        assert res.vertical_contained is True

    def test_02_floor_contains_unit(self):
        """Case 2: Floor contains unit within horizontal footprint and identical floor interval."""
        req = ContainmentRequest(
            object_a=SpatialObjectRef(
                id="FL01",
                type=SpatialObjectType.FLOOR,
                dataset_id="TEST_DS",
                geometry=FLOOR_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U101",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_WEST_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_containment(req)
        assert res.result is True
        assert res.status == "PASS"
        assert res.horizontal_contained is True
        assert res.vertical_contained is True

    def test_03_valid_unit_containment(self):
        """Case 3: Unit inside Building returns PASS."""
        req = ContainmentRequest(
            object_a=SpatialObjectRef(
                id="BLD-01",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=BUILDING_POLYGON,
                base_elevation=0.0,
                top_elevation=12.0,
            ),
            object_b=SpatialObjectRef(
                id="U101",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_WEST_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_containment(req)
        assert res.result is True
        assert res.status == "PASS"

    def test_04_invalid_unit_containment_fails(self):
        """Case 4: Unit extending outside container returns FAIL."""
        req = ContainmentRequest(
            object_a=SpatialObjectRef(
                id="FL01",
                type=SpatialObjectType.FLOOR,
                dataset_id="TEST_DS",
                geometry=FLOOR_POLYGON,
                base_elevation=0.0,
                top_elevation=3.0,
            ),
            object_b=SpatialObjectRef(
                id="U_OUTSIDE",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_OUTSIDE_POLYGON,
                base_elevation=0.0,
                top_elevation=3.0,
            ),
        )
        res = SpatialAnalysisService.analyze_containment(req)
        assert res.result is False
        assert res.status == "FAIL"
        assert res.horizontal_contained is False

    def test_05_unit_unit_positive_area_intersection(self):
        """Case 5: Two units overlapping horizontally and vertically report intersects=True, area > 0."""
        req = IntersectionRequest(
            object_a=SpatialObjectRef(
                id="U_WEST",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_WEST_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U_OVERLAP",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_OVERLAPPING_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_intersection(req)
        assert res.intersects is True
        assert res.intersection_area_sqm > 0
        assert res.boundary_touch is False
        assert res.status == "PASS"

    def test_06_boundary_touching_units_not_area_overlap(self):
        """Case 6: Boundary-touching units (party wall) report area=0.0, intersects=False, boundary_touch=True."""
        req = IntersectionRequest(
            object_a=SpatialObjectRef(
                id="U_WEST",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_WEST_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U_EAST",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_EAST_PARTY_WALL_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_intersection(req)
        assert res.intersects is False
        assert res.boundary_touch is True
        assert res.intersection_area_sqm == 0.0
        assert res.status == "PASS"

    def test_07_building_building_intersection(self):
        """Case 7: Two overlapping building footprints report intersection."""
        req = IntersectionRequest(
            object_a=SpatialObjectRef(
                id="BLD-A",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=BUILDING_POLYGON,
                base_elevation=0.0,
                top_elevation=12.0,
            ),
            object_b=SpatialObjectRef(
                id="BLD-B",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=UNIT_OVERLAPPING_POLYGON,
                base_elevation=0.0,
                top_elevation=10.0,
            ),
        )
        res = SpatialAnalysisService.analyze_intersection(req)
        assert res.intersects is True
        assert res.intersection_area_sqm > 0

    def test_08_unit_unit_proximity_metric_distance(self):
        """Case 8: Calculates real metric distance in meters between disjoint units."""
        req = ProximityRequest(
            object_a=SpatialObjectRef(
                id="U_WEST",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_WEST_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U_DISJOINT",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                geometry=UNIT_DISJOINT_POLYGON,
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_proximity(req)
        assert res.distance_m > 5.0
        assert res.distance_2d_m > 5.0
        assert res.distance_z_m == 0.0

    def test_09_building_building_proximity(self):
        """Case 9: Calculates distance between separate buildings."""
        req = ProximityRequest(
            object_a=SpatialObjectRef(
                id="BLD-A",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=BUILDING_POLYGON,
                base_elevation=0.0,
                top_elevation=12.0,
            ),
            object_b=SpatialObjectRef(
                id="BLD-B",
                type=SpatialObjectType.BUILDING,
                dataset_id="TEST_DS",
                geometry=UNIT_DISJOINT_POLYGON,
                base_elevation=15.0,
                top_elevation=25.0,
            ),
        )
        res = SpatialAnalysisService.analyze_proximity(req)
        assert res.distance_m > 0.0
        assert res.distance_z_m == 3.0  # 15.0 - 12.0 = 3.0m

    def test_10_same_z_level(self):
        """Case 10: Two objects sharing the same vertical interval return SAME_LEVEL."""
        req = VerticalRelationshipRequest(
            object_a=SpatialObjectRef(
                id="U101",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U102",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res = SpatialAnalysisService.analyze_vertical_relationship(req)
        assert res.relationship == VerticalRelationshipType.SAME_LEVEL
        assert res.vertical_separation_m == 0.0

    def test_11_above_below_relationship(self):
        """Case 11: Unit 201 (6m->9m) is ABOVE Unit 101 (3m->6m); Unit 101 is BELOW Unit 201."""
        req_above = VerticalRelationshipRequest(
            object_a=SpatialObjectRef(
                id="U201",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=6.0,
                top_elevation=9.0,
            ),
            object_b=SpatialObjectRef(
                id="U101",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=3.0,
                top_elevation=6.0,
            ),
        )
        res_above = SpatialAnalysisService.analyze_vertical_relationship(req_above)
        assert res_above.relationship == VerticalRelationshipType.ABOVE

        req_below = VerticalRelationshipRequest(
            object_a=SpatialObjectRef(
                id="U101",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=3.0,
                top_elevation=6.0,
            ),
            object_b=SpatialObjectRef(
                id="U201",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=6.0,
                top_elevation=9.0,
            ),
        )
        res_below = SpatialAnalysisService.analyze_vertical_relationship(req_below)
        assert res_below.relationship == VerticalRelationshipType.BELOW

    def test_12_overlapping_z_ranges(self):
        """Case 12: Partially overlapping intervals return OVERLAPPING_Z_RANGE."""
        req = VerticalRelationshipRequest(
            object_a=SpatialObjectRef(
                id="U_A",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=2.0,
                top_elevation=5.0,
            ),
            object_b=SpatialObjectRef(
                id="U_B",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=4.0,
                top_elevation=7.0,
            ),
        )
        res = SpatialAnalysisService.analyze_vertical_relationship(req)
        assert res.relationship == VerticalRelationshipType.OVERLAPPING_Z_RANGE

    def test_13_disjoint_z_ranges(self):
        """Case 13: Non-contiguous, separated intervals return DISJOINT_Z_RANGE."""
        req = VerticalRelationshipRequest(
            object_a=SpatialObjectRef(
                id="U_HIGH",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=12.0,
                top_elevation=15.0,
            ),
            object_b=SpatialObjectRef(
                id="U_LOW",
                type=SpatialObjectType.UNIT,
                dataset_id="TEST_DS",
                base_elevation=0.0,
                top_elevation=3.0,
            ),
        )
        res = SpatialAnalysisService.analyze_vertical_relationship(req)
        assert res.relationship == VerticalRelationshipType.ABOVE
        assert res.vertical_separation_m == 9.0  # 12.0 - 3.0 = 9.0m

    def test_14_cross_dataset_analysis_rejected(self):
        """Case 14: Cross-dataset comparison is strictly rejected with HTTP 400 'Objects belong to different datasets.'."""
        payload = {
            "object_a": {
                "id": "U101",
                "type": "unit",
                "dataset_id": "DATASET_ALPHA",
                "geometry": UNIT_WEST_POLYGON,
                "base_elevation": 0.0,
                "top_elevation": 3.0,
            },
            "object_b": {
                "id": "U201",
                "type": "unit",
                "dataset_id": "DATASET_BETA",
                "geometry": UNIT_EAST_PARTY_WALL_POLYGON,
                "base_elevation": 0.0,
                "top_elevation": 3.0,
            },
        }

        # Test Containment endpoint
        res_c = client.post("/api/v1/spatial-analysis/containment", json=payload)
        assert res_c.status_code == 400
        assert "Objects belong to different datasets." in (res_c.json().get("message") or res_c.json().get("detail"))

        # Test Intersection endpoint
        res_i = client.post("/api/v1/spatial-analysis/intersection", json=payload)
        assert res_i.status_code == 400
        assert "Objects belong to different datasets." in (res_i.json().get("message") or res_i.json().get("detail"))

        # Test Proximity endpoint
        res_p = client.post("/api/v1/spatial-analysis/proximity", json=payload)
        assert res_p.status_code == 400
        assert "Objects belong to different datasets." in (res_p.json().get("message") or res_p.json().get("detail"))

        # Test Vertical endpoint
        res_v = client.post("/api/v1/spatial-analysis/vertical", json=payload)
        assert res_v.status_code == 400
        assert "Objects belong to different datasets." in (res_v.json().get("message") or res_v.json().get("detail"))
