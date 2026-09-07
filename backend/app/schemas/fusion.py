from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    CADASTRAL_GIS = "CADASTRAL_GIS"
    BUILDING_FOOTPRINT = "BUILDING_FOOTPRINT"
    OSM = "OSM"
    DEM = "DEM"
    DSM = "DSM"
    LIDAR = "LIDAR"
    FLOOR_PLAN = "FLOOR_PLAN"
    GNSS_CORS = "GNSS_CORS"
    DRONE_AERIAL = "DRONE_AERIAL"


class SourceStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    LOADED = "LOADED"
    VALIDATED = "VALIDATED"
    UNAVAILABLE = "UNAVAILABLE"
    ERROR = "ERROR"


class FusionStatus(str, Enum):
    VALID = "VALID"
    PARTIAL = "PARTIAL"
    WARNING = "WARNING"
    INVALID = "INVALID"


class FusionQualityLevel(str, Enum):
    FULL = "FULL"          # All expected core sources aligned (cadastre, building, elevation, floors/units)
    PARTIAL = "PARTIAL"    # Core spatial layers aligned, some auxiliary layers absent
    LIMITED = "LIMITED"    # Only physical observations available (e.g. standalone OSM without cadastral parcel)
    INVALID = "INVALID"    # Unresolvable CRS or geometric clashes prevent safe alignment


class ConflictSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    NOTICE = "NOTICE"


class TransformationRecord(BaseModel):
    source_crs: str = Field(..., description="Original coordinate reference system")
    target_crs: str = Field(..., description="Target projected reference system")
    transformed: bool = Field(..., description="True if coordinates were reprojected")
    method: str = Field(default="pyproj_exact", description="Algorithm or library used for transformation")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of transformation",
    )


class DatasetMetadata(BaseModel):
    dataset_id: str = Field(..., description="Unique dataset identifier")
    source_type: SourceType = Field(..., description="Categorical classification of spatial data source")
    source_format: str = Field(..., description="Data format (e.g. 'GeoJSON', 'GeoTIFF', 'OSM XML', 'LAS/LAZ')")
    source_crs: str = Field(..., description="Native CRS identifier (e.g. 'EPSG:4326')")
    target_crs: Optional[str] = Field(None, description="Target projected metric CRS if normalized")
    bounds: Optional[Tuple[float, float, float, float]] = Field(None, description="(min_x, min_y, max_x, max_y)")
    units: Dict[str, str] = Field(
        default_factory=lambda: {"horizontal": "degrees", "vertical": "meters"},
        description="Measurement units for horizontal and vertical axes",
    )
    is_cadastral: bool = Field(default=False, description="True if dataset represents authoritative legal cadastral records")
    acquisition_info: Optional[Dict[str, Any]] = Field(None, description="Acquisition date, sensor, or provider details")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Audit trail and file origin details")
    status: SourceStatus = Field(default=SourceStatus.AVAILABLE, description="Operational status of the source dataset")


class ReferenceControlType(str, Enum):
    GNSS_CONTROL_POINT = "GNSS_CONTROL_POINT"
    CORS_REFERENCE = "CORS_REFERENCE"


class ControlPointAccuracy(BaseModel):
    horizontal_accuracy_m: Optional[float] = Field(None, description="Horizontal accuracy (1-sigma RMS) in meters")
    vertical_accuracy_m: Optional[float] = Field(None, description="Vertical accuracy (1-sigma RMS) in meters")
    solution_type: Optional[str] = Field(None, description="RTK_FIXED, DGPS, STATIC, BENCHMARK, SIMULATED")
    pdop: Optional[float] = Field(None, description="Position Dilution of Precision if reported")


class GNSSReferencePoint(BaseModel):
    station_id: str = Field(..., description="Unique CORS / survey monument identifier (e.g. 'CORS-DL-01')")
    control_point_id: Optional[str] = Field(None, description="Standardized control point identifier")
    name: Optional[str] = Field(None, description="Descriptive station or benchmark name")
    coordinate: Optional[List[float]] = Field(None, description="[x, y] or [lon, lat] in specified CRS")
    coordinates: List[float] = Field(..., description="[longitude, latitude] or [x, y] in specified CRS")
    elevation: Optional[float] = Field(None, description="Elevation above reference datum in meters")
    elevation_reference: Optional[str] = Field(None, description="Vertical datum (e.g. 'EGM96', 'WGS84_ELLIPSOID', 'AMSL')")
    crs: str = Field(default="EPSG:4326", description="Horizontal coordinate reference system")
    source: str = Field(default="SURVEY_REFERENCE", description="Source agency or provider")
    source_info: Optional[Dict[str, Any]] = Field(None, description="Operating agency, network, or calibration info")
    reference_type: ReferenceControlType = Field(default=ReferenceControlType.CORS_REFERENCE, description="GNSS_CONTROL_POINT or CORS_REFERENCE")
    accuracy_metadata: Optional[ControlPointAccuracy] = Field(None, description="Survey accuracy if provided; null if not provided")
    status: str = Field(default="ACTIVE", description="Control point status ('ACTIVE', 'BENCHMARK', 'SIMULATED')")
    target_crs: Optional[str] = Field(None, description="Project CRS if transformed")
    target_coordinates: Optional[List[float]] = Field(None, description="Projected coordinates in target CRS")
    transformation_applied: bool = Field(default=False, description="True if projected into common CRS")


