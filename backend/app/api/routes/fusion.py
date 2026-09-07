"""
Multi-Source Georeferencing & Spatial Data Fusion API Routes.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.fusion import (
    FusionValidateRequest,
    FusionValidateResponse,
    FusionNormalizeRequest,
    FusionNormalizeResponse,
    PropertyContextRequest,
    PropertyContextResponse,
)
from app.services.fusion_service import SpatialFusionService
from app.core.logging import logger

router = APIRouter(prefix="/fusion", tags=["Data Fusion & Georeferencing"])


@router.post(
    "/validate",
    response_model=FusionValidateResponse,
    summary="Validate multi-source datasets and CRS compatibility",
    description="Evaluates whether provided dataset metadata records share compatible geodetic baselines and can be safely transformed into the target project CRS.",
)
async def validate_fusion(req: FusionValidateRequest) -> FusionValidateResponse:
    try:
        return SpatialFusionService.validate_multi_source(
            datasets=req.datasets,
            target_crs=req.target_crs,
        )
    except Exception as e:
        logger.error(f"Fusion validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to validate multi-source datasets: {str(e)}",
        )


@router.post(
    "/normalize",
    response_model=FusionNormalizeResponse,
    summary="Normalize GeoJSON features into common target CRS",
    description="Transforms geometries into target metric CRS while strictly preserving original coordinates, native CRS, and recording transformation metadata.",
)
async def normalize_features(req: FusionNormalizeRequest) -> FusionNormalizeResponse:
    try:
        return SpatialFusionService.normalize_features(
            features=req.features,
            source_crs=req.source_crs or "EPSG:4326",
            target_crs=req.target_crs or "EPSG:32643",
        )
    except Exception as e:
        logger.error(f"Feature normalization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to normalize features: {str(e)}",
        )


@router.post(
    "/property-context",
    response_model=PropertyContextResponse,
    summary="Generate unified fused spatial property context",
    description="Orchestrates parcel boundaries, physical building footprints, ground elevation, LiDAR evidence, floors, and units into a unified property context.",
)
async def get_property_context(req: PropertyContextRequest) -> PropertyContextResponse:
    try:
        context = SpatialFusionService.build_demo_fused_context(
            target_crs=req.target_crs or "EPSG:32643",
            parcel_id=req.parcel_id,
        )
        return PropertyContextResponse(
            schema_version="1.0",
            context=context,
            message="Unified multi-source property context synthesized successfully",
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except Exception as e:
        logger.error(f"Failed to assemble property context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Property context synthesis failed: {str(e)}",
        )


@router.get(
    "/demo",
    response_model=PropertyContextResponse,
    summary="Get pre-fused demo multi-source context",
    description="Returns preloaded, validated spatial fusion linking Parcel 101, Towers 1 & 2, DEM ground elevations, LiDAR point evidence, Floor storeys, Units 501-504, and CORS GNSS station.",
)
async def get_demo_fusion(
    target_crs: str = Query(default="EPSG:32643", description="Target metric project CRS"),
    parcel_id: Optional[str] = Query(default=None, description="Optional parcel ID filter"),
) -> PropertyContextResponse:
    try:
        context = SpatialFusionService.build_demo_fused_context(
            target_crs=target_crs,
            parcel_id=parcel_id,
        )
        return PropertyContextResponse(
            schema_version="1.0",
            context=context,
            message="Demo multi-source property context loaded successfully",
        )
    except Exception as e:
        logger.error(f"Demo fusion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load demo fusion context: {str(e)}",
        )


@router.get(
    "/real-osm",
    response_model=PropertyContextResponse,
    summary="Fuse real OSM building observations into project CRS",
    description="Normalizes real OpenStreetMap footprints from New Delhi (Tagore Garden) into target project CRS, honestly preserving non-cadastral status and reporting absence of parcel records.",
)
async def get_real_osm_fusion(
    target_crs: str = Query(default="EPSG:32643", description="Target metric project CRS"),
    max_buildings: int = Query(default=15, ge=1, le=100, description="Maximum number of buildings to normalize"),
) -> PropertyContextResponse:
    try:
        context = SpatialFusionService.fuse_real_osm(
            target_crs=target_crs,
            max_buildings=max_buildings,
        )
        return PropertyContextResponse(
            schema_version="1.0",
            context=context,
            message="Real OSM buildings normalized; non-cadastral status preserved",
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fnf))
    except Exception as e:
        logger.error(f"Real OSM fusion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fuse real OSM buildings: {str(e)}",
        )
