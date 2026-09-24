import { SpatialObjectType } from "./spatial_analysis";

export type DataQualityStatus = "VALID" | "WARNING" | "INCOMPLETE" | "INVALID";

export interface ValidationGates {
  geometry: "PASS" | "FAIL";
  topology: "PASS" | "FAIL";
  containment: "PASS" | "FAIL";
  hierarchy: "PASS" | "FAIL";
  source_data: "PASS" | "WARNING" | "INCOMPLETE" | "FAIL";
}

export interface ProvenanceInfo {
  source: string;
  source_type?: string;
  height_source?: string;
  floor_source?: string;
  elevation_source?: string;
  floor_plan_source?: string;
  geometry_source?: string;
  spatial_id_type?: string;
  geometry_validated?: boolean;
  watertight?: boolean;
  is_government_record: boolean;
  disclaimer: string;
}

export interface QualityEvaluationRequest {
  dataset_id: string;
  object_id: string;
  object_type: SpatialObjectType;
  has_floor_plan?: boolean;
  containment_passed?: boolean;
  attributes?: Record<string, unknown>;
}

export interface QualityEvaluationResponse {
  dataset_id: string;
  object_id: string;
  object_type: string;
  data_quality_status: DataQualityStatus;
  validation_status: string;
  validation_gates: ValidationGates;
  provenance: ProvenanceInfo;
  disclaimer: string;
}
