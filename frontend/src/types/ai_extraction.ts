/**
 * TypeScript definitions for the AI/ML Extraction Subsystem.
 * Strictly mirrors the backend Pydantic schemas (Step 19).
 * Conforms to SIH separation:
 *   AI = CANDIDATE EXTRACTION
 *   3D ENGINE = MODELLING
 *   TOPOLOGY = VALIDATION
 *   CADASTRE = AUTHORITATIVE LEGAL RECORDS
 */

export type ExtractionType =
  | "BUILDING"
  | "FLOOR"
  | "UNIT"
  | "VERTICAL_FEATURE";

export type CandidateStatus =
  | "CANDIDATE"
  | "ACCEPTED"
  | "REJECTED"
  | "REVIEW_REQUIRED"
  | "UNAVAILABLE";

export type ConfidenceLevel =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "UNAVAILABLE";

export type ExtractionMethod =
  | "SOURCE_DATA"
  | "AI_CV_MORPHOLOGICAL"
  | "AI_NDSM_SEGMENTATION"
  | "AI_HISTOGRAM_INTERVAL"
  | "AI_FLOORPLAN_PARTITION"
  | "SYNTHETIC_BENCHMARK";

export interface ModelMetadata {
  model_id: string;
  model_version: string;
  task: ExtractionType;
  framework: string;
  input_type: string;
  output_type: string;
  availability: "AVAILABLE" | "MODEL_UNAVAILABLE" | "DEGRADED" | string;
  limitations: string;
}

export interface ExtractionProvenance {
  source_dataset: string;
  source_file?: string | null;
  model_id: string;
  model_version: string;
  extraction_timestamp: string;
  crs: string;
  transformation_applied: boolean;
}

export interface CandidateFeature {
  candidate_id: string;
  feature_type: ExtractionType;
  source_reference: string;
  geometry_2d?: {
    type: string;
    coordinates: unknown[];
  } | null;
  estimated_attributes: Record<string, unknown>;
  confidence?: number | null;
  confidence_level: ConfidenceLevel;
  confidence_threshold: number;
  extraction_method: ExtractionMethod;
  status: CandidateStatus;
  provenance: ExtractionProvenance;
  warnings: string[];
}

export interface ExtractionResult {
  schema_version: string;
  source_id: string;
  model_id: string;
  model_version: string;
  extraction_type: ExtractionType;
  candidates: CandidateFeature[];
  confidence_policy: string;
  status: CandidateStatus;
  warnings: string[];
}

export interface CandidateValidationRequest {
  candidates: CandidateFeature[];
  target_parcel?: Record<string, unknown> | null;
  parent_building?: Record<string, unknown> | null;
  confidence_override?: boolean;
}

export interface CandidateValidationResponse {
  validated_candidates: CandidateFeature[];
  accepted_count: number;
  review_count: number;
  rejected_count: number;
  all_valid: boolean;
  validation_errors: string[];
}

export interface CandidateComparisonRequest {
  candidate_geometry: Record<string, unknown>;
  reference_geometry: Record<string, unknown>;
  candidate_id?: string;
  reference_id?: string;
}

export interface CandidateComparisonResponse {
  candidate_id?: string | null;
  reference_id?: string | null;
  iou: number;
  intersection_area_m2: number;
  union_area_m2: number;
  candidate_area_m2: number;
  reference_area_m2: number;
  area_difference_pct: number;
  centroid_offset_m: number;
  containment_status: string;
  discrepancy_summary: string;
}

export interface ModelRegistryResponse {
  models: ModelMetadata[];
  total_registered: number;
}

export interface DemoAiExtractionResponse {
  schema_version: string;
  pipeline: string;
  separation_of_concerns: Record<string, string>;
  total_candidates: number;
  building_candidates: CandidateFeature[];
  floor_candidates: CandidateFeature[];
  unit_candidates: CandidateFeature[];
  vertical_candidates: CandidateFeature[];
  models_used: string[];
  validation_note: string;
}
