# STHARA — 3D Cadastral Intelligence

> Next-generation 3D spatial cadastre, volumetric land rights modeling, and prototype 3D-ULPIN platform. Fusing 2D cadastral, LiDAR, elevation, and building data to generate validated 3D property models and unique 3D ULPINs.

---

## Problem
Traditional land records and cadastre systems operate strictly on 2D planar projections. In dense urban landscapes, this creates critical blind spots:
1. **Vertical Rights Ambiguity**: Inability to formally register and visualize stratified multi-tier property rights (apartments, basements, utility corridors, elevated transit).
2. **Hidden Boundary Encroachments**: 2D maps fail to detect vertical cantilever overhangs, subterranean basement penetrations, or air-rights violations.
3. **Inadequate Identification**: Traditional 2D land parcel IDs (like standard 2D ULPIN / Bhu-Aadhaar) reference surface parcels, leaving multi-storey vertical units without distinct spatial identifiers.

---

## Solution
**3D Cadastral Intelligence** is a web-based geospatial intelligence platform that:
- Ingests 2D cadastral boundary layers, building footprints, and elevation attributes.
- Fuses multi-source spatial data and normalizes coordinate reference systems (CRS) to metric projections.
- Deterministically extrudes and models 3D polyhedral property volumes ($Z_{min}$ to $Z_{max}$) for surface parcels, above-ground floors, and underground basements.
- Automatically performs spatial validation checks: footprint containment, vertical overhang encroachments, and volumetric clashes.
- Formulates and assigns reproducible **Prototype 3D ULPIN** strings indexed by geohash, stratum type, and elevation bounds.
- Renders an interactive 2D GIS map and 3D WebGL cadastre with floor slicing and clash highlighting.
- Provides an auxiliary, non-authoritative AI explainer (Google Gemini) for plain-English municipal briefs.

---

## Architecture Overview
The platform enforces a strict separation between **deterministic computational geometry** and **auxiliary AI assistance**:
- **Authoritative Processing**: Coordinate reprojections, spatial intersections, 3D volume extrusions, clash detection, and 3D ULPIN generation are mathematically computed using `Shapely`, `GeoPandas`, and `PyProj`.
- **Auxiliary AI Layer**: Google Gemini is strictly confined to non-authoritative natural language explanations of validation logs. AI never modifies coordinates or validation verdicts.

```
┌────────────────────────────────────────┐
│      Next.js Frontend (React 19)       │
│  - 2D Cadastral Map (Leaflet/MapLibre) │
│  - 3D Volumetric Stage (Three.js/R3F)  │
│  - Validation Console & 3D ULPIN Card  │
└───────────────────┬────────────────────┘
                    │ REST API (JSON / GeoJSON)
┌───────────────────▼────────────────────┐
│         Python FastAPI Backend         │
│  - Geospatial Processor (PyProj)       │
│  - Extrusion Service (Shapely/GEOS)    │
│  - Deterministic Validation Engine     │
│  - Prototype 3D ULPIN Generator        │
│  - Optional Gemini Advisor Bridge      │
└────────────────────────────────────────┘
```

---

- **Frontend**: Next.js 15+ (App Router), TypeScript, Tailwind CSS, Three.js, React Three Fiber
- **2D GIS Mapping**: Leaflet / MapLibre GL
- **Backend Service**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2
- **Computational Geometry**: Shapely 2.0+ (GEOS), PyProj (PROJ), GeoPandas, NumPy
- **Data Persistence**: Local File / GeoJSON Fast-Track Spatial Registry (PostGIS / Supabase Enterprise Deployment Architecture)
- **AI / Advisory**: Google Gemini Flash API (`google-genai` SDK — Non-Authoritative Advisory Summaries Only)

---

## Technical Claim Audit & Presentation Alignment Matrix

