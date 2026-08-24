import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSyntheticGcpDemoResult } from "../shared/syntheticGcpDemo";

const cesiumViewerSource = readFileSync(
  resolve(process.cwd(), "client/src/components/CesiumSpatialViewer.tsx"),
  "utf8"
);
const syntheticDemoPageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/SyntheticGcpDemo.tsx"),
  "utf8"
);

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

  it("keeps the 3D preview visibly labelled as a prototype rather than a building", () => {
    expect(cesiumViewerSource).toContain("DEMO VOLUME\\nNOT A BUILDING");
    expect(cesiumViewerSource).toContain("no PostGIS write");
  });

  it("keeps model inspection, 2D/3D switching, and the warning badge within the synthetic-only path", () => {
    expect(cesiumViewerSource).toContain("onSyntheticDemoSelect?.()");
    expect(cesiumViewerSource).toContain('syntheticDemoView === "3d"');
    expect(cesiumViewerSource).toContain("DEMO / NON-AUTHORITATIVE");
    expect(syntheticDemoPageSource).toContain("Separate RERA authority record");
    expect(syntheticDemoPageSource).toMatch(
      /do not\s+validate the synthetic geometry/
    );
    expect(syntheticDemoPageSource).toContain("2D plan");
    expect(syntheticDemoPageSource).toContain("3D prototype");
    expect(syntheticDemoPageSource).toContain('get("view") === "2d"');
    expect(cesiumViewerSource).toContain(
      "DEMO PLAN\\nNOT A CADASTRAL BOUNDARY"
    );
  });

  it("keeps hover, ULPIN simulation, and visual-context layers explicitly synthetic and non-issued", () => {
    expect(cesiumViewerSource).toContain("ScreenSpaceEventType.MOUSE_MOVE");
    expect(cesiumViewerSource).toContain("SIMULATED DRONE IMAGERY");
    expect(cesiumViewerSource).toContain("SIMULATED LiDAR POINT");
    expect(syntheticDemoPageSource).toContain("Simulate 3D ULPIN preview");
    expect(syntheticDemoPageSource).toContain(
      "SIMULATION PREVIEW · NOT ISSUED"
    );
    expect(syntheticDemoPageSource).toMatch(
      /No identifier, legal\s+right, or registered 3D ULPIN/
    );
    expect(syntheticDemoPageSource).toContain("Simulated drone imagery");
    expect(syntheticDemoPageSource).toContain("Simulated LiDAR points");
    expect(syntheticDemoPageSource).toContain('get("simulate") === "ulpin"');
    expect(syntheticDemoPageSource).toContain('includes("drone")');
    expect(syntheticDemoPageSource).toContain('includes("lidar")');
  });
});
