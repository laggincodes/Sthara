from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.schemas.sources import (
    SpatialSource,
    SourceRegisterRequest,
    SourceFeaturesRequest,
    SourceListResponse,
    SourceDeleteResponse,
)
from app.services.source_service import SourceService
from app.core.logging import logger

router = APIRouter(prefix="/sources", tags=["Spatial Data Sources & Reference Layers"])


@router.post(
    "",
    response_model=SpatialSource,
    status_code=status.HTTP_201_CREATED,
    summary="Register Spatial Data Source",
)
async def register_source(request: SourceRegisterRequest):
    """
    Registers a new spatial reference source or layer associated with a dataset.
    Validates dataset, uniqueness, CRS, and optional GeoJSON reference features.
    """
    try:
        return SourceService.register_source(request)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error registering spatial source: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Source registration failed: {str(exc)}",
        )


@router.get(
    "/{dataset_id}",
    response_model=SourceListResponse,
    summary="List Spatial Sources for Dataset",
)
async def list_sources(dataset_id: str):
    """
    Retrieves all spatial and reference sources registered for the specified dataset.
    Strictly isolated to the requested dataset.
    """
    try:
        sources = SourceService.list_sources(dataset_id)
        return SourceListResponse(
            dataset_id=dataset_id,
            total_sources=len(sources),
            sources=sources,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error listing sources for dataset '{dataset_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sources: {str(exc)}",
        )


@router.get(
    "/{dataset_id}/{source_id}",
    response_model=SpatialSource,
    summary="Get Specific Spatial Source",
)
async def get_source(dataset_id: str, source_id: str):
    """
    Retrieves detailed metadata and provenance for a single spatial source.
    Rejects cross-dataset source access with HTTP 400.
    """
    try:
        return SourceService.get_source(dataset_id, source_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source '{source_id}' not found in dataset '{dataset_id}'.",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error retrieving source '{source_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve source: {str(exc)}",
        )


@router.delete(
    "/{dataset_id}/{source_id}",
    response_model=SourceDeleteResponse,
    summary="Delete Spatial Source",
)
async def delete_source(dataset_id: str, source_id: str):
    """
    Deletes a registered spatial source and its associated reference features.
    """
    try:
        SourceService.delete_source(dataset_id, source_id)
        return SourceDeleteResponse(
            success=True,
            dataset_id=dataset_id,
            source_id=source_id,
            message=f"Source '{source_id}' successfully removed from dataset '{dataset_id}'.",
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source '{source_id}' not found in dataset '{dataset_id}'.",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error deleting source '{source_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete source: {str(exc)}",
        )


@router.post(
    "/{dataset_id}/{source_id}/features",
    response_model=SpatialSource,
    summary="Attach Reference GeoJSON Features to Source",
)
async def attach_source_features(dataset_id: str, source_id: str, request: SourceFeaturesRequest):
    """
    Attaches or updates reference GeoJSON features for an existing registered spatial source.
    """
    try:
        return SourceService.add_source_features(dataset_id, source_id, request.features, request.crs)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source '{source_id}' not found in dataset '{dataset_id}'.",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error attaching features to source '{source_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to attach features: {str(exc)}",
        )


@router.get(
    "/{dataset_id}/{source_id}/features",
    summary="Get Reference GeoJSON Features for Source",
)
async def get_source_features(dataset_id: str, source_id: str) -> Dict[str, Any]:
    """
    Retrieves the GeoJSON FeatureCollection for a registered reference source.
    """
    try:
        return SourceService.get_source_features(dataset_id, source_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source '{source_id}' not found in dataset '{dataset_id}'.",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Error retrieving features for source '{source_id}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve source features: {str(exc)}",
        )
