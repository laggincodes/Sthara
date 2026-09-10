# Context: 3D ULPIN-VPM Dashboard (SIH-2026)

> Quick Reference Cheat-Sheet for the codebase

---

## Quick Facts

| Property | Value |
|---|---|
| **Project Name** | ulpin-vpm-dashboard |
| **Version** | 1.0.0 |
| **License** | MIT |
| **SIH Problem** | Department of Land Resources — 3D ULPIN + Vertical Property Mapping |
| **Package Manager** | pnpm 10.x |
| **Type System** | TypeScript 5.9 (strict) |
| **Language** | Hinglish + English comments |

---

## 3-Sentence Elevator Pitch

A full-stack **evidence-safe 3D cadastre prototype** — source-aware 3D property review, vertical-cadastre workflows, and authority-gated data verification. Uses **CesiumJS + Three.js** for 3D visualization, **PostGIS** for spatial truth, **Clerk** for identity, and **tRPC + Drizzle** for type-safe APIs. A 3-level evidence ladder (footprint → verified height → floor-plan/BIM) prevents inferring legal data from geometry alone.

---

## Architecture in One Glance

```
┌──────────────────────────────────────────────────────┐
│  CLIENT (React 19 · Vite · Tailwind v4 · Wouter)     │
│  ├─ CesiumJS — 3D Globe (PostGIS footprints)        │
│  ├─ Three.js — Single Building Preview              │
│  ├─ Clerk React — Sign-in / Profile / Session       │
│  └─ tRPC Client + TanStack Query — typed API calls  │
└────────────────────────┬─────────────────────────────┘
                         │ /api/trpc (SuperJSON)
                         ▼
┌──────────────────────────────────────────────────────┐
│  SERVER (Node · Express · tRPC · Zod)                │
│  ├─ Clerk Express Middleware — session verification  │
│  ├─ Procedure Guards: public/protected/authority/    │
│  │                     government/admin              │
│  ├─ PostGIS Service: search/update/import GeoJSON    │
│  ├─ LLM Adapter: AI search + building resolution     │
│  ├─ S3 Storage: evidence files (GeoJSON/floorplan)   │
│  └─ Audit: every sensitive action → auditLogs table  │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  DATA (PostgreSQL · Neon · Drizzle ORM + PostGIS)    │
│  ├─ users — Clerk ID + server-assigned role          │
│  ├─ cadastreRecords — seed vertical property data    │
│  ├─ evidenceFiles — uploaded files + validation      │
│  ├─ verificationSubmissions — authority review queue │
│  ├─ issueReports — citizen correction reports       │
│  └─ auditLogs — immutable security trail             │
└──────────────────────────────────────────────────────┘
```

---

## Tech Stack Cheat Sheet

| Layer | Choice | Key Version |
|---|---|---|
| **Frontend Framework** | React | ^19.2.1 |
| **Bundler / Dev Server** | Vite | ^7.1.7 |
| **Router** | Wouter (patched 3.7.1) | ^3.3.5 |
| **CSS** | Tailwind CSS v4 + Radix UI | ^4.1.14 |
| **Animations** | Framer Motion | ^12.23.22 |
| **Icons** | Lucide React | ^0.453.0 |
| **Toasts** | Sonner | ^2.0.7 |
| **Forms** | React Hook Form + Zod Resolvers | ^7.64.0 / ^5.2.2 |
| **Validation (All Layers)** | Zod | ^4.1.12 |
| **3D Globe** | CesiumJS | ^1.144.0 |
| **3D Detail Preview** | Three.js | ^0.185.1 |
| **Auth (Identity)** | Clerk (React + Express) | ^6.14.7 / ^2.1.63 |
| **API Layer** | tRPC v11 + SuperJSON | ^11.6.0 |
| **Server State Cache** | TanStack Query v5 | ^5.90.2 |
| **Web Server** | Express | ^4.21.2 |
| **Database** | PostgreSQL / Neon + PostGIS | — |
| **ORM** | Drizzle ORM | ^0.44.5 |
| **PG Driver** | node-postgres (`pg`) | ^8.23.0 |
| **Storage** | AWS S3 SDK (S3-compatible) | ^3.693.0 |
| **PDF Export** | jsPDF | ^4.2.1 |
| **LLM Adapter** | Custom invokeLLM() | gpt-5-mini |
| **Test Runner** | Vitest | ^2.1.4 |
| **Deploy Target** | Vercel (static + serverless fn) | — |
| **Formatting** | Prettier | ^3.6.2 |
| **Server Bundle** | esbuild | ^0.25.0 |

---

## Folder Map (The Important Ones)

