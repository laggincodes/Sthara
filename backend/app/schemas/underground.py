"""
Underground & Subsurface Spatial Modeling Schemas (Step 20).

Adheres strictly to the SIH Presentation Technical Requirements:
    - Basement Modeling (subterranean stratum of building/property)
    - Underground Utility Modeling (subsurface infrastructure; NOT a property volume)
    - Subsurface Volumes (generic 3D subsurface spatial parcels)
    - Native Z-up Vertical Convention with Derived Depth (Depth = Ground - Elevation)
    - Subsurface Conflict Classification (Allowed, Review Required, Invalid Overlap)
    - 100% compliance with Canonical 3D Geometry Contract v1.0
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from app.schemas.geometry_3d import Geometry3DStatus, Mesh3D, Mesh3DCollection


class UndergroundFeatureType(str, Enum):
    """Classification of subsurface and subterranean features."""
    BASEMENT = "BASEMENT"
    UNDERGROUND_UTILITY = "UNDERGROUND_UTILITY"
    SUBSURFACE_VOLUME = "SUBSURFACE_VOLUME"
    TUNNEL = "TUNNEL"
    PIPE = "PIPE"
    FOUNDATION = "FOUNDATION"
    PARKING = "PARKING"
    OTHER_SUBSURFACE = "OTHER_SUBSURFACE"


class UtilityType(str, Enum):
    """Categorization of underground infrastructure utilities."""
    WATER_SUPPLY = "WATER_SUPPLY"
    ELECTRICITY = "ELECTRICITY"
    TELECOMMUNICATIONS = "TELECOMMUNICATIONS"
    STORM_WATER = "STORM_WATER"
    SEWERAGE = "SEWERAGE"
    GAS = "GAS"
    TRANSIT_TUNNEL = "TRANSIT_TUNNEL"
    OTHER = "OTHER"


class UndergroundConflictClass(str, Enum):
    """Severity classification for physical and spatial proximity clashes."""
    ALLOWED_INTERSECTION = "ALLOWED_INTERSECTION"  # Documented crossing/easement/penetration
    REVIEW_REQUIRED = "REVIEW_REQUIRED"            # Proximity clearance < 1.0m or unverified overlap
    INVALID_OVERLAP = "INVALID_OVERLAP"            # Physical collision without easement or crossing rights


class UndergroundSpatialStatus(str, Enum):
    """Spatial relationship between underground feature and legal parcel/building."""
    WITHIN = "WITHIN"
    INTERSECTS = "INTERSECTS"
    OUTSIDE = "OUTSIDE"
    UNRESOLVED = "UNRESOLVED"


class UndergroundProvenance(BaseModel):
    """Data origin and geodetic reference metadata for subsurface features."""
    source_dataset: str = Field(..., description="Source dataset name or repository reference")
    source_type: str = Field("SYNTHETIC_DEMO", description="BIM_IFC, MUNICIPAL_UTILITY_GIS, SUB_SURVEY, SYNTHETIC_DEMO")
    source_file: Optional[str] = Field(None, description="Source filename or URI")
    crs: str = Field("EPSG:32643", description="Projected coordinate system (e.g. EPSG:32643 UTM 43N)")
    vertical_datum: str = Field("EGM2008 / AMSL", description="Authoritative vertical reference datum")
    survey_method: Optional[str] = Field(None, description="GPR, as-built survey, BIM model, or synthetic design")
    created_at: str = Field(..., description="ISO 8601 timestamp of record creation")


class UndergroundFeature(BaseModel):
    """Core domain model representing a physical underground asset or subsurface volume."""
    underground_feature_id: str = Field(..., description="Unique identifier (e.g. BSM-DEMO-101, UTL-DEMO-001)")
    feature_type: UndergroundFeatureType = Field(..., description="Type of subterranean asset")
    utility_type: Optional[UtilityType] = Field(None, description="Specific utility classification (if utility)")
    parcel_id: str = Field(..., description="Associated cadastral parcel identifier")
    building_id: Optional[str] = Field(None, description="Associated parent building (required for BASEMENT)")
    property_id: Optional[str] = Field(None, description="Associated legal property record (if property volume)")
    name: str = Field(..., description="Human-readable title or label of the feature")
    source: str = Field(..., description="Source dataset title or authority")
    source_type: str = Field("SYNTHETIC_DEMO", description="Data source classification")
    
    # Elevation fields (Strict Z-up convention: higher = larger positive Z)
    ground_elevation_m: float = Field(..., description="Authoritative reference ground elevation ASL")
    top_elevation_m: float = Field(..., description="Upper elevation bound ASL (top <= ground)")
    base_elevation_m: float = Field(..., description="Lower elevation bound ASL (base < top)")
    
    # Derived depth fields (relative to ground reference)
    depth_to_top_m: float = Field(..., ge=0.0, description="Depth below surface to top of feature (ground - top)")
    depth_to_base_m: float = Field(..., ge=0.0, description="Depth below surface to bottom of feature (ground - base)")
    thickness_m: float = Field(..., gt=0.0, description="Vertical thickness or height of the asset (top - base)")
    
    # Geometry and Status
    geometry_2d: Optional[Dict[str, Any]] = Field(None, description="2D GeoJSON polygon footprint or corridor")
    mesh_3d: Optional[Union[Mesh3D, Mesh3DCollection]] = Field(None, description="Canonical watertight 3D solid")
    geometry_status: Geometry3DStatus = Field(Geometry3DStatus.UNAVAILABLE, description="Mesh validation status")
    spatial_status: UndergroundSpatialStatus = Field(UndergroundSpatialStatus.UNRESOLVED, description="Cadastral boundary status")
    is_cadastral_property: bool = Field(False, description="True if part of private legal title; False for public utility")
    provenance: UndergroundProvenance = Field(..., description="Full origin traceability")
    warnings: List[str] = Field(default_factory=list, description="Integrity notices, clash warnings, or disclaimers")


# --- Request and Response Models ---

class UndergroundValidationRequest(BaseModel):
    """Request to validate underground feature geometry and cadastral relationships."""
    feature: UndergroundFeature = Field(..., description="Underground feature to validate")
    parcel_geometry: Optional[Dict[str, Any]] = Field(None, description="Parent parcel GeoJSON geometry")
    building_geometry: Optional[Dict[str, Any]] = Field(None, description="Parent building GeoJSON geometry (for basement)")


class UndergroundValidationResponse(BaseModel):
    """Response from underground validation engine."""
    underground_feature_id: str
    is_valid: bool
    spatial_status: UndergroundSpatialStatus
    depth_consistent: bool
    geometry_valid: bool
    validation_errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class Underground3DRequest(BaseModel):
    """Request to generate a canonical 3D solid for an underground feature."""
    underground_feature_id: str = Field(..., description="Identifier of the feature")
    feature_type: UndergroundFeatureType = Field(..., description="Type of feature")
    footprint_geometry: Dict[str, Any] = Field(..., description="2D polygon footprint or corridor GeoJSON")
    ground_elevation_m: float = Field(..., description="Surface ground elevation reference ASL")
    top_elevation_m: float = Field(..., description="Top elevation ASL")
    base_elevation_m: float = Field(..., description="Base elevation ASL")
    target_crs: str = Field("EPSG:32643", description="Target metric horizontal CRS")
    source_crs: str = Field("EPSG:32643", description="Source CRS")
    corridor_buffer_m: Optional[float] = Field(None, description="Buffer width if footprint is a LineString")


class Underground3DResult(BaseModel):
    """Result of 3D solid extrusion for an underground feature."""
    underground_feature_id: str
    feature_type: UndergroundFeatureType
    geometry_status: Geometry3DStatus
    mesh_3d: Optional[Union[Mesh3D, Mesh3DCollection]] = None
    volume_cubic_m: float = Field(0.0, description="Calculated 3D solid volume in m3")
    depth_to_top_m: float = Field(..., description="Derived depth to top")
    depth_to_base_m: float = Field(..., description="Derived depth to base")
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class GenerateUnderground3DResponse(BaseModel):
    """Batch response for underground 3D generation."""
    schema_version: str = Field("1.0", description="Geometry contract schema version")
    total_requested: int
    successful: int
    failed: int
    results: List[Underground3DResult]
    errors: List[str] = Field(default_factory=list)


class UndergroundConflictRecord(BaseModel):
    """Detected physical clash or spatial proximity record between two subsurface features."""
    feature_a_id: str
    feature_b_id: str
    feature_a_type: UndergroundFeatureType
    feature_b_type: UndergroundFeatureType
    conflict_class: UndergroundConflictClass
    horizontal_overlap_area_m2: float = Field(..., ge=0.0, description="2D footprint intersection area")
    vertical_clearance_m: float = Field(..., description="Distance between vertical intervals; negative if overlapping")
    is_3d_clash: bool = Field(..., description="True if both horizontal footprints and vertical intervals intersect")
    resolution_recommendation: str = Field(..., description="Engineering recommendation")


class UndergroundConflictRequest(BaseModel):
    """Request to evaluate spatial clashes between an asset and registered underground features."""
    candidate_feature: UndergroundFeature = Field(..., description="Feature to test for conflicts")
    existing_features: List[UndergroundFeature] = Field(..., description="Existing registered subsurface features")
    clearance_threshold_m: float = Field(1.0, description="Proximity clearance buffer in meters")


class UndergroundConflictResponse(BaseModel):
    """Summary of detected subsurface spatial clashes."""
    candidate_feature_id: str
    total_conflicts_found: int
    has_invalid_clash: bool
    conflicts: List[UndergroundConflictRecord] = Field(default_factory=list)
    summary_message: str


class DemoUndergroundResponse(BaseModel):
    """Complete bundle of synthetic underground demo assets for SIH presentation."""
    schema_version: str = Field("1.0", description="Contract version")
    parcel_id: str
    building_id: str
    features: List[UndergroundFeature]
    total_features: int
    basement_count: int
    utility_count: int
    vertical_datum: str
    disclaimer: str
