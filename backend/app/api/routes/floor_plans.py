from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from typing import Optional

from app.schemas.floor_plan import (
    FloorPlanAssociation,
    FloorPlanListResponse,
    FloorPlanDeleteResponse,
)
from app.services.floor_plan_service import FloorPlanService, MAX_FILE_SIZE_BYTES
from app.core.logging import logger

router = APIRouter(prefix="/floor-plans", tags=["Floor Plans & Blueprints"])


@router.post(
    "/upload",
    response_model=FloorPlanAssociation,
    summary="Upload and associate a floor plan / blueprint document with an individual floor",
    description=(
        "Accepts a PDF, PNG, or JPG document and associates it strictly with "
        "(dataset_id, building_id, floor_id). Does NOT perform AI interpretation "
        "or 3D geometric synthesis. Preserves existing floor geometry."
    ),
)
async def upload_floor_plan(
    dataset_id: str = Form(..., description="Dataset identifier"),
    building_id: str = Form(..., description="Parent building structure ID"),
    floor_id: str = Form(..., description="Target floor ID (e.g. BLD-001-FL01 or BLD-001-B01)"),
    file: UploadFile = File(..., description="Floor plan document (PDF, PNG, JPG)"),
) -> FloorPlanAssociation:
    filename = file.filename or "floor_plan.pdf"

    # Read bytes with size protection
    try:
        content_bytes = await file.read(MAX_FILE_SIZE_BYTES + 1024)
    except Exception as e:
        logger.error(f"Error reading uploaded floor plan file '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded document file.",
        )

    if len(content_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File exceeds maximum permitted size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    try:
        assoc = FloorPlanService.attach_floor_plan(
            dataset_id=dataset_id,
            building_id=building_id,
            floor_id=floor_id,
            filename=filename,
            content_bytes=content_bytes,
            mime_type=file.content_type,
        )
        return assoc
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error(f"Error attaching floor plan: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to associate floor plan document with floor.",
        )


@router.get(
    "/{dataset_id}/{building_id}/{floor_id}",
    response_model=FloorPlanAssociation,
    summary="Get floor plan association for a specific floor",
    description="Returns metadata for the attached floor plan. Returns 404 if no plan is associated.",
)
async def get_floor_plan(
    dataset_id: str,
    building_id: str,
    floor_id: str,
) -> FloorPlanAssociation:
    assoc = FloorPlanService.get_floor_plan(dataset_id, building_id, floor_id)
    if not assoc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No floor plan attached to floor '{floor_id}' in building '{building_id}'.",
        )
    return assoc


@router.get(
    "/{dataset_id}",
    response_model=FloorPlanListResponse,
    summary="List all floor plan associations for a dataset",
    description="Returns all floor plans registered under a specific dataset ID. Enforces strict dataset isolation.",
)
async def list_dataset_floor_plans(dataset_id: str) -> FloorPlanListResponse:
    plans = FloorPlanService.list_dataset_floor_plans(dataset_id)
    return FloorPlanListResponse(
        dataset_id=dataset_id,
        total_count=len(plans),
        floor_plans=plans,
    )


@router.delete(
    "/{dataset_id}/{building_id}/{floor_id}",
    response_model=FloorPlanDeleteResponse,
    summary="Remove a floor plan association from a floor",
    description="Removes the floor plan association and cleans up the document file. Floor 3D geometry remains intact.",
)
async def delete_floor_plan(
    dataset_id: str,
    building_id: str,
    floor_id: str,
) -> FloorPlanDeleteResponse:
    success = FloorPlanService.remove_floor_plan(dataset_id, building_id, floor_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No floor plan found to remove for floor '{floor_id}' in building '{building_id}'.",
        )
    return FloorPlanDeleteResponse(
        status="success",
        message="Floor plan association removed successfully.",
        dataset_id=dataset_id,
        building_id=building_id,
        floor_id=floor_id,
    )


@router.get(
    "/{dataset_id}/{building_id}/{floor_id}/view",
    summary="Stream or preview the floor plan document",
    description="Streams the raw PDF or image file inline for browser rendering.",
)
async def view_floor_plan(
    dataset_id: str,
    building_id: str,
    floor_id: str,
):
    result = FloorPlanService.get_file_for_view(dataset_id, building_id, floor_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Floor plan document file not found for floor '{floor_id}'.",
        )
    file_path, mime_type, filename = result
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
