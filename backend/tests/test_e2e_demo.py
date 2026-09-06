"""
End-to-End Demo Integration Test for 3D Cadastral Intelligence Pipeline (Step 15).

Verifies the complete deterministic chain:
Demo Datasets -> Parcel Validation -> Building Association -> Elevation Sampling ->
Building Height & Floors -> 3D Building Geometry -> 3D Property Volumes ->
Deterministic 3D ULPIN Prototype -> Cryptographic Verification.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.ulpin import IdentifierStatus

client = TestClient(app)


def test_end_to_end_demo_pipeline():
    """
    Executes and validates the full SIH demo pipeline in sequential order.
    """
    # 1. Health check
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "ok"

    # 2. Ingest Demo Parcels & Demo Buildings
    parcels_resp = client.get("/api/v1/datasets/demo_parcels")
    assert parcels_resp.status_code == 200
    parcels_geojson = parcels_resp.json()["data"]["raw_geojson"]
    assert len(parcels_geojson["features"]) >= 2

    buildings_resp = client.get("/api/v1/datasets/demo_buildings")
    assert buildings_resp.status_code == 200
    buildings_geojson = buildings_resp.json()["data"]["raw_geojson"]
    assert len(buildings_geojson["features"]) >= 2

    # 3. Validate Parcels
    val_resp = client.post("/api/v1/datasets/validate", json=parcels_geojson)
    assert val_resp.status_code == 200
    val_data = val_resp.json()["data"]
    assert val_data["validation"]["valid"] is True
    assert val_data["validation"]["feature_count"] >= 2

    # 4. Spatial Association: Buildings to Parcels
    assoc_resp = client.post(
        "/api/v1/spatial/associate-buildings",
        json={"parcels": parcels_geojson, "buildings": buildings_geojson},
    )
    assert assoc_resp.status_code == 200
    assoc_data = assoc_resp.json()["data"]
    assert assoc_data["summary"]["associated_buildings"] >= 2
    all_associated_bld_ids = [b for b_list in assoc_data["parcel_building_map"].values() for b in b_list]
    assert "BLD-DEMO-001" in all_associated_bld_ids

    # 5. DEM Elevation Sampling
    sample_points = [
        {"feature_id": "PARCEL-DEMO-101", "longitude": 73.85615, "latitude": 18.52012},
        {"feature_id": "BLD-DEMO-001", "longitude": 73.85615, "latitude": 18.52012},
    ]
    elev_resp = client.post("/api/v1/elevation/sample", json={"points": sample_points})
    assert elev_resp.status_code == 200
    elev_results = elev_resp.json()["data"]["results"]
    assert len(elev_results) == 2
    assert all(r["status"] == "SUCCESS" for r in elev_results)
    sampled_z = elev_results[0]["elevation_m"]
    assert sampled_z is not None and sampled_z > 500.0

    # 6. Building Height & Floor Generation
    height_resp = client.post(
        "/api/v1/buildings/calculate-height",
        json={
            "building_id": "BLD-DEMO-001",
            "ground_elevation": sampled_z,
            "roof_elevation": sampled_z + 12.0,
        },
    )
    assert height_resp.status_code == 200
    assert height_resp.json()["building_height"] == 12.0

    floors_resp = client.post(
        "/api/v1/buildings/generate-floors",
        json={
            "building_id": "BLD-DEMO-001",
            "ground_elevation": sampled_z,
            "building_height": 12.0,
            "floor_count": 4,
        },
    )
    assert floors_resp.status_code == 200
    floors_data = floors_resp.json()
    assert len(floors_data["floors"]) == 4

    # 7. Canonical 3D Building Extrusion
    extrude_bld_resp = client.post("/api/v1/buildings/extrude-demo")
    assert extrude_bld_resp.status_code == 200
    bld_3d_data = extrude_bld_resp.json()
    assert bld_3d_data["summary"]["successful"] >= 2

    # 8. Canonical 3D Stratified Floor Volumes
    extrude_floors_resp = client.post("/api/v1/buildings/extrude-demo-floors")
    assert extrude_floors_resp.status_code == 200
    floors_3d_data = extrude_floors_resp.json()
    assert floors_3d_data["summary"]["successful"] >= 2

    # 9. Canonical 3D Property Volumes
    extrude_prop_resp = client.post("/api/v1/properties/extrude-demo-properties")
    assert extrude_prop_resp.status_code == 200
    prop_3d_data = extrude_prop_resp.json()
    assert prop_3d_data["summary"]["successful"] >= 5

    # 10. Deterministic 3D ULPIN Generation
    ulpins_resp = client.get("/api/v1/properties/demo-ulpins")
    assert ulpins_resp.status_code == 200
    ulpins = ulpins_resp.json()
    assert len(ulpins) >= 5

    primary_ulpin = next((u for u in ulpins if u["property_id"] == "PROP-DEMO-101-U01"), None)
    assert primary_ulpin is not None
    assert primary_ulpin["identifier_status"] == IdentifierStatus.VALID
    assert primary_ulpin["ulpin"].startswith("3DULPIN-V1-")

    # 11. Cryptographic ULPIN Verification
    verify_resp = client.post(
        "/api/v1/properties/verify-ulpin",
        json={
            "ulpin": primary_ulpin["ulpin"],
            "property_id": "PROP-DEMO-101-U01",
            "parcel_id": "PARCEL-DEMO-101",
            "building_id": "BLD-DEMO-001",
            "floor_ids": ["BLD-DEMO-001-FL00"],
            "source_identity": "demo_cadastral_dataset",
        },
    )
    assert verify_resp.status_code == 200
    verify_result = verify_resp.json()
    assert verify_result["verified"] is True
    assert verify_result["match"] is True


def test_demo_pipeline_determinism():
    """Validates that running the ULPIN demo generation multiple times yields identical identifiers."""
    run1 = client.get("/api/v1/properties/demo-ulpins").json()
    run2 = client.get("/api/v1/properties/demo-ulpins").json()

    assert len(run1) == len(run2)
    for u1, u2 in zip(run1, run2):
        assert u1["property_id"] == u2["property_id"]
        assert u1["ulpin"] == u2["ulpin"]
        assert u1["canonical_identity"] == u2["canonical_identity"]


def test_demo_pipeline_rejects_tampered_identity():
    """Validates that altering property components rejects verification."""
    ulpins = client.get("/api/v1/properties/demo-ulpins").json()
    target = ulpins[0]

    # Tamper with parcel ID
    tampered_resp = client.post(
        "/api/v1/properties/verify-ulpin",
        json={
            "ulpin": target["ulpin"],
            "property_id": target["property_id"],
            "parcel_id": "PARCEL-TAMPERED-999",
            "building_id": "BLD-DEMO-001",
            "floor_ids": ["BLD-DEMO-001-FL00"],
            "source_identity": "demo_cadastral_dataset",
        },
    )
    assert tampered_resp.status_code == 200
    assert tampered_resp.json()["verified"] is False
    assert tampered_resp.json()["match"] is False
