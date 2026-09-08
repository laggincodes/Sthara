# System Architecture Document

## 1. Architectural Principles & Vision
**3D Cadastral Intelligence** is designed upon the foundational principle of **Deterministic Geometric Authority**:
- **Authoritative Computational Geometry**: Coordinate reference system (CRS) transformations, planar buffering, polygon intersections, 3D polyhedral extrusions, boundary containment checks, and 3D ULPIN formulations are strictly deterministic and mathematically guaranteed using mature, industry-standard computational geometry engines (`Shapely`, `GeoPandas`, `PyProj`).
- **Auxiliary, Non-Authoritative AI Layer**: Large Language Models (Google Gemini) are strictly isolated from authoritative geometric logic. Gemini is used solely for non-binding explanatory tasks: translating complex spatial validation logs into plain-English municipal briefs and providing user-friendly property rights summaries. AI never touches raw coordinates, mesh vertices, or legal pass/fail determinations.
- **High-Performance Decoupled Architecture**: A lightweight Next.js frontend delivers real-time 60 FPS WebGL rendering and spatial inspection, communicating with an asynchronous Python FastAPI backend via structured REST APIs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js)                              │
│  ┌───────────────────────┐  ┌─────────────────────┐  ┌───────────────┐  │
│  │ 2D Map (MapLibre/GL)  │  │ 3D Scene (Three.js/ │  │ Control Panel │  │
│  │ GeoJSON Footprints    │  │ R3F Volumetric Mesh)│  │ & Validation  │  │
│  └───────────┬───────────┘  └──────────┬──────────┘  └───────┬───────┘  │
│              └─────────────────────────┼─────────────────────┘          │
│                                        ▼                                │
│                               API Gateway Client                        │
└────────────────────────────────────────┬────────────────────────────────┘
                                         │ HTTPS / REST (JSON & GeoJSON)
┌────────────────────────────────────────▼────────────────────────────────┐
│                          BACKEND (FastAPI)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      API Routing & Controllers                    │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
│                                      ▼                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 DETERMINISTIC GEOSPATIAL PIPELINE                 │  │
│  │  1. Ingestion & CRS Projection (PyProj)                           │  │
│  │  2. 2D Polygon Validation (Shapely)                               │  │
│  │  3. 3D Volumetric Extrusion Engine (Shapely + Triangulation)      │  │
│  │  4. Spatial Clash & Encroachment Validator                        │  │
│  │  5. 3D ULPIN Algorithmic Generator                                │  │
│  └──────────────────┬───────────────────────────────┬────────────────┘  │
│                     │                               │                   │
│                     ▼                               ▼                   │
│  ┌──────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │    STORAGE & PERSISTENCE         │  │   OPTIONAL AI ADVISOR       │  │
│  │   - PostgreSQL + PostGIS         │  │   - Google Gemini Flash API │  │
│  │     (or local GeoJSON cache)     │  │   - Summary & Explanation   │  │
│  │   - Volume & ULPIN Store         │  │     (Read-Only / Auxiliary) │  │
│  └──────────────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend Stack
- **Framework**: Next.js 15+ (App Router, React 19)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS, Lucide React icons
- **2D Mapping**: MapLibre GL / Leaflet (rendering 2D cadastral polygons, parcel boundaries, satellite tiles)
- **3D Visualization**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **State Management & Fetching**: React Hooks, standard native fetch / TanStack Query pattern

### Backend Stack
- **Framework**: Python 3.11+, FastAPI (asynchronous REST API)
- **Application Server**: Uvicorn (ASGI)
- **Data Validation & Schemas**: Pydantic v2

### Geospatial & Geometry Processing Engine
- **Shapely 2.0+ (GEOS)**: Core computational geometry (polygon intersection, containment, buffering, union, planar difference).
- **GeoPandas**: Vector feature processing, attribute table management, spatial indexing (`STRtree`).
- **PyProj 3.6+ (PROJ)**: Geodetic transformations and projection management (e.g., WGS84 `EPSG:4326` to planar metric UTM `EPSG:32643`).
- **Rasterio / NumPy**: Elevation surface sampling, baseline height calculations.

### Database & Storage Architecture
- **Production Mode**: PostgreSQL 16 with **PostGIS 3.4** extension (spatial indexes, 3D geometry types).
- **STHARA Fast-Track Mode**: Local in-memory GeoDataFrame cache and file-backed GeoJSON store (`data/processed/sthara_sample_cadastre.geojson`). Guarantees zero installation friction during live evaluation while strictly conforming to PostGIS schemas.

