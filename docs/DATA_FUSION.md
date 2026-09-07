# Step 18 — Multi-Source Georeferencing & Spatial Data Fusion

## 1. Overview & Objective

In modern 3D cadastral intelligence systems, physical building observations, administrative land boundaries, sensor point clouds, and geodetic reference networks originate from disparate sources with varying coordinate reference systems, measurement resolutions, and legal authority.

The objective of Step 18 is to establish a deterministic, transparent, and reversible **Multi-Source Spatial Data Fusion Layer** following the SIH technical paradigm:

```text
01 INGESTION  ───►  02 GEO-REFERENCING  ───►  03 SPATIAL FUSION
```

```text
CADASTRAL GIS (Parcels)
         +
PHYSICAL FOOTPRINTS (Buildings / Real OSM)
         +
DIGITAL ELEVATION MODEL (DEM)
         +
LiDAR POINT CLOUDS
         +
FLOOR STRATA & APARTMENTS (Units)
         +
GNSS / CORS GEODETIC MONUMENTS
         │
         ▼
[CRS Inspection & Metric Reprojection (PyProj)]
         │
         ▼
[Spatial Alignment & Topological Association (STRtree)]
         │
         ▼
[Unified Fused Property Context & Conflict Audit]
```

---

## 2. Core Architectural Principles

1. **Deterministic Primacy**: All coordinate transformations, polygon intersections, and boundary clash tests are computed using deterministic mathematical engines (`PyProj`, `Shapely`, `STRtree`). No generative AI models are permitted to synthesize or alter coordinates.
2. **Never Silently Transform Data**: Every coordinate transformation records the native source CRS, target projected CRS, transformation algorithm, and UTC timestamp.
3. **Preserve Native Geometries**: When normalizing features to a target project CRS, the original GeoJSON coordinates are strictly preserved in `properties._source_geometry` and `properties._source_crs`.
4. **Non-Cadastral Separation for Real OSM**: Real OpenStreetMap data represents crowd-sourced physical observations (`is_cadastral = False`, `legal_status = "UNVERIFIED_PHYSICAL_SURFACE"`). The fusion layer never manufactures fictitious land ownership or title records.
5. **No Data Fabrication**: If a layer (e.g. LiDAR or DEM) is absent for a given building, it is reported as `UNAVAILABLE` or `OUTSIDE_COVERAGE`. Vertical references default to `null` if the source datum is unknown.

---

## 3. Supported Source Types

| Source Type | Category Code | Typical Format | Authority Status | Role in Spatial Fusion |
|---|---|---|---|---|
| **Cadastral GIS** | `CADASTRAL_GIS` | GeoJSON / Shapefile | Legal / Official | Base 2D surface parcel boundary column & rights container |
| **Building Footprint** | `BUILDING_FOOTPRINT` | GeoJSON | Authoritative Survey | Architectural plinth boundary registered to parcel |
| **OpenStreetMap** | `OSM` | OSM XML / GeoJSON | Physical Observation | Observed physical footprint without legal land title |
| **Elevation Model** | `DEM` / `DSM` | GeoTIFF (Raster) | Geodetic Terrain | Ground plinth elevation extraction ($Z_{ground}$) |
| **LiDAR Point Cloud** | `LIDAR` | LAS / LAZ | Sensor Observation | Roof elevation verification, point density, structural height |
| **Floor Plan** | `FLOOR_PLAN` | GeoJSON / CAD | Architectural | Vertical stratification levels & inter-floor slab heights |
| **Apartment Unit** | `FLOOR_PLAN` | GeoJSON | Spatial Compartment | Sub-floor flat boundaries & party-wall touching verification |
| **GNSS / CORS** | `GNSS_CORS` | Geodetic Point | Geodetic Control | Georeferenced baseline station / benchmark coordinates |
| **Drone Aerial** | `DRONE_AERIAL` | Orthomosaic | Sensor Observation | High-resolution visual confirmation |

---

## 4. CRS & Georeferencing Strategy

### 4.1 Target Metric Projection
Because geographical degrees (WGS84 `EPSG:4326`) cannot be used for direct Euclidean distance, area ($m^2$), or volumetric ($m^3$) calculations without severe spherical distortion, the fusion engine normalizes geometries into an explicit projected metric coordinate reference system:
- **Default Configured Projection**: `EPSG:32643` (WGS 84 / UTM Zone 43N), encompassing New Delhi, Maharashtra, and western/central India.
- **Dynamic Derivation**: When no target CRS is explicitly specified, the engine inspects the centroid longitude of the input features to derive the optimal UTM zone:
  $$\text{UTM Zone} = \lfloor(\lambda + 180) / 6\rfloor + 1$$
