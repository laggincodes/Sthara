# Data Model Specification

## 1. Conceptual Hierarchy
The cadastral data model is structured around a stratified property hierarchy that bridges traditional 2D surface parcels and multi-tier 3D volumetric rights conforming conceptually to **ISO 19152 (Land Administration Domain Model - LADM)**.

```
PROPERTY (Core Estate Unit)
├── PARCEL (2D Surface Land Polygon & Base Boundary)
│   ├── SPATIAL REFERENCE (CRS, Projections, Datum)
│   └── BASE ULPIN (2D Centroid Land Identifier)
├── BUILDING (Physical Superstructure Envelope)
│   └── FLOORS (Vertical Slices / Structural Levels)
│       └── UNITS (Horizontal Enclosed Compartments / Flats)
├── PROPERTY VOLUMES (3D Stratified Polyhedral Units / Unit Aggregations)
│   ├── Constituent Unit Solids / Floor Solids
│   ├── Surface Parcel Column (SFC)
│   ├── Above-Ground Units (ABV)
│   └── Air Rights Envelope (AIR)
├── UNDERGROUND VOLUMES (3D Sub-Surface Polyhedral Units)
│   └── Basement / Parking / Utility Conduits (SUB)
├── VALIDATION RESULT (Topological Checks & Detected Clashes)
└── PROTOTYPE 3D ULPIN (Deterministic Volumetric Identity String)
```

---

## 2. Entity Definitions & Schemas

### 2.1 Spatial Reference (Value Object)
Defines coordinate reference systems and geodetic baselines.

| Field Name | Type | Description | Example |
|---|---|---|---|
| `epsg_code` | `int` | Primary EPSG identifier | `32643` (UTM Zone 43N) |
| `name` | `string` | Human-readable CRS title | `"WGS 84 / UTM zone 43N"` |
| `units` | `string` | Metric coordinate unit | `"meters"` |
| `datum` | `string` | Vertical / horizontal datum | `"WGS 84 / EGM96 Geoid"` |
| `is_projected` | `bool` | True if planar Cartesian coordinates | `true` |

---

### 2.1b Vertical Dimension & Elevation Model (Value Object)
Defines vertical coordinate conventions and geodetic elevation baselines.

| Concept | Symbol / Key | Unit | Reference Baseline | Description |
|---|---|---|---|---|
| **Absolute Elevation** | $Z_{AMSL}$ | `meters` | Mean Sea Level (EGM96) | Orthometric physical elevation above geoid |
| **Ground Elevation** | $Z_{ground}$ | `meters` | Mean Sea Level (EGM96) | Plinth / terrain surface elevation at feature centroid |
| **Relative Height** | $H_{rel}$ | `meters` | Ground Plinth ($Z - Z_{ground}$) | Vertical displacement from local ground surface |
| **Building Height** | $H_{bld}$ | `meters` | Base Plinth | Vertical span from ground to structural roof parapet |
| **Floor Height** | $H_{fl}$ | `meters` | Slab Level | Vertical inter-floor slab spacing (typically 2.8m–3.5m) |

#### Elevation Provenance Contract
Every sampled elevation must record:
- `source_dem`: Filename of the source raster (e.g. `"demo_elevation.tif"`).
- `dem_crs`: Native CRS of the elevation raster (e.g. `"EPSG:4326"`).
- `vertical_unit`: Metric unit (`"meters"`).
- `vertical_reference`: Datum string (`"AMSL (Above Mean Sea Level)"`).
- `sampling_method`: Spatial query algorithm (`"centroid_nearest"` or `"bilinear"`).
- `status`: Sample outcome (`"SUCCESS"`, `"OUTSIDE_COVERAGE"`, `"NODATA"`, `"UNAVAILABLE"`).

---

### 2.2 Parcel (Entity: `CadastralParcel`)
Represents the base legal 2D surface land boundary.

| Field Name | Type | Description |
|---|---|---|
| `parcel_id` | `string` (UUID/Code) | Unique internal parcel identifier (e.g., `"PARCEL-IND-MH-402"`) |
| `base_ulpin_2d` | `string` | Standard 2D 14-digit/geohash parcel identifier |
| `survey_number` | `string` | Official revenue survey / khasra number (e.g., `"402/2A"`) |
| `ward_id` | `string` | Municipal administrative ward or zone |
| `geometry_2d` | `GeoJSON Polygon` | Planar boundary coordinates in metric/WGS84 |
| `area_sqm` | `float` | Authoritative registered surface area in $m^2$ |
| `perimeter_m` | `float` | Boundary perimeter in meters |
| `ground_elevation_amsl`| `float` | Mean ground elevation above sea level in meters ($Z_{ground}$) |
| `max_zoning_height_m` | `float` | Maximum permissible building height by municipal bylaw |
| `owner_name` | `string` | Primary registered title holder / estate authority |
| `status` | `enum` | `"ACTIVE"`, `"DISPUTED"`, `"SUBDIVIDED"` |

---

### 2.3 Building (Entity: `BuildingStructure`)
Represents the physical architectural shell occupying the parcel, connecting 2D footprints with vertical elevation and floor structures.

