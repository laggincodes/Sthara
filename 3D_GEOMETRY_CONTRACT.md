# 3D Geometry Contract (v1.0)

**Status**: Canonical & Production-Ready  
**Schema Version**: `1.0`  
**Authoritative Backend Schema**: [`backend/app/schemas/geometry_3d.py`](backend/app/schemas/geometry_3d.py)  
**Authoritative Frontend Type Definition**: [`frontend/src/types/geometry3d.ts`](frontend/src/types/geometry3d.ts)  

---

## 1. Overview & Purpose

This document establishes the **exact, immutable 3D Geometry Contract** for the **3D Cadastral Intelligence / 3D ULPIN** project. It serves as the single source of truth between the Python FastAPI geospatial backend and the Next.js / React Three Fiber frontend.

### Core Architectural Rules
1. **The Backend Owns Geometry Generation & Validation**:
   - The backend performs all polygon cleaning, triangulation (ear clipping), vertical face quad-splitting, coordinate projection (EPSG:4326 -> EPSG:32643 UTM), watertight Euler-characteristic validation, volume calculation, and outward counter-clockwise winding verification.
2. **The Frontend Owns Rendering & Visualization**:
   - The frontend accepts pre-calculated, verified `Mesh3D` vertices and triangular faces, loads them directly into Three.js `BufferGeometry`, computes vertex normals client-side via `computeVertexNormals()`, and renders them in local scene coordinate space.
3. **Strict Polyhedral Watertight Solids**:
   - Every `Mesh3D` represents a closed 2-manifold solid. Open shells, dangling edges, zero-area faces, or degenerate triangles are strictly forbidden and rejected during backend validation.
4. **MultiPart Buildings via Collections**:
   - Disjoint building wings, courtyards, or MultiPolygon footprints are represented cleanly as a `Mesh3DCollection`, where each part in `parts` is an individually valid, watertight `Mesh3D` solid.

---

## 2. Canonical JSON Payloads

### 2.1 Single Solid Mesh (`Mesh3D`)

```json
{
  "feature_id": "BLD_DEMO_001",
  "feature_type": "BUILDING",
  "geometry_type": "SOLID",
  "vertices": [
    [-5.0, -5.0, 0.0],
    [5.0, -5.0, 0.0],
    [5.0, 5.0, 0.0],
    [-5.0, 5.0, 0.0],
    [-5.0, -5.0, 12.0],
    [5.0, -5.0, 12.0],
    [5.0, 5.0, 12.0],
    [-5.0, 5.0, 12.0]
  ],
  "faces": [
    [0, 2, 1],
    [0, 3, 2],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [1, 2, 6],
    [1, 6, 5],
    [2, 3, 7],
    [2, 7, 6],
    [3, 0, 4],
    [3, 4, 7]
  ],
  "coordinate_reference": {
    "horizontal_crs": "EPSG:32643",
    "vertical_reference": "AMSL",
    "source_crs": "EPSG:4326",
    "viewer_origin": [435600.0, 2098000.0, 42.0]
  },
  "units": {
    "horizontal_unit": "meter",
    "vertical_unit": "meter"
  },
  "bounds": {
    "min": [-5.0, -5.0, 0.0],
    "max": [5.0, 5.0, 12.0]
  },
  "winding": "COUNTER_CLOCKWISE",
  "surface_area_sqm": 540.0,
  "volume_cubic_m": 1200.0,
  "metadata": {
    "cadastral_status": "VALID",
    "source_system": "backend.extrusion_service"
  }
}
```

### 2.2 Multi-Part Collection (`Mesh3DCollection`)

```json
{
  "feature_id": "BLD_DEMO_002",
  "feature_type": "BUILDING",
  "geometry_type": "SOLID_COLLECTION",
  "parts": [
    {
      "feature_id": "BLD_DEMO_002_part_0",
      "feature_type": "BUILDING",
      "geometry_type": "SOLID",
      "vertices": [],
      "faces": [],
      "coordinate_reference": {},
      "units": {"horizontal_unit": "meter", "vertical_unit": "meter"},
      "bounds": {"min": [-10.0, -5.0, 0.0], "max": [-2.0, 5.0, 15.0]},
      "winding": "COUNTER_CLOCKWISE",
      "surface_area_sqm": 350.0,
      "volume_cubic_m": 720.0
    },
    {
      "feature_id": "BLD_DEMO_002_part_1",
      "feature_type": "BUILDING",
      "geometry_type": "SOLID",
      "vertices": [],
      "faces": [],
      "coordinate_reference": {},
      "units": {"horizontal_unit": "meter", "vertical_unit": "meter"},
      "bounds": {"min": [2.0, -5.0, 0.0], "max": [10.0, 5.0, 15.0]},
      "winding": "COUNTER_CLOCKWISE",
      "surface_area_sqm": 350.0,
      "volume_cubic_m": 720.0
    }
  ],
  "bounds": {
    "min": [-10.0, -5.0, 0.0],
    "max": [10.0, 5.0, 15.0]
  },
  "total_volume_cubic_m": 1440.0,
  "total_surface_area_sqm": 700.0
}
```

### 2.3 Batch Generation Response (`Generate3DResponse`)

