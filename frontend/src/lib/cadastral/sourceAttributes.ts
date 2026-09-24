import { GeoJSONFeature, BuildingAssociationResult, BuildingMetadataItem } from "@/types/cadastre";

export interface BuildingSourceAttributes {
  detectedHeight: number | null;
  detectedFloors: number | null;
  detectedBasements: number | null;
  hasDetectedHeight: boolean;
  hasDetectedFloors: boolean;
  hasDetectedBasements: boolean;
  defaultHeight: number;
  defaultFloors: number;
  defaultBasements: number;
  heightSourceLabel: string;
  floorsSourceLabel: string;
  basementsSourceLabel: string;
  rawSourceTags: Record<string, unknown>;
  statusSummary: {
    hasAnySourceAttributes: boolean;
    availableBadges: string[];
  };
}

/**
 * Safely parse numeric height from unknown input (e.g. 15, "15", "15m", "15.5 m").
 */
export function parseFrontendHeight(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val > 0 ? val : null;
  const str = String(val).trim().toLowerCase().replace(/m$/, "").trim();
  const num = parseFloat(str);
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * Safely parse integer level/basement count from unknown input.
 */
export function parseFrontendInteger(val: unknown, minVal: number = 0): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val >= minVal ? Math.floor(val) : null;
  const str = String(val).trim();
  const num = parseInt(str, 10);
  return !isNaN(num) && num >= minVal ? num : null;
}

/**
 * Resolves vertical source attributes from building 2D feature properties and 3D metadata.
 * Applies the deterministic prefill priority:
 * 1. Height: Explicit source height -> Derived from source floors (3.0m/floor) -> Fallback (18.0m)
 * 2. Floors: Explicit source levels -> Fallback (5)
 * 3. Basements: Explicit underground levels / negative min_level -> Fallback (0)
 */
