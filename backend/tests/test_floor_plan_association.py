"""
Test Suite for STEP 3: Floor Plan / Blueprint Association.

Validates the 14 mandatory test cases:
Case 1: Floor without a floor plan (returns 404 / None).
Case 2: Attach PDF to Floor 1 (.pdf, application/pdf) -> status 200, status Attached.
Case 3: Attach image to Floor 2 (.png, image/png) -> status 200, status Attached.
Case 4: Retrieve floor-plan association via GET endpoint and inline view.
Case 5: Replace floor plan -> replaces file and metadata cleanly, cleans up old file.
Case 6: Remove floor plan -> removes association and deletes file.
Case 7: Invalid file type rejected (e.g. .exe, .txt) -> HTTP 400.
Case 8: Oversized file rejected (> 10MB) -> HTTP 413.
Case 9: Dataset isolation (Dataset A plan does not appear in Dataset B; switching back restores it).
Case 10: Floor isolation within same building (Floor 1 plan does not appear on Floor 2).
Case 11: Existing floor geometry remains unchanged after attach/remove.
Case 12: Existing Step 1 workflow (floor/basement slicing) remains functional.
Case 13: Existing Step 2 source detection remains functional.
Case 14: Existing GLB/GLTF export remains functional.
"""

import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.floor_plan_service import FloorPlanService, MAX_FILE_SIZE_BYTES
from app.schemas.floor_plan import FloorPlanAssociation
from app.services.floor_volume_service import FloorVolumeService
from app.schemas.property_volume import BuildingFloors3DRequest
from app.schemas.geometry_3d import Geometry3DStatus
from app.services.osm_service import (
    parse_numeric_height,
    parse_numeric_levels,
    parse_numeric_integer,
)

client = TestClient(app)

DUMMY_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF\n"
DUMMY_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
DUMMY_JPG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\xff\xd9"

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


@pytest.fixture(autouse=True)
def clean_registry():
    """Ensure every test starts with an empty floor plan registry."""
    FloorPlanService.clear_registry_for_testing()
    yield
    FloorPlanService.clear_registry_for_testing()


# ==============================================================================
# CASE 1: Floor without a floor plan (returns 404 / None)
# ==============================================================================
def test_case_1_floor_without_floor_plan():
    # Direct service lookup
    assoc = FloorPlanService.get_floor_plan("ds_tagore", "bld_101", "bld_101_fl01")
    assert assoc is None

    # HTTP endpoint lookup
    resp = client.get("/api/v1/floor-plans/ds_tagore/bld_101/bld_101_fl01")
    assert resp.status_code == 404
    err_msg = resp.json().get("message") or resp.json().get("detail", "")
    assert "No floor plan attached" in err_msg


