"""
FastAPI route handlers for STHARA Drawing Intelligence v1.
Controlled Document-to-Spatial Model / Plan-to-3D Pipeline.
"""

from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Query, Response
from fastapi.responses import FileResponse

from app.schemas.drawing_intelligence import (
    DrawingAnalysis,
    DrawingCandidate,
    DrawingCandidateUpdate,
    DrawingPage,
    DrawingRegion,
    BuildModelRequest,
    BuildModelResponse,
    CandidateStatus,
    SpatialSourceStatus,
)
from app.services.drawing_intelligence_service import (
    drawing_intelligence_service,
    UPLOAD_BASE_DIR,
)
from app.core.logging import logger

router = APIRouter(prefix="/drawing-intelligence", tags=["Drawing Intelligence"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB per file


@router.post("/upload", response_model=DrawingAnalysis)
async def upload_and_analyze_drawings(
    files: List[UploadFile] = File(...),
    dataset_id: str = Form("ds_tagore_garden_map_osm"),
):
    """
    Upload multiple project drawings (PDF, PNG, JPG, JPEG up to 20MB each)
    and execute the Drawing Intelligence analysis pipeline.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one drawing file must be provided.",
        )

    file_payloads = []
    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}' for file '{f.filename}'. Allowed: PDF, PNG, JPG, JPEG.",
            )

        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{f.filename}' exceeds 20MB limit ({len(content)} bytes).",
            )

        mime = f.content_type or ("application/pdf" if ext == ".pdf" else f"image/{ext.replace('.', '')}")
        file_payloads.append((f.filename or "drawing.pdf", content, mime))

    try:
        analysis = drawing_intelligence_service.create_analysis_from_files(
            dataset_id=dataset_id,
            files=file_payloads,
        )
        return analysis
    except Exception as e:
        logger.error(f"Drawing analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drawing intelligence analysis failed: {str(e)}",
        )


@router.post("/load-demo", response_model=DrawingAnalysis)
async def load_golden_demo_drawings(
    dataset_id: str = Query(default="ds_tagore_garden_map_osm"),
):
    """
    Loads and runs the 4 golden demo project drawings:
    - 20 ARCH PLAN.pdf (Architectural Sheet)
    - 20 STRU PLAN 1.pdf (Foundation Grid)
    - 20 STRU PLAN 2.pdf (Structural Framing & Beams)
    - 20 STRU PLAN 3.pdf (Column & Beam Reinforcement)
    """
    try:
        analysis = drawing_intelligence_service.load_demo_golden_set(dataset_id=dataset_id)
        return analysis
    except Exception as e:
        logger.error(f"Failed to load demo drawing set: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load demo drawing set: {str(e)}",
        )


@router.get("/latest", response_model=Optional[DrawingAnalysis])
async def get_latest_analysis_for_dataset(
    dataset_id: str = Query(default="ds_tagore_garden_map_osm"),
):
    """Retrieves the latest Drawing Intelligence analysis for the specified dataset."""
    return drawing_intelligence_service.get_latest_analysis_for_dataset(dataset_id=dataset_id)


@router.get("/source-status", response_model=SpatialSourceStatus)
async def get_spatial_source_status(
    dataset_id: str = Query(default="ds_tagore_garden_map_osm"),
):
    """
    Returns the comprehensive spatial source state for a dataset:
    - Mode A: OSM + Project Drawings
    - Mode B: Drawing-Only Mode (Empty/Missing OSM fallback)
    - Mode C: Independent Drawing Building
    - OSM Only or Empty
    """
    return drawing_intelligence_service.detect_spatial_source_state(dataset_id=dataset_id)


@router.get("/{analysis_id}", response_model=DrawingAnalysis)
async def get_analysis(analysis_id: str):
    """Retrieves an existing Drawing Intelligence analysis by ID."""
    analysis = drawing_intelligence_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found.",
        )
    return analysis


@router.get("/{analysis_id}/pages", response_model=List[DrawingPage])
async def get_analysis_pages(analysis_id: str):
    """Returns all rendered pages across all documents in this analysis."""
    analysis = drawing_intelligence_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found.",
        )
    pages: List[DrawingPage] = []
    for doc in analysis.documents:
        pages.extend(doc.pages)
    return pages


@router.get("/{analysis_id}/pages/{page_id}/image")
async def get_page_image(
    analysis_id: str,
    page_id: str,
    type: str = Query("original", pattern="^(original|processed)$"),
):
    """Streams the rendered high-resolution PNG image (original or processed/contrast-enhanced)."""
    analysis = drawing_intelligence_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")

    suffix = "orig" if type == "original" else "proc"
    
    # Locate page in analysis documents
    target_page = None
    for doc in analysis.documents:
        for p in doc.pages:
            if p.page_id == page_id:
                target_page = p
                break
        if target_page:
            break

    if target_page:
        img_filename = f"{target_page.document_id}_p{target_page.page_number}_{suffix}.png"
    else:
        img_filename = f"{page_id}_{suffix}.png"

    img_path = UPLOAD_BASE_DIR / analysis.dataset_id / analysis_id / "rendered" / img_filename
    if not img_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rendered page image '{img_filename}' not found on disk.",
        )

    return FileResponse(
        path=str(img_path),
        media_type="image/png",
        filename=img_filename,
    )


@router.get("/{analysis_id}/regions", response_model=List[DrawingRegion])
async def get_analysis_regions(analysis_id: str):
    """Returns detected drawing sheet regions (Site Plan, Ground, Typical Floor, Section, Elevation)."""
    analysis = drawing_intelligence_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return analysis.regions


@router.get("/{analysis_id}/candidates", response_model=List[DrawingCandidate])
async def get_analysis_candidates(analysis_id: str):
    """Returns all extracted candidate polygons (footprints, floors, units)."""
    analysis = drawing_intelligence_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return analysis.candidates


@router.post("/{analysis_id}/candidates/{candidate_id}/confirm", response_model=DrawingCandidate)
async def confirm_candidate(analysis_id: str, candidate_id: str):
    """Confirms a candidate for inclusion into the STHARA spatial model."""
    update = DrawingCandidateUpdate(status=CandidateStatus.CONFIRMED)
    cand = drawing_intelligence_service.update_candidate(analysis_id, candidate_id, update)
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    return cand


@router.post("/{analysis_id}/candidates/{candidate_id}/reject", response_model=DrawingCandidate)
async def reject_candidate(analysis_id: str, candidate_id: str):
    """Rejects a candidate from inclusion into the STHARA spatial model."""
    update = DrawingCandidateUpdate(status=CandidateStatus.REJECTED)
    cand = drawing_intelligence_service.update_candidate(analysis_id, candidate_id, update)
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    return cand


@router.patch("/{analysis_id}/candidates/{candidate_id}", response_model=DrawingCandidate)
async def patch_candidate(
    analysis_id: str,
    candidate_id: str,
    update: DrawingCandidateUpdate,
):
    """Allows manual editing of candidate properties (vertices, floor range, height, name)."""
    cand = drawing_intelligence_service.update_candidate(analysis_id, candidate_id, update)
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
    return cand


@router.post("/{analysis_id}/build-model", response_model=BuildModelResponse)
async def build_sthara_model(
    analysis_id: str,
    request: BuildModelRequest,
):
    """
    Generates the STHARA 3D spatial model from confirmed drawing candidates:
    - Building footprint & Vertical specification
    - 3D Floor volumes
    - 3D Unit entities with deterministic STHARA Spatial IDs
    - Provenance linking and Blueprint attachment
    """
    try:
        response = drawing_intelligence_service.build_sthara_model(analysis_id, request)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to build STHARA model from drawing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model generation failed: {str(e)}",
        )


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str):
    """Deletes a Drawing Intelligence analysis."""
    deleted = drawing_intelligence_service.delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return {"status": "SUCCESS", "message": f"Analysis '{analysis_id}' deleted."}