| Field Name | Type | Description |
|---|---|---|
| `building_id` | `string` | Unique building structure identifier (e.g., `"BLD-402-01"`) |
| `parcel_id` | `string` (FK) | Reference to parent `CadastralParcel` |
| `footprint_2d` | `GeoJSON Polygon` | Ground-level exterior footprint polygon |
| `footprint_area_sqm` | `float` | Building plinth area in $m^2$ |
| `ground_elevation` | `float` | Plinth surface elevation in meters AMSL ($Z_{ground}$) |
| `roof_elevation` | `float` | Parapet/roof surface elevation in meters AMSL ($Z_{roof}$) |
| `building_height` | `float` | Computed vertical height ($H_{bld} = Z_{roof} - Z_{ground}$) in meters |
| `height_source` | `enum` | `"SYNTHETIC_DEMO"`, `"DSM"`, `"LIDAR"`, `"SURVEY"`, `"MANUAL_INPUT"`, `"FLOOR_METADATA"` |
| `height_method` | `enum` | `"DIRECT_DIFFERENCE"`, `"ELEVATION_SUBTRACTION"`, `"FLOOR_MULTIPLICATION"`, `"SURVEY_SPECIFIED"` |
| `height_status` | `enum` | `"AVAILABLE"`, `"UNAVAILABLE"`, `"INVALID"`, `"INCONSISTENT"`, `"ESTIMATED"` |
| `height_confidence`| `float` (Nullable) | Quality metric (0.0 to 1.0) when deterministically scored |
| `number_of_floors` | `int` | Total count of structural storeys |
| `floor_height_m` | `float` | Baseline vertical floor slab spacing (e.g., $3.0m$) |
| `occupancy_type` | `enum` | `"RESIDENTIAL"`, `"COMMERCIAL"`, `"MIXED_USE"`, `"AUXILIARY"` |
| `association_status` | `enum` | `"WITHIN"`, `"INTERSECTS"`, `"MULTI_PARCEL"`, `"OUTSIDE"`, `"UNRESOLVED"` |
| `overlap_percentage` | `float` | Percentage of building footprint lying within primary associated parcel |
| `overlaps` | `list` | Detailed breakdown of intersection areas across all candidate parcels |

---

### 2.3b Canonical 3D Geometry Contract (Entities: `Mesh3D` & `Mesh3DCollection`)
*Authoritative Reference: See [`3D_GEOMETRY_CONTRACT.md`](3D_GEOMETRY_CONTRACT.md) for full JSON schema, vertex/face contracts, winding rules, and Three.js integration.*

Represents the authoritative, closed 3D boundary representation (B-Rep) of an extruded building structure or property volume. Each individual building part is represented as a watertight `Mesh3D` solid. MultiPolygon footprints or disjoint parts are represented as a `Mesh3DCollection`.

#### `Mesh3D` Solid Contract
| Field Name | Type | Description | Example |
|---|---|---|---|
| `feature_id` | `string` | Identifier of feature or sub-part | `"BLD_DEMO_001"` |
| `feature_type` | `enum` | Target category (`"BUILDING"`, `"FLOOR"`, `"PROPERTY_VOLUME"`, `"UNDERGROUND"`) | `"BUILDING"` |
| `geometry_type`| `enum` | Type discriminator: always `"SOLID"` | `"SOLID"` |
| `vertices` | `List[List[float]]` | Local coordinates `[x, y, z]` in meters relative to `viewer_origin` | `[[-5.0, -5.0, 0.0], ...]` |
| `faces` | `List[List[int]]` | Triangular face vertex indices `[i, j, k]` with strict CCW outward winding | `[[0, 2, 1], ...]` |
| `coordinate_reference` | `object` | `horizontal_crs`, `vertical_reference`, `source_crs`, and `viewer_origin` | `{"horizontal_crs": "EPSG:32643", ...}` |
| `units` | `object` | Metric unit definitions (`"horizontal_unit": "meter"`, `"vertical_unit": "meter"`) | `{"horizontal_unit": "meter", ...}` |
| `bounds` | `object` | Local axis-aligned bounding box `min: [x,y,z]`, `max: [x,y,z]` | `{"min": [-5,-5,0], "max": [5,5,12]}` |
| `winding` | `enum` | Normal orientation rule: `"COUNTER_CLOCKWISE"` | `"COUNTER_CLOCKWISE"` |
| `surface_area_sqm` | `float` | Enclosed outer surface area in $m^2$ | `540.0` |
| `volume_cubic_m` | `float` | Exact mathematical closed solid volume in $m^3$ | `1200.0` |

#### `Mesh3DCollection` Multi-Part Container
Used when a building footprint is composed of multiple disjoint polygons (MultiPolygon) or wings:
- `parts`: List of validated `Mesh3D` solids.
- `bounds`: Unified bounding box enclosing all parts.
- `total_volume_cubic_m`: Sum of volumes across all parts.
- `total_surface_area_sqm`: Sum of surface areas across all parts.

#### Coordinate Normalization Formula
$$\vec{v}_{\text{local}} = \vec{v}_{\text{projected}} - \vec{v}_{\text{viewer\_origin}}$$
This eliminates vertex jitter and z-fighting on WebGL 32-bit floating point GPUs when working with large metric UTM coordinates ($\sim 10^6\text{m}$). Absolute geospatial registration is preserved via `coordinate_reference.viewer_origin`.

---


### 2.4 3D Stratified Floor Solid (Entity: `Floor3DResult`)
Represents an individual structural level within a building structure, materialized as a watertight 2-manifold `Mesh3D` solid.

