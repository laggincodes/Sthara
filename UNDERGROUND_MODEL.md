# Underground & Subsurface Spatial Modeling

## 1. Executive Summary & STHARA Architectural Principle

The **Underground & Subsurface Spatial Modeling Layer** in **3D Cadastral Intelligence** implements the requirements specified in the STHARA technical presentation:

$$\mathbf{Surface\ Cadastre} \cup \mathbf{Vertical\ Cadastre} \cup \mathbf{Subsurface\ Cadastre}$$

Subsurface space incorporates critical physical and legal realities:
- **Basements and Subterranean Parking**: Structural strata extending below ground level, directly associated with a parent building and eligible for private property volume registration.
- **Underground Utility Corridors**: Linear public and utility network conduits (water supply mains, sewer pipelines, power and optical telecom duct banks).
- **Subsurface Volumes**: Generic subterranean 3D spaces subject to municipal zoning and depth horizon regulations.

---

## 2. Core Constraints & Guarantees

1. **Strict Z-Up Elevation Convention**:
   - All spatial solid coordinates adhere to native metric elevations:
     $$Z_{\text{base}} < Z_{\text{top}} \le Z_{\text{ground}}$$
   - Depths are derived relative to an explicit, authoritative surface reference datum ($Z_{\text{ground}}$):
     $$\text{depth\_to\_top} = Z_{\text{ground}} - Z_{\text{top}} \ge 0$$
     $$\text{depth\_to\_base} = Z_{\text{ground}} - Z_{\text{base}} > 0$$
     $$\text{thickness} = Z_{\text{top}} - Z_{\text{base}} > 0$$
   - Underground assets are **never** stored with arbitrary negative elevations unless the actual elevation ASL is below sea level.

2. **Semantic Separation of Property Volumes vs Public Infrastructure**:
   - `BASEMENT`: Declared with `is_cadastral_property = True`. Belongs to a parent `building_id` and legal parcel. Aggregatable into 3D property volumes.
   - `UNDERGROUND_UTILITY`: Declared with `is_cadastral_property = False`. Represents a public infrastructure easement corridor. It **never** triggers private 3D ULPIN generation and does **not** confer land ownership to the surface parcel proprietor.
   - `SUBSURFACE_VOLUME`: Generic stratum subject to statutory depth limits.

3. **Canonical 3D Geometry Contract v1.0 Compliance**:
   - Subsurface solids are watertight, closed 2-manifold triangle meshes with outward-facing normals ($Winding = \text{COUNTER\_CLOCKWISE}$).
   - Solid volume ($m^3$) is deterministically calculated using the Divergence Theorem.

4. **3D Clash & Proximity Conflict Classification**:
   - `ALLOWED_INTERSECTION`: Documented utility penetration into a building basement (e.g. municipal water main inlet with statutory service easement).
   - `REVIEW_REQUIRED`: Subsurface assets whose 3D distance is less than the proximity clearance threshold ($< 1.0\text{m}$), flagging potential excavation hazard.
   - `INVALID_OVERLAP`: Direct physical intersection between competing or unauthorized subsurface volumes.

---

## 3. Synthetic Demonstration Testbed

The platform includes a calibrated synthetic underground testbed situated at Tower 1 on Parcel `DEMO-401/1` (Bangalore Urban testbed, Ground Surface $Z_{\text{ground}} = 920.0\text{m}$ AMSL):

| Feature ID | Classification | Utility Type | Elevation Horizon ($Z_{\text{base}} - Z_{\text{top}}$) | Depth ($D_{\text{top}} - D_{\text{base}}$) | Volume | Property Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BSM-DEMO-101` | `BASEMENT` | — | $916.0\text{m} - 920.0\text{m}$ | $0.0\text{m} - 4.0\text{m}$ | $9,900.00\,\text{m}^3$ | **Private Title Eligible** |
| `UTL-DEMO-001` | `UNDERGROUND_UTILITY` | `WATER_SUPPLY` | $917.0\text{m} - 918.5\text{m}$ | $1.5\text{m} - 3.0\text{m}$ | $132.98\,\text{m}^3$ | **Public Infrastructure** |
| `UTL-DEMO-002` | `UNDERGROUND_UTILITY` | `TELECOMMUNICATIONS` | $918.4\text{m} - 919.2\text{m}$ | $0.8\text{m} - 1.6\text{m}$ | $72.19\,\text{m}^3$ | **Public Infrastructure** |

---

## 4. REST API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/underground/demo` | Retrieves full synthetic demo bundle with pre-extruded watertight solids. |
| `GET` | `/api/v1/underground/{feature_id}` | Retrieves specific subterranean feature by unique identifier. |
| `POST` | `/api/v1/underground/validate` | Audits geometry validity, depth sanity, and parcel containment (`WITHIN`, `INTERSECTS`, `OUTSIDE`). |
| `POST` | `/api/v1/underground/generate-3d` | Extrudes a 2D footprint or buffered corridor into a canonical `Mesh3D` solid. |
| `POST` | `/api/v1/underground/generate-3d/batch` | Batch 3D solid extrusion for multiple subsurface features. |
| `POST` | `/api/v1/underground/conflicts` | Evaluates 3D physical clashes and proximity clearance buffers. |

---

## 5. UI Integration

- **Data Workspace (`/data`)**:
  - `UndergroundDataCard` provides interactive inspection of subterranean assets, depth coordinate mathematics, validation gates, and clash detection recommendations.
- **3D Cadastral Stage (`/workspace/3d`)**:
  - Sub-view switcher includes dedicated **Subsurface** view mode.
  - **Cutaway View Mode**: Renders above-ground building envelopes at low opacity with wireframe silhouettes, allowing subterranean basements and utility conduits to be visually inspected in context.
  - **Underground Inspector**: Selecting any subsurface solid renders a live metadata overlay showing depth horizon, elevation interval, volume, and property title status.
