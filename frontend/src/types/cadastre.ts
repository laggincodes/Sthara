export interface GeometryValidationIssue {
  feature_index: number;
  issue_type: string;
  message: string;
  coordinates_hint?: [number, number] | null;
}

export interface GeoJSONValidationResult {
  valid: boolean;
  feature_count: number;
  geometry_types: string[];
  crs: string;
  crs_source: string;
  crs_is_projected: boolean;
  suggested_projected_crs?: string | null;
  errors: GeometryValidationIssue[];
  warnings: string[];
}

export interface NormalizedParcel {
  parcel_id: string;
  is_system_generated_id: boolean;
  detected_id_field?: string | null;
  geometry_type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  bounds: [number, number, number, number];
  area: number;
  area_unit: string;
  centroid: [number, number];
  properties: Record<string, unknown>;
}

export interface NormalizedParcelDataset {
  dataset_id: string;
  source_filename?: string | null;
  crs: string;
  crs_source: string;
  total_parcels: number;
  parcels: NormalizedParcel[];
  validation: GeoJSONValidationResult;
}

export interface DatasetSummary {
  dataset_id: string;
  name: string;
  description: string;
  feature_count: number;
  is_demo: boolean;
  source: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  status: "error";
  error_code: string;
  message: string;
  details?: unknown;
  data?: {
    validation?: GeoJSONValidationResult;
    source_filename?: string;
  };
}

export interface GeoJSONFeature {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  metadata?: Record<string, unknown>;
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
}

export type BuildingAssociationStatus =
  | "WITHIN"
  | "INTERSECTS"
  | "MULTI_PARCEL"
  | "OUTSIDE"
  | "UNRESOLVED";

export interface ParcelOverlapDetail {
  parcel_id: string;
  intersection_area_sqm: number;
  overlap_percentage: number;
}

export interface BuildingAssociationResult {
  building_id: string;
  is_system_generated_id: boolean;
  geometry_type: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  bounds: [number, number, number, number];
  building_area_sqm: number;
  centroid: [number, number];
  associated_parcel_id: string | null;
  association_status: BuildingAssociationStatus;
  overlap_percentage: number;
  overlaps: ParcelOverlapDetail[];
  properties: Record<string, unknown>;
}

export interface BuildingAssociationSummary {
  total_parcels: number;
  total_buildings: number;
  associated_buildings: number;
  unresolved_buildings: number;
  outside_buildings: number;
  multi_parcel_buildings: number;
  projected_crs: string;
}

export interface SpatialAssociationResponse {
  summary: BuildingAssociationSummary;
  associations: BuildingAssociationResult[];
  parcel_building_map: Record<string, string[]>;
  warnings: string[];
  errors: string[];
}

export interface SpatialAssociationRequest {
  parcels: GeoJSONFeatureCollection;
  buildings: GeoJSONFeatureCollection;
  target_crs?: string;
}

export type ElevationStatus =
  | "SUCCESS"
  | "OUTSIDE_COVERAGE"
  | "NODATA"
  | "UNAVAILABLE";

export interface ElevationSamplePoint {
  feature_id?: string;
  longitude: number;
  latitude: number;
  crs?: string;
}

export interface ElevationSampleResult {
  feature_id?: string;
  elevation_m: number | null;
  status: ElevationStatus;
  source_dem: string;
  dem_crs: string;
  query_coords: [number, number];
  transformed_coords?: [number, number] | null;
  sampling_method: string;
  vertical_unit: string;
  vertical_reference: string;
  metadata?: Record<string, unknown>;
}

export interface ElevationBatchSampleRequest {
  points: ElevationSamplePoint[];
  dem_name?: string;
}

export interface ElevationBatchSampleResponse {
  dem_name: string;
  total_samples: number;
  successful_samples: number;
  outside_coverage_samples: number;
  nodata_samples: number;
  results: ElevationSampleResult[];
}

export interface DEMMetadata {
  filename: string;
  format: string;
  width: number;
  height: number;
  crs: string;
  crs_is_projected: boolean;
  bounds: [number, number, number, number];
  resolution: [number, number];
  nodata_value: number | null;
  min_elevation_m: number;
  max_elevation_m: number;
  mean_elevation_m: number;
  vertical_unit: string;
  vertical_reference: string;
  tags: Record<string, string>;
}

// Step 9: Building Height & Floor Foundation Models
export type HeightStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "INVALID"
  | "INCONSISTENT"
  | "ESTIMATED";

export type HeightSource =
  | "SYNTHETIC_DEMO"
  | "DSM"
  | "LIDAR"
  | "SURVEY"
  | "MANUAL_INPUT"
  | "FLOOR_METADATA";

export type HeightMethod =
  | "DIRECT_DIFFERENCE"
  | "ELEVATION_SUBTRACTION"
  | "FLOOR_MULTIPLICATION"
  | "SURVEY_SPECIFIED";

