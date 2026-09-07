# Unit / Apartment Domain Entity & Vertical Property Model

## 1. Overview & SIH Context

In multi-storey urban cadastral environments, land parcels and whole-building envelopes alone cannot adequately represent distinct vertical spatial properties. Under high-density urban residential and commercial developments, multiple distinct private entities (apartments, flats, commercial suites, offices) occupy the same horizontal planar footprint at different elevations.

To satisfy the Smart India Hackathon (SIH) prototype requirements, the 3D Cadastral Intelligence pipeline extends the core spatial hierarchy:

```text
PARCEL
  └── BUILDING
        └── FLOOR
              └── UNIT
                    └── 3D PROPERTY VOLUME
                          └── 3D ULPIN PROTOTYPE
```

---

## 2. Fundamental Semantic Rule: Physical Modeling vs. Legal Ownership

> [!IMPORTANT]
> **Statutory Cadastral Disclaimer**
> A `UNIT` in this system represents a **physical and spatial subdivision** of a floor supported by available spatial evidence (such as architectural floor plans, surveys, laser scans, or derived CAD/BIM models).
> 
> **Physical unit geometry does NOT confer, verify, or establish legal property title, ownership, or land rights.**
> 
> The system strictly distinguishes between:
> 1. **Spatial Representation**: Watertight 3D volumetric boundaries, floor stratification, and spatial containment.
> 2. **Legal Rights / Title**: Subject to statutory state land revenue authorities, municipal registration registries, and deed conveyance laws.

---

## 3. The Unit Domain Model

### 3.1 Entity Definition

A `Unit` represents an enclosed, distinct spatial compartment within a parent `Floor`, which in turn belongs to a parent `Building` and root `Parcel`.

```text
Unit:
  ├── Identification
  │     ├── unit_id (Canonical deterministic string: BLD-{id}-FL{n}-U{num})
  │     ├── unit_number (Local human-readable floor unit number: "501")
  │     ├── unit_name (Optional descriptive name: "Apartment 501")
  │     └── unit_type (APARTMENT_UNIT | RESIDENTIAL_UNIT | OFFICE | SHOP | OTHER)
  │
  ├── Structural Hierarchy
  │     ├── parcel_id (Foreign key to root cadastral parcel)
  │     ├── building_id (Foreign key to parent building envelope)
  │     └── floor_id (Foreign key to parent floor stratum)
  │
  ├── Vertical Stratification (Metric AMSL)
  │     ├── base_elevation (Bottom Z bound in meters AMSL)
  │     ├── top_elevation (Ceiling Z bound in meters AMSL)
  │     └── height (Vertical extent = top_elevation - base_elevation)
  │
  ├── 2D / 3D Geometry
  │     ├── geometry_2d (GeoJSON Polygon representing floor plan footprint)
  │     ├── footprint_area (Planar footprint area in m²)
  │     └── volume_cubic_m (Watertight extruded unit volume in m³)
  │
  └── Provenance & Verification
        ├── source_type (FLOOR_PLAN | SURVEY | BUILDING_MODEL | DERIVED | DEMO | DRONE | LIDAR)
        ├── source (Specific filename or data source reference)
        ├── status (VALID | INVALID | UNAVAILABLE)
        └── warnings (List of spatial validation notes or edge cases)
```

### 3.2 Deterministic Identifier Specification

To avoid ambiguous, unindexed numbering, the canonical `unit_id` is deterministically generated from its parent entities and unit number:

```text
unit_id = f"{building_id}-FL{floor_number:02d}-U{unit_number}"
```

Example:
- Building: `BLD-DEMO-002`
- Floor: `5`
- Unit Number: `501`
- Generated `unit_id`: `BLD-DEMO-002-FL05-U501`

---

## 4. Geometric & Topological Validation Rules

The `UnitService` enforces strict spatial consistency rules before admitting any unit into the cadastral store:

### Rule 1: Structural Hierarchy Consistency
- Every unit must reference a valid `parcel_id`, `building_id`, and `floor_id`.
- The floor's parent building and parcel must match the unit's declared identifiers.