class LiDARSourceReference(BaseModel):
    source_id: str = Field(..., description="Point cloud file or stream identifier")
    crs: str = Field(..., description="Native point cloud CRS")
    total_points: int = Field(default=0, description="Total point count in the coverage area")
    bounds: Optional[Tuple[float, float, float, float]] = Field(None, description="Spatial bounding box")
    classifications: List[str] = Field(
        default_factory=lambda: ["GROUND", "BUILDING"],
        description="ASPRS classification codes present in dataset",
    )
    point_density_per_sqm: Optional[float] = Field(None, description="Average pulse/point density per square meter")
    vertical_reference: Optional[str] = Field(default="AMSL", description="Vertical datum convention")
    source_format: str = Field(default="LAS/LAZ", description="Point cloud file format")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Flight date, pulse frequency, sensor specs")


class SpatialConflict(BaseModel):
    conflict_id: str = Field(..., description="Deterministic conflict identifier")
    conflict_type: str = Field(..., description="Classification (e.g. 'BUILDING_OUTSIDE_PARCEL', 'VERTICAL_OVERHANG', 'DEM_OUTSIDE_COVERAGE')")
    severity: ConflictSeverity = Field(..., description="Impact level: CRITICAL, WARNING, or NOTICE")
    affected_entities: List[str] = Field(default_factory=list, description="Identifiers of conflicting entities")
    message: str = Field(..., description="Human-readable explanation of conflict")
    details: Optional[Dict[str, Any]] = Field(None, description="Quantitative metrics (e.g. encroachment area or elevation delta)")


class FusedBuildingContext(BaseModel):
    building_id: str = Field(..., description="Unique building structure identifier")
    is_cadastral: bool = Field(default=False, description="True if building is registered on a legal cadastral parcel")
    legal_status: str = Field(default="UNVERIFIED_PHYSICAL_SURFACE", description="Cadastral status of building")
    source_type: SourceType = Field(default=SourceType.BUILDING_FOOTPRINT, description="Origin source category")
    source_crs: str = Field(..., description="Native CRS of the building geometry")
    source_geometry: Dict[str, Any] = Field(..., description="Original unaltered 2D GeoJSON geometry")
    project_crs: str = Field(..., description="Target metric projected coordinate system")
    projected_geometry: Dict[str, Any] = Field(..., description="Reprojected 2D GeoJSON geometry in project_crs")
    bounds: Tuple[float, float, float, float] = Field(..., description="Bounding box in projected coordinates (min_x, min_y, max_x, max_y)")
    footprint_area_sqm: float = Field(..., description="Planar footprint area in square meters")
    associated_parcel_id: Optional[str] = Field(None, description="Associated legal cadastral parcel ID if matched")
    association_status: Optional[str] = Field(None, description="Topological relationship status (WITHIN, INTERSECTS, OUTSIDE, UNRESOLVED)")
    overlap_percentage: Optional[float] = Field(None, description="Percentage of footprint contained in associated parcel")
    ground_elevation: Optional[float] = Field(None, description="Sampled plinth ground elevation in meters AMSL")
    ground_elevation_source: Optional[str] = Field(None, description="Source of ground elevation (e.g. DEM raster, survey)")
    lidar_evidence: Optional[Dict[str, Any]] = Field(None, description="Extracted LiDAR roof / height evidence")
    building_height: Optional[float] = Field(None, description="Resolved structural height in meters")
    height_source: Optional[str] = Field(None, description="Method / provenance of resolved height")
    floors_count: Optional[int] = Field(None, description="Number of structural storeys")
    floors: List[Dict[str, Any]] = Field(default_factory=list, description="Constituent floor strata")
    units: List[Dict[str, Any]] = Field(default_factory=list, description="Constituent apartment units")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Detailed source trace for each dimension")
    status: str = Field(default="ALIGNED", description="Alignment state ('ALIGNED', 'PARTIAL', 'CONFLICT')")