| Presentation Claim | Active Codebase Status | Technical Evidence & Implementation Scope | Truthful Product Labeling |
| :--- | :---: | :--- | :--- |
| **2D Cadastral Boundary** | **IMPLEMENTED** | `Shapely` / `GeoPandas` 2D parcel polygons, MapLibre GL layer | 2D Cadastral GIS Polygon |
| **Building Footprints** | **IMPLEMENTED** | OSM building extraction (`osm_service.py`), 155 real footprints | OpenStreetMap Building Footprint |
| **Floor Stratification** | **IMPLEMENTED** | Deterministic floor slicing, 4 floor levels, $Z_{min} \dots Z_{max}$ ranges | Configured Floor Stratification |
| **Property Volume Solids** | **IMPLEMENTED** | Polyhedral 3D watertight extrusions (`3d_extrusion.py`) | 3D Polyhedral Solid Volume |
| **Underground / Subsurface** | **IMPLEMENTED** | Subterranean basements & utility conduits (`underground_model.py`) | Configured Subsurface Geometry |
| **Multi-Source Data Fusion** | **IMPLEMENTED** | Multi-source spatial registry (`data_fusion.py`) & provenance | Source-Derived Spatial Lineage |
| **Drone / Aerial Imagery** | **REFERENCE ONLY** | Image import & reference layer display; no CV photogrammetry | Aerial Reference Base Layer |
| **LiDAR Point Cloud** | **FUTURE OPTION** | Point cloud infrastructure planned; no raw LAZ/LAS parsing | LiDAR Input — Planned |
| **DEM / DSM Elevation** | **IMPLEMENTED** | Copernicus 30m DEM elevation sampling (`elevation_service.py`) | DEM Elevation Sampling |
| **Floor Plans & Blueprints** | **IMPLEMENTED** | Document upload & floor level association (`floor_plan_service.py`) | User-Provided Floor Plan |
| **GNSS / CORS Positioning** | **REFERENCE ONLY** | Metric coordinate transformation to `EPSG:32643` UTM grid | GNSS/CORS Reference Grid |
| **X + Y + Z Spatial Fusion** | **IMPLEMENTED** | Planar footprint + DEM elevation + vertical floor heights | 3D Polyhedral Volumetric Fusion |
| **3D Cadastral Engine** | **IMPLEMENTED** | Watertight polyhedral extrusion, 3D Bounding Box, 3D Queries | 3D Volumetric Cadastre Engine |
| **Spatial Data Ingestion** | **IMPLEMENTED** | GeoJSON, OpenStreetMap XML, DataMeet reference layers | Multi-Format Spatial Ingestion |
| **Building Extraction** | **IMPLEMENTED** | `osm_service.py` XML way & relation parser | OSM Building Vector Extraction |
| **Floor Segmentation** | **IMPLEMENTED** | Deterministic vertical floor height & Z-interval slicing | Source-Derived Floor Slicing |
| **Vertical Delineation** | **IMPLEMENTED** | 3D polyhedral solid volume stratification | 3D Stratified Spatial Unit |
| **Topology Validation** | **IMPLEMENTED** | `topology_engine.py` 3D containment, overlap, touch checks | Deterministic 3D Topology Gate |
| **3D ULPIN Concept** | **PROTOTYPE** | SHA-256 spatial hash prototype (`ulpin_service.py`) | STHARA Spatial ID (Prototype) |
| **AI / ML Extraction** | **ADVISORY ONLY** | Non-authoritative Gemini natural language explainer | Gemini Advisory Layer (Non-Authoritative) |
| **3D GIS Viewer** | **IMPLEMENTED** | Three.js / React Three Fiber dual 2D/3D WebGL stage | Three.js WebGL 3D Cadastre |
| **CesiumJS** | **FUTURE OPTION** | Active viewer is Three.js; CesiumJS available for 3D Tiles | Three.js WebGL Viewer |
| **GDAL / GEOS** | **IMPLEMENTED (GEOS)** | Shapely 2.0 GEOS & PyProj PROJ integration | Shapely GEOS / PyProj Engine |
| **Open3D** | **FUTURE OPTION** | Geometry processing uses GEOS / Shapely / NumPy | Python GEOS Geometry Engine |
| **GeoPandas** | **IMPLEMENTED** | GeoPandas & Shapely used in backend geospatial processors | GeoPandas / Shapely Processing |
| **PostGIS** | **FUTURE OPTION** | Active runtime uses file/memory isolated registry | Fast-Track Spatial Registry (PostGIS Ready) |
| **Supabase** | **FUTURE OPTION** | Local offline execution; Supabase planned for cloud multi-user | Local Offline Architecture |
| **PyTorch / CV** | **FUTURE OPTION** | Deterministic computational geometry extrusion | Deterministic Geometry Extrusion |
| **OGC 3D Tiles** | **FUTURE OPTION** | Exports Wavefront OBJ & GeoJSON 3D; 3D Tiles planned | Wavefront OBJ & GeoJSON 3D Export |
| **ISO 19152 / LADM** | **CONCEPT ALIGNED**| Data model structured around Party $\to$ Right $\to$ Spatial Unit | LADM Conceptual Alignment |
| **Underground Utilities** | **IMPLEMENTED** | `underground_model.py` subterranean basement & conduit solids | Subsurface Conduit & Basement Solids |
| **Multi-Building Scale** | **IMPLEMENTED** | 155 real building footprints from Tagore Garden, New Delhi | Multi-Building Scalable Cadastre |

