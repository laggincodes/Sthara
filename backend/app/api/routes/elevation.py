from typing import Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas.common import ResponseEnvelope, ErrorEnvelope
from app.schemas.elevation import (
    ElevationBatchSampleRequest,
    ElevationBatchSampleResponse,
    DEMMetadata,
)
from app.services.elevation_service import ElevationService
from app.core.logging import logger

router = APIRouter(prefix="/elevation", tags=["Elevation Intelligence"])


@router.get(
    "/info",
    response_model=ResponseEnvelope[DEMMetadata],
    summary="Inspect Active Digital Elevation Model (DEM)",
)
async def get_dem_info(dem_name: Optional[str] = None):
    """
    Returns verified spatial metadata, dimensions, resolution, bounds,
    and elevation statistics for the specified or active demo DEM GeoTIFF.
    """
    try:
        metadata = ElevationService.get_dem_metadata(dem_name)
        return ResponseEnvelope(
            data=metadata,
            message=f"Retrieved metadata for DEM '{metadata.filename}'",
        )
    except FileNotFoundError as e:
        logger.warning(f"DEM file not found: {e}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "error",
                "error_code": "DEM_FILE_NOT_FOUND",
                "message": str(e),
                "data": None,
            },
        )
    except Exception as e:
        logger.error(f"Error inspecting DEM: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "error_code": "DEM_INSPECTION_FAILED",
                "message": "Internal error occurred while reading DEM raster.",
                "data": None,
            },
        )


@router.post(
    "/sample",
    response_model=ResponseEnvelope[ElevationBatchSampleResponse],
    summary="Sample Ground Elevation at Coordinates / Centroids",
)
async def sample_elevation(payload: ElevationBatchSampleRequest):
    """
    Extracts ground elevation values (m AMSL) from the active DEM raster
    at queried coordinate positions with explicit CRS handling and provenance.
    """
    if len(payload.points) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request payload must contain at least one point to sample.",
        )

    try:
        results = ElevationService.sample_batch(
            points=payload.points,
            dem_name=payload.dem_name,
        )
        return ResponseEnvelope(
            data=results,
            message=f"Sampled {results.total_samples} point(s) against DEM '{results.dem_name}'",
        )
    except FileNotFoundError as e:
        logger.warning(f"DEM file not found: {e}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "error",
                "error_code": "DEM_FILE_NOT_FOUND",
                "message": str(e),
                "data": None,
            },
        )
    except Exception as e:
        logger.error(f"Error sampling elevation: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "error_code": "ELEVATION_SAMPLING_FAILED",
                "message": "Internal error occurred while querying elevation grid.",
                "data": None,
            },
        )
