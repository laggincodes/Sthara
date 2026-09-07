"""
3D ULPIN Prototype Service.

Semantic Rule & Purpose:
Implements deterministic, reproducible 3D ULPIN generation for cadastral property entities.
The identifier identifies the property entity, NOT the mesh geometry (no hash of raw vertices,
floating-point coordinates, or rendering state).

CRITICAL NOTICE:
This is a project-specific deterministic identifier prototype for demonstration purposes.
It is NOT an official Government of India ULPIN specification.
"""

from typing import List, Dict, Any, Optional
import hashlib

from app.schemas.geometry_3d import Geometry3DStatus
from app.schemas.property_volume import PropertyVolumeResult, PropertyVolumeRequest
from app.schemas.ulpin import (
    IdentifierStatus,
    ULPINRequest,
    ULPINResult,
    BatchULPINRequest,
    BatchULPINResponse,
    ULPINBatchSummary,
    ULPINVerificationRequest,
    ULPINVerificationResult,
)

IDENTIFIER_NAMESPACE = "3DULPIN"
IDENTIFIER_VERSION = "1"
DISCLAIMER_TEXT = (
    "3D ULPIN Prototype — Project-specific deterministic identifier design for demonstration purposes. "
    "Not an official Government of India ULPIN specification."
)


class ULPINService:
    """Domain service for generating and verifying deterministic 3D ULPIN prototype identifiers."""

    @staticmethod
    def extract_building_ids(req: Any) -> List[str]:
        """Extracts and normalizes building IDs from request or property volume result."""
        bids: List[str] = []
        if getattr(req, "building_ids", None):
            bids.extend([b.strip() for b in req.building_ids if b and b.strip()])
        elif getattr(req, "building_id", None):
            b = req.building_id.strip()
            if b:
                bids.append(b)
        return bids

    @staticmethod
    def extract_floor_ids(req: Any) -> List[str]:
        """Extracts and normalizes floor IDs from request or property volume result."""
        fids = getattr(req, "floor_ids", []) or []
        return [f.strip() for f in fids if f and f.strip()]

    @classmethod
    def build_canonical_property_identity(
        cls,
        req: Any,
        version: str = IDENTIFIER_VERSION,
    ) -> Dict[str, Any]:
        """
        Constructs a normalized, deterministic identity payload for a property entity.
        Sorts building IDs and floor IDs lexicographically.
        Does NOT include any vertex coordinates, bounding boxes, or mesh geometry metrics.
        """
        prop_id = (req.property_id or "").strip()
        parcel_id = (req.parcel_id or "").strip()
        source_id = getattr(req, "source_identity", None) or "cadastral_spatial_record"

        raw_bids = cls.extract_building_ids(req)
        raw_fids = cls.extract_floor_ids(req)

        # Check for duplicates before sorting
        if len(raw_bids) != len(set(raw_bids)):
            raise ValueError(f"Duplicate building IDs detected: {raw_bids}")
        if len(raw_fids) != len(set(raw_fids)):
            raise ValueError(f"Duplicate floor IDs detected: {raw_fids}")

        sorted_bids = sorted(raw_bids)
        sorted_fids = sorted(raw_fids)

        return {
            "namespace": IDENTIFIER_NAMESPACE,
            "version": str(version),
            "property_id": prop_id,
            "parcel_id": parcel_id,
            "building_ids": sorted_bids,
            "floor_ids": sorted_fids,
            "source_identity": source_id,
        }

    @staticmethod
    def canonicalize_identity(identity: Dict[str, Any]) -> str:
        """
        Serializes the canonical property identity into a strictly deterministic string.
        Format: 3DULPIN|v<version>|property:<id>|parcel:<id>|buildings:<b1>,<b2>|floors:<f1>,<f2>
        """
        bld_str = ",".join(identity.get("building_ids", []))
        flr_str = ",".join(identity.get("floor_ids", []))
        return (
            f"{identity.get('namespace', IDENTIFIER_NAMESPACE)}|"
            f"v{identity.get('version', IDENTIFIER_VERSION)}|"
            f"property:{identity.get('property_id', '')}|"
            f"parcel:{identity.get('parcel_id', '')}|"
            f"buildings:{bld_str}|"
            f"floors:{flr_str}"
        )

    @classmethod
    def generate_for_unit(
        cls,
        unit: Any,
        geometry_status: Optional[Geometry3DStatus] = None,
    ) -> ULPINResult:
        """
        Authoritative generator for a unit-level cadastral entity.
        Extracts stable property, parcel, building, and floor identifiers,
        and delegates to the single canonical 3D ULPIN algorithm.
        """
        prop_id = getattr(unit, "property_id", None) or getattr(unit, "unit_id", "")
        parcel_id = getattr(unit, "parcel_id", "")
        b_id = getattr(unit, "building_id", "")
        f_id = getattr(unit, "floor_id", "")

        geom_stat = geometry_status
        if geom_stat is None:
            u_status = getattr(unit, "status", None)
            u_status_str = u_status.value if hasattr(u_status, "value") else str(u_status)
            geom_stat = Geometry3DStatus.VALID if u_status_str in ("VALID", "None", "") else Geometry3DStatus.INVALID

        req = ULPINRequest(
            property_id=prop_id,
            parcel_id=parcel_id,
            building_id=b_id,
            building_ids=[b_id] if b_id else [],
            floor_ids=[f_id] if f_id else [],
            source_identity="cadastral_spatial_record",
            geometry_status=geom_stat,
        )
        return cls.generate_3d_ulpin(req)

    @classmethod
    def generate_3d_ulpin(
        cls,
        req: ULPINRequest,
        property_volume: Optional[PropertyVolumeResult] = None,
    ) -> ULPINResult:
        """
        Generates a deterministic 3D ULPIN prototype from the property entity identity.
        Enforces validation and rejects unverified or invalid spatial volumes.
        """
        warnings: List[str] = []
        prop_id = (req.property_id or "").strip()
        parcel_id = (req.parcel_id or "").strip()

        # 1. Basic Identity Validation
        if not prop_id:
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id="",
                parcel_id=parcel_id,
                building_ids=[],
                floor_ids=[],
                identifier_status=IdentifierStatus.INVALID,
                warnings=["Missing property_id."],
            )

        if not parcel_id:
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id="",
                building_ids=[],
                floor_ids=[],
                identifier_status=IdentifierStatus.INVALID,
                warnings=["Missing parcel_id."],
            )

        raw_bids = cls.extract_building_ids(req)
        raw_fids = cls.extract_floor_ids(req)

        # 2. Duplicate Component Check
        if len(raw_bids) != len(set(raw_bids)):
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id=parcel_id,
                building_ids=raw_bids,
                floor_ids=raw_fids,
                identifier_status=IdentifierStatus.INVALID,
                warnings=[f"Duplicate building IDs detected in property entity: {raw_bids}"],
            )

        if len(raw_fids) != len(set(raw_fids)):
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id=parcel_id,
                building_ids=raw_bids,
                floor_ids=raw_fids,
                identifier_status=IdentifierStatus.INVALID,
                warnings=[f"Duplicate floor IDs detected in property entity: {raw_fids}"],
            )

        # 3. Spatial Volume Status Check
        geom_status = req.geometry_status
        if property_volume is not None:
            geom_status = property_volume.geometry_status

        if geom_status == Geometry3DStatus.UNAVAILABLE:
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id=parcel_id,
                building_ids=sorted(raw_bids),
                floor_ids=sorted(raw_fids),
                identifier_status=IdentifierStatus.UNAVAILABLE,
                warnings=[
                    "Spatial property volume is UNAVAILABLE. "
                    "A valid 3D ULPIN cannot be issued for an incomplete or unverified spatial extent."
                ],
            )

        if geom_status == Geometry3DStatus.INVALID:
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id=parcel_id,
                building_ids=sorted(raw_bids),
                floor_ids=sorted(raw_fids),
                identifier_status=IdentifierStatus.INVALID,
                warnings=[
                    "Spatial property volume is INVALID. "
                    "A valid 3D ULPIN cannot be issued for an invalid spatial volume."
                ],
            )

        # 4. Construct Canonical Identity & Hash
        try:
            canonical_payload = cls.build_canonical_property_identity(req, version=IDENTIFIER_VERSION)
            canonical_identity_str = cls.canonicalize_identity(canonical_payload)
        except Exception as e:
            return ULPINResult(
                schema_version="1.0",
                identifier_version=IDENTIFIER_VERSION,
                ulpin=None,
                property_id=prop_id,
                parcel_id=parcel_id,
                building_ids=sorted(raw_bids),
                floor_ids=sorted(raw_fids),
                identifier_status=IdentifierStatus.INVALID,
                warnings=[f"Failed to build canonical identity: {str(e)}"],
            )

        digest = hashlib.sha256(canonical_identity_str.encode("utf-8")).hexdigest().upper()
        ulpin_code = f"{IDENTIFIER_NAMESPACE}-V{IDENTIFIER_VERSION}-{digest}"

        return ULPINResult(
            schema_version="1.0",
            identifier_version=IDENTIFIER_VERSION,
            ulpin=ulpin_code,
            property_id=prop_id,
            parcel_id=parcel_id,
            building_ids=canonical_payload["building_ids"],
            floor_ids=canonical_payload["floor_ids"],
            identifier_status=IdentifierStatus.VALID,
            canonical_identity=canonical_identity_str,
            disclaimer=DISCLAIMER_TEXT,
            warnings=warnings,
        )

    @classmethod
    def verify_3d_ulpin(cls, req: ULPINVerificationRequest) -> ULPINVerificationResult:
        """
        Verifies a provided 3D ULPIN string against the canonical property identity.
        Reconstructs the expected identifier and performs constant-time or exact string match.
        """
        version = req.identifier_version or IDENTIFIER_VERSION
        try:
            canonical_payload = cls.build_canonical_property_identity(req, version=version)
            canonical_identity_str = cls.canonicalize_identity(canonical_payload)
            digest = hashlib.sha256(canonical_identity_str.encode("utf-8")).hexdigest().upper()
            expected = f"{IDENTIFIER_NAMESPACE}-V{version}-{digest}"
            provided_clean = (req.ulpin or "").strip()

            is_match = (provided_clean == expected)
            details = "ULPIN matches canonical property identity exactly." if is_match else (
                f"Verification failed: Provided '{provided_clean}' does not match expected '{expected}'."
            )
            return ULPINVerificationResult(
                verified=is_match,
                match=is_match,
                provided_ulpin=provided_clean,
                expected_ulpin=expected,
                property_id=req.property_id,
                details=details,
            )
        except Exception as e:
            return ULPINVerificationResult(
                verified=False,
                match=False,
                provided_ulpin=req.ulpin,
                expected_ulpin=None,
                property_id=req.property_id,
                details=f"Verification encountered error: {str(e)}",
            )

    @classmethod
    def generate_batch(
        cls,
        batch_req: BatchULPINRequest,
        property_volumes_map: Optional[Dict[str, PropertyVolumeResult]] = None,
    ) -> BatchULPINResponse:
        """Processes a batch of property entities into 3D ULPIN prototypes."""
        results: List[ULPINResult] = []
        p_map = property_volumes_map or {}

        valid_count = 0
        invalid_count = 0
        unavail_count = 0

        for req in batch_req.properties:
            vol_res = p_map.get(req.property_id)
            res = cls.generate_3d_ulpin(req, property_volume=vol_res)
            results.append(res)
            if res.identifier_status == IdentifierStatus.VALID:
                valid_count += 1
            elif res.identifier_status == IdentifierStatus.UNAVAILABLE:
                unavail_count += 1
            else:
                invalid_count += 1

        summary = ULPINBatchSummary(
            requested=len(batch_req.properties),
            valid=valid_count,
            invalid=invalid_count,
            unavailable=unavail_count,
        )

        return BatchULPINResponse(
            schema_version="1.0",
            identifier_version=IDENTIFIER_VERSION,
            results=results,
            summary=summary,
        )
