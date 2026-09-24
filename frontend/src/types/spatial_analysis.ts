export type SpatialObjectType = "building" | "floor" | "unit" | "reference";

export type VerticalRelationshipType =
  | "SAME_LEVEL"
  | "ABOVE"
  | "BELOW"
  | "OVERLAPPING_Z_RANGE"
  | "DISJOINT_Z_RANGE";

export interface SpatialObjectRef {
  id: string;
  type: SpatialObjectType;
  dataset_id: string;
  building_id?: string | null;
  floor_id?: string | null;
  geometry?: Record<string, unknown> | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  source_crs?: string;
}

export interface ContainmentRequest {
  object_a: SpatialObjectRef;
  object_b: SpatialObjectRef;
}

export interface ContainmentResponse {
  object_a_id: string;
  object_b_id: string;
  analysis_type: "containment";
  result: boolean;
  status: "PASS" | "FAIL";
  horizontal_contained: boolean;
  vertical_contained: boolean;
  message: string;
}

export interface IntersectionRequest {
  object_a: SpatialObjectRef;
  object_b: SpatialObjectRef;
}

export interface IntersectionResponse {
  object_a_id: string;
  object_b_id: string;
  analysis_type: "intersection";
  intersects: boolean;
  intersection_area_sqm: number;
  boundary_touch: boolean;
  status: "PASS" | "FAIL";
  message: string;
}

export interface ProximityRequest {
  object_a: SpatialObjectRef;
  object_b: SpatialObjectRef;
  target_crs?: string;
}

export interface ProximityResponse {
  object_a_id: string;
  object_b_id: string;
  analysis_type: "proximity";
  distance_m: number;
  distance_2d_m: number;
  distance_z_m: number;
  status: "PASS" | "FAIL";
}

export interface VerticalRelationshipRequest {
  object_a: SpatialObjectRef;
  object_b: SpatialObjectRef;
}

export interface VerticalRelationshipResponse {
  object_a_id: string;
  object_b_id: string;
  analysis_type: "vertical";
  relationship: VerticalRelationshipType;
  object_a_z: {
    min_z: number;
    max_z: number;
    height: number;
  };
  object_b_z: {
    min_z: number;
    max_z: number;
    height: number;
  };
  vertical_separation_m: number;
  status: "PASS" | "FAIL";
}

export interface CombinedSpatialQueryRequest {
  dataset_id: string;
  object_a: SpatialObjectRef;
  object_b: SpatialObjectRef;
  relations?: string[];
}

export interface CombinedSpatialQueryResponse {
  dataset_id: string;
  object_a_id: string;
  object_b_id: string;
  status: string;
  containment?: ContainmentResponse | null;
  intersection?: IntersectionResponse | null;
  proximity?: ProximityResponse | null;
  vertical?: VerticalRelationshipResponse | null;
}