---

## Project Structure
```
3d-cadastral-intelligence/
├── frontend/                     # Next.js web application
├── backend/                      # FastAPI geospatial processing service
├── data/
│   ├── raw/                      # Raw input shapefiles & blueprints
│   └── processed/                # Normalized GeoJSON sample datasets
├── docs/                         # Additional technical documentation
├── PRD.md                        # Product Requirements Document
├── ARCHITECTURE.md               # Technical system architecture
├── DESIGN.md                     # UI/UX design system specification
├── RULES.md                      # Engineering and development rules
├── PHASES.md                     # Step-by-step implementation roadmap
├── DATA_MODEL.md                 # Entity definitions and 3D ULPIN spec
├── API_SPEC.md                   # REST API contracts
└── README.md                     # Project overview and setup guide
```

---

## Development Roadmap & Execution Status
- **STEPS 1–6**: Cadastral Hierarchy & 3D Extrusion Engine *(Completed)*
- **STEPS 7–8**: 3D Measurement Tools & Spatial Analysis Engine *(Completed)*
- **STEP 9**: Multi-Source Spatial Data Fusion & Provenance Tracking *(Completed)*
- **STEPS 10–12**: Topological Conflict & Underground/Basement Modeling *(Completed)*
- **STEPS 13–15**: Prototype 3D ULPIN Indexing & Platform Verification *(Completed)*
- **STEP 16**: Real-World Demo System + Hero Property (`Connaught Tower A`, `STHARA-REALWORLD-DEMO`) *(Completed)*
- **STEP 17**: Real-World Demo Visual & Functional QA *(Completed)*
- **STEP 18**: Final UX/UI Polish & Matte Architectural Design Language *(Completed)*
- **STEP 19**: Production Hardening, Upload Protections & Security Sanitization *(Completed)*
- **STEP 20**: Technical Documentation & GitHub Readiness *(Completed)*
- **STEP 21**: Production Release Validation & E2E Verification *(Completed — 392/392 tests pass)*

---


---

## Real-World OpenStreetMap Dataset (Step 18A)

The platform supports ingesting and converting real-world OpenStreetMap vector data (`map.osm`) alongside synthetic cadastral benchmarks.

### Source Data Profile
- **Location**: Tagore Garden, West Delhi, India
- **Coordinates**: Min Lon `77.1106180`, Min Lat `28.6473140`, Max Lon `77.1137990`, Max Lat `28.6488370`
- **Source File**: `data/raw/real/map.osm` (180 KB XML)
- **Processed File**: `data/processed/real/osm_buildings.geojson` (199 KB GeoJSON)