### AI Assistance (Optional)
- **Provider**: Google Gemini Flash API (`google-genai` Python SDK).
- **Scope**: Natural language summaries of validation flags and municipal reports. AI has zero access to manipulate spatial geometry.

---

## 3. Frontend Architecture

The frontend follows a modern, dense, GIS-workstation single-page layout:

### Component Hierarchy
```
src/
├── app/
│   ├── layout.tsx                # Global styling, fonts, root layout
│   └── page.tsx                  # Main Cadastral Dashboard
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # Project title, dataset picker, run action
│   │   └── StatusBar.tsx         # Connection status, active CRS, processing indicators
│   ├── map2d/
│   │   ├── Map2DViewer.tsx       # Leaflet / MapLibre 2D parcel boundary map
│   │   └── LayerControl2D.tsx    # Toggle parcel, footprints, aerial tiles
│   ├── viewer3d/
│   │   ├── CadastralStage.tsx    # Three.js Canvas, Lighting, OrbitControls, Ground Grid
│   │   ├── ParcelColumnMesh.tsx  # Extruded legal boundary bounding column (wireframe)
│   │   ├── VolumeMesh.tsx        # Render individual floor/basement polyhedrons
│   │   ├── ClashIndicator.tsx    # Red wireframe mesh highlighting detected encroachments
│   │   └── ExplodeSlider.tsx     # Vertical floor separation slider (exploded view)
│   ├── panels/
│   │   ├── DatasetSelector.tsx   # Preset selector (Standard Urban, Overhang Encroachment)
│   │   ├── ValidationPanel.tsx   # Pass/Warning/Fail checks and clash breakdown
│   │   ├── PropertyCard.tsx      # 3D ULPIN, volume, floor bounds, ownership class
│   │   └── AIExplainModal.tsx    # Optional Gemini plain-language explanation drawer
│   └── ui/                       # Reusable UI elements (Badges, Buttons, Tabs, Accordions)
├── lib/
│   ├── api.ts                    # Typed API client for FastAPI backend
│   ├── types.ts                  # Shared TypeScript interfaces matching Pydantic models
│   └── three-utils.ts            # Triangulation helpers and coordinate normalizers
```

---

## 4. Backend Architecture

The backend is structured into clean separation of concerns:
```
backend/
├── app/
│   ├── main.py                   # FastAPI app, CORS middleware, lifespan events
│   ├── api/
│   │   ├── api_router.py         # Root API router aggregator
│   │   └── routes/
│   │       ├── health.py         # System health & dependency diagnostic
│   │       ├── datasets.py       # Sample data retrieval and file upload
│   │       ├── spatial.py        # Spatial intelligence & building-parcel topological association
│   │       ├── elevation.py      # Elevation inspection & deterministic DEM raster sampling
│   │       ├── buildings.py      # Structural height, floor slicing, 3D mesh extrusion, and stratified floor solids (/generate-floors-3d, /extrude-demo-floors)
│   │       ├── properties.py     # 3D property volumes (/generate-volume-3d, /demo-properties, /extrude-demo-properties)
│   │       ├── parcels.py        # 2D parcel retrieval & spatial queries
│   │       ├── volumes.py        # 3D property volume extraction & mesh generation
│   │       ├── validation.py     # Deterministic boundary & clash verification
│   │       ├── ulpin.py          # 3D-ULPIN generator & decoder
│   │       └── ai_advisor.py     # Optional Gemini explanation bridge
│   ├── core/
│   │   ├── config.py             # App settings (CORS origins, API keys, paths)
│   │   └── logging.py            # Structured logging
│   ├── schemas/ / models/        # Pydantic schemas (Request / Response contracts)
│   │   ├── geojson.py            # FeatureCollection and Geometry schemas
│   │   ├── geometry_3d.py        # Canonical 3D Geometry Contract (Mesh3D, Mesh3DCollection, Generate3DResponse; see 3D_GEOMETRY_CONTRACT.md)
│   │   ├── property_volume.py    # 3D floor solids, property volumes, hierarchy requests and responses
│   │   ├── volume_schema.py      # Mesh definitions, vertices, faces, bounds
│   │   ├── validation_schema.py  # Check lists, clash features, error details
│   │   └── ulpin_schema.py       # 3D ULPIN structured components
│   └── services/                 # Pure domain business logic
│       ├── geojson_validator.py  # RFC 7946 & Shapely topological geometry validation
│       ├── building_validator.py # Building footprint validation & ID resolution
│       ├── spatial_relationship_service.py # STRtree spatial index & overlap area analysis
│       ├── elevation_service.py  # Rasterio DEM inspection & centroid elevation extraction
│       ├── building_height_service.py # Structural height subtraction & deterministic floor slicing
│       ├── floor_volume_service.py   # 3D floor solid extrusion, priority 1-3 elevation slicing, watertight verification, and property volume aggregation
│       ├── unit_service.py           # Unit validation, party-wall touching analysis, and watertight 3D solid extrusion
│       ├── georeferencing_service.py # CRS inspection, target projection selection, reversible reprojection
│       ├── fusion_service.py         # Multi-source alignment, evidence integration, conflict detection
│       ├── parcel_normalizer.py  # Authoritative ID extraction & centroid derivation
│       ├── crs_service.py        # CRS validation, UTM projection, metric conversion
│       ├── extrusion_service.py  # 2D polygon to 3D polyhedral mesh computation
│       ├── validation_engine.py  # Containment, vertical overhang, volumetric overlap
│       ├── ulpin_generator.py    # Algorithmic 3D ULPIN calculator
│       └── gemini_advisor.py     # Auxiliary Gemini API summarization client
```

