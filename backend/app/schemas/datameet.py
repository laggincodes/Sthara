from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class DataMeetLayerInfo(BaseModel):
    layer_id: str = Field(..., description="Unique identifier of DataMeet layer (e.g. delhi_assembly_constituencies, delhi_districts)")
    name: str = Field(..., description="Human-readable layer name")
    description: str = Field(..., description="Description of the administrative boundary layer")
    feature_count: int = Field(..., description="Number of administrative features")
    source_crs: str = Field(default="EPSG:4326", description="Native coordinate reference system")
    source_file: str = Field(..., description="Filename on disk")
    target_feature_default: Optional[str] = Field(default=None, description="Default Area of Interest feature name (e.g. Rajouri Garden)")

class DataMeetAlignmentRequest(BaseModel):
    layer_id: str = Field(
        default="delhi_assembly_constituencies",
        description="DataMeet layer identifier to use as the administrative Area of Interest boundary."
    )
    aoi_name: Optional[str] = Field(
        default="Rajouri Garden",
        description="Name of the specific administrative unit (e.g. 'Rajouri Garden', 'West', or 'ALL')."
    )
    working_crs: str = Field(
        default="EPSG:32643",
        description="Target projected metric coordinate reference system."
    )

class BoundaryRing3D(BaseModel):
    coordinates: List[List[float]] = Field(..., description="List of [x, y, z] coordinates in working metric CRS")

class DataMeetAlignmentResponse(BaseModel):
    success: bool
    layer_id: str
    aoi_name: str
    state_name: str
    district_name: Optional[str] = None
    source_crs: str
    working_crs: str
    transformation_used: str
    total_osm_buildings: int
    buildings_inside_aoi: int
    buildings_outside_aoi: int
    alignment_status: str
    bounding_box_wgs84: List[float]
    projected_origin: List[float]
    boundary_rings: List[BoundaryRing3D]
    source_attribution: Dict[str, str]

class DataMeetMetadataResponse(BaseModel):
    source_name: str
    repository_url: str
    license: str
    source_crs: str
    datasets: Dict[str, Any]
    provenance_notes: List[str]
