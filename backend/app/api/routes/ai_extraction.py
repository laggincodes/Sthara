"""
AI/ML Extraction API Routes for 3D Cadastral Intelligence.

Exposes REST endpoints for:
1. Model Registry inspection (/models)
2. Building footprint extraction (/extract/buildings)
3. Floor strata segmentation (/extract/floors)
4. Unit interior delineation (/extract/units)
5. Vertical elevation interval extraction (/extract/vertical)
6. Deterministic candidate validation gate (/validate-candidates)
7. Spatial comparison vs source/OSM (/compare)
8. Reproducible demonstration extraction bundle (/demo)

Adheres strictly to the STHARA Separation of Concerns:
- AI extracts candidate evidence only.
- Deterministic geometry engine validates and builds models.
- Legal cadastre requires authoritative registration.
"""

from typing import Any, Dict
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.schemas.ai_extraction import (
    ExtractionResult,
    BuildingExtractionRequest,
    FloorSegmentationRequest,
    UnitDelineationRequest,
    VerticalDelineationRequest,
    CandidateValidationRequest,
    CandidateValidationResponse,
    CandidateComparisonRequest,
    CandidateComparisonResponse,
    ModelRegistryResponse,
)
from app.schemas.common import NotImplementedResponse
from app.services.model_registry import model_registry
from app.services.ai_extraction_service import ai_extraction_service

router = APIRouter(prefix="/ai", tags=["AI/ML Extraction"])


@router.get(
    "/models",
    response_model=ModelRegistryResponse,
    status_code=status.HTTP_200_OK,
    summary="List all registered AI/ML and CV extraction models",
)
async def list_models() -> ModelRegistryResponse:
    """Retrieve all models in the extraction registry with availability and limitations."""
    models = model_registry.list_models()
    return ModelRegistryResponse(models=models, total_registered=len(models))


@router.post(
    "/extract/buildings",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Extract candidate building footprints from aerial/drone or DSM evidence",
)
async def extract_buildings(request: BuildingExtractionRequest) -> ExtractionResult:
    """Run building footprint extraction pipeline and output candidate polygons."""
    return ai_extraction_service.extract_buildings(request)


@router.post(
    "/extract/floors",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Segment candidate floor strata from building height and elevation bounds",
)
async def extract_floors(request: FloorSegmentationRequest) -> ExtractionResult:
    """Run vertical 1D clustering to derive candidate floor level intervals."""
    return ai_extraction_service.segment_floors(request)


@router.post(
    "/extract/units",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Delineate candidate apartment unit partitions from floor geometry",
)
async def extract_units(request: UnitDelineationRequest) -> ExtractionResult:
    """
    Delineate candidate unit polygons within floor boundaries.
    Returns UNIT_EXTRACTION_UNAVAILABLE if floor plan evidence is absent.
    """
    return ai_extraction_service.delineate_units(request)


@router.post(
    "/extract/vertical",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Extract coordinated vertical elevation intervals for structural strata",
)
async def extract_vertical(request: VerticalDelineationRequest) -> ExtractionResult:
    """Derive coordinated candidate base and top elevation bounds."""
    return ai_extraction_service.delineate_vertical(request)


@router.post(
    "/validate-candidates",
    response_model=CandidateValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Deterministically validate candidate features before 3D extrusion",
)
async def validate_candidates(request: CandidateValidationRequest) -> CandidateValidationResponse:
    """
    Mandatory validation gate between AI candidates and deterministic 3D engine.
    Checks geometry validity, CRS, parcel containment, unit non-overlap, and confidence.
    """
    return ai_extraction_service.validate_candidates(request)


@router.post(
    "/compare",
    response_model=CandidateComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare AI candidate geometry against authoritative or OSM source geometry",
)
async def compare_geometries(request: CandidateComparisonRequest) -> CandidateComparisonResponse:
    """Compute IoU, overlapping area, centroid offset, and boundary discrepancies."""
    return ai_extraction_service.compare_candidate_to_reference(request)


@router.get(
    "/demo",
    status_code=status.HTTP_200_OK,
    summary="Get pre-calibrated reproducible benchmark demonstration candidate bundle",
)
async def get_demo_extraction() -> Dict[str, Any]:
    """Return offline deterministic benchmark candidates for Tower 1."""
    return ai_extraction_service.get_demo_ai_extraction()


@router.post(
    "/explain",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    response_model=NotImplementedResponse,
    summary="Auxiliary Gemini natural language explainer",
)
async def explain_report():
    """Reserved for Phase 10 optional natural language explanation."""
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "message": "Auxiliary Gemini natural language explainer scheduled for Phase 10.",
            "endpoint": "/api/v1/ai/explain",
            "phase_target": "PHASE 10 — Optional Gemini intelligence",
        },
    )