---

## 5. Geospatial Processing Pipeline

```
[2D GeoJSON Input]
       │ (WGS84 EPSG:4326 coordinates)
       ▼
[CRS Projection & Metric Normalization]
       │ (PyProj converts to UTM EPSG:32643 in meters)
       ▼
[Planar Polygon Validation & Repair]
       │ (Shapely make_valid: ensures closure, counter-clockwise winding, no self-intersections)
       ▼
[Vertical Stratification Slicing]
       │ (Calculate Z_min, Z_max intervals for each floor, basement, and surface parcel)
       ▼
[Polyhedral Volume Synthesis]
       │ (Compute 3D bounding boxes, polygon extrusion side-walls, top/bottom caps)
       ▼
[Geometric Metric Calculation]
       │ (Exact footprint area m^2, 3D volume m^3, elevation span)
       ▼
[Mesh Serialization]
       │ (Normalized centroid relative coordinates for Three.js client)
```

---

## 5B. Multi-Source Spatial Data Fusion Architecture (Step 18)

Following the STHARA Technical Approach (01 Ingestion → 02 Geo-ref → 03 Fusion):

```
+-------------------------------------------------------------------------------+
|                        MULTI-SOURCE INGESTION LAYER                           |
|  - Cadastral GIS (Parcels)             - Physical Buildings (Synthetic & OSM) |
|  - Digital Elevation Models (DEM)      - LiDAR Point Clouds (LAS/LAZ)         |
|  - Floor Strata Schedules              - Apartment Units / Floor Plans        |
|  - GNSS / CORS Geodetic Monuments      - Aerial Drone Orthomosaics            |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                     GEOREFERENCING & NORMALIZATION LAYER                      |
|  - GeoreferencingService: inspects source CRS, validates with PROJ            |
|  - Target Project CRS Selection: EPSG:32643 (UTM 43N) or centroid derivation  |
|  - Explicit pyproj transformation: preserves native coordinates in properties |
|  - Reversible metadata: _source_crs, _target_crs, _source_geometry, timestamp |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                      SPATIAL FUSION & ASSOCIATION ENGINE                      |
|  - STRtree Spatial Index: Building <-> Parcel containment and overlap area     |
|  - DEM Raster Sampling: terrain plinth ground elevations (Z_ground)           |
|  - LiDAR Evidence Extraction: pulse density (pts/m²), classification returns   |
|  - Floor & Unit Modeling: horizontal/vertical containment, party-wall touching|
|  - Non-Cadastral Guardrail: real OSM tagged as UNVERIFIED_PHYSICAL_SURFACE     |
+-------------------------------------------------------------------------------+
                                        │
                                        ▼
+-------------------------------------------------------------------------------+
|                 UNIFIED FUSED PROPERTY CONTEXT & CONFLICT AUDIT               |
|  - FusedPropertyContext: comprehensive multi-source spatial relationship model |
|  - Conflict Register: encroachment, overhangs, NoData, unverified observations|
|  - Evidence Readiness Score: FULL / PARTIAL / LIMITED / INVALID               |
|  - Fusion Integrity Status: VALID / WARNING / PARTIAL / INVALID               |
+-------------------------------------------------------------------------------+
```