- **Metric Verification**: The service confirms that `crs.is_projected == True` and linear axis units are meters before permitting 3D extrusion or clash testing.

### 4.2 Reversible Feature Normalization Contract
When a feature is normalized into the project CRS:
```json
{
  "type": "Feature",
  "id": "BLD-DEMO-001",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[379120.4, 2048151.6], ...]]
  },
  "properties": {
    "_source_crs": "EPSG:4326",
    "_target_crs": "EPSG:32643",
    "_source_geometry": {
      "type": "Polygon",
      "coordinates": [[[73.85606, 18.52006], ...]]
    },
    "_transformed": true,
    "_transform_timestamp": "2026-09-07T20:30:00Z"
  }
}
```

---

## 5. Multi-Source Fusion Workflow & Relationships

### 5.1 Building ↔ Parcel Association
Using `SpatialRelationshipService` with an STRtree R-tree spatial index:
- Computes exact polygonal intersection areas.
- Classifies association status:
  - `WITHIN`: 100% of footprint lies inside parcel.
  - `INTERSECTS`: Partially encroaches across parcel boundary (generates `VERTICAL_OVERHANG` conflict).
  - `OUTSIDE`: Completely detached from registered land (generates `BUILDING_OUTSIDE_PARCEL` critical conflict).
  - `UNRESOLVED`: Standalone observation without parcel data (e.g. real OSM).

### 5.2 Building ↔ DEM Ground Elevation
Using `ElevationService`:
- Samples raster elevations at the building's 2D centroid.
- Reprojects query coordinates if the DEM CRS differs from the feature CRS.
- Detects `OUTSIDE_COVERAGE` or `NODATA` sentinel pixels without fabricating terrain heights.

### 5.3 Building ↔ LiDAR Point Cloud Evidence
- Clips point cloud spatial index to the building footprint.
- Extracts total points, pulse density ($	ext{pts}/m^2$), and ASPRS class returns (Ground vs Building).
- Compares LiDAR roof returns with architectural specifications as corroborating evidence.

### 5.4 Unit ↔ Floor ↔ Building Containment
- Ensures apartment footprints are geometrically contained within the parent building envelope ($0.01m^2$ tolerance).
- Permits common party-wall boundary sharing ($\text{Intersection Area} = 0$).
- Detects positive-area overlap conflicts between distinct units on the same floor level.

---

## 6. Fusion Integrity Status & Evidence Readiness Levels

### 6.1 Fusion Integrity Status (`fusion_status`)
- `VALID`: All datasets projected successfully; zero critical topological conflicts.
- `WARNING`: Minor non-blocking spatial notices (e.g. party-wall boundary touching, boundary overhang warnings).
- `PARTIAL`: One or more expected layers absent or incomplete.
- `INVALID`: Unresolvable CRS definition, corrupt geometry, or severe topology failure.

### 6.2 Evidence Readiness Levels (`quality_level`)
- **`FULL`**: All 7 spatial dimensions present and aligned: Cadastre + Building + DEM + LiDAR + Floors + Units + GNSS.
- **`PARTIAL`**: Core cadastral, building, and elevation layers aligned; point clouds or apartment plans absent.
- **`LIMITED`**: Physical surface observations only (e.g., real OSM buildings without parcel boundaries).
- **`INVALID`**: Input sources cannot be aligned safely.

---

## 7. Real OSM Ingestion Behavior

When `map.osm` or `data/processed/real/osm_buildings.geojson` is ingested:
1. Native CRS is identified as `EPSG:4326`.
2. Footprints are reprojected into `EPSG:32643`.
3. The system explicitly tags:
   - `is_cadastral = False`
   - `legal_status = "UNVERIFIED_PHYSICAL_SURFACE"`
   - `association_status = "UNRESOLVED"`
4. A structured notice `NON_CADASTRAL_OBSERVATION` is recorded in the conflict register, explicitly reminding officers and citizens that crowd-sourced geometries do not confer land ownership.

---

## 8. REST API Endpoints

- `POST /api/v1/fusion/validate`: Validates dataset inventory and CRS compatibility.
- `POST /api/v1/fusion/normalize`: Normalizes GeoJSON features while preserving source geometry.
- `POST /api/v1/fusion/property-context`: Constructs unified multi-source property context.
- `GET /api/v1/fusion/demo`: Serves pre-fused demo context linking all 7 data layers.
- `GET /api/v1/fusion/real-osm`: Serves normalized real OSM buildings with non-cadastral status.
