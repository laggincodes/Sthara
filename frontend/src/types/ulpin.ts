/**
 * Frontend TypeScript definitions for the 3D ULPIN Prototype.
 *
 * Semantic Rule:
 * This is a project-specific deterministic identifier prototype for demonstration purposes.
 * It is NOT an official Government of India ULPIN specification.
 */

export type IdentifierStatus = "VALID" | "INVALID" | "UNAVAILABLE";

export interface ULPINRequest {
  property_id: string;
  parcel_id: string;
  building_id?: string | null;
  building_ids?: string[];
  floor_ids: string[];
  source_identity?: string;
  geometry_status?: string | null;
}

export interface ULPINResult {
  schema_version: string;
  identifier_version: string;
  ulpin?: string | null;
  property_id: string;
  parcel_id: string;
  building_ids: string[];
  floor_ids: string[];
  identifier_status: IdentifierStatus;
  canonical_identity?: string | null;
  disclaimer: string;
  warnings: string[];
}

export interface ULPINVerificationRequest {
  ulpin: string;
  property_id: string;
  parcel_id: string;
  building_id?: string | null;
  building_ids?: string[];
  floor_ids: string[];
  identifier_version?: string;
}

export interface ULPINVerificationResult {
  verified: boolean;
  match: boolean;
  provided_ulpin: string;
  expected_ulpin?: string | null;
  property_id: string;
  details: string;
}
