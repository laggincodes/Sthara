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

  it("exports only the filtered source-record result set and keeps issued-status and history fields evidence-safe", () => {
    expect(registrySource).toContain("exportFilteredRecords");
    expect(registrySource).toContain("Export {filteredRecords.length} CSV");
    expect(registrySource).toContain("No — source record only");
    expect(registrySource).toContain("Not exposed by current source feed");
    expect(registrySource).toContain("text/csv;charset=utf-8");
  });

  it("offers focused Cesium navigation and a modal that does not fabricate record history", () => {
    expect(registrySource).toContain("focusRecordOnMap");
    expect(registrySource).toContain("Open focused 3D map");
    expect(registrySource).toContain("History is not available in this source feed.");
    expect(registrySource).toContain("No revision timeline, ownership history");
    expect(registrySource).toContain("Source-record metadata only.");
  });

  it("highlights a focused source geometry and presents its quick-info state separately from issuance", () => {
    expect(cesiumViewerSource).toContain("Focused source geometry");
    expect(cesiumViewerSource).toContain("Source record · not issued");
    expect(cesiumViewerSource).toContain("#73fff1");
    expect(cesiumViewerSource).toContain("setFocusSummary");
  });

  it("keeps individual PDF exports and personal annotations clearly non-authoritative", () => {
    expect(registrySource).toContain("exportRecordPdf");
    expect(registrySource).toContain("Download detail PDF");
    expect(registrySource).toContain("Personal browser-local annotation");
    expect(registrySource).toContain("Stored only in this browser.");
    expect(registrySource).toContain("not an official record");
    expect(registrySource).toContain("ulpin-vpm-personal-annotations-v1");
  });
});
