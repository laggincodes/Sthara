/**
 * Unified Topology & Spatial Conflict Engine Types
 * Conforms to Stage 06 Topology: Overlap Check, Containment, Duplicates
 */

export type TopologyStatus = "VALID" | "WARNING" | "CONFLICT" | "UNAVAILABLE";
export type TopologySeverity = "INFO" | "WARNING" | "ERROR";

export type TopologyCheckType =
  | "DUPLICATE_CHECK"
  | "CONTAINMENT_2D"
  | "OVERLAP_2D"
  | "VERTICAL_INTERVAL"
  | "MESH_3D_INTEGRITY"
  | "HIERARCHY_INTEGRITY"
  | "UNDERGROUND_CLASH";

export type TopologyConflictType =
  | "INVALID_GEOMETRY"
  | "DUPLICATE_ID"
  | "SAME_ID_DIFFERENT_GEOMETRY"
  | "DUPLICATE_GEOMETRY"
  | "OUTSIDE_PARENT"
  | "PARTIAL_CONTAINMENT"
  | "POSITIVE_AREA_OVERLAP"
  | "POSITIVE_VOLUME_OVERLAP"
  | "VERTICAL_OVERLAP"
  | "VERTICAL_OUTSIDE_PARENT"
  | "INVALID_MESH"
  | "CRS_MISMATCH"
  | "UNIT_MISMATCH"
  | "MISSING_REFERENCE"
  | "UNAVAILABLE_GEOMETRY";

export type EntityType =
  | "PARCEL"
  | "BUILDING"
  | "FLOOR"
  | "UNIT"
  | "PROPERTY_VOLUME"
  | "UNDERGROUND";

export interface TopologyTolerances {
  area_tolerance_sqm?: number;
  geometry_equality_tolerance_m?: number;
  vertical_elevation_tolerance_m?: number;
  volume_tolerance_cum?: number;
  underground_clearance_threshold_m?: number;
}

export interface TopologyCheckRecord {
  check_id: string;
  check_type: TopologyCheckType;
  entity_type: EntityType;
  entity_ids: string[];
  status: TopologyStatus;
  severity: TopologySeverity;
  message: string;
  measured_value?: number | null;
  tolerance_used?: number | null;
}

export interface TopologyConflictRecord {
  conflict_id: string;
  conflict_type: TopologyConflictType;
  severity: TopologySeverity;
  primary_entity_id: string;
  primary_entity_type: EntityType;
  secondary_entity_id?: string | null;
  secondary_entity_type?: EntityType | null;
  description: string;
  overlap_metric?: number | null;
  conflict_geometry?: Record<string, unknown> | null;
  recommendation: string;
}

export interface TopologySummary {
  overall_status: TopologyStatus;
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  conflict_checks: number;
  unavailable_checks: number;
  duplicates_found: number;
  overlaps_found: number;
  containment_violations: number;
  mesh_issues_found: number;
  hierarchy_issues_found: number;
  tolerances: TopologyTolerances;
}

export interface TopologyValidationRequest {
  parcels?: Record<string, unknown> | null;
  buildings?: Record<string, unknown> | null;
  floors?: Record<string, unknown>[] | null;
  units?: Record<string, unknown>[] | null;
  property_volumes?: Record<string, unknown>[] | null;
  underground_features?: Record<string, unknown>[] | null;
  tolerances?: TopologyTolerances | null;
}

export interface TopologyValidationResponse {
  status: string;
  summary: TopologySummary;
  checks: TopologyCheckRecord[];
  conflicts: TopologyConflictRecord[];
}

export interface DemoTopologyResponse {
  status: string;
  scenario_description: string;
  validation_result: TopologyValidationResponse;
  entities: Record<string, unknown>;
}
