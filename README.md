# 3D ULPIN-VPM

> **3D ULPIN Generation and Vertical Property Mapping System** — an evidence-safe prototype for source-aware 3D property review, vertical-cadastre workflows, and authority-gated data verification.

This project was developed as a prototype aligned with the **Department of Land Resources** problem direction for 3D ULPIN and vertical property mapping. It brings together a React dashboard, Cesium 3D visualization, PostGIS source geometry, Clerk authentication, backend-enforced roles, audit workflows, and evidence locks.

**Important:** The application is a demonstration and review platform. It does **not** issue a government ULPIN, certify ownership, infer a legal parcel boundary, or claim surveyed height/floor/rights data when the required authority evidence is absent. See the [capability audit](validation/ulpin-vpm-capability-audit.md) for the current verified, demo-only, and authority-pending boundaries.

## What the Project Demonstrates

| Capability               | Current behavior                                                                                                     | Evidence-safe boundary                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Source-aware 3D map      | Cesium renders source-backed footprints, layers, focus controls, and public 3D visual context.                       | Visual context is not treated as cadastral ownership or legal geometry.             |
| Vertical evidence ladder | The interface distinguishes Level 1 footprint, Level 2 verified-height extrusion, and Level 3 floor-plan/BIM review. | A higher level remains locked until its required evidence is available.             |
| Property discovery       | Parcels, Buildings, and ULPIN Registry provide source-record discovery, filtering, map focus, and safe exports.      | A source record is not automatically an issued vertical ULPIN.                      |
| Evidence intake          | GeoJSON/floor-plan workflow, issue reports, and verification submissions are available for review.                   | Uploaded or AI-assisted material remains non-authoritative pending review.          |
| Identity and roles       | Clerk manages identity and sessions; the backend maps Clerk IDs to application roles.                                | Users cannot grant themselves a role from the browser.                              |
| Reporting                | CSV and PDF exports retain source/evidence limitations and measurement disclaimers.                                  | Approximate visual measurements are not survey, legal, or engineering measurements. |

## Architecture

```text
Browser
  └─ React 19 + TypeScript + Vite + Tailwind/Radix UI
       ├─ CesiumJS 3D globe + Three.js focused preview
       ├─ Clerk React components for sign-in, profile, and session state
       └─ tRPC client + TanStack Query for typed protected data requests

Vercel / Node API
  └─ Express + Clerk middleware + tRPC router
       ├─ Server-enforced protected/admin procedures
       ├─ PostGIS GeoJSON endpoint protected by API key
       ├─ Audit, issue-report, and verification workflows
       └─ Storage/AI adapters where a portable provider is configured

Data
  ├─ Neon PostgreSQL + Drizzle ORM: app users, roles, submissions, audit logs
  └─ PostGIS source feed: source-backed spatial footprints / GeoJSON
```

React provides the component UI, while Vite provides the local development and optimized production build workflow.[1] [2] CesiumJS supplies the high-precision WGS84 3D globe and geospatial visualization capabilities.[3] PostGIS is used for spatial objects and GIS operations within PostgreSQL.[4]

## Technology Stack

| Area                     | Technologies used                                       | Purpose                                                                                             |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frontend                 | React 19, TypeScript, Vite, Wouter                      | Responsive SPA pages, typed UI, routing, and production assets.                                     |
| UI system                | Tailwind CSS, Radix UI, Lucide, Framer Motion           | Accessible controls, dialogs, inputs, icons, focused motion, and skeleton loading states.           |
| 3D/GIS                   | CesiumJS, Three.js, Cesium ion context, PostGIS GeoJSON | Source footprint visualization, layers, camera controls, 3D context, and selected-geometry preview. |
| Backend                  | Node.js, Express, tRPC, Zod                             | Typed APIs, validation, protected procedures, and server-side business rules.                       |
| Authentication           | Clerk React, Clerk Express                              | Password/session/recovery handling and verified server authentication context.                      |
| Application database     | Neon PostgreSQL, `pg`, Drizzle ORM                      | Clerk-linked application users, server-assigned roles, submissions, issue reports, and audit logs.  |
| Storage and AI workflows | Existing storage/AI adapters                            | Evidence-file and AI-assisted workflows where a configured runtime provider is available.           |
| Testing and quality      | Vitest, TypeScript checks, Vite/esbuild build           | Regression tests, static typing, and production-build validation.                                   |
| Hosting                  | Vercel static assets + Node serverless function         | Public SPA delivery and the Express/tRPC API adapter.                                               |

