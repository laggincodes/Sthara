from fastapi import APIRouter, HTTPException, status
from app.services.demo_service import DemoService
from app.core.logging import logger

router = APIRouter(prefix="/demo", tags=["Real-World Demo System"])


@router.post(
    "/launch",
    summary="Launch Real-World Hero Demonstration System",
)
@router.post(
    "/load",
    summary="Launch Real-World Hero Demonstration System Alias",
)
async def launch_demo():
    """
    Launches and initializes the STHARA Real-World Demonstration System
    with Hero Property 'Connaught Tower A - Commercial & Public Complex'.
    """
    try:
        return DemoService.initialize_hero_dataset()
    except Exception as exc:
        logger.error(f"Failed to launch demo dataset: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to launch demo dataset: {str(exc)}",
        )


@router.get(
    "/landing-state",
    summary="Get Real-World Hero Demo Property Landing State",
)
async def get_demo_landing_state():
    """
    Retrieves the landing state summary for the Hero Demo Property.
    """
    try:
        return DemoService.get_demo_landing_state()
    except Exception as exc:
        logger.error(f"Failed to retrieve demo landing state: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve demo landing state: {str(exc)}",
        )


@router.post(
    "/reset",
    summary="Reset Real-World Demo Dataset State",
)
async def reset_demo():
    """
    Restores the real-world demo dataset state to baseline without modifying other datasets.
    """
    try:
        return DemoService.reset_demo()
    except Exception as exc:
        logger.error(f"Failed to reset demo dataset: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset demo dataset: {str(exc)}",
        )
