/**
 * Multi-Source Georeferencing & Spatial Data Fusion TypeScript Definitions.
 */

export type SourceType =
  | "CADASTRAL_GIS"
  | "BUILDING_FOOTPRINT"
  | "OSM"
  | "DEM"
  | "DSM"
  | "LIDAR"
  | "FLOOR_PLAN"
  | "GNSS_CORS"
  | "DRONE_AERIAL";

export type SourceStatus =
  | "AVAILABLE"
  | "LOADED"
  | "VALIDATED"
  | "UNAVAILABLE"
  | "ERROR";

export type FusionStatus = "VALID" | "PARTIAL" | "WARNING" | "INVALID";

export type FusionQualityLevel = "FULL" | "PARTIAL" | "LIMITED" | "INVALID";

export type ConflictSeverity = "CRITICAL" | "WARNING" | "NOTICE";

export interface TransformationRecord {
  source_crs: string;
  target_crs: string;
  transformed: boolean;
  method: string;
  timestamp: string;
}

export interface DatasetMetadata {
  dataset_id: string;
  source_type: SourceType;
  source_format: string;
  source_crs: string;
  target_crs?: string | null;
  bounds?: [number, number, number, number] | null;
  units?: { horizontal?: string; vertical?: string };
  is_cadastral: boolean;
  acquisition_info?: Record<string, unknown> | null;
  provenance: Record<string, unknown>;
  status: SourceStatus;
}

export interface GNSSReferencePoint {
  station_id: string;
  name?: string | null;
  coordinates: number[];
  elevation?: number | null;
  elevation_reference?: string | null;
  crs: string;
  source_info?: Record<string, unknown> | null;
  status: string;
}

export interface LiDARSourceReference {
  source_id: string;
  crs: string;
  total_points: number;
  bounds?: [number, number, number, number] | null;
  classifications: string[];
  point_density_per_sqm?: number | null;
  vertical_reference?: string | null;
  source_format: string;
  provenance: Record<string, unknown>;
}

export interface SpatialConflict {
  conflict_id: string;
  conflict_type: string;
  severity: ConflictSeverity;
  affected_entities: string[];
  message: string;
  details?: Record<string, unknown> | null;
}

export interface FusedBuildingContext {
  building_id: string;
  is_cadastral: boolean;
  legal_status: string;
  source_type: SourceType;
  source_crs: string;
  source_geometry: Record<string, unknown>;
  project_crs: string;
  projected_geometry: Record<string, unknown>;
  bounds: [number, number, number, number];
  footprint_area_sqm: number;
  associated_parcel_id?: string | null;
  association_status?: string | null;
  overlap_percentage?: number | null;
  ground_elevation?: number | null;
  ground_elevation_source?: string | null;
  lidar_evidence?: Record<string, unknown> | null;
  building_height?: number | null;
  height_source?: string | null;
  floors_count?: number | null;
  floors: Record<string, unknown>[];
  units: Record<string, unknown>[];
  provenance: Record<string, unknown>;
  status: string;
}

export interface FusedPropertyContext {
  context_id: string;
  schema_version: string;
  target_project_crs: string;
  parcel?: Record<string, unknown> | null;
  buildings: FusedBuildingContext[];
  elevation_source?: Record<string, unknown> | null;
  lidar_source?: LiDARSourceReference | null;
  gnss_reference?: GNSSReferencePoint | null;
  source_datasets: DatasetMetadata[];
  source_alignment: Record<string, boolean>;
  fusion_status: FusionStatus;
  quality_level: FusionQualityLevel;
  conflicts: SpatialConflict[];
  warnings: string[];
  provenance: Record<string, unknown>[];
}

export interface FusionValidateRequest {
  datasets: DatasetMetadata[];
  target_crs?: string | null;
}

export interface FusionValidateResponse {
  valid: boolean;
  target_crs: string;
  target_crs_is_projected: boolean;
  sources_evaluated: number;
  source_alignment: Record<string, boolean>;
  suggested_target_crs?: string | null;
  warnings: string[];
  errors: string[];
}

export interface FusionNormalizeRequest {
  features: Record<string, unknown>[];
  source_crs?: string;
  target_crs?: string;
}

export interface FusionNormalizeResponse {
  target_crs: string;
  normalized_features: Record<string, unknown>[];
  transformations: TransformationRecord[];
}

export interface PropertyContextRequest {
  parcel_id?: string | null;
  building_ids?: string[] | null;
  target_crs?: string;
  include_lidar?: boolean;
  include_elevation?: boolean;
  include_floors?: boolean;
  include_units?: boolean;
  include_gnss?: boolean;
}

export interface PropertyContextResponse {
  schema_version: string;
  context: FusedPropertyContext;
  message: string;
}
