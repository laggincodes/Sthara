import pytest
from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    GeometryType,
    FaceWinding,
    Building3DRequest,
    BatchBuilding3DRequest,
    Mesh3D,
    Mesh3DCollection,
    CoordinateReference,
    UnitReference,
    Bounds3D,
    GeometryValidationErrorType,
)
from app.services.extrusion_service import ExtrusionService
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Section 22 Canonical Synthetic Building Specification
CANONICAL_RECTANGLE_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 10.0],
            [0.0, 10.0],
            [0.0, 0.0],
        ]
    ],
}


def test_canonical_3d_geometry_contract():
    """
    Verifies Section 22 canonical synthetic building:
    Rectangle (0,0) to (10,10), base=42m, top=54m, height=12m.
    """
    req = Building3DRequest(
        building_id="BLD-CANONICAL-001",
        parcel_id="PARCEL-CANONICAL-101",
        footprint_geometry=CANONICAL_RECTANGLE_FOOTPRINT,
        ground_elevation=42.0,
        roof_elevation=54.0,
        source_crs="EPSG:32643",  # Already in metric coordinates
        target_crs="EPSG:32643",
        scene_origin=[0.0, 0.0, 42.0],  # Normalized origin at (0, 0, 42)
    )

    result = ExtrusionService.extrude_building(req)

    # 1. High-level Building3D contract
    assert result.building_id == "BLD-CANONICAL-001"
    assert result.geometry_status == Geometry3DStatus.VALID
    assert result.building.base_elevation == 42.0
    assert result.building.top_elevation == 54.0
    assert result.building.height == 12.0
    assert result.building.height_source == "EXPLICIT_ROOF_ELEVATION"
    assert result.geometry is not None

    collection: Mesh3DCollection = result.geometry
    assert len(collection.parts) == 1
    mesh: Mesh3D = collection.parts[0]

    # 2. Canonical Mesh3D contract
    assert mesh.feature_id == "BLD-CANONICAL-001"
    assert mesh.feature_type == FeatureType.BUILDING
    assert mesh.geometry_type == GeometryType.SOLID
    assert mesh.winding == FaceWinding.COUNTER_CLOCKWISE

    # 3. Units & Coordinate Reference
    assert mesh.units.horizontal_unit == "meter"
    assert mesh.units.vertical_unit == "meter"
    assert mesh.coordinate_reference.horizontal_crs == "EPSG:32643"
    assert mesh.coordinate_reference.source_crs == "EPSG:32643"
    assert mesh.coordinate_reference.viewer_origin == [0.0, 0.0, 42.0]

    # 4. Vertices Contract: 8+ unique vertices, finite, 3 elements each
    assert len(mesh.vertices) >= 8
    for v in mesh.vertices:
        assert len(v) == 3
        assert all(isinstance(c, (int, float)) for c in v)

    # 5. Faces Contract: triangulated, valid 0-indexed integer references
    num_v = len(mesh.vertices)
    assert len(mesh.faces) >= 12  # Box has 6 quads -> 12 triangles minimum
    for f in mesh.faces:
        assert len(f) == 3
        assert all(isinstance(idx, int) and 0 <= idx < num_v for idx in f)
        # No collapsed triangles
        assert len(set(f)) == 3

    # 6. Bounds Contract: corresponds to actual vertices
    # Since origin is [0, 0, 42]:
    # x in [0, 10], y in [0, 10], z in [0, 12]
    assert mesh.bounds.min[0] == 0.0
    assert mesh.bounds.min[1] == 0.0
    assert mesh.bounds.min[2] == 0.0  # (42 - 42)
    assert mesh.bounds.max[0] == 10.0
    assert mesh.bounds.max[1] == 10.0
    assert mesh.bounds.max[2] == 12.0  # (54 - 42)

    # 7. Volume and Surface Area Verification
    # Box 10 x 10 x 12: volume = 1200 m³, surface area = 2*(100) + 4*(120) = 680 m²
    assert mesh.volume_cubic_m == 1200.0
    assert mesh.surface_area_sqm == 680.0
    assert collection.total_volume_cubic_m == 1200.0
    assert collection.total_surface_area_sqm == 680.0

    # 8. Solid Watertightness and Topological Validation
    val = ExtrusionService.validate_mesh(mesh)
    assert val.valid is True
    assert len(val.errors) == 0

    # 9. Three.js Compatibility Simulation
    # Flattened Float32 position buffer length must be len(vertices) * 3
    positions = [coord for v in mesh.vertices for coord in v]
    assert len(positions) == len(mesh.vertices) * 3
    indices = [idx for f in mesh.faces for idx in f]
    assert len(indices) == len(mesh.faces) * 3


