# Interactive 3D Cadastral Viewer Architecture & Specification (v1.0)

> [!IMPORTANT]
> **CANONICAL ARCHITECTURAL BOUNDARY & PROTOTYPE NOTICE**  
> 1. **Backend Geometry Authority**: The backend remains the sole authoritative source for computational geometry, topological validation, coordinate projection, and volumetric generation. The 3D viewer performs **no geometry generation, mesh repair, face closure, winding alteration, or boolean union**.  
> 2. **3D ULPIN Prototype**: The 3D ULPIN displayed in the viewer and inspector is a **project-specific deterministic prototype design** created for the Smart India Hackathon (SIH) prototype. It is **NOT** an official Government of India ULPIN standard.

---

## 1. Executive Summary & Objective

The **Interactive 3D Cadastral Viewer** provides high-precision WebGL-based visualization of 3D cadastral land parcels, architectural building envelopes, vertically stratified floor solids, and cadastral property volumes:

$$\text{PARCEL} \longrightarrow \text{BUILDING} \longrightarrow \text{FLOOR} \longrightarrow \text{PROPERTY\_VOLUME} \longrightarrow \text{3D ULPIN Prototype}$$

The viewer runs directly within the Next.js React application utilizing **React Three Fiber (R3F)**, **Three.js**, and **@react-three/drei**, strictly consuming the **Canonical 3D Geometry Contract v1.0** without client-side computational deviation.

---

## 2. Rendering Pipeline Architecture

