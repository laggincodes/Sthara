"""
Comprehensive Unit & Integration Test Suite for the Unified Topology & Spatial Conflict Engine.

Conforms to SIH PPT 06 TOPOLOGY:
- Overlap Check
- Containment
- Duplicates
Across full hierarchy: PARCEL -> BUILDING -> FLOOR -> UNIT -> PROPERTY_VOLUME -> UNDERGROUND
"""

import copy
import pytest
from fastapi.testclient import TestClient
from shapely.geometry import Polygon, mapping

from app.main import app
from app.schemas.topology import (
    TopologyStatus,
    TopologySeverity,
    TopologyCheckType,
    TopologyConflictType,
    EntityType,
    TopologyTolerances,
    TopologyValidationRequest,
)
from app.schemas.geometry_3d import Mesh3D
from app.services.topology_service import TopologyService

client = TestClient(app)


# -----------------------------------------------------------------------------
# 1. 2D Containment Tests
# -----------------------------------------------------------------------------
def test_containment_2d_strictly_within():
    parent_geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    }
    child_geom = {
        "type": "Polygon",
        "coordinates": [[[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]],
    }
    tolerances = TopologyTolerances()

    rec, conf = TopologyService.check_containment_2d(
        child_id="B-01",
        child_geom=child_geom,
        parent_id="P-01",
        parent_geom=parent_geom,
        child_type=EntityType.BUILDING,
        parent_type=EntityType.PARCEL,
        tolerances=tolerances,
    )

    assert rec.status == TopologyStatus.VALID
    assert conf is None
    assert "completely contained" in rec.message


def test_containment_2d_partial_encroachment():
    parent_geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    }
    # Encroaches by 2 units along X
    child_geom = {
        "type": "Polygon",
        "coordinates": [[[5, 2], [12, 2], [12, 8], [5, 8], [5, 2]]],
    }
    tolerances = TopologyTolerances()

    rec, conf = TopologyService.check_containment_2d(
        child_id="UNIT-101",
        child_geom=child_geom,
        parent_id="BLD-01",
        parent_geom=parent_geom,
        child_type=EntityType.UNIT,
        parent_type=EntityType.BUILDING,
        tolerances=tolerances,
    )

    assert rec.status == TopologyStatus.CONFLICT
    assert conf is not None
    assert conf.conflict_type == TopologyConflictType.PARTIAL_CONTAINMENT
    assert conf.severity == TopologySeverity.ERROR
    assert conf.overlap_metric == pytest.approx(12.0, rel=1e-2)  # (12-10) * 6 = 12


def test_containment_2d_completely_outside():
    parent_geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    }
    child_geom = {
        "type": "Polygon",
        "coordinates": [[[20, 20], [25, 20], [25, 25], [20, 25], [20, 20]]],
    }
    tolerances = TopologyTolerances()

    rec, conf = TopologyService.check_containment_2d(
        child_id="BLD-02",
        child_geom=child_geom,
        parent_id="P-01",
        parent_geom=parent_geom,
        child_type=EntityType.BUILDING,
        parent_type=EntityType.PARCEL,
        tolerances=tolerances,
    )

    assert rec.status == TopologyStatus.CONFLICT
    assert conf is not None
    assert conf.conflict_type == TopologyConflictType.OUTSIDE_PARENT
    assert "lies completely outside" in conf.description


def test_containment_2d_sliver_within_tolerance():
    parent_geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    }
    # Microscopic boundary overshoot 0.00001 m^2
    child_geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [10.0001, 0], [10.0001, 0.0001], [0, 0.0001], [0, 0]]],
    }
    tolerances = TopologyTolerances(area_tolerance_sqm=0.001)

    rec, conf = TopologyService.check_containment_2d(
        child_id="B-SLIVER",
        child_geom=child_geom,
        parent_id="P-01",
        parent_geom=parent_geom,
        child_type=EntityType.BUILDING,
        parent_type=EntityType.PARCEL,
        tolerances=tolerances,
    )

    assert rec.status == TopologyStatus.VALID
    assert conf is None


