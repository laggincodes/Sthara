import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cesiumViewerSource = readFileSync(
  resolve(process.cwd(), "client/src/components/CesiumSpatialViewer.tsx"),
  "utf8"
);
const registrySource = readFileSync(
  resolve(process.cwd(), "client/src/pages/UlpInRegistry.tsx"),
  "utf8"
);

describe("dashboard usability controls", () => {
  it("provides a visible Cesium loading state and actionable runtime recovery paths", () => {
    expect(cesiumViewerSource).toContain("Preparing 3D map");
    expect(cesiumViewerSource).toContain("Retry 3D map");
    expect(cesiumViewerSource).toContain("Reload 3D map");
    expect(cesiumViewerSource).toContain("Retry data");
    expect(cesiumViewerSource).toContain("viewerRetryKey");
  });

  it("keeps ULPIN discovery scoped to source records while supporting search, filters, and sorting", () => {
    expect(registrySource).toContain("Search ULPIN, source record or place");
    expect(registrySource).toContain("Filter ULPIN source records");
    expect(registrySource).toContain("Sort ULPIN source records");
    expect(registrySource).toContain("area-available");
    expect(registrySource).toContain("area-desc");
    expect(registrySource).toContain("Show all");
    expect(registrySource).toContain("Issued vertical ULPINs");
  });
});
