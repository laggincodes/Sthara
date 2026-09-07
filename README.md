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

## Technology Stack
- **Frontend**: Next.js 15+ (App Router), TypeScript, Tailwind CSS, Three.js, React Three Fiber, Lucide React
- **2D Mapping**: Leaflet / MapLibre GL
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2
- **Computational Geometry**: Shapely 2.0+ (GEOS), GeoPandas, PyProj (PROJ)
- **Database / Data Store**: In-memory spatial cache / GeoJSON (SIH Fast-Track mode); PostgreSQL 16 + PostGIS 3.4 (Production mode)
- **AI (Optional)**: Google Gemini Flash API (`google-genai` SDK)

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

## Development Phases
- **PHASE 0**: Project Foundation & Documentation *(Completed)*
- **PHASE 1**: Frontend Foundation (Next.js + Tailwind layout) *(Completed)*
- **PHASE 2**: Backend Foundation (FastAPI + Health check) *(Completed)*
- **PHASE 3**: Spatial Data Ingestion & Sample Datasets *(Completed)*
- **PHASE 4**: 2D Parcel & Building Visualization *(Completed)*
- **PHASE 5**: 3D Property Extrusion Engine *(Completed)*
- **PHASE 6**: Property Volume Modelling (Stratification) *(Completed)*
- **PHASE 7**: Deterministic Spatial Validation *(Completed)*
- **PHASE 8**: Prototype 3D ULPIN Generation *(Completed — Step 13; see [3D_ULPIN.md](3D_ULPIN.md))*
- **PHASE 9**: 3D Viewer Integration & Exploded View *(Completed — Step 14; see [3D_VIEWER.md](3D_VIEWER.md))*
- **PHASE 10**: Optional Gemini Intelligence Advisor *(Advisory layer)*
- **PHASE 11**: Integration Testing *(Completed — Step 15; see [backend/tests/test_e2e_demo.py](backend/tests/test_e2e_demo.py))*
- **PHASE 12**: Demo Polish & SIH Presentation Hardening *(Completed — Step 15; see [Demo Guide](#demo-walkthrough--presentation-guide))*
- **PHASE 18A**: Real OSM Building Data Ingestion *(Completed — Step 18A; 155 real footprints from New Delhi)*

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

The platform is equipped with an automated, deterministic **"Run Demo"** pipeline tailored for live Smart India Hackathon evaluations and presentations.

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
>>>>>>> d94272d (feat: Initial release of STHARA (3D Cadastral Intelligence) - Steps 1-15 complete)

## SIH Presentation Alignment & Final End-to-End Demo

The platform is 100% aligned with the official Smart India Hackathon (SIH) Presentation specifications:

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