# -----------------------------------------------------------------------------
# 2. 2D Sibling Overlap Tests
# -----------------------------------------------------------------------------
def test_sibling_overlap_touching_party_wall_is_valid():
    # Two units sharing boundary along X = 5
    u1 = {
        "id": "U-1",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        },
    }
    u2 = {
        "id": "U-2",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[5, 0], [10, 0], [10, 5], [5, 5], [5, 0]]],
        },
    }
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_overlaps_2d([u1, u2], EntityType.UNIT, tolerances)
    assert len(conflicts) == 0
    assert len(checks) == 1
    assert checks[0].status == TopologyStatus.VALID
    assert "party-wall" in checks[0].message


def test_sibling_overlap_positive_area_is_conflict():
    # Two units overlapping by 2 x 5 = 10 m^2
    u1 = {
        "id": "U-1",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [6, 0], [6, 5], [0, 5], [0, 0]]],
        },
    }
    u2 = {
        "id": "U-2",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[4, 0], [10, 0], [10, 5], [4, 5], [4, 0]]],
        },
    }
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_overlaps_2d([u1, u2], EntityType.UNIT, tolerances)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == TopologyConflictType.POSITIVE_AREA_OVERLAP
    assert conflicts[0].severity == TopologySeverity.ERROR
    assert conflicts[0].overlap_metric == pytest.approx(10.0, rel=1e-2)
    assert checks[0].status == TopologyStatus.CONFLICT


# -----------------------------------------------------------------------------
# 3. Sibling Duplicate Checks
# -----------------------------------------------------------------------------
def test_duplicate_id_detection():
    # Same ID duplicated twice with identical geometry
    geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    ents = [
        {"id": "PARCEL-101", "geometry": geom},
        {"id": "PARCEL-101", "geometry": geom},
    ]
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_duplicates(ents, EntityType.PARCEL, tolerances)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == TopologyConflictType.DUPLICATE_ID
    assert conflicts[0].primary_entity_id == "PARCEL-101"


def test_duplicate_geometry_distinct_ids():
    # Two distinct parcels with identical coordinates
    geom = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    ents = [
        {"id": "P-AAA", "geometry": geom},
        {"id": "P-BBB", "geometry": geom},
    ]
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_duplicates(ents, EntityType.PARCEL, tolerances)
    assert any(c.conflict_type == TopologyConflictType.DUPLICATE_GEOMETRY for c in conflicts)


# -----------------------------------------------------------------------------
# 4. Vertical Interval Tests
# -----------------------------------------------------------------------------
def test_vertical_interval_valid():
    rec, conf = TopologyService.check_vertical_intervals(
        child_id="FL-01",
        child_base=560.0,
        child_top=563.0,
        parent_id="BLD-01",
        parent_base=560.0,
        parent_top=590.0,
        child_type=EntityType.FLOOR,
        parent_type=EntityType.BUILDING,
        tolerances=TopologyTolerances(),
    )
    assert rec.status == TopologyStatus.VALID
    assert conf is None


def test_vertical_interval_inverted():
    rec, conf = TopologyService.check_vertical_intervals(
        child_id="FL-BAD",
        child_base=565.0,
        child_top=560.0,  # Top < Base!
        parent_id=None,
        parent_base=None,
        parent_top=None,
        child_type=EntityType.FLOOR,
        parent_type=None,
        tolerances=TopologyTolerances(),
    )
    assert rec.status == TopologyStatus.CONFLICT
    assert conf is not None
    assert conf.conflict_type == TopologyConflictType.VERTICAL_OVERLAP


