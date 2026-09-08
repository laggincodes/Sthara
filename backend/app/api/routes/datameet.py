from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

from app.schemas.datameet import (
    DataMeetLayerInfo,
    DataMeetAlignmentRequest,
    DataMeetAlignmentResponse,
    DataMeetMetadataResponse,
)
from app.services.datameet_service import DataMeetService

router = APIRouter(prefix="/datameet", tags=["DataMeet Maps Integration"])


@router.get(
    "/metadata",
    response_model=DataMeetMetadataResponse,
    summary="Get DataMeet Maps repository metadata and attribution",
    description="Returns source repository, license, and dataset provenance for DataMeet Maps datasets.",
)
async def get_datameet_metadata() -> DataMeetMetadataResponse:
    try:
        return DataMeetService.get_metadata()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load DataMeet metadata: {str(e)}",
        )


@router.get(
    "/layers",
    response_model=List[DataMeetLayerInfo],
    summary="List available DataMeet administrative boundary layers",
    description="Returns available Delhi administrative boundary layers (Assembly Constituencies, Districts, State).",
)
async def list_datameet_layers() -> List[DataMeetLayerInfo]:
    try:
        return DataMeetService.list_layers()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list DataMeet layers: {str(e)}",
        )


@router.get(
    "/layers/{layer_id}",
    summary="Get DataMeet layer GeoJSON FeatureCollection",
    description="Returns canonical GeoJSON for the specified DataMeet administrative boundary layer.",
)
async def get_datameet_layer_geojson(layer_id: str) -> Dict[str, Any]:
    try:
        return DataMeetService.get_layer_geojson(layer_id)
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load layer '{layer_id}': {str(e)}",
        )


@router.post(
    "/align-osm",
    response_model=DataMeetAlignmentResponse,
    summary="Spatially align DataMeet boundary with OSM building footprints",
    description="Transforms DataMeet AOI boundary and OSM buildings into working metric CRS, computes containment counts, and generates boundary rings.",
)
async def align_datameet_with_osm(request: DataMeetAlignmentRequest) -> DataMeetAlignmentResponse:
    try:
        return DataMeetService.align_and_filter(request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Spatial alignment failed: {str(e)}",
        )