### Rule 2: Vertical Interval Validity
- Unit vertical bounds must be non-inverted: `ceiling_elevation > base_elevation`.
- Unit height must be strictly positive ($H \ge 1.0\text{ m}$).
- The vertical span $[\text{base}, \text{ceiling}]$ must reside entirely within the parent floor's vertical span $[\text{floor.base}, \text{floor.ceiling}]$ within an allowable tolerance of $0.05\text{ m}$.
- Silent clamping is prohibited: vertical breaches raise explicit validation errors.

### Rule 3: Planar Footprint Containment
- When 2D geometry is supplied, the unit polygon must lie within the parent building's footprint polygon.
- An area tolerance of up to $0.01\text{ m²}$ is permitted for floating-point vertex discretization, but substantive boundary spills result in `INVALID` status.

### Rule 4: Non-Overlapping Subdivisions
- Two units on the **same floor** must not overlap in planar area:
  $$\text{Area}(\text{Unit}_A \cap \text{Unit}_B) \le 10^{-6}\text{ m²}$$
- Touching along common party walls (shared polygon boundaries where intersection dimension is 1 and area is 0) is valid and expected.
- Volumetric overlap is forbidden.

### Rule 5: Unique Unit Numbering Per Floor
- No two units belonging to the same floor may share the same `unit_number`.

### Rule 6: Support for Common Circulation & Gaps
- The sum of unit areas on a floor does **not** need to equal the total floor footprint.
- Unassigned interior space (hallways, stairwells, elevator shafts, service ducts, balconies) may legitimately remain unassigned without invalidating the unit model.

---

## 5. Conceptual 3D Property Record Mapping

In accordance with the SIH presentation model, validated units can be mapped into **Conceptual 3D Property Records**:

```json
{
  "parcel_id": "PARCEL-DEMO-102",
  "building_id": "BLD-DEMO-002",
  "floor_id": "FL-DEMO-002-05",
  "unit_id": "BLD-DEMO-002-FL05-U501",
  "unit_number": "501",
  "unit_name": "Apartment 501",
  "z_range_amsl": {
    "min_z": 578.48,
    "max_z": 581.48
  },
  "volume_cubic_m": 128.48,
  "footprint_area_sqm": 42.83,
  "status": "VALID",
  "disclaimer": "PHYSICAL SPATIAL ENTITY ONLY — This 3D unit volume represents spatial Cadastral mapping and does not constitute a legal property title, deed, or ownership claim."
}
```

---

## 6. REST API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/units/validate` | `POST` | Validate a single unit entity against its parent floor and building. |
| `/api/v1/units/validate-batch` | `POST` | Validate an array of units, checking mutual non-overlap and duplicates. |
| `/api/v1/units/demo` | `GET` | Retrieve the reference synthetic multi-unit dataset (`demo_units.geojson`). |
| `/api/v1/units/building/{bld_id}` | `GET` | Query all units associated with a specific building. |
| `/api/v1/units/floor/{floor_id}` | `GET` | Query all units associated with a specific floor stratum. |
| `/api/v1/units/property-record/{unit_id}` | `GET` | Generate a conceptual 3D Property Record for a unit. |

---

## 7. Synthetic Reference Dataset

The reference dataset is located at:
`data/processed/demo_units.geojson`

- **Parent Building**: `BLD-DEMO-002` (Residential Tower 1)
- **Parent Parcel**: `PARCEL-DEMO-102`
- **Parent Floor**: Floor 5 (Level 5, $Z \in [578.48, 581.48]\text{ m AMSL}$, $H = 3.0\text{ m}$)
- **Units**:
  - `U501`: Northwest 2BHK Apartment ($42.83\text{ m²}$, $128.48\text{ m³}$)
  - `U502`: Northeast 2BHK Apartment ($40.89\text{ m²}$, $122.68\text{ m³}$)
  - `U503`: Southwest 1BHK Apartment ($40.63\text{ m²}$, $121.89\text{ m³}$)
  - `U504`: Southeast 2BHK Apartment ($42.83\text{ m²}$, $128.48\text{ m³}$)
- **Circulation Core**: Unassigned central corridor/hallway separating the four apartments.\n