| Field Name | Type | Description |
|---|---|---|
| `floor_id` | `string` | Unique floor identifier (e.g., `"BLD-DEMO-001-FL02"`) |
| `building_id` | `string` (FK) | Reference to parent `BuildingStructure` |
| `parcel_id` | `string` (FK, Nullable) | Reference to root `CadastralParcel` |
| `floor_index` | `int` | Level index: $0$ for Ground Floor, $1, 2, \dots$ for upper storeys |
| `floor_name` | `string` | Standardized descriptive label (e.g., `"Ground Floor"`, `"Floor 2"`) |
| `volume_type` | `enum` | Always `"FLOOR"` |
| `base_elevation` | `float` | Lower floor slab elevation ($Z_{base}$) in meters AMSL |
| `top_elevation` | `float` | Ceiling / upper slab elevation ($Z_{top}$) in meters AMSL |
| `height` | `float` | Structural slab height ($Z_{top} - Z_{base}$) in meters |
| `volume_cubic_m` | `float` | Exact polyhedral solid volume ($A_{footprint} \times h$) in $m^3$ |
| `surface_area_sqm` | `float` | Total boundary surface area ($2 \times A + P \times h$) in $m^2$ |
| `geometry_status` | `enum` | `"VALID"`, `"DEGRADED"`, `"UNAVAILABLE"`, `"ERROR"` |
| `geometry` | `Mesh3DCollection` | Validated 2-manifold closed mesh parts with outward normals |

#### Floor Height Resolution Priority:
1. **Priority 1 (Explicit Elevations)**: When `base_elevation` and `top_elevation` are provided with $Z_{top} > Z_{base}$. Intervals must not overlap, must not extend below ground plinth, and must not exceed building roof.
2. **Priority 2 (Explicit Floor Heights)**: When `floor_height` is provided per floor, elevations stack cumulatively: $Z_0 = Z_{ground}$, $Z_{i+1} = Z_i + h_i$.
3. **Priority 3 (Equal Slicing)**: When total building height $H_{bld}$ and floor count $N$ are provided: $h_{fl} = H_{bld} / N$, stacked evenly from ground plinth.

---

### 2.4A Unit / Apartment Entity (Entity: `Unit`)
Represents an enclosed spatial compartment within a parent `Floor`, supporting horizontal stratification of multi-unit buildings.

| Field Name | Type | Description |
|---|---|---|
| `unit_id` | `string` | Canonical deterministic ID: `BLD-{bld}-FL{fl}-U{num}` (e.g. `BLD-DEMO-002-FL05-U501`) |
| `parcel_id` | `string` (FK) | Reference to root `CadastralParcel` |
| `building_id` | `string` (FK) | Reference to parent `BuildingStructure` |
| `floor_id` | `string` (FK) | Reference to parent `BuildingFloor` |
| `unit_number` | `string` | Local unit number on floor (e.g., `"501"`) |
| `unit_name` | `string` (Nullable) | Human-readable unit designation (e.g., `"Apartment 501"`) |
| `unit_type` | `enum` | `"APARTMENT_UNIT"`, `"RESIDENTIAL_UNIT"`, `"OFFICE"`, `"SHOP"`, `"OTHER"` |
| `geometry_2d` | `Polygon` (Nullable) | GeoJSON footprint of unit floor plan subdivision |
| `base_elevation` | `float` | Base elevation in meters AMSL |
| `top_elevation` | `float` | Ceiling elevation in meters AMSL |
| `height` | `float` | Vertical unit height ($Z_{top} - Z_{base}$) in meters |
| `footprint_area` | `float` | Planar footprint area in $m^2$ |
| `volume_cubic_m` | `float` | Volumetric cubature in $m^3$ |
| `source` | `string` | Origin file or reference dataset |
| `source_type` | `enum` | `"FLOOR_PLAN"`, `"SURVEY"`, `"BUILDING_MODEL"`, `"DERIVED"`, `"DEMO"`, `"DRONE"`, `"LIDAR"` |
| `status` | `enum` | `"VALID"`, `"INVALID"`, `"UNAVAILABLE"` |
| `warnings` | `List[string]` | Geometric or topological validation warnings |
| `provenance` | `dict` | Audit metadata and processing timestamps |

#### Unit Integrity Constraints:
1. **Vertical Bounds**: Unit height must be positive ($H \ge 1.0\text{ m}$) and lie strictly within parent floor bounds $[Z_{base}, Z_{top}]$ within $0.05\text{ m}$ tolerance.
2. **Horizontal Containment**: Unit 2D polygon must be contained within parent building footprint polygon ($0.01\text{ m}^2$ tolerance).
3. **Mutual Non-Overlap**: Units on the same floor must not overlap in area ($\text{Area} \le 10^{-6}\text{ m}^2$); common party-wall touching is valid.
4. **Unique Unit Number**: Unit numbers must be unique across the same floor.
5. **Common Circulation**: Floor area does NOT need to equal sum of unit areas; corridors and shared spaces remain legitimately unassigned.
6. **Statutory Notice**: Physical unit modeling does NOT establish legal ownership.

---

### 2.4B Unit-Level 3D Physical Extrusion (Entities: `Unit3DRequest`, `Unit3DResult`)
Represents the physical 3D extruded volume of an individual apartment or unit, conforming strictly to the **Canonical 3D Geometry Contract v1.0**.