### Extraction Summary
| Metric | Value |
|---|---|
| Total OSM Nodes | 719 |
| Total OSM Ways | 183 |
| Total OSM Relations | 2 |
| Extracted Real Buildings | 155 |
| Building Ways | 154 |
| Building Multipolygon Relations | 1 |
| Degenerate / Skipped Geometries | 0 |
| Topological Validity | 100% (`BuildingValidator` Valid: True) |
| Buildings with Explicit Height Tag | 0 (0.0% — not fabricated) |
| Buildings with Explicit Floor Levels Tag | 0 (0.0% — not fabricated) |

### Non-Cadastral Semantic Boundary
In adherence to cadastral integrity standards, OpenStreetMap physical surface observations are strictly distinguished from legal land parcels:
- `is_cadastral = False`
- `legal_status = "UNVERIFIED_PHYSICAL_SURFACE"`
- `ownership_status = "UNKNOWN_UNREGISTERED"`
- OSM footprints never fabricate property rights, parcel boundaries, or official ULPIN registrations.

### CLI Usage
To run or re-run the extraction via command line:
```bash
# Using backend virtual environment
cd backend
.venv\Scripts\python.exe -m app.services.osm_service
```

## Demo Walkthrough & Presentation Guide

The platform is equipped with an automated, deterministic **"Run Demo"** pipeline tailored for live STHARA evaluations and presentations.

