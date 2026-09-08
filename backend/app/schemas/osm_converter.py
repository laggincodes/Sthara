from enum import Enum
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field

class HeightSourceOption(str, Enum):
    AUTOMATIC = "automatic"
    OSM_HEIGHT = "osm_height"
    BUILDING_LEVELS = "building_levels"
    DEFAULT_HEIGHT = "default"

class ExportFormatOption(str, Enum):
    GLB = "glb"
    GLTF = "gltf"
    BOTH = "both"

class Osm3DConversionConfig(BaseModel):
    source_file: Optional[str] = Field(
        default=None,
        description="Path or identifier of the source OSM file. Defaults to active raw map.osm."
    )
    height_source: HeightSourceOption = Field(
        default=HeightSourceOption.AUTOMATIC,
        description="Height determination strategy: automatic (tags with fallback), osm_height, building_levels, or default."
    )
    default_floor_height_m: float = Field(
        default=3.0,
        ge=1.0,
        le=20.0,
        description="Configurable default floor height in meters (default 3.0m)."
    )
    default_building_height_m: float = Field(
        default=9.0,
        ge=1.0,
        le=500.0,
        description="Configurable default building height in meters when tags are absent (default 9.0m)."
    )
    target_crs: str = Field(
        default="auto",
        description="Target projected metric coordinate reference system (e.g. 'auto' or 'EPSG:32643')."
    )
    export_format: ExportFormatOption = Field(
        default=ExportFormatOption.BOTH,
        description="Desired 3D export formats: glb, gltf, or both."
    )

class ConversionStageReport(BaseModel):
    stage: str = Field(..., description="Stage identifier (e.g. import, parse, geometry_generation, export_3d)")
    status: str = Field(..., description="Status: pending, running, complete, or failed")
    message: Optional[str] = None
    features: Optional[int] = None
    vertices: Optional[int] = None
    faces: Optional[int] = None
    duration_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None

class BuildingMetadataItem(BaseModel):
    building_id: str
    osm_id: Optional[str] = None
    name: Optional[str] = None
    parcel_id: Optional[str] = "PARCEL-UNREGISTERED"
    height: float
    z_min: float = 0.0
    z_max: float = 9.0
    levels: Optional[int] = None
    floor_unit_available: bool = False
    height_source: str
    area_sqm: float
    volume_cubic_m: float
    source: str = "OpenStreetMap"
    is_cadastral: bool = False
    validation_status: str = "PASS"
    watertight: bool = True
    duplicate_check: str = "PASS"
    topology_status: str = "PASS"
    prototype_3d_ulpin: Optional[str] = None
    bounding_box: Optional[Dict[str, List[float]]] = None
    centroid: Optional[List[float]] = None

class Osm3DConversionSummary(BaseModel):
    buildings: int
    vertices: int
    faces: int
    surface_area_sqm: float
    volume_cubic_m: float
    processing_time_s: float
    bounding_box: Optional[Dict[str, Any]] = None
    target_crs: str
    source_crs: str
    viewer_origin: List[float]

class Osm3DConversionResponse(BaseModel):
    success: bool
    source_name: str
    target_crs: str
    viewer_origin: List[float]
    summary: Osm3DConversionSummary
    stages: List[ConversionStageReport]
    glb_url: Optional[str] = None
    gltf_url: Optional[str] = None
    metadata_url: Optional[str] = None
    buildings_metadata: List[BuildingMetadataItem]
    # Full geometry response for immediate Three.js rendering
    mesh_data: Optional[Dict[str, Any]] = None
