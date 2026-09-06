from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.geometry_3d import (
    SCHEMA_VERSION,
    Geometry3DStatus,
    FeatureType,
    Mesh3D,
    Mesh3DCollection,
    BatchSummary3D,
)


class VolumeType(str, Enum):
    """
    Classification of 3D spatial volumes in the cadastral hierarchy.
    """
    FLOOR = "FLOOR"
    PROPERTY_VOLUME = "PROPERTY_VOLUME"
    UNDERGROUND = "UNDERGROUND"
    AIRSPACE = "AIRSPACE"


class FloorIntervalSpec(BaseModel):
    """
    Explicit vertical elevation interval and metadata for a single floor level.
    """
    floor_id: str = Field(..., description="Unique floor identifier (e.g. 'BLD-DEMO-001-FL00')")
    floor_index: int = Field(..., description="Floor index: 0 for Ground, 1 for First Floor, etc.")
    floor_name: str = Field(..., description="Descriptive label (e.g. 'Ground Floor')")
    base_elevation: Optional[float] = Field(None, description="Floor slab base elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Floor ceiling elevation in meters AMSL")
    floor_height: Optional[float] = Field(None, description="Floor height in meters (top_elevation - base_elevation)")


class BuildingFloors3DRequest(BaseModel):
    """
    Request to generate 3D floor solids for a specific building footprint.
    """
    building_id: str = Field(..., description="Unique building structure ID")
    parcel_id: Optional[str] = Field(None, description="Associated land parcel ID")
    footprint_geometry: Dict[str, Any] = Field(..., description="GeoJSON Polygon or MultiPolygon dict")
    ground_elevation: Optional[float] = Field(None, description="Ground surface elevation in meters AMSL")
    roof_elevation: Optional[float] = Field(None, description="Roof parapet elevation in meters AMSL")
    building_height: Optional[float] = Field(None, description="Total building height in meters")
    number_of_floors: Optional[int] = Field(None, description="Total number of floors above ground")
    floor_height: Optional[float] = Field(None, description="Uniform floor height in meters")
    floors: Optional[List[FloorIntervalSpec]] = Field(None, description="Optional explicit floor specifications")
    source_crs: str = Field("EPSG:4326", description="CRS of the input footprint geometry")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS for extrusion")
    scene_origin: Optional[List[float]] = Field(None, description="Optional [x0, y0, z0] scene origin")


class BatchBuildingFloors3DRequest(BaseModel):
    """
    Batch request for multi-building 3D floor extrusion.
    """
    buildings: List[BuildingFloors3DRequest] = Field(..., description="List of building floor requests")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS")
    compute_shared_origin: bool = Field(True, description="Compute unified origin across all buildings")


class Floor3DResult(BaseModel):
    """
    Result entry for a single extruded 3D floor solid conforming to 3D Geometry Contract v1.0.
    """
    floor_id: str = Field(..., description="Unique floor identifier")
    building_id: str = Field(..., description="Parent building structure ID")
    parcel_id: Optional[str] = Field(None, description="Parent parcel ID")
    floor_index: int = Field(..., description="Floor index (0 for Ground, 1 for First Floor, etc.)")
    floor_name: str = Field(..., description="Descriptive floor label")
    volume_type: VolumeType = Field(VolumeType.FLOOR, description="Volume category: FLOOR")
    base_elevation: float = Field(..., description="Bottom slab elevation in meters AMSL")
    top_elevation: float = Field(..., description="Top ceiling elevation in meters AMSL")
    height: float = Field(..., description="Floor height in meters")
    volume_cubic_m: float = Field(..., description="Exact mathematical volume in m3")
    surface_area_sqm: float = Field(..., description="Total outer surface area in m2")
    geometry_status: Geometry3DStatus = Field(..., description="Geometric integrity status")
    geometry: Optional[Mesh3DCollection] = Field(None, description="Canonical 3D mesh collection for this floor")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings or sanity notes")


