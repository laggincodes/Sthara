# 3D ULPIN-VPM Dashboard — Complete Codebase Analysis

> **Project:** 3D ULPIN Generation and Vertical Property Mapping System  
> **Purpose:** Evidence-safe prototype for the Department of Land Resources (DoLR) SIH-2026 problem — source-aware 3D property review, vertical-cadastre workflows, and authority-gated data verification.  
> **License:** MIT  
> **Package Manager:** pnpm 10.x

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication & Role-Based Access Control (RBAC)](#7-authentication--role-based-access-control-rbac)
8. [3D GIS / Visualization Pipeline](#8-3d-gis--visualization-pipeline)
9. [Evidence Ladder & Data Integrity Model](#9-evidence-ladder--data-integrity-model)
10. [tRPC API Surface](#10-trpc-api-surface)
11. [Shared Utilities & Types](#11-shared-utilities--types)
12. [Build, Deploy & Configuration](#12-build-deploy--configuration)
13. [Testing Strategy](#13-testing-strategy)
14. [Key Routes & Pages](#14-key-routes--pages)
15. [Scripts & Data Import Pipeline](#15-scripts--data-import-pipeline)
16. [Environment Variables](#16-environment-variables)
17. [Research, Submission & Validation Artifacts](#17-research-submission--validation-artifacts)

---

## 1. Project Overview

This is a **monorepo-style full-stack TypeScript application** implementing a prototype for the **Smart India Hackathon (SIH) 2026** problem directed by the **Department of Land Resources**.

### Core Demonstrated Capabilities

| Capability | Description |
|---|---|
| Source-aware 3D map | CesiumJS renders source-backed footprints, layers, focus controls, and public 3D visual context. |
| Vertical evidence ladder | 3 levels: Level 1 footprint → Level 2 verified-height extrusion → Level 3 floor-plan/BIM review. |
| Property discovery | Parcels, Buildings, ULPIN Registry with source-record discovery, filtering, map focus, safe exports (CSV/PDF). |
| Evidence intake | GeoJSON/floor-plan upload, issue reports, verification submissions for review. |
| Identity & roles | Clerk for auth; backend maps Clerk IDs → server-assigned application roles. |
| Reporting | CSV + PDF exports retain source limitations and measurement disclaimers. |

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│  Browser (Client-Side SPA)                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript + Vite + Tailwind/Radix UI   │  │
│  │  ├─ CesiumJS (3D globe) + Three.js (preview)        │  │
│  │  ├─ Clerk React (sign-in, profile, session state)   │  │
│  │  └─ tRPC client + TanStack Query (typed requests)  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────┘
                       │ HTTP / tRPC (SuperJSON)
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Vercel / Node API (Server-Side)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express + Clerk middleware + tRPC router            │  │
│  │  ├─ Server-enforced protected/admin procedures      │  │
│  │  ├─ PostGIS GeoJSON endpoint (API-key protected)    │  │
│  │  ├─ Audit, issue-report, verification workflows     │  │
│  │  └─ Storage/AI adapters (S3, LLM) where configured  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Data Layer                                                  │
│  ├─ Neon PostgreSQL + Drizzle ORM                           │
│  │   (users, roles, submissions, audit logs, cadastre)      │
│  └─ PostGIS source feed (spatial footprints / GeoJSON)      │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
d:\SIH-2026\
├── api/                          # Vercel serverless entrypoint
│   ├── [...path].ts              # Catch-all Express/tRPC adapter
│   └── _server.d.ts
│
├── client/                       # Frontend SPA (React + Vite)
│   ├── index.html                # Root HTML
│   ├── public/                   # Static assets, debug collector
│   └── src/
│       ├── _core/hooks/useAuth.ts   # Auth hook (Clerk bridge)
│       ├── components/
│       │   ├── ui/               # ~60 Radix-based shadcn/ui components
│       │   ├── CesiumSpatialViewer.tsx    # Main 3D globe
│       │   ├── ThreeBuildingPreview.tsx   # Three.js focused preview
│       │   ├── Map.tsx                       # Legacy/compat map
│       │   ├── DashboardLayout.tsx           # Protected layout
│       │   ├── AIChatBox.tsx                # AI chat interface
│       │   ├── EvidenceLockBadge.tsx        # Evidence-level UI
│       │   └── ErrorBoundary.tsx / ManusDialog.tsx
│       ├── contexts/ThemeContext.tsx        # Dark/light theme
│       ├── hooks/               # Mobile, composition, persist-fn
│       ├── lib/
│       │   ├── buildingEvidenceLevel.ts    # Evidence ladder logic
│       │   ├── footprint3d.ts              # 3D footprint math
│       │   ├── trpc.ts                     # tRPC client setup
│       │   └── utils.ts                    # Tailwind merge, helpers
│       ├── pages/               # Route components
│       │   ├── Home.tsx                    # Command home / overview
│       │   ├── SpatialWorkspace.tsx        # Parcels/Buildings explorer
│       │   ├── UlpInRegistry.tsx           # Source-ID registry + exports
│       │   ├── RoleConsole.tsx             # Dashboard (role-specific)
│       │   ├── PropertyVolumes.tsx         # Evidence ladder visualizer
│       │   ├── SyntheticGcpDemo.tsx        # GCP demo page
│       │   ├── ProfileSettings.tsx         # Clerk profile + preferences
│       │   ├── ComponentShowcase.tsx       # UI gallery
│       │   └── NotFound.tsx
│       ├── App.tsx               # Routing shell
│       ├── main.tsx              # Entry (ClerkProvider + tRPC bridge)
│       ├── const.ts              # Constants, startLogin helper
│       └── index.css             # Tailwind + custom CSS variables
│
├── server/                       # Backend / API layer
│   ├── index.ts                  # (Production static server)
│   ├── db.ts                     # Drizzle + pg: users, cadastre, audit
│   ├── routers.ts                # Main tRPC appRouter
│   ├── postgis.ts                # PostGIS geometry search/update/import
│   ├── cadastreService.ts        # Cadastre search + upload validation
│   ├── evidenceExtraction.ts     # AI-assisted metadata extraction
│   ├── placeIntelligence.ts      # Place facts builder
│   ├── buildingSearchAliases.ts  # Source-backed alias resolution
│   ├── storage.ts                # S3-compatible storage (put, signed URL)
│   ├── _core/                    # Server kernel
│   │   ├── context.ts            # tRPC context (Clerk → app user mapping)
│   │   ├── trpc.ts               # Procedure guards (public/protected/admin/authority/gov)
│   │   ├── env.ts                # Env validation
│   │   ├── llm.ts                # LLM invocation adapter
│   │   ├── oauth.ts              # OAuth helpers
│   │   ├── sdk.ts / storageProxy.ts
│   │   ├── map.ts / notification.ts
│   │   ├── systemRouter.ts       # System/health procedures
│   │   ├── heartbeat.ts / vite.ts
│   │   ├── imageGeneration.ts / voiceTranscription.ts
│   │   ├── localServer.ts        # Dev server entry
│   │   ├── dataApi.ts / cookies.ts
│   │   ├── index.ts              # Server bundle entry
│   │   └── types/                # Cookie, Manus types
│   └── *.test.ts                 # 40+ Vitest integration tests
│
├── shared/                       # Cross-cutting shared logic
│   ├── _core/errors.ts
│   ├── types.ts                  # Re-exports DB schema types
│   ├── const.ts                  # Shared constants (error msgs)
│   ├── cadastre.ts               # Initial seed records + CadastreRecord type
│   ├── authorityEditValidation.ts # Revision note validation rules
│   ├── footprintGeometryEditing.ts # Polygon vertex editing helpers
│   ├── evidenceLockStatus.ts     # Evidence lock state machine
│   ├── evidenceMapFilter.ts      # Map filter definitions
│   ├── placeExplorer.ts          # Segment config (parcels/buildings)
│   ├── iitPatnaEvidence.ts       # IIT Patna institutional context
│   ├── iitPatnaAutocomplete.ts   # IIT Patna autocomplete list
│   ├── syntheticGcpDemo.ts       # Synthetic GCP demo builder
│   └── academicBlock4PdfContent.ts  # SIH PDF report content
│
├── drizzle/                      # Database schema & migrations
│   ├── schema.ts                 # All PostgreSQL table definitions
│   ├── relations.ts              # Relations (placeholder)
│   ├── meta/                     # Snapshot JSON files
│   ├── migrations/               # Migration files (SQL)
│   ├── postgres/                 # Postgres-specific migration
│   │   ├── 0000_vengeful_wallflower.sql
│   │   └── meta/
│   ├── 0000_famous_nocturne.sql
│   ├── 0001_cloudy_angel.sql
│   └── 0002_needy_golden_guardian.sql
│
├── deployment/                   # Operational handoff docs
│   ├── NEON_POSTGRES_MIGRATION.md
│   ├── ROLE_ASSIGNMENT.md
│   └── VERCEL_DEPLOYMENT.md
│
├── scripts/                      # Node data-import & verification scripts
│   ├── setup-postgis.mjs
│   ├── import-amity-ms-building-footprint.mjs
│   ├── import-amity-osm-reference.mjs
│   ├── import-koramangala-ms-building-footprints.mjs
│   ├── import-koramangala-osm-reference.mjs
│   ├── import-patna-reference-ms-building-footprints.mjs
│   ├── verify-*.mjs              # 14+ E2E verification playwright scripts
│   └── capture-mobile-three-preview.mjs
│
├── research/                     # Research & data-sourcing notes
│   ├── raw/*.json                # Raw Nominatim / mobile data
│   └── *.md                      # 14 research documents (evidence, sources)
│
├── submission/                   # SIH deliverable artifacts
│   ├── sih-project-guide/        # Typst-generated SIH project guide PDF
│   ├── academic-block-4-*.md/json
│   ├── kusum-suresh-enclave-*.md/json
│   └── sih-methodology-evidence-locks.md
│
├── validation/                   # QA / capability audit documents
│   ├── clerk-access-preview.md
│   ├── clerk-entry-route-check.md
│   ├── iit-patna-academic-zone-source-check.md
│   ├── mock-demo-qa.md
│   ├── mock-search-upload-qa.md
│   ├── registry-comparison-qa.md
│   └── ulpin-vpm-capability-audit.md
│
├── skills/evidence-safe-campus-intelligence/SKILL.md
├── patches/wouter@3.7.1.patch    # wouter router patch
├── components.json               # shadcn/ui config
├── drizzle.config.ts             # Drizzle ORM config
├── package.json                  # Dependencies & scripts
├── pnpm-lock.yaml
├── tsconfig.json / tsconfig.node.json
├── vercel.json                   # Vercel routing & build config
├── vite.config.ts                # Vite dev/build config
├── vitest.config.ts              # Vitest test runner config
├── .prettierrc / .prettierignore
├── .gitignore
├── README.md
├── ideas.md / todo.md
└── template.json
```

---

## 3. Technology Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| `react` | ^19.2.1 | UI framework |
| `react-dom` | ^19.2.1 | DOM rendering |
| `typescript` | 5.9.3 | Static typing |
| `vite` | ^7.1.7 | Dev server & build |
| `wouter` | ^3.3.5 | Lightweight router (patched) |
| `tailwindcss` | ^4.1.14 | Utility-first CSS (v4) |
| `@tailwindcss/vite` | ^4.1.3 | Vite Tailwind integration |
| `@radix-ui/react-*` | various | 20+ accessible UI primitives |
| `lucide-react` | ^0.453.0 | Icon library |
| `framer-motion` | ^12.23.22 | Animations & micro-interactions |
| `sonner` | ^2.0.7 | Toast notifications |
| `@clerk/react` | ^6.14.7 | Authentication UI & session |
| `@trpc/client` + `@trpc/react-query` | ^11.6.0 | Typed API client |
| `@tanstack/react-query` | ^5.90.2 | Server state caching |
| `superjson` | ^1.13.3 | JSON transformer (dates, types) |
| `cesium` | ^1.144.0 | 3D globe & GIS visualization |
| `three` | ^0.185.1 | 3D focused building preview |
| `react-hook-form` + `@hookform/resolvers` | ^7.64.0 / ^5.2.2 | Form handling + Zod validation |
| `zod` | ^4.1.12 | Schema validation |
| `jspdf` | ^4.2.1 | PDF generation for exports |
| `recharts` | ^2.15.2 | Chart components (dashboard) |
| `react-day-picker` | ^9.11.1 | Date picker |
| `react-resizable-panels` | ^3.0.6 | Resizable split panes |
| `embla-carousel-react` | ^8.6.0 | Carousel |
| `cmdk` | ^1.1.1 | Command palette |
| `next-themes` | ^0.4.6 | Theme switching (dark/light) |
| `class-variance-authority` | ^0.7.1 | Variant classes for UI |
| `vaul` | ^1.1.2 | Drawer component |

### Backend
| Library | Version | Purpose |
|---|---|---|
| `express` | ^4.21.2 | HTTP server framework |
| `@trpc/server` | ^11.6.0 | Typed RPC server |
| `@clerk/express` | ^2.1.63 | Clerk server-side auth middleware |
| `drizzle-orm` | ^0.44.5 | Type-safe PostgreSQL ORM |
| `pg` | ^8.23.0 | PostgreSQL driver |
| `zod` | ^4.1.12 | Input validation |
| `superjson` | ^1.13.3 | RPC serialization |
| `dotenv` | ^17.2.2 | Env loading |
| `axios` | ^1.12.0 | HTTP client (external APIs) |
| `@aws-sdk/client-s3` + `s3-request-presigner` | ^3.693.0 | S3-compatible storage |
| `jose` | 6.1.0 | JWT / crypto utilities |
| `nanoid` | ^5.1.5 | Unique ID generation |
| `cookie` | ^1.0.2 | Cookie parsing |
| `mysql2` | ^3.15.0 | MySQL driver (legacy/fallback) |
| `streamdown` | ^1.4.0 | Stream-based Markdown rendering |
| `date-fns` | ^4.1.0 | Date utilities |

### Build Tooling
- **esbuild** ^0.25.0 — Server bundle minification
- **drizzle-kit** ^0.31.4 — Migration generation & execution
- **vitest** ^2.1.4 — Test framework
- **prettier** ^3.6.2 — Code formatting
- **tsx** ^4.19.1 — TypeScript execution for dev/scripts
- **vite-plugin-cesium** ^1.2.23 — Cesium asset bundling
- **vite-plugin-manus-runtime** 0.0.59 — Manus AI runtime integration

---

## 4. Frontend Architecture

### Entry & Initialization Chain

**Path:** `client/src/main.tsx`

1. `createRoot()` mounts the app at `#root`
2. **ClerkProvider** wraps everything — provides auth context with custom dark/cyan appearance
3. **ClerkTrpcBridge** (inner component) builds the tRPC client with:
   - `httpBatchLink` to `/api/trpc`
   - Automatic Clerk JWT injection via `Authorization: Bearer ${token}`
   - SuperJSON transformer
   - `credentials: "include"` for cookie-based auth
4. **TanStack QueryClientProvider** — global cache
5. **QueryCache + MutationCache subscriptions** — auto redirect to Clerk sign-in on `UNAUTHED_ERR_MSG`
6. **App** shell renders

### Routing (Wouter)

**Path:** `client/src/App.tsx`

```
/                    → AccessPortal (Clerk sign-in/up)
/overview            → Home (command home & project overview)
/workspace           → SpatialWorkspace (parcels/buildings 3D explorer)
/property-volumes    → PropertyVolumes (3-level evidence ladder)
/ulpin-registry      → UlpInRegistry (source-ID registry)
/synthetic-gcp-demo  → SyntheticGcpDemo
/access              → AccessPortal
/dashboard           → RoleConsole (protected, role-based dashboard)
/profile-settings    → ProfileSettings
/404                 → NotFound
* (wildcard)         → NotFound
```

The app shell wraps all routes in:
- `ErrorBoundary` — error recovery
- `ThemeProvider` — dark/light mode (default: dark, switchable)
- `TooltipProvider` — Radix tooltips
- `Toaster` (Sonner) — toast notifications

### UI Component System

The project includes **60+ reusable UI components** under `client/src/components/ui/`, built on Radix UI primitives following the shadcn/ui pattern:

| Category | Components |
|---|---|
| **Layout** | card, separator, sidebar, resizable, scroll-area, aspect-ratio, collapsible |
| **Forms** | input, textarea, select, checkbox, radio-group, switch, slider, label, field, form, input-group, input-otp, button, button-group, toggle, toggle-group |
| **Feedback** | alert, alert-dialog, dialog, drawer, sheet, popover, tooltip, hover-card, dropdown-menu, context-menu, sonner (toast), skeleton, spinner, progress, empty |
| **Navigation** | tabs, accordion, breadcrumb, navigation-menu, menubar, pagination, command (palette) |
| **Media** | avatar, badge, kbd, calendar, carousel, chart, table |

### Key Feature Components

#### CesiumSpatialViewer.tsx
- **Primary 3D globe** (CesiumJS)
- Props: `command` (imperative: zoom-in/out, focus-site, inspect-footprint, north, fullscreen), `layers` (parcels/buildings/utilities/terrain flags), `focusUlpins`, `sourceMapView` ("2d"|"3d"), `mockFloorLevels`, `sampleAsset`
- Emits: `onFeatureSelect`, `onMockFloorSelect`, `onMockFloorHover`
- Loads Cesium Ion context (OSM 3D buildings)

#### ThreeBuildingPreview.tsx
- **Three.js focused building preview** — selected footprint extruded into an interactive 3D model
- Complements Cesium with a higher-detail single-building view
- Paired with custom CSS: `three-building-preview.css`

#### AIChatBox.tsx
- AI assistant chat interface (uses LLM adapter via tRPC system router)
- Likely wired to `server/_core/llm.ts` → `invokeLLM()`

#### EvidenceLockBadge.tsx
- Visual badge component for the 3-level evidence ladder
- States: `locked`, `public-footprint`, `source-cited`, `verified`
- Shows the current evidence level + required next evidence

#### DashboardLayout.tsx + DashboardLayoutSkeleton.tsx + DashboardWidgetSkeleton.tsx
- Protected dashboard layout with role-gated sections
- Skeleton loaders for perceived performance

### Frontend State Management

- **Server state:** `@tanstack/react-query` via tRPC hooks (all remote data)
- **Local state:** React `useState` / `useReducer` (UI toggle, forms)
- **Persistent (browser-only):** `localStorage` for favorites, annotations, folders, theme
- **Auth state:** Clerk + custom `useAuth()` hook (`client/src/_core/hooks/useAuth.ts`)
- **Theme state:** `ThemeContext` (Context API) with dark/light switchable default

### Styling (Tailwind CSS v4)

- **v4 zero-config approach** via `@tailwindcss/vite` plugin
- Custom CSS in `client/src/index.css`:
  - Dark color scheme ("midnight slate" + "datum cyan" accent `#2ad4d9`)
  - Cadastral/drafting-grid aesthetic
  - Custom component classes: `app-shell`, `sidebar`, `workspace`, `metric-card`, `evidence-dashboard-card`, `access-portal`, `registry-workspace`, `spatial-workspace-shell`, `role-console`

---

## 5. Backend Architecture

### Server Entry Points

| Environment | Entry Point | Purpose |
|---|---|---|
| **Dev** | `server/_core/localServer.ts` | `tsx watch` — starts Express + Vite dev middleware |
| **Prod (Node)** | `server/_core/index.ts` → bundled to `dist/index.js` | Express static server for `dist/public` |
| **Prod (Vercel)** | `api/[...path].ts` → bundled to `api/_server.mjs` | Serverless function: Express + tRPC, routes `/api/*` to tRPC adapter, SPA fallback |

### Express App Composition (`server/_core/localServer.ts`)

```
Express app
├── Clerk Express middleware (session verification)
├── Vite dev middleware (dev only)
├── tRPC Express adapter at /api/trpc
│   └── createContext() → Clerk → app user mapping
├── Static files (dist/public)
└── SPA fallback (* → index.html)
```

### tRPC Context Creation (`server/_core/context.ts`)

The `createContext()` function is the **security boundary**:

1. Extracts Clerk `userId` from the request via `getAuth(req)`
2. If authenticated:
   - Looks up application user in PostgreSQL (`users` table) by `clerkUserId`
   - **First sign-in → auto-creates** user row: `upsertUser()` with default role `citizen` (or `admin` if in `CLERK_BOOTSTRAP_ADMIN_USER_IDS`)
   - **Subsequent sign-in → updates** `lastSignedIn` timestamp
3. Returns `{ req, res, user }` — `user` is `null` if unauthenticated or sync fails

### Procedure Guards (`server/_core/trpc.ts`)

Five procedure types with server-enforced access:

```typescript
publicProcedure          // No auth required
protectedProcedure       // Must be signed in (any role)
authorityProcedure       // Role ∈ {authority, admin}
governmentProcedure      // Role ∈ {government_employee, admin}
adminProcedure           // Role === admin
roleProcedure(roles[])   // Generic role whitelist guard
```

Each uses Zod validation schemas on inputs.

---

## 6. Database Schema

**Path:** `drizzle/schema.ts` — Drizzle ORM definitions for **PostgreSQL (Neon compatible)**.

### PostgreSQL Enums

| Enum | Values |
|---|---|
| `platform_role` | `citizen`, `authority`, `government_employee`, `admin` |
| `verification_status` | `submitted`, `under_review`, `verified`, `rejected` |
| `cadastre_status` | `Verified`, `Review required` |
| `evidence_file_category` | `geojson`, `floorplan` |
| `verification_submission_type` | `geometry`, `height`, `floor_count`, `floor_plan`, `survey` |
| `issue_report_category` | `footprint`, `floor_count`, `location`, `missing_property`, `parcel_boundary` |
| `issue_report_status` | `submitted`, `under_review`, `closed` |

### Tables

#### 1. `users` — Application Users (Clerk-linked)
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `clerkUserId` | varchar(96) UNIQUE NOT NULL | Maps to Clerk user ID |
| `name` | text | |
| `email` | varchar(320) | |
| `loginMethod` | varchar(64) | "clerk" |
| `role` | platform_role | DEFAULT `citizen`, NOT NULL |
| `createdAt` / `updatedAt` | timestamp | DEFAULT now() |
| `lastSignedIn` | timestamp | Updated on each context resolve |

#### 2. `cadastreRecords` — Seeded Vertical Property Records
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `ulpin` | varchar(96) UNIQUE NOT NULL | ULPIN identifier |
| `title` / `parcel` / `building` / `unit` | varchar | Property labels |
| `floor` | integer | |
| `area` / `volume` / `elevation` | varchar(48/80) | Measurements as text (evidence-locked) |
| `status` | cadastre_status | `Verified` / `Review required` |
| `rights` | text | Rights description |
| `evidence` | text | JSON array of evidence refs |
| `createdAt` / `updatedAt` | timestamp | |

#### 3. `evidenceFiles` — Uploaded Evidence Files (GeoJSON / Floor Plans)
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | varchar(160) | Original filename |
| `category` | evidence_file_category | `geojson` / `floorplan` |
| `mimeType` | varchar(120) | |
| `storageKey` / `storageUrl` | varchar(255) / text | S3 storage refs |
| `validationScore` | integer | Validation quality score |
| `validationSummary` | text | Human-readable findings |
| `createdAt` | timestamp | |

#### 4. `verificationSubmissions` — Authority Evidence Workflow
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `recordReference` | varchar(128) | Links to a ULPIN/record |
| `submissionType` | verification_submission_type | 5 categories |
| `sourceUrl` / `sourceReference` | text / varchar(320) | Cited authority source |
| `notes` | text | Submission description |
| `status` | verification_status | DEFAULT `submitted` |
| `submittedByClerkUserId` | varchar(96) | Submitting authority |
| `reviewedByClerkUserId` / `reviewNote` / `reviewedAt` | — | Review trail |
| `createdAt` / `updatedAt` | timestamp | |

#### 5. `issueReports` — Citizen Issue Reports
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `recordReference` | varchar(128) | |
| `category` | issue_report_category | 5 categories (footprint, floor_count, location, etc.) |
| `details` | text | Description |
| `status` | issue_report_status | |
| `reportedByClerkUserId` | varchar(96) | Reporter |
| `createdAt` / `updatedAt` | timestamp | |

#### 6. `auditLogs` — Immutable Security Audit Trail
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `actorClerkUserId` | varchar(96) | Who performed the action |
| `actorRole` | platform_role | Role at time of action |
| `action` | varchar(96) | Action type (e.g., `authoritative_footprint_updated`) |
| `entityType` / `entityId` | varchar(96/128) | Target of the action |
| `oldValue` / `newValue` | text | JSON diffs |
| `createdAt` | timestamp | |

### Migrations

- **Primary (Postgres/Neon):** `drizzle/postgres/0000_vengeful_wallflower.sql` — creates all tables + enums (non-destructive, application-only)
- **Drizzle snapshots:** 3 revisions (`0000`, `0001`, `0002`) in `drizzle/meta/` and `drizzle/postgres/meta/`
- Applied via: `pnpm db:push` → `drizzle-kit generate && drizzle-kit migrate`

---

## 7. Authentication & Role-Based Access Control (RBAC)

### Authentication Flow (Clerk)

```
Browser                            Server
  │                                  │
  ├─ Clerk sign-in ─────────────────►│ Clerk Cloud
  │                                  │  └─ Issues JWT session cookie
  │◄─────────────────────────────────┤
  │
  ├─ tRPC request with Bearer token ─► clerk/express middleware
  │                                  │  └─ getAuth(req) → clerk userId
  │                                  │  └─ createContext() → look up / create app user
  │                                  │  └─ Inject { user } into tRPC ctx
  │◄──── Response (role-gated) ──────┤
```

### Four Server-Assigned Roles

| Role | Assignment | Typical Permissions |
|---|---|---|
| **`citizen`** | Default on first sign-in | View public/source context, submit issue/correction reports |
| **`authority`** | Assigned by Admin | Upload GeoJSON/floorplan evidence, submit verification, review queue, update PostGIS footprints |
| **`government_employee`** | Assigned by Admin | Aggregate dashboard views, gov-level operational summaries (no unrestricted personal data) |
| **`admin`** | Assigned by Admin or `CLERK_BOOTSTRAP_ADMIN_USER_IDS` bootstrap | Role assignment, audit log access, admin settings, all authority + gov permissions |

### Security Rules (Enforced Server-Side)

1. **Role never assigned from frontend.** `ProfileSettings` deliberately has no role selector.
2. **Admins cannot change their own role** — `platform.assignRole` guard in `routers.ts:502-506`
3. **Height extrusion requires a source reference** — Zod `superRefine` validates on `footprintUpdateInput`
4. **Ownership linkage requires source reference** — Same Zod validation
5. **Authority footprint edits require revision notes** — `validateRevisionNote()` shared utility
6. **All sensitive actions write to `auditLogs`** — footprint updates, uploads, role changes, reviews
7. **Bootstrap admin only via env var** — `CLERK_BOOTSTRAP_ADMIN_USER_IDS` comma-separated Clerk IDs

---

## 8. 3D GIS / Visualization Pipeline

### CesiumJS Globe (`CesiumSpatialViewer.tsx`)

- **WGS84 3D globe** with Cesium Ion world imagery and terrain
- Renders PostGIS GeoJSON footprints as styled polygon entities with extrusion
- Layer toggles: parcels, buildings, utilities, terrain
- Camera command system: focus-site, inspect-footprint, zoom-in/out, north, fullscreen
- Mock floor-level visualization on selected buildings
- Sample asset overlay (floor-plan images / GLB models) for evidence preview

### Three.js Focused Preview (`ThreeBuildingPreview.tsx`)

- Single-building detail view using Three.js
- Takes the selected PostGIS footprint polygon → extrudes it to 3D
- Allows interactive orbit / zoom for close inspection

### PostGIS Data Source (`server/postgis.ts`)

```
searchPostgisLayeredArea(query)     → Area/buidling search with counts, area totals
getPostgisFeatureCollection()      → Entire GeoJSON FeatureCollection (polled)
updatePostgisFootprint(ulpin, …)   → Authority-gated geometry/height/ownership update
upsertPostgisGeoJsonFeatures(fc)   → Bulk import of uploaded GeoJSON
```

### Data Sources Imported (see `scripts/`)
- **Microsoft Building Footprints** — Amity University, Koramangala, Patna reference areas
- **OSM reference data** — Amity, Koramangala via Nominatim
- **IIT Patna institutional context** — Academic Block-4 PDF evidence + official sources
- **Kusum Suresh Enclave (Bihar RERA)** — RERA-linked reference endpoint

---

## 9. Evidence Ladder & Data Integrity Model

### Three-Level Evidence Ladder

| Level | Title | Required Evidence | Allowed Output | Locked Until |
|---|---|---|---|---|
| **1** | Source footprint | Public/open/source-backed geometry | Map review, area counts | Always available (base) |
| **2** | Verified height | Authority-verified height + matched footprint | Height extrusion (no floor-unit claims) | Height + source ref supplied |
| **3** | Floor plan / BIM | Official floor plan/BIM + governed review | Floor-by-floor review (no issuance) | Level 2 + floor plan evidence |

Implemented in:
- `client/src/lib/buildingEvidenceLevel.ts` — `resolveBuildingEvidenceLevel(properties)` returns level + locks
- `shared/evidenceLockStatus.ts` — Lock state definitions
- Components: `EvidenceLockBadge.tsx`, `PropertyVolumes.tsx` (visual ladder)

### Hard Integrity Rules (Never Bypassed)

1. **Never invent geometry** from a single endpoint coordinate or AI result
2. **Synthetic GCP data** always marked `DEMO / NON-AUTHORITATIVE`
3. **OSM 3D buildings** = visual context ONLY, never cadastral proof
4. **PDF/CSV exports** always include evidence limitations
5. **ULPIN issuance is fully locked** — 0 issued ULPINs in the prototype
6. **AI-assisted search** only routes to existing source-backed aliases; never fabricates locations

### AI Building Resolution (`postgis.resolveBuilding` mutation)

1. Direct PostGIS match first → if found, return immediately
2. Otherwise, generate lexical candidate aliases from the source catalog
3. Call LLM (`gpt-5-mini`) with strict JSON schema: `{alias, confidence, rationale}`
4. Cross-validate LLM output against `confirmedSourceAlias()` whitelist
5. Re-query PostGIS using the validated alias only
6. Resolution tagged: `direct-source-match` / `ai-assisted-source-alias` / `unavailable`

---

## 10. tRPC API Surface

**Path:** `server/routers.ts` → `appRouter` (5 routers)

### `system.*` — System & Health
From `server/_core/systemRouter.ts` — Manus runtime, debug, health checks.

### `auth.*` — Authentication
| Procedure | Scope | Input | Behavior |
|---|---|---|---|
| `auth.me` | public | — | Returns current app user (or null) |
| `auth.logout` | public | mutation | Client-side logout (success ack) |

### `postgis.*` — Spatial Data
| Procedure | Scope | Input | Behavior |
|---|---|---|---|
| `postgis.geojson` | public | — | Returns all PostGIS footprints as FeatureCollection |
| `postgis.syntheticGcpDemo` | public | — | GCP demo dataset |
| `postgis.areaSearch` | public | `{query}` | Layered 3D area search → building count, area, records |
| `postgis.placeFacts` | public | `{query}` | Aggregated place intelligence + unavailable metrics |
| `postgis.resolveBuilding` | public mutation | `{query}` | Direct + AI-assisted source-backed building resolution |
| `postgis.updateFootprint` | **authority** mutation | FootprintUpdateInput | Update geometry / height / ownership → audit log |

### `cadastre.*` — Vertical Cadastre Records
| Procedure | Scope | Input | Behavior |
|---|---|---|---|
| `cadastre.search` | public mutation | `{query}` | AI semantic search over registered cadastre catalog + fallback |
| `cadastre.upload` | **authority** mutation | `{category,fileName,mimeType,dataBase64}` | Validate → S3 store → AI metadata extract → PostGIS import (if GeoJSON) → evidence file record → audit log |

### `platform.*` — Application Workflows
| Procedure | Scope | Input | Behavior |
|---|---|---|---|
| `platform.dashboardSummary` | protected | — | Records count, pending/reviewed verification counts |
| `platform.reportIssue` | protected mutation | IssueReportInput | Citizen issue report submission |
| `platform.submitEvidence` | **authority** mutation | EvidenceSubmissionInput | Evidence submission for review |
| `platform.verificationQueue` | **authority** | — | List pending review items |
| `platform.reviewEvidence` | **authority** mutation | ReviewSubmissionInput | Approve/reject/start review → audit update |
| `platform.governmentSummary` | **government** | — | Aggregate verification overview |
| `platform.adminSettings` | **admin** | — | Admin-only settings metadata |
| `platform.adminUsers` | **admin** | — | List all platform users with roles |
| `platform.assignRole` | **admin** mutation | `{clerkUserId,role}` | Server-side role assignment (self-blocked) → audit |
| `platform.auditLogs` | **admin** | — | Recent immutable audit logs |

---

## 11. Shared Utilities & Types

**Path:** `shared/` directory.

| Module | Purpose |
|---|---|
| `types.ts` | Central type export (re-exports DB schema via `drizzle/schema.ts`) |
| `const.ts` | Constants: `UNAUTHED_ERR_MSG`, `NOT_ADMIN_ERR_MSG` |
| `cadastre.ts` | `CadastreRecord` type, `INITIAL_CADASTRE_RECORDS` seed data |
| `authorityEditValidation.ts` | `validateRevisionNote()` — min length, normalization, requirements (8+ chars for authority edits) |
| `footprintGeometryEditing.ts` | `getEditablePolygonVertices()`, `replacePolygonVertex()` — GeoJSON polygon helpers |
| `evidenceLockStatus.ts` | Evidence lock state types & helpers |
| `evidenceMapFilter.ts` | Map filter definitions (`all`, `public-footprint`, `height-verified`) |
| `placeExplorer.ts` | Explorer segment config: `PLACE_EXPLORER_SEGMENTS` (parcels / buildings), `SOURCE_BACKED_EXPLORER_SUGGESTIONS`, unavailable metrics list |
| `iitPatnaEvidence.ts` | `IIT_PATNA_OFFICIAL_CONTEXT` — official building records + locked requests |
| `iitPatnaAutocomplete.ts` | `filterIitPatnaAutocomplete()` — IIT Patna-specific autocomplete suggestions |
| `syntheticGcpDemo.ts` | `buildSyntheticGcpDemoResult()` — demo GCP point generator |
| `academicBlock4PdfContent.ts` | `buildAcademicBlock4PdfLines()` — SIH PDF export content for Academic Block-4 |

---

## 12. Build, Deploy & Configuration

### Package Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `pnpm dev` | `NODE_ENV=development tsx watch server/_core/localServer.ts` | Dev server (Express + Vite middleware) |
| `pnpm build` | `vite build && esbuild server/_core/index.ts → dist/ && api/_server.mjs` | Production build: client + server bundle + Vercel serverless bundle |
| `pnpm start` | `NODE_ENV=production node dist/index.js` | Start standalone Express server |
| `pnpm check` | `tsc --noEmit` | TypeScript type-check |
| `pnpm format` | `prettier --write .` | Auto-format code |
| `pnpm test` | `vitest run` | Run full Vitest test suite |
| `pnpm db:push` | `drizzle-kit generate && drizzle-kit migrate` | Generate & apply DB migrations |

### Vite Configuration (`vite.config.ts`)

Key configuration:
- **Root:** `client/` — frontend source root
- **Out:** `dist/public` — built assets
- **Aliases:** `@ → client/src`, `@shared → shared`, `@assets → attached_assets`
- **Env prefixes:** `VITE_` (standard) + `CLERK_PUBLISH_KEY` (legacy alias)
- **Plugins:** React, Tailwind v4, JSX-Loc, Manus runtime, Custom debug collector (writes browser console/network/session logs to `.manus-logs/`)
- **Dev server:** Host-bindable, allowed Manus domains, strict FS mode (`deny: **/.*`)

### Vercel Configuration (`vercel.json`)

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist/public",
  "functions": { "api/[...path].ts": { "maxDuration": 60 } },
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/(.*)", "dest": "/api/[...path].ts" },   // API → serverless
    { "src": "/(.*)", "dest": "/index.html" }              // SPA fallback
  ]
}
```

Build flow for Vercel:
1. `pnpm build` runs `vite build` → `dist/public/` (SPA assets)
2. Same build also bundles `server/_core/index.ts` → `api/_server.mjs` (via esbuild)
3. Vercel serves `dist/public` as static; `/api/*` → serverless function

### TypeScript Configuration (`tsconfig.json`)

- **Strict mode** enabled
- **Target:** ESNext, JSX: preserve (Vite transpiles)
- **Module resolution:** bundler
- **Includes:** `client/src/**/*`, `shared/**/*`, `server/**/*`
- **Excludes:** `*.test.ts`, node_modules, build, dist
- **Path aliases:** `@/*` → `./client/src/*`, `@shared/*` → `./shared/*`

---

## 13. Testing Strategy

**Framework:** Vitest (configured in `vitest.config.ts`)

40+ dedicated test files in `server/`:

| Test File | Coverage Area |
|---|---|
| `platformRbac.test.ts` | Role boundaries (citizen vs authority vs admin forbidden access) |
| `protectedWorkspaceRouting.test.ts` | Route protection redirects |
| `dashboardSettings.authorization.test.ts` | Admin settings access control |
| `vercelApiRouting.test.ts` + `vercelServerlessAdapter.test.ts` | Vercel routing: /api/trpc returns JSON not SPA |
| `clerkCredentials.test.ts` + `clerkPublishableKeyAlias.test.ts` | Clerk key handling (exposure, aliasing) |
| `neonClerkMapping.test.ts` | Clerk ID → app user mapping on first sign-in |
| `auth.logout.test.ts` | Logout flow |
| `postgis.geometry.test.ts` + `postgis.search.integration.test.ts` + `postgis.integration.test.ts` + `postgis.authorization.test.ts` | PostGIS: geometry, search, auth gates |
| `footprintGeometryEditing.test.ts` | Polygon vertex editing utilities |
| `authorityEditValidation.test.ts` | Revision note validation rules |
| `cadastreService.test.ts` | Cadastre search & upload validation |
| `evidenceExtraction.ts` tested via `submissionEvidence.test.ts`, `evidenceLockStatus.test.ts`, `evidenceMapFilter.test.ts` | Evidence workflows, locks, filters |
| `buildingEvidenceLevel.test.ts` + `buildingSearchAliases.test.ts` | Evidence ladder & building alias resolution |
| `placeExplorer.test.ts` + `placeExplorerNavigation.test.ts` + `placeIntelligence.test.ts` | Place explorer & facts |
| `kusumSureshEnclaveEvidence.test.ts` + `kusumGcpTemplate.test.ts` | RERA reference & GCP template |
| `iitPatnaEvidence.test.ts` + `iitPatnaAutocomplete.test.ts` | IIT Patna institutional context & autocomplete |
| `dashboardUsability.test.ts` + `profileSettingsAndSkeleton.test.ts` | Dashboard UX, skeletons, profile settings |
| `syntheticGcpDemo.test.ts` | Synthetic GCP output correctness |
| `ulpinIssuanceGate.test.ts` | ULPIN issuance never proceeds without evidence |
| `analyticsTemplate.test.ts` + `cesiumIonCredential.test.ts` + `cesiumProductionBuild.test.ts` + `debugCollectorProduction.test.ts` | Integrations (analytics, Cesium Ion, build) |
| `verify-*.mjs` (scripts folder) | 14 Playwright-style E2E verification scripts for mobile UI, registry, search, upload, RERA focus, Patna, etc. |

### Quality Commands
```bash
pnpm check      # TypeScript type-check
pnpm test       # Vitest regression suite (all tests)
pnpm build      # Production build validation
```

---

## 14. Key Routes & Pages

| Route | Page Component | Purpose |
|---|---|---|
| `/` | `AccessPortal` in `RoleConsole.tsx` | Clerk-branded sign-in/up card (dark cyan theme), project overview |
| `/access` | `AccessPortal` | Same as `/` with explicit sign-up URL param support |
| `/overview` | `Home.tsx` (~1500 lines) | **Command center:** metrics grid, area search, Cesium 3D overview, IIT Patna institutional evidence card, evidence locks card, AI cadastre search, data ingestion upload, footprint editor dialog, floor volume stack |
| `/workspace` | `SpatialWorkspace.tsx` (~1400 lines) | **3D explorer:** Parcels/Buildings segment switch, Cesium viewer + Three.js preview, 2D/3D toggle, 4 layer toggles, 3-level evidence panel, mock ULPIN generator, PDF export, record comparison (2 records), dossier panel with source facts, vertical review profile, demo role switch, sample asset upload |
| `/workspace?segment=parcels` | `SpatialWorkspace.tsx` | Parcels-focused explorer view |
| `/workspace?segment=buildings` | `SpatialWorkspace.tsx` | Buildings-focused explorer view |
| `/property-volumes` | `PropertyVolumes.tsx` | Vertical evidence ladder visualizer (Level 1→2→3 with gated transitions) |
| `/ulpin-registry` | `UlpInRegistry.tsx` (~1050 lines) | **Source-ID registry:** search, filter, sort, favorites + folders + tags + notes (browser-local), comparison bar (2 records → combined map), CSV export, per-record PDF export, deep-link sharing, ULPIN issue gate panel, detail dialog (metadata + history note + tags + note + favorite folder) |
| `/synthetic-gcp-demo` | `SyntheticGcpDemo.tsx` | GCP (Ground Control Point) synthetic demo page |
| `/dashboard` | `RoleConsole.tsx` (~660 lines) | **Protected dashboard** — role-tailored panels: metrics grid, 3D explorer entry; Citizen: issue report form; Authority: evidence submission form + verification queue review; Government: aggregate GIS summary; Admin: role assignment UI + immutable audit log |
| `/profile-settings` | `ProfileSettings.tsx` | Clerk-managed name editing, secure account-manager link, theme/reduced-motion preferences (no role UI) |
| `/404` | `NotFound.tsx` | 404 page |
| `/component-showcase` | `ComponentShowcase.tsx` | Internal UI gallery (all Radix/shadcn components) |

---

## 15. Scripts & Data Import Pipeline

**Path:** `scripts/` (all `.mjs`, Node ESM)

### Setup Scripts
| Script | Purpose |
|---|---|
| `setup-postgis.mjs` | Provisions PostGIS extensions, tables, spatial indexes on a PostgreSQL database |

### Data Import Scripts (MS Building Footprints + OSM)
| Script | Target Area | Source |
|---|---|---|
| `import-amity-ms-building-footprint.mjs` | Amity University Patna | Microsoft Building Footprints |
| `import-amity-osm-reference.mjs` | Amity University Patna | OpenStreetMap / Nominatim |
| `import-koramangala-ms-building-footprints.mjs` | Koramangala, Bangalore | Microsoft Building Footprints |
| `import-koramangala-osm-reference.mjs` | Koramangala, Bangalore | OpenStreetMap / Nominatim |
| `import-patna-reference-ms-building-footprints.mjs` | Patna reference area | Microsoft Building Footprints |

### Verification Scripts (E2E / Playwright-style)
14 scripts for UI, mobile, and validation checks including:
- Mobile: Three.js preview, Patna search, authority editor, Cesium visual context, edit-note guard, property action dock
- Desktop: IIT Patna autocomplete, RERA endpoint focus, Academic Block-4 PDF export
- General: mobile browser viewport setup, screenshot capture

Typical pattern: `verify-*.mjs` → sets up DOM/MCP browser → navigates → asserts state → passes

---

## 16. Environment Variables

| Variable | Exposure | Required | Purpose |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Public** (Vite build) | Yes | Clerk React components (browser) |
| `CLERK_PUBLISH_KEY` | **Public** (alias) | Optional | Legacy Vercel alias for above |
| `CLERK_SECRET_KEY` | **Server secret** | Yes | Clerk Express session verification |
| `POSTGIS_DATABASE_URL` | **Server secret** | Yes | Neon/PostgreSQL connection (application tables + PostGIS) |
| `DATABASE_URL` | **Server secret** | Optional | Fallback/legacy DB URL |
| `POSTGIS_API_KEY` | **Server secret** | Optional | Protects PostGIS GeoJSON endpoint |
| `VITE_CESIUM_ION_ACCESS_TOKEN` | **Public** (Vite build) | Recommended | Cesium Ion 3D buildings/imagery |
| `CLERK_BOOTSTRAP_ADMIN_USER_IDS` | **Server secret** | Optional | Comma-separated Clerk IDs → first Admin(s) |
| `NODE_ENV` | Server runtime | Auto | `development`/`production` |
| `PORT` | Server runtime | Auto | Standalone server port (default 3000) |

For S3 storage and AI services: additional AWS / LLM env vars are consumed by adapters.

---

## 17. Research, Submission & Validation Artifacts

### Research (`research/`) — 14 Documents
Data-sourcing audits and validation notes covering:
- Bhumap pattern review, Bihar land records availability, Bihar RERA Kusum Suresh Enclave
- Amity campus footprint sources, Patna reference expansion
- IIT Patna: 3D evidence, official building evidence, academic-zone source checks
- Cesium: highlight/edit note validation, visual context validation
- Height edit layered area verification, authority edit note validation

**Raw data:** `research/raw/mobile-patna-verification.json`, `nit-patna-nominatim.json`

### Submission (`submission/`) — SIH Deliverables
| File | Purpose |
|---|---|
| `sih-project-guide/main.pdf` + `main.typ` | Typst-generated SIH Project Guide (full report) |
| `academic-block-4-evidence-report.md` + `academic-block-4-institutional-evidence.json` | IIT Patna Academic Block-4 evidence package |
| `kusum-suresh-enclave-gcp-instructions.md` + `kusum-suresh-enclave-gcp-template.json` + `kusum-suresh-enclave-rera-evidence.json` | Bihar RERA reference + GCP data |
| `sih-methodology-evidence-locks.md` | Methodology document for evidence-lock approach |

### Validation (`validation/`) — 7 QA Documents
| File | Purpose |
|---|---|
| `ulpin-vpm-capability-audit.md` | **Primary capability audit:** verified / demo-only / authority-pending boundaries |
| `clerk-access-preview.md` + `clerk-entry-route-check.md` | Clerk sign-in & route validation records |
| `iit-patna-academic-zone-source-check.md` | IIT Patna source attribution audit |
| `mock-demo-qa.md` | Demo script QA |
| `mock-search-upload-qa.md` | Search + upload QA checklist |
| `registry-comparison-qa.md` | ULPIN Registry comparison feature QA |

---

## Summary

This project is a **production-grade, architecturally sound prototype** for 3D ULPIN generation and vertical property mapping. Key design decisions:

1. **Server-enforced RBAC** — roles never trusted from the client; every sensitive mutation has a Zod schema + procedure guard + audit log.
2. **Evidence-first design** — explicit 3-level ladder with hard locks; never infer legal/ownership data from geometry alone.
3. **AI with guardrails** — LLM outputs are constrained by JSON schema, cross-validated against whitelist source aliases, and always routed back to real PostGIS data.
4. **Type-safe full-stack** — tRPC + shared Zod schemas give compile-time contract between frontend and backend with zero codegen step.
5. **PostGIS for truth** — all spatial geometry comes from the database; Cesium only renders what PostGIS provides (with clear provenance tags).
6. **Vercel + Vercel Functions deployment** ready with 60s max duration for PostGIS heavy operations; standalone Node option also supported.
7. **Comprehensive testing** — ~55 Vitest + 14 verification scripts covering RBAC, routing, Clerk, PostGIS, evidence, mobile UI, export, and ULPIN gates.

The codebase is ready for further authority integration, legal record linkage, surveyed GCP ingestion, and production RERA/DoLR API integrations.
