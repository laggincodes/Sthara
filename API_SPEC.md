# Backend API Specification

This document defines the REST API contracts for the **3D Cadastral Intelligence** backend.  
Base URL: `http://localhost:8000/api/v1`

---

## Standard Response Envelopes

### Success Envelope
```json
{
  "status": "success",
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-09-06T14:45:00Z"
}
```

### Error Envelope
```json
{
  "status": "error",
  "error_code": "INVALID_GEOMETRY",
  "message": "Polygon geometry has self-intersecting rings",
  "details": {},
  "timestamp": "2026-09-06T14:45:00Z"
}
```

---

## 1. System & Health

### 1.1 Health Check
- **Route**: `GET /health`
- **Purpose**: Verifies service status, runtime environment, and geospatial engine availability.
- **Request**: None
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "service": "3d-cadastral-intelligence-backend",
      "version": "1.0.0",
      "status": "healthy",
      "geospatial_engine": {
        "shapely_version": "2.0.4",
        "pyproj_version": "3.6.1",
        "geos_version": "3.11.2"
      },
      "gemini_service": "configured"
    },
    "message": "System operating normally"
  }
  ```
- **Error Cases**:
  - `503 Service Unavailable`: Core geospatial libraries (GEOS/PROJ) failed to load.

---

## 2. Datasets & Ingestion

### 2.1 List Preset Demo Datasets
- **Route**: `GET /datasets`
- **Purpose**: Returns the list of bundled SIH evaluation datasets.
- **Request**: None
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "datasets": [
        {
          "id": "urban_standard",
          "name": "Standard Urban Mixed-Use (Compliant)",
          "description": "4-storey residential commercial building with 1 basement, fully compliant with parcel boundaries.",
          "feature_count": 6
        },
        {
          "id": "urban_encroachment",
          "name": "Commercial Tower with Overhang Encroachment",
          "description": "Multi-storey complex where Floor 3 cantilever overhang encroaches 1.4m past eastern boundary.",
          "feature_count": 6
        }
      ]
    }
  }
  ```

### 2.2 Dataset Inspection
- **Route**: `GET /datasets/{dataset_id}`
- **Purpose**: Fetches the raw GeoJSON feature collection and CRS metadata of a selected dataset.
- **Request**: Path param `dataset_id` (string)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "dataset_id": "urban_encroachment",
      "crs": {
        "type": "name",
        "properties": { "name": "urn:ogc:def:crs:EPSG::32643" }
      },
      "feature_collection": {
        "type": "FeatureCollection",
        "features": [...]
      }
    }
  }
  ```
- **Error Cases**:
  - `404 Not Found`: `{"error_code": "DATASET_NOT_FOUND", "message": "Dataset ID does not exist"}`

### 2.3 Upload Custom GeoJSON Dataset
- **Route**: `POST /datasets/upload`
- **Purpose**: Ingests user-provided GeoJSON parcel files, validates file type & size, executes topological geometry validation, and returns normalized parcels.
- **Request**: `multipart/form-data` with `file: <GeoJSON/JSON File>` (max 10MB)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "dataset_id": "ds_49ccc173f0",
      "source_filename": "demo_parcels.geojson",
      "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
      "crs_source": "explicit_named_crs",
      "total_parcels": 3,
      "parcels": [ ... ],
      "validation": {
        "valid": true,
        "feature_count": 3,
        "geometry_types": ["Polygon"],
        "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
        "crs_is_projected": false,
        "suggested_projected_crs": "EPSG:32643",
        "errors": [],
        "warnings": [ ... ]
      }
    },
    "message": "Successfully validated and normalized 3 cadastral parcel(s)."
  }
  ```
- **Error Cases**:
  - `400 Bad Request`: `{"status": "error", "error_code": "GEOMETRY_VALIDATION_FAILED", "message": "Uploaded GeoJSON failed cadastral topology validation.", "data": { ... }}`
  - `413 Request Entity Too Large`: File exceeds 10 MB limit.