# ==============================================================================
# CASE 2: Attach PDF to Floor 1 (.pdf, application/pdf) -> status 200, status Attached
# ==============================================================================
def test_case_2_attach_pdf_to_floor_1():
    files = {"file": ("ground_floor_plan.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data = {
        "dataset_id": "ds_tagore",
        "building_id": "bld_101",
        "floor_id": "bld_101_fl01",
    }
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 200
    body = resp.json()

    assert body["dataset_id"] == "ds_tagore"
    assert body["building_id"] == "bld_101"
    assert body["floor_id"] == "bld_101_fl01"
    assert body["filename"] == "ground_floor_plan.pdf"
    assert body["file_type"] == "PDF"
    assert body["mime_type"] == "application/pdf"
    assert body["file_size_bytes"] == len(DUMMY_PDF_BYTES)
    assert body["status"] == "Attached"
    assert body["source"] == "User-provided floor plan"
    assert "/api/v1/floor-plans/ds_tagore/bld_101/bld_101_fl01/view" in body["view_url"]
    assert Path(body["storage_path"]).exists()


# ==============================================================================
# CASE 3: Attach image to Floor 2 (.png, image/png) -> status 200, status Attached
# ==============================================================================
def test_case_3_attach_image_to_floor_2():
    files = {"file": ("first_floor_layout.png", io.BytesIO(DUMMY_PNG_BYTES), "image/png")}
    data = {
        "dataset_id": "ds_tagore",
        "building_id": "bld_101",
        "floor_id": "bld_101_fl02",
    }
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 200
    body = resp.json()

    assert body["dataset_id"] == "ds_tagore"
    assert body["building_id"] == "bld_101"
    assert body["floor_id"] == "bld_101_fl02"
    assert body["filename"] == "first_floor_layout.png"
    assert body["file_type"] == "PNG"
    assert body["mime_type"] == "image/png"
    assert body["status"] == "Attached"
    assert body["source"] == "User-provided floor plan"


# ==============================================================================
# CASE 4: Retrieve floor-plan association via GET endpoint and inline view
# ==============================================================================
def test_case_4_retrieve_floor_plan_get_and_view():
    # Setup attachment
    files = {"file": ("blueprint.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_202", "floor_id": "bld_202_fl01"}
    upload_resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert upload_resp.status_code == 200

    # 1. GET metadata
    get_resp = client.get("/api/v1/floor-plans/ds_tagore/bld_202/bld_202_fl01")
    assert get_resp.status_code == 200
    plan_meta = get_resp.json()
    assert plan_meta["floor_id"] == "bld_202_fl01"
    assert plan_meta["filename"] == "blueprint.pdf"
    assert plan_meta["file_type"] == "PDF"

    # 2. GET list for dataset
    list_resp = client.get("/api/v1/floor-plans/ds_tagore")
    assert list_resp.status_code == 200
    list_body = list_resp.json()
    assert list_body["dataset_id"] == "ds_tagore"
    assert list_body["total_count"] == 1
    assert list_body["floor_plans"][0]["floor_id"] == "bld_202_fl01"

    # 3. GET view stream (inline)
    view_resp = client.get("/api/v1/floor-plans/ds_tagore/bld_202/bld_202_fl01/view")
    assert view_resp.status_code == 200
    assert view_resp.headers["content-type"] == "application/pdf"
    assert 'inline; filename="blueprint.pdf"' in view_resp.headers["content-disposition"]
    assert view_resp.content == DUMMY_PDF_BYTES


# ==============================================================================
# CASE 5: Replace floor plan -> replaces file and metadata cleanly, cleans up old file
# ==============================================================================
def test_case_5_replace_floor_plan():
    # Initial upload (PDF)
    files1 = {"file": ("initial_plan.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_303", "floor_id": "bld_303_fl01"}
    resp1 = client.post("/api/v1/floor-plans/upload", data=data, files=files1)
    assert resp1.status_code == 200
    old_storage_path = Path(resp1.json()["storage_path"])
    assert old_storage_path.exists()

    # Replace with JPEG
    files2 = {"file": ("revised_layout.jpg", io.BytesIO(DUMMY_JPG_BYTES), "image/jpeg")}
    resp2 = client.post("/api/v1/floor-plans/upload", data=data, files=files2)
    assert resp2.status_code == 200
    new_data = resp2.json()

    assert new_data["filename"] == "revised_layout.jpg"
    assert new_data["file_type"] == "JPG"
    assert new_data["mime_type"] == "image/jpeg"
    new_storage_path = Path(new_data["storage_path"])
    assert new_storage_path.exists()

    # Ensure old file on disk was removed cleanly
    assert not old_storage_path.exists()

    # Registry has exactly 1 entry for this floor
    assoc = FloorPlanService.get_floor_plan("ds_tagore", "bld_303", "bld_303_fl01")
    assert assoc is not None
    assert assoc.filename == "revised_layout.jpg"


# ==============================================================================
# CASE 6: Remove floor plan -> removes association and deletes file
# ==============================================================================
def test_case_6_remove_floor_plan():
    files = {"file": ("temporary_plan.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_404", "floor_id": "bld_404_fl01"}
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 200
    storage_path = Path(resp.json()["storage_path"])
    assert storage_path.exists()

    # Delete
    del_resp = client.delete("/api/v1/floor-plans/ds_tagore/bld_404/bld_404_fl01")
    assert del_resp.status_code == 200
    del_body = del_resp.json()
    assert del_body["status"] == "success"
    assert del_body["floor_id"] == "bld_404_fl01"

    # Verify file is deleted from disk
    assert not storage_path.exists()

    # Verify subsequent GET returns 404
    get_resp = client.get("/api/v1/floor-plans/ds_tagore/bld_404/bld_404_fl01")
    assert get_resp.status_code == 404

    # Verify subsequent DELETE returns 404
    del_again_resp = client.delete("/api/v1/floor-plans/ds_tagore/bld_404/bld_404_fl01")
    assert del_again_resp.status_code == 404


# ==============================================================================
# CASE 7: Invalid file type rejected (e.g. .exe, .txt) -> HTTP 400
# ==============================================================================
def test_case_7_invalid_file_type_rejected():
    files = {"file": ("malicious_payload.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_505", "floor_id": "bld_505_fl01"}
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 400
    err_msg1 = resp.json().get("message") or resp.json().get("detail", "")
    assert "Unsupported file format" in err_msg1

    txt_files = {"file": ("notes.txt", io.BytesIO(b"Just some notes"), "text/plain")}
    resp_txt = client.post("/api/v1/floor-plans/upload", data=data, files=txt_files)
    assert resp_txt.status_code == 400
    err_msg2 = resp_txt.json().get("message") or resp_txt.json().get("detail", "")
    assert "Unsupported file format" in err_msg2


# ==============================================================================
# CASE 8: Oversized file rejected (> 10MB) -> HTTP 413
# ==============================================================================
def test_case_8_oversized_file_rejected():
    # 10 MB + 512 bytes
    oversized_data = b"0" * (MAX_FILE_SIZE_BYTES + 512)
    files = {"file": ("massive_blueprint.pdf", io.BytesIO(oversized_data), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_606", "floor_id": "bld_606_fl01"}
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 413
    err_msg = resp.json().get("message") or resp.json().get("detail", "")
    assert "exceeds maximum permitted size" in err_msg.lower()


# ==============================================================================
# CASE 9: Dataset isolation (Dataset A plan does not appear in Dataset B; switching back restores it)
# ==============================================================================
def test_case_9_dataset_isolation():
    # Upload to dataset A
    files = {"file": ("ds_a_plan.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data_a = {"dataset_id": "ds_tagore_garden", "building_id": "bld_same_id", "floor_id": "fl_01"}
    resp = client.post("/api/v1/floor-plans/upload", data=data_a, files=files)
    assert resp.status_code == 200

    # Query dataset B with identical building/floor id
    resp_b = client.get("/api/v1/floor-plans/ds_chandni_chowk/bld_same_id/fl_01")
    assert resp_b.status_code == 404

    # List dataset B -> 0 items
    list_b = client.get("/api/v1/floor-plans/ds_chandni_chowk")
    assert list_b.status_code == 200
    assert list_b.json()["total_count"] == 0

    # Query dataset A again -> 200 with plan
    resp_a = client.get("/api/v1/floor-plans/ds_tagore_garden/bld_same_id/fl_01")
    assert resp_a.status_code == 200
    assert resp_a.json()["filename"] == "ds_a_plan.pdf"


# ==============================================================================
# CASE 10: Floor isolation within same building (Floor 1 plan does not appear on Floor 2)
# ==============================================================================
def test_case_10_floor_isolation_same_building():
    # Attach to Floor 1 only
    files = {"file": ("floor_1_arch.pdf", io.BytesIO(DUMMY_PDF_BYTES), "application/pdf")}
    data = {"dataset_id": "ds_tagore", "building_id": "bld_707", "floor_id": "bld_707_fl01"}
    resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert resp.status_code == 200

    # Floor 2 has no plan
    resp_fl2 = client.get("/api/v1/floor-plans/ds_tagore/bld_707/bld_707_fl02")
    assert resp_fl2.status_code == 404

    # Floor -1 (Basement) has no plan
    resp_b01 = client.get("/api/v1/floor-plans/ds_tagore/bld_707/bld_707_b01")
    assert resp_b01.status_code == 404

    # Floor 1 has plan
    resp_fl1 = client.get("/api/v1/floor-plans/ds_tagore/bld_707/bld_707_fl01")
    assert resp_fl1.status_code == 200
    assert resp_fl1.json()["floor_id"] == "bld_707_fl01"


# ==============================================================================
# CASE 11: Existing floor geometry remains unchanged after attach/remove
# ==============================================================================
def test_case_11_floor_geometry_remains_unchanged():
    # 1. Generate floor solids
    req = BuildingFloors3DRequest(
        building_id="BLD-GEO-001",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=100.0,
        building_height=12.0,
        number_of_floors=3,
        number_of_basements=1,
    )
    gen_before = FloorVolumeService.generate_building_floors(req)
    assert gen_before.geometry_status == Geometry3DStatus.VALID
    assert gen_before.floor_count == 4

    fl0_before = gen_before.floors[1]  # Ground Floor
    volume_before = fl0_before.volume_cubic_m
    z_range_before = (fl0_before.base_elevation, fl0_before.top_elevation)
    polyhedral_parts_before = len(fl0_before.geometry.parts)

    # 2. Attach floor plan to Ground Floor
    files = {"file": ("blueprint.png", io.BytesIO(DUMMY_PNG_BYTES), "image/png")}
    data = {
        "dataset_id": "ds_tagore",
        "building_id": "BLD-GEO-001",
        "floor_id": fl0_before.floor_id,
    }
    upload_resp = client.post("/api/v1/floor-plans/upload", data=data, files=files)
    assert upload_resp.status_code == 200

    # Verify geometry regenerated or inspected is strictly identical
    gen_during = FloorVolumeService.generate_building_floors(req)
    fl0_during = gen_during.floors[1]
    assert fl0_during.volume_cubic_m == volume_before
    assert (fl0_during.base_elevation, fl0_during.top_elevation) == z_range_before
    assert len(fl0_during.geometry.parts) == polyhedral_parts_before
    assert fl0_during.geometry_status == Geometry3DStatus.VALID

    # 3. Remove floor plan
    del_resp = client.delete(f"/api/v1/floor-plans/ds_tagore/BLD-GEO-001/{fl0_before.floor_id}")
    assert del_resp.status_code == 200

    # Verify geometry remains strictly identical
    gen_after = FloorVolumeService.generate_building_floors(req)
    fl0_after = gen_after.floors[1]
    assert fl0_after.volume_cubic_m == volume_before
    assert (fl0_after.base_elevation, fl0_after.top_elevation) == z_range_before
    assert len(fl0_after.geometry.parts) == polyhedral_parts_before


# ==============================================================================
# CASE 12: Existing Step 1 workflow (floor/basement slicing) remains functional
# ==============================================================================
def test_case_12_step1_workflow_remains_functional():
    req = BuildingFloors3DRequest(
        building_id="BLD-STEP1-002",
        footprint_geometry=SQUARE_GEOJSON,
        ground_elevation=10.0,
        building_height=12.0,
        number_of_floors=3,
        number_of_basements=2,
    )
    res = FloorVolumeService.generate_building_floors(req)
    assert res.geometry_status == Geometry3DStatus.VALID
    assert res.floor_count == 5

    # Check basements
    b2 = res.floors[0]
    assert b2.floor_name == "Basement -2"
    assert b2.level_type == "Basement"
    assert b2.base_elevation == 4.0
    assert b2.top_elevation == 7.0

    b1 = res.floors[1]
    assert b1.floor_name == "Basement -1"
    assert b1.level_type == "Basement"
    assert b1.base_elevation == 7.0
    assert b1.top_elevation == 10.0

    # Check above ground
    g0 = res.floors[2]
    assert g0.floor_name == "Ground Floor"
    assert g0.base_elevation == 10.0
    assert g0.top_elevation == 14.0

    f1 = res.floors[3]
    assert f1.floor_name == "Floor 1"
    assert f1.base_elevation == 14.0
    assert f1.top_elevation == 18.0

    f2 = res.floors[4]
    assert f2.floor_name == "Floor 2"
    assert f2.base_elevation == 18.0
    assert f2.top_elevation == 22.0


# ==============================================================================
# CASE 13: Existing Step 2 source detection remains functional
# ==============================================================================
def test_case_13_step2_source_detection_remains_functional():
    tags = {
        "building": "commercial",
        "height": "16.5m",
        "building:levels": "4",
        "building:levels:underground": "1",
    }
    raw_h = parse_numeric_height(tags.get("height"))
    raw_l = parse_numeric_levels(tags.get("building:levels"))
    raw_u = parse_numeric_integer(tags.get("building:levels:underground"), min_val=0)

    assert raw_h == 16.5
    assert raw_l == 4
    assert raw_u == 1

    # Attribution tags
    height_source = "Source: OSM height" if raw_h is not None else "Configured / Derived"
    floors_source = "Source: OSM building:levels" if raw_l is not None else "Configured / Derived"
    basements_source = "Source: OSM building:levels:underground" if raw_u is not None else "Configured / Derived"

    assert height_source == "Source: OSM height"
    assert floors_source == "Source: OSM building:levels"
    assert basements_source == "Source: OSM building:levels:underground"


# ==============================================================================
# CASE 14: Existing GLB/GLTF export remains functional
# ==============================================================================
def test_case_14_glb_gltf_export_remains_functional():
    # Trigger 3D conversion and verify GLB and GLTF endpoints remain intact
    payload = {
        "default_building_height_m": 9.0,
        "target_crs": "auto",
        "export_format": "both",
    }
    resp = client.post("/api/v1/osm/convert-3d", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True

    # Check GLB download
    glb_resp = client.get("/api/v1/export/glb/latest")
    assert glb_resp.status_code == 200
    assert glb_resp.headers["content-type"] == "model/gltf-binary"
    assert glb_resp.content[:4] == b"glTF"

    # Check GLTF download
    gltf_resp = client.get("/api/v1/export/gltf/latest")
    assert gltf_resp.status_code == 200
