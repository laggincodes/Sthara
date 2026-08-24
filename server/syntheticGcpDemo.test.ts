import { describe, expect, it } from "vitest";
import { buildSyntheticGcpDemoResult } from "../shared/syntheticGcpDemo";

describe("synthetic GCP demo pipeline", () => {
  it("validates the supplied non-collinear prototype controls and creates a closed EPSG:4326 preview ring", () => {
    const result = buildSyntheticGcpDemoResult();
    expect(result.status).toBe("DEMO_NON_AUTHORITATIVE");
    expect(result.validation.controlPointCount).toBe(4);
    expect(result.validation.uniquePlanPixels).toBe(true);
    expect(result.validation.allPointsWithinDeclaredPlanBounds).toBe(true);
    expect(result.validation.nonCollinear).toBe(true);
    expect(result.validation.rmsMetres).toBeGreaterThanOrEqual(0);
    const ring = result.geoJson.features[0].geometry.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("blocks PostGIS persistence and prevents synthetic visual extrusion from becoming an approved height", () => {
    const result = buildSyntheticGcpDemoResult();
    const properties = result.geoJson.features[0].properties;
    expect(result.ingestionContract.status).toBe("POSTGIS_WRITE_BLOCKED");
    expect(properties.demoNonAuthoritative).toBe(true);
    expect(properties.coordinateSource).toContain("SYNTHETIC");
    expect(properties.approvedHeightMetres).toBeUndefined();
    expect(properties.activeLocks).toContain("vertical ULPIN");
  });
});
