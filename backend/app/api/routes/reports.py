from fastapi import APIRouter, HTTPException, status
from app.services.report_service import ReportService
from app.core.logging import logger

router = APIRouter(prefix="/reports", tags=["Property Intelligence Reports"])


@router.get(
    "/{dataset_id}/building/{building_id}",
    summary="Generate Building Cadastral Property Report",
)
async def get_building_report(dataset_id: str, building_id: str):
    """
    Generates a comprehensive 3D building property intelligence report.
    """
    try:
        return ReportService.generate_building_report(dataset_id, building_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as exc:
        logger.error(f"Failed to generate building report: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Building report generation failed: {str(exc)}",
        )


@router.get(
    "/{dataset_id}/floor/{floor_id}",
    summary="Generate Floor Cadastral Property Report",
)
async def get_floor_report(dataset_id: str, floor_id: str):
    """
    Generates a comprehensive 3D floor property intelligence report.
    """
    try:
        return ReportService.generate_floor_report(dataset_id, floor_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as exc:
        logger.error(f"Failed to generate floor report: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Floor report generation failed: {str(exc)}",
        )


@router.get(
    "/{dataset_id}/unit/{unit_id}",
    summary="Generate Unit Cadastral Property Report",
)
async def get_unit_report(dataset_id: str, unit_id: str):
    """
    Generates a comprehensive 3D unit property intelligence report.
    """
    try:
        return ReportService.generate_unit_report(dataset_id, unit_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as exc:
        logger.error(f"Failed to generate unit report: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unit report generation failed: {str(exc)}",
        )
