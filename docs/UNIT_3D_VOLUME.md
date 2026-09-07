# Unit-Level 3D Property Volumes & Physical Extrusion

## 1. Overview & SIH Context

Step 17 implements the physical 3D representation for the Unit / Apartment domain entity introduced in Step 16, completing the full five-tier cadastral hierarchy required by the Smart India Hackathon (SIH) presentation:

```text
PARCEL
  └── BUILDING
        └── FLOOR
              └── UNIT
                    └── 3D PROPERTY VOLUME
                          └── 3D ULPIN PROTOTYPE
```

Every spatial unit with a 2D floorplan footprint, base elevation, and top elevation can now be extruded into a closed, watertight, 2-manifold 3D polyhedral mesh solid that conforms strictly to the **Canonical 3D Geometry Contract (v1.0)**.

---

## 2. Statutory Cadastral Disclaimer

> [!IMPORTANT]
> **Spatial Modeling vs. Legal Deed**
> A 3D unit volume in this platform represents the physical spatial extent of an apartment, flat, or commercial suite derived from spatial evidence (architectural floorplans, BIM models, building surveys, or LiDAR point clouds).
> 
> **Physical unit geometry does NOT confer, register, or establish legal property title, conveyance, or statutory ownership.**
> 
> All legal titles remain under the authoritative jurisdiction of statutory state land revenue authorities, sub-registrar offices, and municipal revenue departments.

---

## 3. Physical 3D Extrusion Engine

### 3.1 Mathematical Solid Generation

Given a unit footprint polygon $P \subset \mathbb{R}^2$ with area $A$, and resolved vertical interval $[z_{\text{base}}, z_{\text{top}}]$ with height $h = z_{\text{top}} - z_{\text{base}} > 0$:

1. **Top & Bottom Caps**:
   - Bottom face triangulated at $z = z_{\text{base}}$ with inward normal pointing downwards (clockwise viewed from above).
   - Top face triangulated at $z = z_{\text{top}}$ with outward normal pointing upwards (counter-clockwise viewed from above).
   - Triangulation is performed using 2D Delaunay constrained triangulation.

2. **Vertical Side Walls**:
   - For each perimeter edge $e_k = (v_k, v_{k+1})$ of the footprint boundary, a vertical quad is formed:
     $$(x_k, y_k, z_{\text{base}}) \to (x_{k+1}, y_{k+1}, z_{\text{base}}) \to (x_{k+1}, y_{k+1}, z_{\text{top}}) \to (x_k, y_k, z_{\text{top}})$$
   - Each quad is partitioned into two triangles with strict **Counter-Clockwise (CCW)** outward winding.

3. **MultiPolygon Units**:
   - Units with disjoint planar parts (e.g., apartment body + detached balcony or storage area) are extruded component-by-component into a `Mesh3DCollection` of discrete closed polyhedra.
   - No artificial geometry is fabricated across empty spaces between disjoint components.

4. **Independent Volume Verification**:
   - Mathematical volume is computed from the mesh geometry using the divergence theorem:
     $$V_{\text{mesh}} = \frac{1}{6} \sum_{f} \mathbf{v}_0 \cdot (\mathbf{v}_1 \times \mathbf{v}_2)$$
   - Verified against analytical volume $V_{\text{analytical}} = A \times h$. Discrepancies exceeding 5% trigger sanity warnings.

---

## 4. Vertical Extent Resolution & Validation

The backend resolves unit elevations using a deterministic hierarchy:

| Priority | Source | Description | Status |
| :--- | :--- | :--- | :--- |
| **1** | `EXPLICIT_UNIT_ELEVATION` | Unit specifies finite `base_elevation` and `top_elevation` (or `height`). | `VALID` |
| **2** | `PARENT_FLOOR_INHERITED` | Missing unit elevations inherit `[parent_floor_base, parent_floor_top]`. | `VALID` (with notice) |
| **3** | `UNAVAILABLE` | Neither explicit elevations nor parent floor bounds are available. | `UNAVAILABLE` |