---

## 6. 3D Rendering Pipeline

1. **Precision Centroid Centering**:
   - Projected UTM coordinates have large numerical magnitudes (e.g., $X=720450.2, Y=3124500.8$). Passing these directly into WebGL causes floating-point jitter and rendering artifacts.
   - The backend computes a local centroid reference: $(X_{ref}, Y_{ref}, Z_{ref})$.
   - Mesh vertex coordinates are transmitted as local metric offsets relative to this origin:
     $$x_{local} = x - X_{ref}, \quad y_{local} = y - Y_{ref}, \quad z_{local} = z - Z_{ref}$$
2. **Triangulated Mesh Payload**:
   - The backend computes 2D polygon triangulation for top/bottom caps and creates two triangular faces per quad wall.
   - Client receives a structured JSON with `vertices` (flat Float32 array) and `indices` (Uint16 array).
3. **Shader & Material Encoding**:
   - **Surface Parcel Column**: Translucent dashed boundary pillar wireframe.
   - **Valid Building Footprints / Floors**: Semi-transparent cyan/slate material (`roughness: 0.2`, `metalness: 0.1`, `opacity: 0.7`).
   - **Apartment Units**: Distinctive cyan translucent volume (`#06b6d4`, `opacity: 0.65`) with bright cyan edge highlighting (`#22d3ee`), amber selection halo (`#f59e0b`).
   - **Basement Volumes**: Translucent amber tone below the ground plane grid.
   - **Encroachment Clashes**: High-visibility pulsating red wireframe highlight.
4. **Interactive Exploded View & Sub-Views**:
   - The 3D viewer supports 4 distinct inspection sub-views: `Buildings`, `Floors`, `Property Volumes`, and `Apartment Units`.
   - Users can drag a vertical slider in the UI to apply a progressive displacement along the local vertical axis:
     $$y_{display} = y_{local} + (\text{floor\_index} \times \text{explode\_factor})$$

---

## 7. Database Architecture

The data architecture is designed for dual-mode deployment:

### Mode 1: Production (PostgreSQL 16 + PostGIS 3.4)
- Schema Tables:
  - `cadastral_parcels`: Stores parcel boundary polygon in `GEOMETRY(PolygonZ, 4326)` with legal parcel attributes.
  - `buildings`: Stores base footprint polygon in `GEOMETRY(PolygonZ, 4326)` and vertical floor count.
  - `property_volumes`: Stores polyhedral volumes in `GEOMETRY(PolyhedralSurfaceZ, 4326)`, vertical intervals, stratum types, and assigned 3D ULPINs.
  - `validation_logs`: Stores historical validation audit trails and detected clash geometries.

### Mode 2: Zero-Config (In-Memory + GeoJSON Cache)
- Fast-track file store located at `data/processed/sthara_sample_cadastre.geojson`.
- Loaded into memory during FastAPI startup lifespan event.
- Instant query response without requiring PostgreSQL service configuration on demo machines.

---

## 8. API Communication & Data Flow

All communication between Next.js and FastAPI uses standard REST over HTTPS:
- Standard response envelope:
  ```json
  {
    "status": "success",
    "data": { ... },
    "message": "Pipeline executed successfully",
    "timestamp": "2026-09-06T14:30:00Z"
  }
  ```
- Errors return standard HTTP status codes with structured details:
  ```json
  {
    "status": "error",
    "error_code": "INVALID_CRS",
    "message": "Input dataset missing required coordinate reference system",
    "details": {}
  }
  ```

---

## 9. Validation Flow (Deterministic)

