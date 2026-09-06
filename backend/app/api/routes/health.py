from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def get_health() -> HealthResponse:
    """Returns basic service health status confirming API availability."""
    return HealthResponse(
        status="ok",
        service="3D Cadastral Intelligence API",
    )