### 2.4 Validate Raw GeoJSON Payload
- **Route**: `POST /datasets/validate`
- **Purpose**: Directly validates a JSON/GeoJSON FeatureCollection object submitted in the request body.
- **Request**: `application/json` (GeoJSON FeatureCollection)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "validation": {
        "valid": true,
        "feature_count": 3,
        "geometry_types": ["Polygon"],
        "crs": "EPSG:4326",
        "suggested_projected_crs": "EPSG:32643",
        "errors": [],
        "warnings": []
      },
      "normalized_dataset": { ... }
    },
    "message": "GeoJSON validation and normalization completed successfully"
  }
  ```
- **Error Cases**:
  - `400 Bad Request`: `{"status": "error", "error_code": "GEOMETRY_VALIDATION_FAILED", "data": { "validation": { "valid": false, "errors": [ ... ] } } }`

### 2.5 Spatial Association (Buildings to Parcels)
- **Route**: `POST /spatial/associate-buildings`
- **Purpose**: Performs deterministic topological spatial analysis between cadastral parcels and building footprints. Computes projected metric areas, association status (`WITHIN`, `INTERSECTS`, `MULTI_PARCEL`, `OUTSIDE`, `UNRESOLVED`), and primary parcel assignment.
- **Request**: `application/json`
  ```json
  {
    "parcels": { "type": "FeatureCollection", "features": [ ... ] },
    "buildings": { "type": "FeatureCollection", "features": [ ... ] },
    "target_crs": "EPSG:32643"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "summary": {
        "total_parcels": 3,
        "total_buildings": 4,
        "associated_buildings": 3,
        "unresolved_buildings": 0,
        "outside_buildings": 1,
        "multi_parcel_buildings": 1,
        "projected_crs": "EPSG:32643"
      },
      "associations": [
        {
          "building_id": "BLD-DEMO-001",
          "is_system_generated_id": false,
          "geometry_type": "Polygon",
          "geometry": { ... },
          "bounds": [73.85606, 18.52006, 73.85624, 18.52018],
          "building_area_sqm": 252.34,
          "centroid": [73.85615, 18.52012],
          "associated_parcel_id": "DEMO-401/1",
          "association_status": "WITHIN",
          "overlap_percentage": 100.0,
          "overlaps": [
            {
              "parcel_id": "DEMO-401/1",
              "intersection_area_sqm": 252.34,
              "overlap_percentage": 100.0
            }
          ],
          "properties": { ... }
        }
      ],
      "parcel_building_map": {
        "DEMO-401/1": ["BLD-DEMO-001"],
        "DEMO-401/2": ["BLD-DEMO-002", "BLD-DEMO-003"],
        "DEMO-401/3": []
      },
      "warnings": [],
      "errors": []
    },
    "message": "Successfully associated building footprints with cadastral parcels"
  }
  ```
- **Error Cases**:
  - `400 Bad Request`: `{"status": "error", "error_code": "SPATIAL_ASSOCIATION_VALIDATION_FAILED", "message": "Parcel/Building dataset failed validation", "data": null}`
  - `500 Internal Server Error`: `{"status": "error", "error_code": "SPATIAL_ANALYSIS_FAILED", "message": "Internal error occurred while processing geometric spatial association.", "data": null}`

### 2.6 Inspect Digital Elevation Model (DEM)
- **Route**: `GET /elevation/info`
- **Purpose**: Inspects and validates active GeoTIFF DEM metadata, bounding box, pixel resolution, coordinate system, and elevation stats.
- **Request**: Query param `dem_name` (optional string)
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "filename": "demo_elevation.tif",
      "format": "GTiff",
      "width": 60,
      "height": 50,
      "crs": "EPSG:4326",
      "crs_is_projected": false,
      "bounds": [73.8555, 18.5193, 73.8572, 18.5208],
      "resolution": [0.00002833, 0.00003],
      "nodata_value": -9999.0,
      "min_elevation_m": 560.0,
      "max_elevation_m": 565.0,
      "mean_elevation_m": 562.5,
      "vertical_unit": "meters",
      "vertical_reference": "AMSL (Above Mean Sea Level)",
      "tags": { ... }
    },
    "message": "Retrieved metadata for DEM 'demo_elevation.tif'"
  }
  ```

