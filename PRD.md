# Product Requirements Document (PRD)

## 1. Project Name
**3D Cadastral Intelligence**  
*Next-Generation 3D Spatial Cadastre, Volumetric Land Rights & Prototype 3D-ULPIN System*

---

## 2. Problem Statement
Traditional cadastre and land administration systems represent property boundaries strictly in two dimensions (2D parcels on a planar projection). However, modern urban environments, infrastructure corridors, high-density residential towers, commercial complexes, and underground utilities exist in multi-layered, three-dimensional space.

2D cadastral records suffer from critical limitations:
1. **Vertical Rights Ambiguity**: Inability to explicitly define and record stratified ownership rights above or below ground (e.g., multi-storey apartments, basements, underground transit/metro corridors, overhead flyovers, and utility conduits).
2. **Geometric Clashes & Encroachment Overlaps**: 2D planar projections cannot model vertical cantilever encroachments, shared party-wall interfaces, or subterranean penetrations into public easements or adjacent parcel columns.
3. **Inadequate Stratified Identification**: Traditional land identifiers (such as the standard 2D Unique Land Parcel Identification Number - ULPIN / Bhu-Aadhaar in India) identify surface land footprints, but fail to represent stratified 3D property volumes (units, vertical spaces, and sub-surface volumes) unambiguously.

---

