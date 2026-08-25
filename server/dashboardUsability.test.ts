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
const workspaceSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/SpatialWorkspace.tsx"),
  "utf8"
);
const dashboardStyles = readFileSync(
  resolve(process.cwd(), "client/src/index.css"),
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
    expect(registrySource).toContain(
      "History is not available in this source feed."
    );
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

  it("provides satellite and street visual context plus dedicated perspective and plan-style 3D controls", () => {
    expect(cesiumViewerSource).toContain("Basemap · visual context");
    expect(cesiumViewerSource).toContain("Satellite");
    expect(cesiumViewerSource).toContain("Street");
    expect(cesiumViewerSource).toContain("Perspective");
    expect(cesiumViewerSource).toContain("Plan view");
    expect(cesiumViewerSource).toContain("visual context only");
  });

  it("summarizes source records and browser-local tags while providing direct non-issued record links", () => {
    expect(registrySource).toContain("Total source records");
    expect(registrySource).toContain("Total available footprint area");
    expect(registrySource).toContain("Personal custom tags");
    expect(registrySource).toContain("Copy direct link");
    expect(registrySource).toContain("/ulpin-registry?record=");
    expect(registrySource).toContain("handledSharedRecordRef");
  });

  it("labels Cesium distance and area tools as visual approximations rather than survey evidence", () => {
    expect(cesiumViewerSource).toContain("Visual measure");
    expect(cesiumViewerSource).toContain("Approx. distance");
    expect(cesiumViewerSource).toContain("Approx. area");
    expect(cesiumViewerSource).toContain(
      "Visual approximation only · not a GNSS, survey, or cadastral"
    );
    expect(cesiumViewerSource).toContain("measurement");
    expect(cesiumViewerSource).toContain("clearMeasurement");
    expect(cesiumViewerSource).toContain("exportMeasurementPdf");
    expect(cesiumViewerSource).toContain(
      "ulpin-vpm-visual-measurement-report.pdf"
    );
    expect(cesiumViewerSource).toContain("not GNSS, survey, cadastral, legal");
    expect(cesiumViewerSource).toContain("disabled={!measurementSummary}");
    expect(cesiumViewerSource).toContain('toDataURL("image/png")');
    expect(cesiumViewerSource).toContain(
      "Map snapshot · measured geometry visible"
    );
    expect(cesiumViewerSource).toContain(
      "Measurement map snapshot unavailable"
    );
    expect(cesiumViewerSource).toContain('pdf.addImage(snapshot, "PNG"');
  });

  it("keeps Registry favorites browser-local and source-record scoped", () => {
    expect(registrySource).toContain("PERSONAL_FAVORITES_STORAGE_KEY");
    expect(registrySource).toContain("Favorites ({personalFavorites.length})");
    expect(registrySource).toContain("Save browser-local favorite");
    expect(registrySource).toContain("favorites");
  });

  it("organizes browser-local favorites into personal folders without changing source-record authority", () => {
    expect(registrySource).toContain("PERSONAL_FAVORITE_FOLDERS_STORAGE_KEY");
    expect(registrySource).toContain("Favorite folder / category");
    expect(registrySource).toContain("Browser-local organization only");
    expect(registrySource).toContain("All folders");
    expect(registrySource).toContain("Unfiled favorites");
    expect(registrySource).toContain('favoriteFolderFilter === ""');
    expect(registrySource).toContain("assignFavoriteFolder");
    expect(registrySource).toContain("Favorite folder updated");
    expect(registrySource).toContain("folder-save-success");
    expect(registrySource).toContain("sonnerToast.success");
  });

  it("limits comparison to two source records and carries both identifiers to combined source context", () => {
    expect(registrySource).toContain("Compare source records");
    expect(registrySource).toContain(
      "Select up to two public-footprint records"
    );
    expect(registrySource).toContain("comparisonRecords.length !== 2");
    expect(registrySource).toContain("/workspace?segment=buildings&compare=");
    expect(workspaceSource).toContain("activeMapUlpins");
    expect(workspaceSource).toContain("source record comparison");
  });

  it("keeps mock identity and rights demonstrations explicitly non-authoritative", () => {
    expect(workspaceSource).toContain("Generate mock 3D ULPIN");
    expect(workspaceSource).toContain("MOCK-3D-");
    expect(workspaceSource).toContain(
      "Mock apartment ownership &amp; vertical rights"
    );
    expect(workspaceSource).toContain("DEMO / NON-AUTHORITATIVE");
    expect(workspaceSource).toContain("authority record required");
  });

  it("supports browser-local sample floor-plan and 3D-model map previews", () => {
    expect(workspaceSource).toContain("handleSampleAssetUpload");
    expect(workspaceSource).toContain(".pdf,.png,.jpg,.jpeg,.glb,.gltf");
    expect(workspaceSource).toContain("Browser-local preview only");
    expect(workspaceSource).toContain("sampleAsset={sampleAsset}");
    expect(cesiumViewerSource).toContain("ModelGraphics");
    expect(cesiumViewerSource).toContain("Sample floor plan");
    expect(cesiumViewerSource).toContain("not georeferenced");
  });

  it("keeps the workspace map focused on preview and approximate measurements", () => {
    expect(cesiumViewerSource).toContain("measurementControlsOnly");
    expect(workspaceSource).toContain("measurementControlsOnly");
    expect(workspaceSource).toContain("spatial-below-map");
    expect(dashboardStyles).toContain(".spatial-map-column");
    expect(dashboardStyles).toContain(".spatial-below-map");
    expect(dashboardStyles).toContain(
      ".spatial-model-stage .cesium-focus-popup"
    );
  });

  it("reserves a non-overlapping control zone and keeps small-screen Registry controls usable", () => {
    expect(dashboardStyles).toContain(".map-card .cesium-context-controls");
    expect(dashboardStyles).toContain("top: 126px");
    expect(dashboardStyles).toContain(".registry-comparison-bar");
    expect(dashboardStyles).toContain(".registry-favorite-folder-panel");
    expect(dashboardStyles).toContain(".map-header");
  });
});
