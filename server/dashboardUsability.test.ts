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

  it("streams selectable OSM 3D Tiles while keeping them distinct from source-backed property evidence", () => {
    expect(cesiumViewerSource).toContain("createOsmBuildingsAsync");
    expect(cesiumViewerSource).toContain(
      "OSM 3D TILE SELECTED · VISUAL CONTEXT"
    );
    expect(cesiumViewerSource).toContain("selectOsmBuilding");
    expect(cesiumViewerSource).toContain("OSM Buildings");
    expect(cesiumViewerSource).toContain(
      "PostGIS source metadata remains separate"
    );
    expect(cesiumViewerSource).toContain("do not establish parcel");
    expect(cesiumViewerSource).toContain("sourceBuildingSelection");
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

  it("provides an explicit 2D and 3D toggle for source-record map views", () => {
    expect(workspaceSource).toContain("sourceMapView");
    expect(workspaceSource).toContain('aria-label="Source record map view"');
    expect(workspaceSource).toContain("view.toUpperCase()");
    expect(workspaceSource).toContain("sourceMapView={sourceMapView}");
    expect(cesiumViewerSource).toContain('sourceMapView?: "2d" | "3d"');
    expect(cesiumViewerSource).toContain('sourceMapView === "3d"');
  });

  it("supports searching and filtering browser-local mock identity records", () => {
    expect(workspaceSource).toContain("mockRecordQuery");
    expect(workspaceSource).toContain(
      "Search mock ULPIN and ownership records"
    );
    expect(workspaceSource).toContain("Mock ULPINs");
    expect(workspaceSource).toContain('mockRecordFilter === "ownership"');
    expect(workspaceSource).toContain("filteredMockRecords");
  });

  it("groups mock search results by explicit property type without changing authority status", () => {
    expect(workspaceSource).toContain("propertyType");
    expect(workspaceSource).toContain("groupedMockRecords");
    expect(workspaceSource).toContain("Group by property type");
    expect(workspaceSource).toContain("Grouped by property type");
    expect(workspaceSource).toContain("Mock record finder");
  });

  it("provides a clearly labeled role simulation without changing authorization", () => {
    expect(workspaceSource).toContain("DemoRole");
    expect(workspaceSource).toContain("Citizen");
    expect(workspaceSource).toContain("Surveyor");
    expect(workspaceSource).toContain("Authority");
    expect(workspaceSource).toContain("role-specific screens only");
    expect(workspaceSource).toContain("users or grant rights");
    expect(workspaceSource).toContain("real authorization remains separate");
  });

  it("filters mock ownership visibility by simulated role and exposes Authority-only mock review requests", () => {
    expect(workspaceSource).toContain("canViewMockOwnership");
    expect(workspaceSource).toContain("Ownership placeholder hidden");
    expect(workspaceSource).toContain("Authority demo view");
    expect(workspaceSource).toContain("mockApprovalRequests");
    expect(workspaceSource).toContain("Mock ULPIN approval requests");
    expect(workspaceSource).toContain("no real applicant, approval, or");
  });

  it("provides a property-type color legend for grouped mock records", () => {
    expect(workspaceSource).toContain("mockPropertyTypeColors");
    expect(workspaceSource).toContain("spatial-property-type-dot");
    expect(workspaceSource).toContain("Property type legend");
    expect(workspaceSource).toContain("Campus facility");
  });

  it("shows a hover summary before selecting a mock floor", () => {
    expect(workspaceSource).toContain("hoveredMockFloor");
    expect(cesiumViewerSource).toContain(
      "onMockFloorHover?: (floorLevel: number | null)"
    );
    expect(cesiumViewerSource).toContain("cesium-mock-floor-hover");
    expect(cesiumViewerSource).toContain("Ownership status: mock placeholder");
    expect(cesiumViewerSource).toContain("click to inspect details");
    expect(cesiumViewerSource).toContain(
      "Illustrative mock floor plan thumbnail"
    );
    expect(cesiumViewerSource).toContain("Illustrative plan · not to scale");
  });

  it("makes mock floor levels interactive with floor-specific rights details", () => {
    expect(workspaceSource).toContain("selectedMockFloor");
    expect(workspaceSource).toContain("Floor-level detail");
    expect(workspaceSource).toContain("MOCK-FLOOR-");
    expect(workspaceSource).toContain(
      "onMockFloorSelect={setSelectedMockFloor}"
    );
    expect(cesiumViewerSource).toContain(
      "onMockFloorSelect?: (floorLevel: number)"
    );
    expect(cesiumViewerSource).toContain("DEMO floor level");
    expect(cesiumViewerSource).toContain("floorMatch");
  });

  it("adds a selected-building mock floor stack without implying an approved floor plan", () => {
    expect(workspaceSource).toContain("mockFloorLevels={selected ? 4 : 0}");
    expect(workspaceSource).toContain("4 mock floor levels shown in 3D only");
    expect(cesiumViewerSource).toContain("mockFloorLevels?: number");
    expect(cesiumViewerSource).toContain("DEMO floor level");
    expect(workspaceSource).toContain("not an approved floor plan");
  });

  it("uses property-type colors and a readable mock-rights evidence panel", () => {
    expect(workspaceSource).toContain("mockPropertyTypeColors");
    expect(workspaceSource).toContain("spatial-property-type-dot");
    expect(workspaceSource).toContain("Prototype data panel");
    expect(workspaceSource).toContain(
      "not government ownership or rights records"
    );
    expect(workspaceSource).toContain("Mock only · authority record required");
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

  it("exports mock identity and ownership details with a demo-only disclaimer", () => {
    expect(workspaceSource).toContain("exportMockDetailsPdf");
    expect(workspaceSource).toContain("Export mock details PDF");
    expect(workspaceSource).toContain(
      "ulpin-vpm-mock-identity-rights-report.pdf"
    );
    expect(workspaceSource).toContain("does not create an official ULPIN");
    expect(workspaceSource).toContain("disabled={mockRecords.length === 0}");
  });

  it("supports browser-local sample floor-plan and 3D-model map previews", () => {
    expect(workspaceSource).toContain("handleSampleAssetUpload");
    expect(workspaceSource).toContain("handleSampleAssetDrop");
    expect(workspaceSource).toContain("sampleUploadProgress");
    expect(workspaceSource).toContain("spatial-upload-dropzone");
    expect(workspaceSource).toContain("Reading sample locally");
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

  it("keeps Buildings explorer copy and long source-record labels readable without horizontal clipping", () => {
    expect(dashboardStyles).toContain(".explorer-record-list button span");
    expect(dashboardStyles).toContain(".explorer-record-list button small");
    expect(dashboardStyles).toContain("overflow-wrap: anywhere");
    expect(dashboardStyles).toContain("white-space: normal");
    expect(dashboardStyles).toContain(
      ".explorer-segment-card .spatial-institution-lock small"
    );
    expect(dashboardStyles).toContain(".spatial-dossier-title > div");
  });
});