### 2.7 Sample Ground Elevation
- **Route**: `POST /elevation/sample`
- **Purpose**: Deterministically samples ground elevation ($Z_{AMSL}$, meters) at feature centroid coordinates from the DEM raster with explicit CRS reprojection and provenance tracking.
- **Request**: `application/json`
  ```json
  {
    "points": [
      {
        "feature_id": "PARCEL-DEMO-101",
        "longitude": 73.85615,
        "latitude": 18.52012,
        "crs": "EPSG:4326"
      }
    ],
    "dem_name": "demo_elevation.tif"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "dem_name": "demo_elevation.tif",
      "total_samples": 1,
      "successful_samples": 1,
      "outside_coverage_samples": 0,
      "nodata_samples": 0,
      "results": [
        {
          "feature_id": "PARCEL-DEMO-101",
          "elevation_m": 562.22,
          "status": "SUCCESS",
          "source_dem": "demo_elevation.tif",
          "dem_crs": "EPSG:4326",
          "query_coords": [73.85615, 18.52012],
          "transformed_coords": null,
          "sampling_method": "centroid_nearest",
          "vertical_unit": "meters",
          "vertical_reference": "AMSL (Above Mean Sea Level)",
          "metadata": { "raster_row": 22, "raster_col": 23 }
        }
      ]
    },
    "message": "Sampled 1 point(s) against DEM 'demo_elevation.tif'"
  }
  ```
- **Error Cases**:
  - `400 Bad Request`: `{"detail": "Request payload must contain at least one point to sample."}`
  - `404 Not Found`: `{"error_code": "DEM_FILE_NOT_FOUND", "message": "DEM raster not found."}`
  - `500 Internal Server Error`: `{"error_code": "ELEVATION_SAMPLING_FAILED", "message": "Internal error occurred while querying elevation grid."}`

### 2.8 Calculate Building Height
- **Route**: `POST /buildings/calculate-height`
- **Purpose**: Computes structural building height ($H_{bld} = Z_{roof} - Z_{ground}$) with units/reference validation and structural sanity constraints.
- **Request**: `application/json`
  ```json
  {
    "building_id": "BLD-DEMO-001",
    "ground_elevation": 562.48,
    "roof_elevation": 574.48,
    "unit": "meters",
    "ground_reference": "AMSL",
    "roof_reference": "AMSL",
    "source": "SYNTHETIC_DEMO"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "building_id": "BLD-DEMO-001",
    "ground_elevation": 562.48,
    "roof_elevation": 574.48,
    "building_height": 12.0,
    "unit": "meters",
    "source": "SYNTHETIC_DEMO",
    "method": "DIRECT_DIFFERENCE",
    "status": "AVAILABLE",
    "warnings": [],
    "provenance": {
      "building_id": "BLD-DEMO-001",
      "unit": "meters",
      "ground_reference": "AMSL",
      "roof_reference": "AMSL",
      "source": "SYNTHETIC_DEMO",
      "calculation_formula": "roof_elevation - ground_elevation",
      "computed_height": 12.0
    }
  }
  ```
- **Validation Status Codes**: `AVAILABLE`, `UNAVAILABLE` (missing inputs), `INVALID` (negative/zero height, NaN, or $<0.5m$ / $>500m$), `INCONSISTENT` (mismatched units/datums).

### 2.9 Generate Building Floors
- **Route**: `POST /buildings/generate-floors`
- **Purpose**: Generates structured vertical floor levels using Mode A (known floor count) or Mode B (explicit floor heights) with cumulative elevation calculations and tolerance validation.
- **Request**: `application/json`
  ```json
  {
    "building_id": "BLD-DEMO-001",
    "ground_elevation": 562.48,
    "building_height": 12.0,
    "mode": "KNOWN_FLOOR_COUNT",
    "floor_count": 4,
    "ground_floor_name": "Ground Floor",
    "tolerance_m": 0.05
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "building_id": "BLD-DEMO-001",
    "building_height": 12.0,
    "ground_elevation": 562.48,
    "roof_elevation": 574.48,
    "floor_count": 4,
    "floors": [
      {
        "floor_id": "BLD-DEMO-001-FL00",
        "building_id": "BLD-DEMO-001",
        "floor_index": 0,
        "floor_name": "Ground Floor",
        "base_elevation": 562.48,
        "top_elevation": 565.48,
        "floor_height": 3.0,
        "source": "DETERMINISTIC_EQUAL_SLICING",
        "status": "VALID"
      },
      {
        "floor_id": "BLD-DEMO-001-FL01",
        "building_id": "BLD-DEMO-001",
        "floor_index": 1,
        "floor_name": "Floor 1",
        "base_elevation": 565.48,
        "top_elevation": 568.48,
        "floor_height": 3.0,
        "source": "DETERMINISTIC_EQUAL_SLICING",
        "status": "VALID"
      },
      {
        "floor_id": "BLD-DEMO-001-FL02",
        "building_id": "BLD-DEMO-001",
        "floor_index": 2,
        "floor_name": "Floor 2",
        "base_elevation": 568.48,
        "top_elevation": 571.48,
        "floor_height": 3.0,
        "source": "DETERMINISTIC_EQUAL_SLICING",
        "status": "VALID"
      },
      {
        "floor_id": "BLD-DEMO-001-FL03",
        "building_id": "BLD-DEMO-001",
        "floor_index": 3,
        "floor_name": "Floor 3",
        "base_elevation": 571.48,
        "top_elevation": 574.48,
        "floor_height": 3.0,
        "source": "DETERMINISTIC_EQUAL_SLICING",
        "status": "VALID"
      }
    ],
    "validation_status": "VALID",
    "difference_m": 0.0,
    "warnings": []
  }
  ```