#### `Unit3DRequest`
| Field Name | Type | Description |
|---|---|---|
| `unit_id` | `string` | Canonical unit identifier (e.g., `"BLD-DEMO-002-FL05-U501"`) |
| `unit_number` | `string` | Local unit number on floor (e.g., `"501"`) |
| `floor_id` | `string` | Parent floor identifier (e.g., `"BLD-DEMO-002-FL05"`) |
| `building_id` | `string` | Parent building identifier (e.g., `"BLD-DEMO-002"`) |
| `footprint_geometry` | `dict` | GeoJSON Polygon or MultiPolygon representing unit boundary |
| `base_elevation` | `float` (Nullable) | Base slab elevation in meters AMSL ($Z_{base}$) |
| `top_elevation` | `float` (Nullable) | Ceiling slab elevation in meters AMSL ($Z_{top}$) |
| `height` | `float` (Nullable) | Vertical unit height in meters |
| `parent_floor_base` | `float` (Nullable) | Parent floor base elevation constraint in meters AMSL |
| `parent_floor_top` | `float` (Nullable) | Parent floor top elevation constraint in meters AMSL |
| `source_crs` | `string` | Source CRS (default: `"EPSG:4326"`) |
| `target_crs` | `string` | Metric projection CRS (default: `"EPSG:32643"`) |

#### `Unit3DResult`
| Field Name | Type | Description |
|---|---|---|
| `unit_id` | `string` | Canonical unit identifier |
| `unit_number` | `string` | Local unit number |
| `floor_id` | `string` | Parent floor identifier |
| `building_id` | `string` | Parent building identifier |
| `geometry_status` | `enum` | `"VALID"`, `"DEGRADED"`, `"UNAVAILABLE"`, `"ERROR"` |
| `unit` | `UnitSummary` | Compact unit metadata (elevations, height, footprint area) |
| `geometry` | `Union[Mesh3D, Mesh3DCollection]` | Watertight 2-manifold closed mesh (`feature_type="UNIT"`) with CCW winding |
| `warnings` | `List[string]` | Validation notices and geometric warnings |

#### Extrusion Integrity Rules:
1. **Watertight Solid**: Output mesh is 2-manifold closed ($V - E + F = 2$) with outward CCW normals.
2. **MultiPolygon Decomposition**: MultiPolygon footprints are decomposed into discrete watertight `Mesh3D` parts inside a `Mesh3DCollection`.
3. **Volume Cross-Validation**: Mesh volume computed via the Divergence Theorem is cross-checked against analytical prism volume ($A_{footprint} \times h$).
4. **Party-Wall Tolerance**: Common party-wall boundary touching ($\text{Area} = 0$) is valid; positive-area footprint overlaps on the same floor ($\text{Area} > 10^{-10}\text{ deg}^2$) are rejected with `DUPLICATE_OR_OVERLAPPING_UNITS`.

---

### 2.5 3D Cadastral Property Volume (Entity: `PropertyVolumeResult`)
The fundamental 3D cadastral unit representing a discrete volumetric property right, associated with a parcel, building, and constituent floor solid(s) or unit solid(s).

| Field Name | Type | Description |
|---|---|---|
| `property_id` | `string` | Unique cadastral property identifier (e.g., `"PROP-BLD-001-A"`) |
| `parcel_id` | `string` (FK) | Reference to root `CadastralParcel` |
| `building_id` | `string` (FK) | Reference to parent `BuildingStructure` |
| `floor_ids` | `List[string]` | References to constituent `BuildingFloor` instances (single or multi-floor duplex) |
| `unit_ids` | `List[string]` (Nullable) | Optional references to constituent `Unit` entities (unit-level property aggregation) |
| `volume_type` | `enum` | `"PROPERTY_VOLUME"`, `"FLOOR"`, `"UNDERGROUND"`, `"AIRSPACE"` |
| `unit_name` | `string` (Nullable) | Human-readable unit designation (e.g., `"Duplex Unit A (Floors 1-2)"`) |
| `base_elevation` | `float` | Lowest floor base elevation in meters AMSL |
| `top_elevation` | `float` | Highest floor roof/ceiling elevation in meters AMSL |
| `total_height` | `float` | Total vertical span in meters ($Z_{max} - Z_{min}$) |
| `volume_cubic_m` | `float` | Summed mathematical volume across constituent floors in $m^3$ |
| `surface_area_sqm` | `float` | Summed outer boundary surface area across constituent floor parts in $m^2$ |
| `geometry_status` | `enum` | `"VALID"`, `"DEGRADED"`, `"UNAVAILABLE"`, `"ERROR"` |
| `geometry` | `Mesh3DCollection` | Collection of individual watertight floor solids without non-manifold internal walls |

#### Multi-Floor & Multi-Building Integrity Contract:
A property volume is represented as a `Mesh3DCollection` composed of its constituent watertight floor solids. This guarantees topological 2-manifold closedness ($V - E + F = 2$) for each individual part without introducing non-manifold internal junction walls.

#### Property-Volume Geometry Semantics (Canonical Clarification):
1. **Core Semantic Rule**: A `PROPERTY_VOLUME` represents a validated 3D spatial volume associated with a specific cadastral property/parcel. It must NOT be assumed that `PROPERTY_VOLUME = entire BUILDING_VOLUME`. Instead, it represents the 3D spatial extent supported by the available cadastral + building + elevation/floor evidence.
2. **Initial Prototype Rule**: If a parcel contains a validated building and the system has no evidence indicating that ownership/use is divided vertically or horizontally, the initial property volume is the union of validated floor volumes for the building(s) associated with that property. This is a prototype spatial representation, not a legal determination of ownership.
3. **Conceptual Distinctions**:
   - `PARCEL`: 2D cadastral boundary geometry.
   - `BUILDING`: Physical architectural structure.
   - `FLOOR`: Physical 3D sub-volume of a building.
   - `PROPERTY_VOLUME`: Cadastral-property-associated 3D spatial representation.
   - `3D ULPIN`: Persistent identifier (never confused with the geometry).
