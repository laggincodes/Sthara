import {
  Geometry3DStatus,
  Mesh3DCollection,
  BatchSummary3D,
} from "./geometry3d";

export type VolumeType = "FLOOR" | "PROPERTY_VOLUME" | "UNDERGROUND" | "AIRSPACE";

export interface FloorIntervalSpec {
  floor_id: string;
  floor_index: number;
  floor_name: string;
  base_elevation?: number | null;
  top_elevation?: number | null;
  floor_height?: number | null;
}

export interface BuildingFloors3DRequest {
  building_id: string;
  parcel_id?: string | null;
  footprint_geometry: GeoJSON.Geometry;
  ground_elevation?: number | null;
  roof_elevation?: number | null;
  building_height?: number | null;
  number_of_floors?: number | null;
  floor_height?: number | null;
  floors?: FloorIntervalSpec[] | null;
  source_crs?: string;
  target_crs?: string;
  scene_origin?: [number, number, number] | null;
}

export interface BatchBuildingFloors3DRequest {
  buildings: BuildingFloors3DRequest[];
  target_crs?: string;
  compute_shared_origin?: boolean;
}

export interface Floor3DResult {
  floor_id: string;
  building_id: string;
  parcel_id?: string | null;
  floor_index: number;
  floor_name: string;
  volume_type: VolumeType;
  base_elevation: number;
  top_elevation: number;
  height: number;
  volume_cubic_m: number;
  surface_area_sqm: number;
  geometry_status: Geometry3DStatus;
  geometry?: Mesh3DCollection | null;
  warnings: string[];
}

export interface BuildingFloors3DResult {
  building_id: string;
  parcel_id?: string | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  floor_count: number;
  floors: Floor3DResult[];
  geometry_status: Geometry3DStatus;
  warnings: string[];
}

export interface GenerateFloors3DResponse {
  schema_version: string;
  results: BuildingFloors3DResult[];
  summary: BatchSummary3D;
}

export interface PropertyVolumeRequest {
  property_id: string;
  parcel_id: string;
  building_id?: string | null;
  building_ids?: string[];
  floor_ids: string[];
  volume_type?: VolumeType;
  unit_name?: string | null;
  footprint_geometry?: GeoJSON.Geometry | null;
  source_crs?: string;
  target_crs?: string;
  scene_origin?: [number, number, number] | null;
}

export interface BatchPropertyVolumeRequest {
  properties: PropertyVolumeRequest[];
  building_requests?: BuildingFloors3DRequest[] | null;
  target_crs?: string;
  compute_shared_origin?: boolean;
}

export interface PropertyVolumeResult {
  property_id: string;
  parcel_id: string;
  building_id?: string | null;
  building_ids?: string[];
  floor_ids: string[];
  volume_type: VolumeType;
  unit_name?: string | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  total_height?: number | null;
  volume_cubic_m?: number | null;
  surface_area_sqm?: number | null;
  geometry_status: Geometry3DStatus;
  geometry?: Mesh3DCollection | null;
  warnings: string[];
}

export interface GeneratePropertyVolumeResponse {
  schema_version: string;
  results: PropertyVolumeResult[];
  summary: BatchSummary3D;
}