### 2.10 Get Demo Building Vertical Specifications
- **Route**: `GET /buildings/demo-specs`
- **Purpose**: Lists deterministic synthetic height and floor parameters for test buildings.

### 2.11 Generate 3D Buildings (Polyhedral Mesh Extrusion)
- **Route**: `POST /buildings/generate-3d`
- **Purpose**: Extrudes 2D building footprint polygons into closed 3D polyhedral meshes with coordinate normalization and geometric validation.
- **Request**: `application/json`
  ```json
  {
    "buildings": [
      {
        "building_id": "BLD-DEMO-001",
        "footprint_geometry": {
          "type": "Polygon",
          "coordinates": [[[73.85606, 18.52006], [73.85624, 18.52006], [73.85624, 18.52018], [73.85606, 18.52018], [73.85606, 18.52006]]]
        },
        "ground_elevation": 562.48,
        "roof_elevation": 574.48,
        "building_height": 12.0,
        "source_crs": "EPSG:4326",
        "target_crs": "EPSG:32643"
      }
    ],
    "target_crs": "EPSG:32643",
    "compute_shared_origin": true
  }
  ```
- **Response**: `200 OK` (Conforms to [`3D_GEOMETRY_CONTRACT.md`](file:///C:/Users/Yatha/.gemini/antigravity/scratch/3d-cadastral-intelligence/3D_GEOMETRY_CONTRACT.md) Schema Version `1.0`)
  ```json
  {
    "schema_version": "1.0",
    "results": [
      {
        "building_id": "BLD-DEMO-001",
        "geometry_status": "VALID",
        "building": {
          "building_id": "BLD-DEMO-001",
          "parcel_id": "PARCEL-DEMO-001",
          "base_elevation": 562.48,
          "top_elevation": 574.48,
          "height": 12.0,
          "height_source": "BUILDING_HEIGHT_SPEC"
        },
        "geometry": {
          "feature_id": "BLD-DEMO-001",
          "feature_type": "BUILDING",
          "geometry_type": "SOLID_COLLECTION",
          "parts": [
            {
              "feature_id": "BLD-DEMO-001_part_0",
              "feature_type": "BUILDING",
              "geometry_type": "SOLID",
              "vertices": [
                [-9.0, -6.0, 0.0],
                [9.0, -6.0, 0.0],
                [9.0, 6.0, 0.0],
                [-9.0, 6.0, 0.0],
                [-9.0, -6.0, 12.0],
                [9.0, -6.0, 12.0],
                [9.0, 6.0, 12.0],
                [-9.0, 6.0, 12.0]
              ],
              "faces": [
                [0, 2, 1], [0, 3, 2],
                [4, 5, 6], [4, 6, 7],
                [0, 1, 5], [0, 5, 4],
                [1, 2, 6], [1, 6, 5],
                [2, 3, 7], [2, 7, 6],
                [3, 0, 4], [3, 4, 7]
              ],
              "coordinate_reference": {
                "horizontal_crs": "EPSG:32643",
                "vertical_reference": "AMSL",
                "source_crs": "EPSG:4326",
                "viewer_origin": [379129.4, 2048157.6, 562.48]
              },
              "units": {
                "horizontal_unit": "meter",
                "vertical_unit": "meter"
              },
              "bounds": {
                "min": [-9.0, -6.0, 0.0],
                "max": [9.0, 6.0, 12.0]
              },
              "winding": "COUNTER_CLOCKWISE",
              "surface_area_sqm": 576.0,
              "volume_cubic_m": 2592.0,
              "metadata": {
                "cadastral_status": "VALID"
              }
            }
          ],
          "bounds": {
            "min": [-9.0, -6.0, 0.0],
            "max": [9.0, 6.0, 12.0]
          },
          "total_volume_cubic_m": 2592.0,
          "total_surface_area_sqm": 576.0
        },
        "warnings": []
      }
    ],
    "summary": {
      "requested": 1,
      "successful": 1,
      "failed": 0
    }
  }
  ```

### 2.12 Extrude Preloaded Demo Buildings
- **Route**: `POST /buildings/extrude-demo`
- **Purpose**: Samples ground elevations from `demo_elevation.tif` for all footprints in `demo_buildings.geojson`, reconciles vertical specifications, and returns batch 3D polyhedral meshes with a unified scene origin conforming to `Generate3DResponse`.
- **Request**: Empty body
- **Response**: `200 OK` (Same schema as `POST /buildings/generate-3d`)

### 2.13 Generate 3D Stratified Floor Solids
- **Route**: `POST /buildings/generate-floors-3d`
- **Purpose**: Extrudes individual floor storeys into watertight 2-manifold closed `Mesh3D` polyhedral solids. Resolves elevations across 3 priority tiers: (1) explicit floor elevations, (2) explicit floor heights, (3) equal vertical slicing ($H_{bld} / N$).
- **Request**: `BatchBuildingFloors3DRequest`
- **Response**: `200 OK` (`GenerateFloors3DResponse`)

### 2.14 Extrude Preloaded Demo Floor Solids
- **Route**: `POST /buildings/extrude-demo-floors`
- **Purpose**: Generates stratified 3D floor solids for all buildings in the demo dataset with shared viewer origin.
- **Request**: Empty body
- **Response**: `200 OK` (`GenerateFloors3DResponse`)

### 2.15 Generate 3D Property Volumes
- **Route**: `POST /properties/generate-volume-3d`
- **Purpose**: Binds cadastral spatial property units to one or more stratified floor solids (including multi-floor duplexes), returning a validated `Mesh3DCollection` with summed enclosed volume and boundary surface area. Validates parcel and building hierarchy containment.
- **Request**: `BatchPropertyVolumeRequest`
- **Response**: `200 OK` (`GeneratePropertyVolumeResponse`)

### 2.16 Get Demo Property Specifications
- **Route**: `GET /properties/demo-properties`
- **Purpose**: Returns synthetic demo property unit definitions (e.g. single-floor units and multi-floor duplexes).
- **Response**: `200 OK` (`List[PropertyVolumeRequest]`)

### 2.17 Extrude Preloaded Demo Property Volumes
- **Route**: `POST /properties/extrude-demo-properties`
- **Purpose**: Extrudes and binds all demo property units into 3D property volumes across the preloaded demo buildings.
- **Request**: Empty body
- **Response**: `200 OK` (`GeneratePropertyVolumeResponse`)

---

## 3. Cadastral Processing & Pipelines

### 3.1 Execute Cadastral Pipeline
- **Route**: `POST /pipeline/process`
- **Purpose**: Runs the complete deterministic workflow: CRS reprojection, polygon extrusion, clash validation, and 3D ULPIN generation.
- **Request**:
  ```json
  {
    "dataset_id": "urban_encroachment",
    "target_epsg": 32643,
    "zoning_max_height": 30.0
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "job_id": "job_01h8x9",
      "parcel_id": "PARCEL-IND-MH-402",
      "status": "COMPLETED",
      "processing_time_ms": 420,
      "summary": {
        "total_volumes_generated": 5,
        "clashes_detected": 1,
        "base_ulpin": "TS09W12A",
        "compliance_status": "FAILED"
      }
    },
    "message": "Pipeline completed successfully"
  }
  ```

### 3.2 Processing Status
- **Route**: `GET /pipeline/status/{job_id}`
- **Purpose**: Polls execution progress (for long-running operations or asynchronous tasks).
- **Request**: Path param `job_id`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "job_id": "job_01h8x9",
      "progress_percent": 100,
      "current_stage": "COMPLETED",
      "error": null
    }
  }
  ```

---

## 4. Cadastral Entities Retrieval

### 4.1 Parcel Retrieval
- **Route**: `GET /parcels/{parcel_id}`
- **Purpose**: Fetches legal 2D parcel boundary polygon, surface metrics, and legal ownership details.
- **Request**: Path param `parcel_id`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "parcel_id": "PARCEL-IND-MH-402",
      "survey_number": "402/2A",
      "ward": "Ward 7, Central District",
      "area_sqm": 842.50,
      "perimeter_m": 118.20,
      "ground_elevation_amsl": 14.50,
      "base_ulpin_2d": "TS09W12A",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.856, 18.520], [73.857, 18.520], ...]]
      }
    }
  }
  ```

