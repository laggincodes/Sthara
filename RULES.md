# Engineering & Development Rules

## 1. Core Engineering Principles

### 1.1 Do Not Overengineer
- Deliver the leanest, most robust implementation that completely satisfies the PRD.
- Do not introduce distributed task queues, microservices, complex multi-tenant auth, or speculative abstractions when a simple, clean asynchronous Python service and Next.js client fulfills the requirement.

### 1.2 Strict Scope Adherence
- Do not implement features, views, or endpoints outside of the PRD and API_SPEC without explicit user approval.
- Unnecessary feature creep jeopardizes platform demo stability.

### 1.3 Strict Separation of Deterministic Math and AI
- **Rule of Deterministic Primacy**: All coordinate transformations, spatial polygon intersections, buffer generation, 3D polyhedral extrusions, geometric clash tests, volume calculations, and 3D ULPIN codes MUST be computed with deterministic mathematical algorithms (`Shapely`, `GeoPandas`, `PyProj`).
- **Never Replace Geometric Calculations with AI**: Large Language Models (Gemini) must NEVER be used to calculate coordinates, evaluate spatial containment, or declare cadastral validity.
- **AI is Strictly Auxiliary**: Gemini is permitted exclusively for non-authoritative natural language summarization, user assistance, and narrative explanation of deterministic validation logs.

### 1.4 Lean Dependencies
- Do not install heavy or redundant dependencies without justification.
- Before installing any npm or pip package, verify whether existing standard libraries (`Math`, `shapely`, `pydantic`, `fastapi`, standard Three.js) already solve the problem.

### 1.5 Strict Frontend / Backend Separation
- The frontend (Next.js) is strictly a presentation and visualization client. It must not attempt complex multi-layer geospatial joins, raw coordinate reprojecting, or geometric clash detection in JavaScript.
- The backend (FastAPI) is strictly the geospatial processing and geometric authority. It produces clean, consumable JSON and GeoJSON payloads for the frontend.

### 1.6 Continuous API Documentation
- Every FastAPI endpoint must include Pydantic request/response models, status codes, and docstrings.
- The API must always match the contracts defined in `API_SPEC.md`.

### 1.7 Modular & Single-Responsibility Code
- Keep functions short, pure, and focused on a single responsibility.
- Place geometry utilities in `services/geo_processor.py`, 3D extrusion in `services/extrusion_service.py`, validation logic in `services/validation_engine.py`, and ULPIN generation in `services/ulpin_generator.py`.
- On the frontend, keep 3D scene elements, map components, and inspector panels in separate modular components.

---

## 2. Geospatial & Cadastral Integrity Rules

### 2.1 Never Silently Ignore Coordinate Reference Systems (CRS)
- Spatial data without a verified CRS is invalid.
- Always check and log the input EPSG code (e.g., `EPSG:4326` WGS84).
- When computing areas, distances, or volumes, always reproject geometries into a metric projected coordinate system (e.g., `EPSG:32643` UTM Zone 43N).
- Never compute metric volumes or buffer distances using unprojected degree coordinates.

### 2.2 Never Treat Visualization as Validation
- A visually appealing 3D rendering on screen does NOT constitute cadastral validation.
- Validation must be backed by mathematically proven topological checks (e.g., GEOS `contains`, `intersects`, `difference`).
- Visual meshes are merely graphical projections of verified underlying mathematical polyhedrons.

### 2.3 Transparent Cadastral Claims & Prototype Labeling
- Never claim legal cadastral compliance or government authority unless explicitly supported by official state survey specifications.
- All generated 3D ULPIN identifiers must be explicitly labeled as **"Prototype 3D-ULPIN"** in the UI and documentation.

### 2.4 Mandatory Demo & Test Path
- Every major feature must have a deterministic test path and bundled sample dataset.
- The platform must always ship with zero-dependency demo datasets that execute reliably offline or with minimal local setup.

### 2.5 Prioritize Demo-Blocking Bugs
- A bug that breaks 3D rendering, crashes the backend, or fails to display sample data takes absolute priority over cosmetic CSS adjustments or non-essential polish.

---

## 3. Rules for AI Coding Assistants (Antigravity)

### 3.1 Explain Major Architectural Changes Before Modifying
- Before altering core schemas, replacing key libraries, or modifying the pipeline flow, explain the rationale to the user and obtain explicit confirmation.

### 3.2 Do Not Automatically Refactor Working Code
- When adding a new feature or fixing a bug, do not reformat, rewrite, or rearrange unrelated working modules.
- Preserve existing working code, interfaces, comments, and docstrings.

### 3.3 Do Not Create Duplicate Files or Duplicate Components
- Always search the codebase before creating new files or helper functions.
- Never maintain multiple versions of the same component (e.g., `Viewer3D.tsx` and `Viewer3DNew.tsx`). Refactor in place or delete superseded files cleanly.

### 3.4 Strict Execution Protocol
- Adhere strictly to the phased roadmap defined in `PHASES.md`.
- Never jump ahead to implement future-phase code before the foundational phase is validated and verified.