```
d:\SIH-2026\
├── client/src/
│   ├── pages/              ← Route-level components (9 pages)
│   │   ├── Home.tsx               — Command home / overview (1500 lines)
│   │   ├── SpatialWorkspace.tsx   — 3D Parcels/Buildings explorer
│   │   ├── UlpInRegistry.tsx      — Source-ID registry + exports
│   │   └── RoleConsole.tsx        — Role-tailored protected dashboard
│   ├── components/
│   │   ├── CesiumSpatialViewer.tsx  — 3D globe
│   │   ├── ThreeBuildingPreview.tsx — 3D building detail
│   │   ├── EvidenceLockBadge.tsx    — Ladder level indicator
│   │   └── ui/ (60 shadcn/Radix components)
│   ├── lib/buildingEvidenceLevel.ts — 3-level ladder resolver
│   ├── contexts/ThemeContext.tsx   — Dark/Light theme
│   └── _core/hooks/useAuth.ts      — Auth wrapper hook
├── server/
│   ├── routers.ts              ← appRouter: auth/postgis/cadastre/platform
│   ├── postgis.ts              ← GeoJSON search/update/import
│   ├── cadastreService.ts      ← Cadastre search + upload validation
│   ├── db.ts                   ← Drizzle + pg CRUD helpers
│   ├── _core/
│   │   ├── trpc.ts             — 5 procedure guards (public→admin)
│   │   ├── context.ts          — Clerk→app user mapping (the security boundary)
│   │   ├── llm.ts              — invokeLLM adapter
│   │   └── localServer.ts      — Dev server entry
│   └── *.test.ts (40+ files)   ← Vitest integration tests
├── shared/                    ← Cross-cutting types, validators, seed data
│   ├── types.ts               — DB schema type re-exports
│   ├── const.ts               — Error messages (UNAUTHED, NOT_ADMIN)
│   ├── authorityEditValidation.ts — Revision note validation
│   ├── evidenceLockStatus.ts  — Lock state types
│   └── iitPatnaEvidence.ts    — IIT Patna institutional context
├── drizzle/
│   ├── schema.ts              ← ALL 7 tables + 7 Postgres enums
│   ├── postgres/0000_vengeful_wallflower.sql — Initial migration
│   └── meta/ (3 snapshots)
├── scripts/                   ← 20 Node scripts: import + verify E2E
├── deployment/                ← 3 handoff docs (Neon, Roles, Vercel)
├── research/                  ← 14 sourcing research notes (raw JSON + MD)
├── submission/                ← SIH deliverables: Typst PDF + JSON evidence
├── validation/                ← 7 QA docs + capability audit
└── [configs]                  — package.json, vite.config.ts, vercel.json,
                                 tsconfig.json, vitest.config.ts, drizzle.config.ts
```

---

## Database Tables (7 Core Tables)

| Table | Key Columns | Purpose |
|---|---|---|
| **users** | `clerkUserId` (unique), `role`: platform_role, `name`, `email`, `lastSignedIn` | Clerk-linked app users + server-assigned role |
| **cadastreRecords** | `ulpin` (unique), `title`, `parcel`, `building`, `unit`, `floor`, `area`, `volume`, `elevation`, `status`, `rights`, `evidence` | Seed vertical property records (catalog search) |
| **evidenceFiles** | `name`, `category`: geojson/floorplan, `storageKey`, `storageUrl`, `validationScore`, `validationSummary` | Uploaded evidence file registry (S3 links) |
| **verificationSubmissions** | `recordReference`, `submissionType` (5 types), `sourceReference`, `status`, `submittedBy*`, `reviewedBy*`, `reviewNote` | Authority evidence queue (submitted→under_review→verified/rejected) |
| **issueReports** | `recordReference`, `category` (5 types), `details`, `status`, `reportedBy*` | Citizen correction/issue reports |
| **auditLogs** | `actorClerkUserId`, `actorRole`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `createdAt` | **Immutable** trail for every sensitive operation |

### 4 Roles (Enum: `platform_role`)

```
citizen ──────────► Default. View public + submit issues.
   │
   ▼
authority ────────► Submit evidence, review queue, edit PostGIS footprints.
   │
   ▼
government_employee  Aggregate/GIS operational views only.
   │
   ▼
admin ────────────► Role assignment + audit logs + all higher perms.
                      ⚠ Self-role-change BLOCKED in code
```

---

## tRPC API Surface (Quick Reference)

### Public (No Auth)
```
auth.me                → Current user (null if not signed in)
auth.logout            → Client logout ack
postgis.geojson        → Entire PostGIS FeatureCollection (polled every 20s)
postgis.syntheticGcpDemo → Demo GCP dataset
postgis.areaSearch(q)  → Building count + area + matched records
postgis.placeFacts(q)  → Aggregated place intelligence
postgis.resolveBuilding(q)  →  Direct match → AI alias (gpt-5-mini) → validated PostGIS re-query
cadastre.search(q)     → AI semantic search over cadastre catalog (fallback lexical)
```