```
PARCEL POLYGON (P) & BUILDING FOOTPRINT (B)
                      │
                      ▼
        [Phase 1: Footprint Containment]
      Is B completely within P? (Shapely: P.contains(B))
       ├── YES: Footprint compliant
       └── NO:  FLAG CRITICAL CLASH (Footprint encroachment)
                      │
                      ▼
        [Phase 2: Vertical Overhang Check]
      For each floor k with footprint F_k:
      Is F_k completely within P?
       ├── YES: Floor k within legal parcel column
       └── NO:  FLAG OVERHANG CLASH
                Compute clash polygon: C_k = F_k.difference(P)
                Compute clash volume: Vol_clash = Area(C_k) * Height(k)
                      │
                      ▼
        [Phase 3: Inter-Unit Non-Overlap Check]
      For each pair of units (U_i, U_j):
      Do vertical ranges [Zmin_i, Zmax_i] overlap AND 2D footprints intersect?
       ├── YES: FLAG VOLUMETRIC CLASH (Shared unauthorized space)
       └── NO:  Units topologically independent
                      │
                      ▼
        [Phase 4: Municipal Height Restriction]
      Is max(Z_max) <= Permissible_Zoning_Height?
       ├── YES: Height compliant
       └── NO:  FLAG WARNING (Zoning height exceedance)
```

---

## 10. 3D ULPIN Prototype Generation Flow (Step 13)

> [!IMPORTANT]
> **CRITICAL SEMANTIC NOTICE**: The 3D ULPIN Prototype is a project-specific deterministic identifier design for validated 3D cadastral property entities. It is NOT an official Government of India ULPIN specification.

```
PROPERTY ENTITY (PARCEL -> BUILDING -> FLOOR -> PROPERTY_VOLUME)
                         │
                         ▼
        [Phase 1: Component Validation & Sorting]
   - Verify non-empty property_id & parcel_id
   - Reject duplicate building_ids (DUPLICATE_COMPONENT)
   - Reject duplicate floor_ids (DUPLICATE_COMPONENT)
   - Sort building_ids lexicographically: sorted(building_ids)
   - Sort floor_ids lexicographically: sorted(floor_ids)
                         │
                         ▼
        [Phase 2: Spatial Extent Precondition Check]
   - Check PropertyVolumeResult.geometry_status:
     ├── UNAVAILABLE: Return identifier_status = UNAVAILABLE (no ULPIN issued)
     ├── INVALID:     Return identifier_status = INVALID (no ULPIN issued)
     └── VALID:       Proceed to canonical hashing
                         │
                         ▼
        [Phase 3: Canonical Identity Serialization]
   Assemble invariant canonical identity string (UTF-8):
   3DULPIN|v1|property:<prop_id>|parcel:<parcel_id>|buildings:<b1>,<b2>|floors:<f1>,<f2>
                         │
                         ▼
        [Phase 4: Cryptographic Hash Generation]
   - Compute SHA-256 hex digest: hashlib.sha256(canonical_bytes).hexdigest().upper()
   - Format versioned prototype identifier:
     3DULPIN-V1-<64_HEX_DIGEST>
     Example: 3DULPIN-V1-9457DE1DBBBEB319BAE64DA99B35C83FEA80A6C289569BF383B38A82A5BC6C6F
```

### Decoupling from Mesh Representation
$$\text{3D ULPIN} \neq \text{hash}(\text{raw vertices})$$
The identifier is strictly independent of:
- Mesh vertex ordering or floating-point jitter
- Triangle face tessellation
- Three.js scene graphs or rendering pipeline states
- Calculated bounding boxes, surface area, or volume metrics
Changing visual appearance, moving the camera, or reordering geometry arrays never alters the 3D ULPIN Prototype.

---

## 11. AI Architecture & Strict Guardrails

| System Capability | Implementation Module | Permitted Role of Gemini AI |
|---|---|---|
| CRS Reprojection | `pyproj.Transformer` | **STRICTLY PROHIBITED** |
| Geometric Extrusion | `shapely.geometry` | **STRICTLY PROHIBITED** |
| Encroachment Detection | `shapely.difference` | **STRICTLY PROHIBITED** |
| Volume Computation | Computational Geometry | **STRICTLY PROHIBITED** |
| 3D ULPIN Code Creation | Deterministic Python Hash | **STRICTLY PROHIBITED** |
| Validation Report Translation | `gemini_advisor.py` | **Permitted**: Generates plain-English briefing |
| Citizen Inquiries on Property | `gemini_advisor.py` | **Permitted**: Explains volumetric rights |
| Regulatory Recommendations | `gemini_advisor.py` | **Permitted**: Suggests municipal reference bylaws |
## 5C. AI/ML Extraction Subsystem & Deterministic Boundary (Step 19)

In adherence to the STHARA Technical Approach, the system maintains an absolute architectural boundary between AI/ML extraction and deterministic geometry:

