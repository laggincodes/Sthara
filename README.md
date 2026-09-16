# 3D ULPIN-VPM: 3D Cadastre & Vertical Property Mapping System

[![SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-blue.svg)](https://sih.gov.in/)
[![Problem Statement ID](https://img.shields.io/badge/Problem%20Statement%20ID-26011-orange.svg)](https://sih.gov.in/)
[![Ministry](https://img.shields.io/badge/Ministry-Dept.%20of%20Land%20Resources%20(DoLR)-emerald.svg)](https://dolr.gov.in/)
[![Tech Stack](https://img.shields.io/badge/Tech-React%2019%20%7C%20CesiumJS%20%7C%20PostGIS%20%7C%20tRPC%20%7C%20Neon-cyan.svg)](#technology-stack)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#testing-and-verification)

> **Official Problem Statement ID: 26011** — *3D Unique Land Parcel Identification Number (3D ULPIN) Generation and Vertical Property Mapping (VPM) System for Digital Cadastre, High-Rise Ownership, and Multi-Storey Land Governance.*

---

## Executive Summary

The **3D ULPIN-VPM Platform** is an enterprise-grade, evidence-safe **3D GIS Digital Cadastre** developed for the **Department of Land Resources (DoLR), Ministry of Rural Development, Government of India**. 

As urban areas rapidly densify with high-rise structures, traditional 2D cadastral surveys fail to represent vertical ownership, overlapping rights, and multi-storey property units. This platform solves the 3D property boundary challenge by generating **14-digit Unique 3D ULPINs (Bhu-Aadhaar 3D)**, extruding verified PostGIS spatial parcels into 3D volumetric space, and providing unit-by-unit vertical cadastre slicing across high-rise buildings.

---

## Core Capabilities & Innovations

### 1. 3D GIS Digital Twin & Campus Inspection
- **CesiumJS 3D Globe**: High-precision WGS84 ellipsoid rendering with global terrain depth testing, Cesium World Imagery, and OpenStreetMap 3D photogrammetry tilesets.
- **Native 60 FPS Styling Engine**: Uses native `Cesium3DTileStyle` conditional expressions without rebuilding tilesets or thrashing the DOM.
- **Visual Modes**:
  - `Standard Mode`: Semi-transparent teal/cyan shading (`#188f9a`, 65% alpha) with roof/wall depth and contextual satellite basemap transparency.
  - `Height Analysis Mode`: Color-coded elevation bands (Amber for $\ge 35\text{m}$, Sky Blue for $18\text{--}35\text{m}$, Teal for $<18\text{m}$) with on-map legend.
  - `Footprint Mode`: Accents ground footprint contours and cadastre parcel boundary alignments with subdued upper geometry.
  - `Inspection Mode`: Isolates the selected building with glowing turquoise outlines (`#00f3ff`) while dimming surrounding structures (`rgba(12, 41, 47, 0.28)`).

### 2. Smooth 360° Turntable Orbit & Camera Presets
- **Continuous 360° Orbit**: Frame-by-frame continuous camera rotation around the inspected building's centroid.
- **Incremental Stepper Controls**: Quick $\pm 45^\circ$ step rotation buttons.
- **Orthogonal & Oblique Presets**:
  - **Top (Nadir / Plan 90°)**: 2D cadastral boundary alignment.
  - **45° Perspective**: Standard urban oblique overview.
  - **Isometric View (25°)**: 3D vertical spatial inspection.
  - **Compass Reset**: Live heading readout with instant reset to True North (0°).

### 3. Multi-Storey Cadastral Slicing & Vertical Floor Stacks
- **Vertical Floor Explosion**: Interactive slider to separate multi-storey floor slabs in 3D volumetric space.
- **Floor-by-Floor Cadastre**: Level selection pills (`B1`, `G`, `F1`–`F12`, `Terrace`) displaying MSL elevation, unit count, and carpet area.
- **Registered Cadastral Units**: Detailed breakdown of residential, commercial, office, parking, and common utility units with owner names and 14-digit 3D ULPINs.

### 4. Zero Mock / Strict Data Integrity
- **Non-Negotiable Data Rules**: Never fabricates or estimates heights, floors, owners, or ULPINs. If authoritative records are missing, fields explicitly report `"Data Not available / Not verified"`.
- **Three-Level Evidence Ladder**:
  - `Level 1 — Source Footprint`: Public/open/source-backed footprint with unverified height.
  - `Level 2 — Verified Height`: Authority-verified elevation and matched PostGIS geometry.
  - `Level 3 — Floor Plan / BIM`: Official architectural floor plan, registered vertical units, and verified ownership.

---

## End-to-End User Flow

```mermaid
flowchart TD
    A[3D CAMPUS / CITY OVERVIEW] -->|Pointer Hover| B[Building Hover Tooltip & Highlighting]
    B -->|Click Selection| C[Building Select & Smooth Camera Fly-To]
    C -->|Background Dimmed| D[BUILDING INSPECTOR PANEL]
    D --> E1[SOURCE Context]
    D --> E2[IDENTIFICATION: 3D ULPIN & ID]
    D --> E3[GEOMETRY: Footprint Area & Real Height]
    D --> E4[PROPERTY: Owner & Cadastral Status]
    D --> E5[EVIDENCE: Integrity Rating & Statutory Notice]
    D -->|Floor Stack Present| F[3D Floor Slicer & Vertical Cadastre]
    F --> G1[Floor Explosion View]
    F --> G2[Floor Level Selection]
    F --> G3[Unit-by-Unit Ownership & 3D ULPIN]
```

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite, Wouter | Single-page application, routing, and responsive dashboard. |
| **Styling & Icons** | Tailwind CSS, Radix UI, Lucide, Framer Motion | Modern dark government GIS aesthetics, HUD toolbars, accessible dialogs. |
| **3D & Spatial GIS** | CesiumJS, Three.js, Cesium Ion, PostGIS GeoJSON | 3D globe, photogrammetric 3D tiles, floor explosion, spatial geometry. |
| **Backend API** | Node.js, Express, tRPC v10, Zod | Type-safe RPC endpoints, validation, and protected authority workflows. |
| **Authentication & RBAC** | Clerk React, Clerk Express, Neon RBAC | Multi-role identity (Citizen, Authority Officer, Super Admin). |
| **Database & ORM** | Neon PostgreSQL, PostGIS, Drizzle ORM | Spatially indexed parcels, cadastral units, audit trails, evidence files. |
| **Testing & Quality** | Vitest, TypeScript compiler (`tsc --noEmit`) | Automated unit, integration, and cadastral test suites. |
| **Deployment** | Vercel Serverless Functions + Static Assets | Production hosting with low-latency CDN delivery. |

---

## Architecture

```
                                  ┌────────────────────────┐
                                  │   Clerk Auth Portal    │
                                  └───────────┬────────────┘
                                              │ Session Token
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT (React 19)                                    │
│  ┌────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │   Cesium 3D Viewer     │  │  Building Inspector HUD │  │   3D Floor Slicer       │  │
│  │  (WGS84 3D Globe,      │  │  (5-Section Cadastral   │  │  (Floor Explosion,      │  │
│  │   3D Tiles, 360 Orbit) │  │   Attributes & Integrity│  │   Unit Cadastre Drawer) │  │
│  └───────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘  │
└──────────────┼────────────────────────────┼────────────────────────────┼───────────────┘
               │                            │ tRPC Requests              │
               ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Express / tRPC API)                               │
│  ┌────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  RBAC & Role Gate      │  │  3D Cadastre Service    │  │  Audit & Surveillance   │  │
│  │  (Citizen / Officer /  │  │  (14-digit ULPIN logic, │  │  (Super Admin Logs,     │  │
│  │   Super Admin)         │  │   Floor stack solver)   │  │   Evidence Locks)       │  │
│  └───────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘  │
└──────────────┼────────────────────────────┼────────────────────────────┼───────────────┘
               │                            │ SQL / PostGIS queries      │
               ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     DATA LAYER                                         │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │            Neon PostgreSQL               │  │          PostGIS Database          │  │
│  │  (Users, Roles, Cadastre Units, Audits)  │  │  (Spatial Polygons, Footprints)    │  │
│  └──────────────────────────────────────────┘  └────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3D ULPIN (Bhu-Aadhaar) Structure

The 14-character alphanumeric **3D Unique Land Parcel Identification Number** is structured as follows:

$$\underbrace{\text{IN}}_{\text{Country Code}} - \underbrace{\text{BR}}_{\text{State}} - \underbrace{\text{PAT}}_{\text{District}} - \underbrace{\text{0104}}_{\text{Base Parcel ID}} - \underbrace{\text{F3}}_{\text{Floor}} - \underbrace{\text{U302}}_{\text{Unit Number}}$$

1. **State & District Code**: Geopolitical administrative identification (e.g., `BR` = Bihar, `PAT` = Patna).
2. **Base Cadastral Parcel ID**: 2D ground footprint reference in municipal land records.
3. **Vertical Level / Floor Code**: `B1` (Basement), `G` (Ground), `F1`–`FN` (Upper Floors), `T` (Terrace).
4. **Spatial Unit Index**: Sub-divided apartment, office, or commercial volumetric bounds.

---

## Workspaces & Application Routes

| Route | Workspace | Description |
| :--- | :--- | :--- |
| `/` | **Landing & Access** | Secure Clerk sign-in and platform onboarding portal. |
| `/dashboard` | **Operational Hub** | Metric summaries, active cadastre records, verification queues. |
| `/workspace?segment=buildings` | **3D Building Explorer** | Interactive 3D campus visualization, search, 360° orbit, and building inspector. |
| `/workspace?segment=parcels` | **Parcel Cadastre** | 2D/3D land parcel boundaries and base cadastral records. |
| `/floor-explorer` | **Vertical Floor Cadastre** | Unit-by-unit 3D spatial cadastre inspection and floor unit drawer. |
| `/ulpin-registry` | **3D ULPIN Registry** | Searchable directory of issued and pending 3D ULPIN records with PDF/CSV export. |
| `/admin/surveillance` | **Super Admin Surveillance**| High-security live user session monitoring, role assignment, and audit logs. |
| `/profile-settings` | **Profile & Preferences** | User account details, session overview, and UI accessibility preferences. |

---

## Local Development & Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `pnpm` (`v9.x` or higher)
- **Database**: PostgreSQL with PostGIS extension (or [Neon Postgres](https://neon.tech/))
- **Authentication**: [Clerk](https://clerk.com/) developer instance
- **3D Tiles**: [Cesium Ion](https://cesium.com/ion/) access token

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Gautam-kumar01/SIH-2026.git
cd SIH-2026

# Install dependencies
pnpm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
POSTGIS_DATABASE_URL=postgresql://user:password@host/database?sslmode=require
POSTGIS_API_KEY=your_secure_postgis_api_key

# Cesium Ion Access Token
VITE_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_token
CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_token

# Application Config
PORT=3000
NODE_ENV=development
```

### 4. Running the Development Server

```bash
pnpm dev
```

The application will start at `http://localhost:3000` (or `http://localhost:5173`).

---

## Testing and Verification

```bash
# 1. Run TypeScript strict type-checking
pnpm check

# 2. Run unit and integration tests
pnpm test

# 3. Run specific Floor Cadastre & Slicer test suite
pnpm vitest run server/mapFloorSlicer.test.ts

# 4. Production bundle build validation
pnpm build
```

---

## Statutory & Evidence Disclaimer

> **Statutory Notice**: *The 3D volumetric models, floor separations, and visual extrusions in this software represent spatial context and cadastral proof-of-concept for the Smart India Hackathon 2026 (Problem Statement 26011). Official cadastral parcel boundaries, verified heights, ownership rights, and issued 3D ULPINs require statutory validation by the State Land Revenue Department and the Department of Land Resources (DoLR), Government of India.*

---

## Contributors & Acknowledgements

- **Team Gautam Kumar** — *Smart India Hackathon 2026*
- **Ministry of Rural Development & Department of Land Resources (DoLR)**
- Built with [React](https://react.dev/), [CesiumJS](https://cesium.com/), [PostGIS](https://postgis.net/), [tRPC](https://trpc.io/), and [Neon](https://neon.tech/).
