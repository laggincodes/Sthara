from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.common import NotImplementedResponse

router = APIRouter(prefix="/validation", tags=["Validation"])


@router.post("/run", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def run_validation():
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": "Deterministic spatial validation engine scheduled for Phase 7.",
            "endpoint": "/api/v1/validation/run",
            "phase_target": "PHASE 7 — Spatial validation",
        },
    )
