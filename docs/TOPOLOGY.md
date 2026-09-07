# Unified Topology & Spatial Conflict Engine

## 1. Executive Summary & SIH Architectural Principle

The **Unified Topology & Spatial Conflict Engine** in **3D Cadastral Intelligence** implements Stage 06 of the Smart India Hackathon (SIH) technical approach:

$$\mathbf{01\ Ingestion} \rightarrow \mathbf{02\ Geo\text{-}Ref} \rightarrow \mathbf{03\ Fusion} \rightarrow \mathbf{04\ Extraction} \rightarrow \mathbf{05\ 3D\ Engine} \rightarrow \mathbf{06\ Topology} \rightarrow \mathbf{07\ 3D\ ULPIN}$$

The SIH specification mandates explicit topological validation:
- **Overlap Check**: Deterministic detection of positive-area horizontal overlaps, 3D vertical collisions, and shared party-wall contacts.
- **Containment**: Strict verification of child entities within parent footprint boundaries and vertical elevation horizons.
- **Duplicates**: Identification of duplicate entity IDs, duplicate identical geometries, and same-ID different geometry anomalies.

The engine consolidates validation across the entire cadastral hierarchy:
$$\text{PARCEL} \longrightarrow \text{BUILDING} \longrightarrow \text{FLOOR} \longrightarrow \text{UNIT} \longrightarrow \text{PROPERTY\_VOLUME} \longrightarrow \text{UNDERGROUND}$$

---

## 2. Core Constraints & Guarantees

1. **Non-Destructive Conflict Reporting**:
   - The engine **never** silently clips, shifts, or repairs geometries.
   - Any observed topological invalidity or encroachment is emitted as a structured, immutable `TopologyConflictRecord` with precise quantitative measurements and cadastral resolution guidelines.

2. **Boundary Contact Semantics (Party-Wall Rule)**:
   - Sibling parcels and units frequently touch along shared boundary edges or party walls.
   - Touching along an edge (intersection area $\le \epsilon_{\text{area}}$) is recognized as **physically valid** and emitted with severity `INFO`.
   - Positive-area overlap (intersection area $> \epsilon_{\text{area}}$) constitutes a spatial collision and is emitted as `POSITIVE_AREA_OVERLAP` with severity `ERROR`.

3. **Vertical Interval Continuity**:
   - For any two sibling floor intervals $[Z_{\text{base}, A}, Z_{\text{top}, A}]$ and $[Z_{\text{base}, B}, Z_{\text{top}, B}]$:
     $$\Delta Z_{\text{overlap}} = \min(Z_{\text{top}, A}, Z_{\text{top}, B}) - \max(Z_{\text{base}, A}, Z_{\text{base}, B})$$
   - $\Delta Z_{\text{overlap}} > \epsilon_{\text{vert}}$ indicates an illegal vertical penetration (`VERTICAL_OVERLAP`).
   - Contiguous horizontal slab contact (where $Z_{\text{top}, A} = Z_{\text{base}, B}$) satisfies $\Delta Z_{\text{overlap}} \le \epsilon_{\text{vert}}$ and is strictly valid.

4. **Canonical 3D Geometry Contract v1.0 Compliance**:
   - Reuses authoritative `ExtrusionService.validate_mesh` to verify that all 3D solid property volumes are closed, watertight 2-manifolds with outward counter-clockwise triangle face winding.

5. **Deterministic Lexicographic Ordering**:
   - All entity collections and pairwise comparisons are sorted lexicographically by identifier before evaluation.
   - All generated check and conflict identifiers are sequentially assigned and deterministically ordered.

---

## 3. Engineering Tolerances

All topological evaluations adhere to centralized, configurable engineering tolerances:

| Parameter | Default Value | SIH Cadastral Rationale |
| :--- | :--- | :--- |
| `area_tolerance_sqm` | $0.0001\,\text{m}^2$ ($1\,\text{cm}^2$) | Distinguishes touching boundary lines from true polygon area overlaps. |
| `geometry_equality_tolerance_m` | $0.001\,\text{m}$ ($1\,\text{mm}$) | Hausdorff distance limit for identifying duplicate spatial footprints. |
| `vertical_elevation_tolerance_m` | $0.001\,\text{m}$ ($1\,\text{mm}$) | Metric vertical tolerance for contiguous structural slab contact. |
| `volume_tolerance_cum` | $0.0001\,\text{m}^3$ ($100\,\text{cm}^3$) | 3D volumetric threshold for subsurface asset clash detection. |
| `underground_clearance_threshold_m` | $1.0\,\text{m}$ | Minimum safety proximity buffer between subterranean conduits. |

---

## 4. Conflict Taxonomy

| Conflict Type | Severity | Description |
| :--- | :--- | :--- |
| `DUPLICATE_ID` | `ERROR` | Multiple features register the identical entity identifier. |
| `SAME_ID_DIFFERENT_GEOMETRY` | `ERROR` | Same entity identifier assigned to differing spatial footprints. |
| `DUPLICATE_GEOMETRY` | `ERROR` | Distinct identifiers share identical spatial footprint coordinates. |
| `OUTSIDE_PARENT` | `ERROR` | Child entity footprint lies completely exterior to parent boundary. |
| `PARTIAL_CONTAINMENT` | `WARNING` / `ERROR` | Child entity partially encroaches beyond parent boundary. |
| `POSITIVE_AREA_OVERLAP` | `ERROR` | Sibling units or parcels occupy overlapping horizontal area. |
| `POSITIVE_VOLUME_OVERLAP` | `ERROR` | Direct 3D physical collision between subsurface assets. |
| `VERTICAL_OVERLAP` | `ERROR` | Vertical elevation ordering inverted or floor spans colliding. |
| `VERTICAL_OUTSIDE_PARENT` | `ERROR` | Unit/floor elevation interval extends beyond parent vertical volume. |
| `INVALID_MESH` | `ERROR` | 3D solid violates watertight 2-manifold contract. |
| `MISSING_REFERENCE` | `ERROR` | Broken parent-child reference chain in cadastral hierarchy. |

---

## 5. REST API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/topology/demo` | Retrieves multi-tier demonstration scene with pre-computed benchmark checks. |
| `POST` | `/api/v1/topology/validate` | Executes comprehensive topological and conflict audit across cadastral tiers. |