### Integrity Rules:
- **Inverted Height**: If $z_{\text{top}} \le z_{\text{base}}$, flagged as `UNIT_INVALID_VERTICAL_EXTENT` (`INVALID`).
- **Floor Bound Violation**: If unit vertical extent exceeds parent floor range $[z_{fl,\text{base}} - \epsilon, z_{fl,\text{top}} + \epsilon]$, flagged as `UNIT_OUTSIDE_FLOOR_VERTICAL_BOUNDS` (`INVALID`).

---

## 5. Planar Non-Overlap & Party-Wall Contact

In multi-unit floors, adjacent apartments naturally share interior party-walls.

- **Party-Wall Touching (Allowed)**:
  - If $\text{area}(\text{unit}_A \cap \text{unit}_B) = 0$ (intersection is a `LineString` or `Point`), the units share a boundary and both pass validation.
- **Positive-Area Overlap (Rejected)**:
  - If $\text{area}(\text{unit}_A \cap \text{unit}_B) > 10^{-10}$ deg$^2$ on the same floor, the overlap is flagged as `POSITIVE_AREA_OVERLAP` / `UNIT_OVERLAPPING_SIBLING_UNIT` and geometry status is set to `INVALID`.

---

## 6. Property-Volume Aggregation Rule

A cadastral property volume may represent:
1. A whole floor (`floor_ids`).
2. An aggregation of constituent apartment units (`unit_ids`).

When `PropertyVolumeRequest` specifies `unit_ids`:
- The backend matches and verifies each constituent unit solid.
- Combines individual unit meshes into a `Mesh3DCollection` with `feature_type = FeatureType.PROPERTY_VOLUME`.
- Preserves discrete unit boundaries without performing destructive boolean unions.

---

## 7. REST API Endpoints

### 7.1 `POST /api/v1/units/generate-3d`
Generates 3D polyhedral mesh solids for a batch of units.

**Request (`BatchUnit3DRequest`)**:
```json
{
  "units": [
    {
      "unit_id": "BLD-DEMO-002-FL05-U501",
      "parcel_id": "PARCEL-DEMO-102",
      "building_id": "BLD-DEMO-002",
      "floor_id": "BLD-DEMO-002-FL05",
      "unit_number": "501",
      "unit_name": "Apartment 501",
      "unit_type": "APARTMENT_UNIT",
      "geometry_2d": { "type": "Polygon", "coordinates": [...] },
      "base_elevation": 577.48,
      "top_elevation": 580.48,
      "height": 3.0
    }
  ],
  "target_crs": "EPSG:32643",
  "compute_shared_origin": true
}
```

**Response (`GenerateUnits3DResponse`)**:
```json
{
  "schema_version": "1.0",
  "results": [
    {
      "unit_id": "BLD-DEMO-002-FL05-U501",
      "geometry_status": "VALID",
      "geometry": {
        "parts": [
          {
            "feature_id": "BLD-DEMO-002-FL05-U501",
            "feature_type": "UNIT",
            "geometry_type": "SOLID",
            "vertices": [...],
            "faces": [...],
            "bounds": { "min": [...], "max": [...] },
            "winding": "COUNTER_CLOCKWISE",
            "volume_cubic_m": 133.5,
            "surface_area_sqm": 128.4
          }
        ],
        "bounds": { "min": [...], "max": [...] },
        "total_volume_cubic_m": 133.5,
        "total_surface_area_sqm": 128.4
      }
    }
  ],
  "summary": {
    "requested": 1,
    "successful": 1,
    "failed": 0
  }
}
```

### 7.2 `GET /api/v1/units/demo-3d`
Returns precomputed canonical 3D solids for all 4 benchmark units on Floor 5 of Residential Tower 1 (`BLD-DEMO-002-FL05`).

---

## 8. Interactive 3D Viewer Integration

The interactive 3D viewer (`Cadastral3DViewer.tsx`) is extended with:
- **Sub-View Mode**: `"units"` (`Apartment Units`).
- **Layer Visibility**: Independent toggle for `units` layer.
- **Visual Styling**: Cyan solid (`#06b6d4`), bright cyan edges (`#22d3ee`), amber interactive hover/selection (`#f59e0b`).
- **Exploded View Support**: Explodes units along vertical local Z axis for inspection.
- **Zero Client Mutation**: Geometry is rendered strictly as returned by the backend without client-side repair or boolean operations.
