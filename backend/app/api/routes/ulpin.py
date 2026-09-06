from fastapi import APIRouter, HTTPException, status
from app.schemas.ulpin import (
    ULPINRequest,
    ULPINResult,
    ULPINVerificationRequest,
    ULPINVerificationResult,
    BatchULPINRequest,
    BatchULPINResponse,
)
from app.services.ulpin_service import ULPINService

router = APIRouter(prefix="/ulpin", tags=["3D ULPIN Prototype"])


@router.post(
    "/generate",
    response_model=ULPINResult,
    summary="Generate deterministic 3D ULPIN prototype",
    description="Generates a versioned, reproducible 3D ULPIN prototype from canonical property identity.",
)
async def generate_ulpin(request: ULPINRequest) -> ULPINResult:
    try:
        return ULPINService.generate_3d_ulpin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating 3D ULPIN prototype: {str(e)}",
        )


@router.post(
    "/verify",
    response_model=ULPINVerificationResult,
    summary="Verify a 3D ULPIN prototype",
    description="Validates a provided 3D ULPIN string against canonical property identity.",
)
async def verify_ulpin(request: ULPINVerificationRequest) -> ULPINVerificationResult:
    try:
        return ULPINService.verify_3d_ulpin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying 3D ULPIN prototype: {str(e)}",
        )


@router.post(
    "/batch",
    response_model=BatchULPINResponse,
    summary="Batch generate deterministic 3D ULPIN prototypes",
    description="Processes multiple property entities in a single batch operation.",
)
async def batch_generate_ulpin(request: BatchULPINRequest) -> BatchULPINResponse:
    try:
        return ULPINService.generate_batch(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in batch 3D ULPIN generation: {str(e)}",
        )