4. **No Automatic Airspace Enclosure**: Property volume must NOT automatically include the entire parcel footprint $\times$ arbitrary vertical height. Airspace, underground space, and public areas are excluded unless authoritatively specified.
5. **Multiple Buildings on One Parcel**: Multiple independent buildings on a single parcel are represented as separate `Mesh3D` parts inside the property's `Mesh3DCollection`. The system never creates artificial connecting geometry between independent buildings.
6. **No Double-Counting Shared Boundaries**: Adjacent floors meeting at a shared horizontal slab (e.g., Floor 1 top $45\text{m}$, Floor 2 base $45\text{m}$) have zero mathematical volume at the interface. Therefore:
   $$V_{\text{property}} = \sum_{i=1}^N V_{\text{floor}_i}$$
7. **Partial Floor Coverage & Footprint Provenance**: When floor-specific footprints are unavailable, the validated building footprint is used and the system explicitly records:
   `FLOOR_FOOTPRINT_ASSUMED_FROM_BUILDING`
8. **Unknown Vertical Extent**: If vertical elevation or height evidence is unavailable, `geometry_status = UNAVAILABLE`. Arbitrary default heights are prohibited.
9. **Neutral Terminology & Legal Disclaimer**: Geometry does not prove legal ownership. Outputs are tagged with `DERIVED_SPATIAL_EXTENT: 3D property-volume representation derived from available spatial evidence (not a legal determination of ownership)`.

---

### 2.6 Underground Volume (Entity: `UndergroundVolume`)
Specialized subclass of `PropertyVolume` dedicated to subterranean assets.

| Field Name | Type | Description |
|---|---|---|
| `volume_id` | `string` (FK) | Inherits from `PropertyVolume` |
| `depth_below_ground_m` | `float` | Maximum depth below ground datum ($|Z_{min} - Z_{ground}|$) |
| `subterranean_type`| `enum` | `"BASEMENT_PARKING"`, `"METRO_CORRIDOR"`, `"UTILITY_TUNNEL"`, `"FOUNDATION"` |
| `public_easement_clearance_m` | `float` | Distance to nearest registered municipal utility easement |

---

### 2.7 Validation Result (Entity: `CadastralValidationReport`)
Captures deterministic spatial audit results and detected boundary clashes.

| Field Name | Type | Description |
|---|---|---|
| `validation_id` | `string` | Unique audit report identifier |
| `parcel_id` | `string` (FK) | Target parcel audited |
| `overall_status` | `enum` | `"PASSED"` (All clear), `"WARNING"` (Advisory), `"FAILED"` (Clash detected) |
| `total_checks_run` | `int` | Number of topological tests executed |
| `checks` | `list[ValidationCheck]` | Granular record for each individual check |
| `clashes` | `list[SpatialClash]` | Detailed geometry and volumetric clash records |
| `timestamp` | `datetime` | ISO-8601 audit execution timestamp |

#### Embedded: `ValidationCheck`
```json
{
  "check_code": "VERTICAL_OVERHANG",
  "name": "Vertical Column Boundary Check",
  "status": "FAILED",
  "message": "Floor 3 cantilever extends 1.40m past the eastern parcel boundary."
}
```

#### Embedded: `SpatialClash`
```json
{
  "clash_id": "CLASH-402-FL03-01",
  "clash_type": "BOUNDARY_OVERHANG",
  "severity": "CRITICAL",
  "affected_volume_id": "VOL-402-FL03",
  "encroachment_area_sqm": 12.60,
  "encroachment_volume_m3": 37.80,
  "clash_geometry_2d": { "type": "Polygon", "coordinates": [...] },
  "elevation_interval": [9.0, 12.0]
}
```

---

### 2.8 Prototype 3D ULPIN Specification
*Notice: This is a hackathon research prototype specification and does not represent an official Gazette notification.*

The Prototype 3D Unique Land Parcel Identification Number is structured into 5 deterministic segments:

```
IND-CAD-<BaseGeohash>-<Stratum>-<Zmin_dm>-<Zmax_dm>-<UnitID>
```

| Segment | Characters | Description | Example |
|---|---|---|---|
| **Prefix** | 7 | National Cadastral System Code | `IND-CAD` |
| **BaseGeohash** | 8 | Centroid Geohash of 2D base parcel | `TS09W12A` |
| **Stratum** | 3 | Vertical stratification code (`SFC`, `ABV`, `SUB`, `AIR`) | `ABV` |
| **Zmin_dm** | 4 | Lower elevation in decimeters ($Z_{min} \times 10$) | `0030` (3.0m) |
| **Zmax_dm** | 4 | Upper elevation in decimeters ($Z_{max} \times 10$) | `0060` (6.0m) |
| **UnitID** | 4 | Level / Unit sequence identifier | `FL02` |

**Full Prototype String**: `IND-CAD-TS09W12A-ABV-0030-0060-FL02`

---

### 2.9 Multi-Source Spatial Data Fusion & Georeferencing Models

Represents the data relationship orchestration layer aligning multi-source observations into a common metric project spatial frame without destroying source coordinates.

