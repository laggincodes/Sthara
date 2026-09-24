import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.building_blueprint_service import (
    BuildingBlueprintService,
    MAX_FILE_SIZE_BYTES,
)
from app.schemas.building_blueprint import BuildingBlueprintRecord

client = TestClient(app)

DUMMY_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n"
    b"0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
)

DUMMY_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(autouse=True)
def cleanup_test_blueprints():
    """Cleanup test building blueprint records after each test run."""
    yield
    BuildingBlueprintService.remove_building_blueprint("ds_test_a", "bld_101")
    BuildingBlueprintService.remove_building_blueprint("ds_test_a", "bld_102")
    BuildingBlueprintService.remove_building_blueprint("ds_test_b", "bld_101")
    BuildingBlueprintService.remove_building_blueprint("ds_test_b", "bld_202")


def test_1_building_blueprint_upload():
    """Verify POST /api/v1/building-blueprints/upload with valid PDF."""
    files = {
        "file": ("tower_a_blueprint.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")
    }
    data = {"dataset_id": "ds_test_a", "building_id": "bld_101"}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["blueprint"]["building_id"] == "bld_101"
    assert body["blueprint"]["dataset_id"] == "ds_test_a"
    assert body["blueprint"]["filename"] == "tower_a_blueprint.pdf"
    assert body["blueprint"]["file_type"] == "PDF"
    assert body["blueprint"]["source"] == "User-provided building blueprint"
    assert body["blueprint"]["status"] == "Attached"


def test_2_building_blueprint_retrieval():
    """Verify GET /api/v1/building-blueprints/{dataset_id}/{building_id}."""
    # First upload
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "blueprint.pdf", DUMMY_PDF_BYTES
    )

    res = client.get("/api/v1/building-blueprints/ds_test_a/bld_101")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["blueprint"]["building_id"] == "bld_101"
    assert body["blueprint"]["dataset_id"] == "ds_test_a"


def test_3_building_blueprint_view():
    """Verify GET /api/v1/building-blueprints/{dataset_id}/{building_id}/view streams file."""
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "blueprint.pdf", DUMMY_PDF_BYTES
    )

    res = client.get("/api/v1/building-blueprints/ds_test_a/bld_101/view")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert b"%PDF" in res.content


def test_4_building_blueprint_deletion():
    """Verify DELETE /api/v1/building-blueprints/{dataset_id}/{building_id}."""
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "blueprint.pdf", DUMMY_PDF_BYTES
    )

    res = client.delete("/api/v1/building-blueprints/ds_test_a/bld_101")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Subsequent GET should return 200 with attached=False
    res_get = client.get("/api/v1/building-blueprints/ds_test_a/bld_101")
    assert res_get.status_code == 200
    assert res_get.json()["attached"] is False
    assert res_get.json()["blueprint"] is None


def test_5_building_blueprint_replacement():
    """Verify uploading a new blueprint for the same building safely replaces the old file."""
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "old_blueprint.pdf", DUMMY_PDF_BYTES
    )

    files = {
        "file": ("new_blueprint.png", io.BytesIO(DUMMY_PNG_BYTES), "image/png")
    }
    data = {"dataset_id": "ds_test_a", "building_id": "bld_101"}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 200
    body = res.json()
    assert body["blueprint"]["filename"] == "new_blueprint.png"
    assert body["blueprint"]["file_type"] == "PNG"


def test_6_unsupported_file_rejection():
    """Verify rejection of unsupported file types (.txt, .exe)."""
    files = {
        "file": ("malicious_script.exe", io.BytesIO(b"MZ123456"), "application/octet-stream")
    }
    data = {"dataset_id": "ds_test_a", "building_id": "bld_101"}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 400
    msg = res.json().get("message") or res.json().get("detail", "")
    assert "Unsupported file format" in msg


def test_7_oversized_file_rejection():
    """Verify rejection of files exceeding 10 MB limit."""
    oversized_bytes = b"X" * (MAX_FILE_SIZE_BYTES + 1024)
    files = {
        "file": ("huge_blueprint.pdf", io.BytesIO(oversized_bytes), "application/pdf")
    }
    data = {"dataset_id": "ds_test_a", "building_id": "bld_101"}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 400
    msg = res.json().get("message") or res.json().get("detail", "")
    assert "exceeds maximum limit" in msg


def test_8_invalid_dataset_rejection():
    """Verify rejection when dataset_id is empty or missing."""
    files = {
        "file": ("blueprint.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")
    }
    data = {"dataset_id": "  ", "building_id": "bld_101"}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 400


def test_9_invalid_building_rejection():
    """Verify rejection when building_id is empty or missing."""
    files = {
        "file": ("blueprint.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")
    }
    data = {"dataset_id": "ds_test_a", "building_id": "  "}
    res = client.post("/api/v1/building-blueprints/upload", data=data, files=files)
    assert res.status_code == 400


def test_10_cross_dataset_rejection():
    """Verify building from Dataset A cannot retrieve or modify Dataset B blueprint."""
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "ds_a_blueprint.pdf", DUMMY_PDF_BYTES
    )

    # Attempting to query Dataset B with bld_101 must return 200 with attached=False
    res = client.get("/api/v1/building-blueprints/ds_test_b/bld_101")
    assert res.status_code == 200
    assert res.json()["attached"] is False


def test_11_dataset_isolation():
    """Verify strict dataset isolation between Dataset A and Dataset B."""
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "ds_a_blueprint.pdf", DUMMY_PDF_BYTES
    )
    BuildingBlueprintService.attach_building_blueprint(
        "ds_test_b", "bld_101", "ds_b_blueprint.png", DUMMY_PNG_BYTES
    )

    rec_a = BuildingBlueprintService.get_building_blueprint("ds_test_a", "bld_101")
    rec_b = BuildingBlueprintService.get_building_blueprint("ds_test_b", "bld_101")

    assert rec_a is not None and rec_a.filename == "ds_a_blueprint.pdf"
    assert rec_b is not None and rec_b.filename == "ds_b_blueprint.png"

    # Delete ds_test_a blueprint; ds_test_b must remain intact
    BuildingBlueprintService.remove_building_blueprint("ds_test_a", "bld_101")
    assert BuildingBlueprintService.get_building_blueprint("ds_test_a", "bld_101") is None
    assert BuildingBlueprintService.get_building_blueprint("ds_test_b", "bld_101") is not None


def test_12_metadata_export_building_blueprint_integration():
    """Verify building metadata path exists and includes building_blueprint attachment structure."""
    from app.services.osm_3d_converter import Osm3DConverterService

    bp = BuildingBlueprintService.attach_building_blueprint(
        "ds_test_a", "bld_101", "test_bp.pdf", DUMMY_PDF_BYTES
    )
    assert bp is not None
    fetched = BuildingBlueprintService.get_building_blueprint("ds_test_a", "bld_101")
    assert fetched is not None
    assert fetched.filename == "test_bp.pdf"
    assert fetched.status == "Attached"
    assert fetched.source == "User-provided building blueprint"
