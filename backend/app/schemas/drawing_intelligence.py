"""
Pydantic schemas for STHARA Drawing Intelligence v1.
Controlled Document-to-Spatial Model / Plan-to-3D Pipeline.
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DrawingType(str, Enum):
    LOCATION_PLAN = "LOCATION_PLAN"
    SITE_PLAN = "SITE_PLAN"
    MASTER_PLAN = "MASTER_PLAN"
    GROUND_FLOOR_PLAN = "GROUND_FLOOR_PLAN"
    FLOOR_PLAN = "FLOOR_PLAN"
    TYPICAL_FLOOR_PLAN = "TYPICAL_FLOOR_PLAN"
    BASEMENT_PLAN = "BASEMENT_PLAN"
    ROOF_PLAN = "ROOF_PLAN"
    SECTION = "SECTION"
    ELEVATION = "ELEVATION"
    STRUCTURAL_PLAN = "STRUCTURAL_PLAN"
    FOUNDATION_PLAN = "FOUNDATION_PLAN"
    OTHER = "OTHER"


class CandidateType(str, Enum):
    SITE_BOUNDARY = "SITE_BOUNDARY"
    BUILDING_FOOTPRINT = "BUILDING_FOOTPRINT"
    FLOOR = "FLOOR"
    TYPICAL_FLOOR = "TYPICAL_FLOOR"
    UNIT = "UNIT"
    ROOM = "ROOM"
    SECTION_PROFILE = "SECTION_PROFILE"
    STRUCTURAL_GRID = "STRUCTURAL_GRID"


class CandidateStatus(str, Enum):
    UNRESOLVED = "UNRESOLVED"
    REVIEW = "REVIEW"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNRESOLVED = "UNRESOLVED"


class DocumentRole(str, Enum):
    PRIMARY_SPATIAL = "PRIMARY_SPATIAL"          # Architectural sheets
    SUPPORTING_STRUCTURAL = "SUPPORTING_STRUCTURAL" # Structural sheets
    REFERENCE_CONTEXT = "REFERENCE_CONTEXT"         # Site / survey sheets


class NormalizedBBox(BaseModel):
    """Bounding box normalized to [0.0, 1.0] relative to page dimensions."""
    ymin: float = Field(..., ge=0.0, le=1.0)
    xmin: float = Field(..., ge=0.0, le=1.0)
    ymax: float = Field(..., ge=0.0, le=1.0)
    xmax: float = Field(..., ge=0.0, le=1.0)


class DrawingEvidence(BaseModel):
    evidence_id: str
    region_id: Optional[str] = None
    document_id: str
    source_filename: str
    page_number: int
    evidence_type: str  # e.g. "OCR_TEXT", "VECTOR_GEOMETRY", "SECTION_DIMENSION", "DRAWING_LABEL"
    fact: str           # e.g. "typical_floor_range", "floor_to_floor_height", "scale", "unit_label"
    value: Any          # e.g. "Floors 1-6", 3.20, "1:100", "Unit A-01"
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    raw_text: Optional[str] = None


class DrawingRegion(BaseModel):
    region_id: str
    document_id: str
    page_number: int
    bbox: NormalizedBBox
    drawing_type: DrawingType
    title: str
    scale: Optional[str] = "1:100"
    scale_confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    evidence_ids: List[str] = Field(default_factory=list)


class DrawingCandidate(BaseModel):
    candidate_id: str
    region_id: str
    document_id: str
    source_filename: str
    page_number: int
    candidate_type: CandidateType
    name: str
    status: CandidateStatus = CandidateStatus.REVIEW
    confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
    confidence_score: float = 0.85
    
    # Normalized 2D polygon in [0, 1] relative to page image coords: [[x, y], ...]
    polygon_normalized: List[List[float]] = Field(default_factory=list)
    
    # Optional transformed local metric polygon in meters: [[x, y], ...]
    polygon_metric: Optional[List[List[float]]] = None
    
    # Vertical Z metrics (in meters)
    base_elevation: Optional[float] = None
    top_elevation: Optional[float] = None
    height: Optional[float] = None
    area_sqm: Optional[float] = None
    
    # Floor specific properties
    floor_number: Optional[int] = None
    floor_range: Optional[List[int]] = None  # e.g. [1, 2, 3, 4, 5, 6] for typical floor
    
    # Unit specific properties
    parent_floor_candidate_id: Optional[str] = None
    unit_number: Optional[str] = None
    rooms: Optional[List[str]] = None
    
    properties: Dict[str, Any] = Field(default_factory=dict)
    evidence_ids: List[str] = Field(default_factory=list)
    confirmation_method: Optional[str] = None  # "AUTO_ACCEPTED", "USER_CONFIRMED", "MANUALLY_EDITED"


class DrawingPage(BaseModel):
    page_id: str
    document_id: str
    page_number: int
    width_px: int
    height_px: int
    original_image_url: str
    processed_image_url: str
    detected_types: List[DrawingType] = Field(default_factory=list)
    region_count: int = 0
    candidate_count: int = 0
    status: str = "PROCESSED"


class DrawingDocument(BaseModel):
    document_id: str
    dataset_id: str
    filename: str
    mime_type: str
    size_bytes: int
    page_count: int
    role: DocumentRole = DocumentRole.PRIMARY_SPATIAL
    primary_drawing_type: DrawingType = DrawingType.OTHER
    status: str = "ANALYZED"  # "UPLOADED", "PROCESSING", "ANALYZED", "REVIEW", "CONFIRMED", "FAILED"
    pages: List[DrawingPage] = Field(default_factory=list)
    sha256_hash: str
    uploaded_at: str


class DrawingAnalysisSummary(BaseModel):
    total_documents: int
    total_pages: int
    total_regions: int
    total_candidates: int
    confirmed_candidates: int
    building_candidates_count: int
    floor_candidates_count: int
    unit_candidates_count: int
    detected_floors_count: int
    estimated_total_height_m: Optional[float] = None
    detected_scale: Optional[str] = None
    overall_confidence: ConfidenceLevel = ConfidenceLevel.HIGH


class DrawingAnalysis(BaseModel):
    analysis_id: str
    dataset_id: str
    created_at: str
    updated_at: str
    status: str = "ANALYZED"  # "QUEUED", "PROCESSING", "ANALYZED", "REVIEW", "MODEL_GENERATED", "FAILED"
    documents: List[DrawingDocument] = Field(default_factory=list)
    regions: List[DrawingRegion] = Field(default_factory=list)
    candidates: List[DrawingCandidate] = Field(default_factory=list)
    evidence: List[DrawingEvidence] = Field(default_factory=list)
    summary: DrawingAnalysisSummary
    logs: List[str] = Field(default_factory=list)


class DrawingCandidateUpdate(BaseModel):
    status: Optional[CandidateStatus] = None
    name: Optional[str] = None
    polygon_normalized: Optional[List[List[float]]] = None
    floor_range: Optional[List[int]] = None
    height: Optional[float] = None
    base_elevation: Optional[float] = None
    top_elevation: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None


class SpatialSourceMode(str, Enum):
    OSM_AND_DRAWINGS = "OSM_AND_DRAWINGS"    # Mode A: Both sources active and correlated
    DRAWINGS_ONLY = "DRAWINGS_ONLY"          # Mode B: Empty / missing OSM; drawings form primary source
    OSM_ONLY = "OSM_ONLY"                    # Existing OSM workflow without drawings
    EMPTY = "EMPTY"                          # No OSM and no drawings


class SpatialSourceStatus(BaseModel):
    dataset_id: str
    osm_available: bool
    osm_dataset_exists: bool
    osm_feature_count: int
    osm_building_count: int
    osm_geometry_valid: bool
    drawing_available: bool
    drawing_count: int
    drawing_analysis_id: Optional[str] = None
    active_mode: SpatialSourceMode
    active_mode_label: str
    description: str
    geographic_status: str = "UNRESOLVED_LOCAL_SPACE"


class GeographicPositioning(BaseModel):
    positioning_method: str = "LOCAL_DRAWING_SPACE"  # "LOCAL_DRAWING_SPACE", "GEOREFERENCED", "SURVEY_CONTROL_POINTS"
    geographic_status: str = "UNRESOLVED_LOCAL_SPACE"  # "UNRESOLVED_LOCAL_SPACE", "POSITIONED"
    scale: Optional[float] = 1.0
    rotation_deg: Optional[float] = 0.0
    translation: Optional[List[float]] = None  # [dx, dy]
    anchor_coordinates: Optional[List[float]] = None  # [lon, lat]
    control_points: Optional[List[Dict[str, Any]]] = None
    confidence: Optional[str] = "UNRESOLVED"


class BuildModelRequest(BaseModel):
    target_building_id: Optional[str] = None   # Target building ID (e.g. "DRAWING-B001" or OSM ID)
    target_building_name: Optional[str] = "Building 01 (Project Drawings)"
    ground_elevation: Optional[float] = 0.0
    apply_units_to_all_typical_floors: bool = True
    match_to_osm_footprint: bool = False
    create_as_drawing_only: bool = False       # Force creation as independent drawing-derived building
    positioning: Optional[GeographicPositioning] = None


class BuildModelResponse(BaseModel):
    status: str = "SUCCESS"
    dataset_id: str
    building_id: str
    building_name: str
    number_of_floors: int
    floors_created: List[str]
    units_created_count: int
    unit_ids: List[str]
    total_height_m: float
    ground_elevation_m: float
    ulpin_prototypes: Dict[str, str] = Field(default_factory=dict)
    watertight_3d: bool = True
    geographic_status: str = "UNRESOLVED_LOCAL_SPACE"
    spatial_source: str = "Drawing Intelligence / User-provided project drawings"
    provenance: Dict[str, Any]
    message: str