```text
┌────────────────────────────────────────────────────────┐
│             FastAPI Backend (Authoritative)            │
│  - Spatial calculations & 3D solid extrusion           │
│  - Coordinate projection to local tangent origin       │
│  - Topological validation (2-manifold, outward normals)│
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP JSON (Mesh3D / Mesh3DCollection)
                           ▼
┌────────────────────────────────────────────────────────┐
│           Frontend Safety Boundary (validation.ts)     │
│  - Validates schema structure, units, and references   │
│  - Verifies finite coordinates and face index bounds   │
│  - Rejects degenerate faces without mutating           │
└──────────────────────────┬─────────────────────────────┘
                           │ Validated Canonical DTO
                           ▼
┌────────────────────────────────────────────────────────┐
│           Geometry Converter (geometry.ts)             │
│  - Flat Float32Array positions: [x0, y0, z0, ...]      │
│  - Uint16Array / Uint32Array index (CCW winding)       │
│  - Thresholded EdgesGeometry for silhouette accents    │
└──────────────────────────┬─────────────────────────────┘
                           │ THREE.BufferGeometry
                           ▼
┌────────────────────────────────────────────────────────┐
│       React Three Fiber Canvas (Cadastral3DViewer)     │
│  - Native Z-up orientation (camera.up: 0, 0, 1)        │
│  - XY Ground reference grid at Z = 0                   │
│  - Dynamic OrbitControls with automatic bounding fit   │
│  - Exploded floor visualization (offset ΔZ)            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Coordinate System & World Orientation

### 3.1 Direct Z-Up Coordinate Mapping
The canonical contract represents all vertices as local coordinates in meters relative to the parcel's `viewer_origin`:
- $X$: Local Easting (meters)
- $Y$: Local Northing (meters)
- $Z$: Orthometric Elevation (meters above ground datum)

Three.js defaults to a $Y$-up orientation. To prevent error-prone axis swapping or normal inversion, the canvas camera is explicitly configured as **Z-up**:

```typescript
camera.up.set(0, 0, 1);
```

**Benefits**:
1. **Zero Transformation Overhead**: Vertex arrays $[x, y, z]$ map directly into `THREE.BufferAttribute` without reordering or axis permutation.
2. **Normal Preservation**: Canonical counter-clockwise (CCW) face winding $[a, b, c]$ viewed from outside yields mathematically exact outward-pointing face normals.
3. **Cartesian Coherence**: Ground reference grid lies naturally in the horizontal $XY$ plane at $Z = 0$.

### 3.2 Dynamic Ground Datum Grid
A precision ground grid is rendered dynamically beneath the parcel geometry:
- Position: Center of parcel bounding box $(x_c, y_c, z_{\text{min}} - 0.05\text{ m})$.
- Orientation: Rotated around the X-axis by $\pi/2$ radians so its plane lies flat on $XY$.
- Adaptive Spacing: Grid cell size scales with parcel envelope dimensions.

---

## 4. Frontend Safety Validation Boundary

In accordance with strict architectural rules, the viewer will **never repair broken geometry**. If the backend returns invalid geometry or if data is missing, the viewer raises an explicit error state:

| Validation Rule | Verification Logic | UI / System Behavior on Failure |
| :--- | :--- | :--- |
| **Schema Integrity** | Verifies `vertices`, `faces`, `bounds`, and `geometry_type == 'SOLID'`. | Rejects mesh; displays `ViewerError` component. |
| **Coordinate Finitude** | $\forall v_i: x, y, z \in \mathbb{R}$ (no `NaN`, `null`, `Infinity`). | Blocks rendering; logs topological validation fault. |
| **Face Index Bounds** | $\forall f \in \text{faces}: 0 \le f_0, f_1, f_2 < N_{\text{vertices}}$. | Rejects mesh to prevent GPU index out-of-bounds crash. |
| **Non-Degeneracy** | Triangles must satisfy $f_0 \neq f_1 \land f_1 \neq f_2 \land f_0 \neq f_2$. | Rejects collapsed zero-area faces. |
| **Evidence Status** | Checks `geometry_status` (`VALID`, `INVALID`, `UNAVAILABLE`). | Renders dedicated informational UI explaining missing data. |

---

## 5. Visual Hierarchy & Cadastral Layer Modes

The viewer supports 4 distinct sub-view rendering modes selectable via the `ViewerControls` overlay:

### 5.1 Sub-View Modes
1. **All (`all`)**: Renders building envelopes, stratified floor boundaries, and property volumes simultaneously with balanced layer opacity.
2. **Building Envelopes (`buildings`)**: Renders outer building shells (`BUILDING_VOLUME`) with architectural wireframe edges and neutral cadastral stone materials.
3. **Floor Stratification (`floors`)**: Isolates individual horizontal floor tiers (`FLOOR_VOLUME`), enabling vertical stratification analysis.
4. **Property Volumes (`properties`)**: Isolates registered cadastral property units (`PROPERTY_VOLUME`), displaying multi-part solids associated with parent parcels.

### 5.2 Non-Destructive Exploded Floor View
For multi-story structures, users can engage the **Exploded Floors** slider ($0\text{ m}$ to $5\text{ m}$ separation):
- **Formula**: $\Delta Z_i = i \times d_{\text{explode}}$, where $i$ is the 0-indexed floor level and $d_{\text{explode}}$ is user separation distance.
- **Strict Invariance**: This translation is applied **strictly in the Three.js scene graph node** (`<group position={[0, 0, floorOffset]}>`). The underlying canonical mesh vertices and bounding attributes are never mutated.

### 5.3 Multi-Building Property Unit Handling
When a cadastral property comprises multiple detached building structures (e.g., main residential building + detached garage):
- Each building solid is rendered as an independent closed component within the `Mesh3DCollection`.
- The viewer renders them in their true spatial positions without artificial bridge geometry, stitching, or boolean fusion.

---

## 6. Camera & View Management

### 6.1 Automatic Bounding Fit
When geometry is loaded, the viewer computes the global spatial bounding box across all active components and positions the camera automatically:

$$\text{center} = \frac{\mathbf{p}_{\min} + \mathbf{p}_{\max}}{2}, \quad r = \frac{\|\mathbf{p}_{\max} - \mathbf{p}_{\min}\|}{2}$$

$$\text{distance} = \frac{r}{\sin(\text{FOV} / 2)} \times 1.25$$

$$\mathbf{p}_{\text{camera}} = \text{center} + \left[\frac{d}{\sqrt{3}}, -\frac{d}{\sqrt{3}}, \frac{d}{\sqrt{3}}\right]$$

### 6.2 View Controls
- **Orbit Controls**: Left-click drag rotates around parcel center; right-click drag pans; scroll wheel zooms.
- **Reset Camera**: Instantly snaps back to default 45° isometric cadastral perspective.
- **Fit View**: Smoothly recalculates camera distance and centers on the current bounding envelope.
- **Wireframe Toggle**: Switches between solid shaded polygons with edge accents and pure wireframe geometry.
- **Ground Grid Toggle**: Toggles reference grid visibility.

---

## 7. Memory & WebGL Resource Management

To prevent WebGL context exhaustion and GPU memory leaks in single-page applications:
1. Every `THREE.BufferGeometry` and `THREE.EdgesGeometry` instance created via `mesh3DtoBufferGeometry()` is tracked.
2. Lifecycle cleanup hooks (`useEffect` cleanup callbacks) invoke `.dispose()` on all geometry buffers when meshes unmount or when parcel selection changes:

```typescript
useEffect(() => {
  return () => {
    disposeGeometry(geometry);
    disposeGeometry(edgesGeometry);
  };
}, [geometry, edgesGeometry]);
```

---

## 8. Bidirectional 2D/3D Cadastral Synchronization

The 3D viewer seamlessly coordinates with the 2D MapLibre cadastral map in the primary `/workspace` view:
1. **Selection Propagation**: Clicking a parcel on the 2D map selects it in the workspace state, fetching the 3D building, floor, and property volume geometry from the backend endpoints.
2. **View Synchronization**: Switching tabs between **2D Cadastral Map** and **3D Cadastral Viewer** maintains parcel selection context.
3. **Parcel Inspector**: The inspector panel dynamically displays:
   - Cadastral Parcel ID and 3D ULPIN Prototype
   - Calculated 3D Property Volume ($\text{m}^3$) and Height ($\text{m}$)
   - Elevation extents ($Z_{\text{base}}$ to $Z_{\text{roof}}$)
   - Canonical Geometry Status (`VALID`, `INVALID`, `UNAVAILABLE`)
   - Exploded floor and sub-view controls
