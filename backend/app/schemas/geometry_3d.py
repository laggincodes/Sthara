from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


SCHEMA_VERSION = "1.0"


class Geometry3DStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    UNAVAILABLE = "UNAVAILABLE"


class FeatureType(str, Enum):
    BUILDING = "BUILDING"
    FLOOR = "FLOOR"
    PROPERTY_VOLUME = "PROPERTY_VOLUME"
    UNDERGROUND = "UNDERGROUND"
    UNIT = "UNIT"


class GeometryType(str, Enum):
    SOLID = "SOLID"
    SOLID_COLLECTION = "SOLID_COLLECTION"


class FaceWinding(str, Enum):
    COUNTER_CLOCKWISE = "COUNTER_CLOCKWISE"


class GeometryValidationErrorType(str, Enum):
    INVALID_VERTEX = "INVALID_VERTEX"
    INVALID_FACE_INDEX = "INVALID_FACE_INDEX"
    DEGENERATE_FACE = "DEGENERATE_FACE"
    OPEN_SOLID = "OPEN_SOLID"
    INVALID_ELEVATION = "INVALID_ELEVATION"
    INVALID_CRS = "INVALID_CRS"
    ZERO_AREA_FACE = "ZERO_AREA_FACE"
    NON_FINITE_COORDINATE = "NON_FINITE_COORDINATE"


class CoordinateReference(BaseModel):
    """
    Geospatial coordinate reference system and WebGL local origin offset.
    Preserves original GIS CRS while defining translation for single-precision 3D viewer.
    """
    horizontal_crs: str = Field(..., description="Projected metric horizontal CRS (e.g. EPSG:32643)")
    vertical_reference: Optional[str] = Field(
        None, description="Vertical datum reference (e.g. 'AMSL (Above Mean Sea Level)' or null if unknown)"
    )
    source_crs: str = Field("EPSG:4326", description="Original coordinate reference system of input data")
    viewer_origin: List[float] = Field(
        ..., min_length=3, max_length=3, description="Local origin [x0, y0, z0] in horizontal_crs metric units"
    )


class UnitReference(BaseModel):
    """
    Explicit physical units for all 3D geometry coordinates and elevations.
    """
    horizontal_unit: str = Field("meter", description="Linear unit for x and y axes")
    vertical_unit: str = Field("meter", description="Linear unit for z (elevation) axis")


class Bounds3D(BaseModel):
    """
    Axis-aligned 3D bounding box [x, y, z].
    """
    min: List[float] = Field(..., min_length=3, max_length=3, description="Minimum coordinates [minX, minY, minZ]")
    max: List[float] = Field(..., min_length=3, max_length=3, description="Maximum coordinates [maxX, maxY, maxZ]")


class Mesh3D(BaseModel):
    """
    Canonical 3D Polyhedral Boundary Representation (B-Rep) for a single closed solid.
    Conforms to Step 11 3D Geometry Contract (v1.0).
    """
    feature_id: str = Field(..., description="Identifier of the parent cadastral feature (e.g. 'BLD-DEMO-001')")
    feature_type: FeatureType = Field(FeatureType.BUILDING, description="Cadastral feature category")
    geometry_type: GeometryType = Field(GeometryType.SOLID, description="Structural classification of this mesh")
    vertices: List[List[float]] = Field(
        ...,
        description="Zero-indexed list of [x, y, z] coordinates relative to viewer_origin in meters. Exactly 3 finite floats per vertex.",
    )
    faces: List[List[int]] = Field(
        ...,
        description="Zero-indexed list of [v0, v1, v2] vertex indices forming triangular faces with COUNTER_CLOCKWISE outward winding.",
    )
    coordinate_reference: CoordinateReference = Field(..., description="Authoritative geodetic and viewer CRS metadata")
    units: UnitReference = Field(default_factory=UnitReference, description="Metric coordinate units")
    bounds: Bounds3D = Field(..., description="Metric local axis-aligned bounding box")
    winding: FaceWinding = Field(
        FaceWinding.COUNTER_CLOCKWISE, description="Face winding convention viewed from exterior of solid"
    )
    surface_area_sqm: Optional[float] = Field(None, description="Total outer surface area in square meters")
    volume_cubic_m: Optional[float] = Field(None, description="Exact mathematically enclosed volume in cubic meters")


