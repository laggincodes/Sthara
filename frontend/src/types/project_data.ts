/**
 * Type definitions for STHARA Unified Project Data Entry & Multi-Source Analysis.
 * Orchestrates Maps, Blueprints, Architectural Drawings, Structural Sheets, and Reference Documents.
 */

import {
  DrawingAnalysis,
  SpatialSourceStatus,
  ConfidenceLevel,
} from "./drawing_intelligence";

export type ProjectSourceCategory =
  | "MAP_SOURCE"
  | "ARCHITECTURAL_DRAWING"
  | "STRUCTURAL_DRAWING"
  | "REFERENCE_DOCUMENT"
  | "UNKNOWN";

export interface ProjectFileManifestItem {
  filename: string;
  file_type: string;
  size_bytes: number;
  category: ProjectSourceCategory;
  detected_subtypes: string[];
  page_count?: number | null;
  feature_count?: number | null;
  confidence: number;
  status: "PROCESSED" | "READY" | "WARNING" | "ERROR" | string;
  details?: Record<string, unknown>;
}

export interface BuildingCorrelationMatch {
  correlation_id: string;
  drawing_building_name: string;
  drawing_candidate_id: string;
  drawing_area_sqm: number;
  drawing_dimensions: string;
  osm_building_id?: string | null;
  osm_building_name?: string | null;
  osm_area_sqm?: number | null;
  area_difference_pct?: number | null;
  match_confidence: ConfidenceLevel;
  match_score: number;
  status: "SUGGESTED_MATCH" | "CONFIRMED" | "KEPT_SEPARATE" | "DRAWING_ONLY" | string;
  correlation_factors: string[];
}

export interface SpatialEvidenceSummary {
  map_available: boolean;
  site_plan_detected: boolean;
  building_plan_detected: boolean;
  floor_plans_detected: boolean;
  sections_detected: boolean;
  structural_evidence_available: boolean;
  total_sources_count: number;
}

export interface ProcessingStage {
  stage_index: number;
  stage_name: string;
  status: "pending" | "running" | "complete" | "skipped" | "error" | string;
  message?: string | null;
}

export interface UnifiedProjectDataAnalysis {
  analysis_id: string;
  project_id: string;
  dataset_id: string;
  dataset_name: string;
  created_at: string;
  mode: "MAP_AND_DRAWINGS" | "DRAWING_ONLY" | string;
  map_status: "AVAILABLE" | "EMPTY" | "NOT_PROVIDED" | string;
  drawing_mode: "AVAILABLE" | "NOT_PROVIDED" | string;
  manifest: ProjectFileManifestItem[];
  files: Record<string, unknown>[];
  drawings: Record<string, unknown>[];
  map_sources: Record<string, unknown>[];
  building_candidates: Record<string, unknown>[];
  floor_candidates: Record<string, unknown>[];
  unit_candidates: Record<string, unknown>[];
  conflicts: Record<string, unknown>[];
  warnings: string[];
  provenance: Record<string, unknown>[];
  spatial_source_status: SpatialSourceStatus;
  drawing_analysis?: DrawingAnalysis | null;
  map_feature_count: number;
  building_correlations: BuildingCorrelationMatch[];
  spatial_evidence_summary: SpatialEvidenceSummary;
  processing_stages: ProcessingStage[];
  recommended_action: string;
  message: string;
}

export interface BuildingCorrelationUpdateRequest {
  status: "CONFIRMED" | "KEPT_SEPARATE" | string;
  target_osm_building_id?: string | null;
}
