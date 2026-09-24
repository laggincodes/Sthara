from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from app.schemas.spatial_analysis import SpatialObjectType, SpatialObjectRef


class DimensionsRequest(BaseModel):
    """
    Request model for calculating object dimensions, area, and volume.
    Supports Building, Floor, or Unit.
    """
    dataset_id: str = Field(..., description="Unique dataset identifier for strict isolation")
    object_id: str = Field(..., description="Unique identifier of building, floor, or unit")
    object_type: Optional[SpatialObjectType] = Field(None, description="Optional entity type hint (building, floor, unit)")
    geometry: Optional[Dict[str, Any]] = Field(None, description="Optional GeoJSON polygon footprint override")
    base_elevation: Optional[float] = Field(None, description="Optional base elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Optional top elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Optional vertical height in meters")
    source_crs: str = Field("EPSG:4326", description="Coordinate Reference System of input geometry")


class DimensionsResponse(BaseModel):
    """
    Deterministic dimensional and volumetric measurements conforming to project specifications.
    """
    dataset_id: str = Field(..., description="Dataset identifier")
    object_id: str = Field(..., description="Object identifier")
    object_type: str = Field(..., description="Resolved object type (building, floor, unit)")
    width_m: float = Field(..., description="Planar bounding box width in meters (X extent)")
    depth_m: float = Field(..., description="Planar bounding box depth in meters (Y extent)")
    height_m: float = Field(..., description="Vertical height in meters (Z extent)")
    area_sqm: float = Field(..., description="2D footprint area in square meters")
    volume_cubic_m: float = Field(..., description="3D enclosed volume in cubic meters")
    z_min: Optional[float] = Field(None, description="Base elevation in meters AMSL")
    z_max: Optional[float] = Field(None, description="Top elevation in meters AMSL")
    surface_area_sqm: Optional[float] = Field(None, description="Surface area in square meters if available")


class DistanceRequest(BaseModel):
    """
    Request model for calculating metric distance between two spatial objects in the same dataset.
    Supported comparisons: Unit ↔ Unit, Building ↔ Building, Unit ↔ Building.
    """
    dataset_id: str = Field(..., description="Dataset identifier enforcing isolation")
    object_a: Union[str, SpatialObjectRef] = Field(..., description="First object ID or spatial reference")
    object_b: Union[str, SpatialObjectRef] = Field(..., description="Second object ID or spatial reference")
    object_a_type: Optional[SpatialObjectType] = Field(None, description="Type hint for object A if passed as string ID")
    object_b_type: Optional[SpatialObjectType] = Field(None, description="Type hint for object B if passed as string ID")
    target_crs: Optional[str] = Field("EPSG:32643", description="Metric projected CRS (defaults to UTM Zone 43N)")


class DistanceResponse(BaseModel):
    """
    Metric distance calculation outcome.
    """
    dataset_id: str = Field(..., description="Dataset identifier")
    object_a: str = Field(..., description="First object identifier")
    object_b: str = Field(..., description="Second object identifier")
    distance_m: float = Field(..., description="Horizontal Euclidean distance in meters")
    horizontal_distance_m: float = Field(..., description="Planar 2D metric distance in meters")
    vertical_distance_m: float = Field(..., description="Vertical difference between elevation ranges in meters (0 if overlapping)")
    distance_3d_m: float = Field(..., description="Full 3D Euclidean distance in meters")