### Protected (Signed In, Any Role)
```
platform.dashboardSummary    → Records count + pending/reviewed verification
platform.reportIssue         → Submit issue report (footprint/floor/location/etc)
```

### Authority-Only (role ∈ {authority, admin})
```
postgis.updateFootprint → Edit geometry/height/ownership → WRITES AUDIT LOG
cadastre.upload        → GeoJSON/floorplan: validate → S3 → AI metadata extract → PostGIS import → evidenceFiles row → audit log
platform.submitEvidence → Add to verification queue
platform.verificationQueue → List pending
platform.reviewEvidence   → Start / Verify / Reject submission
```

### Government-Only (role ∈ {government_employee, admin})
```
platform.governmentSummary → Aggregate verification statistics
```

### Admin-Only (role === admin)
```
platform.adminSettings → Meta: sections list, note
platform.adminUsers    → User list (Clerk ID + name + role)
platform.assignRole    → Change another user's role (self-blocked)
platform.auditLogs     → Recent immutable audit trail
```

---

## 3-Level Evidence Ladder (Hard Data Integrity Rules)

```
LEVEL 1 ═══ Source Footprint ═══
  Required: Public/open/source-backed geometry only
  Output:   Map review + area counts
  Always available ✓

LEVEL 2 ═══ Verified Height ═══
  Required: Authority-verified height + matched footprint
            ⚠ heightSource REQUIRED (Zod superRefine)
  Output:   Height extrusion (3D building)
  Locked until height + source present

LEVEL 3 ═══ Floor Plan / BIM ═══
  Required: Official floor plan / BIM + reconciled geometry
  Output:   Floor-by-floor review / vertical ULPIN review
  Locked until Level 2 + plan evidence present

ALWAYS LOCKED ═══ ULPIN Issuance ═══
  Required (all): Exact authoritative footprint →
                   Reviewed metre-height →
                   Approved floor-plan/BIM →
                   Vertical-property registration evidence
  UI: 0 issued ULPINs counter in registry
```

**AI Never Invents:**
- AI search only matches existing catalog aliases
- JSON schema strict mode on every LLM call
- Output always re-queried against live PostGIS (never rendered directly)

---

## All Routes

| Route | Page | Access |
|---|---|---|
| `/` | AccessPortal (Clerk Sign-In/Up) | Public |
| `/access` | AccessPortal | Public |
| `/overview` | Home (Command Center) | Mostly public + gated widgets |
| `/workspace` | SpatialWorkspace (3D Explorer) | Public + role-gated features |
| `/workspace?segment=parcels` | Parcels-focused workspace | — |
| `/workspace?segment=buildings` | Buildings-focused workspace | — |
| `/property-volumes` | PropertyVolumes (Evidence Ladder) | Public |
| `/ulpin-registry` | UlpInRegistry (Source Registry + Export) | Public |
| `/synthetic-gcp-demo` | SyntheticGcpDemo | Public |
| `/dashboard` | RoleConsole (Protected Dashboard) | **Protected** — role-tailored UI |
| `/profile-settings` | ProfileSettings | **Protected** — Clerk-managed only |
| `/404` + wildcard | NotFound | Public |

---

## Scripts & Commands

```bash
# 🚀 Local Development
pnpm install            # Install deps (pnpm 10.x)
pnpm dev                # Start dev server: Express + Vite middleware (tsx watch)
                        # Default: http://localhost:3000

# ✅ Quality
pnpm check              # TypeScript strict check (tsc --noEmit)
pnpm test               # Run full Vitest suite (55+ tests)
pnpm format             # Prettier write everything

# 📦 Production Build
pnpm build              # 3 outputs:
                        # 1) dist/public  — Vite SPA build
                        # 2) dist/index.js — Standalone Express bundle
                        # 3) api/_server.mjs — Vercel serverless bundle

# 🗄 Database
pnpm db:push            # Drizzle: generate new migration + apply

# 🚀 Production Run (Standalone Node)
pnpm start              # NODE_ENV=production node dist/index.js
```

---

## Environment Variables Checklist

| Name | Public? | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ Public | Clerk browser components |
| `CLERK_PUBLISH_KEY` | ✅ Public | Legacy alias (Vercel migration) |
| `VITE_CESIUM_ION_ACCESS_TOKEN` | ✅ Public | Cesium Ion 3D buildings / imagery |
| — | — | — |
| `CLERK_SECRET_KEY` | 🔒 Secret | Clerk Express session verification |
| `POSTGIS_DATABASE_URL` | 🔒 Secret | PostgreSQL/Neon connection string (app + PostGIS) |
| `DATABASE_URL` | 🔒 Secret | Fallback / legacy DB URL |
| `POSTGIS_API_KEY` | 🔒 Secret | PostGIS endpoint protection |
| `CLERK_BOOTSTRAP_ADMIN_USER_IDS` | 🔒 Secret | Comma-separated Clerk IDs → initial Admin(s) |