## 3. Problem Context
Under modern land governance initiatives (such as India's Digital India Land Records Modernization Programme - DILRMP and the SVAMITVA Scheme), significant progress has been made in drone mapping and 2D GIS cadastral mapping. However, high-density urban growth demands moving towards a **3D Cadastre conforming to international standards like ISO 19152 (Land Administration Domain Model - LADM)**.

During the Smart India Hackathon (SIH), a practical, deterministic, high-impact demonstration is needed to show how existing spatial data (GIS parcel boundaries, drone/aerial imagery, LiDAR/DSM/DEM, floor plans, and GNSS coordinates) can be ingested, validated, extruded into legal/physical property volumes, assigned stratified **Prototype 3D ULPINs**, and inspected in an interactive geospatial web viewer.

---

## 4. Proposed Solution
**3D Cadastral Intelligence** is a web-based, end-to-end geospatial intelligence and 3D cadastre prototyping platform. It bridges 2D surface parcels and multi-level physical/legal spaces by:
1. Ingesting multi-source spatial data (2D cadastral Shapefiles/GeoJSON, elevation data, building footprints, and floor specifications).
2. Fusing datasets using deterministic coordinate transformation and spatial validation.
3. Extruding and generating true 3D cadastral property volumes (surface parcel columns, building shells, individual floor/unit volumetric units, and underground utility/basement volumes).
4. Performing geometric and cadastral validation (detecting vertical boundary overhangs, illegal vertical floor expansions, volume containment within parcel limits, and inter-volume overlaps).
5. Generating a standardized **Prototype 3D ULPIN** that encodes spatial coordinates, ground elevation (Z_min), ceiling elevation (Z_max), and stratified volume type.
6. Rendering both 2D cadastral footprints and 3D volumetric parcels interactively in a unified browser dashboard.
7. Providing optional Gemini-powered plain-English legal/technical summaries of validation reports and volumetric rights.

---

## 5. Target Users
- **Cadastral & Revenue Officers**: For reviewing volumetric subdivision, assessing multi-tier land rights, and issuing vertical property deeds.
- **Urban Local Bodies (ULBs) & Municipal Planners**: For detecting vertical encroachment, unauthorized floor additions, and underground easement clashes.
- **Surveyors & GIS Professionals**: For validating field survey data, GNSS control points, and drone-derived DSMs against legal parcel registries.
- **Citizens & Property Owners**: For transparently inspecting owned 3D property bounds, stratified unit boundaries, and associated volumetric rights.

---

## 6. Core Objectives
1. **Deterministic Volumetric Modeling**: Construct verified 3D polyhedral volumes (Z_min to Z_max) from 2D parcel polygons and structural/elevation data.
2. **Automated Cadastral Validation**: Detect boundary violations (containment checks, vertical boundary exceedance, parcel overhang, and volumetric overlap) using deterministic spatial algorithms.
3. **Prototype 3D ULPIN Generation**: Formulate and assign reproducible, coordinate-and-elevation-indexed 3D ULPIN strings for surface, above-ground, and underground volumes.
4. **Seamless 2D/3D Geospatial Visualization**: Provide zero-lag, intuitive browser-based 2D map views and 3D volumetric inspection.
5. **Hackathon Demo Readiness**: Guarantee an end-to-end executable pipeline with realistic bundled sample datasets demonstrating the entire lifecycle in under 60 seconds.

---

## 7. MVP Scope

### In-Scope (Must Have for SIH MVP)
- Ingestion of 2D cadastral parcel layers (GeoJSON format with defined EPSG).
- Ingestion of building footprint layers with vertical attribution (number of floors, ground elevation, floor height, roof height).
- Synthetic/realistic sample datasets representing urban mixed-use plots:
  - Ground parcel.
  - Multi-storey building divided into floor volumes.
  - Underground basement / utility volume.
  - An intentional encroachment/overhang scenario to showcase validation flags.
- Deterministic 3D extrusion and bounding volume calculation.
- Spatial containment & clash detection:
  - Parcel vs. Building footprint containment check.
  - Vertical overhang detection.
  - Unit volume overlap check.
- Prototype 3D ULPIN generation engine.
- 2D Leaflet/MapLibre map viewer + 3D Three.js / React Three Fiber interactive scene.
- Property details panel with volumetric metrics (Volume in m^3, Floor Area in m^2, Elevation range in m AOD/AMSL, Stratification Type).
- Automated sample data loader for instantaneous zero-friction live demonstrations.

### Out-of-Scope (Deferred / Future)
- Real-time cloud LiDAR point cloud tiling (streaming millions of raw LAS/LAZ files).
- Automated computer-vision extraction of floor plans from scanned blueprint images.
- Legally binding integration with state land registry databases.
- Multi-party real-time blockchain-based deed registration.
- Complex BIM/IFC to CityGML bidirectional editing engine.

---

## 8. Core User Journey
1. **Select / Ingest Data**: The user loads the dashboard and chooses a preset realistic sample parcel or uploads a custom GeoJSON bundle.
2. **Run Pipeline**: User triggers processing via a single action ('Run Cadastral Analysis').
3. **Inspect 2D Cadastre**: User verifies 2D parcel boundaries, building footprints, and projected coordinate system.
4. **Inspect 3D Volumetric Scene**: User views extruded 3D parcel columns, stratified floors, and underground volumes with interactive orbit/zoom.
5. **Validate Cadastre**: User checks the validation drawer for automated clash flags (overhangs, footprint boundary breaches, or illegal extensions).
6. **Inspect 3D Property Identity (3D ULPIN)**: User selects any individual unit/volume to reveal its unique Prototype 3D ULPIN, vertical bounds, volume (m^3), and ownership class.
7. **Consult Optional AI Explainer**: User optionally requests a plain-English explanation from Gemini summarizing the findings for non-technical stakeholders.

---

## 9. Functional Requirements
- **FR-01: Multi-Layer Spatial Ingestion**: Must parse GeoJSON containing Polygon and MultiPolygon geometries with vertical metadata.
- **FR-02: Coordinate Standardization**: Must validate Coordinate Reference Systems (CRS) and support reprojection to local metric projections (e.g., UTM Zone 43N).
- **FR-03: Volumetric Extrusion Engine**: Must convert 2D planar polygons with Z_min and Z_max attributes into valid 3D polyhedral mesh representations.
- **FR-04: Spatial Clash Detection**: Must evaluate topological relationships:
  - Base containment (Footprint within Parcel).
  - Overhang violation (Upper floor extends beyond Parcel column).
  - Unit overlap (Volume intersections between adjacent units).
- **FR-05: Prototype 3D ULPIN Assignment**: Must compute an alphanumeric identifier combining parcel centroid geohash, stratum type (SFC, ABV, SUB, AIR), vertical interval (Z_min - Z_max in decimeters), and unit index.
- **FR-06: Dual-Viewport 2D/3D Visualization**: Must render synchronized or tabbed 2D parcel map and 3D volumetric model with camera controls and floor-explode slider.
- **FR-07: Unit Attribution Inspector**: Must display property metadata upon clicking any 3D volume or 2D polygon.
- **FR-08: Non-Authoritative AI Assistant**: Must provide natural language summary via Gemini API without modifying spatial or validation records.

---

## 10. Non-Functional Requirements
- **NFR-01: Deterministic Reliability**: Same input spatial data must always generate identical geometries, validation results, and 3D ULPIN strings.
- **NFR-02: Performance**: End-to-end processing and rendering of the sample parcel must complete in under 3 seconds.
- **NFR-03: Client-Side Responsiveness**: 3D viewer must maintain >= 60 FPS on standard modern desktop browsers.
- **NFR-04: Modularity**: Clear separation between frontend presentation, backend geometric computation, and auxiliary AI integration.
- **NFR-05: Portability**: Runs locally or in containerized environments with zero mandatory cloud proprietary GIS licenses.

---

## 11. Inputs
The system accommodates the following spatial inputs:

| Input Category | Format | Role in Pipeline | MVP Treatment |
|---|---|---|---|
| **Cadastral GIS / Parcel Boundaries** | GeoJSON / Shapefile | Defines base legal surface boundary (X, Y) | Supported directly via GeoJSON |
| **Building Footprints & Floors** | GeoJSON with attributes (ase_height, loors, loor_height, 
oof_height) | Defines extruded footprint & vertical slicing | Supported directly via GeoJSON |
| **DEM / DSM Elevation Data** | GeoTIFF / Grid Array | Ground surface elevation baseline (Z_ground) | Pre-extracted to ground elevation baseline |
| **Drone / Aerial Imagery** | Orthophoto / Basemap Tile | Visual geographic context | Integrated as 2D basemap tiles |
| **LiDAR / 3D Point Data** | LAS / LAZ / Pre-extracted Height Mesh | Roof/building height extraction | Pre-processed into height attributes for MVP |
| **GNSS / CORS Coordinates** | EPSG projected coordinates | Georeferencing & spatial consistency | Reprojected to target projected CRS (e.g., UTM) |

*Note for MVP*: The pipeline demonstrates complete end-to-end flow using realistic pre-processed GeoJSON with embedded height and vertical stratification attributes, eliminating heavy GIS server overhead during short hackathon demonstrations.

---

## 12. Processing Pipeline
The core architectural pipeline is strictly deterministic:

`
INPUT DATA
   │ (GeoJSON Parcel + Building Footprints + Elevation Attributes)
   ▼
DATA FUSION
   │ (Validate EPSG, reproject to planar meter CRS, snap coordinates)
   ▼
EXTRACTION
   │ (Derive footprint polygons, floor intervals, basement depths)
   ▼
3D CADASTRAL MODEL
   │ (Extrude 2D geometries into 3D polyhedral volumes with [Z_min, Z_max])
   ▼
VALIDATION
   │ (Footprint containment, vertical overhang, volumetric clash, boundary compliance)
   ▼
PROPERTY VOLUMES
   │ (Surface Parcel Column, Above-Ground Units, Subterranean Infrastructure)
   ▼
3D ULPIN
   │ (Generate deterministic 3D-ULPIN codes based on centroid, elevation, & volume type)
   ▼
3D VISUALIZATION
   │ (Transmit GeoJSON / Three.js geometry mesh payloads to interactive UI)
   ▼
OPTIONAL AI ASSISTANCE (GEMINI)
     (Generate non-authoritative plain-language summary of validation findings)
`

---

## 13. Outputs
1. **Interactive 2D Cadastral Layer**: GeoJSON layer with surface parcel, coordinate grid, and footprint outlines.
2. **3D Volumetric Mesh Payload**: Lightweight JSON representation of discrete polyhedrons (vertices, faces, elevation metadata, color-coded by stratification type).
3. **Spatial Validation Report**: Structured JSON detailing:
   - Overall compliance status (PASSED, WARNING, FAILED).
   - List of checks (PARCEL_CONTAINMENT, HEIGHT_RESTRICTION, VOLUME_CLASH, UNDERGROUND_CLEARANCE).
   - Discrepancy details (e.g., 'Balcony overhang extends 1.4m past eastern parcel boundary between Z=12.0m and Z=15.0m').
4. **3D ULPIN Registry**: Record table linking each stratified unit to its unique 3D ULPIN, volume in m^3, floor level, and parcel parent.
5. **Exportable Summary**: Downloadable JSON report for municipal and legal review.

---

## 14. Validation Requirements
The system executes deterministic spatial validation tests:
- **Boundary Containment Check**: Building footprints must be completely contained within parcel boundaries, unless an explicit registered easement exists.
- **Vertical Overhang Detection**: Cantilevers, upper-floor projections, or balconies extending beyond the vertical parcel column are flagged with clash geometry.
- **Volumetric Non-Intersection Check**: Independent property volumes within the same building must not overlap (Vol_A ∩ Vol_B = ∅).
- **Vertical Continuity Check**: Upper floor volumes must be supported by valid sub-floor volumes or base structures.
- **Height Envelope Compliance**: No structure or volume may exceed local municipal maximum permissible height (Z_max <= Z_limit).
- **Sub-surface Encroachment Check**: Basements or underground excavations must respect utility buffer setback zones.

---

## 15. 3D ULPIN Concept (Prototype)
India’s standard 2D ULPIN (Bhu-Aadhaar) is a 14-digit alphanumeric identification number based on the latitude and longitude coordinates of the parcel's bounding polygon vertices / centroid.

The **Prototype 3D ULPIN** extends this principle into the third dimension:
`
3D-ULPIN = <Base-ULPIN> - <Stratum Type> - <Z_min> - <Z_max> - <Unit Index>
`

Where:
- **Base-ULPIN**: Centroid-derived geohash / alphanumeric grid string representing the 2D surface parcel.
- **Stratum Type**:
  - SFC: Surface Parcel Column (Ground level)
  - ABV: Above-Ground Building Unit (Floor / Apartment / Commercial Space)
  - SUB: Subterranean / Underground Volume (Basement / Metro / Parking / Utility)
  - AIR: Air Rights Volume (Transferable Development Rights / Overhead Corridor)
- **Z_min / Z_max**: Elevation in decimeters relative to datum (e.g., AMSL or local ground datum).
- **Unit Index**: Sub-unit identifier within that level.

*Note for Hackathon*: The generated 3D ULPIN is explicitly documented as a **Prototype Specification** demonstrating vertical cadastral indexing.

---

## 16. Success Criteria
- Ingestion, validation, 3D volume generation, and ULPIN assignment executes within **< 3 seconds** for an urban parcel test-case.
- Zero visual artifacts or mesh corruptions in the 3D viewer.
- Explicit visual isolation and highlighting of encroaching/invalid volumes.
- 100% deterministic reproducibility (same spatial inputs always produce the exact same 3D ULPINs and validation metrics).
- Zero reliance on external paid proprietary GIS servers (runs entirely on open-source stack: FastAPI, Shapely, GeoPandas, Next.js, Three.js).

---

## 17. Demo Requirements
- **One-Click Demo Launch**: Preset dataset button that automatically runs the pipeline and populates the 2D map, 3D scene, validation log, and ULPIN cards without requiring manual file prep during a live presentation.
- **Interactive Exploded View / Floor Slicing**: Slider or toggle to expand/explode building floors vertically in 3D to inspect interior volumes.
- **Clash Highlighting**: Toggleable red wireframe / highlight showing the exact volume where a 3D overhang or boundary violation occurred.
- **Unit Inspection Modal**: Clicking any 3D floor or parcel displays its properties: Volume (m^3), Height Range, Floor Number, 3D-ULPIN, and Validation Status.

---

## 18. Future Scope
- **Full IFC / BIM & CityGML v3.0 Parser**: Direct drag-and-drop ingestion of architectural BIM models.
- **Multi-Parcel District Scale**: Seamless Level-of-Detail (LoD 1 to LoD 3) rendering across entire municipal wards.
- **Smart Contracts / Land Registry Bridge**: Automated issuance of non-fungible volumetric land titles directly tied to verified 3D ULPINs.
- **Mobile AR Cadastre**: On-site augmented reality viewing of parcel boundary columns and subterranean utilities through a mobile camera.
