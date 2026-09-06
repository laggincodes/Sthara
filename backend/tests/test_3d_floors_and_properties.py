import math
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, MultiPolygon

from app.main import app
from app.schemas.geometry_3d import (
    Geometry3DStatus,
    FeatureType,
    GeometryType,
    FaceWinding,
)
from app.schemas.property_volume import (
    VolumeType,
    FloorIntervalSpec,
    BuildingFloors3DRequest,
    BatchBuildingFloors3DRequest,
    PropertyVolumeRequest,
    BatchPropertyVolumeRequest,
)
from app.services.floor_volume_service import FloorVolumeService
from app.services.extrusion_service import ExtrusionService

client = TestClient(app)

# Standard test square footprint: 10m x 10m = 100 m² in EPSG:32643
SQUARE_COORDS_4326 = [
    [73.85600, 18.52000],
    [73.85610, 18.52000],
    [73.85610, 18.52010],
    [73.85600, 18.52010],
    [73.85600, 18.52000],
]
SQUARE_GEOJSON = {
    "type": "Polygon",
    "coordinates": [SQUARE_COORDS_4326],
}


# --- 1. Floor Generation Tests ---

def test_floor_generation_single_floor():
    """Validates extrusion of a single-floor building."""
    req = BuildingFloors3DRequest(
        building_id="BLD-TEST-SINGLE",
        parcel_id="PARCEL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=4.0,
        number_of_floors=1,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 1
    assert len(res.floors) == 1

    fl0 = res.floors[0]
    assert fl0.floor_id == "BLD-TEST-SINGLE-FL00"
    assert fl0.floor_index == 0
    assert fl0.base_elevation == 42.0
    assert fl0.top_elevation == 46.0
    assert fl0.height == 4.0
    assert fl0.geometry_status == Geometry3DStatus.VALID
    assert fl0.geometry is not None
    assert len(fl0.geometry.parts) == 1
    assert fl0.geometry.parts[0].feature_type == FeatureType.FLOOR
    assert fl0.volume_cubic_m > 0
    assert fl0.surface_area_sqm > 0


def test_floor_generation_multi_floor_equal_slicing():
    """Validates 4 floors generated from ground=42m, height=12m (3m per floor)."""
    req = BuildingFloors3DRequest(
        building_id="BLD-TEST-MULTI",
        parcel_id="PARCEL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=12.0,
        number_of_floors=4,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 4
    assert len(res.floors) == 4

    expected_elevations = [
        (42.0, 45.0),
        (45.0, 48.0),
        (48.0, 51.0),
        (51.0, 54.0),
    ]

    for idx, (expected_base, expected_top) in enumerate(expected_elevations):
        fl = res.floors[idx]
        assert fl.floor_index == idx
        assert fl.base_elevation == expected_base
        assert fl.top_elevation == expected_top
        assert fl.height == 3.0
        assert fl.geometry_status == Geometry3DStatus.VALID
        assert fl.geometry is not None
        assert len(fl.geometry.parts) == 1
        # Each floor solid must be a watertight closed solid
        audit = ExtrusionService.validate_mesh(fl.geometry.parts[0])
        assert audit.valid is True


def test_floor_generation_explicit_elevations():
    """Validates Priority 1: Explicit floor intervals with base/top elevations."""
    explicit_floors = [
        FloorIntervalSpec(
            floor_id="BLD-EXP-FL00",
            floor_index=0,
            floor_name="Ground Lobby",
            base_elevation=50.0,
            top_elevation=54.5,
            floor_height=4.5,
        ),
        FloorIntervalSpec(
            floor_id="BLD-EXP-FL01",
            floor_index=1,
            floor_name="First Storey Office",
            base_elevation=54.5,
            top_elevation=57.5,
            floor_height=3.0,
        ),
    ]
    req = BuildingFloors3DRequest(
        building_id="BLD-EXP",
        parcel_id="PARCEL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=50.0,
        roof_elevation=57.5,
        floors=explicit_floors,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 2
    assert res.floors[0].height == 4.5
    assert res.floors[1].height == 3.0


def test_floor_generation_explicit_heights():
    """Validates Priority 2: Explicit floor heights cumulative addition."""
    explicit_heights = [
        FloorIntervalSpec(
            floor_id="BLD-H-FL00",
            floor_index=0,
            floor_name="Ground Retail",
            floor_height=4.0,
        ),
        FloorIntervalSpec(
            floor_id="BLD-H-FL01",
            floor_index=1,
            floor_name="Typical Floor 1",
            floor_height=3.2,
        ),
    ]
    req = BuildingFloors3DRequest(
        building_id="BLD-H",
        parcel_id="PARCEL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=100.0,
        floors=explicit_heights,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 2
    assert res.floors[0].base_elevation == 100.0
    assert res.floors[0].top_elevation == 104.0
    assert res.floors[1].base_elevation == 104.0
    assert res.floors[1].top_elevation == 107.2


def test_floor_generation_missing_information_returns_unavailable():
    """Validates that insufficient elevation info yields UNAVAILABLE."""
    req = BuildingFloors3DRequest(
        building_id="BLD-NO-INFO",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        # Neither height, roof, nor floor count provided
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.UNAVAILABLE
    assert len(res.warnings) > 0
    assert "Insufficient floor elevation information" in res.warnings[0]


def test_floor_generation_invalid_floor_height_rejected():
    """Validates rejection of negative or zero floor height."""
    invalid_floors = [
        FloorIntervalSpec(
            floor_id="BLD-INV-FL00",
            floor_index=0,
            floor_name="Ground",
            base_elevation=50.0,
            top_elevation=48.0,  # Inverted! top < base
        )
    ]
    req = BuildingFloors3DRequest(
        building_id="BLD-INV",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=50.0,
        floors=invalid_floors,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.INVALID
    assert any("strictly greater" in w for w in res.warnings)


def test_floor_generation_overlapping_floors_rejected():
    """Validates rejection when floor intervals overlap."""
    overlapping = [
        FloorIntervalSpec(
            floor_id="FL00",
            floor_index=0,
            floor_name="F0",
            base_elevation=40.0,
            top_elevation=44.0,
        ),
        FloorIntervalSpec(
            floor_id="FL01",
            floor_index=1,
            floor_name="F1",
            base_elevation=43.0,  # Overlaps previous top (44.0)!
            top_elevation=47.0,
        ),
    ]
    req = BuildingFloors3DRequest(
        building_id="BLD-OVERLAP",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=40.0,
        floors=overlapping,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.INVALID
    assert any("overlap" in w.lower() for w in res.warnings)


def test_floor_generation_floors_outside_building_roof_rejected():
    """Validates rejection when floor intervals exceed declared building roof elevation."""
    exceeding = [
        FloorIntervalSpec(
            floor_id="FL00",
            floor_index=0,
            floor_name="F0",
            base_elevation=50.0,
            top_elevation=60.0,  # Exceeds roof 55.0m
        )
    ]
    req = BuildingFloors3DRequest(
        building_id="BLD-ROOF-EXCEED",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=50.0,
        roof_elevation=55.0,
        floors=exceeding,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.INVALID
    assert any("exceed" in w.lower() for w in res.warnings)


# --- 2. Geometry Contract & Watertightness Tests ---

def test_floor_solid_geometry_manifold_and_winding():
    """Validates each floor solid is a closed 2-manifold with CCW winding and valid volume."""
    req = BuildingFloors3DRequest(
        building_id="BLD-GEOM-TEST",
        parcel_id="PARCEL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=40.0,
        building_height=9.0,
        number_of_floors=3,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID

    for fl in res.floors:
        mesh = fl.geometry.parts[0]
        # 1. Non-empty vertices and faces
        assert len(mesh.vertices) >= 8
        assert len(mesh.faces) >= 12
        # 2. CCW winding
        assert mesh.winding == FaceWinding.COUNTER_CLOCKWISE
        # 3. Watertight audit
        audit = ExtrusionService.validate_mesh(mesh)
        assert audit.valid is True
        assert len(audit.errors) == 0
        # 4. Volume verification: V = area * height
        # Coordinate extent in UTM is ~10m x ~11m (~110m²), height=3m => V ~ 330 m³
        assert fl.volume_cubic_m > 50.0
        # Check Z bounds match floor elevation interval
        assert abs((mesh.bounds.max[2] - mesh.bounds.min[2]) - 3.0) < 0.05


def test_multipolygon_building_floors_generation():
    """Validates floor extrusion on a MultiPolygon building (e.g. two separate wings)."""
    wing1 = [
        [73.85600, 18.52000],
        [73.85610, 18.52000],
        [73.85610, 18.52010],
        [73.85600, 18.52010],
        [73.85600, 18.52000],
    ]
    wing2 = [
        [73.85620, 18.52000],
        [73.85630, 18.52000],
        [73.85630, 18.52010],
        [73.85620, 18.52010],
        [73.85620, 18.52000],
    ]
    multi_geojson = {
        "type": "MultiPolygon",
        "coordinates": [[wing1], [wing2]],
    }
    req = BuildingFloors3DRequest(
        building_id="BLD-MULTI-WING",
        parcel_id="PARCEL-001",
        footprint_geometry=multi_geojson,
        ground_elevation=50.0,
        building_height=6.0,
        number_of_floors=2,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 2
    # Each floor collection should contain 2 parts (one for each wing)
    for fl in res.floors:
        assert len(fl.geometry.parts) == 2
        for part in fl.geometry.parts:
            audit = ExtrusionService.validate_mesh(part)
            assert audit.valid is True


# --- 3. Property Volume Tests ---

def test_property_volume_single_floor():
    """Validates a property volume consisting of a single floor."""
    # First generate building floors
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-PROP-1",
        parcel_id="PARCEL-PROP-1",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=12.0,
        number_of_floors=4,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-UNIT-101",
        parcel_id="PARCEL-PROP-1",
        building_id="BLD-PROP-1",
        floor_ids=["BLD-PROP-1-FL00"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Unit 101 Ground Retail",
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    assert prop_res.base_elevation == 42.0
    assert prop_res.top_elevation == 45.0
    assert prop_res.total_height == 3.0
    assert prop_res.volume_cubic_m is not None
    assert prop_res.geometry is not None
    assert len(prop_res.geometry.parts) == 1
    assert prop_res.geometry.parts[0].feature_type == FeatureType.PROPERTY_VOLUME


def test_property_volume_multi_floor_duplex():
    """Validates a property volume consisting of multiple floors (e.g. duplex on FL02 and FL03)."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-PROP-DUP",
        parcel_id="PARCEL-DUP",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=40.0,
        building_height=12.0,
        number_of_floors=4,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-DUPLEX-301",
        parcel_id="PARCEL-DUP",
        building_id="BLD-PROP-DUP",
        floor_ids=["BLD-PROP-DUP-FL02", "BLD-PROP-DUP-FL03"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        unit_name="Penthouse Duplex Suite",
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    # FL02 is 46-49, FL03 is 49-52
    assert prop_res.base_elevation == 46.0
    assert prop_res.top_elevation == 52.0
    assert prop_res.total_height == 6.0
    assert len(prop_res.geometry.parts) == 2
    # Combined volume should equal sum of two floors
    expected_vol = bld_floors.floors[2].volume_cubic_m + bld_floors.floors[3].volume_cubic_m
    assert abs(prop_res.volume_cubic_m - expected_vol) < 0.01


def test_property_volume_invalid_parcel_mismatch():
    """Validates rejection when property parcel does not match building's associated parcel."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-PARCEL-CHECK",
        parcel_id="PARCEL-REAL-101",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=6.0,
        number_of_floors=2,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-MISMATCH",
        parcel_id="PARCEL-WRONG-999",  # Mismatch!
        building_id="BLD-PARCEL-CHECK",
        floor_ids=["BLD-PARCEL-CHECK-FL00"],
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.INVALID
    assert any("mismatch" in w.lower() for w in prop_res.warnings)


def test_property_volume_missing_building():
    """Validates UNAVAILABLE status when referenced parent building does not exist."""
    prop_req = PropertyVolumeRequest(
        property_id="PROP-NONEXISTENT",
        parcel_id="PARCEL-001",
        building_id="BLD-DOES-NOT-EXIST",
        floor_ids=["FL00"],
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, {})
    assert prop_res.geometry_status == Geometry3DStatus.UNAVAILABLE


# --- 4. API Endpoints Integration Tests ---

def test_api_generate_floors_3d():
    """Tests POST /api/v1/buildings/generate-floors-3d."""
    payload = {
        "buildings": [
            {
                "building_id": "BLD-API-TEST",
                "parcel_id": "PARCEL-API-001",
                "footprint_geometry": SQUARE_GEOJSON,
                "ground_elevation": 42.0,
                "building_height": 9.0,
                "number_of_floors": 3,
            }
        ]
    }
    response = client.post("/api/v1/buildings/generate-floors-3d", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] == 1
    assert data["summary"]["successful"] == 1
    b_res = data["results"][0]
    assert b_res["building_id"] == "BLD-API-TEST"
    assert b_res["floor_count"] == 3
    assert len(b_res["floors"]) == 3


def test_api_extrude_demo_floors():
    """Tests POST /api/v1/buildings/extrude-demo-floors."""
    response = client.post("/api/v1/buildings/extrude-demo-floors")
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] >= 2
    assert data["summary"]["successful"] >= 2

    # Check BLD-DEMO-001 has 4 floors
    bld1 = next(b for b in data["results"] if b["building_id"] == "BLD-DEMO-001")
    assert bld1["floor_count"] == 4
    assert bld1["geometry_status"] == "VALID"
    assert bld1["floors"][0]["floor_name"] == "Ground Floor"


def test_api_generate_property_volume_3d():
    """Tests POST /api/v1/properties/generate-volume-3d."""
    payload = {
        "properties": [
            {
                "property_id": "PROP-API-001",
                "parcel_id": "PARCEL-DEMO-101",
                "building_id": "BLD-DEMO-001",
                "floor_ids": ["BLD-DEMO-001-FL00"],
                "unit_name": "Demo Ground Retail Unit",
            }
        ]
    }
    response = client.post("/api/v1/properties/generate-volume-3d", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] == 1
    assert data["summary"]["successful"] == 1
    prop = data["results"][0]
    assert prop["property_id"] == "PROP-API-001"
    assert prop["geometry_status"] == "VALID"
    assert len(prop["geometry"]["parts"]) >= 1
    assert prop["geometry"]["parts"][0]["geometry_type"] == "SOLID"


def test_api_extrude_demo_properties():
    """Tests POST /api/v1/properties/extrude-demo-properties."""
    response = client.post("/api/v1/properties/extrude-demo-properties")
    assert response.status_code == 200
    data = response.json()
    assert data["schema_version"] == "1.0"
    assert data["summary"]["requested"] >= 3
    assert data["summary"]["successful"] >= 3

    # Check duplex suite
    dup = next(p for p in data["results"] if p["property_id"] == "PROP-DEMO-101-DUP")
    assert dup["geometry_status"] == "VALID"
    assert len(dup["floor_ids"]) == 2
    assert dup["total_height"] == 6.0


def test_api_get_demo_properties():
    """Tests GET /api/v1/properties/demo-properties."""
    response = client.get("/api/v1/properties/demo-properties")
    assert response.status_code == 200
    props = response.json()
    assert len(props) >= 4
    assert any(p["property_id"] == "PROP-DEMO-101-U01" for p in props)


# --- 5. Canonical Clarification & Semantic Rules Tests ---

def test_canonical_floor_footprint_assumed_warning():
    """Section 10: Verifies FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING is explicitly recorded."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-FOOTPRINT-WARN",
        parcel_id="PARCEL-FP-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=6.0,
        number_of_floors=2,
    )
    res = FloorVolumeService.generate_building_floors(bld_req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert any("FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING" in w for w in res.warnings)
    for fl in res.floors:
        assert any("FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING" in w for w in fl.warnings)


def test_canonical_property_volume_default_all_floors():
    """Section 2: Verifies empty floor_ids defaults to all validated floors of associated building."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-ALL-FLOORS",
        parcel_id="PARCEL-ALL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=12.0,
        number_of_floors=4,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-ALL-FLOORS",
        parcel_id="PARCEL-ALL-001",
        building_id="BLD-ALL-FLOORS",
        floor_ids=[],  # Empty floor_ids -> prototype default to all floors
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    assert len(prop_res.floor_ids) == 4
    assert len(prop_res.geometry.parts) == 4
    expected_vol = sum(f.volume_cubic_m for f in bld_floors.floors)
    assert abs(prop_res.volume_cubic_m - expected_vol) < 0.01


def test_canonical_multi_building_on_single_parcel():
    """Section 5: Verifies multiple independent buildings on one parcel produce separate parts without artificial connections."""
    # Building 1 (Main structure)
    bld1_req = BuildingFloors3DRequest(
        building_id="BLD-PARCEL-MAIN",
        parcel_id="PARCEL-MULTI-BLD",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=6.0,
        number_of_floors=2,
    )
    # Building 2 (Detached annex offset horizontally)
    annex_polygon = {
        "type": "Polygon",
        "coordinates": [
            [[73.8570, 18.5200], [73.8572, 18.5200], [73.8572, 18.5202], [73.8570, 18.5202], [73.8570, 18.5200]]
        ],
    }
    bld2_req = BuildingFloors3DRequest(
        building_id="BLD-PARCEL-ANNEX",
        parcel_id="PARCEL-MULTI-BLD",
        footprint_geometry=annex_polygon,
        ground_elevation=42.0,
        building_height=3.0,
        number_of_floors=1,
    )
    bld1_floors = FloorVolumeService.generate_building_floors(bld1_req)
    bld2_floors = FloorVolumeService.generate_building_floors(bld2_req)
    floors_map = {
        bld1_floors.building_id: bld1_floors,
        bld2_floors.building_id: bld2_floors,
    }

    prop_req = PropertyVolumeRequest(
        property_id="PROP-MULTI-BLD-ESTATE",
        parcel_id="PARCEL-MULTI-BLD",
        building_ids=["BLD-PARCEL-MAIN", "BLD-PARCEL-ANNEX"],
        floor_ids=[],  # All floors across both buildings
        unit_name="Full Estate (Main + Annex)",
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    # 2 floors from Main + 1 floor from Annex = 3 independent solid parts
    assert len(prop_res.geometry.parts) == 3
    # Verify each part is an independent solid
    for part in prop_res.geometry.parts:
        assert part.geometry_type == GeometryType.SOLID
        assert part.feature_type == FeatureType.PROPERTY_VOLUME
    # Total volume equals sum of all 3 floors
    expected_vol = sum(f.volume_cubic_m for f in bld1_floors.floors) + sum(f.volume_cubic_m for f in bld2_floors.floors)
    assert abs(prop_res.volume_cubic_m - expected_vol) < 0.01


def test_canonical_shared_horizontal_floor_boundary_no_double_count():
    """Section 8 & 15: Verifies shared horizontal slab boundary has zero volume (no double counting)."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-BOUNDARY-CHECK",
        parcel_id="PARCEL-BOUND-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        floors=[
            FloorIntervalSpec(floor_id="FL01", floor_index=0, floor_name="Floor 1", base_elevation=42.0, top_elevation=45.0),
            FloorIntervalSpec(floor_id="FL02", floor_index=1, floor_name="Floor 2", base_elevation=45.0, top_elevation=48.0),
        ],
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-NO-DOUBLE-COUNT",
        parcel_id="PARCEL-BOUND-001",
        building_id="BLD-BOUNDARY-CHECK",
        floor_ids=["FL01", "FL02"],
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    v1 = bld_floors.floors[0].volume_cubic_m
    v2 = bld_floors.floors[1].volume_cubic_m
    # Mathematical property volume must equal exact sum within 0.001 m3
    assert abs(prop_res.volume_cubic_m - (v1 + v2)) < 0.001


def test_canonical_derived_spatial_extent_disclaimer():
    """Section 12: Verifies warnings contain DERIVED_SPATIAL_EXTENT neutral terminology."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-LEGAL-CHECK",
        parcel_id="PARCEL-LEGAL-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=3.0,
        number_of_floors=1,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-LEGAL-CHECK",
        parcel_id="PARCEL-LEGAL-001",
        building_id="BLD-LEGAL-CHECK",
        floor_ids=["BLD-LEGAL-CHECK-FL00"],
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.VALID
    assert any("DERIVED_SPATIAL_EXTENT" in w for w in prop_res.warnings)


def test_canonical_duplicate_component_rejected():
    """Section 13: Verifies duplicate floor component IDs in request are rejected with DUPLICATE_COMPONENT."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-DUP-CHECK",
        parcel_id="PARCEL-DUP-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=6.0,
        number_of_floors=2,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-DUP-ERR",
        parcel_id="PARCEL-DUP-001",
        building_id="BLD-DUP-CHECK",
        floor_ids=["BLD-DUP-CHECK-FL00", "BLD-DUP-CHECK-FL00"],  # Duplicate component
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.INVALID
    assert any("DUPLICATE_COMPONENT" in w for w in prop_res.warnings)


def test_canonical_incomplete_components_returns_unavailable():
    """Section 3: Verifies missing floor component yields UNAVAILABLE and PROPERTY_VOLUME_INCOMPLETE_COMPONENTS."""
    bld_req = BuildingFloors3DRequest(
        building_id="BLD-INC-CHECK",
        parcel_id="PARCEL-INC-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=42.0,
        building_height=6.0,
        number_of_floors=2,
    )
    bld_floors = FloorVolumeService.generate_building_floors(bld_req)
    floors_map = {bld_floors.building_id: bld_floors}

    prop_req = PropertyVolumeRequest(
        property_id="PROP-INC-ERR",
        parcel_id="PARCEL-INC-001",
        building_id="BLD-INC-CHECK",
        floor_ids=["BLD-INC-CHECK-FL00", "NON-EXISTENT-FL99"],  # Missing component
    )
    prop_res = FloorVolumeService.generate_property_volume(prop_req, floors_map)
    assert prop_res.geometry_status == Geometry3DStatus.UNAVAILABLE
    assert any("PROPERTY_VOLUME_INCOMPLETE_COMPONENTS" in w for w in prop_res.warnings)


