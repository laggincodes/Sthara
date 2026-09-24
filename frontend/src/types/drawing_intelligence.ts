/**
 * Type definitions for STHARA Drawing Intelligence v1.
 * Controlled Document-to-Spatial Model / Plan-to-3D Pipeline.
 */

export type DrawingType =
  | "LOCATION_PLAN"
  | "SITE_PLAN"
  | "MASTER_PLAN"
  | "GROUND_FLOOR_PLAN"
  | "FLOOR_PLAN"
  | "TYPICAL_FLOOR_PLAN"
  | "BASEMENT_PLAN"
  | "ROOF_PLAN"
  | "SECTION"
  | "ELEVATION"
  | "STRUCTURAL_PLAN"
  | "FOUNDATION_PLAN"
  | "OTHER";

export type CandidateType =
  | "SITE_BOUNDARY"
  | "BUILDING_FOOTPRINT"
  | "FLOOR"
  | "TYPICAL_FLOOR"
  | "UNIT"
  | "ROOM"
  | "SECTION_PROFILE"
  | "STRUCTURAL_GRID";

export type CandidateStatus = "UNRESOLVED" | "REVIEW" | "CONFIRMED" | "REJECTED";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";

export type DocumentRole = "PRIMARY_SPATIAL" | "SUPPORTING_STRUCTURAL" | "REFERENCE_CONTEXT";

export type SpatialSourceMode =
  | "OSM_AND_DRAWINGS"
  | "DRAWINGS_ONLY"
  | "OSM_ONLY"
  | "EMPTY";

export interface NormalizedBBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DrawingEvidence {
  evidence_id: string;
  region_id?: string | null;
  document_id: string;
  source_filename: string;
  page_number: number;
  evidence_type: string;
  fact: string;
  value: unknown;
  confidence: number;
  raw_text?: string | null;
}

export interface DrawingRegion {
  region_id: string;
  document_id: string;
  page_number: number;
  bbox: NormalizedBBox;
  drawing_type: DrawingType;
  title: string;
  scale?: string | null;
  scale_confidence: ConfidenceLevel;
  confidence: ConfidenceLevel;
  evidence_ids: string[];
}

export interface DrawingCandidate {
  candidate_id: string;
  region_id: string;
  document_id: string;
  source_filename: string;
  page_number: number;
  candidate_type: CandidateType;
  name: string;
  status: CandidateStatus;
  confidence: ConfidenceLevel;
  confidence_score: number;
  polygon_normalized: [number, number][];
  polygon_metric?: [number, number][] | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  area_sqm?: number | null;
  floor_number?: number | null;
  floor_range?: number[] | null;
  parent_floor_candidate_id?: string | null;
  unit_number?: string | null;
  rooms?: string[] | null;
  properties: Record<string, unknown>;
  evidence_ids: string[];
  confirmation_method?: string | null;
}

export interface DrawingPage {
  page_id: string;
  document_id: string;
  page_number: number;
  width_px: number;
  height_px: number;
  original_image_url: string;
  processed_image_url: string;
  detected_types: DrawingType[];
  region_count: number;
  candidate_count: number;
  status: string;
}

export interface DrawingDocument {
  document_id: string;
  dataset_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  page_count: number;
  role: DocumentRole;
  primary_drawing_type: DrawingType;
  status: string;
  pages: DrawingPage[];
  sha256_hash: string;
  uploaded_at: string;
}

export interface DrawingAnalysisSummary {
  total_documents: number;
  total_pages: number;
  total_regions: number;
  total_candidates: number;
  confirmed_candidates: number;
  building_candidates_count: number;
  floor_candidates_count: number;
  unit_candidates_count: number;
  detected_floors_count: number;
  estimated_total_height_m?: number | null;
  detected_scale?: string | null;
  overall_confidence: ConfidenceLevel;
}

export interface DrawingAnalysis {
  analysis_id: string;
  dataset_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  documents: DrawingDocument[];
  regions: DrawingRegion[];
  candidates: DrawingCandidate[];
  evidence: DrawingEvidence[];
  summary: DrawingAnalysisSummary;
  logs: string[];
}

export interface DrawingCandidateUpdate {
  status?: CandidateStatus | null;
  name?: string | null;
  polygon_normalized?: [number, number][] | null;
  floor_range?: number[] | null;
  height?: number | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  properties?: Record<string, unknown> | null;
}

export interface SpatialSourceStatus {
  dataset_id: string;
  osm_available: boolean;
  osm_dataset_exists: boolean;
  osm_feature_count: number;
  osm_building_count: number;
  osm_geometry_valid: boolean;
  drawing_available: boolean;
  drawing_count: number;
  drawing_analysis_id?: string | null;
  active_mode: SpatialSourceMode;
  active_mode_label: string;
  description: string;
  geographic_status: string;
}

export interface GeographicPositioning {
  positioning_method: string;
  geographic_status: string;
  scale?: number | null;
  rotation_deg?: number | null;
  translation?: [number, number] | null;
  anchor_coordinates?: [number, number] | null;
  control_points?: Record<string, unknown>[] | null;
  confidence?: string | null;
}

export interface BuildModelRequest {
  target_building_id?: string | null;
  target_building_name?: string | null;
  ground_elevation?: number | null;
  apply_units_to_all_typical_floors?: boolean;
  match_to_osm_footprint?: boolean;
  create_as_drawing_only?: boolean;
  positioning?: GeographicPositioning | null;
}

export interface BuildModelResponse {
  status: string;
  dataset_id: string;
  building_id: string;
  building_name: string;
  number_of_floors: number;
  floors_created: string[];
  units_created_count: number;
  unit_ids: string[];
  total_height_m: number;
  ground_elevation_m: number;
  geographic_status: string;
  spatial_source: string;
  provenance: Record<string, unknown>;
  message: string;
}

export type BuildModelResult = BuildModelResponse;

