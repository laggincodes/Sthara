export type SpatialSourceType =
  | "OSM"
  | "GeoJSON"
  | "DataMeet"
  | "User-provided"
  | "Reference Layer";

export type SpatialSourceStatus = "Imported" | "VALID" | "WARNING" | "INVALID";

export interface SpatialSource {
  source_id: string;
  dataset_id: string;
  source_name: string;
  source_type: SpatialSourceType | string;
  file_name?: string | null;
  format: string;
  crs: string;
  working_crs: string;
  feature_count: number;
  imported_at: string;
  status: SpatialSourceStatus | string;
  provenance: Record<string, unknown>;
  description?: string | null;
  disclaimer: string;
}

export interface SourceRegisterRequest {
  dataset_id: string;
  source_id?: string;
  source_name: string;
  source_type: SpatialSourceType | string;
  file_name?: string;
  format?: string;
  crs?: string;
  description?: string;
  features?: Record<string, unknown>;
}

export interface SourceFeaturesRequest {
  features: Record<string, unknown>;
  crs?: string;
}

export interface SourceListResponse {
  dataset_id: string;
  total_sources: number;
  sources: SpatialSource[];
}

export interface SourceDeleteResponse {
  success: boolean;
  dataset_id: string;
  source_id: string;
  message: string;
}
