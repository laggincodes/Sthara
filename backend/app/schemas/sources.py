from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SourceType(str, Enum):
    """
    Supported spatial and reference data source classifications.
    """
    OSM = "OSM"
    GEOJSON = "GeoJSON"
    DATAMEET = "DataMeet"
    USER_PROVIDED = "User-provided"
    REFERENCE_LAYER = "Reference Layer"


class SourceStatus(str, Enum):
    """
    Validation and import status for spatial sources.
    """
    IMPORTED = "Imported"
    VALID = "VALID"
    WARNING = "WARNING"
    INVALID = "INVALID"


class SpatialSource(BaseModel):
    """
    Structured spatial source metadata associated with a STHARA dataset.
    Explicitly decoupled from legal cadastral ownership claims.
    """
    source_id: str = Field(..., description="Unique source identifier within the dataset (e.g. 'SRC-001')")
    dataset_id: str = Field(..., description="Parent dataset identifier enforcing strict isolation")
    source_name: str = Field(..., description="Human-readable name of the source")
    source_type: str = Field(..., description="Source classification: OSM, GeoJSON, DataMeet, User-provided, Reference Layer")
    file_name: Optional[str] = Field(None, description="Original source file name where applicable")
    format: str = Field("GeoJSON", description="Source data format (GeoJSON, OSM XML, Shapefile)")
    crs: str = Field("EPSG:4326", description="Original coordinate reference system")
    working_crs: str = Field("EPSG:32643", description="Normalized working metric CRS")
    feature_count: int = Field(0, description="Number of spatial features in the source")
    imported_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of source registration",
    )
    status: str = Field("Imported", description="Source status: VALID, WARNING, INVALID, or Imported")
    provenance: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured provenance attribution and transformation history",
    )
    description: Optional[str] = Field(None, description="Optional description of reference dataset")
    disclaimer: str = Field(
        "This source represents reference spatial geometry only and does not establish legal ownership or title.",
        description="Statutory non-title spatial evidence disclaimer",
    )


class SourceRegisterRequest(BaseModel):
    """
    Request model for registering a new spatial reference source or layer.
    """
    dataset_id: str = Field(..., description="Target dataset identifier")
    source_id: Optional[str] = Field(None, description="Optional unique source identifier. If omitted, will be auto-generated.")
    source_name: str = Field(..., description="Human-readable source name")
    source_type: str = Field(..., description="Source type: OSM, GeoJSON, DataMeet, User-provided, Reference Layer")
    file_name: Optional[str] = Field(None, description="Original file name if file upload")
    format: str = Field("GeoJSON", description="Data format (GeoJSON, OSM XML)")
    crs: Optional[str] = Field(None, description="Declared CRS (defaults to EPSG:4326 if unstated)")
    description: Optional[str] = Field(None, description="Optional contextual description")
    features: Optional[Dict[str, Any]] = Field(None, description="Optional inline GeoJSON FeatureCollection")


class SourceFeaturesRequest(BaseModel):
    """
    Request model for attaching or updating GeoJSON features for a reference source.
    """
    features: Dict[str, Any] = Field(..., description="GeoJSON FeatureCollection")
    crs: Optional[str] = Field(None, description="Declared coordinate reference system")


class SourceListResponse(BaseModel):
    """
    Response model for listing spatial sources belonging to a dataset.
    """
    dataset_id: str
    total_sources: int
    sources: List[SpatialSource]


class SourceDeleteResponse(BaseModel):
    """
    Response model for source deletion.
    """
    success: bool
    dataset_id: str
    source_id: str
    message: str