### 4.2 Building Retrieval
- **Route**: `GET /parcels/{parcel_id}/buildings`
- **Purpose**: Retrieves all physical structures on a parcel, including footprint geometry and vertical floor schedules.
- **Request**: Path param `parcel_id`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "buildings": [
        {
          "building_id": "BLD-402-01",
          "name": "Tower A",
          "footprint_area_sqm": 225.40,
          "floors_above_ground": 4,
          "floors_below_ground": 1,
          "ground_elevation_amsl": 14.50,
          "floor_height_m": 3.0
        }
      ]
    }
  }
  ```

---

## 5. 3D Model & Mesh Retrieval

### 5.1 3D Volumetric Mesh Retrieval
- **Route**: `GET /parcels/{parcel_id}/3d-model`
- **Purpose**: Supplies Three.js / React Three Fiber with optimized, centroid-normalized polyhedral mesh payloads for WebGL rendering.
- **Request**: Path param `parcel_id`
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "parcel_id": "PARCEL-IND-MH-402",
      "local_origin": { "lat": 18.52043, "lon": 73.85674, "alt": 14.50 },
      "volumes": [
        {
          "volume_id": "VOL-402-FL01",
          "stratum_type": "ABV",
          "floor_number": 1,
          "elevation_bounds": [14.50, 17.50],
          "volume_m3": 676.20,
          "prototype_3d_ulpin": "IND-CAD-TS09W12A-ABV-0000-0030-FL01",
          "mesh": {
            "vertices": [0.0, 0.0, 0.0, 15.0, 0.0, 0.0, ...],
            "indices": [0, 1, 2, 0, 2, 3, ...]
          }
        }
      ],
      "bounding_parcel_column": {
        "mesh": {
          "vertices": [...],
          "indices": [...]
        }
      }
    }
  }
  ```

