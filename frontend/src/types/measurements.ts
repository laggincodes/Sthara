import { SpatialObjectType, SpatialObjectRef } from "./spatial_analysis";

export interface DimensionsRequest {
  dataset_id: string;
  object_id: string;
  object_type?: SpatialObjectType | null;
  geometry?: Record<string, unknown> | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  source_crs?: string;
}

export interface DimensionsResponse {
  dataset_id: string;
  object_id: string;
  object_type: string;
  width_m: number;
  depth_m: number;
  height_m: number;
  area_sqm: number;
  volume_cubic_m: number;
  z_min?: number | null;
  z_max?: number | null;
  surface_area_sqm?: number | null;
}

export interface DistanceRequest {
  dataset_id: string;
  object_a: string | SpatialObjectRef;
  object_b: string | SpatialObjectRef;
  object_a_type?: SpatialObjectType | null;
  object_b_type?: SpatialObjectType | null;
  target_crs?: string;
}

export interface DistanceResponse {
  dataset_id: string;
  object_a: string;
  object_b: string;
  distance_m: number;
  horizontal_distance_m: number;
  vertical_distance_m: number;
  distance_3d_m: number;
}
