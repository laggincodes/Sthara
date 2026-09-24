import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.quality_service import QualityService
from app.schemas.osm_converter import BuildingMetadataItem

client = TestClient(app)


class TestProvenanceQuality:
    """Automated tests for Step 8: Data Quality + Provenance Intelligence."""

    def test_01_valid_building_geometry_evaluates_valid(self):
        """Building with verified source height, watertight mesh, and valid geometry is VALID."""
        bld = {
            "building_id": "BLD-EXPLICIT-01",
            "validation_status": "PASS",
            "watertight": True,
            "topology_status": "PASS",
            "height_source": "TAG_HEIGHT",
            "levels": 4,
            "parcel_id": "PARCEL-DELHI-001",
            "source": "OpenStreetMap",
        }
        status, prov, gates = QualityService.evaluate_building_quality(bld)
        assert status == "VALID"
        assert gates["geometry"] == "PASS"
        assert gates["topology"] == "PASS"
        assert gates["containment"] == "PASS"
        assert gates["source_data"] == "PASS"
        assert prov["height_source"] == "Source-derived"
        assert prov["floor_source"] == "Source-derived"
        assert prov["is_government_record"] is False

    def test_02_default_source_height_evaluates_warning(self):
        """Building where source height was missing and default height was used evaluates to WARNING."""
        bld = {
            "building_id": "BLD-DEFAULT-01",
            "validation_status": "PASS",
            "watertight": True,
            "topology_status": "PASS",
            "height_source": "DEFAULT_CONFIG",
            "levels": 3,
            "source": "OpenStreetMap",
        }
        status, prov, gates = QualityService.evaluate_building_quality(bld)
        assert status == "WARNING"
        assert gates["source_data"] == "WARNING"
        assert prov["height_source"] == "Default (Inferred)"

    def test_03_invalid_geometry_evaluates_invalid(self):
        """Building with failed validation status or broken mesh evaluates to INVALID."""
        bld = {
            "building_id": "BLD-BROKEN-01",
            "validation_status": "FAIL",
            "watertight": False,
            "topology_status": "FAIL",
        }
        status, prov, gates = QualityService.evaluate_building_quality(bld)
        assert status == "INVALID"
        assert gates["geometry"] == "FAIL"
        assert gates["topology"] == "FAIL"

    def test_04_missing_optional_metadata_evaluates_incomplete(self):
        """Building with unregistered parcel or unknown levels evaluates to INCOMPLETE."""
        bld = {
            "building_id": "BLD-UNREGISTERED-01",
            "validation_status": "PASS",
            "watertight": True,
            "topology_status": "PASS",
            "height_source": "OSM_EXPLICIT",
            "levels": None,  # Missing levels
            "parcel_id": "PARCEL-UNREGISTERED",
        }
        status, prov, gates = QualityService.evaluate_building_quality(bld)
        assert status == "INCOMPLETE"

    def test_05_floor_quality_and_provenance(self):
        """Floor without floor plan is INCOMPLETE; with floor plan is VALID."""
        floor_no_plan = {
            "floor_id": "FL01",
            "height": 3.0,
            "geometry_status": "VALID",
        }
        status_np, prov_np, gates_np = QualityService.evaluate_floor_quality(floor_no_plan, has_floor_plan=False)
        assert status_np == "INCOMPLETE"
        assert prov_np["floor_plan_source"] == "None attached"

        status_wp, prov_wp, gates_wp = QualityService.evaluate_floor_quality(floor_no_plan, has_floor_plan=True)
        assert status_wp == "VALID"
        assert prov_wp["floor_plan_source"] == "User-provided floor plan"

    def test_06_configured_unit_provenance_and_spatial_id(self):
        """Configured unit includes correct provenance, non-government spatial ID disclaimer."""
        unit = {
            "unit_id": "U101",
            "floor_id": "FL01",
            "building_id": "BLD01",
            "source": "Configured / Derived",
            "source_type": "DERIVED",
            "geometry_status": "PASS",
            "geometry_2d": {"type": "Polygon", "coordinates": [[[0,0], [1,0], [1,1], [0,1], [0,0]]]},
        }
        status, prov, gates = QualityService.evaluate_unit_quality(unit, has_floor_plan=True)
        assert status == "VALID"
        assert prov["source"] == "Configured / Derived"
        assert prov["floor_plan_source"] == "User-provided floor plan"
        assert prov["geometry_source"] == "Floor Plan Subdivision"
        assert prov["spatial_id_type"] == "STHARA Prototype Spatial ID"
        assert prov["is_government_record"] is False
        assert "ownership or title" in prov["disclaimer"]

    def test_07_unit_failed_containment_is_invalid(self):
        """Unit failing containment gate evaluates to INVALID."""
        unit = {
            "unit_id": "U102",
            "floor_id": "FL01",
            "geometry_status": "PASS",
            "geometry_2d": {"type": "Polygon", "coordinates": [[[0,0], [1,0], [1,1], [0,1], [0,0]]]},
        }
        status, prov, gates = QualityService.evaluate_unit_quality(unit, containment_passed=False)
        assert status == "INVALID"
        assert gates["containment"] == "FAIL"

    def test_08_building_metadata_item_schema_compliance(self):
        """BuildingMetadataItem outputs provenance, data_quality_status, and disclaimer."""
        item = BuildingMetadataItem(
            building_id="BLD-001",
            height=12.0,
            height_source="TAG_HEIGHT",
            area_sqm=120.0,
            volume_cubic_m=1440.0,
            data_quality_status="VALID",
            provenance={"source": "OpenStreetMap", "height_source": "Source-derived"},
        )
        data = item.model_dump()
        assert data["data_quality_status"] == "VALID"
        assert data["provenance"]["source"] == "OpenStreetMap"
        assert "not an official government" in data["disclaimer"]

    def test_09_quality_api_evaluate_endpoint(self):
        """Tests the POST /api/v1/quality/evaluate endpoint."""
        payload = {
            "dataset_id": "TEST_DS",
            "object_id": "BLD-01",
            "object_type": "building",
            "attributes": {
                "height_source": "DEFAULT_CONFIG",
                "validation_status": "PASS",
                "watertight": True,
                "topology_status": "PASS",
            },
        }
        res = client.post("/api/v1/quality/evaluate", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["data_quality_status"] == "WARNING"
        assert body["validation_gates"]["source_data"] == "WARNING"
        assert "not an official government" in body["disclaimer"]