1. **Separation of Responsibilities**:
   - **AI/ML Layer**: Proposes candidate physical features (footprints, floor strata, unit partitions, vertical envelopes).
   - **Deterministic Engine**: Authoritative for coordinate reference transformations (`pyproj`), polygon validation (`shapely`), 3D polyhedral extrusion (`Mesh3D`), watertight topology, analytical volume calculation, and parcel boundary checks.
   - **Cadastral Registry**: Authoritative for legal title, strata ownership, and ULPIN registration.

2. **Model Registry & Failure Transparency**:
   - Extraction models document algorithmic limitations.
   - Unavailable deep-learning pipelines (`pytorch_mask_rcnn_v1`, `open3d_pointnet_v1`) return `MODEL_UNAVAILABLE` rather than fabricating output.
   - Missing floor plan evidence returns `UNIT_EXTRACTION_UNAVAILABLE` rather than hallucinating apartment divisions.

3. **Deterministic Candidate Validation Gate**:
   - Candidates must pass through `/api/v1/ai/validate-candidates`.
   - Rejects invalid polygons, out-of-parcel buildings, and overlapping units.
   - Flags low-confidence predictions ($< 0.60$) for human review.

## 5D. Subsurface & Underground Spatial Modeling Architecture (Step 20)

Conforming to the STHARA technical approach, the platform models subterranean assets with native vertical coordinate consistency and strict cadastral separation:

1. **Native Z-Up Elevation Representation**:
   - All spatial meshes store coordinates in native metric coordinates ($Z_\text{base} < Z_\text{top} \le Z_\text{ground}$).
   - Subterranean depths are derived explicitly relative to the authoritative reference surface datum:
     $$\text{depth\_to\_top} = Z_\text{ground} - Z_\text{top} \ge 0$$
     $$\text{depth\_to\_base} = Z_\text{ground} - Z_\text{base} > 0$$
   - Negative Z elevations are never used unless the asset physically lies below mean sea level.

2. **Semantic Cadastral Separation**:
   - **Basement Strata**: Structural components of building developments (`is_cadastral_property = True`). Tied to parent building IDs and parcel records; aggregatable into private 3D property volumes.
   - **Infrastructure Utilities**: Public service conduits (water, telecom, power, sewer; `is_cadastral_property = False`). Modelled as 3D physical corridors without asserting private real estate ownership or generating property ULPINs.
   - **Subsurface Volumes**: Public or zoned subterranean space parcels subject to statutory depth restrictions.

3. **Subsurface 3D Clash & Easement Classification Engine**:
   - Evaluates both 2D horizontal overlap ($A_\text{overlap} > 0$) and 1D vertical clearance ($Z_\text{clearance} < 0$).
   - Categorizes physical intersections into:
     - `ALLOWED_INTERSECTION`: Documented utility connections entering a basement with legal easement rights.
     - `REVIEW_REQUIRED`: Proximity clearance $< 1.0\text{m}$ flagging safety/excavation hazards.
     - `INVALID_OVERLAP`: Direct unauthorized physical collision between competing subterranean volumes.

4. **Visual Cutaway & Subsurface Inspection**:
   - The 3D viewport supports a dedicated **Cutaway Inspection Mode** where above-ground structures are rendered as semi-transparent silhouettes, allowing subterranean basements, pipe conduits, and duct banks to be visually inspected in spatial context.

## 5E. Unified Topology & Spatial Conflict Engine Architecture (Step 22)

Conforming to Stage 06 of the STHARA Technical Approach (06 TOPOLOGY: Overlap Check, Containment, Duplicates), the system consolidates all geometric verification into a single, deterministic, tolerance-aware engine:

1. **Multi-Tier Hierarchical Validation**:
   - Spans the complete cadastral stack: $\text{PARCEL} \rightarrow \text{BUILDING} \rightarrow \text{FLOOR} \rightarrow \text{UNIT} \rightarrow \text{PROPERTY\_VOLUME} \rightarrow \text{UNDERGROUND}$.
   - Evaluates reference integrity across the parent-child chain, preventing orphaned entities or mismatched relationships (`MISSING_REFERENCE`).

