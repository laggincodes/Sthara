# 3D Cadastral Intelligence — Final End-to-End Demo Guide & Runbook

**Document Version:** 1.0.0  
**Date:** September 2026  
**Audience:** SIH Evaluators, Hackathon Jury, Government Land Records Authorities  
**System Status:** Production-Ready Presentation Candidate  

---

## 1. Quick Launch & Demonstration Setup

### 1.1 Prerequisites
- **Python:** 3.11+ (Virtual environment in `backend/.venv`)
- **Node.js:** 18+ (Next.js 16 in `frontend`)
- **Browser:** Any modern WebGL2-enabled browser (Google Chrome, Microsoft Edge, Firefox, Brave)

### 1.2 Starting the Servers

**Terminal 1 — Backend (FastAPI on Port 8000):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Verify Backend:* Open `http://localhost:8000/docs` — all 38 REST endpoints should be live with Swagger OpenAPI documentation.

**Terminal 2 — Frontend (Next.js on Port 3000):**
```powershell
cd frontend
npm run dev
```
*Verify Frontend:* Open `http://localhost:3000` — the Cadastral Command Center dashboard should load with live telemetry.

---

## 2. 5-Minute Pitch Presentation Script (Walkthrough)

### Stage 1: The Problem (00:00 - 01:00)
- **Visual:** Open `http://localhost:3000/workspace/2d`.
- **Narrative:**
  > "Traditional Indian land administration (Bhu-Naksha / 2D ULPIN) relies strictly on 2D surface parcels. When a 30-storey tower is built, dozens of owners occupy the exact same 2D footprint. 2D maps cannot represent vertical ownership, cannot prevent horizontal floor encroachments, and completely ignore underground metro corridors, basements, and utility trunks. Our project implements the 3D Cadastral Intelligence Platform specified in the SIH mandate."

### Stage 2: 1-Click End-to-End Pipeline Execution (01:00 - 02:30)
- **Action:** Click **"Run Demo"** on the persistent top audit bar, or navigate to `http://localhost:3000/pipeline` and click **"▶ Run Full Pipeline"**.
- **Observation:**
  - The pipeline audit console executes all **8 SIH technical stages** synchronously:
    1. `01 INGESTION`: Ingests parcels (`demo_parcels.geojson`), footprints (`demo_buildings.geojson`), Copernicus DEM raster, and unit floor plans.
    2. `02 GEO-REF`: Verifies topological integrity and projects coordinates to EPSG:32643 metric grid.
    3. `03 FUSION`: Associates footprints with parent parcels and samples Copernicus DEM orthometric elevations.
    4. `04 AI/ML`: Computes building heights ($H = Z_{roof} - Z_{ground}$), segments floors, and gates unit boundaries.
    5. `05 3D ENGINE`: Extrudes watertight polyhedral solid meshes conforming strictly to **Canonical 3D Geometry Contract v1.0**.
    6. `06 TOPOLOGY`: Executes the Unified Spatial Conflict Engine (zero overlap, containment, duplicate check).
    7. `07 3D ULPIN`: Issues deterministic, cryptographically verifiable 3D spatial identifier prototypes.
    8. `08 VIEWER`: Automatically activates the interactive 3D Volumetric Stage and selects the canonical demo unit.

---

## 3. Canonical Reference Demo Property Walkthrough

To verify end-to-end multi-tier cadastral linkage, inspect the canonical demo unit automatically highlighted after the demo run:

### Reference Hierarchy:
```
Cadastral Parcel:    PARCEL-DEMO-101 (or PARCEL-DEMO-102)
   └── Building:     BLD-DEMO-002 (Residential Tower 1, 7 Storeys)
        └── Floor:   FL05 (Level 5, AMSL 577.48m - 580.48m)
             └── Unit: BLD-DEMO-002-FL05-U501 (Apartment 501, 2BHK North-West)
```

### Canonical Property Record Card (in 3D Inspector):
- **Property Record ID:** `PROP-DEMO-102-U501`
- **Cadastral Parcel ID:** `PARCEL-DEMO-101`
- **Parent Building:** `BLD-DEMO-002` (Structure: Residential)
- **Floor Level:** `FL05` (Floor index: 5)
- **Unit Identifier:** `BLD-DEMO-002-FL05-U501`
- **Vertical Span:** `577.48m – 580.48m AMSL` (Height: `3.00m`)
- **Footprint Area:** `44.5 m²`
- **Property Volume:** `133.5 m³`
- **Topology Status:** `VALID · 0 Boundary Overlaps (Manifold Solid)`
- **3D ULPIN Prototype:**  
  `3DULPIN-V1-CE837F415A569A2ADE2B320FD765BA7F33C7B3CD466DC760757E1B57705BA845`
