/**
 * Underground & Subsurface Spatial Modeling TypeScript Types.
 * 
 * Strict mirroring of backend Pydantic schemas (Step 20).
 * Supports basements, underground utilities, subsurface volumes,
 * clash detection, and cutaway visualization.
 */

import { Mesh3D, Mesh3DCollection, Geometry3DStatus } from "./cadastre";

export type UndergroundFeatureType =
  | "BASEMENT"
  | "UNDERGROUND_UTILITY"
  | "SUBSURFACE_VOLUME"
  | "PARKING_VAULT"
  | "METRO_TUNNEL"
  | "FOUNDATION_PIER"
  | "PEDESTRIAN_SUBWAY"
  | "OTHER_SUBSURFACE";

export type UtilityType =
  | "WATER_SUPPLY"
  | "SEWERAGE"
  | "STORMWATER"
  | "ELECTRICITY_POWER"
  | "TELECOMMUNICATIONS"
  | "GAS_PIPELINE"
  | "DISTRICT_COOLING"
  | "OTHER_UTILITY";

export type UndergroundConflictClass =
  | "ALLOWED_INTERSECTION"
  | "REVIEW_REQUIRED"
  | "INVALID_OVERLAP";

export type UndergroundSpatialStatus =
  | "WITHIN"
  | "INTERSECTS"
  | "OUTSIDE"
  | "UNRESOLVED";

export interface UndergroundProvenance {
  source_dataset: string;
  source_type: string;
  source_file?: string | null;
  crs: string;
  vertical_datum: string;
  survey_method?: string | null;
  created_at: string;
}

export interface UndergroundFeature {
  underground_feature_id: string;
  feature_type: UndergroundFeatureType;
  utility_type?: UtilityType | null;
  parcel_id: string;
  building_id?: string | null;
  property_id?: string | null;
  name: string;
  source: string;
  source_type: string;
  ground_elevation_m: number;
  top_elevation_m: number;
  base_elevation_m: number;
  depth_to_top_m: number;
  depth_to_base_m: number;
  thickness_m: number;
  geometry_2d?: GeoJSON.Geometry | Record<string, unknown> | null;
  mesh_3d?: Mesh3D | Mesh3DCollection | null;
  geometry_status: Geometry3DStatus;
  spatial_status: UndergroundSpatialStatus;
  is_cadastral_property: boolean;
  provenance: UndergroundProvenance;
  warnings: string[];
}

export interface UndergroundValidationRequest {
  feature: UndergroundFeature;
  parcel_geometry?: GeoJSON.Geometry | Record<string, unknown> | null;
  building_geometry?: GeoJSON.Geometry | Record<string, unknown> | null;
}

export interface UndergroundValidationResponse {
  underground_feature_id: string;
  is_valid: boolean;
  spatial_status: UndergroundSpatialStatus;
  depth_consistent: boolean;
  geometry_valid: boolean;
  validation_errors: string[];
  warnings: string[];
}

export interface Underground3DRequest {
  underground_feature_id: string;
  feature_type: UndergroundFeatureType;
  utility_type?: UtilityType | null;
  footprint_geometry: GeoJSON.Geometry | Record<string, unknown>;
  ground_elevation_m: number;
  top_elevation_m: number;
  base_elevation_m: number;
  target_crs?: string;
  source_crs?: string;
  corridor_buffer_m?: number | null;
}

export interface Underground3DResult {
  underground_feature_id: string;
  feature_type: UndergroundFeatureType;
  geometry_status: Geometry3DStatus;
  mesh_3d?: Mesh3D | Mesh3DCollection | null;
  volume_cubic_m: number;
  depth_to_top_m: number;
  depth_to_base_m: number;
  warnings: string[];
  errors: string[];
}

export interface GenerateUnderground3DResponse {
  schema_version: string;
  total_requested: number;
  successful: number;
  failed: number;
  results: Underground3DResult[];
  errors: string[];
}

export interface UndergroundConflictRecord {
  feature_a_id: string;
  feature_b_id: string;
  feature_a_type: UndergroundFeatureType;
  feature_b_type: UndergroundFeatureType;
  conflict_class: UndergroundConflictClass;
  horizontal_overlap_area_m2: number;
  vertical_clearance_m: number;
  is_3d_clash: boolean;
  resolution_recommendation: string;
}

export interface UndergroundConflictRequest {
  candidate_feature: UndergroundFeature;
  existing_features: UndergroundFeature[];
  clearance_threshold_m?: number;
}

export interface UndergroundConflictResponse {
  candidate_feature_id: string;
  total_conflicts_found: number;
  has_invalid_clash: boolean;
  conflicts: UndergroundConflictRecord[];
  summary_message: string;
}

export interface DemoUndergroundResponse {
  schema_version: string;
  parcel_id: string;
  building_id: string;
  features: UndergroundFeature[];
  total_features: number;
  basement_count: number;
  utility_count: number;
  vertical_datum: string;
  disclaimer: string;
}
