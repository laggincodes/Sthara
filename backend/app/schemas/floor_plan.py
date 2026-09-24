from typing import Optional, List
from pydantic import BaseModel, Field


class FloorPlanAssociation(BaseModel):
    """
    Metadata representation of an attached floor plan / blueprint document
    associated strictly with a specific (dataset_id, building_id, floor_id).
    """
    floor_plan_id: str = Field(..., description="Unique floor plan identifier (e.g. FP-b3a1f9...)")
    dataset_id: str = Field(..., description="Dataset identifier that strictly scopes this association")
    building_id: str = Field(..., description="Parent building structure identifier")
    floor_id: str = Field(..., description="Specific floor/level identifier")
    filename: str = Field(..., description="Sanitized original document filename")
    file_type: str = Field(..., description="File format category: PDF, PNG, or JPG")
    mime_type: str = Field(..., description="MIME content type (e.g. application/pdf, image/png)")
    file_size_bytes: int = Field(..., description="Document file size in bytes")
    storage_path: str = Field(..., description="Internal storage path on disk")
    view_url: str = Field(..., description="REST endpoint to stream or preview the document")
    uploaded_at: str = Field(..., description="ISO 8601 UTC timestamp of document upload")
    source: str = Field(default="User-provided floor plan", description="Provenance of the document")
    status: str = Field(default="Attached", description="Association status: Attached or Removed")


class FloorPlanListResponse(BaseModel):
    """
    Container response for dataset-scoped floor plan associations.
    """
    dataset_id: str
    total_count: int
    floor_plans: List[FloorPlanAssociation]


class FloorPlanDeleteResponse(BaseModel):
    """
    Response returned upon removing a floor plan association.
    """
    status: str = "success"
    message: str
    dataset_id: str
    building_id: str
    floor_id: str