---

## 6. Spatial Validation

### 6.1 Run Spatial Validation
- **Route**: `POST /validation/run`
- **Purpose**: Executes deterministic containment, vertical overhang, inter-volume collision, and height restriction tests.
- **Request**:
  ```json
  {
    "parcel_id": "PARCEL-IND-MH-402"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "validation_id": "VAL-20260906-001",
      "parcel_id": "PARCEL-IND-MH-402",
      "overall_status": "FAILED",
      "checks": [
        {
          "check_code": "PARCEL_CONTAINMENT",
          "status": "PASSED",
          "message": "Ground footprint is completely contained within parcel boundaries."
        },
        {
          "check_code": "VERTICAL_OVERHANG",
          "status": "FAILED",
          "message": "Floor 3 cantilever overhang encroaches 1.4m past eastern parcel boundary."
        },
        {
          "check_code": "HEIGHT_RESTRICTION",
          "status": "PASSED",
          "message": "Max building height (12.0m) is within 30.0m zoning limit."
        }
      ],
      "clashes": [
        {
          "clash_id": "CLASH-01",
          "clash_type": "VERTICAL_OVERHANG",
          "affected_volume_id": "VOL-402-FL03",
          "encroachment_area_sqm": 12.60,
          "encroachment_volume_m3": 37.80,
          "elevation_interval": [23.50, 26.50],
          "clash_mesh": {
            "vertices": [...],
            "indices": [...]
          }
        }
      ]
    }
  }
  ```

---

## 7. 3D ULPIN Prototype Services

> [!IMPORTANT]
> **CRITICAL SEMANTIC NOTICE**: The 3D ULPIN Prototype is a project-specific deterministic identifier design for validated 3D cadastral property entities. It is NOT an official Government of India ULPIN specification.

### 7.1 Generate 3D ULPIN Prototype
- **Route**: `POST /properties/generate-ulpin` (also available via `POST /ulpin/generate`)
- **Purpose**: Generates a versioned, deterministic 3D ULPIN prototype identifying the cadastral property entity.
- **Request**:
  ```json
  {
    "property_id": "PROP-DEMO-101-U01",
    "parcel_id": "PARCEL-DEMO-101",
    "building_id": "BLD-DEMO-001",
    "floor_ids": ["BLD-DEMO-001-FL00"],
    "source_identity": "cadastral_spatial_record"
  }
  ```
