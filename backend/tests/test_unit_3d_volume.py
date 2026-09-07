import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.unit import (
    UnitType,
    Unit3DRequest,
    BatchUnit3DRequest,
)
from app.schemas.geometry_3d import FeatureType, Geometry3DStatus
from app.services.unit_service import UnitService
from app.services.extrusion_service import ExtrusionService
from app.services.floor_volume_service import FloorVolumeService
from app.schemas.property_volume import (
    PropertyVolumeRequest,
    VolumeType,
    BuildingFloors3DResult,
)

client = TestClient(app)

TEST_BUILDING_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8560, 18.5200],
            [73.8570, 18.5200],
            [73.8570, 18.5210],
            [73.8560, 18.5210],
            [73.8560, 18.5200],
        ]
    ],
}

TEST_PARENT_FLOOR = {
    "floor_id": "BLD-01-FL05",
    "building_id": "BLD-01",
    "floor_index": 5,
    "base_elevation": 100.0,
    "top_elevation": 103.0,
    "footprint_geometry": TEST_BUILDING_FOOTPRINT,
}

UNIT_501_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8561, 18.5201],
            [73.8564, 18.5201],
            [73.8564, 18.5204],
            [73.8561, 18.5204],
            [73.8561, 18.5201],
        ]
    ],
}

UNIT_502_FOOTPRINT_ADJACENT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8564, 18.5201],
            [73.8568, 18.5201],
            [73.8568, 18.5204],
            [73.8564, 18.5204],
            [73.8564, 18.5201],
        ]
    ],
}

UNIT_OVERLAPPING_FOOTPRINT = {
    "type": "Polygon",
    "coordinates": [
        [
            [73.8563, 18.5202],
            [73.8566, 18.5202],
            [73.8566, 18.5205],
            [73.8563, 18.5205],
            [73.8563, 18.5202],
        ]
    ],
}


def test_single_unit_3d_extrusion():
    """Unit 3D generation creates a valid, watertight 2-manifold Mesh3D with FeatureType.UNIT."""
    req = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )

    result = UnitService.generate_unit_3d(req)

    assert result.geometry_status == Geometry3DStatus.VALID
    assert result.geometry is not None
    assert len(result.geometry.parts) == 1

    mesh = result.geometry.parts[0]
    val = ExtrusionService.validate_mesh(mesh)
    assert val.valid is True
    assert mesh.feature_type == FeatureType.UNIT
    assert mesh.volume_cubic_m > 0
    assert mesh.surface_area_sqm > 0
    assert abs(mesh.bounds.min[2] - 100.0) < 1e-3
    assert abs(mesh.bounds.max[2] - 103.0) < 1e-3
    assert len(mesh.vertices) > 0
    assert len(mesh.faces) > 0


def test_multipolygon_unit_3d_extrusion():
    """MultiPolygon units are extruded into a Mesh3DCollection of closed meshes."""
    multipoly_geom = {
        "type": "MultiPolygon",
        "coordinates": [
            UNIT_501_FOOTPRINT["coordinates"],
            [
                [
                    [73.8566, 18.5206],
                    [73.8569, 18.5206],
                    [73.8569, 18.5209],
                    [73.8566, 18.5209],
                    [73.8566, 18.5206],
                ]
            ],
        ],
    }

    req = Unit3DRequest(
        unit_id="BLD-01-FL05-DUPLEX",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501-DUPLEX",
        unit_name="Duplex Suite 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=multipoly_geom,
    )

    result = UnitService.generate_unit_3d(req)

    assert result.geometry_status == Geometry3DStatus.VALID
    assert result.geometry is not None
    assert len(result.geometry.parts) == 2
    for m in result.geometry.parts:
        val = ExtrusionService.validate_mesh(m)
        assert val.valid is True
        assert m.feature_type == FeatureType.UNIT
    assert result.volume_cubic_m > 0


def test_unit_vertical_extent_inheritance():
    """Missing unit elevations inherit from parent floor with informational warning."""
    req = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=None,
        top_elevation=None,
        parent_floor_base=100.0,
        parent_floor_top=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )

    result = UnitService.generate_unit_3d(req)

    assert result.geometry_status == Geometry3DStatus.VALID
    assert result.geometry is not None
    assert abs(result.base_elevation - 100.0) < 1e-3
    assert abs(result.top_elevation - 103.0) < 1e-3
    assert any("UNIT_VERTICAL_EXTENT_INHERITED_FROM_FLOOR" in w for w in result.warnings)


def test_unit_vertical_extent_invalid_inverted():
    """Inverted or zero-height vertical extent fails validation."""
    req = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=105.0,
        top_elevation=100.0,  # inverted
        geometry_2d=UNIT_501_FOOTPRINT,
    )

    result = UnitService.generate_unit_3d(req)

    assert result.geometry_status == Geometry3DStatus.INVALID
    assert any("UNIT_INVALID_VERTICAL_EXTENT" in w for w in result.warnings)


