from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    GeometryType,
    Bounds3D,
    Mesh3D,
    Mesh3DCollection,
    BatchSummary3D,
)


class UnitType(str, Enum):
    """
    Categorization of identifiable floor/building spatial subdivisions.
    """
    APARTMENT_UNIT = "APARTMENT_UNIT"
    RESIDENTIAL_UNIT = "RESIDENTIAL_UNIT"
    OFFICE = "OFFICE"
    SHOP = "SHOP"
    OTHER = "OTHER"


class UnitStatus(str, Enum):
    """
    Geometric and evidence completeness status for a unit.
    """
    VALID = "VALID"
    INVALID = "INVALID"
    UNAVAILABLE = "UNAVAILABLE"


class UnitSourceType(str, Enum):
    """
    Source category for unit definition and boundary delineation.
    """
    FLOOR_PLAN = "FLOOR_PLAN"
    SURVEY = "SURVEY"
    BUILDING_MODEL = "BUILDING_MODEL"
    DERIVED = "DERIVED"
    DEMO = "DEMO"
    DRONE = "DRONE"
    LIDAR = "LIDAR"
    AI_EXTRACTION = "AI_EXTRACTION"


class Unit(BaseModel):
    """
    Spatial subdivision of a floor/building representing a distinct unit (e.g. apartment).
    A unit represents physical geometry and spatial evidence; it does NOT constitute legal ownership.
    """
    unit_id: str = Field(..., description="Stable internal system identifier (e.g. 'BLD-DEMO-002-FL05-U501')")
    property_id: Optional[str] = Field(None, description="Associated property entity identifier if assigned")
    parcel_id: str = Field(..., description="Parent cadastral parcel ID")
    building_id: str = Field(..., description="Parent building structure ID")
    floor_id: str = Field(..., description="Parent floor level ID")
    unit_number: str = Field(..., description="Source/business facing unit designation (e.g. '501')")
    unit_name: Optional[str] = Field(None, description="Human readable label (e.g. 'Apartment 501')")
    unit_type: UnitType = Field(UnitType.APARTMENT_UNIT, description="Unit classification")
    geometry_2d: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Polygon or MultiPolygon footprint")
    geometry_3d: Optional[Mesh3DCollection] = Field(None, description="Canonical 3D Mesh3DCollection")
    base_elevation: Optional[float] = Field(None, description="Bottom elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Ceiling elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Computed vertical height in meters (top - base)")
    footprint_area: Optional[float] = Field(None, description="Floor footprint area in square meters")
    volume_cubic_m: Optional[float] = Field(None, description="Enclosed mathematical volume in cubic meters")
    source: str = Field("SYNTHETIC_DEMO", description="Source description or dataset origin")
    source_type: UnitSourceType = Field(UnitSourceType.DEMO, description="Provenance classification")
    status: UnitStatus = Field(UnitStatus.VALID, description="Validation / completeness status")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings or sanity notes")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Detailed provenance telemetry")


class UnitCreate(BaseModel):
    """
    Payload for proposing or registering a new unit.
    """
    unit_id: Optional[str] = Field(None, description="Optional custom ID; deterministically generated if omitted")
    parcel_id: str = Field(..., description="Parent parcel ID")
    building_id: str = Field(..., description="Parent building ID")
    floor_id: str = Field(..., description="Parent floor ID")
    unit_number: str = Field(..., description="Unit number/label (e.g. '501')")
    unit_name: Optional[str] = Field(None, description="Unit name (e.g. 'Apartment 501')")
    unit_type: UnitType = Field(UnitType.APARTMENT_UNIT, description="Unit classification")
    geometry_2d: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Polygon footprint")
    base_elevation: Optional[float] = Field(None, description="Base elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Top elevation in meters AMSL")
    source: str = Field("USER_SUBMITTED", description="Source description")
    source_type: UnitSourceType = Field(UnitSourceType.DERIVED, description="Source classification")


