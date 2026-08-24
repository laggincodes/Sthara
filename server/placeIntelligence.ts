type AreaSearchRecord = {
  ulpin: string;
  name: string;
  footprintAreaSquareMetres: number;
  approvedHeightMetres: number | null;
  parcelReference: string | null;
  ulpinRecord: string | null;
};

export type SourceAreaSearch = {
  query: string;
  siteLabel: string;
  matchedUlpins: string[];
  buildingCount: number;
  totalFootprintAreaSquareMetres: number;
  approvedHeightCount: number;
  ownershipLinkCount: number;
  records: AreaSearchRecord[];
};

export type PlaceKind = "college-or-university" | "restaurant" | "park-or-garden" | "place";

export function classifyPlaceKind(query: string): PlaceKind {
  if (/\b(college|university|institute|iit|aiims|school|campus)\b/i.test(query)) return "college-or-university";
  if (/\b(restaurant|cafe|café|hotel|dhaba|eatery|food)\b/i.test(query)) return "restaurant";
  if (/\b(park|garden|maidan|playground|green)\b/i.test(query)) return "park-or-garden";
  return "place";
}

export function buildPlaceIntelligence(source: SourceAreaSearch) {
  const kind = classifyPlaceKind(source.query);
  const sourceBacked = source.buildingCount > 0;
  const unavailableMeasurements = [
    "Length and width are unavailable because no surveyed dimensions are attached to these footprints.",
    "Metre height is unavailable unless an authority-approved height record is attached.",
    "Floor count is unavailable unless an official floor plan or BIM is attached to an exact building record.",
  ];

  if (!sourceBacked) {
    return {
      query: source.query,
      placeKind: kind,
      availability: "unavailable" as const,
      headline: `No source-backed footprint facts are available for this ${kind}.`,
      sourceFootprintCount: 0,
      combinedSourceFootprintAreaSquareMetres: 0,
      dataOrigin: "No live PostGIS source footprint matched the search.",
      unavailableMeasurements: [
        "Area is unavailable because the search did not resolve to licensed or official geometry.",
        ...unavailableMeasurements,
      ],
    };
  }

  return {
    query: source.query,
    placeKind: kind,
    availability: "source-backed" as const,
    headline: `${source.buildingCount} live source-footprint record${source.buildingCount === 1 ? "" : "s"} matched this search.`,
    sourceFootprintCount: source.buildingCount,
    combinedSourceFootprintAreaSquareMetres: source.totalFootprintAreaSquareMetres,
    dataOrigin: "Live PostGIS geometry with the original source provenance retained; combined area is a footprint sum, not a legal parcel, campus, property, or building floor area.",
    unavailableMeasurements,
  };
}
