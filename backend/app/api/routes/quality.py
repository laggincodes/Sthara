from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.spatial_analysis import SpatialObjectType
from app.services.quality_service import QualityService
from app.services.measurement_service import MeasurementService
from app.core.logging import logger

router = APIRouter(prefix="/quality", tags=["Data Quality & Provenance Intelligence"])


class QualityEvaluationRequest(BaseModel):
    dataset_id: str = Field(..., description="Target dataset identifier")
    object_id: str = Field(..., description="Target object identifier")
    object_type: SpatialObjectType = Field(..., description="Object type (building, floor, unit)")
    has_floor_plan: bool = Field(False, description="Whether a floor plan is attached")
    containment_passed: bool = Field(True, description="Whether spatial containment passed")
    attributes: Optional[Dict[str, Any]] = Field(None, description="Optional object attribute overrides")


class QualityEvaluationResponse(BaseModel):
    dataset_id: str
    object_id: str
    object_type: str
    data_quality_status: str  # VALID, WARNING, INCOMPLETE, INVALID
    validation_status: str
    validation_gates: Dict[str, str]  # geometry, topology, containment, hierarchy, source_data
    provenance: Dict[str, Any]
    disclaimer: str


@router.post(
    "/evaluate",
    response_model=QualityEvaluationResponse,
    summary="Evaluate Data Quality Status and Cadastral Provenance",
)
async def evaluate_quality(request: QualityEvaluationRequest):
    """
    Deterministically evaluates Data Quality Status (VALID, WARNING, INCOMPLETE, INVALID)
    and provenance information for a building, floor, or unit.
    """
    try:
        MeasurementService.validate_dataset_exists(request.dataset_id)
        attrs = request.attributes or {}
        attrs.setdefault("building_id", request.object_id)
        attrs.setdefault("floor_id", request.object_id)
        attrs.setdefault("unit_id", request.object_id)

        if request.object_type == SpatialObjectType.BUILDING:
            q_status, prov, gates = QualityService.evaluate_building_quality(attrs)
            disclaimer = QualityService.DISCLAIMER_SPATIAL_ID
        elif request.object_type == SpatialObjectType.FLOOR:
            q_status, prov, gates = QualityService.evaluate_floor_quality(attrs, has_floor_plan=request.has_floor_plan)
            disclaimer = QualityService.DISCLAIMER_LEGAL_EVIDENCE
        else:
            q_status, prov, gates = QualityService.evaluate_unit_quality(
                attrs,
                has_floor_plan=request.has_floor_plan,
                containment_passed=request.containment_passed,
            )
            disclaimer = QualityService.DISCLAIMER_LEGAL_EVIDENCE

        return QualityEvaluationResponse(
            dataset_id=request.dataset_id,
            object_id=request.object_id,
            object_type=request.object_type.value,
            data_quality_status=q_status,
            validation_status=q_status,
            validation_gates=gates,
            provenance=prov,
            disclaimer=disclaimer,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error evaluating data quality: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data quality evaluation failed: {str(exc)}",
        )
