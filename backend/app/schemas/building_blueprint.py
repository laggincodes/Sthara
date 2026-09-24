from pydantic import BaseModel, Field
from typing import Optional, List


class BuildingBlueprintRecord(BaseModel):
    """
    Metadata record for a building-level blueprint attachment.
    Applies to the entire building (dataset_id + building_id).
    """

    building_blueprint_id: str = Field(
        ..., description="Unique building blueprint ID (e.g. BBP-a3f892c...)"
    )
    dataset_id: str = Field(..., description="Associated dataset ID")
    building_id: str = Field(..., description="Associated building ID")
    filename: str = Field(..., description="Sanitized original filename")
    file_type: str = Field(..., description="File format category: PDF, PNG, JPG")
    mime_type: str = Field(..., description="Resolved MIME content type")
    file_size_bytes: int = Field(..., description="File size in bytes")
    storage_path: str = Field(..., description="Absolute storage path on disk")
    view_url: str = Field(..., description="Relative API view URL")
    uploaded_at: str = Field(..., description="ISO 8601 upload timestamp")
    source: str = Field(
        "User-provided building blueprint",
        description="Source attribution for building blueprint document",
    )
    status: str = Field("Attached", description="Blueprint attachment status")


class BuildingBlueprintResponse(BaseModel):
    """API envelope response for building blueprint operations."""

    success: bool = True
    attached: bool = True
    blueprint: Optional[BuildingBlueprintRecord] = None
    message: str = "Building blueprint operation completed successfully."