class BuildingFloors3DResult(BaseModel):
    """
    Result container for all 3D floors of a building.
    """
    building_id: str = Field(..., description="Building structure identifier")
    parcel_id: Optional[str] = Field(None, description="Parent parcel ID")
    base_elevation: Optional[float] = Field(None, description="Building ground elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Building roof elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Total building height in meters")
    floor_count: int = Field(..., description="Count of generated floors")
    floors: List[Floor3DResult] = Field(default_factory=list, description="List of individual 3D floor solids")
    geometry_status: Geometry3DStatus = Field(..., description="Overall building floors status")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings or provenance notes")


class GenerateFloors3DResponse(BaseModel):
    """
    Canonical REST response for POST /api/v1/buildings/generate-floors-3d.
    """
    schema_version: str = Field(SCHEMA_VERSION, description="Canonical 3D geometry contract version ('1.0')")
    results: List[BuildingFloors3DResult] = Field(..., description="Per-building 3D floor extrusion results")
    summary: BatchSummary3D = Field(..., description="Execution summary metrics")


# --- Property Volume Models ---

class PropertyVolumeRequest(BaseModel):
    """
    Request to generate a 3D property volume from parcel, building, and floor references.
    """
    property_id: str = Field(..., description="Unique cadastral property identifier (e.g. 'PROP-DEMO-101-U01')")
    parcel_id: str = Field(..., description="Parent cadastral land parcel ID")
    building_id: Optional[str] = Field(None, description="Parent building structure ID (if single building)")
    building_ids: Optional[List[str]] = Field(None, description="Parent building structure IDs (if multi-building property)")
    floor_ids: List[str] = Field(default_factory=list, description="List of constituent floor IDs (e.g. ['BLD-DEMO-001-FL00'])")
    volume_type: VolumeType = Field(VolumeType.PROPERTY_VOLUME, description="Volume type discriminator")
    unit_name: Optional[str] = Field(None, description="Optional unit label (e.g. 'Unit 101 - Retail')")
    footprint_geometry: Optional[Dict[str, Any]] = Field(None, description="Optional custom footprint geometry")
    source_crs: str = Field("EPSG:4326", description="Source CRS")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS")
    scene_origin: Optional[List[float]] = Field(None, description="Scene origin offset")


class BatchPropertyVolumeRequest(BaseModel):
    """
    Batch request for multi-property 3D volume generation.
    """
    properties: List[PropertyVolumeRequest] = Field(..., description="List of property volume requests")
    building_requests: Optional[List[BuildingFloors3DRequest]] = Field(None, description="Optional floor generation requests for parent buildings")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS")
    compute_shared_origin: bool = Field(True, description="Compute unified origin across all properties")


class PropertyVolumeResult(BaseModel):
    """
    Canonical result for an individual 3D property volume conforming to 3D Geometry Contract v1.0.
    """
    property_id: str = Field(..., description="Unique cadastral property ID")
    parcel_id: str = Field(..., description="Parent parcel ID")
    building_id: Optional[str] = Field(None, description="Primary parent building ID")
    building_ids: Optional[List[str]] = Field(default_factory=list, description="Associated building structure IDs")
    floor_ids: List[str] = Field(..., description="Constituent floor IDs")
    volume_type: VolumeType = Field(VolumeType.PROPERTY_VOLUME, description="Volume type")
    unit_name: Optional[str] = Field(None, description="Unit name or designation")
    base_elevation: Optional[float] = Field(None, description="Lowest elevation of the property volume in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Highest elevation of the property volume in meters AMSL")
    total_height: Optional[float] = Field(None, description="Total vertical span (top - base) in meters")
    volume_cubic_m: Optional[float] = Field(None, description="Enclosed mathematical volume in m3")
    surface_area_sqm: Optional[float] = Field(None, description="Total outer surface area in m2")
    geometry_status: Geometry3DStatus = Field(..., description="Geometric integrity status")
    geometry: Optional[Mesh3DCollection] = Field(None, description="Canonical 3D mesh collection")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings or notes")


class GeneratePropertyVolumeResponse(BaseModel):
    """
    Canonical REST response for POST /api/v1/properties/generate-volume-3d.
    """
    schema_version: str = Field(SCHEMA_VERSION, description="Canonical 3D geometry contract version ('1.0')")
    results: List[PropertyVolumeResult] = Field(..., description="Per-property 3D volume results")
    summary: BatchSummary3D = Field(..., description="Execution summary metrics")