2. **Core Topological Checks & Mathematics**:
   - **Overlap Check**:
     - 2D horizontal non-overlap evaluated across sibling parcels, buildings, and units on the same floor.
     - Distinguishes valid party-wall contact (boundary touch $\le \epsilon_\text{area}$) from positive-area overlap ($A > \epsilon_\text{area}$, emitted as `POSITIVE_AREA_OVERLAP`).
   - **Containment**:
     - 2D footprint containment checks (building within parcel, unit within building/floor, basement within parcel).
     - Vertical interval containment ($[Z_\text{base}, Z_\text{top}]_\text{child} \subseteq [Z_\text{base}, Z_\text{top}]_\text{parent}$).
   - **Duplicates**:
     - Identifies duplicate IDs (`DUPLICATE_ID`), same ID with differing geometries (`SAME_ID_DIFFERENT_GEOMETRY`), and identical spatial footprints registered under distinct IDs (`DUPLICATE_GEOMETRY`).
   - **3D Mesh Integrity**:
     - Reuses Canonical 3D Geometry Contract v1.0 (`ExtrusionService.validate_mesh`) to audit closed watertightness, 2-manifold edge sharing, and non-self-intersection.
   - **Underground Clashes**:
     - Audits subsurface physical collisions and proximity buffer clearances ($< 1.0\text{m}$) while permitting registered utility penetration easements into basements.

3. **Non-Destructive Conflict Guarantees**:
   - The engine never mutates, shifts, or silently clips geometry.
   - All violations are emitted as structured, immutable `TopologyConflictRecord` objects with quantitative metrics and actionable engineering recommendations.

## 5F. Real Multi-Source End-to-End Validation Architecture (Step 23)

Proves the complete end-to-end multi-source cadastral pipeline across both authentic real-world observations and synthetic cadastral data without simulating fake completeness or fabricating missing datasets:

$$\text{DATA INGESTION} \rightarrow \text{GEOREFERENCING} \rightarrow \text{FUSION} \rightarrow \text{AI EXTRACTION} \rightarrow \text{3D MODELLING} \rightarrow \text{TOPOLOGY} \rightarrow \text{PROPERTY/UNIT VOLUME} \rightarrow \text{3D ULPIN} \rightarrow \text{VIEWER}$$

1. **Multi-Source Data Classification & Ingestion**:
   - **Real Physical Surface Data**: 155 building footprints from crowd-sourced OpenStreetMap data in Tagore Garden, New Delhi (`map.osm` & `osm_buildings.geojson`).
   - **Synthetic Cadastral Stack**: Authoritative parcels, multi-storey buildings, DEM GeoTIFF, and stratified apartment units in the Pune testbed.
   - **Transparent Gap Handling**: Unsupplied real sources (airborne LiDAR `.las/.laz`, architectural CAD/BIM floor plans, GNSS RINEX observation streams, municipal subsurface utility registers, and Delhi parcel cadastre) are explicitly declared as `UNAVAILABLE`.
   - **Pipeline Fusion Status**: Designated as `PARTIAL` with quality level `LIMITED`, refusing to fake "complete" data.

2. **Geodetic Harmonization & Preserved Provenance**:
   - Both regional datasets are reprojected into a common metric coordinate reference system (`EPSG:32643` - UTM Zone 43N).
   - Original source CRS (`EPSG:4326`) and unprojected geometries are preserved in metadata for full auditability.

3. **Honest Spatial Disjoint Evaluation**:
   - Evaluates genuine geographic separation between New Delhi and Pune (~1174 km).
   - Reports pairwise relationship as `DISJOINT` with `overlap_percentage = 0.0%` and verdict `NO_OVERLAP`.
   - Strictly prohibits artificial coordinate shifts or synthetic translations.

4. **Cadastral Isolation for Physical Observations**:
   - Real OSM buildings are designated as non-cadastral physical surface observations (`is_cadastral = False`, `legal_status = "UNVERIFIED_PHYSICAL_SURFACE"`).
   - Physical buildings are extruded into valid 3D polyhedral solids under Canonical 3D Geometry Contract v1.0, but are strictly barred from receiving cadastral property ULPIN identifiers.
   - Authoritative 3D ULPIN prototypes are restricted to verified parcel-linked property volumes.

5. **Automated Audit Orchestration**:
   - Reproducible CLI entry point via `python -m app.integration.real_data_pipeline`.
   - Machine-readable result emitted to `data/processed/real_data_pipeline_result.json`.
   - Comprehensive documentation report emitted to `docs/REAL_DATA_INTEGRATION_REPORT.md`.
   - REST API integration via `GET /api/v1/fusion/real-pipeline`.