def test_multipolygon_collection_contract():
    """
    Verifies Section 13 MultiPolygon contract: multiple mesh parts inside Mesh3DCollection.
    """
    multi_footprint = {
        "type": "MultiPolygon",
        "coordinates": [
            # Part 1: Square A
            [
                [[0.0, 0.0], [5.0, 0.0], [5.0, 5.0], [0.0, 5.0], [0.0, 0.0]]
            ],
            # Part 2: Square B
            [
                [[10.0, 10.0], [15.0, 10.0], [15.0, 15.0], [10.0, 15.0], [10.0, 10.0]]
            ],
        ],
    }

    req = Building3DRequest(
        building_id="BLD-MULTI-001",
        footprint_geometry=multi_footprint,
        ground_elevation=50.0,
        roof_elevation=60.0,
        source_crs="EPSG:32643",
        target_crs="EPSG:32643",
    )

    result = ExtrusionService.extrude_building(req)
    assert result.geometry_status == Geometry3DStatus.VALID
    assert result.geometry is not None
    assert len(result.geometry.parts) == 2

    part1, part2 = result.geometry.parts
    assert part1.feature_id == "BLD-MULTI-001-P1"
    assert part2.feature_id == "BLD-MULTI-001-P2"
    assert ExtrusionService.validate_mesh(part1).valid is True
    assert ExtrusionService.validate_mesh(part2).valid is True

    # Aggregate volume: 2 * (25 * 10) = 500 m³
    assert result.geometry.total_volume_cubic_m == 500.0


def test_validation_catches_open_and_corrupt_meshes():
    """
    Verifies Section 21 validation contract detects corrupt/non-solid meshes.
    """
    coord_ref = CoordinateReference(
        horizontal_crs="EPSG:32643",
        vertical_reference="AMSL",
        source_crs="EPSG:4326",
        viewer_origin=[0.0, 0.0, 0.0],
    )
    bounds = Bounds3D(min=[0.0, 0.0, 0.0], max=[1.0, 1.0, 1.0])

    # 1. Non-finite vertex
    bad_v_mesh = Mesh3D(
        feature_id="BAD-1",
        vertices=[[0.0, 0.0, 0.0], [1.0, 0.0, float("nan")], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        faces=[[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
        coordinate_reference=coord_ref,
        bounds=bounds,
    )
    val1 = ExtrusionService.validate_mesh(bad_v_mesh)
    assert val1.valid is False
    assert any(GeometryValidationErrorType.NON_FINITE_COORDINATE.value in err for err in val1.errors)

    # 2. Out-of-range face index
    bad_idx_mesh = Mesh3D(
        feature_id="BAD-2",
        vertices=[[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        faces=[[0, 1, 99], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
        coordinate_reference=coord_ref,
        bounds=bounds,
    )
    val2 = ExtrusionService.validate_mesh(bad_idx_mesh)
    assert val2.valid is False
    assert any(GeometryValidationErrorType.INVALID_FACE_INDEX.value in err for err in val2.errors)

    # 3. Open mesh (missing faces)
    open_mesh = Mesh3D(
        feature_id="BAD-3",
        vertices=[[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        faces=[[0, 1, 2]],  # Only 1 triangle -> boundaries exist, not closed
        coordinate_reference=coord_ref,
        bounds=bounds,
    )
    val3 = ExtrusionService.validate_mesh(open_mesh)
    assert val3.valid is False
    assert any(GeometryValidationErrorType.OPEN_SOLID.value in err for err in val3.errors)


def test_api_generate_3d_contract_response():
    """
    Verifies Section 14 exact JSON response structure on POST /api/v1/buildings/generate-3d.
    """
    payload = {
        "buildings": [
            {
                "building_id": "B001",
                "parcel_id": "PARCEL-101",
                "footprint_geometry": CANONICAL_RECTANGLE_FOOTPRINT,
                "ground_elevation": 42.0,
                "roof_elevation": 54.0,
                "source_crs": "EPSG:32643",
                "target_crs": "EPSG:32643",
            }
        ],
        "compute_shared_origin": True,
    }

    response = client.post("/api/v1/buildings/generate-3d", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify Section 14 exact structure
    assert data["schema_version"] == "1.0"
    assert "results" in data
    assert "summary" in data

    assert data["summary"]["requested"] == 1
    assert data["summary"]["successful"] == 1
    assert data["summary"]["failed"] == 0

    res0 = data["results"][0]
    assert res0["building_id"] == "B001"
    assert res0["geometry_status"] == "VALID"
    assert res0["building"]["building_id"] == "B001"
    assert res0["building"]["parcel_id"] == "PARCEL-101"
    assert res0["building"]["base_elevation"] == 42.0
    assert res0["building"]["top_elevation"] == 54.0
    assert res0["building"]["height"] == 12.0

    geom = res0["geometry"]
    assert "parts" in geom
    assert len(geom["parts"]) == 1
    part0 = geom["parts"][0]
    assert "vertices" in part0
    assert "faces" in part0
    assert "coordinate_reference" in part0
    assert "units" in part0
    assert "bounds" in part0
    assert part0["geometry_type"] == "SOLID"
    assert part0["winding"] == "COUNTER_CLOCKWISE"
