/**
 * Frontend TypeScript definitions for the Unit / Apartment Domain Entity.
 * Conforms to the Cadastral Hierarchy specification:
 * PARCEL -> BUILDING -> FLOOR -> UNIT -> 3D VOLUME -> 3D ULPIN
 *
 * Semantic Rule:
 * A unit represents a spatial subdivision of a floor/building supported by available spatial evidence.
 * Physical unit geometry does NOT establish legal ownership.
 */

import type {
  Geometry3DStatus,
  Mesh3DCollection,
  BatchSummary3D,
} from "./geometry3d";

export type UnitType =
  | "APARTMENT_UNIT"
  | "RESIDENTIAL_UNIT"
  | "OFFICE"
  | "SHOP"
  | "OTHER";

export type UnitStatus = "VALID" | "INVALID" | "UNAVAILABLE";

export type UnitSourceType =
  | "FLOOR_PLAN"
  | "SURVEY"
  | "BUILDING_MODEL"
  | "DERIVED"
  | "DEMO"
  | "DRONE"
  | "LIDAR"
  | "AI_EXTRACTION";

export interface Unit {
  unit_id: string;
  dataset_id?: string;
  property_id?: string | null;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  unit_name?: string | null;
  unit_type: UnitType;
  geometry_2d?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  geometry_3d?: unknown | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  footprint_area?: number | null;
  area_sqm?: number | null;
  volume_cubic_m?: number | null;
  z_min?: number | null;
  z_max?: number | null;
  spatial_id?: string;
  geometry_status?: string;
  source: string;
  source_type: UnitSourceType;
  status: UnitStatus;
  warnings: string[];
  provenance: Record<string, unknown>;
}

export interface UnitValidationResult {
  unit_id: string;
  valid: boolean;
  status: UnitStatus;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export interface UnitBatchValidationResponse {
  total_units: number;
  valid_units: number;
  invalid_units: number;
  unavailable_units: number;
  results: UnitValidationResult[];
}

export interface UnitPropertyRecord {
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_id: string;
  unit_number: string;
  unit_name?: string | null;
  canonical_parcel_id?: string;
  canonical_building_id?: string;
  canonical_floor_id?: string;
  canonical_unit_id?: string;
  canonical_path?: string;
  property_id?: string | null;
  property_record_reference?: string;
  z_range_amsl: {
    min_z: number;
    max_z: number;
  };
  volume_cubic_m?: number | null;
  footprint_area_sqm?: number | null;
  status: UnitStatus;
  ulpin_prototype?: string | null;
  ulpin_status?: string | null;
  disclaimer: string;
}

export interface UnitFeatureCollection {
  type: "FeatureCollection";
  name?: string;
  metadata?: Record<string, unknown>;
  features: Array<{
    type: "Feature";
    id: string;
    properties: Unit;
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }>;
}

export interface Unit3DRequest {
  unit_id: string;
  property_id?: string | null;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  unit_name?: string | null;
  unit_type?: UnitType;
  geometry_2d?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  parent_floor_base?: number | null;
  parent_floor_top?: number | null;
  source_crs?: string;
  target_crs?: string | null;
  scene_origin?: [number, number, number] | null;
}

export interface BatchUnit3DRequest {
  units: Unit3DRequest[];
  target_crs?: string | null;
  compute_shared_origin?: boolean;
}

export interface Unit3DResult {
  unit_id: string;
  dataset_id?: string;
  property_id?: string | null;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  unit_name?: string | null;
  unit_type: UnitType;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  footprint_area?: number | null;
  volume_cubic_m?: number | null;
  surface_area_sqm?: number | null;
  spatial_id?: string;
  z_min?: number | null;
  z_max?: number | null;
  geometry_status: Geometry3DStatus;
  geometry?: Mesh3DCollection | null;
  warnings: string[];
  provenance: Record<string, unknown>;
}

export interface UnitCreateRequest {
  unit_id?: string;
  dataset_id: string;
  parcel_id?: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  unit_name?: string;
  unit_type?: UnitType;
  geometry_2d: {
    type: "Polygon";
    coordinates: number[][][];
  };
  base_elevation: number;
  top_elevation: number;
  parent_floor_geometry?: {
    type: string;
    coordinates: unknown;
  };
  source?: string;
}

export interface UnitDeleteResponse {
  status: string;
  message: string;
  dataset_id: string;
  building_id: string;
  floor_id: string;
  unit_id: string;
}

export interface UnitListResponse {
  dataset_id: string;
  building_id?: string;
  floor_id?: string;
  total_count: number;
  units: Unit[];
}

export interface GenerateUnits3DResponse {
  schema_version: string;
  results: Unit3DResult[];
  summary: BatchSummary3D;
}