#### 2.9.1 Source Dataset Metadata (`DatasetMetadata`)
| Field Name | Type | Description |
|---|---|---|
| `dataset_id` | `string` | Unique dataset identifier |
| `source_type` | `enum` | `CADASTRAL_GIS`, `BUILDING_FOOTPRINT`, `OSM`, `DEM`, `DSM`, `LIDAR`, `FLOOR_PLAN`, `GNSS_CORS`, `DRONE_AERIAL` |
| `source_format` | `string` | Data encoding (e.g., `"GeoJSON"`, `"GeoTIFF"`, `"OSM XML"`, `"LAS/LAZ"`) |
| `source_crs` | `string` | Native coordinate reference system (e.g., `"EPSG:4326"`) |
| `target_crs` | `string` (Nullable) | Projected metric CRS (e.g., `"EPSG:32643"`) |
| `bounds` | `Tuple[4 floats]` (Nullable) | Bounding box in source coordinates |
| `units` | `Dict[str, str]` | Unit declarations (`{"horizontal": "degrees", "vertical": "meters"}`) |
| `is_cadastral` | `bool` | True only for legal land administration records; False for physical observations (OSM) |
| `status` | `enum` | `AVAILABLE`, `LOADED`, `VALIDATED`, `UNAVAILABLE`, `ERROR` |

#### 2.9.2 GNSS / CORS Geodetic Reference (`GNSSReferencePoint`)
| Field Name | Type | Description |
|---|---|---|
| `station_id` | `string` | CORS or survey monument identifier (e.g., `"CORS-DL-01"`) |
| `name` | `string` (Nullable) | Monument or benchmark name |
| `coordinates` | `List[float]` | `[longitude, latitude]` or `[x, y]` |
| `elevation` | `float` (Nullable) | Elevation in meters AMSL |
| `elevation_reference`| `string` (Nullable) | Vertical datum reference (e.g., `"AMSL"`, `"EGM96"`) |
| `crs` | `string` | Geodetic horizontal CRS |
| `status` | `string` | Operational state (`"ACTIVE"`, `"BENCHMARK"`, `"SIMULATED"`) |

#### 2.9.3 LiDAR Point Cloud Source Reference (`LiDARSourceReference`)
| Field Name | Type | Description |
|---|---|---|
| `source_id` | `string` | Point cloud source or flight line identifier |
| `crs` | `string` | Native point cloud CRS |
| `total_points` | `int` | Point count within footprint / tile |
| `classifications` | `List[string]` | ASPRS classification returns (`"GROUND"`, `"BUILDING"`) |
| `point_density_per_sqm` | `float` (Nullable) | Average pulse/point density |
| `vertical_reference` | `string` (Nullable) | Height reference datum |

#### 2.9.4 Fused Building Context (`FusedBuildingContext`)
| Field Name | Type | Description |
|---|---|---|
| `building_id` | `string` | Unique building structure identifier |
| `is_cadastral` | `bool` | Cadastral registration flag |
| `legal_status` | `string` | Administrative legal status (`"VALIDATED_CADASTRE_REGISTERED"`, `"UNVERIFIED_PHYSICAL_SURFACE"`) |
| `source_type` | `enum` | Origin source (`BUILDING_FOOTPRINT`, `OSM`) |
| `source_crs` | `string` | Original coordinate system |
| `source_geometry` | `dict` | Unaltered 2D GeoJSON boundary |
| `project_crs` | `string` | Normalized metric CRS |
| `projected_geometry` | `dict` | Projected 2D GeoJSON boundary |
| `associated_parcel_id`| `string` (Nullable) | Matched cadastral land parcel ID |
| `association_status`| `string` (Nullable) | Spatial relationship (`"WITHIN"`, `"INTERSECTS"`, `"OUTSIDE"`, `"UNRESOLVED"`) |
| `ground_elevation` | `float` (Nullable) | Sampled terrain plinth elevation in meters AMSL |
| `lidar_evidence` | `dict` (Nullable) | Extracted LiDAR roof return and density |
| `building_height` | `float` (Nullable) | Structural height in meters |
| `floors` | `List[dict]` | Constituent floor strata |
| `units` | `List[dict]` | Constituent apartment units |

#### 2.9.5 Unified Fused Property Context (`FusedPropertyContext`)
| Field Name | Type | Description |
|---|---|---|
| `context_id` | `string` | Unique session or context identifier |
| `schema_version` | `string` | Version (`"1.0"`) |
| `target_project_crs`| `string` | Target metric project CRS |
| `parcel` | `dict` (Nullable) | Associated cadastral parcel record |
| `buildings` | `List[FusedBuildingContext]` | Array of fused physical building contexts |
| `elevation_source` | `dict` (Nullable) | DEM raster metadata |
| `lidar_source` | `LiDARSourceReference` (Nullable) | Active LiDAR point cloud source |
| `gnss_reference` | `GNSSReferencePoint` (Nullable) | Geodetic control monument reference |
| `source_alignment` | `Dict[str, bool]` | Layer availability indicators |
| `fusion_status` | `enum` | Overall status: `VALID`, `PARTIAL`, `WARNING`, `INVALID` |
| `quality_level` | `enum` | Evidence readiness: `FULL`, `PARTIAL`, `LIMITED`, `INVALID` |
| `conflicts` | `List[SpatialConflict]` | Detected topological or administrative conflicts |
| `provenance` | `List[dict]` | Audit trail of all transformation steps |
## 2.10 AI/ML Candidate Feature Model & Provenance (Step 19)

