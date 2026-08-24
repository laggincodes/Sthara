import { describe, expect, it } from "vitest";
import { buildPlaceIntelligence, classifyPlaceKind } from "./placeIntelligence";

const sourceBackedArea = {
  query: "IIT Patna",
  siteLabel: "IIT Patna",
  matchedUlpins: ["MS-1", "MS-2"],
  buildingCount: 2,
  totalFootprintAreaSquareMetres: 1900.25,
  approvedHeightCount: 0,
  ownershipLinkCount: 0,
  records: [],
};

describe("source-aware place intelligence", () => {
  it("classifies common requested place types without claiming any measurements", () => {
    expect(classifyPlaceKind("IIT Patna college")).toBe("college-or-university");
    expect(classifyPlaceKind("restaurant near Bihta")).toBe("restaurant");
    expect(classifyPlaceKind("Gandhi Maidan park")).toBe("park-or-garden");
  });

  it("reports only source-backed footprint area and count for a matched place", () => {
    const facts = buildPlaceIntelligence(sourceBackedArea);
    expect(facts.availability).toBe("source-backed");
    expect(facts.sourceFootprintCount).toBe(2);
    expect(facts.combinedSourceFootprintAreaSquareMetres).toBe(1900.25);
    expect(facts.unavailableMeasurements.join(" ")).toContain("Metre height is unavailable");
  });

  it("returns an explicit unavailable state instead of inventing facts for an unmatched restaurant", () => {
    const facts = buildPlaceIntelligence({ ...sourceBackedArea, query: "Unmapped restaurant in Patna", buildingCount: 0, totalFootprintAreaSquareMetres: 0, matchedUlpins: [] });
    expect(facts.availability).toBe("unavailable");
    expect(facts.combinedSourceFootprintAreaSquareMetres).toBe(0);
    expect(facts.unavailableMeasurements[0]).toContain("Area is unavailable");
  });
});