- **Response**:
  ```json
  {
    "schema_version": "1.0",
    "identifier_version": "1",
    "ulpin": "3DULPIN-V1-9457DE1DBBBEB319BAE64DA99B35C83FEA80A6C289569BF383B38A82A5BC6C6F",
    "property_id": "PROP-DEMO-101-U01",
    "parcel_id": "PARCEL-DEMO-101",
    "building_ids": ["BLD-DEMO-001"],
    "floor_ids": ["BLD-DEMO-001-FL00"],
    "identifier_status": "VALID",
    "canonical_identity": "3DULPIN|v1|property:PROP-DEMO-101-U01|parcel:PARCEL-DEMO-101|buildings:BLD-DEMO-001|floors:BLD-DEMO-001-FL00",
    "disclaimer": "3D ULPIN Prototype — Project-specific deterministic identifier design for demonstration purposes. Not an official Government of India ULPIN specification.",
    "warnings": []
  }
  ```

### 7.2 Verify 3D ULPIN Prototype
- **Route**: `POST /properties/verify-ulpin` (also available via `POST /ulpin/verify`)
- **Purpose**: Cryptographically verifies whether a provided 3D ULPIN string matches the canonical property identity.
- **Request**:
  ```json
  {
    "ulpin": "3DULPIN-V1-9457DE1DBBBEB319BAE64DA99B35C83FEA80A6C289569BF383B38A82A5BC6C6F",
    "property_id": "PROP-DEMO-101-U01",
    "parcel_id": "PARCEL-DEMO-101",
    "building_ids": ["BLD-DEMO-001"],
    "floor_ids": ["BLD-DEMO-001-FL00"]
  }
  ```
- **Response**:
  ```json
  {
    "verified": true,
    "match": true,
    "provided_ulpin": "3DULPIN-V1-9457DE1DBBBEB319BAE64DA99B35C83FEA80A6C289569BF383B38A82A5BC6C6F",
    "expected_ulpin": "3DULPIN-V1-9457DE1DBBBEB319BAE64DA99B35C83FEA80A6C289569BF383B38A82A5BC6C6F",
    "property_id": "PROP-DEMO-101-U01",
    "details": "ULPIN matches canonical property identity exactly."
  }
  ```

### 7.3 Retrieve Demo 3D ULPIN Prototypes
- **Route**: `GET /properties/demo-ulpins`
- **Purpose**: Returns precomputed 3D ULPIN prototypes across all standard demonstration property entities.
- **Response**: List of `ULPINResult` objects.

### 7.4 Batch Generate 3D ULPINs
- **Route**: `POST /ulpin/batch`
- **Purpose**: Generates 3D ULPIN prototypes across multiple property requests in a single batch.
- **Response**: `BatchULPINResponse` with results and summary metrics.

---

## 8. Auxiliary AI Explainer (Optional / Non-Authoritative)

### 8.1 Explain Validation Report
- **Route**: `POST /ai/explain`
- **Purpose**: Uses Gemini to generate a plain-English briefing for municipal officers explaining detected cadastral issues.
- **Request**:
  ```json
  {
    "validation_id": "VAL-20260906-001"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "summary_markdown": "### Cadastral Audit Briefing\n\n**Status**: Action Required (Encroachment Detected)\n\nThe audit identified a **vertical overhang violation on Floor 3**. The building's eastern balcony projects 1.4 meters past the legal cadastral boundary column, creating an unauthorized 37.8 cubic meter encroachment into the adjacent airspace.\n\n*Disclaimer: This AI summary is advisory and does not constitute a legal certification.*",
      "is_authoritative": false
    }
  }
  ```

## 9. Unit / Apartment Domain Entity Endpoints

### 9.1 Validate Unit Entity
- **Route**: `POST /units/validate`
- **Purpose**: Validates structural hierarchy, vertical containment within parent floor, footprint containment within parent building, and footprint validity.
- **Request**: `UnitValidationRequest` (unit entity, optional parent floor spec and building footprint)
- **Response**: `UnitValidationResult` (`valid: boolean`, `status: VALID | INVALID`, `errors: []`, `warnings: []`)

### 9.2 Batch Validate Units
- **Route**: `POST /units/validate-batch`
- **Purpose**: Validates multiple units on a floor, checking mutual non-overlap and duplicate unit numbers.
- **Request**: `UnitBatchValidationRequest`
- **Response**: `UnitBatchValidationResponse` (summary counts and individual results)