### CandidateFeature Envelope
Represents non-authoritative candidate physical features extracted by computer-vision or statistical models:

| Field | Type | Description |
| :--- | :--- | :--- |
| `candidate_id` | `string` | Unique identifier (e.g. `AI-BLD-CAND-001`, `AI-FLR-CAND-001`) |
| `feature_type` | `ExtractionType` | `BUILDING`, `FLOOR`, `UNIT`, or `VERTICAL_FEATURE` |
| `source_reference` | `string` | Parent source or building reference |
| `geometry_2d` | `GeoJSON Polygon` | Candidate 2D boundary (if spatial feature) |
| `estimated_attributes` | `Record<string, unknown>` | Candidate attributes (`base_elevation_m`, `top_elevation_m`, `height_m`, etc.) |
| `confidence` | `float \| null` | Calibrated numeric score $[0.0, 1.0]$; `null` if uncalibrated |
| `confidence_level` | `ConfidenceLevel` | `HIGH`, `MEDIUM`, `LOW`, or `UNAVAILABLE` |
| `confidence_threshold` | `float` | Minimum confidence required for automatic acceptance (default 0.60) |
| `extraction_method` | `ExtractionMethod` | `SOURCE_DATA`, `AI_CV_MORPHOLOGICAL`, `AI_NDSM_SEGMENTATION`, etc. |
| `status` | `CandidateStatus` | `CANDIDATE`, `ACCEPTED`, `REJECTED`, `REVIEW_REQUIRED`, `UNAVAILABLE` |
| `provenance` | `ExtractionProvenance` | Source dataset, model ID, version, execution timestamp, CRS |
| `warnings` | `List[string]` | Integrity and boundary notices |

AI candidates are strictly candidate evidence and cannot directly produce 3D property volumes without deterministic validation.

## 2.11 Underground / Subsurface Spatial Entity (Step 20)

### 2.11.1 Subsurface Spatial Feature (`UndergroundFeature`)
Represents physical subterranean structures and infrastructure corridors:

| Field | Type | Description |
| :--- | :--- | :--- |
| `underground_feature_id` | `string` | Deterministic identifier (e.g., `BSM-DEMO-101`, `UTL-DEMO-001`) |
| `feature_type` | `UndergroundFeatureType` | `BASEMENT`, `UNDERGROUND_UTILITY`, `SUBSURFACE_VOLUME`, `PARKING_VAULT`, `METRO_TUNNEL`, etc. |
| `utility_type` | `UtilityType \| null` | `WATER_SUPPLY`, `SEWERAGE`, `STORMWATER`, `ELECTRICITY_POWER`, `TELECOMMUNICATIONS`, etc. |
| `parcel_id` | `string` | Associated surface cadastral parcel identifier |
| `building_id` | `string \| null` | Associated parent building structure (required for `BASEMENT`) |
| `property_id` | `string \| null` | Associated legal property record (for property volume basements) |
| `name` | `string` | Descriptive title |
| `ground_elevation_m` | `float` | Authoritative surface ground elevation datum ASL ($Z_\text{ground}$) |
| `top_elevation_m` | `float` | Upper solid elevation boundary ASL ($Z_\text{top} \le Z_\text{ground}$) |
| `base_elevation_m` | `float` | Lower solid elevation boundary ASL ($Z_\text{base} < Z_\text{top}$) |
| `depth_to_top_m` | `float` | Non-negative derived depth to upper boundary ($Z_\text{ground} - Z_\text{top}$) |
| `depth_to_base_m` | `float` | Non-negative derived depth to lower boundary ($Z_\text{ground} - Z_\text{base}$) |
| `thickness_m` | `float` | Vertical solid thickness ($Z_\text{top} - Z_\text{base}$) |
| `geometry_2d` | `GeoJSON Polygon \| LineString` | Footprint perimeter or buffered corridor |
| `mesh_3d` | `Mesh3D \| Mesh3DCollection \| null` | Canonical watertight closed 2-manifold 3D solid |
| `geometry_status` | `Geometry3DStatus` | `VALID`, `INVALID`, `UNAVAILABLE` |
| `spatial_status` | `UndergroundSpatialStatus` | `WITHIN`, `INTERSECTS`, `OUTSIDE`, `UNRESOLVED` |
| `is_cadastral_property` | `bool` | `True` for private property volume components; `False` for public utilities |
| `provenance` | `UndergroundProvenance` | Origin survey method, dataset, vertical datum, CRS |
| `warnings` | `List[string]` | Subsurface notices and clash warnings |

### 2.11.2 Subsurface Conflict Record (`UndergroundConflictRecord`)
Represents 3D physical clash or proximity encroachment between subterranean assets:

| Field | Type | Description |
| :--- | :--- | :--- |
| `feature_a_id` | `string` | First feature identifier |
| `feature_b_id` | `string` | Second feature identifier |
| `feature_a_type` | `UndergroundFeatureType` | Type of feature A |
| `feature_b_type` | `UndergroundFeatureType` | Type of feature B |
| `conflict_class` | `UndergroundConflictClass` | `ALLOWED_INTERSECTION`, `REVIEW_REQUIRED`, `INVALID_OVERLAP` |
| `horizontal_overlap_area_m2` | `float` | 2D footprint intersection area |
| `vertical_clearance_m` | `float` | Distance between vertical elevation intervals (negative if overlapping) |
| `is_3d_clash` | `bool` | True if both 2D horizontal and 1D vertical intervals overlap |
| `resolution_recommendation` | `string` | Engineering recommendation for cadastre records |