class FusedPropertyContext(BaseModel):
    context_id: str = Field(..., description="Unique fusion session or context identifier")
    schema_version: str = Field(default="1.0", description="Contract schema version")
    target_project_crs: str = Field(..., description="Common metric project CRS (e.g. 'EPSG:32643')")
    parcel: Optional[Dict[str, Any]] = Field(None, description="Associated legal cadastral parcel record")
    buildings: List[FusedBuildingContext] = Field(default_factory=list, description="All physical buildings mapped in this context")
    elevation_source: Optional[Dict[str, Any]] = Field(None, description="DEM raster metadata and coverage info")
    lidar_source: Optional[LiDARSourceReference] = Field(None, description="LiDAR point cloud reference and parameters")
    gnss_reference: Optional[GNSSReferencePoint] = Field(None, description="GNSS / CORS geodetic control reference point")
    source_datasets: List[DatasetMetadata] = Field(default_factory=list, description="Inventory of all datasets fused into context")
    source_alignment: Dict[str, bool] = Field(
        default_factory=dict,
        description="Boolean checklist of participating source layers (cadastral, building, dem, lidar, floors, units, gnss, underground)",
    )
    underground_source: Optional[Dict[str, Any]] = Field(None, description="Subsurface utility or basement dataset reference")
    source_status_map: Dict[str, str] = Field(
        default_factory=lambda: {
            "cadastral_gis": "SYNTHETIC",
            "building_footprint": "SYNTHETIC",
            "dem": "REAL",
            "lidar": "DERIVED",
            "floor_plan": "ESTIMATED",
            "unit": "SYNTHETIC",
            "gnss_cors": "SYNTHETIC",
            "underground": "SYNTHETIC",
        },
        description="Per-source truthfulness classification: REAL, SYNTHETIC, DERIVED, ESTIMATED, UNAVAILABLE",
    )
    fusion_status: FusionStatus = Field(..., description="Overall topological and coordinate alignment status")
    quality_level: FusionQualityLevel = Field(..., description="Data completeness and evidence readiness tier")
    conflicts: List[SpatialConflict] = Field(default_factory=list, description="Detected geometric, vertical, or administrative conflicts")
    warnings: List[str] = Field(default_factory=list, description="Advisory notices and non-blocking warnings")
    provenance: List[Dict[str, Any]] = Field(default_factory=list, description="Chronological pipeline execution records")


class FusionValidateRequest(BaseModel):
    datasets: List[DatasetMetadata] = Field(..., description="List of source dataset metadata records to evaluate")
    target_crs: Optional[str] = Field(None, description="Proposed target projected CRS (e.g. 'EPSG:32643')")


class FusionValidateResponse(BaseModel):
    valid: bool = Field(..., description="True if all provided datasets can be safely georeferenced and projected")
    target_crs: str = Field(..., description="Selected common project CRS")
    target_crs_is_projected: bool = Field(..., description="True if target CRS uses Cartesian planar metric coordinates")
    sources_evaluated: int = Field(..., description="Count of sources inspected")
    source_alignment: Dict[str, bool] = Field(default_factory=dict, description="Layer availability indicators")
    suggested_target_crs: Optional[str] = Field(None, description="Recommended UTM CRS if target was geographic")
    warnings: List[str] = Field(default_factory=list, description="Advisory notices")
    errors: List[str] = Field(default_factory=list, description="Critical blocking failures")


class FusionNormalizeRequest(BaseModel):
    features: List[Dict[str, Any]] = Field(..., description="GeoJSON features to reproject and normalize")
    source_crs: Optional[str] = Field(default="EPSG:4326", description="Source CRS if not declared in features")
    target_crs: Optional[str] = Field(default="EPSG:32643", description="Target metric projected CRS")


class FusionNormalizeResponse(BaseModel):
    target_crs: str = Field(..., description="Target metric projected CRS applied")
    normalized_features: List[Dict[str, Any]] = Field(..., description="GeoJSON features with source and projected geometry preserved")
    transformations: List[TransformationRecord] = Field(default_factory=list, description="Transformation audit logs")


class PropertyContextRequest(BaseModel):
    parcel_id: Optional[str] = Field(default=None, description="Filter for a specific cadastral parcel (e.g. 'PARCEL-DEMO-101')")
    building_ids: Optional[List[str]] = Field(default=None, description="Optional subset of building IDs to fuse")
    target_crs: Optional[str] = Field(default="EPSG:32643", description="Target metric project CRS")
    include_lidar: bool = Field(default=True, description="Whether to include LiDAR evidence in context")
    include_elevation: bool = Field(default=True, description="Whether to sample DEM elevation in context")
    include_floors: bool = Field(default=True, description="Whether to link building floors")
    include_units: bool = Field(default=True, description="Whether to link apartment units")
    include_gnss: bool = Field(default=True, description="Whether to include GNSS/CORS reference point")


class PropertyContextResponse(BaseModel):
    schema_version: str = Field(default="1.0", description="Contract schema version")
    context: FusedPropertyContext = Field(..., description="Unified multi-source spatial property context")
    message: str = Field(default="Property context created successfully", description="Status message")


class ControlPointValidationRequest(BaseModel):
    control_points: List[GNSSReferencePoint] = Field(..., description="Control points to validate and reproject")
    target_crs: str = Field(default="EPSG:32643", description="Common project CRS to project into")


class ControlPointValidationResponse(BaseModel):
    valid: bool = Field(..., description="True if all control points are valid and within plausible geographic bounds")
    target_crs: str = Field(..., description="Target project CRS")
    validated_points: List[GNSSReferencePoint] = Field(..., description="Control points with target_coordinates computed")
    transformations: List[TransformationRecord] = Field(default_factory=list, description="Coordinate transformation audit logs")
    warnings: List[str] = Field(default_factory=list, description="Advisory notices")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