def test_unit_vertical_extent_outside_parent_floor():
    """Unit exceeding parent floor vertical bounds fails validation."""
    req = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=95.0,  # floor starts at 100.0
        top_elevation=103.0,
        parent_floor_base=100.0,
        parent_floor_top=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )

    result = UnitService.generate_unit_3d(req)

    assert result.geometry_status == Geometry3DStatus.INVALID
    assert any("UNIT_OUTSIDE_FLOOR_VERTICAL_BOUNDS" in w for w in result.warnings)


def test_batch_units_party_wall_touching_allowed():
    """Adjacent units sharing a common party-wall boundary do not fail overlap check."""
    u1 = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )
    u2 = Unit3DRequest(
        unit_id="BLD-01-FL05-U502",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="502",
        unit_name="Apartment 502",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_502_FOOTPRINT_ADJACENT,
    )

    batch_req = BatchUnit3DRequest(
        units=[u1, u2],
    )

    response = UnitService.generate_batch_units_3d(batch_req)

    assert response.summary.requested == 2
    assert response.summary.successful == 2
    assert response.summary.failed == 0
    assert len(response.results) == 2
    assert all(r.geometry_status == Geometry3DStatus.VALID for r in response.results)


def test_batch_units_same_floor_positive_overlap_rejected():
    """Units on the same floor with overlapping footprint area are rejected."""
    u1 = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )
    u_overlap = Unit3DRequest(
        unit_id="BLD-01-FL05-U-BAD",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="599",
        unit_name="Overlap Unit",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_OVERLAPPING_FOOTPRINT,
    )

    batch_req = BatchUnit3DRequest(
        units=[u1, u_overlap],
    )

    response = UnitService.generate_batch_units_3d(batch_req)

    assert response.summary.requested == 2
    assert response.summary.failed >= 1
    bad_res = next(r for r in response.results if r.unit_id == "BLD-01-FL05-U-BAD")
    assert bad_res.geometry_status == Geometry3DStatus.INVALID
    assert any("POSITIVE_AREA_OVERLAP" in w for w in bad_res.warnings)


def test_property_volume_aggregation_from_units():
    """Property volume can be aggregated from discrete unit solids preserving contract."""
    u1 = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )
    u2 = Unit3DRequest(
        unit_id="BLD-01-FL05-U502",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="502",
        unit_name="Apartment 502",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_502_FOOTPRINT_ADJACENT,
    )

    res1 = UnitService.generate_unit_3d(u1)
    res2 = UnitService.generate_unit_3d(u2)

    req = PropertyVolumeRequest(
        property_id="PROP-COMBINED-501-502",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_ids=["BLD-01-FL05"],
        unit_ids=["BLD-01-FL05-U501", "BLD-01-FL05-U502"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        owner_entity_id="OWN-001",
    )

    prop_vol = FloorVolumeService.generate_property_volume(
        req=req,
        building_floors_map={
            "BLD-01": BuildingFloors3DResult(
                building_id="BLD-01",
                parcel_id="PARCEL-01",
                floor_count=1,
                geometry_status=Geometry3DStatus.VALID,
            )
        },
        units_map={
            "BLD-01-FL05-U501": res1,
            "BLD-01-FL05-U502": res2,
        },
    )

    assert prop_vol.geometry_status == Geometry3DStatus.VALID
    assert prop_vol.geometry is not None
    assert len(prop_vol.geometry.parts) == 2
    assert prop_vol.volume_cubic_m > 0
    assert prop_vol.geometry.parts[0].feature_type == FeatureType.PROPERTY_VOLUME


def test_api_units_generate_3d_endpoint():
    """POST /api/v1/units/generate-3d generates 3D geometries via API."""
    u1 = Unit3DRequest(
        unit_id="BLD-01-FL05-U501",
        parcel_id="PARCEL-01",
        building_id="BLD-01",
        floor_id="BLD-01-FL05",
        unit_number="501",
        unit_name="Apartment 501",
        unit_type=UnitType.APARTMENT_UNIT,
        base_elevation=100.0,
        top_elevation=103.0,
        geometry_2d=UNIT_501_FOOTPRINT,
    )

    payload = {
        "units": [u1.model_dump()],
    }

    res = client.post("/api/v1/units/generate-3d", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["requested"] == 1
    assert data["summary"]["successful"] == 1
    assert data["summary"]["failed"] == 0
    assert len(data["results"]) == 1
    assert data["results"][0]["geometry_status"] == "VALID"
    assert data["results"][0]["geometry"] is not None


def test_api_units_demo_3d_endpoint():
    """GET /api/v1/units/demo-3d returns 4 canonical 3D solids for Tower 1 Floor 5."""
    res = client.get("/api/v1/units/demo-3d")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["requested"] == 4
    assert data["summary"]["successful"] == 4
    assert data["summary"]["failed"] == 0
    assert len(data["results"]) == 4
    for r in data["results"]:
        assert r["geometry_status"] == "VALID"
        assert r["geometry"] is not None
        assert r["geometry"]["parts"][0]["feature_type"] == "UNIT"
        assert r["geometry"]["parts"][0]["volume_cubic_m"] > 0