def test_vertical_interval_outside_parent():
    rec, conf = TopologyService.check_vertical_intervals(
        child_id="UNIT-TOP",
        child_base=562.0,
        child_top=566.0,  # Floor ceiling is 565.0
        parent_id="FL-01",
        parent_base=562.0,
        parent_top=565.0,
        child_type=EntityType.UNIT,
        parent_type=EntityType.FLOOR,
        tolerances=TopologyTolerances(),
    )
    assert rec.status == TopologyStatus.CONFLICT
    assert conf is not None
    assert conf.conflict_type == TopologyConflictType.VERTICAL_OUTSIDE_PARENT
    assert conf.overlap_metric == pytest.approx(1.0, rel=1e-2)


# -----------------------------------------------------------------------------
# 5. Canonical 3D Mesh Integrity Tests
# -----------------------------------------------------------------------------
from app.schemas.geometry_3d import Mesh3D, CoordinateReference, Bounds3D

def test_mesh_3d_integrity_valid_prism():
    # Simple valid triangular prism solid (6 vertices, 8 triangular faces, watertight)
    v = [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
        [1.0, 0.0, 1.0],
        [0.0, 1.0, 1.0],
    ]
    f = [
        [0, 2, 1],        # bottom face
        [3, 4, 5],        # top face
        [0, 1, 4], [0, 4, 3],  # side 1
        [1, 2, 5], [1, 5, 4],  # side 2
        [2, 0, 3], [2, 3, 5],  # side 3
    ]
    coord_ref = CoordinateReference(
        horizontal_crs="EPSG:32643",
        viewer_origin=[0.0, 0.0, 0.0],
    )
    bounds = Bounds3D(min=[0.0, 0.0, 0.0], max=[1.0, 1.0, 1.0])
    mesh = Mesh3D(
        feature_id="VOL-01",
        vertices=v,
        faces=f,
        bounds=bounds,
        coordinate_reference=coord_ref,
        volume_cubic_m=0.5,
    )
    rec, conf = TopologyService.check_mesh_3d(mesh, "VOL-01", EntityType.PROPERTY_VOLUME)
    assert rec.status == TopologyStatus.VALID
    assert conf is None


def test_mesh_3d_integrity_open_mesh():
    # Mesh with missing face (open, non-watertight)
    v = [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
    ]
    f = [
        [0, 1, 2],
        [0, 2, 3],
        # Missing remaining 2 faces to close the tetrahedron
    ]
    coord_ref = CoordinateReference(
        horizontal_crs="EPSG:32643",
        viewer_origin=[0.0, 0.0, 0.0],
    )
    bounds = Bounds3D(min=[0.0, 0.0, 0.0], max=[1.0, 1.0, 1.0])
    mesh = Mesh3D(
        feature_id="VOL-OPEN",
        vertices=v,
        faces=f,
        bounds=bounds,
        coordinate_reference=coord_ref,
        volume_cubic_m=0.1,
    )
    rec, conf = TopologyService.check_mesh_3d(mesh, "VOL-OPEN", EntityType.PROPERTY_VOLUME)
    assert rec.status == TopologyStatus.CONFLICT
    assert conf is not None
    assert conf.conflict_type == TopologyConflictType.INVALID_MESH


# -----------------------------------------------------------------------------
# 6. Underground Topology & Clashes
# -----------------------------------------------------------------------------
def test_underground_permitted_utility_penetration():
    # Basement and Utility intersecting in 3D is permitted penetration
    box = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    feats = [
        {
            "id": "BASE-01",
            "geometry": box,
            "base_elevation": 550.0,
            "top_elevation": 555.0,
            "raw": {"feature_type": "BASEMENT", "parcel_id": "P-01"},
        },
        {
            "id": "UTIL-01",
            "geometry": box,
            "base_elevation": 552.0,
            "top_elevation": 553.0,
            "raw": {"feature_type": "UNDERGROUND_UTILITY", "parcel_id": "P-01"},
        },
    ]
    parcels = [{"id": "P-01", "geometry": box}]
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_underground_features(feats, parcels, tolerances)
    # Utility penetration is permitted -> not a critical clash conflict!
    clash_confs = [c for c in conflicts if c.conflict_type == TopologyConflictType.POSITIVE_VOLUME_OVERLAP]
    assert len(clash_confs) == 0


