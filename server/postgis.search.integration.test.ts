import { describe, expect, it } from "vitest";
import { searchPostgisLayeredArea } from "./postgis";

describe("PostGIS layered-area search", () => {
  it("resolves the cimage presentation shorthand to the imported Amity footprint area", async () => {
    const result = await searchPostgisLayeredArea("cimage");

    expect(result.query).toBe("cimage");
    expect(result.buildingCount).toBeGreaterThan(0);
    expect(result.totalFootprintAreaSquareMetres).toBeGreaterThan(0);
    expect(result.matchedUlpins).toHaveLength(result.buildingCount);
    expect(result.records.every(record => record.footprintAreaSquareMetres > 0)).toBe(true);
  });
});
