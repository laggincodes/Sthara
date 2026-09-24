"""
Pydantic schemas for STHARA Unified Project Data Entry & Multi-Source Analysis.
Orchestrates Map (OSM/GeoJSON), Architectural Plans, Structural Sheets, and Reference Data.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator
from datetime import datetime, timezone

from app.schemas.drawing_intelligence import (

    DrawingAnalysis,
    SpatialSourceStatus,
    ConfidenceLevel,
)


class ProjectSourceCategory(str, Enum):
    MAP_SOURCE = "MAP_SOURCE"
    ARCHITECTURAL_DRAWING = "ARCHITECTURAL_DRAWING"
    STRUCTURAL_DRAWING = "STRUCTURAL_DRAWING"
    REFERENCE_DOCUMENT = "REFERENCE_DOCUMENT"
    UNKNOWN = "UNKNOWN"


class ProjectFileManifestItem(BaseModel):
    """Descriptor for an individual uploaded or staged project file."""
    filename: str
    file_type: str  # "GEOJSON", "OSM", "PDF", "IMAGE", "JSON", "UNKNOWN"
    size_bytes: int
    category: ProjectSourceCategory
    detected_subtypes: List[str] = Field(default_factory=list)
    page_count: Optional[int] = None
    feature_count: Optional[int] = None
    confidence: float = 0.95
    status: str = "PROCESSED"  # "PROCESSED", "READY", "WARNING", "ERROR"
    details: Dict[str, Any] = Field(default_factory=dict)


class BuildingCorrelationMatch(BaseModel):
    """Represents spatial correlation between OSM/GeoJSON building candidates and drawing building candidates."""
    correlation_id: str
    drawing_building_name: str
    drawing_candidate_id: str
    drawing_area_sqm: float
    drawing_dimensions: str
    osm_building_id: Optional[str] = None
    osm_building_name: Optional[str] = None
    osm_area_sqm: Optional[float] = None
    area_difference_pct: Optional[float] = None
    match_confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    match_score: float = Field(0.94, ge=0.0, le=1.0)
    status: str = "SUGGESTED_MATCH"  # "SUGGESTED_MATCH", "CONFIRMED", "KEPT_SEPARATE"
    correlation_factors: List[str] = Field(default_factory=list)


class SpatialEvidenceSummary(BaseModel):
    """High-level spatial checklist of detected intelligence across all project sources."""
    map_available: bool = False
    site_plan_detected: bool = False
    building_plan_detected: bool = False
    floor_plans_detected: bool = False
    sections_detected: bool = False
    structural_evidence_available: bool = False
    total_sources_count: int = 0


class ProcessingStage(BaseModel):
    """State of an individual step in the unified 10-stage analysis pipeline."""
    stage_index: int
    stage_name: str
    status: str = "complete"  # "pending", "running", "complete", "skipped", "error"
    message: Optional[str] = None


class UnifiedProjectDataAnalysis(BaseModel):
    """Complete aggregated response for unified project data entry and multi-source analysis."""
    analysis_id: str
    project_id: str = ""
    dataset_id: str
    dataset_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    mode: str = "MAP_AND_DRAWINGS"  # "MAP_AND_DRAWINGS" | "DRAWING_ONLY"
    map_status: str = "NOT_PROVIDED"  # "AVAILABLE" | "EMPTY" | "NOT_PROVIDED"
    drawing_mode: str = "AVAILABLE"  # "AVAILABLE" | "NOT_PROVIDED"
    manifest: List[ProjectFileManifestItem] = Field(default_factory=list)
    files: List[Dict[str, Any]] = Field(default_factory=list)
    drawings: List[Dict[str, Any]] = Field(default_factory=list)
    map_sources: List[Dict[str, Any]] = Field(default_factory=list)
    building_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    floor_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    unit_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    provenance: List[Dict[str, Any]] = Field(default_factory=list)
    spatial_source_status: SpatialSourceStatus
    drawing_analysis: Optional[DrawingAnalysis] = None
    map_feature_count: int = 0
    building_correlations: List[BuildingCorrelationMatch] = Field(default_factory=list)
    spatial_evidence_summary: SpatialEvidenceSummary
    processing_stages: List[ProcessingStage] = Field(default_factory=list)
    recommended_action: str = "BUILD_STHARA_MODEL"
    message: str = "Project data analyzed successfully."

    @model_validator(mode="before")
    @classmethod
    def populate_defaults(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("project_id"):
                data["project_id"] = data.get("dataset_id", "")
        return data


class BuildingCorrelationUpdateRequest(BaseModel):
    """User confirmation or override for a building candidate correlation."""
    status: str = Field(..., description="'CONFIRMED' or 'KEPT_SEPARATE'")
    target_osm_building_id: Optional[str] = None