### 9.3 Get Reference Demo Units
- **Route**: `GET /units/demo`
- **Purpose**: Returns GeoJSON FeatureCollection of reference synthetic demo units (`demo_units.geojson`) on Floor 5 of `BLD-DEMO-002`.
- **Response**: GeoJSON FeatureCollection with `Unit` properties and CRS metadata.

### 9.4 Query Units by Building
- **Route**: `GET /units/building/{building_id}`
- **Purpose**: Retrieves all units mapped under a specific building.
- **Response**: List of `Unit` objects.

### 9.5 Query Units by Floor
- **Route**: `GET /units/floor/{floor_id}`
- **Purpose**: Retrieves all units mapped under a specific floor stratum.
- **Response**: List of `Unit` objects.

### 9.6 Get Conceptual 3D Property Record
- **Route**: `GET /units/property-record/{unit_id}`
- **Purpose**: Generates a conceptual 3D Property Record for an apartment unit with explicit non-ownership legal disclaimer.
- **Response**: `UnitPropertyRecord`

### 9.7 Generate 3D Unit Volumes (Polyhedral Mesh Extrusion)
- **Route**: `POST /units/generate-3d`
- **Purpose**: Extrudes 2D unit footprint boundaries into closed, watertight 2-manifold `Mesh3D` polyhedral solids (`feature_type="UNIT"`). Performs mutual non-overlap verification across units on the same floor (allowing shared party-wall touching) and validates closed solid mesh volumes against analytical prism volumes ($A_{footprint} \times h$).
- **Request**: `BatchUnit3DRequest`
  ```json
  {
    "units": [
      {
        "unit_id": "BLD-DEMO-002-FL05-U501",
        "unit_number": "501",
        "floor_id": "BLD-DEMO-002-FL05",
        "building_id": "BLD-DEMO-002",
        "footprint_geometry": {
          "type": "Polygon",
          "coordinates": [[[73.8568, 18.5204], [73.8569, 18.5204], [73.8569, 18.5205], [73.8568, 18.5205], [73.8568, 18.5204]]]
        },
        "base_elevation": 577.48,
        "top_elevation": 580.48,
        "height": 3.0,
        "parent_floor_base": 577.48,
        "parent_floor_top": 580.48,
        "source_crs": "EPSG:4326",
        "target_crs": "EPSG:32643"
      }
    ],
    "target_crs": "EPSG:32643",
    "compute_shared_origin": true
  }
  ```
- **Response**: `200 OK` (`GenerateUnits3DResponse` conforming to Canonical 3D Geometry Contract v1.0)
  ```json
  {
    "schema_version": "1.0",
    "results": [
      {
        "unit_id": "BLD-DEMO-002-FL05-U501",
        "unit_number": "501",
        "floor_id": "BLD-DEMO-002-FL05",
        "building_id": "BLD-DEMO-002",
        "geometry_status": "VALID",
        "unit": {
          "unit_id": "BLD-DEMO-002-FL05-U501",
          "unit_number": "501",
          "floor_id": "BLD-DEMO-002-FL05",
          "building_id": "BLD-DEMO-002",
          "base_elevation": 577.48,
          "top_elevation": 580.48,
          "height": 3.0,
          "footprint_area_sqm": 85.2
        },
        "geometry": {
          "feature_id": "BLD-DEMO-002-FL05-U501",
          "feature_type": "UNIT",
          "geometry_type": "SOLID",
          "vertices": [[...]],
          "faces": [[...]],
          "bounds": { "min": [...], "max": [...] },
          "winding": "COUNTER_CLOCKWISE",
          "volume_cubic_m": 255.6,
          "surface_area_sqm": 128.4
        },
        "warnings": []
      }
    ],
    "summary": {
      "requested": 1,
      "successful": 1,
      "failed": 0
    },
    "warnings": []
  }
  ```

### 9.8 Extrude Preloaded Demo Unit Solids
- **Route**: `GET /units/demo-3d`
- **Purpose**: Generates canonical 3D extruded solids for all synthetic reference units in `data/processed/demo_units.geojson` (Units 501, 502, 503, 504 on Floor 5 of `BLD-DEMO-002`) with a shared local coordinate origin.
- **Request**: None
- **Response**: `200 OK` (`GenerateUnits3DResponse`)