class Mesh3DCollection(BaseModel):
    """
    Collection-capable container supporting complex multi-part buildings (MultiPolygons)
    without forcing disconnected geometries into non-manifold single meshes.
    """
    parts: List[Mesh3D] = Field(..., description="List of validated discrete 3D solid mesh parts")
    bounds: Bounds3D = Field(..., description="Unified bounding box enclosing all constituent parts")
    total_volume_cubic_m: Optional[float] = Field(None, description="Aggregate volume across all parts in m³")
    total_surface_area_sqm: Optional[float] = Field(None, description="Aggregate surface area across all parts in m²")


class BuildingAttributes3D(BaseModel):
    """
    Core cadastral and vertical elevation properties of an extruded building structure.
    """
    building_id: str = Field(..., description="Unique building identifier")
    parcel_id: Optional[str] = Field(None, description="Parent cadastral land parcel ID")
    base_elevation: Optional[float] = Field(None, description="Ground plinth elevation in meters AMSL")
    top_elevation: Optional[float] = Field(None, description="Roof parapet elevation in meters AMSL")
    height: Optional[float] = Field(None, description="Vertical span (top_elevation - base_elevation) in meters")
    height_source: str = Field("UNAVAILABLE", description="Provenance source of building height")


class Building3DResult(BaseModel):
    """
    Result entry for a single extruded building in batch generation.
    """
    building_id: str = Field(..., description="Building identifier")
    geometry_status: Geometry3DStatus = Field(..., description="Integrity status: VALID, INVALID, or UNAVAILABLE")
    building: BuildingAttributes3D = Field(..., description="Cadastral and vertical attributes")
    geometry: Optional[Mesh3DCollection] = Field(None, description="3D polyhedral mesh parts collection if VALID")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings or sanity notices")


class BatchSummary3D(BaseModel):
    """
    Execution summary metrics for batch 3D generation.
    """
    requested: int = Field(..., description="Total building requests received")
    successful: int = Field(..., description="Count of successfully extruded VALID solids")
    failed: int = Field(..., description="Count of invalid or unavailable requests")


class Generate3DResponse(BaseModel):
    """
    Canonical REST response contract for POST /api/v1/buildings/generate-3d.
    """
    schema_version: str = Field(SCHEMA_VERSION, description="Exact 3D geometry contract version ('1.0')")
    results: List[Building3DResult] = Field(..., description="Per-building 3D extrusion results")
    summary: BatchSummary3D = Field(..., description="Execution summary counts")


class Mesh3DValidationResult(BaseModel):
    """
    Detailed geometric audit result for a Mesh3D solid.
    """
    valid: bool = Field(..., description="True if mesh satisfies all solid and topology requirements")
    errors: List[str] = Field(default_factory=list, description="List of fatal geometric or topological violations")
    warnings: List[str] = Field(default_factory=list, description="List of non-fatal geometric warnings")


# --- Input Request Schemas ---

class Building3DRequest(BaseModel):
    building_id: str = Field(..., description="Unique building identifier")
    parcel_id: Optional[str] = Field(None, description="Optional parent parcel identifier")
    footprint_geometry: Dict[str, Any] = Field(..., description="GeoJSON Polygon or MultiPolygon dict")
    ground_elevation: Optional[float] = Field(None, description="Ground plinth elevation in meters AMSL")
    roof_elevation: Optional[float] = Field(None, description="Roof parapet elevation in meters AMSL")
    building_height: Optional[float] = Field(None, description="Building height in meters")
    lidar_roof_elevation: Optional[float] = Field(None, description="LiDAR-extracted roof elevation if available")
    source_crs: str = Field("EPSG:4326", description="CRS of the input footprint geometry")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS for extrusion")
    scene_origin: Optional[List[float]] = Field(None, description="Optional custom [x0, y0, z0] scene origin")


class BatchBuilding3DRequest(BaseModel):
    buildings: List[Building3DRequest] = Field(..., description="List of buildings to extrude")
    target_crs: Optional[str] = Field("EPSG:32643", description="Projected metric CRS for extrusion")
    compute_shared_origin: bool = Field(True, description="Compute unified scene origin across all footprints")
