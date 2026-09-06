from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.common import NotImplementedResponse

router = APIRouter(tags=["3D Volumes & Pipeline"])


@router.get("/parcels/{parcel_id}/3d-model", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def get_parcel_3d_model(parcel_id: str):
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": f"3D mesh model generation for '{parcel_id}' scheduled for Phase 5 & 6.",
            "endpoint": f"/api/v1/parcels/{parcel_id}/3d-model",
            "phase_target": "PHASE 5 — 3D property generation",
        },
    )


@router.post("/pipeline/process", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def process_pipeline():
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": "Full cadastral pipeline runner scheduled for Phase 5-8 integration.",
            "endpoint": "/api/v1/pipeline/process",
            "phase_target": "PHASE 5 — 3D property generation",
        },
    )