export function resolveBuildingSourceAttributes(
  building?: GeoJSONFeature | BuildingAssociationResult | Record<string, unknown> | null,
  metadata?: BuildingMetadataItem | null
): BuildingSourceAttributes {
  const props = (building && "properties" in building ? (building.properties as Record<string, unknown>) : (building as Record<string, unknown>)) || {};
  const rawTags: Record<string, unknown> = {};

  // Extract relevant raw tags from feature properties and tags object
  const searchProps = { ...props, ...(typeof props.tags === "object" && props.tags !== null ? (props.tags as Record<string, unknown>) : {}) };
  for (const [k, v] of Object.entries(searchProps)) {
    if (
      k.startsWith("building") ||
      ["height", "levels", "floors", "basements", "min_level", "name"].includes(k)
    ) {
      rawTags[k] = v;
    }
  }

  // Merge any raw_tags from metadata.source_attributes
  if (metadata?.source_attributes?.raw_tags) {
    Object.assign(rawTags, metadata.source_attributes.raw_tags);
  }

  // 1. Detect explicit height
  let detectedHeight: number | null = null;
  if (metadata?.source_attributes?.detected_height !== undefined && metadata.source_attributes.detected_height !== null) {
    detectedHeight = metadata.source_attributes.detected_height;
  } else if (metadata?.height_source === "OSM_HEIGHT_TAG" && metadata.height) {
    detectedHeight = metadata.height;
  } else {
    detectedHeight =
      parseFrontendHeight(searchProps["height"]) ??
      parseFrontendHeight(searchProps["building:height"]);
  }

  // 2. Detect explicit floors (levels)
  let detectedFloors: number | null = null;
  if (metadata?.source_attributes?.detected_levels !== undefined && metadata.source_attributes.detected_levels !== null) {
    detectedFloors = metadata.source_attributes.detected_levels;
  } else if (metadata?.levels !== undefined && metadata.levels !== null && metadata.levels > 0) {
    detectedFloors = metadata.levels;
  } else {
    detectedFloors =
      parseFrontendInteger(searchProps["building:levels"], 1) ??
      parseFrontendInteger(searchProps["levels"], 1) ??
      parseFrontendInteger(searchProps["floors"], 1);
  }

  // 3. Detect explicit basements (underground levels)
  let detectedBasements: number | null = null;
  if (metadata?.source_attributes?.detected_underground_levels !== undefined && metadata.source_attributes.detected_underground_levels !== null) {
    detectedBasements = metadata.source_attributes.detected_underground_levels;
  } else if (metadata?.underground_levels !== undefined && metadata.underground_levels !== null) {
    detectedBasements = metadata.underground_levels;
  } else {
    detectedBasements =
      parseFrontendInteger(searchProps["building:levels:underground"], 0) ??
      parseFrontendInteger(searchProps["underground_levels"], 0) ??
      parseFrontendInteger(searchProps["basements"], 0);
  }

  // Fallback check for building:min_level (e.g. -1, -2 indicates underground basements)
  if (detectedBasements === null) {
    let minLevel: number | null = null;
    if (metadata?.source_attributes?.detected_min_level !== undefined && metadata.source_attributes.detected_min_level !== null) {
      minLevel = metadata.source_attributes.detected_min_level;
    } else if (metadata?.min_level !== undefined && metadata.min_level !== null) {
      minLevel = metadata.min_level;
    } else if (searchProps["building:min_level"] !== undefined) {
      const parsed = parseInt(String(searchProps["building:min_level"]).trim(), 10);
      if (!isNaN(parsed)) minLevel = parsed;
    } else if (searchProps["min_level"] !== undefined) {
      const parsed = parseInt(String(searchProps["min_level"]).trim(), 10);
      if (!isNaN(parsed)) minLevel = parsed;
    }
    if (minLevel !== null && minLevel < 0) {
      detectedBasements = Math.abs(minLevel);
    }
  }

  const hasDetectedHeight = detectedHeight !== null && detectedHeight > 0;
  const hasDetectedFloors = detectedFloors !== null && detectedFloors > 0;
  const hasDetectedBasements = detectedBasements !== null;

  // Determine Default Floors & Provenance Label
  let defaultFloors = 5;
  let floorsSourceLabel = "Configured / Derived";
  if (hasDetectedFloors && detectedFloors !== null) {
    defaultFloors = detectedFloors;
    floorsSourceLabel = "Source: OSM building:levels";
  }

  // Determine Default Basements & Provenance Label
  let defaultBasements = 0;
  let basementsSourceLabel = "Configured / Derived";
  if (hasDetectedBasements && detectedBasements !== null) {
    defaultBasements = detectedBasements;
    basementsSourceLabel = "Source: OSM building:levels:underground";
  }

  // Determine Default Height & Provenance Label
  let defaultHeight = 18.0;
  let heightSourceLabel = "Configured / Derived";
  if (hasDetectedHeight && detectedHeight !== null) {
    defaultHeight = detectedHeight;
    heightSourceLabel = "Source: OSM height";
  } else if (hasDetectedFloors && detectedFloors !== null) {
    // Derived from source floors (3.0m per floor)
    defaultHeight = Number((detectedFloors * 3.0).toFixed(2));
    heightSourceLabel = "Source: Derived from OSM levels";
  }

  const availableBadges: string[] = [];
  if (hasDetectedHeight) availableBadges.push("Height");
  if (hasDetectedFloors) availableBadges.push("Floor count");
  if (hasDetectedBasements) availableBadges.push("Basement count");

  return {
    detectedHeight,
    detectedFloors,
    detectedBasements,
    hasDetectedHeight,
    hasDetectedFloors,
    hasDetectedBasements,
    defaultHeight,
    defaultFloors,
    defaultBasements,
    heightSourceLabel,
    floorsSourceLabel,
    basementsSourceLabel,
    rawSourceTags: rawTags,
    statusSummary: {
      hasAnySourceAttributes: availableBadges.length > 0,
      availableBadges,
    },
  };
}
