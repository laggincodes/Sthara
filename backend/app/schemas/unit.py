from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.geometry_3d import Mesh3DCollection


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
    Conceptual unit-level 3D Property Record conforming to the SIH Presentation specification.
    Does NOT claim to be an official government land title record.
    """
    parcel_id: str = Field(..., description="Authoritative land parcel identifier")
    building_id: str = Field(..., description="Superstructure building identifier")
    floor_id: str = Field(..., description="Floor level identifier")
    unit_id: str = Field(..., description="Internal deterministic unit identifier")
    unit_number: str = Field(..., description="Unit number designation")
    unit_name: Optional[str] = Field(None, description="Descriptive unit name")
    z_range_amsl: Dict[str, float] = Field(..., description="Vertical range in meters AMSL: {'min_z': float, 'max_z': float}")
    volume_cubic_m: Optional[float] = Field(None, description="Exact mathematical volume in m3")
    footprint_area_sqm: Optional[float] = Field(None, description="Footprint area in m2")
    status: UnitStatus = Field(UnitStatus.VALID, description="Status of spatial evidence")
    disclaimer: str = Field(
        "CONCEPTUAL 3D PROPERTY RECORD FOR PROTOTYPE DEMONSTRATION. NOT AN OFFICIAL GOVERNMENT TITLE OR LEGAL OWNERSHIP CLAIM.",
        description="Statutory disclaimer"
    )
