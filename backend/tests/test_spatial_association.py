import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.spatial_relationship_service import SpatialRelationshipService
from app.services.building_validator import BuildingValidator
from app.schemas.cadastre import BuildingAssociationStatus

client = TestClient(app)

# Helper fixtures
PARCEL_A = {
    "type": "Feature",
    "id": "P-101",
    "properties": {"parcel_id": "P-101"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [[73.85600, 18.52000], [73.85630, 18.52000], [73.85630, 18.52020], [73.85600, 18.52020], [73.85600, 18.52000]]
        ]
    }
}

PARCEL_B = {
    "type": "Feature",
    "id": "P-102",
    "properties": {"parcel_id": "P-102"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [[73.85630, 18.52000], [73.85660, 18.52000], [73.85660, 18.52020], [73.85630, 18.52020], [73.85630, 18.52000]]
        ]
    }
}


def make_collection(features):
    return {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:4326"}},
        "features": features,
    }


def test_building_fully_inside_parcel():
    bld_inside = {
        "type": "Feature",
        "id": "B-01",
        "properties": {"building_id": "B-01"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[73.85605, 18.52005], [73.85620, 18.52005], [73.85620, 18.52015], [73.85605, 18.52015], [73.85605, 18.52005]]
            ]
        }
    }
    parcels = make_collection([PARCEL_A])
    buildings = make_collection([bld_inside])

    res = SpatialRelationshipService.analyze_associations(parcels, buildings)
    assert res.summary.total_buildings == 1
    assert res.summary.associated_buildings == 1
    assert res.summary.outside_buildings == 0
    b = res.associations[0]
    assert b.building_id == "B-01"
    assert b.associated_parcel_id == "P-101"
    assert b.association_status == BuildingAssociationStatus.WITHIN
    assert b.overlap_percentage >= 99.9
    assert b.building_area_sqm > 0


def test_building_outside_parcel():
    bld_outside = {
        "type": "Feature",
        "id": "B-OUT",
        "properties": {"building_id": "B-OUT"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[73.85700, 18.52100], [73.85720, 18.52100], [73.85720, 18.52120], [73.85700, 18.52120], [73.85700, 18.52100]]
            ]
        }
    }
    parcels = make_collection([PARCEL_A])
    buildings = make_collection([bld_outside])

    res = SpatialRelationshipService.analyze_associations(parcels, buildings)
    assert res.summary.associated_buildings == 0
    assert res.summary.outside_buildings == 1
    b = res.associations[0]
    assert b.association_status == BuildingAssociationStatus.OUTSIDE
    assert b.associated_parcel_id is None
    assert b.overlap_percentage == 0.0


def test_building_crossing_parcel_boundary():
    # Boundary of PARCEL_A is at lon 73.85630 and lat 18.52020.
    # Building starts inside at lon 73.85620 and extends outside to 73.85635 at lat 18.52030
    bld_cross = {
        "type": "Feature",
        "id": "B-CROSS",
        "properties": {"building_id": "B-CROSS"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[73.85620, 18.52010], [73.85628, 18.52010], [73.85628, 18.52030], [73.85620, 18.52030], [73.85620, 18.52010]]
            ]
        }
    }
    parcels = make_collection([PARCEL_A])
    buildings = make_collection([bld_cross])

    res = SpatialRelationshipService.analyze_associations(parcels, buildings)
    b = res.associations[0]
    assert b.association_status == BuildingAssociationStatus.INTERSECTS
    assert b.associated_parcel_id == "P-101"
    assert 0 < b.overlap_percentage < 100