### 1. Instant Automated Demo
1. Open the workspace at [`http://localhost:3000/workspace`](http://localhost:3000/workspace).
2. Click the glowing **"Run Demo"** button in the top navigation bar.
3. The real-time **Pipeline Audit** stepper lights up sequentially across all 8 stages:
   ```text
   01 Data Sources        ✓ [2 Parcels, 2 Buildings]
   02 Parcel Validation   ✓ [2 Features Topologically Valid]
   03 Building Mapping    ✓ [2 Footprints Associated (100% Inside)]
   04 DEM Elevation       ✓ [Centroid Ground Elevation Sampled: 562.48m]
   05 3D Geometry         ✓ [Watertight Polyhedral Solids Extruded]
   06 Stratified Floors   ✓ [Multi-Storey Slabs Sliced (3.0m)]
   07 Property Volume     ✓ [5 Registered Cadastral Units Bound]
   08 3D ULPIN            ✓ [Cryptographically Verified SHA-256 Identifiers]
   ```
4. The system automatically switches into the **3D Cadastral Stage**, isolates the primary demo property (`PROP-DEMO-101-U01`), renders its 3D volume, and displays its verified **3D ULPIN Prototype** in the analytical inspector.
5. Click **"Reset Demo"** at any time to restore a clean state for subsequent evaluation runs.

### 2. Interactive Inspection & Presentation Controls
* **2D ↔ 3D Synchronization**: Toggle between **2D Map** and **3D Cadastre** to demonstrate cross-domain coordinate coherence.
* **Exploded Floor Slider**: Drag the vertical displacement slider ($0\text{ m} \dots 5\text{ m}$) to visually separate multi-storey floor levels.
* **Sub-View Layers**: Switch between:
  - `All`: Outer building shells + floor boundaries + property volumes.
  - `Buildings`: Architectural building envelopes (`BUILDING_VOLUME`).
  - `Floors`: Individual stratified horizontal slabs (`FLOOR_VOLUME`).
  - `Properties`: Registered cadastral ownership units (`PROPERTY_VOLUME`).
* **3D ULPIN Copy**: Click the **Copy** button in the inspector to copy the 64-character deterministic ULPIN prototype to the clipboard.
* **Pipeline Audit Drawer**: Toggle the **Pipeline Audit** button in the header to expand or collapse the 8-stage audit grid.

---

## Local Setup & Quickstart

### Prerequisites
* **Node.js**: v18.17+ (v20+ recommended) & `npm`
* **Python**: v3.11+
* **Git**

### 1. Backend Setup (FastAPI Geospatial Service)
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\activate

# On Linux / macOS:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI geospatial server on port 8000
uvicorn app.main:app --reload --port 8000
```
* Interactive API Documentation (Swagger): [`http://localhost:8000/docs`](http://localhost:8000/docs)
* Service Health Diagnostic: [`http://localhost:8000/api/v1/health`](http://localhost:8000/api/v1/health)

### 2. Frontend Setup (Next.js Application)
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
* Web Application: [`http://localhost:3000`](http://localhost:3000)
* Cadastral Workspace: [`http://localhost:3000/workspace`](http://localhost:3000/workspace)

### 3. Environment Variables
Copy `.env.example` templates if customization is needed:
* **Backend**: `backend/.env.example` -> `backend/.env` (default port: `8000`, CORS: `http://localhost:3000`)
* **Frontend**: `frontend/.env.example` -> `frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`)

---

## Prototype Disclaimers & Cadastral Boundaries

> [!IMPORTANT]
> **AUTHORITATIVE DOMAIN & SEMANTIC BOUNDARIES**  
> 1. **Synthetic Demo Dataset**: All sample parcels, building footprints, and elevation rasters provided in `data/processed/` are **purely synthetic demonstration data** created for algorithmic verification. They do **NOT** represent official Government of India cadastral records or real land survey documents.  
> 2. **3D ULPIN Prototype**: The generated 3D ULPIN codes (`3DULPIN-V1-<SHA256>`) represent a **project-specific deterministic prototype design**. It is **NOT** an official Government of India or state-level ULPIN / Bhu-Aadhaar specification.  
> 3. **Geometric Rights vs. Legal Ownership**: Spatial containment, volume extrusion, and clash detection are purely geometric calculations. Geometric containment within a parcel does **NOT** constitute legal proof of title, tenure, or municipal zoning sanction.  
> 4. **Deterministic Computational Geometry Authority**: All coordinate projections, spatial intersections, 3D polyhedral extrusions, and hash derivations are computed deterministically using `GEOS`, `Shapely`, `GeoPandas`, and `PyProj`. Generative AI is **strictly non-authoritative** and confined to plain-English advisory summaries.

## Platform Capability Alignment & Final End-to-End Demo

The platform is 100% aligned with the official STHARA Presentation specifications:

- **8 Technical Stages:**
  1. `01 INGESTION`: Multi-source ingest (Parcels, Buildings, DEM, Units, Subsurface).
  2. `02 GEO-REF`: CRS validation and projection to metric grid (EPSG:32643).
  3. `03 FUSION`: Footprint-to-parcel association and Copernicus DEM elevation sampling.
  4. `04 AI/ML`: Explainable vertical height calculation and candidate unit segmentation.
  5. `05 3D ENGINE`: Watertight polyhedral extrusion conforming to Canonical 3D Geometry Contract v1.0.
  6. `06 TOPOLOGY`: Unified spatial conflict engine (overlaps, containment, duplicates, clash).
  7. `07 3D ULPIN`: Deterministic SHA-256 spatial hash prototype (clearly flagged non-official).
  8. `08 VIEWER`: Interactive dual-canvas 2D + 3D Three.js viewer with vertical cutaways.

- **Canonical Demo Unit:** `PARCEL-DEMO-101` → `BLD-DEMO-002` → `FL05` → `BLD-DEMO-002-FL05-U501`
- **Controlled Conflict Demo:** Intentional overlap detection between `UNIT-102` and `UNIT-103-CONFLICT` ($\Delta = 24.5	ext{ m}^2$) without silent geometry repair.
- **Complete Runbook:** See [docs/FINAL_DEMO.md](docs/FINAL_DEMO.md) and [docs/PPT_ALIGNMENT_MATRIX.md](docs/PPT_ALIGNMENT_MATRIX.md).


## Platform Capability Alignment & Truthful Capability Status
For a full 18-point capability audit matching the STHARA platform claims against the running codebase, refer to [docs/SIH_CAPABILITY_STATUS.md](docs/SIH_CAPABILITY_STATUS.md).
