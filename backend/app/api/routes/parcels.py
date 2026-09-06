from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.common import NotImplementedResponse

router = APIRouter(prefix="/parcels", tags=["Parcels"])


@router.get("/{parcel_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def get_parcel(parcel_id: str):
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": f"Parcel retrieval for '{parcel_id}' scheduled for Phase 4.",
            "endpoint": f"/api/v1/parcels/{parcel_id}",
            "phase_target": "PHASE 4 — 2D parcel visualization",
        },
    )


@router.get("/{parcel_id}/buildings", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def get_parcel_buildings(parcel_id: str):
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": f"Building schedule retrieval for '{parcel_id}' scheduled for Phase 4.",
            "endpoint": f"/api/v1/parcels/{parcel_id}/buildings",
            "phase_target": "PHASE 4 — 2D parcel visualization",
        },
    )
