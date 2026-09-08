"""
Schemas and contracts for the AI/ML Extraction Subsystem.

Conforms strictly to the STHARA Separation of Concerns:
    AI = CANDIDATE EXTRACTION
    3D ENGINE = DETERMINISTIC MODELLING
    TOPOLOGY = DETERMINISTIC VALIDATION
    CADASTRE = AUTHORITATIVE LEGAL RECORDS

AI-extracted features are strictly candidate evidence. They never silently
become authoritative geometry, never fabricate legal ownership, and never
bypass deterministic validation.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExtractionType(str, Enum):
    """Supported candidate extraction feature types."""
    BUILDING = "BUILDING"
    FLOOR = "FLOOR"
    UNIT = "UNIT"
    VERTICAL_FEATURE = "VERTICAL_FEATURE"


class CandidateStatus(str, Enum):
    """Lifecycle and review status of an extracted candidate."""
    CANDIDATE = "CANDIDATE"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNAVAILABLE = "UNAVAILABLE"


class ConfidenceLevel(str, Enum):
    """Categorical confidence classification with documented thresholds."""
    HIGH = "HIGH"          # >= 0.80
    MEDIUM = "MEDIUM"      # 0.50 - 0.79
    LOW = "LOW"            # < 0.50
    UNAVAILABLE = "UNAVAILABLE"


class ExtractionMethod(str, Enum):
    """Authoritative method provenance for extracted features."""
    SOURCE_DATA = "SOURCE_DATA"                  # Authentic external source (e.g. OSM)
    AI_CV_MORPHOLOGICAL = "AI_CV_MORPHOLOGICAL"  # Classical Otsu & contour binarization
    AI_NDSM_SEGMENTATION = "AI_NDSM_SEGMENTATION"# Elevation-delta segmentation (DSM - DTM)
    AI_HISTOGRAM_INTERVAL = "AI_HISTOGRAM_INTERVAL"# 1D point density / height peak clustering
    AI_FLOORPLAN_PARTITION = "AI_FLOORPLAN_PARTITION"# Floor interior boundary partitioning
    SYNTHETIC_BENCHMARK = "SYNTHETIC_BENCHMARK"  # Reproducible deterministic test benchmark


class ModelMetadata(BaseModel):
    """Metadata record for a registered AI/ML or CV extraction model."""
    model_id: str = Field(..., description="Unique identifier of the model/extractor")
    model_version: str = Field(..., description="Semantic version of the model")
    task: ExtractionType = Field(..., description="Primary extraction task")
    framework: str = Field(..., description="Underlying technology stack (e.g. numpy+rasterio, PyTorch, Open3D)")
    input_type: str = Field(..., description="Supported input format (e.g. RASTER_TIFF, POINT_CLOUD, VECTOR_JSON)")
    output_type: str = Field(..., description="Extracted output type (e.g. CANDIDATE_POLYGON, VERTICAL_STRATA)")
    availability: str = Field("AVAILABLE", description="Runtime readiness: AVAILABLE, MODEL_UNAVAILABLE, DEGRADED")
    limitations: str = Field(..., description="Explicit documentation of algorithmic constraints and accuracy limits")


class ExtractionProvenance(BaseModel):
    """Full traceability of the extraction pipeline run."""
    source_dataset: str = Field(..., description="Identifier or name of the input dataset")
    source_file: Optional[str] = Field(None, description="Filename or URI of the raw input")
    model_id: str = Field(..., description="Model identifier that produced this candidate")
    model_version: str = Field(..., description="Version of the model used")
    extraction_timestamp: str = Field(..., description="ISO 8601 timestamp of extraction execution")
    crs: str = Field("EPSG:32643", description="Coordinate reference system of the output geometry")
    transformation_applied: bool = Field(False, description="Whether coordinate reprojection was performed")


class CandidateFeature(BaseModel):
    """A structured candidate feature produced by an AI/ML or CV extractor."""
    candidate_id: str = Field(..., description="Unique identifier (e.g. AI-BLD-CAND-001)")
    feature_type: ExtractionType = Field(..., description="Type of extracted entity")
    source_reference: str = Field(..., description="Reference to parent building, floor, or parcel")
    geometry_2d: Optional[Dict[str, Any]] = Field(None, description="Candidate 2D GeoJSON geometry dict")
    estimated_attributes: Dict[str, Any] = Field(
        default_factory=dict,
        description="Candidate numerical attributes (base_elevation, top_elevation, height_m, floor_no, etc.)"
    )
    confidence: Optional[float] = Field(
        None,
        description="Confidence score in range [0.0, 1.0] if model produces calibrated metric; null otherwise"
    )
    confidence_level: ConfidenceLevel = Field(
        ConfidenceLevel.UNAVAILABLE,
        description="Categorical confidence rating (HIGH, MEDIUM, LOW, UNAVAILABLE)"
    )
    confidence_threshold: float = Field(0.60, description="Minimum confidence required for automatic acceptance")
    extraction_method: ExtractionMethod = Field(..., description="Method used to derive this candidate")
    status: CandidateStatus = Field(CandidateStatus.CANDIDATE, description="Current candidate review state")
    provenance: ExtractionProvenance = Field(..., description="Full algorithmic origin and input record")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal notices or boundary warnings")


class ExtractionResult(BaseModel):
    """The canonical top-level response envelope for any AI/ML extraction job."""
    schema_version: str = Field("1.0.0", description="Contract schema version")
    source_id: str = Field(..., description="Identifier of the processed input source")
    model_id: str = Field(..., description="Model identifier used for the job")
    model_version: str = Field(..., description="Version of the extractor used")
    extraction_type: ExtractionType = Field(..., description="Type of extraction performed")
    candidates: List[CandidateFeature] = Field(default_factory=list, description="List of candidate features")
    confidence_policy: str = Field(
        "HIGH: >=0.80, MEDIUM: 0.50-0.79, LOW: <0.50 (low confidence flagged for manual review)",
        description="Documented confidence thresholds and acceptance rules"
    )
    status: CandidateStatus = Field(CandidateStatus.CANDIDATE, description="Overall extraction outcome")
    warnings: List[str] = Field(default_factory=list, description="Global warnings or limitations")


# --- Request and Response Models ---

class BuildingExtractionRequest(BaseModel):
    """Request to extract candidate building footprints from raster or DSM."""
    source_id: str = Field("DEMO_AERIAL_SURFACE", description="Identifier of the input raster")
    raster_file: Optional[str] = Field(None, description="Optional path to GeoTIFF elevation raster for live extraction")
    model_id: Optional[str] = Field("bld_cv_otsu_v1", description="Requested model from registry")
    min_area_m2: float = Field(15.0, description="Minimum area filter for building footprints")
    target_crs: str = Field("EPSG:32643", description="Target metric projection for coordinates")
    demo_mode: bool = Field(False, description="Whether to return deterministic benchmark candidates")


class FloorSegmentationRequest(BaseModel):
    """Request to extract candidate floor strata from height or point cloud evidence."""
    building_id: str = Field(..., description="Parent building identifier")
    total_height_m: float = Field(..., gt=0, description="Observed building height from LiDAR/DSM")
    ground_elevation_m: float = Field(..., description="Ground elevation ASL")
    model_id: Optional[str] = Field("flr_hist_cluster_v1", description="Requested model from registry")
    standard_floor_height_m: float = Field(3.0, description="Expected average floor height")
    demo_mode: bool = Field(False, description="Whether to return deterministic benchmark candidates")


class UnitDelineationRequest(BaseModel):
    """Request to extract candidate unit boundaries from floor geometry."""
    building_id: str = Field(..., description="Parent building identifier")
    floor_number: int = Field(..., description="Target floor index")
    floor_polygon: Optional[Dict[str, Any]] = Field(None, description="2D GeoJSON geometry of the floor")
    model_id: Optional[str] = Field("unit_partition_v1", description="Requested model from registry")
    corridor_width_m: float = Field(2.0, description="Estimated interior circulation width")
    demo_mode: bool = Field(False, description="Whether to return deterministic benchmark candidates")


class VerticalDelineationRequest(BaseModel):
    """Request to extract coordinated vertical elevation intervals."""
    building_id: str = Field(..., description="Parent building identifier")
    base_elevation_m: float = Field(..., description="Base elevation ASL")
    top_elevation_m: float = Field(..., description="Top roof elevation ASL")
    floor_count: int = Field(..., ge=1, description="Estimated number of above-ground floors")
    model_id: Optional[str] = Field("vert_delineator_v1", description="Requested model from registry")
    demo_mode: bool = Field(False, description="Whether to return deterministic benchmark candidates")


class CandidateValidationRequest(BaseModel):
    """Request to validate AI candidate features against deterministic spatial rules."""
    candidates: List[CandidateFeature] = Field(..., description="List of candidate features to validate")
    target_parcel: Optional[Dict[str, Any]] = Field(None, description="Optional parent parcel geometry GeoJSON dict")
    parent_building: Optional[Dict[str, Any]] = Field(None, description="Optional parent building geometry GeoJSON dict")
    confidence_override: bool = Field(False, description="Allow human reviewer override of low confidence")


class CandidateValidationResponse(BaseModel):
    """Response from deterministic candidate validation engine."""
    validated_candidates: List[CandidateFeature] = Field(..., description="Candidates with updated review status")
    accepted_count: int = Field(..., description="Number of candidates passing all checks")
    review_count: int = Field(..., description="Number of candidates requiring human review")
    rejected_count: int = Field(..., description="Number of candidates rejected due to topological violations")
    all_valid: bool = Field(..., description="True if zero candidates were rejected")
    validation_errors: List[str] = Field(default_factory=list, description="Detailed validation error list")


class CandidateComparisonRequest(BaseModel):
    """Request to compare an AI candidate geometry against an authoritative or source geometry."""
    candidate_geometry: Dict[str, Any] = Field(..., description="AI Candidate GeoJSON geometry")
    reference_geometry: Dict[str, Any] = Field(..., description="Reference (e.g. OSM or Survey) GeoJSON geometry")
    candidate_id: Optional[str] = Field("AI-CANDIDATE", description="Identifier of the candidate")
    reference_id: Optional[str] = Field("REF-SOURCE", description="Identifier of the reference feature")


class CandidateComparisonResponse(BaseModel):
    """Deterministic spatial comparison metrics between AI candidate and reference."""
    candidate_id: Optional[str] = None
    reference_id: Optional[str] = None
    iou: float = Field(..., ge=0.0, le=1.0, description="Intersection-over-Union metric [0.0 - 1.0]")
    intersection_area_m2: float = Field(..., ge=0.0, description="Overlapping area in square meters")
    union_area_m2: float = Field(..., ge=0.0, description="Combined area in square meters")
    candidate_area_m2: float = Field(..., ge=0.0, description="Area of candidate footprint")
    reference_area_m2: float = Field(..., ge=0.0, description="Area of reference footprint")
    area_difference_pct: float = Field(..., description="Percentage area deviation: 100 * (cand - ref) / ref")
    centroid_offset_m: float = Field(..., ge=0.0, description="Euclidean distance between centroids in meters")
    containment_status: str = Field(..., description="CONTAINED, CONTAINS, PARTIAL_OVERLAP, DISJOINT")
    discrepancy_summary: str = Field(..., description="Human-readable assessment of spatial alignment")


class ModelRegistryResponse(BaseModel):
    """Response listing all registered extraction models in the system."""
    models: List[ModelMetadata] = Field(..., description="List of registered model descriptors")
    total_registered: int = Field(..., description="Total count of registered models")
