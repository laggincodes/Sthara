# Unit-Level 3D Property Record & Presentation Reference Specification

**Document Version:** 1.0.0  
**Date:** September 2026  
**Audience:** Platform Evaluators, Cadastral Engineers, Technical Evaluators  

---

## 1. Overview & Problem Context

In multi-level residential towers and commercial complexes, multiple private units (apartments, flats, offices) share the same horizontal ground footprint. To present this hierarchy clearly to evaluators while preserving cryptographic cadastral rigor, the STHARA platform models two distinct concepts:

1. **Property Record Reference (Human-Readable)**: A presentation-oriented breadcrumb hierarchy tracing `PARCEL -> BUILDING -> FLOOR -> UNIT` (e.g. `P001-B01-FL05-U501`).
2. **Canonical 3D ULPIN Prototype (Cryptographic Identifier)**: An immutable, versioned, uppercase 64-hex SHA-256 spatial identifier generated strictly from the canonical property payload via `ULPINService` (e.g. `3DULPIN-V1-B275000C2857E6067901B3429CBA56FA7F96B322BAC19BB985025695B924D657`).

---

## 2. Distinction Architecture

```text
UNIT CADASTRAL ENTITY (e.g. Apartment 501)
   │
   ├── Human-Readable Presentation
   │     ├── canonical_parcel_id: "P001"
   │     ├── canonical_building_id: "B01"
   │     ├── canonical_floor_id: "05"
   │     ├── canonical_unit_id: "501"
   │     ├── canonical_path: "P001/B01/05/501"
   │     └── property_record_reference: "P001-B01-FL05-U501"
   │
   └── Cryptographic 3D ULPIN Prototype
         ├── Service: ULPINService.generate_for_unit()
         ├── Algorithm: SHA-256(canonical_identity_str)
         ├── Output: 3DULPIN-V1-<64_HEX_DIGEST>
         └── Verification: Validated via POST /api/v1/ulpin/verify
```

---

## 3. JSON Schema & Data Model

The `UnitPropertyRecord` response payload returned by `/api/v1/units/canonical-demo` and `/api/v1/units/property-record/{unit_id}`:

```json
{
  "parcel_id": "PARCEL-DEMO-102",
  "building_id": "BLD-DEMO-002",
  "floor_id": "BLD-DEMO-002-FL05",
  "unit_id": "BLD-DEMO-002-FL05-U501",
  "unit_number": "501",
  "unit_name": "Apartment 501 (2BHK North-West)",
  "property_id": "PROP-DEMO-102-U501",
  "canonical_parcel_id": "P001",
  "canonical_building_id": "B01",
  "canonical_floor_id": "05",
  "canonical_unit_id": "501",
  "canonical_path": "P001/B01/05/501",
  "property_record_reference": "P001-B01-FL05-U501",
  "z_range_amsl": {
    "min_z": 577.48,
    "max_z": 580.48
  },
  "volume_cubic_m": 133.5,
  "footprint_area_sqm": 44.5,
  "status": "VALID",
  "ulpin_prototype": "3DULPIN-V1-B275000C2857E6067901B3429CBA56FA7F96B322BAC19BB985025695B924D657",
  "ulpin_status": "VALID",
  "disclaimer": "CONCEPTUAL 3D PROPERTY RECORD · 3D ULPIN PROTOTYPE (RESEARCH IMPLEMENTATION). NOT AN OFFICIAL GOVERNMENT TITLE OR LEGAL OWNERSHIP CLAIM."
}
```

---

## 4. Invariant Rules

1. **Single Source of Truth for Hashing**: `UnitService` never implements independent hashing or template strings for the ULPIN. It delegates exclusively to `ULPINService`.
2. **Decoupling from Floating-Point Geometry**: Centroids, bounding cubes, mesh vertices, surface areas, and volumes are **never** inputs to the SHA-256 hash. Hashing raw floating-point numbers causes cross-platform instability and breaks when tessellation changes.
3. **Verification Integrity**: Passing `property_record_reference` (`P001-B01-FL05-U501`) to `/api/v1/ulpin/verify` is rejected with `verified: false`. Only the authoritative SHA-256 digest is accepted.
4. **Statutory Non-Claim**: 3D geometric modelling and prototype spatial hashing do not confer or verify legal land title.
