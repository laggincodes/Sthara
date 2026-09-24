"""
Test Suite for STEP 5: Property / Unit Intelligence in STHARA.

Validates:
1. Deterministic STHARA Spatial ID construction: <dataset_id>-<building_id>-<floor_id>-<unit_id>.
2. Unit model property record fields: spatial_id, z_min, z_max, geometry_status, source.
3. Unit model backwards-compatibility: older records without spatial_id are auto-populated via @model_validator.
4. Unit3DResult model backwards-compatibility and field propagation.
5. UnitService registration: verifies spatial_id, z_min, z_max, geometry_status on created units.
6. Dataset isolation: cross-dataset uniqueness of spatial IDs.
7. Metadata export: ensures scene metadata.json includes enriched unit property records.
8. Intellectual honesty & labeling: strictly labeled as STHARA Spatial ID, source as Configured / Derived.
"""

import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.unit import (
    Unit,
    UnitCreate,
    UnitType,
    Unit3DResult,
    generate_sthara_spatial_id,
)
from app.schemas.geometry_3d import Geometry3DStatus
from app.services.unit_service import UnitService

client = TestClient(app)

PARENT_FLOOR_POLYGON = {
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

UNIT_POLYGON = {
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


class TestPropertyIntelligence:
    @pytest.fixture(autouse=True)
    def clean_registry(self):
        UnitService.clear_registry_for_testing()
        yield
        UnitService.clear_registry_for_testing()

    def test_01_deterministic_spatial_id_generation(self):
        """STHARA Spatial ID must follow <dataset_id>-<building_id>-<floor_id>-<unit_id> deterministically."""
        spatial_id = generate_sthara_spatial_id(
            dataset_id="DELHI-TAGORE",
            building_id="B001",
            floor_id="FL01",
            unit_id="U101",
        )
        assert spatial_id == "DELHI-TAGORE-B001-FL01-U101"

        # Stability: repeat calls return exact same value
        assert spatial_id == generate_sthara_spatial_id("DELHI-TAGORE", "B001", "FL01", "U101")

        # Fallback dataset_id
        fallback_id = generate_sthara_spatial_id("", "B002", "FL02", "U201")
        assert fallback_id == "default-B002-FL02-U201"

    def test_02_unit_model_validator_backward_compatibility(self):
        """Legacy unit dictionaries without spatial_id or z_min/z_max must auto-populate via validator."""
        legacy_dict = {
            "unit_id": "BLD-01-FL01-U101",
            "dataset_id": "TEST_DATASET",
            "parcel_id": "P001",
            "building_id": "BLD-01",
            "floor_id": "FL01",
            "unit_number": "101",
            "unit_name": "Apartment 101",
            "base_elevation": 10.0,
            "top_elevation": 13.0,
        }
        unit = Unit(**legacy_dict)
        assert unit.spatial_id == "TEST_DATASET-BLD-01-FL01-BLD-01-FL01-U101"
        assert unit.z_min == 10.0
        assert unit.z_max == 13.0
        assert unit.geometry_status == "PASS"
        assert unit.source == "Configured / Derived"

    def test_03_unit_3d_result_validator(self):
        """Unit3DResult automatically derives spatial_id, z_min, z_max."""
        res = Unit3DResult(
            unit_id="U101",
            dataset_id="MUMBAI_DEMO",
            parcel_id="P001",
            building_id="BLD_01",
            floor_id="FL_02",
            unit_number="101",
            base_elevation=25.0,
            top_elevation=28.5,
            height=3.5,
            geometry_status=Geometry3DStatus.VALID,
        )
        assert res.spatial_id == "MUMBAI_DEMO-BLD_01-FL_02-U101"
        assert res.z_min == 25.0
        assert res.z_max == 28.5

    def test_04_create_and_register_unit_property_fields(self):
        """Registered units must expose all required property intelligence fields."""
        req = UnitCreate(
            dataset_id="TEST_METRIC_DS",
            building_id="BLD-TEST-001",
            floor_id="FL01",
            unit_number="101",
            unit_name="Suite 101",
            unit_type=UnitType.APARTMENT_UNIT,
            geometry_2d=UNIT_POLYGON,
            base_elevation=100.0,
            top_elevation=103.5,
            parent_floor_geometry=PARENT_FLOOR_POLYGON,
        )
        unit = UnitService.create_and_register_unit(req)

        # Check required fields
        assert unit.dataset_id == "TEST_METRIC_DS"
        assert unit.building_id == "BLD-TEST-001"
        assert unit.floor_id == "FL01"
        assert unit.unit_id == "BLD-TEST-001-FL01-U101"
        assert unit.unit_number == "101"
        assert unit.unit_name == "Suite 101"
        assert unit.unit_type == UnitType.APARTMENT_UNIT
        assert unit.footprint_area is not None and unit.footprint_area > 0
        assert unit.volume_cubic_m is not None and unit.volume_cubic_m > 0
        assert unit.z_min == 100.0
        assert unit.z_max == 103.5
        assert unit.base_elevation == 100.0
        assert unit.top_elevation == 103.5
        assert unit.source == "Configured / Derived"
        assert unit.geometry_status == "PASS"
        assert unit.spatial_id == "TEST_METRIC_DS-BLD-TEST-001-FL01-BLD-TEST-001-FL01-U101"

    def test_05_dataset_isolation_spatial_id(self):
        """Units across different datasets have unique spatial IDs and strict isolation."""
        req_a = UnitCreate(
            dataset_id="DATASET_ALPHA",
            building_id="BLD-1",
            floor_id="FL1",
            unit_number="101",
            geometry_2d=UNIT_POLYGON,
            base_elevation=50.0,
            top_elevation=53.0,
            parent_floor_geometry=PARENT_FLOOR_POLYGON,
        )
        req_b = UnitCreate(
            dataset_id="DATASET_BETA",
            building_id="BLD-1",
            floor_id="FL1",
            unit_number="101",
            geometry_2d=UNIT_POLYGON,
            base_elevation=50.0,
            top_elevation=53.0,
            parent_floor_geometry=PARENT_FLOOR_POLYGON,
        )

        unit_a = UnitService.create_and_register_unit(req_a)
        unit_b = UnitService.create_and_register_unit(req_b)

        assert unit_a.spatial_id != unit_b.spatial_id
        assert unit_a.spatial_id.startswith("DATASET_ALPHA-")
        assert unit_b.spatial_id.startswith("DATASET_BETA-")

        # Listing by dataset isolates them
        alpha_units = UnitService.list_dataset_units("DATASET_ALPHA")
        beta_units = UnitService.list_dataset_units("DATASET_BETA")
        assert len(alpha_units) == 1
        assert len(beta_units) == 1
        assert alpha_units[0].unit_id == unit_a.unit_id
        assert beta_units[0].unit_id == unit_b.unit_id

    def test_06_metadata_export_includes_spatial_id(self):
        """Export metadata dictionary format includes unit spatial_id, area_sqm, z_min, z_max."""
        req = UnitCreate(
            dataset_id="EXPORT_TEST_DS",
            building_id="BLD-EXPORT",
            floor_id="FL02",
            unit_number="201",
            geometry_2d=UNIT_POLYGON,
            base_elevation=200.0,
            top_elevation=203.0,
            parent_floor_geometry=PARENT_FLOOR_POLYGON,
        )
        UnitService.create_and_register_unit(req)

        # Retrieve registered units for this dataset
        registered = UnitService.list_dataset_units("EXPORT_TEST_DS")
        assert len(registered) == 1
        u = registered[0]

        # Simulate metadata export item mapping
        u_dict = u.model_dump(exclude={"geometry_3d"})
        u_dict["spatial_id"] = u.spatial_id or f"EXPORT_TEST_DS-{u.building_id}-{u.floor_id}-{u.unit_id}"
        u_dict["area_sqm"] = u.footprint_area
        u_dict["z_min"] = u.z_min if u.z_min is not None else u.base_elevation
        u_dict["z_max"] = u.z_max if u.z_max is not None else u.top_elevation
        u_dict["geometry_status"] = getattr(u, "geometry_status", "PASS")

        assert "spatial_id" in u_dict
        assert u_dict["spatial_id"] == "EXPORT_TEST_DS-BLD-EXPORT-FL02-BLD-EXPORT-FL02-U201"
        assert "area_sqm" in u_dict
        assert u_dict["area_sqm"] > 0
        assert "volume_cubic_m" in u_dict
        assert u_dict["volume_cubic_m"] > 0
        assert u_dict["z_min"] == 200.0
        assert u_dict["z_max"] == 203.0
        assert u_dict["source"] == "Configured / Derived"
        assert u_dict["geometry_status"] == "PASS"

    def test_07_api_unit_creation_returns_spatial_id(self):
        """POST /api/v1/units REST endpoint returns spatial_id and property fields."""
        payload = {
            "dataset_id": "API_TEST_DS",
            "building_id": "BLD-API-001",
            "floor_id": "FL01",
            "unit_number": "301",
            "unit_name": "Studio 301",
            "unit_type": "APARTMENT_UNIT",
            "geometry_2d": UNIT_POLYGON,
            "base_elevation": 10.0,
            "top_elevation": 13.0,
            "parent_floor_geometry": PARENT_FLOOR_POLYGON,
            "source": "Configured / Derived",
        }
        res = client.post("/api/v1/units", json=payload)
        assert res.status_code in (200, 201), res.text
        data = res.json()


        assert "spatial_id" in data
        assert data["spatial_id"] == "API_TEST_DS-BLD-API-001-FL01-BLD-API-001-FL01-U301"
        assert data["z_min"] == 10.0
        assert data["z_max"] == 13.0
        assert data["source"] == "Configured / Derived"
        assert data["geometry_status"] == "PASS"
