"""
FastAPI route handlers for STHARA Unified Project Data Entry.
Ingests Maps, Blueprints, Architectural Drawings, Structural Sheets, and Reference Data.
"""

from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Query

from app.schemas.project_data import (
    UnifiedProjectDataAnalysis,
    BuildingCorrelationMatch,
    BuildingCorrelationUpdateRequest,
)
from app.services.project_data_service import project_data_service
from app.core.logging import logger

router = APIRouter(prefix="/project-data", tags=["Project Data Entry"])

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".geojson",
    ".json",
    ".osm",
    ".xml",
    ".pbf",
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per file


@router.post("/analyze", response_model=UnifiedProjectDataAnalysis)
@router.post("/upload-and-analyze", response_model=UnifiedProjectDataAnalysis)
async def upload_and_analyze_project_data(
    files: List[UploadFile] = File(...),
    dataset_id: str = Form("ds_tagore_garden_map_osm"),
    dataset_name: Optional[str] = Form(None),
):
    """
    Unified project data upload and multi-source analysis.
    Accepts arbitrary bundles of maps, PDFs, structural drawings, and reference documents.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one project file must be uploaded.",
        )

    file_payloads = []
    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}' for file '{f.filename}'. Allowed: PDF, GeoJSON, OSM, PNG, JPG, JSON.",
            )

        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{f.filename}' exceeds 25MB limit ({len(content)} bytes).",
            )

        mime = f.content_type or ("application/pdf" if ext == ".pdf" else "application/octet-stream")
        file_payloads.append((f.filename or "project_file", content, mime))

    try:
        result = project_data_service.upload_and_analyze(
            dataset_id=dataset_id,
            files=file_payloads,
            dataset_name=dataset_name,
        )
        return result
    except Exception as e:
        logger.error(f"Unified project data analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified project data analysis failed: {str(e)}",
        )


@router.post("/load-golden-demo", response_model=UnifiedProjectDataAnalysis)
async def load_golden_demo_project_data(
    dataset_id: str = Query(default="ds_tagore_garden_map_osm"),
    dataset_name: str = Query(default="Tagore Garden Community Project"),
):
    """
    1-Click Golden Demo Data Ingestion.
    Loads site.geojson + 20 ARCH PLAN.pdf + 20 STRU PLAN 1/2/3.pdf together into the dataset.
    """
    try:
        return project_data_service.load_golden_demo(
            dataset_id=dataset_id,
            dataset_name=dataset_name,
        )
    except Exception as e:
        logger.error(f"Failed to load golden demo project data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load golden demo project data: {str(e)}",
        )


@router.get("/latest", response_model=Optional[UnifiedProjectDataAnalysis])
async def get_latest_project_data_analysis(
    dataset_id: str = Query(default="ds_tagore_garden_map_osm"),
):
    """
    Retrieves the latest unified analysis for activeDatasetId.
    """
    latest = project_data_service.get_latest_analysis(dataset_id)
    return latest


@router.patch("/{analysis_id}/correlations/{correlation_id}", response_model=BuildingCorrelationMatch)
async def update_building_correlation(
    analysis_id: str,
    correlation_id: str,
    update: BuildingCorrelationUpdateRequest,
):
    """
    Updates the confirmation status of a building candidate match (e.g. CONFIRMED, KEPT_SEPARATE).
    """
    corr = project_data_service.update_correlation(analysis_id, correlation_id, update)
    if not corr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Correlation '{correlation_id}' not found in analysis '{analysis_id}'.",
        )
    return corr
