from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas.common import ResponseEnvelope, ErrorEnvelope
from app.schemas.cadastre import (
    SpatialAssociationRequest,
    SpatialAssociationResponse,
)
from app.services.spatial_relationship_service import SpatialRelationshipService
from app.core.logging import logger

router = APIRouter(prefix="/spatial", tags=["Spatial Intelligence"])


@router.post(
    "/associate-buildings",
    response_model=ResponseEnvelope[SpatialAssociationResponse],
    summary="Associate Building Footprints with Cadastral Parcels",
)
async def associate_buildings(payload: SpatialAssociationRequest):
    """
    Performs deterministic spatial topological analysis between cadastral parcels
    and building footprints. Computes exact projected metric overlap areas,
    association classifications (WITHIN, MULTI_PARCEL, OUTSIDE, INTERSECTS),
    and parcel-building links.
    """
    try:
        response = SpatialRelationshipService.analyze_associations(
            parcels_geojson=payload.parcels,
            buildings_geojson=payload.buildings,
            target_crs=payload.target_crs,
        )
        return ResponseEnvelope(
            data=response,
            message="Successfully associated building footprints with cadastral parcels",
        )
    except ValueError as e:
        logger.warning(f"Spatial association validation error: {e}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": "error",
                "error_code": "SPATIAL_ASSOCIATION_VALIDATION_FAILED",
                "message": str(e),
                "data": None,
            },
        )
    except Exception as e:
        logger.error(f"Unexpected error during spatial association: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "error_code": "SPATIAL_ANALYSIS_FAILED",
                "message": "Internal error occurred while processing geometric spatial association.",
                "data": None,
            },
        )