def test_building_overlapping_two_parcels():
    # Straddles boundary between PARCEL_A (lon <= 73.85630) and PARCEL_B (lon >= 73.85630)
    # Span lon 73.85625 to 73.85640 (0.00005 in A, 0.00010 in B -> B has larger overlap)
    bld_straddle = {
        "type": "Feature",
        "id": "B-MULTI",
        "properties": {"building_id": "B-MULTI"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[73.85625, 18.52005], [73.85640, 18.52005], [73.85640, 18.52015], [73.85625, 18.52015], [73.85625, 18.52005]]
            ]
        }
    }
    parcels = make_collection([PARCEL_A, PARCEL_B])
    buildings = make_collection([bld_straddle])

    res = SpatialRelationshipService.analyze_associations(parcels, buildings)
    assert res.summary.multi_parcel_buildings == 1
    b = res.associations[0]
    assert b.association_status == BuildingAssociationStatus.MULTI_PARCEL
    assert b.associated_parcel_id == "P-102"  # Parcel B has larger area
    assert len(b.overlaps) == 2


def test_invalid_building_geometry():
    # Bowtie / self-intersecting polygon
    bld_invalid = {
        "type": "Feature",
        "id": "B-INV",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]
            ]
        }
    }
    val = BuildingValidator.validate_buildings(make_collection([bld_invalid]))
    assert not val.valid
    assert any(e.issue_type == "TOPOLOGICAL_INVALIDITY" for e in val.errors)


def test_empty_collection():
    parcels = make_collection([])
    buildings = make_collection([])
    with pytest.raises(ValueError, match="0 features|empty"):
        SpatialRelationshipService.analyze_associations(parcels, buildings)


def test_unsupported_geometry():
    point_bld = {
        "type": "Feature",
        "id": "B-PT",
        "geometry": {"type": "Point", "coordinates": [73.856, 18.520]}
    }
    val = BuildingValidator.validate_buildings(make_collection([point_bld]))
    assert not val.valid
    assert any(e.issue_type == "UNSUPPORTED_GEOMETRY_TYPE" for e in val.errors)


def test_crs_handling_and_reprojection():
    # When coordinates are geographic EPSG:4326, service auto-picks metric UTM
    bld_inside = {
        "type": "Feature",
        "id": "B-UTM",
        "properties": {"building_id": "B-UTM"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[73.85605, 18.52005], [73.85620, 18.52005], [73.85620, 18.52015], [73.85605, 18.52015], [73.85605, 18.52005]]
            ]
        }
    }
    parcels = make_collection([PARCEL_A])
    buildings = make_collection([bld_inside])
    res = SpatialRelationshipService.analyze_associations(parcels, buildings)
    assert res.summary.projected_crs == "EPSG:32643"
    # Metric area should be positive realistic meter measurement (> 100 sqm, not tiny degree fractions)
    assert res.associations[0].building_area_sqm > 50.0


def test_api_associate_buildings_endpoint_success():
    with open("../data/processed/demo_parcels.geojson", "r", encoding="utf-8-sig") as f:
        demo_parcels = json.load(f)
    with open("../data/processed/demo_buildings.geojson", "r", encoding="utf-8-sig") as f:
        demo_buildings = json.load(f)

    response = client.post(
        "/api/v1/spatial/associate-buildings",
        json={"parcels": demo_parcels, "buildings": demo_buildings},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["summary"]["total_parcels"] == 3
    assert data["data"]["summary"]["total_buildings"] == 4
    assert data["data"]["summary"]["associated_buildings"] == 3
    assert data["data"]["summary"]["outside_buildings"] == 1


def test_api_associate_buildings_endpoint_invalid_geometry():
    # Pass bad building geometry
    bad_buildings = make_collection([
        {
            "type": "Feature",
            "id": "BAD",
            "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]]}
        }
    ])
    with open("../data/processed/demo_parcels.geojson", "r", encoding="utf-8-sig") as f:
        demo_parcels = json.load(f)

    response = client.post(
        "/api/v1/spatial/associate-buildings",
        json={"parcels": demo_parcels, "buildings": bad_buildings},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["status"] == "error"
    assert data["error_code"] == "SPATIAL_ASSOCIATION_VALIDATION_FAILED"


def test_api_get_demo_buildings():
    response = client.get("/api/v1/datasets/demo_buildings")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["dataset_id"] == "demo_buildings"
    assert len(data["data"]["raw_geojson"]["features"]) == 4
