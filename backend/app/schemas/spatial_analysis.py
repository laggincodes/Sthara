from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SpatialObjectType(str, Enum):
    """
    Cadastral hierarchy object classifications supported for spatial analysis.
    """
    BUILDING = "building"
    FLOOR = "floor"
    UNIT = "unit"
    REFERENCE = "reference"


class VerticalRelationshipType(str, Enum):
    """
    Vertical spatial relationship classifications based on Z min/max elevations.
    """
    SAME_LEVEL = "SAME_LEVEL"
    ABOVE = "ABOVE"
    BELOW = "BELOW"
    OVERLAPPING_Z_RANGE = "OVERLAPPING_Z_RANGE"
    DISJOINT_Z_RANGE = "DISJOINT_Z_RANGE"


class SpatialObjectRef(BaseModel):
    """
    Reference to a spatial cadastral object with optional inline geometry and elevation attributes.
    If geometry or elevations are omitted, the analysis service will attempt to resolve them from registry or disk.
    """
    id: str = Field(..., description="Unique entity identifier (e.g. 'U101', 'FL01', 'BLD-01')")
    type: SpatialObjectType = Field(..., description="Entity type: building, floor, unit, or reference")
    dataset_id: str = Field("default", description="Parent dataset identifier for strict isolation")
    building_id: Optional[str] = Field(None, description="Parent building structure identifier")
    floor_id: Optional[str] = Field(None, description="Parent floor level identifier")
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Polygon or MultiPolygon footprint")
    base_elevation: Optional[float] = Field(None, description="Bottom elevation in meters AMSL (z_min)")
    top_elevation: Optional[float] = Field(None, description="Top elevation in meters AMSL (z_max)")
    height: Optional[float] = Field(None, description="Vertical height in meters")
    source_crs: str = Field("EPSG:4326", description="Coordinate reference system of input geometry")


class ContainmentRequest(BaseModel):
    """
    Request to check if container object_a contains contained object_b.
    Example: Building contains Floor, Floor contains Unit.
    """
    object_a: SpatialObjectRef = Field(..., description="Potential container object (e.g. Building or Floor)")
    object_b: SpatialObjectRef = Field(..., description="Potential contained object (e.g. Floor or Unit)")


class ContainmentResponse(BaseModel):
    """
    Deterministic containment analysis outcome conforming to project conventions.
    """
    object_a_id: str = Field(..., description="Identifier of container object")
    object_b_id: str = Field(..., description="Identifier of contained object")
    analysis_type: str = Field("containment", description="Analysis discriminator")
    result: bool = Field(..., description="True if object_b is fully contained within object_a")
    status: str = Field(..., description="'PASS' if contained, 'FAIL' otherwise")
    horizontal_contained: bool = Field(..., description="Planar 2D boundary containment result")
    vertical_contained: bool = Field(..., description="Vertical [Z_min, Z_max] elevation containment result")
    message: str = Field(..., description="Human-readable outcome description")


class IntersectionRequest(BaseModel):
    """
    Request to check intersection and positive-area overlap between two spatial objects.
    """
    object_a: SpatialObjectRef = Field(..., description="First spatial object")
    object_b: SpatialObjectRef = Field(..., description="Second spatial object")


class IntersectionResponse(BaseModel):
    """
    Intersection analysis outcome. Boundary touching party walls have intersection_area_sqm = 0.0.
    """
    object_a_id: str = Field(..., description="First object identifier")
    object_b_id: str = Field(..., description="Second object identifier")
    analysis_type: str = Field("intersection", description="Analysis discriminator")
    intersects: bool = Field(..., description="True if objects have positive 3D spatial intersection")
    intersection_area_sqm: float = Field(..., description="2D planar overlap area in square meters")
    boundary_touch: bool = Field(..., description="True if objects share boundary with zero overlap area (party wall)")
    status: str = Field(..., description="'PASS' if evaluated successfully")
    message: str = Field(..., description="Summary explanation of intersection status")


class ProximityRequest(BaseModel):
    """
    Request to calculate real Euclidean distance in meters between two spatial objects.
    """
    object_a: SpatialObjectRef = Field(..., description="First spatial object")
    object_b: SpatialObjectRef = Field(..., description="Second spatial object")
    target_crs: Optional[str] = Field("EPSG:32643", description="Metric projected CRS for distance computation")


class ProximityResponse(BaseModel):
    """
    Proximity analysis outcome exposing exact metric distances.
    """
    object_a_id: str = Field(..., description="First object identifier")
    object_b_id: str = Field(..., description="Second object identifier")
    analysis_type: str = Field("proximity", description="Analysis discriminator")
    distance_m: float = Field(..., description="Full 3D Euclidean distance in meters")
    distance_2d_m: float = Field(..., description="Planar 2D metric distance in meters")
    distance_z_m: float = Field(..., description="Vertical separation in meters")
    status: str = Field("PASS", description="Evaluation status")


class VerticalRelationshipRequest(BaseModel):
    """
    Request to evaluate vertical relationship between two spatial objects based on actual Z bounds.
    """
    object_a: SpatialObjectRef = Field(..., description="Subject spatial object")
    object_b: SpatialObjectRef = Field(..., description="Reference spatial object")


class VerticalRelationshipResponse(BaseModel):
    """
    Vertical relationship outcome exposing Z intervals and classification.
    """
    object_a_id: str = Field(..., description="Subject object identifier")
    object_b_id: str = Field(..., description="Reference object identifier")
    analysis_type: str = Field("vertical", description="Analysis discriminator")
    relationship: VerticalRelationshipType = Field(..., description="Categorized relationship")
    object_a_z: Dict[str, float] = Field(..., description="Subject Z parameters: min_z, max_z, height")
    object_b_z: Dict[str, float] = Field(..., description="Reference Z parameters: min_z, max_z, height")
    vertical_separation_m: float = Field(..., description="Vertical gap in meters (0 if touching or overlapping)")
    status: str = Field("PASS", description="Evaluation status")


class CombinedSpatialQueryRequest(BaseModel):
    """
    Combined spatial query request supporting selective analysis execution:
    containment, intersection, proximity, vertical.
    """
    dataset_id: str = Field(..., description="Target dataset identifier")
    object_a: SpatialObjectRef = Field(..., description="Subject spatial object")
    object_b: SpatialObjectRef = Field(..., description="Reference spatial object")
    relations: List[str] = Field(
        default_factory=lambda: ["containment", "intersection", "proximity", "vertical"],
        description="List of requested relationships: containment, intersection, proximity, vertical",
    )


class CombinedSpatialQueryResponse(BaseModel):
    """
    Combined spatial query response returning only requested relationships.
    """
    dataset_id: str = Field(..., description="Dataset identifier")
    object_a_id: str = Field(..., description="Subject object identifier")
    object_b_id: str = Field(..., description="Reference object identifier")
    status: str = Field("PASS", description="Execution status")
    containment: Optional[ContainmentResponse] = None
    intersection: Optional[IntersectionResponse] = None
    proximity: Optional[ProximityResponse] = None
    vertical: Optional[VerticalRelationshipResponse] = None