class UnitValidationRequest(BaseModel):
    """
    Request to validate a single unit against its parent hierarchy and sibling units.
    """
    unit: Unit = Field(..., description="Unit entity to validate")
    parent_floor: Optional[Dict[str, Any]] = Field(None, description="Parent floor interval or floor data")
    parent_building: Optional[Dict[str, Any]] = Field(None, description="Parent building attributes & footprint")
    parent_parcel: Optional[Dict[str, Any]] = Field(None, description="Parent parcel attributes & geometry")
    sibling_units: Optional[List[Unit]] = Field(default_factory=list, description="Other units on the same floor for overlap validation")


class UnitValidationResult(BaseModel):
    """
    Detailed validation findings for a unit entity.
    """
    unit_id: str = Field(..., description="Unit identifier")
    valid: bool = Field(..., description="True if unit passes all geometric & cadastral rules")
    status: UnitStatus = Field(..., description="Validation outcome status")
    errors: List[str] = Field(default_factory=list, description="Fatal validation errors")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings")
    details: Dict[str, Any] = Field(default_factory=dict, description="Audit and validation metrics")


class UnitBatchValidationRequest(BaseModel):
    """
    Batch request to validate multiple units across buildings and floors.
    """
    units: List[Unit] = Field(..., description="List of units to validate")
    floors: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Available parent floors")
    buildings: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Available parent buildings")
    parcels: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Available parent parcels")


class UnitBatchValidationResponse(BaseModel):
    """
    Response envelope for batch unit validation.
    """
    total_units: int = Field(..., description="Total units evaluated")
    valid_units: int = Field(..., description="Count of fully valid units")
    invalid_units: int = Field(..., description="Count of invalid units")
    unavailable_units: int = Field(..., description="Count of units with unavailable geometry")
    results: List[UnitValidationResult] = Field(..., description="Individual validation outcomes")


class UnitPropertyRecord(BaseModel):
    """
    Conceptual unit-level 3D Property Record conforming to the cadastral specification.
    Does NOT claim to be an official government land title record.
    """
    parcel_id: str = Field(..., description="Authoritative land parcel identifier")
    building_id: str = Field(..., description="Superstructure building identifier")
    floor_id: str = Field(..., description="Floor level identifier")
    unit_id: str = Field(..., description="Internal deterministic unit identifier")
    unit_number: str = Field(..., description="Unit number designation")
    unit_name: Optional[str] = Field(None, description="Descriptive unit name")
    canonical_parcel_id: str = Field(default="P001", description="Canonical parcel alias")
    canonical_building_id: str = Field(default="B01", description="Canonical building alias")
    canonical_floor_id: str = Field(default="05", description="Canonical floor alias")
    canonical_unit_id: str = Field(default="501", description="Canonical unit alias")
    canonical_path: str = Field(default="P001/B01/05/501", description="Hierarchical chain: PARCEL -> BUILDING -> FLOOR -> UNIT")
    property_id: Optional[str] = Field(default=None, description="Cadastral property entity identifier")
    property_record_reference: str = Field(
        default="P001-B01-FL05-U501",
        description="Human-readable hierarchical reference for presentation (NOT a cryptographic hash)",
    )
    z_range_amsl: Dict[str, float] = Field(..., description="Vertical range in meters AMSL: {'min_z': float, 'max_z': float}")
    volume_cubic_m: Optional[float] = Field(None, description="Exact mathematical volume in m3")
    footprint_area_sqm: Optional[float] = Field(None, description="Footprint area in m2")
    status: UnitStatus = Field(UnitStatus.VALID, description="Status of spatial evidence")
    ulpin_prototype: Optional[str] = Field(
        default=None,
        description="Authoritative 64-hex uppercase SHA-256 3D ULPIN prototype (3DULPIN-V1-<64_HEX>)",
    )
    ulpin_status: Optional[str] = Field(
        default="VALID",
        description="Lifecycle verification status of the 3D ULPIN prototype (VALID, INVALID, UNAVAILABLE)",
    )
    disclaimer: str = Field(
        "CONCEPTUAL 3D PROPERTY RECORD · 3D ULPIN PROTOTYPE (RESEARCH IMPLEMENTATION). NOT AN OFFICIAL GOVERNMENT TITLE OR LEGAL OWNERSHIP CLAIM.",
        description="Statutory disclaimer"
    )


