from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from pydantic import BaseModel, Field


class ElevationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    OUTSIDE_COVERAGE = "OUTSIDE_COVERAGE"
    NODATA = "NODATA"
    UNAVAILABLE = "UNAVAILABLE"


class ElevationSamplePoint(BaseModel):
    feature_id: Optional[str] = Field(default=None, description="Associated parcel or building ID")
    longitude: float = Field(..., description="Query point X / longitude")
    latitude: float = Field(..., description="Query point Y / latitude")
    crs: str = Field(default="EPSG:4326", description="CRS of the query coordinates")


class ElevationSampleResult(BaseModel):
    feature_id: Optional[str] = Field(default=None, description="Identifier of the sampled feature")
    elevation_m: Optional[float] = Field(default=None, description="Sampled ground elevation in meters AMSL")
    status: ElevationStatus = Field(..., description="Sampling outcome status")
    source_dem: str = Field(..., description="Name or identifier of the DEM raster")
    dem_crs: str = Field(..., description="Native CRS of the DEM raster")
    query_coords: Tuple[float, float] = Field(..., description="(longitude, latitude) queried")
    transformed_coords: Optional[Tuple[float, float]] = Field(default=None, description="Coordinates in DEM CRS if transformed")
    sampling_method: str = Field(default="nearest_neighbor", description="Interpolation / extraction technique")
    vertical_unit: str = Field(default="meters", description="Vertical metric unit")
    vertical_reference: str = Field(default="AMSL (Above Mean Sea Level)", description="Vertical geodetic datum or reference")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Provenance and quality tags")


class ElevationBatchSampleRequest(BaseModel):
    points: List[ElevationSamplePoint] = Field(..., description="List of points to sample")
    dem_name: Optional[str] = Field(default=None, description="Specific DEM file to sample (defaults to active demo DEM)")


class ElevationBatchSampleResponse(BaseModel):
    dem_name: str = Field(..., description="Raster DEM file sampled")
    total_samples: int = Field(..., description="Total points evaluated")
    successful_samples: int = Field(..., description="Count of points with valid elevation")
    outside_coverage_samples: int = Field(..., description="Count of points outside DEM bounding box")
    nodata_samples: int = Field(..., description="Count of points landing on NoData raster cells")
    results: List[ElevationSampleResult] = Field(default_factory=list, description="Detailed sample records")


class DEMMetadata(BaseModel):
    filename: str = Field(..., description="DEM raster file name")
    format: str = Field(..., description="Raster driver format (e.g. GTiff)")
    width: int = Field(..., description="Grid width in pixels")
    height: int = Field(..., description="Grid height in pixels")
    crs: str = Field(..., description="Coordinate Reference System string")
    crs_is_projected: bool = Field(..., description="True if planar metric coordinates")
    bounds: Tuple[float, float, float, float] = Field(..., description="(min_x, min_y, max_x, max_y) bounding box")
    resolution: Tuple[float, float] = Field(..., description="(pixel_width, pixel_height)")
    nodata_value: Optional[float] = Field(default=None, description="Designated NoData sentinel value")
    min_elevation_m: float = Field(..., description="Minimum valid elevation in meters")
    max_elevation_m: float = Field(..., description="Maximum valid elevation in meters")
    mean_elevation_m: float = Field(..., description="Mean elevation in meters")
    vertical_unit: str = Field(default="meters", description="Vertical unit of elevation values")
    vertical_reference: str = Field(default="AMSL", description="Vertical datum / reference")
    tags: Dict[str, str] = Field(default_factory=dict, description="GeoTIFF metadata tags")