## User Roles and Access Control

Clerk is used only for identity, passwords, session recovery, and account security. The application database stores the **Clerk user ID** and a **server-assigned role**; it does not store user passwords.

| Role                  | Assignment                                                                    | Typical permitted workflow                                                   |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `citizen`             | Default when a new Clerk account is first mapped on the backend.              | View public/source context and submit correction/issue reports.              |
| `authority`           | Assigned by an existing Administrator through a protected backend action.     | Use authority evidence/review workflows.                                     |
| `government_employee` | Assigned by an existing Administrator through a protected backend action.     | Access government/aggregate operational views.                               |
| `admin`               | Assigned by an existing Administrator or server-only bootstrap configuration. | Manage roles, access protected settings, and review audit-oriented controls. |

> **Security rule:** Profile Settings can update Clerk-managed personal information and browser-local preferences only. It deliberately has no role selector, and the server remains the source of truth for authorization.

For the initial Administrator only, configure the server-side `CLERK_BOOTSTRAP_ADMIN_USER_IDS` value with the appropriate Clerk user ID. Do not expose this value to the browser or commit it to Git.

## Evidence Ladder and Data Integrity

The project uses three clearly separated stages:

| Evidence level                 | Required evidence                                                  | Allowed output                                                                                        |
| ------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Level 1 — Source footprint** | Public/open/source-backed footprint or geometry.                   | Source-aware map review, visual context, and available area/count information.                        |
| **Level 2 — Verified height**  | Authority-verified height plus a defensible matched footprint.     | Height extrusion; no automatic ownership, floor-unit, or vertical-right claim.                        |
| **Level 3 — Floor plan/BIM**   | Official floor plan/BIM, reconciled geometry, and governed review. | Authority review of floor-by-floor/vertical-property information; official issuance remains external. |

The application retains explicit locks when information is unavailable. For example, a single endpoint coordinate is not converted into a polygon, synthetic GCP data remains **DEMO / NON-AUTHORITATIVE**, and OSM 3D buildings remain visual context rather than cadastral proof.

## Major Workspaces

