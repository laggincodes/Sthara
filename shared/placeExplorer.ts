export type PlaceExplorerSegment = "parcels" | "buildings";

export const SOURCE_BACKED_EXPLORER_SUGGESTIONS = [
  "Amity University Patna",
  "IIT Patna",
  "AIIMS Patna",
  "Gandhi Maidan Patna",
  "Koramangala 5th Block",
] as const;

export const PLACE_EXPLORER_SEGMENTS: Record<
  PlaceExplorerSegment,
  {
    label: string;
    eyebrow: string;
    stageLabel: string;
    description: string;
    searchPlaceholder: string;
    recordLabel: string;
    noResultLabel: string;
  }
> = {
  parcels: {
    label: "Parcels",
    eyebrow: "Source-aware footprint explorer",
    stageLabel: "Live footprint references",
    description:
      "Shows live, source-attributed footprint records only. A public building outline is not a legal parcel, owner, or ULPIN.",
    searchPlaceholder: "Search source footprint, place, or live record",
    recordLabel: "Matched footprint records",
    noResultLabel: "No source-backed footprint record matched this query.",
  },
  buildings: {
    label: "Buildings",
    eyebrow: "Source-aware building-place explorer",
    stageLabel: "Live source-backed building context",
    description:
      "Routes supported college, institution, university, and place searches to existing live geometry. Restaurant and other unmatched searches remain explicitly unavailable.",
    searchPlaceholder: "Search a college, university, restaurant, or place",
    recordLabel: "Matched building footprints",
    noResultLabel: "No verified 3D building footprint matched this query.",
  },
};

export function getPlaceExplorerSegment(
  value: string | null | undefined
): PlaceExplorerSegment {
  return value === "parcels" ? "parcels" : "buildings";
}

export const PLACE_EXPLORER_UNAVAILABLE_METRICS =
  "Length, width, metre height, floors, ownership, legal parcel status, and ULPIN remain unavailable unless a separately reviewed source establishes them.";
