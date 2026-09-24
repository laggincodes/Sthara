/**
 * STHARA Floor Plan / Blueprint Association Types.
 * Captures document attachments linked to individual 3D floor volumes.
 */

export interface FloorPlanAssociation {
  floor_plan_id: string;
  dataset_id: string;
  building_id: string;
  floor_id: string;
  filename: string;
  file_type: "PDF" | "PNG" | "JPG" | string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  view_url: string;
  uploaded_at: string;
  source: string;
  status: "Attached" | string;
}

export interface FloorPlanListResponse {
  dataset_id: string;
  total_count: number;
  floor_plans: FloorPlanAssociation[];
}

export interface FloorPlanDeleteResponse {
  status: string;
  message: string;
  dataset_id: string;
  building_id: string;
  floor_id: string;
}