## 2.12 Unified Topology & Spatial Conflict Model (Step 22)

### 2.12.1 Topology Conflict Record (`TopologyConflictRecord`)
Represents an individual spatial or geometric invalidity identified across the cadastral hierarchy:

| Field | Type | Description |
| :--- | :--- | :--- |
| `conflict_id` | `string` | Deterministic unique identifier (e.g. `CONF-OVL-2D-UNIT-U101-U102`) |
| `conflict_type` | `TopologyConflictType` | Taxonomy: `DUPLICATE_ID`, `DUPLICATE_GEOMETRY`, `POSITIVE_AREA_OVERLAP`, `PARTIAL_CONTAINMENT`, `OUTSIDE_PARENT`, `VERTICAL_OVERLAP`, `VERTICAL_OUTSIDE_PARENT`, `INVALID_MESH`, `MISSING_REFERENCE` |
| `severity` | `TopologySeverity` | Impact category: `INFO`, `WARNING`, `ERROR` |
| `primary_entity_id` | `string` | Principal entity in conflict |
| `primary_entity_type` | `EntityType` | Cadastral tier (`PARCEL`, `BUILDING`, `FLOOR`, `UNIT`, `PROPERTY_VOLUME`, `UNDERGROUND`) |
| `secondary_entity_id` | `string \| null` | Secondary entity involved in pairwise relationship |
| `secondary_entity_type` | `EntityType \| null` | Secondary entity tier |
| `description` | `string` | Diagnostic description of the spatial condition |
| `overlap_metric` | `float \| null` | Quantified measurement (area in $\text{m}^2$, depth in $\text{m}$, or volume in $\text{m}^3$) |
| `conflict_geometry` | `GeoJSON Polygon \| null` | Geometry of the intersecting region |
| `recommendation` | `string` | Actionable cadastral / engineering remedy |

### 2.12.2 Topology Check Record (`TopologyCheckRecord`)
Audit log entry of an individual topological rule evaluated:

| Field | Type | Description |
| :--- | :--- | :--- |
| `check_id` | `string` | Unique deterministic check ID (e.g. `CHK-OVL-2D-PARCEL-P1-P2`) |
| `check_type` | `TopologyCheckType` | `DUPLICATE_CHECK`, `CONTAINMENT_2D`, `OVERLAP_2D`, `VERTICAL_INTERVAL`, `MESH_3D_INTEGRITY`, `HIERARCHY_INTEGRITY`, `UNDERGROUND_CLASH` |
| `entity_type` | `EntityType` | Domain entity tier |
| `entity_ids` | `List[string]` | Lexicographically sorted participating entities |
| `status` | `TopologyStatus` | `VALID`, `WARNING`, `CONFLICT`, `UNAVAILABLE` |
| `severity` | `TopologySeverity` | `INFO`, `WARNING`, `ERROR` |
| `message` | `string` | Diagnostic message |
| `measured_value` | `float \| null` | Measurement (area $\text{m}^2$, thickness, distance) |
| `tolerance_used` | `float \| null` | Engineering tolerance applied |

### 2.12.3 Topology Summary (`TopologySummary`)
Aggregated metrics reflecting overall cadastral health:

| Field | Type | Description |
| :--- | :--- | :--- |
| `overall_status` | `TopologyStatus` | Composite status (`VALID`, `WARNING`, `CONFLICT`, `UNAVAILABLE`) |
| `total_checks` | `int` | Total evaluated checks |
| `passed_checks` | `int` | Count of rules satisfied within tolerance |
| `warning_checks` | `int` | Count of informational warnings |
| `conflict_checks` | `int` | Count of critical spatial collisions |
| `unavailable_checks` | `int` | Count of checks skipped due to missing geometry |
| `duplicates_found` | `int` | Count of duplicate ID or identical geometry conflicts |
| `overlaps_found` | `int` | Count of positive-area overlap conflicts |
| `containment_violations` | `int` | Count of containment boundary violations |
| `mesh_issues_found` | `int` | Count of non-manifold or open 3D meshes |
| `hierarchy_issues_found` | `int` | Count of broken parent-child references |
| `tolerances` | `TopologyTolerances` | Configured engineering tolerances |

---

### 2.13 Real Multi-Source Integration Pipeline Result (`RealDataPipelineResult`)

Captures the comprehensive end-to-end multi-source validation across real physical observations and synthetic cadastral data. Emitted to `data/processed/real_data_pipeline_result.json` and returned by `GET /api/v1/fusion/real-pipeline`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `pipeline_id` | `string` | Unique run identifier (e.g. `REAL-DATA-PIPELINE-E2E-001`) |
| `executed_at` | `string (ISO 8601)` | Timestamp of execution |
| `execution_duration_sec` | `float` | Execution wall-clock duration in seconds |
| `target_crs` | `string` | Harmonized metric project CRS (`EPSG:32643`) |
| `fusion_status` | `string` | Honest fusion outcome (`PARTIAL`) |
| `quality_level` | `string` | Documented data quality rating (`LIMITED`) |
| `pipeline_verdict` | `string` | Validation verdict (`VALIDATED_PARTIAL`) |
| `summary` | `string` | Human-readable engineering summary |
| `stages` | `Dict[str, Any]` | Stage execution dictionaries (`01_data_ingestion` through `08_viewer_compatibility`) |