def test_underground_critical_collision():
    # Two non-utility features colliding in 3D
    box = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
    }
    feats = [
        {
            "id": "TUNNEL-A",
            "geometry": box,
            "base_elevation": 550.0,
            "top_elevation": 555.0,
            "raw": {"feature_type": "SUBWAY_TUNNEL", "parcel_id": "P-01"},
        },
        {
            "id": "BASE-B",
            "geometry": box,
            "base_elevation": 552.0,
            "top_elevation": 557.0,
            "raw": {"feature_type": "BASEMENT", "parcel_id": "P-01"},
        },
    ]
    parcels = [{"id": "P-01", "geometry": box}]
    tolerances = TopologyTolerances()

    checks, conflicts = TopologyService.check_underground_features(feats, parcels, tolerances)
    clash_confs = [c for c in conflicts if c.conflict_type == TopologyConflictType.POSITIVE_VOLUME_OVERLAP]
    assert len(clash_confs) == 1
    assert clash_confs[0].severity == TopologySeverity.ERROR


# -----------------------------------------------------------------------------
# 7. Hierarchy Reference Integrity
# -----------------------------------------------------------------------------
def test_hierarchy_broken_reference():
    parcels = [{"id": "P-REAL"}]
    buildings = [{"id": "B-01", "raw": {"parcel_id": "P-GHOST"}}]
    floors = [{"id": "FL-01", "raw": {"building_id": "B-01"}}]
    units = [{"id": "U-01", "raw": {"floor_id": "FL-GHOST", "building_id": "B-01"}}]

    checks, conflicts = TopologyService.check_hierarchy_integrity(parcels, buildings, floors, units)
    assert any(c.conflict_type == TopologyConflictType.MISSING_REFERENCE and c.primary_entity_id == "B-01" for c in conflicts)
    assert any(c.conflict_type == TopologyConflictType.MISSING_REFERENCE and c.primary_entity_id == "U-01" for c in conflicts)


# -----------------------------------------------------------------------------
# 8. Deterministic Output Ordering
# -----------------------------------------------------------------------------
def test_topology_audit_determinism():
    demo = TopologyService.get_demo_topology_bundle()
    res1 = demo.validation_result

    # Run multiple times
    req = TopologyValidationRequest(
        parcels=demo.entities["parcels"],
        buildings=demo.entities["buildings"],
        floors=demo.entities["floors"],
        units=demo.entities["units"],
        underground_features=demo.entities["underground_features"],
    )
    res2 = TopologyService.validate_full_topology(req)

    # Check IDs and counts are identically ordered
    check_ids_1 = [c.check_id for c in res1.checks]
    check_ids_2 = [c.check_id for c in res2.checks]
    assert check_ids_1 == check_ids_2

    conf_ids_1 = [f.conflict_id for f in res1.conflicts]
    conf_ids_2 = [f.conflict_id for f in res2.conflicts]
    assert conf_ids_1 == conf_ids_2


# -----------------------------------------------------------------------------
# 9. REST API Endpoints Integration
# -----------------------------------------------------------------------------
def test_api_topology_demo_endpoint():
    res = client.get("/api/v1/topology/demo")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "validation_result" in data
    assert data["validation_result"]["summary"]["total_checks"] > 0
    assert len(data["validation_result"]["conflicts"]) > 0


def test_api_topology_validate_endpoint():
    demo = TopologyService.get_demo_topology_bundle()
    payload = {
        "parcels": demo.entities["parcels"],
        "buildings": demo.entities["buildings"],
        "floors": demo.entities["floors"],
        "units": demo.entities["units"],
        "underground_features": demo.entities["underground_features"],
    }
    res = client.post("/api/v1/topology/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["summary"]["total_checks"] == demo.validation_result.summary.total_checks
    assert data["summary"]["overall_status"] == demo.validation_result.summary.overall_status
