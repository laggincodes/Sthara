export type MapEvidenceFilter = "all" | "public-footprint" | "height-verified";

export function getMapEvidenceFilterLabel(filter: MapEvidenceFilter) {
  return {
    all: "All live footprints",
    "public-footprint": "Public footprint only",
    "height-verified": "Verified-height extrusion",
  }[filter];
}

export function matchesMapEvidenceFilter(
  properties: Record<string, unknown>,
  filter: MapEvidenceFilter
) {
  if (filter === "all") return true;
  const hasVerifiedHeight =
    typeof properties.approvedHeightMetres === "number" &&
    Number.isFinite(properties.approvedHeightMetres) &&
    properties.approvedHeightMetres > 0;
  return filter === "height-verified" ? hasVerifiedHeight : !hasVerifiedHeight;
}
