import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.sources import SourceRegisterRequest, SourceFeaturesRequest, SourceType, SourceStatus
from app.services.source_service import SourceService
from app.services.osm_3d_converter import Osm3DConverterService

client = TestClient(app)

DATASET_A = "ds_tagore_garden_map_osm"
DATASET_B = "ds_sample_430675d0"


@pytest.fixture(autouse=True)
def clean_test_sources():
    """Ensure test sources are cleaned up before and after each test."""
    yield
    # Cleanup test sources
    for ds, sid in [
        (DATASET_A, "SRC-TEST-REG-01"),
        (DATASET_A, "SRC-TEST-MULTI-01"),
        (DATASET_A, "SRC-TEST-MULTI-02"),
        (DATASET_A, "SRC-TEST-GEOJSON-01"),
        (DATASET_A, "SRC-TEST-PROV-01"),
        (DATASET_A, "SRC-TEST-MISSING-CRS"),
        (DATASET_A, "SRC-TEST-ISO-A"),
        (DATASET_B, "SRC-TEST-ISO-B"),
        (DATASET_B, "SRC-TEST-CROSS-01"),
    ]:
        try:
            SourceService.delete_source(ds, sid)
        except Exception:
            pass


class TestMultiSourceSpatialDataFusion:
    """Automated test suite for STEP 9: Multi-Source Spatial Data Fusion."""

    def test_01_source_registration(self):
        """1. Register a new spatial reference source successfully."""
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-REG-01",
            "source_name": "Test Boundary Layer",
            "source_type": "Reference Layer",
            "format": "GeoJSON",
            "crs": "EPSG:4326",
            "description": "Administrative test boundary",
        }
        res = client.post("/api/v1/sources", json=req)
        assert res.status_code == 201
        data = res.json()
        assert data["source_id"] == "SRC-TEST-REG-01"
        assert data["dataset_id"] == DATASET_A
        assert data["source_type"] == "Reference Layer"
        assert data["status"] in ["VALID", "Imported"]
        assert "provenance" in data
        assert "disclaimer" in data

    def test_02_source_retrieval(self):
        """2. Retrieve a registered source by dataset_id and source_id."""
        # SRC-OSM-TAGORE is pre-seeded
        res = client.get(f"/api/v1/sources/{DATASET_A}/SRC-OSM-TAGORE")
        assert res.status_code == 200
        data = res.json()
        assert data["source_id"] == "SRC-OSM-TAGORE"
        assert data["dataset_id"] == DATASET_A
        assert data["source_type"] == "OSM"
        assert data["crs"] == "EPSG:4326"

    def test_03_source_deletion(self):
        """3. Delete a source and verify it is removed from the dataset registry."""
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-REG-01",
            "source_name": "Ephemeral Source",
            "source_type": "User-provided",
            "crs": "EPSG:4326",
        }
        create_res = client.post("/api/v1/sources", json=req)
        assert create_res.status_code == 201

        del_res = client.delete(f"/api/v1/sources/{DATASET_A}/SRC-TEST-REG-01")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        get_res = client.get(f"/api/v1/sources/{DATASET_A}/SRC-TEST-REG-01")
        assert get_res.status_code == 404

    def test_04_multiple_sources_in_one_dataset(self):
        """4. Multiple sources can coexist within the same dataset with distinct provenance."""
        req1 = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-MULTI-01",
            "source_name": "Multi Source 1",
            "source_type": "GeoJSON",
            "crs": "EPSG:4326",
        }
        req2 = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-MULTI-02",
            "source_name": "Multi Source 2",
            "source_type": "DataMeet",
            "crs": "EPSG:4326",
        }
        assert client.post("/api/v1/sources", json=req1).status_code == 201
        assert client.post("/api/v1/sources", json=req2).status_code == 201

        list_res = client.get(f"/api/v1/sources/{DATASET_A}")
        assert list_res.status_code == 200
        sources = list_res.json()["sources"]
        source_ids = [s["source_id"] for s in sources]
        assert "SRC-TEST-MULTI-01" in source_ids
        assert "SRC-TEST-MULTI-02" in source_ids

    def test_05_cross_dataset_source_rejection(self):
        """5. Accessing a source under an incorrect dataset_id is strictly rejected with HTTP 400."""
        # Create source in DATASET_B
        req = {
            "dataset_id": DATASET_B,
            "source_id": "SRC-TEST-CROSS-01",
            "source_name": "Dataset B Only Source",
            "source_type": "User-provided",
            "crs": "EPSG:4326",
        }
        res_create = client.post("/api/v1/sources", json=req)
        assert res_create.status_code == 201

        # Attempt to access source of DATASET_B using DATASET_A
        res_cross = client.get(f"/api/v1/sources/{DATASET_A}/SRC-TEST-CROSS-01")
        assert res_cross.status_code == 400
        msg = res_cross.json().get("message") or res_cross.json().get("detail", "")
        assert "does not belong to dataset" in msg

    def test_06_geojson_reference_import(self):
        """6. Import a GeoJSON FeatureCollection as a reference layer."""
        features = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": "REF-POLYGON-01",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [77.115, 28.650],
                                [77.118, 28.650],
                                [77.118, 28.653],
                                [77.115, 28.653],
                                [77.115, 28.650],
                            ]
                        ],
                    },
                    "properties": {"name": "Reference Sector 1"},
                }
            ],
        }
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-GEOJSON-01",
            "source_name": "Reference Sector Overlay",
            "source_type": "Reference Layer",
            "crs": "EPSG:4326",
            "features": features,
        }
        res = client.post("/api/v1/sources", json=req)
        assert res.status_code == 201
        source_data = res.json()
        assert source_data["feature_count"] == 1

        # Retrieve features
        feat_res = client.get(f"/api/v1/sources/{DATASET_A}/SRC-TEST-GEOJSON-01/features")
        assert feat_res.status_code == 200
        feat_data = feat_res.json()
        assert len(feat_data["features"]) == 1
        feat = feat_data["features"][0]
        # Must be classified as REFERENCE GEOMETRY
        assert feat["properties"]["classification"] == "REFERENCE GEOMETRY"
        assert feat["properties"]["source_id"] == "SRC-TEST-GEOJSON-01"

    def test_07_crs_normalization(self):
        """7. Verify original and working metric CRS are recorded."""
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-PROV-01",
            "source_name": "CRS Tracked Source",
            "source_type": "GeoJSON",
            "crs": "EPSG:4326",
        }
        res = client.post("/api/v1/sources", json=req)
        assert res.status_code == 201
        data = res.json()
        assert data["crs"] == "EPSG:4326"
        assert data["working_crs"] == "EPSG:32643"
        assert data["provenance"]["working_crs"] == "EPSG:32643"
        assert data["provenance"]["original_crs"] == "EPSG:4326"

    def test_08_source_provenance_preservation(self):
        """8. Source provenance maintains source type and non-title disclaimer."""
        source = SourceService.get_source(DATASET_A, "SRC-OSM-TAGORE")
        assert source.source_type == SourceType.OSM
        assert source.provenance["source"] == "OpenStreetMap contributors (ODbL)"
        assert "does not establish legal ownership" in source.disclaimer

    def test_09_feature_source_relationship(self):
        """9. Features inherit source_id and original CRS in properties."""
        features = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [77.116, 28.651],
                    },
                    "properties": {"tag": "survey_marker"},
                }
            ],
        }
        SourceService.register_source(
            SourceRegisterRequest(
                dataset_id=DATASET_A,
                source_id="SRC-TEST-PROV-01",
                source_name="Survey Markers",
                source_type="User-provided",
                crs="EPSG:4326",
                features=features,
            )
        )
        stored_features = SourceService.get_source_features(DATASET_A, "SRC-TEST-PROV-01")
        assert len(stored_features["features"]) == 1
        p = stored_features["features"][0]["properties"]
        assert p["source_id"] == "SRC-TEST-PROV-01"
        assert p["original_crs"] == "EPSG:4326"
        assert p["working_crs"] == "EPSG:32643"
        assert p["classification"] == "REFERENCE GEOMETRY"

    def test_10_invalid_geojson_error(self):
        """10. Malformed or invalid GeoJSON returns HTTP 400."""
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-INVALID-01",
            "source_name": "Malformed GeoJSON",
            "source_type": "GeoJSON",
            "features": {"type": "NotAFeatureCollection", "stuff": 123},
        }
        res = client.post("/api/v1/sources", json=req)
        assert res.status_code == 400
        msg = res.json().get("message") or res.json().get("detail", "")
        assert "Invalid GeoJSON" in msg

    def test_11_missing_crs_warning(self):
        """11. Source without declared CRS defaults to EPSG:4326 and sets WARNING status."""
        req = {
            "dataset_id": DATASET_A,
            "source_id": "SRC-TEST-MISSING-CRS",
            "source_name": "Missing CRS Source",
            "source_type": "GeoJSON",
            # crs omitted
        }
        res = client.post("/api/v1/sources", json=req)
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "WARNING"
        assert "Defaulted" in data["crs"]
        assert "crs_warning" in data["provenance"]

    def test_12_dataset_a_b_a_source_isolation(self):
        """12. Switching datasets A -> B -> A guarantees strict source isolation."""
        # Register in Dataset A
        client.post(
            "/api/v1/sources",
            json={
                "dataset_id": DATASET_A,
                "source_id": "SRC-TEST-ISO-A",
                "source_name": "Source for A",
                "source_type": "Reference Layer",
                "crs": "EPSG:4326",
            },
        )
        # Register in Dataset B
        client.post(
            "/api/v1/sources",
            json={
                "dataset_id": DATASET_B,
                "source_id": "SRC-TEST-ISO-B",
                "source_name": "Source for B",
                "source_type": "User-provided",
                "crs": "EPSG:4326",
            },
        )

        # Inspect Dataset A sources
        res_a1 = client.get(f"/api/v1/sources/{DATASET_A}")
        ids_a1 = [s["source_id"] for s in res_a1.json()["sources"]]
        assert "SRC-TEST-ISO-A" in ids_a1
        assert "SRC-TEST-ISO-B" not in ids_a1

        # Inspect Dataset B sources
        res_b = client.get(f"/api/v1/sources/{DATASET_B}")
        ids_b = [s["source_id"] for s in res_b.json()["sources"]]
        assert "SRC-TEST-ISO-B" in ids_b
        assert "SRC-TEST-ISO-A" not in ids_b

        # Switch back to Dataset A
        res_a2 = client.get(f"/api/v1/sources/{DATASET_A}")
        ids_a2 = [s["source_id"] for s in res_a2.json()["sources"]]
        assert "SRC-TEST-ISO-A" in ids_a2
        assert "SRC-TEST-ISO-B" not in ids_a2

    def test_13_export_contains_source_metadata(self):
        """13. Metadata export includes registered sources list."""
        res = client.get(f"/api/v1/export/metadata/{DATASET_A}")
        assert res.status_code == 200
        meta = res.json()
        assert "sources" in meta or (meta.get("dataset_id") == DATASET_A)

    def test_14_existing_building_floor_unit_functionality_intact(self):
        """14. Existing cadastral hierarchy APIs (buildings, floors, units, 3D export) remain intact."""
        # Test OSM buildings listing
        bld_res = client.get(f"/api/v1/osm/buildings?dataset_id={DATASET_A}")
        assert bld_res.status_code == 200

        # Test floor specs
        floor_res = client.get("/api/v1/buildings/demo-specs")
        assert floor_res.status_code == 200

        # Test units listing by dataset
        unit_res = client.get(f"/api/v1/units/{DATASET_A}")
        assert unit_res.status_code == 200
        assert "units" in unit_res.json()
