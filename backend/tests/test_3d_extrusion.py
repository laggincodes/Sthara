import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.geometry_3d import (
    Geometry3DStatus,
    Building3DRequest,
    BatchBuilding3DRequest,
    FaceWinding,
)
from app.services.extrusion_service import ExtrusionService

client = TestClient(app)

# Standard test square in Pune UTM Zone 43N coordinates (approx ~73.856, 18.520)
# lon/lat coordinates for 20m x 20m footprint
SQUARE_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8560, 18.5200],
            [73.8562, 18.5200],
            [73.8562, 18.5202],
            [73.8560, 18.5202],
            [73.8560, 18.5200],
        ]
    ],
}

# Polygon with hole (atrium)
DONUT_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        # Exterior boundary
        [
            [73.8560, 18.5200],
            [73.8564, 18.5200],
            [73.8564, 18.5204],
            [73.8560, 18.5204],
            [73.8560, 18.5200],
        ],
        # Interior hole
        [
            [73.8561, 18.5201],
            [73.8563, 18.5201],
            [73.8563, 18.5203],
            [73.8561, 18.5203],
            [73.8561, 18.5201],
        ],
    ],
}

# L-shaped concave polygon
L_SHAPED_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8560, 18.5200],
            [73.8564, 18.5200],
            [73.8564, 18.5202],
            [73.8562, 18.5202],
            [73.8562, 18.5204],
            [73.8560, 18.5204],
            [73.8560, 18.5200],
        ]
    ],
}