export interface HeightCalculationRequest {
  building_id: string;
  ground_elevation?: number | null;
  roof_elevation?: number | null;
  unit?: string;
  ground_reference?: string;
  roof_reference?: string;
  source?: HeightSource;
}

export interface HeightCalculationResult {
  building_id: string;
  ground_elevation: number | null;
  roof_elevation: number | null;
  building_height: number | null;
  unit: string;
  source: HeightSource;
  method: HeightMethod;
  status: HeightStatus;
  warnings: string[];
  provenance: Record<string, unknown>;
}

export interface Floor {
  floor_id: string;
  building_id: string;
  floor_index: number;
  floor_name: string;
  base_elevation: number;
  top_elevation: number;
  floor_height: number;
  source: string;
  status: string;
}

export type FloorValidationStatus =
  | "VALID"
  | "HEIGHT_MISMATCH"
  | "INCOMPLETE"
  | "INVALID";

export type FloorGenerationMode =
  | "KNOWN_FLOOR_COUNT"
  | "EXPLICIT_FLOOR_HEIGHTS";

export interface FloorGenerationRequest {
  building_id: string;
  ground_elevation: number;
  building_height?: number | null;
  roof_elevation?: number | null;
  mode?: FloorGenerationMode;
  floor_count?: number | null;
  floor_heights?: number[] | null;
  ground_floor_name?: string;
  tolerance_m?: number;
}

export interface FloorGenerationResponse {
  building_id: string;
  building_height: number;
  ground_elevation: number;
  roof_elevation: number;
  floor_count: number;
  floors: Floor[];
  validation_status: FloorValidationStatus;
  difference_m: number;
  warnings: string[];
}

export interface BuildingVerticalSpec {
  building_id: string;
  name: string;
  structure_type: string;
  roof_elevation: number;
  building_height: number;
  number_of_floors: number;
  floor_height: number;
  height_source: HeightSource;
  vertical_datum: string;
  height_unit: string;
  legal_disclaimer: string;
}

export * from "./geometry3d";
export * from "./property_volume";
export * from "./ulpin";
export * from "./unit";
export * from "./fusion";
export * from "./ai_extraction";
export * from "./underground";
export * from "./topology";

// OSM file upload result
export interface OsmUploadSummary {
  source_file: string;
  osm_bounds_header: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  } | null;
  total_osm_nodes: number;
  total_osm_ways: number;
  total_osm_relations: number;
  total_extracted_buildings: number;
  ways_extracted: number;
  relations_extracted: number;
  degenerate_or_skipped: number;
  buildings_with_height: number;
  buildings_with_height_pct: number;
  buildings_with_levels: number;
  buildings_with_levels_pct: number;
  bounding_box: {
    min_longitude: number;
    min_latitude: number;
    max_longitude: number;
    max_latitude: number;
    bbox: [number, number, number, number];
  } | null;
  validation: {
    valid: boolean;
    errors_count: number;
    warnings_count: number;
    errors: unknown[];
    warnings: string[];
  };
}

export interface OsmUploadResult {
  status: string;
  message: string;
  source_filename: string;
  output_file: string;
  data: {
    summary: OsmUploadSummary;
    feature_count: number;
    is_cadastral: false;
    legal_status: string;
    data_type: string;
    source: string;
  };
}

// OSM -> 3D Pipeline & Export Types
export type HeightSourceOption = "automatic" | "osm_height" | "building_levels" | "default";
export type ExportFormatOption = "glb" | "gltf" | "both";

export interface Osm3DConversionConfig {
  source_file?: string | null;
  height_source: HeightSourceOption;
  default_floor_height_m: number;
  default_building_height_m: number;
  target_crs: string;
  export_format: ExportFormatOption;
}

export interface ConversionStageReport {
  stage: string;
  status: "pending" | "running" | "complete" | "failed";
  message?: string | null;
  features?: number | null;
  vertices?: number | null;
  faces?: number | null;
  duration_ms?: number | null;
  details?: Record<string, unknown> | null;
}

export interface BuildingMetadataItem {
  building_id: string;
  osm_id?: string | null;
  name?: string | null;
  height: number;
  levels?: number | null;
  height_source: string;
  area_sqm: number;
  volume_cubic_m: number;
  source: string;
  is_cadastral: boolean;
}

export interface Osm3DConversionSummary {
  buildings: number;
  vertices: number;
  faces: number;
  surface_area_sqm: number;
  volume_cubic_m: number;
  processing_time_s: number;
  bounding_box?: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
  target_crs: string;
  source_crs: string;
  viewer_origin: [number, number, number];
}

export interface Osm3DConversionResponse {
  success: boolean;
  source_name: string;
  target_crs: string;
  viewer_origin: [number, number, number];
  summary: Osm3DConversionSummary;
  stages: ConversionStageReport[];
  glb_url?: string | null;
  gltf_url?: string | null;
  metadata_url?: string | null;
  buildings_metadata: BuildingMetadataItem[];
  mesh_data?: import("./geometry3d").Generate3DResponse | null;
}






