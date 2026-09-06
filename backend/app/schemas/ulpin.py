"""
Canonical Pydantic Schemas for 3D ULPIN Prototype.

Semantic Rule:
This is a project-specific deterministic identifier prototype designed to identify
cadastral property entities. It is NOT an official Government of India ULPIN specification.
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

from app.schemas.geometry_3d import Geometry3DStatus


class IdentifierStatus(str, Enum):
    """Lifecycle status of a 3D ULPIN generation attempt."""
    VALID = "VALID"
    INVALID = "INVALID"
    UNAVAILABLE = "UNAVAILABLE"


class ULPINRequest(BaseModel):
    """Input payload to generate a deterministic 3D ULPIN prototype for a property entity."""
    property_id: str = Field(..., description="Unique property identifier (e.g. PROP-DEMO-101-U01)")
    parcel_id: str = Field(..., description="Associated parent cadastral parcel ID")
    building_id: Optional[str] = Field(None, description="Primary parent building ID")
    building_ids: Optional[List[str]] = Field(None, description="Complete list of associated building IDs (for multi-building properties)")
    floor_ids: List[str] = Field(default_factory=list, description="Constituent floor IDs associated with the property")
    source_identity: Optional[str] = Field("cadastral_spatial_record", description="Provenance source of property identity")
    geometry_status: Optional[Geometry3DStatus] = Field(
        None,
        description="Spatial validation status of the associated property volume. If UNAVAILABLE or INVALID, ULPIN will not be marked VALID.",
    )


class ULPINResult(BaseModel):
    """Result of generating a deterministic 3D ULPIN prototype."""
    schema_version: str = Field("1.0", description="Contract schema version")
    identifier_version: str = Field("1", description="Identifier algorithm version")
    ulpin: Optional[str] = Field(None, description="Generated deterministic 3D ULPIN string (None if unavailable/invalid)")
    property_id: str = Field(..., description="Normalized property entity identifier")
    parcel_id: str = Field(..., description="Associated parent parcel identifier")
    building_ids: List[str] = Field(default_factory=list, description="Sorted list of associated building identifiers")
    floor_ids: List[str] = Field(default_factory=list, description="Sorted list of associated floor identifiers")
    identifier_status: IdentifierStatus = Field(..., description="Status of the generated identifier")
    canonical_identity: Optional[str] = Field(None, description="Serialized canonical string used as hashing input")
    disclaimer: str = Field(
        "3D ULPIN Prototype — Project-specific deterministic identifier design for demonstration purposes. Not an official Government of India ULPIN specification.",
        description="Authoritative legal and domain disclaimer",
    )
    warnings: List[str] = Field(default_factory=list, description="Warnings, failure reasons, or provenance notes")


class BatchULPINRequest(BaseModel):
    """Batch request for multiple property entities."""
    properties: List[ULPINRequest] = Field(..., description="List of property ULPIN requests")


class ULPINBatchSummary(BaseModel):
    """Summary metrics for batch ULPIN generation."""
    requested: int
    valid: int
    invalid: int
    unavailable: int


class BatchULPINResponse(BaseModel):
    """Batch response for multiple property entities."""
    schema_version: str = Field("1.0", description="Contract schema version")
    identifier_version: str = Field("1", description="Identifier algorithm version")
    results: List[ULPINResult] = Field(..., description="List of generated ULPIN results")
    summary: ULPINBatchSummary = Field(..., description="Batch execution summary")


class ULPINVerificationRequest(BaseModel):
    """Request to verify whether a given 3D ULPIN matches the canonical property identity."""
    ulpin: str = Field(..., description="Provided 3D ULPIN string to verify")
    property_id: str = Field(..., description="Property identifier")
    parcel_id: str = Field(..., description="Parent cadastral parcel ID")
    building_id: Optional[str] = Field(None, description="Primary parent building ID")
    building_ids: Optional[List[str]] = Field(None, description="Complete list of building IDs")
    floor_ids: List[str] = Field(default_factory=list, description="List of constituent floor IDs")
    identifier_version: Optional[str] = Field("1", description="Expected identifier version (default: '1')")


class ULPINVerificationResult(BaseModel):
    """Verification outcome for a provided 3D ULPIN string."""
    verified: bool = Field(..., description="True if the provided ULPIN strictly matches the canonical hash")
    match: bool = Field(..., description="Convenience alias for verified status")
    provided_ulpin: str = Field(..., description="The ULPIN string supplied in the verification request")
    expected_ulpin: Optional[str] = Field(None, description="The canonical ULPIN recomputed from supplied property identity")
    property_id: str = Field(..., description="Target property ID")
    details: str = Field(..., description="Descriptive outcome explanation")