| Route or workspace             | Purpose                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/` and `/access`              | Branded Clerk secure-access portal.                                                                               |
| `/dashboard`                   | Protected role-specific dashboard; it includes loading skeletons while summary data is fetched.                   |
| `/profile-settings`            | Clerk-managed name editing, secure account-manager entry, and device-local appearance/reduced-motion preferences. |
| `/overview`                    | Public command home and project overview.                                                                         |
| `/workspace?segment=parcels`   | Source-aware parcel/footprint exploration.                                                                        |
| `/workspace?segment=buildings` | Source-aware building/place discovery and 3D context.                                                             |
| `/ulpin-registry`              | Source-record registry, evidence status, map focus, detail reporting, and safe CSV/PDF exports.                   |

## Local Development

### Prerequisites

Use Node.js, `pnpm`, and valid development environment values for Clerk, database, PostGIS, and Cesium. Never commit `.env` files or secret values.

```bash
pnpm install
pnpm dev
```

The principal quality commands are:

```bash
pnpm check       # TypeScript validation
pnpm test        # Vitest regression suite
pnpm build       # Vite frontend + Node/Express server bundles
```

## Database Setup

The application workflow schema is PostgreSQL/Neon compatible and includes Clerk-linked `users`, `cadastreRecords`, `evidenceFiles`, `verificationSubmissions`, `issueReports`, and `auditLogs` tables. The initial non-destructive migration is located at:

```text
drizzle/postgres/0000_vengeful_wallflower.sql
```

Apply it only to the Neon database configured for the application profile/role workflow. The migration is designed to create application tables and enums; it does not alter existing spatial source tables. See [Neon PostgreSQL migration notes](deployment/NEON_POSTGRES_MIGRATION.md).

## Vercel Deployment

The repository includes a Vercel Node serverless entry at `api/[...path].ts`. Static frontend assets build into `dist/public`, while `/api/*` is explicitly routed to the serverless Express/tRPC API before the SPA fallback.

| Environment variable             | Exposure               | Purpose                                                        |
| -------------------------------- | ---------------------- | -------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`     | Public build variable  | Loads Clerk browser components.                                |
| `CLERK_SECRET_KEY`               | Server secret          | Verifies Clerk sessions in Express.                            |
| `POSTGIS_DATABASE_URL`           | Server secret          | Connects to source-backed PostGIS geometry.                    |
| `POSTGIS_API_KEY`                | Server secret          | Protects the PostGIS GeoJSON route.                            |
| `VITE_CESIUM_ION_ACCESS_TOKEN`   | Public build variable  | Enables Cesium visual context services.                        |
| `DATABASE_URL`                   | Server secret          | Legacy/runtime configuration where required by the deployment. |
| `CLERK_BOOTSTRAP_ADMIN_USER_IDS` | Optional server secret | Safely provisions the first Administrator.                     |

Add the final Vercel domain and preview URL pattern to Clerk’s allowed origins and redirect configuration before production sign-in. Vercel Functions run server-side code without requiring you to manage servers.[5] For exact routing, environment, and portability guidance, read [Vercel deployment handoff](deployment/VERCEL_DEPLOYMENT.md).

### Vercel portability limitation

Manus built-in Forge AI and storage services are not automatically available in Vercel. A provider-owned LLM integration and object-storage adapter are required before claiming complete Vercel parity for AI extraction/search and evidence-file storage. Do not copy Manus-internal credentials to Vercel.

## Testing and Verification

The project has focused Vitest coverage for role boundaries, Vercel routing, Clerk key handling, Neon profile mapping, workspace routing, profile settings, and skeleton loading states. Before a release, run TypeScript checks and the production build. For a live Vercel deployment, verify the following:

1. The root route shows the Clerk access portal when signed out.
2. `/api/trpc/auth.me` returns tRPC JSON, not SPA HTML.
3. A new user receives the backend default Citizen profile.
4. Citizen and Authority users receive a forbidden result from admin-only settings APIs.
5. An Administrator can access admin-only workflow only through a server-verified role.
6. Parcels, Buildings, Command Home, and ULPIN Registry open their intended destinations without redirect loops.

## Project Limitations and Next Steps

This is a validated prototype, not an official government issuance service. A production cadastral deployment still requires conclusive official parcel information, ownership/legal record linkage, independently surveyed GCPs, authority-approved height, defensible footprint matching, reconciled official floor-plan/BIM data, governed review, and the government issuance integration.

See these project documents for more detail:

- [Capability audit](validation/ulpin-vpm-capability-audit.md)
- [Vercel deployment handoff](deployment/VERCEL_DEPLOYMENT.md)
- [Server-controlled role assignment](deployment/ROLE_ASSIGNMENT.md)
- [Neon PostgreSQL migration](deployment/NEON_POSTGRES_MIGRATION.md)
- [Clerk entry and Vercel validation record](validation/clerk-entry-route-check.md)

## References

[1] [React Documentation — Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)  
[2] [Vite Documentation — Getting Started](https://vite.dev/guide/)  
[3] [CesiumJS Documentation — Web 3D Geospatial Visualization](https://cesium.com/learn/cesiumjs-learn/)  
[4] [PostGIS Manual — Spatial Objects, Indexes, and GIS Functions](https://postgis.net/docs/)  
[5] [Vercel Documentation — Functions](https://vercel.com/docs/functions)
