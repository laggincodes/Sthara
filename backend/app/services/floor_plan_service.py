import os
import re
import json
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.schemas.floor_plan import FloorPlanAssociation
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
UPLOAD_FLOOR_PLANS_DIR = DATA_DIR / "uploads" / "floor_plans"
REGISTRY_PATH = DATA_DIR / "processed" / "floor_plans_registry.json"

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS_MAP = {
    ".pdf": ("PDF", "application/pdf"),
    ".png": ("PNG", "image/png"),
    ".jpg": ("JPG", "image/jpeg"),
    ".jpeg": ("JPG", "image/jpeg"),
}


def sanitize_filename(filename: str) -> str:
    """Removes path traversal characters and unsafe symbols from filename."""
    base_name = os.path.basename(filename)
    sanitized = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    return sanitized or "floor_plan_document"


def _make_key(dataset_id: str, building_id: str, floor_id: str) -> str:
    return f"{dataset_id.strip()}:{building_id.strip()}:{floor_id.strip()}"


class FloorPlanService:
    """
    Manages storage and metadata associations between generated 3D floors
    and uploaded floor plan / blueprint documents.
    """

    @classmethod
    def _ensure_dirs(cls) -> None:
        UPLOAD_FLOOR_PLANS_DIR.mkdir(parents=True, exist_ok=True)
        REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)

    @classmethod
    def _load_registry(cls) -> Dict[str, Dict[str, Any]]:
        cls._ensure_dirs()
        if not REGISTRY_PATH.exists():
            return {}
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading floor plans registry: {e}. Reinitializing empty.")
            return {}

    @classmethod
    def _save_registry(cls, registry: Dict[str, Dict[str, Any]]) -> None:
        cls._ensure_dirs()
        tmp_path = REGISTRY_PATH.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
        tmp_path.replace(REGISTRY_PATH)

    @classmethod
    def validate_file(cls, filename: str, content_bytes: bytes, mime_type: Optional[str] = None) -> Tuple[str, str]:
        """
        Validates extension, size, and MIME type.
        Returns (file_type_category, resolved_mime_type).
        Raises ValueError if invalid.
        """
        if len(content_bytes) == 0:
            raise ValueError("Uploaded floor plan file cannot be empty (0 bytes).")

        if len(content_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File size ({len(content_bytes) / (1024 * 1024):.1f} MB) exceeds maximum permitted limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            )

        clean_name = sanitize_filename(filename)
        ext = Path(clean_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS_MAP:
            allowed_list = ", ".join(ALLOWED_EXTENSIONS_MAP.keys())
            raise ValueError(
                f"Unsupported file format '{ext}'. Permitted formats for floor plans are: {allowed_list}."
            )

        category, expected_mime = ALLOWED_EXTENSIONS_MAP[ext]
        resolved_mime = expected_mime

        # If client provided MIME type, ensure it doesn't conflict dangerously
        if mime_type:
            clean_mime = mime_type.lower().split(";")[0].strip()
            if clean_mime in ("application/pdf", "image/png", "image/jpeg", "image/jpg"):
                resolved_mime = "image/jpeg" if clean_mime == "image/jpg" else clean_mime

        return category, resolved_mime

    @classmethod
    def attach_floor_plan(
        cls,
        dataset_id: str,
        building_id: str,
        floor_id: str,
        filename: str,
        content_bytes: bytes,
        mime_type: Optional[str] = None,
    ) -> FloorPlanAssociation:
        """
        Validates file, writes to disk, associates with (dataset_id, building_id, floor_id),
        and updates the persistent registry.
        """
        dataset_id = dataset_id.strip()
        building_id = building_id.strip()
        floor_id = floor_id.strip()

        if not dataset_id or not building_id or not floor_id:
            raise ValueError("dataset_id, building_id, and floor_id must all be non-empty strings.")

        category, resolved_mime = cls.validate_file(filename, content_bytes, mime_type)
        clean_filename = sanitize_filename(filename)

        key = _make_key(dataset_id, building_id, floor_id)
        registry = cls._load_registry()

        # If previous floor plan existed for this exact floor, remove old file from disk
        if key in registry:
            old_storage_path = registry[key].get("storage_path")
            if old_storage_path:
                try:
                    old_path = Path(old_storage_path)
                    if old_path.exists():
                        old_path.unlink()
                except Exception as e:
                    logger.warning(f"Could not remove old floor plan file '{old_storage_path}': {e}")

        # Destination directory for this building's floor plans
        safe_ds = sanitize_filename(dataset_id)
        safe_bld = sanitize_filename(building_id)
        safe_fl = sanitize_filename(floor_id)

        target_dir = UPLOAD_FLOOR_PLANS_DIR / safe_ds / safe_bld
        target_dir.mkdir(parents=True, exist_ok=True)

        target_file = target_dir / f"{safe_fl}_{clean_filename}"
        with open(target_file, "wb") as f:
            f.write(content_bytes)

        # Unique deterministic association ID
        hash_digest = hashlib.sha256(f"{key}:{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()[:12]
        fp_id = f"FP-{safe_fl}-{hash_digest}"

        view_url = f"/api/v1/floor-plans/{dataset_id}/{building_id}/{floor_id}/view"
        now_iso = datetime.now(timezone.utc).isoformat()

        assoc = FloorPlanAssociation(
            floor_plan_id=fp_id,
            dataset_id=dataset_id,
            building_id=building_id,
            floor_id=floor_id,
            filename=clean_filename,
            file_type=category,
            mime_type=resolved_mime,
            file_size_bytes=len(content_bytes),
            storage_path=str(target_file),
            view_url=view_url,
            uploaded_at=now_iso,
            source="User-provided floor plan",
            status="Attached",
        )

        registry[key] = assoc.model_dump()
        cls._save_registry(registry)

        logger.info(
            f"Floor plan attached: dataset='{dataset_id}' building='{building_id}' floor='{floor_id}' -> '{clean_filename}' ({category}, {len(content_bytes)} bytes)"
        )
        return assoc

    @classmethod
    def get_floor_plan(cls, dataset_id: str, building_id: str, floor_id: str) -> Optional[FloorPlanAssociation]:
        """Retrieves floor plan association scoped strictly to dataset, building, and floor."""
        key = _make_key(dataset_id, building_id, floor_id)
        registry = cls._load_registry()
        entry = registry.get(key)
        if not entry:
            return None
        # Strict dataset isolation check
        if entry.get("dataset_id") != dataset_id.strip():
            return None
        return FloorPlanAssociation(**entry)

    @classmethod
    def list_dataset_floor_plans(cls, dataset_id: str) -> List[FloorPlanAssociation]:
        """Lists all floor plan associations strictly belonging to the given dataset."""
        ds_clean = dataset_id.strip()
        registry = cls._load_registry()
        results: List[FloorPlanAssociation] = []
        for entry in registry.values():
            if entry.get("dataset_id") == ds_clean:
                results.append(FloorPlanAssociation(**entry))
        return results

    @classmethod
    def remove_floor_plan(cls, dataset_id: str, building_id: str, floor_id: str) -> bool:
        """
        Removes the association and deletes the stored document file.
        Preserves floor geometry and 3D solids.
        """
        key = _make_key(dataset_id, building_id, floor_id)
        registry = cls._load_registry()
        if key not in registry:
            return False

        entry = registry[key]
        storage_path = entry.get("storage_path")
        if storage_path:
            try:
                p = Path(storage_path)
                if p.exists():
                    p.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete floor plan file '{storage_path}': {e}")

        del registry[key]
        cls._save_registry(registry)
        logger.info(f"Floor plan removed: dataset='{dataset_id}' building='{building_id}' floor='{floor_id}'")
        return True

    @classmethod
    def get_file_for_view(
        cls, dataset_id: str, building_id: str, floor_id: str
    ) -> Optional[Tuple[Path, str, str]]:
        """
        Returns (Path, mime_type, filename) for streaming preview or download.
        """
        assoc = cls.get_floor_plan(dataset_id, building_id, floor_id)
        if not assoc:
            return None
        p = Path(assoc.storage_path)
        if not p.exists():
            return None
        return p, assoc.mime_type, assoc.filename

    @classmethod
    def clear_registry_for_testing(cls) -> None:
        """Test helper to clear registry and test files."""
        cls._save_registry({})
        if UPLOAD_FLOOR_PLANS_DIR.exists():
            for child in UPLOAD_FLOOR_PLANS_DIR.iterdir():
                if child.is_dir():
                    import shutil
                    shutil.rmtree(child, ignore_errors=True)