def test_extrusion_basic_square():
    req = Building3DRequest(
        building_id="BLD-TEST-001",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=560.0,
        building_height=10.0,
        source_crs="EPSG:4326",
        target_crs="EPSG:32643",
    )
    res = ExtrusionService.extrude_building(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.geometry is not None
    assert len(res.geometry.parts) == 1
    mesh = res.geometry.parts[0]

    assert len(mesh.vertices) >= 8
    assert len(mesh.faces) >= 12
    assert mesh.winding == FaceWinding.COUNTER_CLOCKWISE

    # Check volume and surface area
    assert mesh.volume_cubic_m is not None and mesh.volume_cubic_m > 0
    assert mesh.surface_area_sqm is not None and mesh.surface_area_sqm > 0

    # Bounds check: minZ should be ~0 (relative to base_z origin), height ~ 10m
    local_bounds = mesh.bounds
    assert round(local_bounds.max[2] - local_bounds.min[2], 2) == 10.0


def test_height_priority_order():
    # 1. LiDAR should take priority over explicit roof and building height
    req1 = Building3DRequest(
        building_id="BLD-TEST-PRIORITY",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=560.0,
        roof_elevation=570.0,
        building_height=12.0,
        lidar_roof_elevation=575.5,
    )
    b, t, h, src, _ = ExtrusionService.resolve_height_and_elevations(req1)
    assert src == "LIDAR_DERIVED"
    assert t == 575.5
    assert h == 15.5

    # 2. Explicit roof elevation over building height
    req2 = Building3DRequest(
        building_id="BLD-TEST-PRIORITY",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=560.0,
        roof_elevation=572.0,
        building_height=20.0,
    )
    b, t, h, src, _ = ExtrusionService.resolve_height_and_elevations(req2)
    assert src == "EXPLICIT_ROOF_ELEVATION"
    assert t == 572.0
    assert h == 12.0

    # 3. Explicit building height when roof elevation is absent
    req3 = Building3DRequest(
        building_id="BLD-TEST-PRIORITY",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=560.0,
        building_height=8.5,
    )
    b, t, h, src, _ = ExtrusionService.resolve_height_and_elevations(req3)
    assert src == "EXPLICIT_BUILDING_HEIGHT"
    assert t == 568.5
    assert h == 8.5


def test_extrusion_polygon_with_hole():
    req = Building3DRequest(
        building_id="BLD-DONUT-001",
        footprint_geometry=DONUT_FOOTPRINT,
        ground_elevation=560.0,
        roof_elevation=575.0,
        source_crs="EPSG:4326",
        target_crs="EPSG:32643",
    )
    res = ExtrusionService.extrude_building(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.geometry is not None
    assert res.geometry.total_volume_cubic_m is not None and res.geometry.total_volume_cubic_m > 0
    assert res.building.height == 15.0


def test_extrusion_concave_l_shape():
    req = Building3DRequest(
        building_id="BLD-L-SHAPE",
        footprint_geometry=L_SHAPED_FOOTPRINT,
        ground_elevation=550.0,
        building_height=14.0,
        source_crs="EPSG:4326",
        target_crs="EPSG:32643",
    )
    res = ExtrusionService.extrude_building(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.geometry is not None
    assert res.geometry.total_volume_cubic_m is not None and res.geometry.total_volume_cubic_m > 0


def test_missing_or_invalid_elevations():
    # Missing ground elevation
    req_no_ground = Building3DRequest(
        building_id="BLD-FAIL-1",
        footprint_geometry=SQUARE_FOOTPRINT,
        roof_elevation=570.0,
    )
    res = ExtrusionService.extrude_building(req_no_ground)
    assert res.geometry_status == Geometry3DStatus.UNAVAILABLE
    assert res.geometry is None

    # Roof elevation lower than ground elevation -> INVALID
    req_roof_lower = Building3DRequest(
        building_id="BLD-FAIL-2",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=570.0,
        roof_elevation=560.0,
    )
    res = ExtrusionService.extrude_building(req_roof_lower)
    assert res.geometry_status == Geometry3DStatus.INVALID
    assert res.geometry is None

    # Degenerate tiny footprint (< 1 sqm) -> INVALID
    tiny_footprint = {
        "type": "Polygon",
        "coordinates": [
            [
                [73.856000, 18.520000],
                [73.856001, 18.520000],
                [73.856001, 18.520001],
                [73.856000, 18.520001],
                [73.856000, 18.520000],
            ]
        ],
    }
    req_tiny = Building3DRequest(
        building_id="BLD-FAIL-3",
        footprint_geometry=tiny_footprint,
        ground_elevation=560.0,
        building_height=10.0,
    )
    res_tiny = ExtrusionService.extrude_building(req_tiny)
    assert res_tiny.geometry_status == Geometry3DStatus.INVALID
    assert res_tiny.geometry is None


def test_batch_shared_origin():
    req1 = Building3DRequest(
        building_id="BLD-1",
        footprint_geometry=SQUARE_FOOTPRINT,
        ground_elevation=560.0,
        building_height=10.0,
    )
    req2 = Building3DRequest(
        building_id="BLD-2",
        footprint_geometry=L_SHAPED_FOOTPRINT,
        ground_elevation=562.0,
        building_height=15.0,
    )
    batch_req = BatchBuilding3DRequest(
        buildings=[req1, req2],
        target_crs="EPSG:32643",
        compute_shared_origin=True,
    )
    batch_res = ExtrusionService.extrude_batch(batch_req)
    assert batch_res.summary.requested == 2
    assert batch_res.summary.successful == 2

    # Both buildings must have used the same viewer_origin in coordinate_reference
    origin_1 = batch_res.results[0].geometry.parts[0].coordinate_reference.viewer_origin
    origin_2 = batch_res.results[1].geometry.parts[0].coordinate_reference.viewer_origin
    assert origin_1 == origin_2


def test_api_generate_3d_endpoint():
    payload = {
        "buildings": [
            {
                "building_id": "BLD-API-1",
                "footprint_geometry": SQUARE_FOOTPRINT,
                "ground_elevation": 560.0,
                "building_height": 10.0,
                "source_crs": "EPSG:4326",
                "target_crs": "EPSG:32643",
            }
        ],
        "compute_shared_origin": True,
    }
    response = client.post("/api/v1/buildings/generate-3d", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] == 1
    assert data["summary"]["successful"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["geometry"] is not None


def test_api_extrude_demo_endpoint():
    response = client.post("/api/v1/buildings/extrude-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] >= 4
    assert data["summary"]["successful"] >= 4
    assert data["summary"]["failed"] == 0

    # Check that all demo buildings were extruded
    bld_ids = [b["building_id"] for b in data["results"]]
    assert "BLD-DEMO-001" in bld_ids
    assert "BLD-DEMO-002" in bld_ids
    assert "BLD-DEMO-003" in bld_ids
    assert "BLD-DEMO-004" in bld_ids
