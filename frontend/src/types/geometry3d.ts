/**
 * Canonical 3D Geometry Contract (v1.0)
 * Single source of truth for 3D solid geometry exchange between FastAPI and React Three Fiber.
 */

export const SCHEMA_VERSION = "1.0";

export type Geometry3DStatus = "VALID" | "INVALID" | "UNAVAILABLE";

export type FeatureType =
  | "BUILDING"
  | "FLOOR"
  | "PROPERTY_VOLUME"
  | "UNDERGROUND"
  | "UNIT";

export type GeometryType = "SOLID" | "SOLID_COLLECTION";

export type FaceWinding = "COUNTER_CLOCKWISE";

export type GeometryValidationErrorType =
  | "INVALID_VERTEX"
  | "INVALID_FACE_INDEX"
  | "DEGENERATE_FACE"
  | "OPEN_SOLID"
  | "INVALID_ELEVATION"
  | "INVALID_CRS"
  | "ZERO_AREA_FACE"
  | "NON_FINITE_COORDINATE";

export interface CoordinateReference {
  horizontal_crs: string;
  vertical_reference: string | null;
  source_crs: string;
  viewer_origin: [number, number, number];
}

export interface UnitReference {
  horizontal_unit: string;
  vertical_unit: string;
}

export interface Bounds3D {
  min: [number, number, number];
  max: [number, number, number];
}

export interface Mesh3D {
  feature_id: string;
  feature_type: FeatureType;
  geometry_type: GeometryType;
  vertices: number[][]; // [x, y, z] relative to viewer_origin
  faces: number[][];    // [v0, v1, v2] triangulated with COUNTER_CLOCKWISE winding
  coordinate_reference: CoordinateReference;
  units: UnitReference;
  bounds: Bounds3D;
  winding: FaceWinding;
  surface_area_sqm?: number | null;
  volume_cubic_m?: number | null;
}

export interface Mesh3DCollection {
  parts: Mesh3D[];
  bounds: Bounds3D;
  total_volume_cubic_m?: number | null;
  total_surface_area_sqm?: number | null;
}

export interface BuildingAttributes3D {
  building_id: string;
  parcel_id?: string | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  height_source: string;
}

export interface Building3DResult {
  building_id: string;
  geometry_status: Geometry3DStatus;
  building: BuildingAttributes3D;
  geometry?: Mesh3DCollection | null;
  warnings: string[];
}

export interface BatchSummary3D {
  requested: number;
  successful: number;
  failed: number;
}

export interface Generate3DResponse {
  schema_version: string;
  results: Building3DResult[];
  summary: BatchSummary3D;
}

export interface Mesh3DValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Building3DRequest {
  building_id: string;
  parcel_id?: string | null;
  footprint_geometry: Record<string, unknown>;
  ground_elevation?: number | null;
  roof_elevation?: number | null;
  building_height?: number | null;
  lidar_roof_elevation?: number | null;
  source_crs?: string;
  target_crs?: string;
  scene_origin?: number[] | null;
}

export interface BatchBuilding3DRequest {
  buildings: Building3DRequest[];
  target_crs?: string;
  compute_shared_origin?: boolean;
}
