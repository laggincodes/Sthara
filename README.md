# STHARA — 3D Spatial Property Intelligence Platform

STHARA is an advanced 3D spatial property intelligence platform designed to transform 2D maps, architectural blueprints, and GIS datasets into structured, interactive 3D spatial models.

---

## Overview

Traditional 2D cadastral representations flatten multi-level buildings into single footprints. STHARA bridges 2D geospatial mapping and architectural engineering by extracting, reconstructing, and visualizing multi-storey properties, internal floors, circulation cores, and volumetric unit cadastre.

---

## Core Capabilities

### 1. 2D Map & Building Extraction
- **Interactive Spatial Map**: Seamless GIS canvas displaying parcel boundaries, detected building footprints, and infrastructure layers.
- **Spatial Selection Tools**: Single building selection, spatial area bounding, and multi-building batch selection.
- **Real-Time Building Extrusion**: Instant transition from 2D footprint vectors to height-calibrated 3D envelopes.

### 2. Drawing Intelligence
- **Architectural Blueprint Vectorization**: Multi-region drawing analysis across Site Plans, Ground Floor Plans, Typical Floor Plans, Roof Plans, and Elevation/Section drawings.
- **Scale Calibration**: High-precision 1:100 metric datum calibration from dimension lines.
- **Topology Extraction**: Separation of load-bearing exterior walls, fire-rated core enclosures, demising boundaries, and interior partitions.
- **Circulation & Core Detection**: Automated recognition of elevator shafts, dog-leg staircases with physical treads, and access corridors.

### 3. Floor & Unit Modeling
- **Vertical Floor Stack**: Non-destructive floor stack cadastre (Ground Floor, typical repeated levels, and rooftop terrace).
- **Unit Demarcation**: Volumetric boundary generation for individual apartments and commercial suites with carpet/built-up metrics.
- **Provenance-Grounded Structure**: Zero-basement default unless explicit architectural evidence is present.

### 4. 3D Visualization & Dedicated Explorer
- **Multi-Perspective Camera Presets**: Perspective, Front Elevation, Side Elevation, and Nadir Top (Plan) views.
- **Interactive Floor Explosion**: Continuous 0% to 100% vertical separation slider to inspect internal partitions and structural cores.
- **Direct 3D Raycasting**: Click any floor slab, wall, core, or unit in 3D space to isolate and inspect its attributes.

### 5. Spatial Analysis & Measurements
- **Volumetric Calculations**: Height, surface area, and internal volume calculations in SI metric units.
- **Distance & Clearance Tools**: Point-to-point laser measurements and height verification.

### 6. Sources & Provenance
- **Traceable Attribution**: Every geometric feature retains its source file, drawing page, confidence score, and calibration reference.
- **Format Flexibility**: Ingests GeoJSON, OSM, PDF blueprints, CAD DWG/DXF, and high-resolution raster plans.

### 7. STHARA Spatial IDs
- **Deterministic Identity**: Hierarchical, deterministic spatial codes (e.g. `DL-RG-B001-F03-U301`) for building, floor, and unit indexing.
- **Non-Statutory Notice**: STHARA Spatial IDs serve spatial indexing and property intelligence; they do not represent official government land titles.

### 8. Exports & Reporting
- **3D Formats**: Export structured building models as GLTF, GLB, and GeoJSON.
- **Cadastral Reports**: Export PDF unit schedules and structural dossiers.

---

## Project Structure

```
STHARA/
├── client/                      # React 19 Frontend (Vite + Tailwind CSS + Three.js + CesiumJS)
│   ├── src/
│   │   ├── components/          # 3D Viewers, Inspectors, Controls, Navigation
│   │   ├── pages/               # Workspace, FloorExplorer, DrawingIntelligence, Analysis
│   │   └── lib/                 # Geometric calculations, tRPC client
├── server/                      # Node.js backend (Express + tRPC v10 + Zod)
│   ├── _core/                   # Server initialization, environment, auth context
│   ├── db.ts                    # Spatial records, floor stacks, audit logging
│   └── routers.ts               # Type-safe tRPC routers
├── shared/                      # Shared types, architectural geometry, floor cadastre
└── dist/                        # Production build output
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Quality Verification
```bash
pnpm check       # TypeScript typecheck
pnpm test        # Vitest test suite
pnpm build       # Production bundle
```

---

## License
Proprietary & Confidential — STHARA Project.
