from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.common import NotImplementedResponse

router = APIRouter(prefix="/ai", tags=["AI Advisor"])


@router.post("/explain", status_code=status.HTTP_501_NOT_IMPLEMENTED, response_model=NotImplementedResponse)
async def explain_report():
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": "Auxiliary Gemini natural language explainer scheduled for Phase 10.",
            "endpoint": "/api/v1/ai/explain",
            "phase_target": "PHASE 10 — Optional Gemini intelligence",
        },
    )