- **Official Disclaimer:** Clearly labeled as a non-official research prototype.

### Key Interactive Features to Demonstrate on this Unit:
1. **Floor Isolation Slider:** Use the slider in the top toolbar to isolate Floor 5 and reveal internal partition geometries.
2. **Explode View:** Drag the explode slider to separate building floors into floating strata levels.
3. **Subsurface Cutaway:** Toggle **"Subsurface"** mode and enable **"Cutaway Mode"** to reveal `BASEMENT-DEMO-001` and `UTIL-DEMO-001` (water trunk) beneath the surface.

---

## 4. Controlled Failure Demo: Spatial Conflict & Overlap Detection

To demonstrate that our engine does not perform "happy path only" faking, run the controlled topology failure case:

1. In the right-hand panel, select the **Topology** tab, or navigate to `http://localhost:3000/pipeline` and select Stage 6 (`06 TOPOLOGY`).
2. Click **"Load Conflict Scene"** (or **"Load Demo Scene"** in TopologyCard).
3. The engine immediately audits the scene and flags an intentional cadastral conflict:
   - **Conflict ID:** `CONF-OVERLAP-2D-UNIT-UNIT-102-UNIT-103`
   - **Conflict Type:** `POSITIVE_AREA_OVERLAP`
   - **Severity:** `ERROR`
   - **Entities Involved:** `UNIT: UNIT-102` and `UNIT: UNIT-103` (labeled `103-CONFLICT`)
   - **Measured Area Overlap:** `Δ 24.5 m²`
   - **Diagnostic Explanation:** *"Positive area overlap of 24.5 m² between 'UNIT-102' and 'UNIT-103'. Sibling features must not occupy overlapping horizontal space."*
   - **Prescribed Action:** *"Survey party-wall boundary and resolve overlapping title footprint."*
4. **Key Talking Point for Judges:**
   > "Notice that our engine refuses to silently clip or mutate either apartment boundary to force a pass. In cadastral law, silent geometric modification is illegal. The system flags the precise conflict polygon for surveyor rectification."

---

## 5. Real Data Mode vs Synthetic Benchmark Mode

Demonstrate the honest boundary between real geospatial datasets and synthetic cadastral extensions:

### Real Data Mode:
- **Dataset:** Copernicus GLO-30 DEM GeoTIFF (Pune, Maharashtra, 18.52°N, 73.85°E) + OpenStreetMap Vector Building Footprints (500 real building polygons).
- **Execution:** Go to `http://localhost:3000/pipeline`, click the **Real Pipeline Card** (or check `docs/REAL_DATA_INTEGRATION_REPORT.md`).
- **Telemetry:**
  - 500 real building footprints ingested.
  - 100% successfully reprojected to EPSG:32643.
  - Real Copernicus elevation sampled for every building centroid.
  - Tagged explicitly with `is_cadastral=False` so unverified crowdsourced footprints do not contaminate official parcel title.

### Synthetic Benchmark Mode:
- **Purpose:** Demonstrates full vertical multi-unit subdivision, strata property volumes, and underground utility corridors where official high-resolution government data is restricted.
- **Datasets:** `demo_parcels.geojson`, `demo_buildings.geojson`, `demo_units.geojson`, `demo_underground.json`.

---

## 6. Live Demo FAQ & Defense Strategy

**Q1: Did you build the AI/ML extraction layer?**  
*Answer:* "The SIH mandate explicitly defines the separation: AI = EXTRACTION, 3D ENGINE = MODELLING, TOPOLOGY = VALIDATION. Our AI/ML layer provides explainable vertical height delineation and candidate unit segmentation gating. We strictly avoid black-box hallucinating LLMs for geometry."

**Q2: Is this 3D ULPIN recognized by the Ministry?**  
*Answer:* "No. The 3D ULPIN generated here is a research prototype implementing a deterministic SHA-256 spatial hash of 3D benchmark coordinates, bounding cube, and parcel ID. It is clearly flagged as non-official in every UI card and API response."

**Q3: Does your 3D model grant legal ownership?**  
*Answer:* "No. Our 3D model represents an authoritative physical and spatial volume conforming to Canonical 3D Geometry Contract v1.0. Legal conveyance requires deed registration and statutory government authority."

**Q4: Does your engine support underground cadastral features?**  
*Answer:* "Yes. The engine models basements, utility corridors, and subsurface clearance buffers, complete with 3D cutaway clipping and spatial clash detection."
