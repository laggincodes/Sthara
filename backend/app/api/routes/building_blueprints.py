from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.schemas.building_blueprint import (
    BuildingBlueprintRecord,
    BuildingBlueprintResponse,
)
from app.services.building_blueprint_service import BuildingBlueprintService
from app.core.logging import logger

router = APIRouter(tags=["Building Blueprints"])


@router.post(
    "/upload",
    response_model=BuildingBlueprintResponse,
    summary="Upload or replace a building-level blueprint attachment",
    description=(
        "Associates an architectural blueprint document (PDF, PNG, JPG, JPEG <= 10 MB) "
        "with an entire building entity (dataset_id + building_id). Replaces any previous attachment."
    ),
)
async def upload_building_blueprint(
    file: UploadFile = File(...),
    dataset_id: str = Form(...),
    building_id: str = Form(...),
) -> BuildingBlueprintResponse:
    dataset_id = dataset_id.strip()
    building_id = building_id.strip()

    if not dataset_id or not building_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dataset_id and building_id must be non-empty strings.",
        )

    filename = file.filename or "building_blueprint.pdf"
    content_bytes = await file.read()

    try:
        record = BuildingBlueprintService.attach_building_blueprint(
            dataset_id=dataset_id,
            building_id=building_id,
            filename=filename,
            content_bytes=content_bytes,
            mime_type=file.content_type,
        )
        return BuildingBlueprintResponse(
            success=True,
            blueprint=record,
            message=f"Building blueprint '{record.filename}' successfully attached to building '{building_id}'.",
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error(f"Failed to upload building blueprint: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process building blueprint upload: {str(exc)}",
        )


@router.get(
    "/{dataset_id}/{building_id}",
    response_model=BuildingBlueprintResponse,
    summary="Get building blueprint metadata",
    description="Returns metadata for the attached building blueprint. Returns 200 with attached=False if no blueprint is associated.",
)
async def get_building_blueprint(
    dataset_id: str,
    building_id: str,
) -> BuildingBlueprintResponse:
    record = BuildingBlueprintService.get_building_blueprint(dataset_id, building_id)
    if not record:
        return BuildingBlueprintResponse(
            success=True,
            attached=False,
            blueprint=None,
            message=f"No building blueprint attached for building '{building_id}' in dataset '{dataset_id}'.",
        )

    return BuildingBlueprintResponse(
        success=True,
        attached=True,
        blueprint=record,
        message="Retrieved building blueprint metadata successfully.",
    )


@router.get(
    "/{dataset_id}",
    summary="List building blueprints for a dataset",
)
async def list_building_blueprints_for_dataset(dataset_id: str):
    records = BuildingBlueprintService.list_dataset_blueprints(dataset_id)
    return {
        "success": True,
        "status": "success",
        "dataset_id": dataset_id,
        "feature_count": len(records),
        "blueprints": records,
    }


@router.get(
    "/{dataset_id}/{building_id}/view",
    summary="View or download attached building blueprint file",
    description="Streams the building blueprint file (PDF or image) with inline content disposition for in-browser rendering.",
)
async def view_building_blueprint(
    dataset_id: str,
    building_id: str,
):
    try:
        file_path, mime_type, filename = BuildingBlueprintService.get_file_for_view(
            dataset_id, building_id
        )
        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=filename,
            content_disposition_type="inline",
        )
    except FileNotFoundError as fnf_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf_err),
        )
    except Exception as exc:
        logger.error(f"Error streaming building blueprint for viewing: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve building blueprint file: {str(exc)}",
        )


@router.delete(
    "/{dataset_id}/{building_id}",
    response_model=BuildingBlueprintResponse,
    summary="Remove building blueprint attachment",
    description="Deletes attached building blueprint record and unlinks file from disk.",
)
async def delete_building_blueprint(
    dataset_id: str,
    building_id: str,
) -> BuildingBlueprintResponse:
    success = BuildingBlueprintService.remove_building_blueprint(dataset_id, building_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No building blueprint found to delete for building '{building_id}' in dataset '{dataset_id}'.",
        )

    return BuildingBlueprintResponse(
        success=True,
        blueprint=None,
        message=f"Building blueprint for building '{building_id}' successfully deleted.",
    )
