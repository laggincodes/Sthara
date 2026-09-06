"""
Unit and Integration Tests for Deterministic 3D ULPIN Prototype.

Validates:
1. Determinism (same property -> same ULPIN).
2. Distinction (different properties -> different ULPINs).
3. Sorting independence (building and floor list order independence).
4. Mesh independence (raw geometry, vertex ordering, or volume changes do not affect ULPIN).
5. Identity changes (changing parcel or property ID alters ULPIN).
6. Versioning (changing algorithm version alters ULPIN).
7. Error and status handling (rejects duplicate components, invalid or unavailable geometry).
8. Verification endpoint and service logic.
9. API route execution (/properties/generate-ulpin, /properties/verify-ulpin, /ulpin/generate, etc.).
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.geometry_3d import Geometry3DStatus
from app.schemas.property_volume import PropertyVolumeResult, VolumeType
from app.schemas.ulpin import (
    IdentifierStatus,
    ULPINRequest,
    ULPINVerificationRequest,
    BatchULPINRequest,
)
from app.services.ulpin_service import ULPINService, IDENTIFIER_NAMESPACE, IDENTIFIER_VERSION

client = TestClient(app)


# --- 1. Core Determinism Tests ---

def test_ulpin_same_property_same_identifier():
    """Validates that generating an identifier twice for the exact same property produces the identical ULPIN."""
    req1 = ULPINRequest(
        property_id="PROP-001",
        parcel_id="PARCEL-100",
        building_ids=["BLD-A"],
        floor_ids=["FL-01", "FL-02"],
    )
    req2 = ULPINRequest(
        property_id="PROP-001",
        parcel_id="PARCEL-100",
        building_ids=["BLD-A"],
        floor_ids=["FL-01", "FL-02"],
    )

    res1 = ULPINService.generate_3d_ulpin(req1)
    res2 = ULPINService.generate_3d_ulpin(req2)

    assert res1.identifier_status == IdentifierStatus.VALID
    assert res2.identifier_status == IdentifierStatus.VALID
    assert res1.ulpin is not None
    assert res1.ulpin == res2.ulpin
    assert res1.ulpin.startswith(f"{IDENTIFIER_NAMESPACE}-V{IDENTIFIER_VERSION}-")


def test_ulpin_different_properties_different_identifiers():
    """Validates that distinct property identities produce different ULPINs."""
    req1 = ULPINRequest(
        property_id="PROP-001",
        parcel_id="PARCEL-100",
        building_ids=["BLD-A"],
        floor_ids=["FL-01"],
    )
    req2 = ULPINRequest(
        property_id="PROP-002",
        parcel_id="PARCEL-100",
        building_ids=["BLD-A"],
        floor_ids=["FL-01"],
    )

    res1 = ULPINService.generate_3d_ulpin(req1)
    res2 = ULPINService.generate_3d_ulpin(req2)

    assert res1.ulpin != res2.ulpin


def test_ulpin_building_ordering_independence():
    """Validates that changing the input ordering of building IDs does not change the ULPIN."""
    req1 = ULPINRequest(
        property_id="PROP-MULTI",
        parcel_id="PARCEL-200",
        building_ids=["BLD-001", "BLD-002"],
        floor_ids=["FL-01"],
    )
    req2 = ULPINRequest(
        property_id="PROP-MULTI",
        parcel_id="PARCEL-200",
        building_ids=["BLD-002", "BLD-001"],  # Inverted order
        floor_ids=["FL-01"],
    )

    res1 = ULPINService.generate_3d_ulpin(req1)
    res2 = ULPINService.generate_3d_ulpin(req2)

    assert res1.identifier_status == IdentifierStatus.VALID
    assert res2.identifier_status == IdentifierStatus.VALID
    assert res1.ulpin == res2.ulpin
    assert res1.building_ids == ["BLD-001", "BLD-002"]
    assert res2.building_ids == ["BLD-001", "BLD-002"]


def test_ulpin_floor_ordering_independence():
    """Validates that changing the input ordering of floor IDs does not change the ULPIN."""
    req1 = ULPINRequest(
        property_id="PROP-DUPLEX",
        parcel_id="PARCEL-300",
        building_ids=["BLD-001"],
        floor_ids=["FL-01", "FL-02", "FL-03"],
    )
    req2 = ULPINRequest(
        property_id="PROP-DUPLEX",
        parcel_id="PARCEL-300",
        building_ids=["BLD-001"],
        floor_ids=["FL-03", "FL-01", "FL-02"],  # Permuted order
    )

    res1 = ULPINService.generate_3d_ulpin(req1)
    res2 = ULPINService.generate_3d_ulpin(req2)

    assert res1.identifier_status == IdentifierStatus.VALID
    assert res2.identifier_status == IdentifierStatus.VALID
    assert res1.ulpin == res2.ulpin
    assert res1.floor_ids == ["FL-01", "FL-02", "FL-03"]
    assert res2.floor_ids == ["FL-01", "FL-02", "FL-03"]


# --- 2. Decoupling from 3D Mesh Geometry ---

def test_ulpin_independent_of_raw_geometry():
    """
    Validates that the 3D ULPIN is purely property-entity-based:
    Even if property volume geometry metrics (volume, surface area, elevation span) change,
    the identifier remains strictly stable.
    """
    prop_req = ULPINRequest(
        property_id="PROP-SPATIAL-TEST",
        parcel_id="PARCEL-500",
        building_ids=["BLD-A"],
        floor_ids=["FL-01"],
    )

    vol1 = PropertyVolumeResult(
        property_id="PROP-SPATIAL-TEST",
        parcel_id="PARCEL-500",
        building_id="BLD-A",
        floor_ids=["FL-01"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        volume_cubic_m=350.0,
        surface_area_sqm=120.0,
        geometry_status=Geometry3DStatus.VALID,
        warnings=[],
    )

    # Alternate volume with different mesh calculation
    vol2 = PropertyVolumeResult(
        property_id="PROP-SPATIAL-TEST",
        parcel_id="PARCEL-500",
        building_id="BLD-A",
        floor_ids=["FL-01"],
        volume_type=VolumeType.PROPERTY_VOLUME,
        volume_cubic_m=420.5,
        surface_area_sqm=145.2,
        geometry_status=Geometry3DStatus.VALID,
        warnings=[],
    )

    res1 = ULPINService.generate_3d_ulpin(prop_req, property_volume=vol1)
    res2 = ULPINService.generate_3d_ulpin(prop_req, property_volume=vol2)

    assert res1.ulpin == res2.ulpin
    assert "volume" not in res1.canonical_identity.lower()
    assert "surface" not in res1.canonical_identity.lower()


# --- 3. Property Identity Changes & Versioning ---

def test_ulpin_property_identity_change_alters_ulpin():
    """Validates that altering any identity field changes the ULPIN."""
    base = ULPINRequest(
        property_id="PROP-BASE",
        parcel_id="PARCEL-BASE",
        building_ids=["BLD-01"],
        floor_ids=["FL-01"],
    )
    base_res = ULPINService.generate_3d_ulpin(base)

    # Different parcel ID
    diff_parcel = ULPINRequest(
        property_id="PROP-BASE",
        parcel_id="PARCEL-ALT",
        building_ids=["BLD-01"],
        floor_ids=["FL-01"],
    )
    diff_parcel_res = ULPINService.generate_3d_ulpin(diff_parcel)
    assert base_res.ulpin != diff_parcel_res.ulpin

    # Different floor set
    diff_floors = ULPINRequest(
        property_id="PROP-BASE",
        parcel_id="PARCEL-BASE",
        building_ids=["BLD-01"],
        floor_ids=["FL-01", "FL-02"],
    )
    diff_floors_res = ULPINService.generate_3d_ulpin(diff_floors)
    assert base_res.ulpin != diff_floors_res.ulpin


def test_ulpin_version_change_alters_ulpin():
    """Validates that changing the identifier version produces a different versioned string."""
    req = ULPINRequest(
        property_id="PROP-V-TEST",
        parcel_id="PARCEL-V-TEST",
        building_ids=["BLD-01"],
        floor_ids=["FL-01"],
    )

    id_v1 = ULPINService.build_canonical_property_identity(req, version="1")
    id_v2 = ULPINService.build_canonical_property_identity(req, version="2")

    str_v1 = ULPINService.canonicalize_identity(id_v1)
    str_v2 = ULPINService.canonicalize_identity(id_v2)

    assert "v1" in str_v1
    assert "v2" in str_v2
    assert str_v1 != str_v2


# --- 4. Validation & Precondition Checks ---

def test_ulpin_rejects_duplicate_buildings_or_floors():
    """Validates that duplicate building or floor IDs in input are rejected as INVALID."""
    # Duplicate buildings
    req_dup_bld = ULPINRequest(
        property_id="PROP-DUP",
        parcel_id="PARCEL-001",
        building_ids=["BLD-01", "BLD-01"],
        floor_ids=["FL-01"],
    )
    res_dup_bld = ULPINService.generate_3d_ulpin(req_dup_bld)
    assert res_dup_bld.identifier_status == IdentifierStatus.INVALID
    assert res_dup_bld.ulpin is None
    assert any("Duplicate building" in w for w in res_dup_bld.warnings)

    # Duplicate floors
    req_dup_flr = ULPINRequest(
        property_id="PROP-DUP",
        parcel_id="PARCEL-001",
        building_ids=["BLD-01"],
        floor_ids=["FL-01", "FL-01"],
    )
    res_dup_flr = ULPINService.generate_3d_ulpin(req_dup_flr)
    assert res_dup_flr.identifier_status == IdentifierStatus.INVALID
    assert res_dup_flr.ulpin is None
    assert any("Duplicate floor" in w for w in res_dup_flr.warnings)


def test_ulpin_unavailable_spatial_volume_yields_unavailable_status():
    """Validates that an UNAVAILABLE spatial property volume causes the ULPIN to be UNAVAILABLE."""
    req = ULPINRequest(
        property_id="PROP-UNAVAIL",
        parcel_id="PARCEL-001",
        building_ids=["BLD-01"],
        floor_ids=["FL-01"],
        geometry_status=Geometry3DStatus.UNAVAILABLE,
    )
    res = ULPINService.generate_3d_ulpin(req)
    assert res.identifier_status == IdentifierStatus.UNAVAILABLE
    assert res.ulpin is None
    assert any("UNAVAILABLE" in w for w in res.warnings)


def test_ulpin_invalid_spatial_volume_yields_invalid_status():
    """Validates that an INVALID spatial property volume causes the ULPIN to be INVALID."""
    req = ULPINRequest(
        property_id="PROP-INV-SPATIAL",
        parcel_id="PARCEL-001",
        building_ids=["BLD-01"],
        floor_ids=["FL-01"],
        geometry_status=Geometry3DStatus.INVALID,
    )
    res = ULPINService.generate_3d_ulpin(req)
    assert res.identifier_status == IdentifierStatus.INVALID
    assert res.ulpin is None
    assert any("INVALID" in w for w in res.warnings)


# --- 5. Verification Endpoint & Logic ---

def test_ulpin_verification_success_and_tamper_detection():
    """Validates that valid ULPINs verify successfully, while tampered ones are flagged."""
    req = ULPINRequest(
        property_id="PROP-VERIFY",
        parcel_id="PARCEL-VERIFY",
        building_ids=["BLD-VERIFY"],
        floor_ids=["FL-01"],
    )
    gen_res = ULPINService.generate_3d_ulpin(req)
    valid_ulpin = gen_res.ulpin

    # Successful verification
    verify_req_ok = ULPINVerificationRequest(
        ulpin=valid_ulpin,
        property_id="PROP-VERIFY",
        parcel_id="PARCEL-VERIFY",
        building_ids=["BLD-VERIFY"],
        floor_ids=["FL-01"],
    )
    ver_ok = ULPINService.verify_3d_ulpin(verify_req_ok)
    assert ver_ok.verified is True
    assert ver_ok.match is True
    assert ver_ok.expected_ulpin == valid_ulpin

    # Tampered ULPIN verification
    tampered_ulpin = valid_ulpin[:-4] + "FFFF"
    verify_req_bad = ULPINVerificationRequest(
        ulpin=tampered_ulpin,
        property_id="PROP-VERIFY",
        parcel_id="PARCEL-VERIFY",
        building_ids=["BLD-VERIFY"],
        floor_ids=["FL-01"],
    )
    ver_bad = ULPINService.verify_3d_ulpin(verify_req_bad)
    assert ver_bad.verified is False
    assert ver_bad.match is False
    assert "Verification failed" in ver_bad.details


# --- 6. API Route Integration Tests ---

def test_api_generate_ulpin():
    """Tests POST /api/v1/properties/generate-ulpin endpoint."""
    payload = {
        "property_id": "PROP-API-TEST",
        "parcel_id": "PARCEL-API-001",
        "building_ids": ["BLD-API-01"],
        "floor_ids": ["FL-00", "FL-01"],
    }
    response = client.post("/api/v1/properties/generate-ulpin", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["identifier_status"] == "VALID"
    assert data["ulpin"].startswith("3DULPIN-V1-")
    assert data["property_id"] == "PROP-API-TEST"
    assert "Prototype" in data["disclaimer"]


def test_api_verify_ulpin():
    """Tests POST /api/v1/properties/verify-ulpin endpoint."""
    # First generate
    payload = {
        "property_id": "PROP-API-VERIFY",
        "parcel_id": "PARCEL-API-002",
        "building_ids": ["BLD-API-02"],
        "floor_ids": ["FL-00"],
    }
    gen_resp = client.post("/api/v1/properties/generate-ulpin", json=payload)
    ulpin_str = gen_resp.json()["ulpin"]

    # Verify
    verify_payload = {
        "ulpin": ulpin_str,
        "property_id": "PROP-API-VERIFY",
        "parcel_id": "PARCEL-API-002",
        "building_ids": ["BLD-API-02"],
        "floor_ids": ["FL-00"],
    }
    ver_resp = client.post("/api/v1/properties/verify-ulpin", json=verify_payload)
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert ver_data["verified"] is True
    assert ver_data["expected_ulpin"] == ulpin_str


def test_api_get_demo_ulpins():
    """Tests GET /api/v1/properties/demo-ulpins endpoint."""
    response = client.get("/api/v1/properties/demo-ulpins")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 4
    for item in items:
        assert item["identifier_status"] == "VALID"
        assert item["ulpin"].startswith("3DULPIN-V1-")
        assert len(item["canonical_identity"]) > 0


def test_api_ulpin_router():
    """Tests active /api/v1/ulpin endpoints."""
    # POST /api/v1/ulpin/generate
    gen_resp = client.post(
        "/api/v1/ulpin/generate",
        json={
            "property_id": "PROP-ROUTER-TEST",
            "parcel_id": "PARCEL-ROUTER-001",
            "building_id": "BLD-01",
            "floor_ids": ["FL00"],
        },
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["identifier_status"] == "VALID"

    # POST /api/v1/ulpin/batch
    batch_resp = client.post(
        "/api/v1/ulpin/batch",
        json={
            "properties": [
                {
                    "property_id": "PROP-BATCH-1",
                    "parcel_id": "PARCEL-B",
                    "building_id": "BLD-01",
                    "floor_ids": ["FL00"],
                },
                {
                    "property_id": "PROP-BATCH-2",
                    "parcel_id": "PARCEL-B",
                    "building_id": "BLD-01",
                    "floor_ids": ["FL01"],
                },
            ]
        },
    )
    assert batch_resp.status_code == 200
    batch_data = batch_resp.json()
    assert batch_data["summary"]["requested"] == 2
    assert batch_data["summary"]["valid"] == 2
    assert len(batch_data["results"]) == 2
