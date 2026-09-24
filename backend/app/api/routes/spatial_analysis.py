from fastapi import APIRouter, HTTPException, status
from app.schemas.spatial_analysis import (
    ContainmentRequest,
    ContainmentResponse,
    IntersectionRequest,
    IntersectionResponse,
    ProximityRequest,
    ProximityResponse,
    VerticalRelationshipRequest,
    VerticalRelationshipResponse,
    CombinedSpatialQueryRequest,
    CombinedSpatialQueryResponse,
)
from app.services.spatial_analysis_service import SpatialAnalysisService
from app.core.logging import logger

router = APIRouter(prefix="/spatial-analysis", tags=["Spatial Analysis"])


@router.post(
    "/containment",
    response_model=ContainmentResponse,
    summary="Analyze Spatial & Hierarchical Containment",
)
async def analyze_containment(request: ContainmentRequest):
    """
    Evaluates whether Object A (container) geometrically and vertically contains Object B (contained).
    Enforces strict dataset isolation.
    """
    try:
        return SpatialAnalysisService.analyze_containment(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error in containment analysis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Containment analysis failed: {str(exc)}",
        )


@router.post(
    "/intersection",
    response_model=IntersectionResponse,
    summary="Analyze 3D Spatial Intersection & Positive Overlap",
)
async def analyze_intersection(request: IntersectionRequest):
    """
    Evaluates whether Object A and Object B intersect.
    Reports positive-area overlap in m².
    Party wall boundary contact with zero area overlap is reported as boundary_touch=True.
    """
    try:
        return SpatialAnalysisService.analyze_intersection(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error in intersection analysis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Intersection analysis failed: {str(exc)}",
        )


@router.post(
    "/proximity",
    response_model=ProximityResponse,
    summary="Calculate 3D Metric Euclidean Distance",
)
async def analyze_proximity(request: ProximityRequest):
    """
    Calculates exact Euclidean distance in meters between Object A and Object B.
    Transforms coordinates into projected metric CRS.
    """
    try:
        return SpatialAnalysisService.analyze_proximity(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error in proximity analysis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Proximity analysis failed: {str(exc)}",
        )


@router.post(
    "/vertical",
    response_model=VerticalRelationshipResponse,
    summary="Analyze Vertical Spatial Relationship",
)
async def analyze_vertical_relationship(request: VerticalRelationshipRequest):
    """
    Classifies vertical relationship between Object A and Object B into:
    SAME_LEVEL, ABOVE, BELOW, OVERLAPPING_Z_RANGE, or DISJOINT_Z_RANGE.
    """
    try:
        return SpatialAnalysisService.analyze_vertical_relationship(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error in vertical analysis: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vertical relationship analysis failed: {str(exc)}",
        )


@router.post(
    "/query",
    response_model=CombinedSpatialQueryResponse,
    summary="Combined Multi-Relationship 3D Spatial Query",
)
@router.post(
    "/spatial-query",
    response_model=CombinedSpatialQueryResponse,
    summary="Combined Multi-Relationship 3D Spatial Query Alias",
)
async def analyze_combined_query(request: CombinedSpatialQueryRequest):
    """
    Evaluates combined spatial relationships (containment, intersection, proximity, vertical)
    between Object A and Object B under dataset isolation.
    """
    try:
        return SpatialAnalysisService.analyze_combined_query(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error in combined spatial query: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Combined spatial query failed: {str(exc)}",
        )

