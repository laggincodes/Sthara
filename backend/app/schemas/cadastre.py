from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field


class GeometryValidationIssue(BaseModel):
    feature_index: int = Field(..., description="0-indexed position in FeatureCollection")
    issue_type: str = Field(..., description="Classification of issue (e.g. SELF_INTERSECTION, EMPTY_GEOMETRY)")
    message: str = Field(..., description="Detailed description of the topological or structural violation")
    coordinates_hint: Optional[List[float]] = Field(default=None, description="Approximate coordinate where clash occurred")


class GeoJSONValidationResult(BaseModel):
    valid: bool = Field(..., description="True if dataset satisfies all topological and structural checks")
    feature_count: int = Field(..., description="Number of features evaluated")
    geometry_types: List[str] = Field(default_factory=list, description="Unique geometry types detected")
    crs: str = Field(..., description="Detected or default CRS identifier (e.g. EPSG:4326)")
    crs_source: str = Field(..., description="Origin of CRS specification (explicit or RFC 7946 default)")
    crs_is_projected: bool = Field(default=False, description="True if coordinates are in planar meters")
    suggested_projected_crs: Optional[str] = Field(default=None, description="Recommended metric UTM projection for 3D modeling")
    errors: List[GeometryValidationIssue] = Field(default_factory=list, description="Critical validation failures")
    warnings: List[str] = Field(default_factory=list, description="Advisory spatial warnings")


class NormalizedParcel(BaseModel):
    parcel_id: str = Field(..., description="Unique parcel identifier (source property or system-generated)")
    is_system_generated_id: bool = Field(..., description="True if ID was automatically assigned due to missing source ID")
    detected_id_field: Optional[str] = Field(default=None, description="Field name in source properties where ID was found")
    geometry_type: str = Field(..., description="Geometry type ('Polygon' or 'MultiPolygon')")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry representation")
    bounds: Tuple[float, float, float, float] = Field(..., description="(min_x, min_y, max_x, max_y)")
    area: float = Field(..., description="Computed surface area")
    area_unit: str = Field(..., description="'square_meters' for projected or 'square_degrees' for geographic")
    centroid: List[float] = Field(..., description="[longitude, latitude] or [x, y] centroid coordinates")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Original feature properties")


class NormalizedParcelDataset(BaseModel):
    dataset_id: str = Field(..., description="Internal dataset session ID")
    source_filename: Optional[str] = Field(default=None, description="Uploaded file name if provided")
    crs: str = Field(..., description="Coordinate Reference System identifier")
    crs_source: str = Field(..., description="How the CRS was derived")
    total_parcels: int = Field(..., description="Count of successfully normalized parcels")
    parcels: List[NormalizedParcel] = Field(default_factory=list, description="List of normalized parcels")
    validation: GeoJSONValidationResult = Field(..., description="Validation audit record")


from enum import Enum


class BuildingAssociationStatus(str, Enum):
    WITHIN = "WITHIN"
    INTERSECTS = "INTERSECTS"
    MULTI_PARCEL = "MULTI_PARCEL"
    OUTSIDE = "OUTSIDE"
    UNRESOLVED = "UNRESOLVED"


class ParcelOverlapDetail(BaseModel):
    parcel_id: str = Field(..., description="Cadastral parcel identifier")
    intersection_area_sqm: float = Field(..., description="Intersection footprint area in square meters")
    overlap_percentage: float = Field(..., description="Percentage of total building area located inside parcel")


class BuildingAssociationResult(BaseModel):
    building_id: str = Field(..., description="Unique building footprint identifier")
    is_system_generated_id: bool = Field(..., description="True if ID was auto-assigned")
    geometry_type: str = Field(..., description="'Polygon' or 'MultiPolygon'")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry dictionary")
    bounds: Tuple[float, float, float, float] = Field(..., description="(min_x, min_y, max_x, max_y)")
    building_area_sqm: float = Field(..., description="Building surface area in square meters (projected)")
    centroid: List[float] = Field(..., description="[longitude, latitude] or [x, y] centroid")
    associated_parcel_id: Optional[str] = Field(default=None, description="Primary associated parcel identifier")
    association_status: BuildingAssociationStatus = Field(..., description="Deterministic topological relationship status")
    overlap_percentage: float = Field(..., description="Percentage of footprint inside primary associated parcel")
    overlaps: List[ParcelOverlapDetail] = Field(default_factory=list, description="Detailed breakdown across all intersected parcels")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Original building feature properties")


class BuildingAssociationSummary(BaseModel):
    total_parcels: int = Field(..., description="Number of parcels evaluated")
    total_buildings: int = Field(..., description="Number of building footprints evaluated")
    associated_buildings: int = Field(..., description="Count of buildings associated with at least one parcel")
    unresolved_buildings: int = Field(..., description="Count of buildings with geometry issues or unresolved associations")
    outside_buildings: int = Field(..., description="Count of buildings lying completely outside any parcel")
    multi_parcel_buildings: int = Field(..., description="Count of buildings intersecting more than one parcel")
    projected_crs: str = Field(..., description="Projected metric CRS used for geodesic area calculations")


class SpatialAssociationResponse(BaseModel):
    summary: BuildingAssociationSummary = Field(..., description="High-level metrics summary")
    associations: List[BuildingAssociationResult] = Field(default_factory=list, description="Individual building association records")
    parcel_building_map: Dict[str, List[str]] = Field(default_factory=dict, description="Lookup mapping parcel IDs to lists of associated building IDs")
    warnings: List[str] = Field(default_factory=list, description="Advisory spatial warnings")
    errors: List[str] = Field(default_factory=list, description="Non-fatal spatial errors")


class SpatialAssociationRequest(BaseModel):
    parcels: Dict[str, Any] = Field(..., description="Parcel FeatureCollection GeoJSON")
    buildings: Dict[str, Any] = Field(..., description="Building footprints FeatureCollection GeoJSON")
    target_crs: Optional[str] = Field(default=None, description="Optional metric projected EPSG code (e.g. 'EPSG:32643')")
