import os
import re
import json
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from app.schemas.building_blueprint import BuildingBlueprintRecord
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
UPLOAD_BUILDING_BLUEPRINTS_DIR = DATA_DIR / "uploads" / "building_blueprints"
REGISTRY_PATH = DATA_DIR / "processed" / "building_blueprints_registry.json"

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
    return sanitized or "building_blueprint_document"


def _make_key(dataset_id: str, building_id: str) -> str:
    return f"{dataset_id.strip()}:{building_id.strip()}"


class BuildingBlueprintService:
    """
    Manages storage and metadata associations for building-level blueprint attachments.
    Keyed strictly by (dataset_id, building_id).
    """

    @classmethod
    def _ensure_dirs(cls) -> None:
        UPLOAD_BUILDING_BLUEPRINTS_DIR.mkdir(parents=True, exist_ok=True)
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
            logger.warning(f"Error loading building blueprints registry: {e}. Reinitializing empty.")
            return {}

    @classmethod
    def _save_registry(cls, registry: Dict[str, Dict[str, Any]]) -> None:
        cls._ensure_dirs()
        tmp_path = REGISTRY_PATH.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)
        tmp_path.replace(REGISTRY_PATH)

    @classmethod
    def validate_file(
        cls, filename: str, content_bytes: bytes, mime_type: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Validates file extension, size (<= 10MB), non-empty, and MIME type.
        Returns (file_type_category, resolved_mime_type).
        Raises ValueError if invalid.
        """
        if len(content_bytes) == 0:
            raise ValueError("Uploaded building blueprint file cannot be empty (0 bytes).")

        if len(content_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File size ({len(content_bytes) / (1024 * 1024):.1f} MB) exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            )

        clean_name = sanitize_filename(filename)
        ext = Path(clean_name).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS_MAP:
            allowed_list = ", ".join(ALLOWED_EXTENSIONS_MAP.keys())
            raise ValueError(
                f"Unsupported file format '{ext}'. Permitted formats for building blueprints are: {allowed_list}."
            )

        category, expected_mime = ALLOWED_EXTENSIONS_MAP[ext]
        resolved_mime = expected_mime

        if mime_type:
            clean_mime = mime_type.lower().split(";")[0].strip()
            if clean_mime in ("application/pdf", "image/png", "image/jpeg", "image/jpg"):
                resolved_mime = "image/jpeg" if clean_mime == "image/jpg" else clean_mime

        return category, resolved_mime

    @classmethod
    def attach_building_blueprint(
        cls,
        dataset_id: str,
        building_id: str,
        filename: str,
        content_bytes: bytes,
        mime_type: Optional[str] = None,
    ) -> BuildingBlueprintRecord:
        """
        Validates file, writes to disk under uploads/building_blueprints/{dataset_id}/{building_id}/,
        associates with building, and updates persistent registry.
        Replaces any previously attached building blueprint safely.
        """
        dataset_id = dataset_id.strip()
        building_id = building_id.strip()

        if not dataset_id or not building_id:
            raise ValueError("dataset_id and building_id must be non-empty strings.")

        category, resolved_mime = cls.validate_file(filename, content_bytes, mime_type)
        clean_filename = sanitize_filename(filename)

        key = _make_key(dataset_id, building_id)
        registry = cls._load_registry()

        # Remove old blueprint file from disk if replacing
        if key in registry:
            old_storage_path = registry[key].get("storage_path")
            if old_storage_path:
                try:
                    old_path = Path(old_storage_path)
                    if old_path.exists():
                        old_path.unlink()
                except Exception as e:
                    logger.warning(f"Could not remove old building blueprint file '{old_storage_path}': {e}")

        safe_ds = sanitize_filename(dataset_id)
        safe_bld = sanitize_filename(building_id)

        target_dir = UPLOAD_BUILDING_BLUEPRINTS_DIR / safe_ds / safe_bld
        target_dir.mkdir(parents=True, exist_ok=True)

        target_file = target_dir / f"{safe_bld}_{clean_filename}"
        with open(target_file, "wb") as f:
            f.write(content_bytes)

        blueprint_id = f"BBP-{uuid.uuid4().hex[:8]}"
        view_url = f"/api/v1/building-blueprints/{dataset_id}/{building_id}/view"
        now_iso = datetime.now(timezone.utc).isoformat()

        record = BuildingBlueprintRecord(
            building_blueprint_id=blueprint_id,
            dataset_id=dataset_id,
            building_id=building_id,
            filename=clean_filename,
            file_type=category,
            mime_type=resolved_mime,
            file_size_bytes=len(content_bytes),
            storage_path=str(target_file.resolve()),
            view_url=view_url,
            uploaded_at=now_iso,
            source="User-provided building blueprint",
            status="Attached",
        )

        registry[key] = record.model_dump()
        cls._save_registry(registry)

        logger.info(
            f"Successfully attached building blueprint '{clean_filename}' for building '{building_id}' (Dataset '{dataset_id}')."
        )
        return record

    @classmethod
    def get_building_blueprint(
        cls, dataset_id: str, building_id: str
    ) -> Optional[BuildingBlueprintRecord]:
        """Retrieves building blueprint record for dataset_id + building_id."""
        key = _make_key(dataset_id, building_id)
        registry = cls._load_registry()
        if key not in registry:
            return None

        raw_data = registry[key]
        storage_path = raw_data.get("storage_path")
        if storage_path and not Path(storage_path).exists():
            logger.warning(f"Building blueprint file missing from disk: '{storage_path}'")

        return BuildingBlueprintRecord(**raw_data)

    @classmethod
    def list_dataset_blueprints(cls, dataset_id: str) -> list:
        """Retrieves all building blueprint records under dataset_id."""
        registry = cls._load_registry()
        prefix = f"{dataset_id.strip()}:"
        records = []
        for key, raw_data in registry.items():
            if key.startswith(prefix):
                records.append(BuildingBlueprintRecord(**raw_data))
        return records

    @classmethod
    def remove_building_blueprint(cls, dataset_id: str, building_id: str) -> bool:
        """Removes building blueprint attachment and deletes file from disk."""
        key = _make_key(dataset_id, building_id)
        registry = cls._load_registry()

        if key not in registry:
            return False

        old_data = registry.pop(key)
        cls._save_registry(registry)

        old_storage_path = old_data.get("storage_path")
        if old_storage_path:
            try:
                old_path = Path(old_storage_path)
                if old_path.exists():
                    old_path.unlink()
            except Exception as e:
                logger.warning(f"Error unlinking blueprint file '{old_storage_path}': {e}")

        logger.info(f"Removed building blueprint for building '{building_id}' (Dataset '{dataset_id}').")
        return True

    @classmethod
    def get_file_for_view(cls, dataset_id: str, building_id: str) -> Tuple[Path, str, str]:
        """
        Returns (file_path, mime_type, filename) for serving blueprint file.
        Raises FileNotFoundError or ValueError if missing.
        """
        record = cls.get_building_blueprint(dataset_id, building_id)
        if not record:
            raise FileNotFoundError(
                f"No building blueprint registered for building '{building_id}' in dataset '{dataset_id}'."
            )

        file_path = Path(record.storage_path)
        if not file_path.exists():
            raise FileNotFoundError(
                f"Building blueprint file '{record.filename}' not found at disk location."
            )

        return file_path, record.mime_type, record.filename
