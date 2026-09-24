from fastapi import APIRouter, HTTPException, status
from app.schemas.measurements import (
    DimensionsRequest,
    DimensionsResponse,
    DistanceRequest,
    DistanceResponse,
)
from app.services.measurement_service import MeasurementService
from app.core.logging import logger

router = APIRouter(prefix="/measurements", tags=["Measurements & 3D Geometry Tools"])


@router.post(
    "/dimensions",
    response_model=DimensionsResponse,
    summary="Measure Object Dimensions, Area, and Volume",
)
async def measure_dimensions(request: DimensionsRequest):
    """
    Computes exact physical dimensions (width, depth, height), footprint area, and volume
    for a selected building, floor, or unit.
    Validates dataset existence, object existence, and geometry validity.
    """
    try:
        return MeasurementService.calculate_dimensions(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error measuring dimensions: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dimension measurement failed: {str(exc)}",
        )


@router.post(
    "/distance",
    response_model=DistanceResponse,
    summary="Measure Metric Distance Between Spatial Objects",
)
async def measure_distance(request: DistanceRequest):
    """
    Calculates metric horizontal, vertical, and 3D Euclidean distances between two objects
    within the same dataset (Unit ↔ Unit, Building ↔ Building, Unit ↔ Building).
    Strictly rejects cross-dataset measurements.
    """
    try:
        return MeasurementService.calculate_distance(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error measuring distance: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Distance measurement failed: {str(exc)}",
        )
