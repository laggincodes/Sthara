/**
 * Frontend TypeScript definitions for the Unit / Apartment Domain Entity.
 * Conforms to the SIH Presentation specification:
 * PARCEL -> BUILDING -> FLOOR -> UNIT -> 3D VOLUME -> 3D ULPIN
 *
 * Semantic Rule:
 * A unit represents a spatial subdivision of a floor/building supported by available spatial evidence.
 * Physical unit geometry does NOT establish legal ownership.
 */

export type UnitType =
  | "APARTMENT_UNIT"
  | "RESIDENTIAL_UNIT"
  | "OFFICE"
  | "SHOP"
  | "OTHER";

export type UnitStatus = "VALID" | "INVALID" | "UNAVAILABLE";

export type UnitSourceType =
  | "FLOOR_PLAN"
  | "SURVEY"
  | "BUILDING_MODEL"
  | "DERIVED"
  | "DEMO"
  | "DRONE"
  | "LIDAR"
  | "AI_EXTRACTION";

export interface Unit {
  unit_id: string;
  property_id?: string | null;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  unit_name?: string | null;
  unit_type: UnitType;
  geometry_2d?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  geometry_3d?: unknown | null;
  base_elevation?: number | null;
  top_elevation?: number | null;
  height?: number | null;
  footprint_area?: number | null;
  volume_cubic_m?: number | null;
  source: string;
  source_type: UnitSourceType;
  status: UnitStatus;
  warnings: string[];
  provenance: Record<string, unknown>;
}

export interface UnitValidationResult {
  unit_id: string;
  valid: boolean;
  status: UnitStatus;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export interface UnitBatchValidationResponse {
  total_units: number;
  valid_units: number;
  invalid_units: number;
  unavailable_units: number;
  results: UnitValidationResult[];
}

export interface UnitPropertyRecord {
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_id: string;
  unit_number: string;
  unit_name?: string | null;
  z_range_amsl: {
    min_z: number;
    max_z: number;
  };
  volume_cubic_m?: number | null;
  footprint_area_sqm?: number | null;
  status: UnitStatus;
  disclaimer: string;
}

export interface UnitFeatureCollection {
  type: "FeatureCollection";
  name?: string;
  metadata?: Record<string, unknown>;
  features: Array<{
    type: "Feature";
    id: string;
    properties: Unit;
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }>;
}