class Unit3DRequest(BaseModel):
    """
    Request parameters to generate a watertight 3D solid mesh for a unit.
    """
    unit_id: str = Field(..., description="Canonical unit identifier (e.g. 'BLD-DEMO-002-FL05-U501')")
    property_id: Optional[str] = Field(None, description="Cadastral property identifier")
    parcel_id: str = Field(..., description="Parent cadastral parcel identifier")
    building_id: str = Field(..., description="Parent building identifier")
    floor_id: str = Field(..., description="Parent floor identifier")
    unit_number: str = Field(..., description="Unit number designation (e.g. '501')")
    unit_name: Optional[str] = Field(None, description="Optional unit designation")
    unit_type: UnitType = Field(UnitType.APARTMENT_UNIT, description="Unit type discriminator")
    geometry_2d: Optional[Dict[str, Any]] = Field(None, description="2D footprint geometry (Polygon / MultiPolygon)")
    base_elevation: Optional[float] = Field(None, description="Base elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Top elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Explicit unit height in meters")
    parent_floor_base: Optional[float] = Field(None, description="Parent floor base elevation for inheritance")
    parent_floor_top: Optional[float] = Field(None, description="Parent floor top elevation for inheritance")
    source_crs: str = Field("EPSG:4326", description="Input coordinates CRS")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric target CRS")
    scene_origin: Optional[List[float]] = Field(None, description="Optional shared scene origin [x0, y0, z0]")


class BatchUnit3DRequest(BaseModel):
    """
    Batch request to generate 3D solids for multiple units across buildings/floors.
    """
    units: List[Unit3DRequest] = Field(..., description="List of unit 3D requests")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric target CRS")
    compute_shared_origin: bool = Field(True, description="Compute unified origin across all unit footprints")


class Unit3DResult(BaseModel):
    """
    Canonical result for an individual 3D unit solid conforming to 3D Geometry Contract v1.0.
    """
    unit_id: str = Field(..., description="Unit identifier")
    property_id: Optional[str] = Field(None, description="Cadastral property identifier")
    parcel_id: str = Field(..., description="Parent parcel identifier")
    building_id: str = Field(..., description="Parent building identifier")
    floor_id: str = Field(..., description="Parent floor identifier")
    unit_number: str = Field(..., description="Unit number designation")
    unit_name: Optional[str] = Field(None, description="Unit name")
    unit_type: UnitType = Field(UnitType.APARTMENT_UNIT, description="Unit classification")
    base_elevation: Optional[float] = Field(None, description="Resolved base elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Resolved top elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Resolved vertical height in meters")
    footprint_area: Optional[float] = Field(None, description="Planar footprint area in m2")
    volume_cubic_m: Optional[float] = Field(None, description="Watertight polyhedral volume in m3")
    surface_area_sqm: Optional[float] = Field(None, description="Outer surface area in m2")
    geometry_status: Geometry3DStatus = Field(..., description="Status of 3D geometry generation")
    geometry: Optional[Mesh3DCollection] = Field(None, description="Canonical 3D mesh collection for this unit")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings or notes")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Metadata on elevation resolution and source")


class GenerateUnits3DResponse(BaseModel):
    """
    Standard REST response for POST /api/v1/units/generate-3d.
    """
    schema_version: str = Field(SCHEMA_VERSION, description="Canonical 3D geometry contract version ('1.0')")
    results: List[Unit3DResult] = Field(..., description="List of generated unit 3D solids")
    summary: BatchSummary3D = Field(..., description="Batch summary statistics")
