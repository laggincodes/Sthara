"""
Unified Topology & Spatial Conflict Engine Schemas.

Conforms strictly to SIH PPT 06 TOPOLOGY:
- Overlap Check
- Containment
- Duplicates

Covers the full cadastral hierarchy:
PARCEL -> BUILDING -> FLOOR -> UNIT -> PROPERTY_VOLUME -> UNDERGROUND
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TopologyStatus(str, Enum):
    VALID = "VALID"
    WARNING = "WARNING"
    CONFLICT = "CONFLICT"
    UNAVAILABLE = "UNAVAILABLE"


class TopologySeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class TopologyCheckType(str, Enum):
    DUPLICATE_CHECK = "DUPLICATE_CHECK"
    CONTAINMENT_2D = "CONTAINMENT_2D"
    OVERLAP_2D = "OVERLAP_2D"
    VERTICAL_INTERVAL = "VERTICAL_INTERVAL"
    MESH_3D_INTEGRITY = "MESH_3D_INTEGRITY"
    HIERARCHY_INTEGRITY = "HIERARCHY_INTEGRITY"
    UNDERGROUND_CLASH = "UNDERGROUND_CLASH"


class TopologyConflictType(str, Enum):
    INVALID_GEOMETRY = "INVALID_GEOMETRY"
    DUPLICATE_ID = "DUPLICATE_ID"
    SAME_ID_DIFFERENT_GEOMETRY = "SAME_ID_DIFFERENT_GEOMETRY"
    DUPLICATE_GEOMETRY = "DUPLICATE_GEOMETRY"
    OUTSIDE_PARENT = "OUTSIDE_PARENT"
    PARTIAL_CONTAINMENT = "PARTIAL_CONTAINMENT"
    POSITIVE_AREA_OVERLAP = "POSITIVE_AREA_OVERLAP"
    POSITIVE_VOLUME_OVERLAP = "POSITIVE_VOLUME_OVERLAP"
    VERTICAL_OVERLAP = "VERTICAL_OVERLAP"
    VERTICAL_OUTSIDE_PARENT = "VERTICAL_OUTSIDE_PARENT"
    INVALID_MESH = "INVALID_MESH"
    CRS_MISMATCH = "CRS_MISMATCH"
    UNIT_MISMATCH = "UNIT_MISMATCH"
    MISSING_REFERENCE = "MISSING_REFERENCE"
    UNAVAILABLE_GEOMETRY = "UNAVAILABLE_GEOMETRY"


class EntityType(str, Enum):
    PARCEL = "PARCEL"
    BUILDING = "BUILDING"
    FLOOR = "FLOOR"
    UNIT = "UNIT"
    PROPERTY_VOLUME = "PROPERTY_VOLUME"
    UNDERGROUND = "UNDERGROUND"


class TopologyTolerances(BaseModel):
    area_tolerance_sqm: float = Field(
        default=0.0001,
        description="Minimum intersection area in m^2 to consider a positive 2D overlap (1 cm^2 default)",
    )
    geometry_equality_tolerance_m: float = Field(
        default=0.001,
        description="Maximum Hausdorff/coordinate distance in meters to consider geometries identical (1 mm default)",
    )
    vertical_elevation_tolerance_m: float = Field(
        default=0.001,
        description="Vertical interval tolerance in meters for slab contact vs penetration (1 mm default)",
    )
    volume_tolerance_cum: float = Field(
        default=0.0001,
        description="Minimum volume in m^3 to consider a positive 3D clash (100 cm^3 default)",
    )
    underground_clearance_threshold_m: float = Field(
        default=1.0,
        description="Minimum safe proximity clearance distance in meters for underground assets",
    )


class TopologyCheckRecord(BaseModel):
    check_id: str = Field(..., description="Deterministic unique identifier for the check")
    check_type: TopologyCheckType = Field(..., description="Category of topological rule")
    entity_type: EntityType = Field(..., description="Domain entity tier being audited")
    entity_ids: List[str] = Field(..., description="Lexicographically sorted list of participating entity IDs")
    status: TopologyStatus = Field(..., description="Audit outcome for this check")
    severity: TopologySeverity = Field(..., description="Impact level of any observed condition")
    message: str = Field(..., description="Clear diagnostic explanation of the check outcome")
    measured_value: Optional[float] = Field(None, description="Quantitative measurement (area in m^2, distance in m, etc.)")
    tolerance_used: Optional[float] = Field(None, description="Tolerance applied during evaluation")


class TopologyConflictRecord(BaseModel):
    conflict_id: str = Field(..., description="Deterministic unique identifier for the conflict")
    conflict_type: TopologyConflictType = Field(..., description="Specific spatial conflict taxonomy classification")
    severity: TopologySeverity = Field(..., description="Conflict severity level")
    primary_entity_id: str = Field(..., description="Identifier of the principal entity in conflict")
    primary_entity_type: EntityType = Field(..., description="Domain tier of the principal entity")
    secondary_entity_id: Optional[str] = Field(None, description="Identifier of conflicting target entity if pairwise")
    secondary_entity_type: Optional[EntityType] = Field(None, description="Domain tier of conflicting target entity")
    description: str = Field(..., description="Detailed description of the topological conflict")
    overlap_metric: Optional[float] = Field(None, description="Quantified overlap size (m^2 area, m depth, or m^3 volume)")
    conflict_geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON geometry of the intersecting region if available")
    recommendation: str = Field(..., description="Actionable engineering or cadastral resolution guideline")


class TopologySummary(BaseModel):
    overall_status: TopologyStatus = Field(..., description="Composite health status across all evaluated checks")
    total_checks: int = Field(..., description="Total individual topological checks evaluated")
    passed_checks: int = Field(..., description="Number of checks passing within tolerance")
    warning_checks: int = Field(..., description="Number of checks triggering informational warnings")
    conflict_checks: int = Field(..., description="Number of critical conflict violations")
    unavailable_checks: int = Field(..., description="Number of checks skipped due to unavailable geometry")
    duplicates_found: int = Field(..., description="Count of duplicate ID or identical geometry conflicts")
    overlaps_found: int = Field(..., description="Count of positive-area 2D or 3D overlap conflicts")
    containment_violations: int = Field(..., description="Count of partial or complete containment boundary violations")
    mesh_issues_found: int = Field(..., description="Count of non-manifold, unclosed, or invalid 3D meshes")
    hierarchy_issues_found: int = Field(..., description="Count of broken parent-child entity references")
    tolerances: TopologyTolerances = Field(..., description="Configured engineering tolerances used during the audit")


class TopologyValidationRequest(BaseModel):
    parcels: Optional[Dict[str, Any]] = Field(None, description="GeoJSON FeatureCollection or Dict containing parcels")
    buildings: Optional[Dict[str, Any]] = Field(None, description="GeoJSON FeatureCollection or Dict containing buildings")
    floors: Optional[List[Dict[str, Any]]] = Field(None, description="List of floor specification dictionaries")
    units: Optional[List[Dict[str, Any]]] = Field(None, description="List of unit specification dictionaries")
    property_volumes: Optional[List[Dict[str, Any]]] = Field(None, description="List of property volume dictionaries or 3D meshes")
    underground_features: Optional[List[Dict[str, Any]]] = Field(None, description="List of underground feature records")
    tolerances: Optional[TopologyTolerances] = Field(default_factory=TopologyTolerances, description="Optional custom tolerances")


class TopologyValidationResponse(BaseModel):
    status: str = Field(default="success", description="Status string")
    summary: TopologySummary = Field(..., description="Aggregated metric summary of topological audit")
    checks: List[TopologyCheckRecord] = Field(..., description="Ordered list of all individual checks executed")
    conflicts: List[TopologyConflictRecord] = Field(..., description="Ordered list of all detected topological conflicts")


class DemoTopologyResponse(BaseModel):
    status: str = Field(default="success", description="Status string")
    scenario_description: str = Field(..., description="Description of the demo cadastral scene")
    validation_result: TopologyValidationResponse = Field(..., description="Pre-computed topological audit result")
    entities: Dict[str, Any] = Field(..., description="Raw entities bundle for the demo scene")