---

## Testing Surface

| Scope | Count | Location |
|---|---|---|
| **Vitest unit/integration tests** | 55+ files | `server/*.test.ts` |
| **Playwright-style E2E verification scripts** | 14 files | `scripts/verify-*.mjs` |
| **Data import scripts** | 5 areas | `scripts/import-*.mjs` (MS Footprints + OSM) |
| **PostGIS setup script** | 1 | `scripts/setup-postgis.mjs` |
| **Research documents** | 14 + raw JSON | `research/` |
| **Validation / QA docs** | 7 | `validation/` |
| **SIH Submission artifacts** | Typst PDF + 4 JSON/MD | `submission/` |
| **Deployment handoff docs** | 3 | `deployment/` |

---

## Key Security Guarantees (Server-Enforced)

1. ✅ **All roles from PostgreSQL**, NEVER from frontend. Clerk identity only.
2. ✅ **Admin self-role change BLOCKED** (`routers.ts:502`)
3. ✅ **Height requires source reference** (Zod superRefine)
4. ✅ **Ownership link requires source reference** (Zod superRefine)
5. ✅ **Authority footprint edits require revision note** (`validateRevisionNote` > 8 chars)
6. ✅ **Every sensitive write → `auditLogs` INSERT**
7. ✅ **Bootstrap admin ONLY via env var** — UI has zero role-setting for users
8. ✅ **AI output never trusted raw** → JSON schema → whitelist alias → PostGIS re-query
9. ✅ **ULPIN issuance UI-gated to 0** until all 4 evidence criteria met
10. ✅ **Personal tags/favorites/notes → localStorage ONLY** — never synced server-side

---

## Key Files To Open First (When Working On This Repo)

1. [package.json](file:///d:/SIH-2026/package.json) — Dependencies + scripts
2. [README.md](file:///d:/SIH-2026/README.md) — Authoritative overview
3. [client/src/App.tsx](file:///d:/SIH-2026/client/src/App.tsx) — Route map
4. [client/src/main.tsx](file:///d:/SIH-2026/client/src/main.tsx) — Provider tree (Clerk+tRPC+TanStack)
5. [server/routers.ts](file:///d:/SIH-2026/server/routers.ts) — **ALL API procedures** (5 routers)
6. [server/_core/trpc.ts](file:///d:/SIH-2026/server/_core/trpc.ts) — 5 procedure guards
7. [server/_core/context.ts](file:///d:/SIH-2026/server/_core/context.ts) — **Security boundary** (Clerk → app user mapping)
8. [drizzle/schema.ts](file:///d:/SIH-2026/drizzle/schema.ts) — Full DB schema
9. [client/src/pages/Home.tsx](file:///d:/SIH-2026/client/src/pages/Home.tsx) — Main UI example (1500 lines)
10. [vercel.json](file:///d:/SIH-2026/vercel.json) + [vite.config.ts](file:///d:/SIH-2026/vite.config.ts) — Deploy/build configs

---

## Useful Code References

| Find This | Go Here |
|---|---|
| 3D evidence level resolver | `client/src/lib/buildingEvidenceLevel.ts` |
| Revision note validation | `shared/authorityEditValidation.ts` → `validateRevisionNote()` |
| tRPC client setup | `client/src/main.tsx` + `client/src/lib/trpc.ts` |
| Auth hook (Clerk bridge) | `client/src/_core/hooks/useAuth.ts` |
| PostGIS geometry ops | `server/postgis.ts` |
| Evidence file upload flow | `server/routers.ts:381-449` (`cadastre.upload`) |
| Footprint edit audit | `server/routers.ts:296-315` (`postgis.updateFootprint`) |
| AI building resolution | `server/routers.ts:192-295` (`postgis.resolveBuilding`) |
| Admin role assignment | `server/routers.ts:499-513` (`platform.assignRole`) |
| Initial Postgres migration | `drizzle/postgres/0000_vengeful_wallflower.sql` |
| UI components library | `client/src/components/ui/` (60 files) |
| SIH PDF report content | `shared/academicBlock4PdfContent.ts` |
| IIT Patna context data | `shared/iitPatnaEvidence.ts` |
| ULPIN Registry exports (CSV+PDF) | `client/src/pages/UlpInRegistry.tsx` (lines 296-410) |

---

*Auto-generated codebase context document. For the full ~60KB detailed analysis, see sibling file `content.md`.*
