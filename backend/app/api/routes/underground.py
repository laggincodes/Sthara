"""
Underground & Subsurface Spatial Modeling API Routes.

Exposes REST endpoints for:
1. Subsurface feature validation (/validate)
2. 3D solid extrusion (/generate-3d, /generate-3d/batch)
3. Subsurface conflict & clash detection (/conflicts)
4. Demonstration bundle retrieval (/demo)
5. Single feature lookup (/{feature_id})

Adheres strictly to Canonical 3D Geometry Contract v1.0, SIH spatial hierarchy,
and strict distinction between private property volumes (Basements) and public infrastructure (Utilities).
"""

from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.underground import (
    DemoUndergroundResponse,
    GenerateUnderground3DResponse,
    Underground3DRequest,
    Underground3DResult,
    UndergroundConflictRequest,
    UndergroundConflictResponse,
    UndergroundFeature,
    UndergroundValidationRequest,
    UndergroundValidationResponse,
)
from app.services.underground_service import underground_service

router = APIRouter(prefix="/underground", tags=["Underground Spatial Modeling"])


@router.get(
    "/demo",
    response_model=DemoUndergroundResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve realistic synthetic underground demo bundle",
)
async def get_demo_bundle() -> DemoUndergroundResponse:
    """Retrieve pre-computed demonstration underground features for Tower 1 & Parcel DEMO-401/1."""
    return underground_service.get_demo_underground_bundle()


@router.get(
    "/{feature_id}",
    response_model=UndergroundFeature,
    status_code=status.HTTP_200_OK,
    summary="Retrieve specific underground feature by ID",
)
async def get_feature(feature_id: str) -> UndergroundFeature:
    """Find and return an underground feature from the demo repository or active registry."""
    bundle = underground_service.get_demo_underground_bundle()
    for feat in bundle.features:
        if feat.underground_feature_id == feature_id:
            return feat
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Underground feature '{feature_id}' not found in registry.",
    )


@router.post(
    "/validate",
    response_model=UndergroundValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate subsurface feature geometry, depth consistency, and cadastral relationship",
)
async def validate_feature(
    request: UndergroundValidationRequest,
) -> UndergroundValidationResponse:
    """Audit an underground feature against elevation sanity, 2D geometry, and parcel boundaries."""
    return underground_service.validate_underground_feature(request)


@router.post(
    "/generate-3d",
    response_model=Underground3DResult,
    status_code=status.HTTP_200_OK,
    summary="Generate canonical watertight 3D solid for an underground feature",
)
async def generate_3d(request: Underground3DRequest) -> Underground3DResult:
    """Extrude 2D footprint into a watertight 2-manifold Mesh3D solid under the ground surface."""
    return underground_service.generate_underground_3d(request)


@router.post(
    "/generate-3d/batch",
    response_model=GenerateUnderground3DResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch generate canonical 3D solids for multiple underground features",
)
async def generate_3d_batch(
    requests: List[Underground3DRequest],
) -> GenerateUnderground3DResponse:
    """Extrude multiple subsurface features in a single batch operation."""
    return underground_service.generate_underground_3d_batch(requests)


@router.post(
    "/conflicts",
    response_model=UndergroundConflictResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect physical clashes and proximity conflicts between subsurface features",
)
async def evaluate_conflicts(
    request: UndergroundConflictRequest,
) -> UndergroundConflictResponse:
    """Evaluate 3D horizontal and vertical clash intersections and classify conflict severity."""
    return underground_service.evaluate_conflicts(request)