```json
{
  "schema_version": "1.0",
  "results": [
    {
      "building_id": "BLD_DEMO_001",
      "geometry_status": "VALID",
      "building": {
        "building_id": "BLD_DEMO_001",
        "parcel_id": "PARCEL_001",
        "base_elevation": 42.0,
        "top_elevation": 54.0,
        "height": 12.0,
        "height_source": "BUILDING_HEIGHT_SPEC"
      },
      "geometry": {
        "feature_id": "BLD_DEMO_001",
        "feature_type": "BUILDING",
        "geometry_type": "SOLID_COLLECTION",
        "parts": [],
        "bounds": {},
        "total_volume_cubic_m": 1200.0,
        "total_surface_area_sqm": 540.0
      },
      "warnings": []
    }
  ],
  "summary": {
    "requested": 1,
    "successful": 1,
    "failed": 0
  }
}
```

---

## 3. Vertex & Face Specifications

### Vertex Contract
* Array of 3-element numeric tuples: `[x, y, z]`
* Expressed in **meters** in the local Cartesian scene coordinate space relative to `viewer_origin`.
* `x`: Local Easting offset in meters.
* `y`: Local Northing offset in meters.
* `z`: Local elevation offset in meters above `viewer_origin[2]`.
* Coordinates must be finite floating-point numbers (`NaN` or `+-Infinity` are rejected).

### Face Contract
* Array of 3-element integer tuples: `[i, j, k]`
* 0-indexed referring directly to indices in the `vertices` array.
* Only triangular faces are permitted (all polygon polygons/quads are triangulated by the backend).
* No duplicate vertex indices in a single face (`i != j != k`).

### Winding Convention
* Strictly **COUNTER_CLOCKWISE** (CCW) when viewed from the outside of the solid.
* The outward surface normal follows the right-hand rule:
  `n = (v_j - v_i) x (v_k - v_i)`
* Roof faces wind counter-clockwise from above (n_z > 0).
* Floor/bottom faces wind counter-clockwise when viewed from beneath (n_z < 0).
* Wall side faces wind counter-clockwise when viewed from outside the building envelope.

---

## 4. Coordinate Reference & Origin Separation

Cadastral data spans large UTM coordinate values (e.g. X ~ 435,000, Y ~ 2,098,000). Passing raw geospatial coordinates directly to WebGL 32-bit floats produces severe floating-point jitter.

The contract cleanly separates:
1. `horizontal_crs`: Real-world projected metric CRS (e.g. `EPSG:32643` UTM Zone 43N).
2. `vertical_reference`: Datum vertical reference system (`AMSL` - Above Mean Sea Level).
3. `source_crs`: Original input CRS (`EPSG:4326` WGS84).
4. `viewer_origin`: `[x0, y0, z0]` real-world coordinates subtracted from every vertex before transmission.
   - Real-world position = `vertex[i] + viewer_origin`

---

## 5. Three.js / React Three Fiber Mapping

To instantiate a `Mesh3D` in Three.js without ambiguity:

```typescript
import * as THREE from 'three';
import { Mesh3D } from '@/types/geometry3d';

export function createThreeBufferGeometry(mesh: Mesh3D): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  // 1. Flatten [x, y, z] tuples to continuous Float32Array
  const positions = new Float32Array(mesh.vertices.length * 3);
  for (let i = 0; i < mesh.vertices.length; i++) {
    positions[i * 3 + 0] = mesh.vertices[i][0]; // X (East)
    positions[i * 3 + 1] = mesh.vertices[i][2]; // Three.js Y-up (Z elevation)
    positions[i * 3 + 2] = -mesh.vertices[i][1]; // Three.js -Z (North)
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // 2. Flatten [i, j, k] face indices to Uint32Array
  const indices = new Uint32Array(mesh.faces.length * 3);
  for (let f = 0; f < mesh.faces.length; f++) {
    indices[f * 3 + 0] = mesh.faces[f][0];
    indices[f * 3 + 1] = mesh.faces[f][1];
    indices[f * 3 + 2] = mesh.faces[f][2];
  }
  geom.setIndex(new THREE.BufferAttribute(indices, 1));

  // 3. Compute outward vertex normals from CCW triangles
  geom.computeVertexNormals();

  return geom;
}
```

---

## 6. Backend Validation Rules & Error Codes

The backend validator (`validate_mesh`) strictly verifies the following conditions before assigning `geometry_status: "VALID"`:

| Error Code | Description | Severity |
| :--- | :--- | :--- |
| `INVALID_VERTEX` | Vertex is not a 3-element numeric list or contains NaN/inf. | Fatal |
| `INVALID_FACE_INDEX` | Face index is out of bounds (< 0 or >= |vertices|). | Fatal |
| `DEGENERATE_FACE` | Face contains duplicate vertex indices (e.g. [0, 1, 1]). | Fatal |
| `ZERO_AREA_FACE` | Face cross product length is < 1e-6 (collapsed triangle). | Fatal |
| `OPEN_SOLID` | Mesh is not a closed 2-manifold (every undirected edge must appear in exactly 2 faces with opposite directed half-edge order). | Fatal |
| `INVALID_ELEVATION` | Top elevation is less than or equal to base elevation (Z_top <= Z_base). | Fatal |
| `INVALID_CRS` | Horizontal CRS or source CRS is missing or unparseable. | Fatal |
| `NON_FINITE_COORDINATE` | Infinite or unrepresentable coordinate detected in transformation. | Fatal |
