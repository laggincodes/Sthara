# Implementation Roadmap & Phases

This document outlines the step-by-step development roadmap for **3D Cadastral Intelligence**. 

Prioritization tags:
- **[MUST HAVE]**: Essential for the core Monday SIH live demonstration. Non-negotiable.
- **[NICE TO HAVE]**: High-value enhancements to implement if time permits after core MVP verification.
- **[FUTURE]**: Post-hackathon commercial / enterprise roadmap items.

---

## PHASE 0 — Project Foundation
- **Priority**: **[MUST HAVE]**
- **Objective**: Establish the project directory structure, repository controls, coding standards, and documentation source of truth.
- **Tasks**:
  1. Initialize clean Git repository and branch strategy.
  2. Verify project root, frontend, backend, data, and docs directories.
  3. Author all core specification documents (`PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `RULES.md`, `PHASES.md`, `DATA_MODEL.md`, `API_SPEC.md`, `README.md`).
- **Expected Output**: Fully documented repository structure with zero ambiguity on architecture or scope.
- **Dependencies**: None.
- **Acceptance Criteria**: All specification files exist, are internally consistent, and reviewed before any application code is created.

---

## PHASE 1 — Frontend Foundation
- **Priority**: **[MUST HAVE]**
- **Objective**: Scaffold the Next.js application, configure styling, and establish the base workstation layout.
- **Tasks**:
  1. Initialize Next.js (App Router, TypeScript, Tailwind CSS).
  2. Configure Tailwind color palette, fonts, and dark-theme variables.
  3. Install core UI dependencies (Lucide icons, basic layout utilities).
  4. Create shell workstation components: `Header`, `LeftDock`, `StageContainer`, `StatusBar`.
- **Expected Output**: Running Next.js development server at `http://localhost:3000` showing the dark-mode geospatial dashboard wireframe.
- **Dependencies**: PHASE 0.
- **Acceptance Criteria**: Clean UI layout renders with zero console errors and responsive split-screen containers.

---

## PHASE 2 — Backend Foundation
- **Priority**: **[MUST HAVE]**
- **Objective**: Scaffold the Python FastAPI backend, establish CORS, and wire base health diagnostic endpoints.
- **Tasks**:
  1. Create Python virtual environment and `requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `shapely`, `geopandas`, `pyproj`).
  2. Implement `app/main.py` with FastAPI initialization and CORS middleware allowing frontend requests.
  3. Implement `app/api/routes/health.py` returning service status, Python version, and geospatial dependency checks.
  4. Create base Pydantic schema structure for standard API envelopes.
- **Expected Output**: Running FastAPI server at `http://localhost:8000` with interactive Swagger docs at `/docs`.
- **Dependencies**: PHASE 0.
- **Acceptance Criteria**: `GET /api/v1/health` returns HTTP 200 with status `ok` and confirms Shapely/PyProj availability.

---

## PHASE 3 — Spatial Data Ingestion & Bundled Datasets
- **Priority**: **[MUST HAVE]**
- **Objective**: Ingest multi-source cadastral datasets, validate CRSs, and prepare realistic SIH demo fixtures.
- **Tasks**:
  1. Create realistic sample GeoJSON files in `data/processed/`:
     - `urban_parcel_standard.geojson`: A legal parcel polygon with a 4-storey building and 1 basement floor (Compliant case).
     - `urban_parcel_encroachment.geojson`: A parcel with a 4-storey building where Floor 3 cantilevers 1.5m past the boundary (Overhang case).
  2. Implement `services/geo_processor.py` to validate GeoJSON features, check CRS (`EPSG:4326` to `EPSG:32643`), and clean geometries with Shapely.
  3. Create backend endpoint `GET /api/v1/datasets` and `POST /api/v1/datasets/upload`.
- **Expected Output**: Validated geospatial datasets ready for extrusion and geometric analysis.
- **Dependencies**: PHASE 2.
- **Acceptance Criteria**: Dataset endpoints return clean GeoJSON with verified coordinate systems and height attributes.

---

## PHASE 4 — 2D Parcel Visualization
- **Priority**: **[MUST HAVE]**
- **Objective**: Render 2D cadastral parcel boundaries and building footprints on an interactive web map.
- **Tasks**:
  1. Integrate 2D map component (Leaflet or MapLibre GL) in `components/map2d/Map2DViewer.tsx`.
  2. Add base dark-matter satellite / cartographic tile layer.
  3. Render GeoJSON parcel boundary (green stroke) and building footprints (white stroke).
  4. Implement hover tooltip showing parcel ID, centroid coordinates, and legal area ($m^2$).
- **Expected Output**: Interactive 2D map viewer displaying parcel and building outlines.
- **Dependencies**: PHASE 1, PHASE 3.
- **Acceptance Criteria**: Map correctly pans, zooms, and highlights parcel boundaries with accurate coordinate readout.

---

## PHASE 5 — 3D Property Generation & Extrusion Engine
- **Priority**: **[MUST HAVE]**
- **Objective**: Build the deterministic 3D polyhedral extrusion engine that transforms 2D footprint polygons into metric 3D solids.
- **Tasks**:
  1. Implement `services/extrusion_service.py` in Python.
  2. Given a 2D polygon and vertical elevation bounds $[Z_{min}, Z_{max}]$:
     - Triangulate bottom floor cap at $Z_{min}$.
     - Triangulate top roof cap at $Z_{max}$.
     - Construct vertical quad side-walls triangulated into two triangles per edge.
     - Compute volume in $m^3$ and surface area in $m^2$.
  3. Create endpoint `POST /api/v1/volumes/generate` returning serialized Three.js-ready mesh data (Float32 vertices and Uint16 indices).
- **Expected Output**: Algorithmic generation of 3D polyhedral meshes from 2D vector polygons.
- **Dependencies**: PHASE 2, PHASE 3.
- **Acceptance Criteria**: Extrusion math produces topologically valid, watertight polyhedral solids with exact mathematical volume calculation.

---

## PHASE 6 — Property Volume Modelling (Stratification)
- **Priority**: **[MUST HAVE]**
- **Objective**: Segment building and land rights into discrete legal property volumes: Surface, Above-Ground Floors, and Subterranean Basements.
- **Tasks**:
  1. Extend extrusion engine to process multi-tier vertical strata:
     - `SFC`: Ground surface parcel bounding column ($Z=0$ to local zoning ceiling).
     - `ABV`: Stratified above-ground floor units ($Z_{min} \dots Z_{max}$ for Floor 1, Floor 2, Floor 3, etc.).
     - `SUB`: Underground utility and basement levels ($Z = -3.5m \dots 0m$).
  2. Associate each volume with parent parcel ID, floor index, and unit attributes.
  3. Expose stratified volume hierarchy via `GET /api/v1/parcels/{id}/volumes`.
- **Expected Output**: Multi-tiered volumetric property tree representing stratified land ownership.
- **Dependencies**: PHASE 5.
- **Acceptance Criteria**: Clear vertical stratification where each floor is an independently addressable 3D volume.

---

## PHASE 7 — Deterministic Spatial Validation
- **Priority**: **[MUST HAVE]**
- **Objective**: Implement the core deterministic cadastral validation engine to detect vertical overhangs, footprint breaches, and inter-volume clashes.
- **Tasks**:
  1. Implement `services/validation_engine.py`:
     - **Check 1: Footprint Containment**: Validates whether ground building footprint is completely contained within parcel boundaries.
     - **Check 2: Vertical Overhang Encroachment**: Compares upper-floor polygons against the vertical parcel column. Computes encroachment polygon $C = F_{floor} \setminus P_{parcel}$ and encroaching volume.
     - **Check 3: Inter-Unit Clashes**: Checks if adjacent volumetric units overlap.
     - **Check 4: Municipal Height Ceiling**: Checks if highest vertex exceeds zoning limit.
  2. Implement backend endpoint `POST /api/v1/validation/run`.
  3. Implement frontend `ValidationPanel.tsx` displaying pass/fail badges, encroachment volume in $m^3$, and clash coordinates.
- **Expected Output**: Instant automated spatial validation report identifying exact boundary violations.
- **Dependencies**: PHASE 5, PHASE 6.
- **Acceptance Criteria**: Intentionally planted overhang in `urban_parcel_encroachment.geojson` is reliably flagged with exact geometric clash coordinates.

---

## PHASE 8 — Prototype 3D ULPIN Generation (Completed — Step 13)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Generate unique, reproducible, coordinate-and-elevation-indexed 3D ULPIN codes for each validated cadastral property entity.
- **Tasks**:
  1. Implement `services/ulpin_service.py`:
     - Construct canonical identity payload (`schema_version`, `identifier_version`, `property_id`, `parcel_id`, sorted `building_ids`, sorted `floor_ids`).
     - Decouple completely from raw geometry, vertex coordinates, and rendering pipeline states ($\text{3D ULPIN} \neq \text{hash}(\text{raw vertices})$).
     - Require valid spatial volume (`PROPERTY_VOLUME.geometry_status == VALID`).
     - Serialize into canonical string (`3DULPIN|v1|...`).
     - Formulate versioned cryptographic identifier: `3DULPIN-V1-<SHA256_HEX_DIGEST>`.
  2. Create endpoints: `POST /api/v1/properties/generate-ulpin`, `POST /api/v1/properties/verify-ulpin`, `GET /api/v1/properties/demo-ulpins`, `POST /api/v1/ulpin/generate`, `POST /api/v1/ulpin/verify`, and `POST /api/v1/ulpin/batch`.
  3. Display 3D ULPIN Prototype in `ParcelInspector.tsx` with explicit "Prototype Identifier" badge, one-click clipboard copy, and legal non-government disclaimer.
- **Expected Output**: Algorithmic Prototype 3D ULPINs for every verified floor/property volume.
- **Dependencies**: PHASE 6.
- **Acceptance Criteria**: 100% deterministic reproducibility — verified across 15 dedicated unit and integration tests (`backend/tests/test_3d_ulpin.py`).


---

## PHASE 9 — 3D Viewer Integration & Exploded View (Completed — Step 14)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Render 3D volumetric parcels in React Three Fiber with interactive camera navigation, floor exploding, and property volumes adhering strictly to Canonical 3D Geometry Contract v1.0.
- **Tasks**:
  1. Set up React Three Fiber canvas in `components/viewer3d/Cadastral3DViewer.tsx` with native Z-up orientation (`camera.up.set(0, 0, 1)`), OrbitControls, directional/ambient lighting, and ground datum grid in the XY plane.
  2. Implement frontend safety boundary (`lib/viewer3d/validation.ts`) verifying finitude, valid index bounds, non-degeneracy, and solid topology without client-side mutation or repair.
  3. Implement canonical geometry converter (`lib/viewer3d/geometry.ts`) constructing `THREE.BufferGeometry` and thresholded `THREE.EdgesGeometry` with preserved CCW face winding.
  4. Render building envelopes (`BuildingObject.tsx`), stratified floor levels (`FloorObject.tsx`), and multi-building property volumes (`PropertyVolumeObject.tsx`).
  5. Implement **Non-Destructive Exploded Floors**: Interactive vertical translation ($\Delta Z = i 	imes d_{	ext{explode}}$) applied strictly at the Three.js scene graph level.
  6. Implement Sub-View Mode switcher (`all`, `buildings`, `floors`, `properties`), wireframe toggle, ground grid toggle, automatic bounding fit, and camera reset.
  7. Integrate seamlessly with primary workspace (`app/workspace/page.tsx`) and bidirectional 2D/3D selection with `ParcelInspector.tsx`.
- **Expected Output**: Smooth 60 FPS interactive 3D WebGL cadastre viewer consuming Canonical 3D Geometry Contract v1.0 directly.
- **Dependencies**: PHASE 1, PHASE 6, PHASE 8.
- **Acceptance Criteria**: Zero client-side geometry repairs, zero normal inversions, complete WebGL resource disposal on unmount, and 100% passing TypeScript/Lint/Build gates.

---

## PHASE 10 — Optional Gemini Intelligence Advisor
- **Priority**: **[NICE TO HAVE]**
- **Objective**: Provide an auxiliary, non-authoritative AI assistant that converts technical validation reports and volumetric rights into plain-English municipal briefs.
- **Tasks**:
  1. Implement `services/gemini_advisor.py` using `google-genai` Python SDK.
  2. Feed structured JSON output from `services/validation_engine.py` into Gemini with a strict system prompt:
     - Summarize cadastral findings in plain English.
     - Explain the nature of detected vertical encroachments.
     - Reiterate that the summary is non-binding and advisory only.
  3. Expose endpoint `POST /api/v1/ai/explain`.
  4. Implement `AIExplainModal.tsx` in frontend with markdown rendering.
- **Expected Output**: Clean plain-language briefing generated from deterministic validation metrics.
- **Dependencies**: PHASE 7.
- **Acceptance Criteria**: Gemini generates a helpful summary without altering any coordinates or validation statuses; system degrades gracefully if API key is absent.

---

## PHASE 11 — Integration Testing & Pipeline Verification (Completed — Step 15)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Verify end-to-end integration across frontend, backend, geometry processing, and validation.
- **Tasks**:
  1. Automated end-to-end test suite (`backend/tests/test_e2e_demo.py`) validating the entire sequential pipeline:
     Data Ingestion -> Parcel Validation -> Building Association -> DEM Sampling -> Building Height & Floors -> 3D Building Extrusion -> 3D Stratified Floor Solids -> 3D Property Volumes -> Deterministic 3D ULPIN -> Cryptographic Verification.
  2. Determinism and anti-tamper tests verifying hash stability and component mutation sensitivity.
  3. 100% passing test suite across 12 test modules (112 tests).
- **Expected Output**: Verified, bug-free end-to-end execution pipeline.
- **Dependencies**: ALL PRIOR MUST HAVE PHASES.
- **Acceptance Criteria**: Zero runtime console errors; 100% pass on deterministic geometry and E2E tests.

---

## PHASE 12 — Demo Polish & Presentation Hardening (Completed — Step 15)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Polish UI presentation, optimize animations, and harden presets for a flawless live hackathon demo.
- **Tasks**:
  1. Implement single-click **"Run Demo"** action in `WorkspaceHeader` and `useCadastre`, sequentially executing and lighting up the 8-stage pipeline before transitioning smoothly to the 3D property view.
  2. Implement **"Reset Demo"** action clearing selections and restoring clean demo baseline.
  3. Implement **PipelineStatus** bar auditing all 8 stages with real-time status, provenance chips, and metric summaries.
  4. Add **ErrorBoundary** around the 3D WebGL stage for resilience against unexpected graphics faults.
  5. Author comprehensive presentation documentation and setup guides in `README.md`.
- **Expected Output**: High-impact, rock-solid demo ready for judging presentation.
- **Dependencies**: PHASE 11.
- **Acceptance Criteria**: Seamless demonstration completed with one click; clear disclaimers; all quality gates green.

---

## PHASE 18A — Real OSM Building Data Ingestion (Completed — Step 18A)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Ingest and convert real OpenStreetMap data (`map.osm`) into validated 2D building footprints with strict semantic separation from cadastral parcels.
- **Tasks**:
  1. Parse OSM XML elements (nodes, ways, relations) in `app/services/osm_service.py` via `OSMBuildingExtractor`.
  2. Assemble closed 2D polygon footprints for building ways and reconstruct multi-part polygons for building multipolygon relations.
  3. Filter degenerate geometries (< 4 points or area == 0) and remove sequential duplicate vertices while maintaining ring closure.
  4. Preserve real metadata (`osm_id`, `building`, `name`, `height`, `building:levels`, `addr:*`) with deterministic IDs (`OSM-BUILDING-WAY-<id>`, `OSM-BUILDING-REL-<id>`).
  5. Enforce non-cadastral semantic flags: `is_cadastral=False`, `legal_status="UNVERIFIED_PHYSICAL_SURFACE"`, `ownership_status="UNKNOWN_UNREGISTERED"` (never claiming OSM observations are legal land parcels or official ULPIN records).
  6. Save canonical WGS84 GeoJSON output to `data/processed/real/osm_buildings.geojson`.
  7. Expose REST endpoints: `GET /api/v1/datasets/real_osm_buildings`, `POST /api/v1/buildings/import-osm`, `GET /api/v1/buildings/real-osm`, `GET /api/v1/buildings/real-osm/summary`.
  8. Provide UI integration with dedicated "Load Real OSM" action button and non-cadastral physical observation disclaimer in the inspector panel.
  9. Add comprehensive unit and integration test suite (`backend/tests/test_osm_import.py`, 8 tests).
- **Expected Output**: 155 real building footprints extracted from New Delhi (Tagore Garden) OSM dataset, 100% topologically valid, ready for multi-layer cadastral analysis.
- **Dependencies**: PHASE 3, PHASE 7.
- **Acceptance Criteria**: 100% valid polygon topology; zero fabricated heights/levels; 120/120 backend tests passing; zero build errors.

## Step 16: Unit / Apartment Entity & Vertical Property Model
- **Status**: Completed
- **Deliverables**:
  - Implemented `Unit` and `UnitPropertyRecord` domain models (`backend/app/schemas/unit.py`).
  - Implemented `UnitService` with deterministic ID generation (`BLD-{bld}-FL{fl}-U{num}`), vertical extent containment check, Shapely polygon containment check, mutual non-overlap validation (allowing common party-wall touching), and unassigned circulation support (`backend/app/services/unit_service.py`).
  - Created synthetic reference unit dataset for Tower 1 Floor 5 (`data/processed/demo_units.geojson`).
  - Added REST API routes for unit validation, batch validation, querying by building/floor, demo retrieval, and 3D property records (`backend/app/api/routes/units.py`).
  - Built 15 comprehensive unit tests (`backend/tests/test_unit_model.py`) — all 135 backend tests pass.
  - Added frontend TypeScript definitions, API client methods, hook integration, MapLibre layer with cyan polygon styling, and inspector card with SIH hierarchy chain and statutory non-ownership disclaimer.
  - Authored comprehensive documentation in `docs/UNIT_MODEL.md` and updated existing specs.

---

## Step 17: Implement Unit-Level 3D Property Volumes (Completed — Step 17)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Implement physical 3D representation: `UNIT FOOTPRINT + BASE ELEVATION + TOP ELEVATION → UNIT 3D VOLUME` conforming strictly to Canonical 3D Geometry Contract v1.0.
- **Tasks**:
  1. Updated domain schemas (`backend/app/schemas/`):
     - Added `FeatureType.UNIT` in `geometry_3d.py`.
     - Added `unit_ids: List[str]` to `PropertyVolumeRequest`.
     - Created `Unit3DRequest`, `BatchUnit3DRequest`, `Unit3DResult`, and `GenerateUnits3DResponse` in `unit.py`.
  2. Implemented extrusion & validation logic in `backend/app/services/unit_service.py`:
     - Vertical extent derivation & floor elevation bounds validation.
     - Robust footprint parsing (`Polygon`, `MultiPolygon`, `GeometryCollection`).
     - Delaunay triangulation cap generation + quad side walls forming watertight 2-manifold closed meshes with outward CCW winding.
     - Independent mesh volume verification using Divergence Theorem against analytical prism volume ($A \times h$).
     - Multi-unit party-wall tolerance: common boundary touching allowed ($\text{area} = 0$), positive overlap rejected (`inter.area > 1e-10`).
  3. Extended `backend/app/services/floor_volume_service.py` to aggregate constituent units into `PROPERTY_VOLUME` collections without boolean union.
  4. Exposed REST endpoints (`backend/app/api/routes/units.py`):
     - `POST /api/v1/units/generate-3d`
     - `GET /api/v1/units/demo-3d`
  5. Built 10 unit 3D volume tests (`backend/tests/test_unit_3d_volume.py`) — all 145 backend tests pass.
  6. Implemented frontend 3D viewing in `frontend/`:
     - Created `<UnitObject>` with cyan wireframes, interactive selection, and height hover tooltips.
     - Added `"units"` sub-view switcher, layer toggle, and explosion factor support.
     - Integrated units into `useCadastre` demo sequence and 3D workspace page.
  7. Authored technical documentation in `docs/UNIT_3D_VOLUME.md` and `UNIT_3D_VOLUME.md`.
- **Expected Output**: Watertight 3D unit volumes rendered in 3D viewer and bound to cadastral property volumes.
- **Acceptance Criteria**: Canonical 3D contract preserved; 0 TypeScript errors; 0 ESLint warnings; 145/145 tests pass.

---

## Step 18: Multi-Source Georeferencing and Spatial Data Fusion (Completed — Step 18)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Create a deterministic multi-source spatial fusion layer aligning Cadastral GIS, Physical Buildings (Synthetic & Real OSM), Digital Elevation Models (DEM), LiDAR Point Clouds, Floor Strata, Apartment Units, and GNSS/CORS Geodetic Control into a unified project spatial frame.
- **Tasks**:
  1. Implemented common source metadata model (`backend/app/schemas/fusion.py`):
     - `SourceType` (CADASTRAL_GIS, BUILDING_FOOTPRINT, OSM, DEM, DSM, LIDAR, FLOOR_PLAN, GNSS_CORS, DRONE_AERIAL).
     - `DatasetMetadata`, `GNSSReferencePoint`, `LiDARSourceReference`, `SpatialConflict`, `FusedBuildingContext`, and `FusedPropertyContext`.
  2. Implemented Georeferencing Service (`backend/app/services/georeferencing_service.py`):
     - Source CRS inspection & PROJ validation.
     - Target metric CRS strategy (`EPSG:32643` UTM 43N default or dynamic centroid derivation).
     - Reversible geometry transformation preserving native coordinates in `properties._source_geometry` and recording `TransformationRecord`.
  3. Implemented Spatial Fusion Service (`backend/app/services/fusion_service.py`):
     - Multi-source validation and compatibility evaluation.
     - Building <-> Parcel association via STRtree spatial index.
     - Building <-> DEM ground elevation sampling.
     - Building <-> LiDAR point cloud and roof return evidence.
     - Floor and Unit containment validation with party-wall touching support.
     - Real OSM ingestion with strict non-cadastral status (`is_cadastral=False`, `legal_status="UNVERIFIED_PHYSICAL_SURFACE"`).
     - Fusion Integrity Status (`VALID`, `WARNING`, `PARTIAL`, `INVALID`) and Evidence Readiness Levels (`FULL`, `PARTIAL`, `LIMITED`, `INVALID`).
  4. Exposed REST endpoints (`backend/app/api/routes/fusion.py`):
     - `POST /api/v1/fusion/validate`
     - `POST /api/v1/fusion/normalize`
     - `POST /api/v1/fusion/property-context`
     - `GET /api/v1/fusion/demo`
     - `GET /api/v1/fusion/real-osm`
  5. Built 13 comprehensive backend tests (`backend/tests/test_data_fusion.py`) — all 158 backend tests pass.
  6. Implemented frontend Data Fusion UI in `frontend/`:
     - Created `DataFusionCard.tsx` with layer alignment matrix, target CRS badge, fusion status indicators, geodetic station details, LiDAR metrics, and conflict registers.
     - Embedded `DataFusionCard` in Data Workspace (`/data`).
     - Added TypeScript definitions in `types/fusion.ts` and API client methods in `lib/api/client.ts`.
  7. Authored technical documentation in `docs/DATA_FUSION.md` and `DATA_FUSION.md`.
- **Expected Output**: Reversible multi-source spatial alignment connecting all 7 data layers without silent coordinate changes or fictitious ownership claims.
- **Acceptance Criteria**: 0 TypeScript errors; 0 ESLint warnings; 158/158 tests pass; real OSM supported with non-cadastral honesty.
---
## Step 19: AI/ML Extraction Layer & Spatial Validation Gate (Completed — Step 19)
- **Priority**: **[MUST HAVE]** — **[COMPLETED]**
- **Objective**: Implement a real, explainable AI/ML candidate extraction subsystem adhering strictly to SIH separation of concerns: `AI = Candidate Extraction`, `3D Engine = Modelling`, `Topology Engine = Validation`, `Cadastre = Authoritative Records`.
- **Tasks**:
  1. Implemented AI extraction schemas (`backend/app/schemas/ai_extraction.py`):
     - `ExtractionType` (BUILDING, FLOOR, UNIT, VERTICAL_FEATURE).
     - `CandidateStatus` (CANDIDATE, ACCEPTED, REJECTED, REVIEW_REQUIRED, UNAVAILABLE).
     - `ConfidenceLevel` (HIGH, MEDIUM, LOW, UNAVAILABLE) and `ExtractionMethod`.
     - `ModelMetadata`, `ExtractionProvenance`, `CandidateFeature`, `ExtractionResult`.
     - Validation and Spatial Comparison request/response schemas.
  2. Implemented Model Registry (`backend/app/services/model_registry.py`):
     - Registers classical CV (`bld_cv_otsu_v1`), 1D elevation density (`flr_hist_cluster_v1`), orthogonal partitioning (`unit_partition_v1`), vertical coordination (`vert_delineator_v1`), and SIH demo benchmark (`sih_benchmark_demo_v1`).
     - Deep learning models (`pytorch_mask_rcnn_v1`, `open3d_pointnet_v1`) honestly report `MODEL_UNAVAILABLE` when heavy dependencies are absent.
  3. Implemented AI Extraction Service (`backend/app/services/ai_extraction_service.py`):
     - Classical Otsu raster thresholding, contour vectorization, and compactness scoring.
     - 1D floor strata elevation interval clustering.
     - Unit interior delineation with honest `UNIT_EXTRACTION_UNAVAILABLE` fallback when floor geometry is missing.
     - Coordinated vertical strata delineation.
     - Deterministic candidate validation gate checking geometry validity, parcel boundary containment, multi-unit non-overlap, and confidence thresholds.
     - Spatial comparison engine calculating live IoU ($\\frac{A \\cap B}{A \\cup B}$), overlapping area, centroid offset, and boundary discrepancies.
  4. Exposed REST endpoints (`backend/app/api/routes/ai_extraction.py`):
     - `GET /api/v1/ai/models`
     - `POST /api/v1/ai/extract/buildings`
     - `POST /api/v1/ai/extract/floors`
     - `POST /api/v1/ai/extract/units`
     - `POST /api/v1/ai/extract/vertical`
     - `POST /api/v1/ai/validate-candidates`
     - `POST /api/v1/ai/compare`
     - `GET /api/v1/ai/demo`
  5. Built 20 unit and integration tests (`backend/tests/test_ai_extraction.py`) — all 178 backend tests pass.
  6. Implemented frontend AI Extraction Workbench in `frontend/`:
     - Created `AiExtractionCard.tsx` with 4 task rows, candidate inspector with prominent `CANDIDATE — NOT YET AUTHORITATIVE` badges, deterministic validation runner, live IoU comparison widget, and model registry viewer.
     - Embedded `AiExtractionCard` in Data Workspace (`/data`).
     - Added amber dashed AI Candidates layer support to `CadastralMap.tsx`.
     - Added strict TypeScript types (`types/ai_extraction.ts`) and API client methods (`lib/api/client.ts`).
  7. Authored technical documentation in `docs/AI_EXTRACTION.md` and `AI_EXTRACTION.md`.
- **Expected Output**: Explainable candidate extraction pipeline that feeds candidate evidence into the deterministic 3D engine without bypassing topological validation or fabricating legal ownership.
- **Acceptance Criteria**: 0 TypeScript errors; 0 ESLint warnings; 178/178 tests pass; Next.js production build succeeds; SIH architectural separation strictly preserved.
