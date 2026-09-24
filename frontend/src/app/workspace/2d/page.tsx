"use client";

import React, { useState, useMemo } from "react";
import { GeoJSONFeatureCollection, GeoJSONFeature } from "@/types/cadastre";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";
import { CadastralMap } from "@/components/cadastral/CadastralMap";
import { ParcelInspector } from "@/components/cadastral/ParcelInspector";
import { BuildingConfigModal } from "@/components/cadastral/BuildingConfigModal";
import { DataSourcesPanel } from "@/components/cadastral/DataSourcesPanel";
import { DrawingImportModal } from "@/components/drawing/DrawingImportModal";
import { DrawingReviewWorkspace } from "@/components/drawing/DrawingReviewWorkspace";
import { resolveBuildingSourceAttributes } from "@/lib/cadastral/sourceAttributes";
import { cadastreApi } from "@/lib/api/client";

export default function Cadastral2DPage() {
  const router = useRouter();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"inspector" | "sources">("inspector");
  const [visibleReferenceSourceIds, setVisibleReferenceSourceIds] = useState<string[]>([]);
  const [referenceFeaturesGeojson, setReferenceFeaturesGeojson] = useState<GeoJSONFeatureCollection | null>(null);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string | null>(null);

  const {
    isLoading,
    isAssociating,
    isSamplingElevation,
    isCalculatingHeight,
    isGeneratingFloors,
    generalError,
    associationError,
    elevationError,
    heightError,
    floorError,
    geojson,
    buildingsGeojson,
    unitsGeojson,
    configuredUnits,
    validationResult,
    associationData,
    demMetadata,
    property3DData,
    ulpins3D,
    selectedParcelId,
    selectedParcel,
    selectedBuildingId,
    selectedBuilding,
    selectedBuildingMetadata,
    selectedParcelAssociatedBuildings,
    selectedParcelElevation,
    selectedBuildingElevation,
    selectedBuildingHeight,
    selectedBuildingFloors,
    selectedBuildingSpec,
    selectedBuilding3D,
    selectedBuildingFloors3D,
    selectedFloorId,
    selectedPropertyId,
    selectedUnitId,
    unitPropertyRecord,
    layerVisibility,
    toggleLayer,
    loadDemoParcels,
    loadDemoBuildings,
    loadRealOSMBuildings,
    loadDemoUnits,
    sampleActiveElevation,
    calculateSelectedBuildingHeight,
    generateSelectedBuildingFloors,
    setSelectedParcelId,
    setSelectedBuildingId,
    setSelectedFloorId,
    setSelectedPropertyId,
    setSelectedUnitId,
    setSubView3D,
    undergroundBundle,
    selectedUndergroundId,
    setSelectedUndergroundId,
    loadDemoUnderground,
    topologyData,
    isAuditingTopology,
    runTopologyAudit,
    loadDemoTopology,
    activeDatasetId,
    activeDatasetName,
    buildingDatasetName,
    generateConfiguredBuilding3D,
    runRealWorldDemo,
    resetRealWorldDemo,
    isDemoRunning,
    spatialSourceStatus,
    drawingAnalysis,
    setDrawingAnalysis,
    isDrawingImportOpen,
    setIsDrawingImportOpen,
    isDrawingReviewOpen,
    setIsDrawingReviewOpen,
    handleModelBuiltFromDrawings,
  } = useCadastreContext();

  const sourceAttributes = useMemo(() => {
    if (!selectedBuilding && !selectedBuildingMetadata) return null;
    return resolveBuildingSourceAttributes(selectedBuilding, selectedBuildingMetadata);
  }, [selectedBuilding, selectedBuildingMetadata]);

  const undergroundGeojson: GeoJSONFeatureCollection | null = useMemo(() => {
    if (!undergroundBundle || !undergroundBundle.features) return null;
    return {
      type: "FeatureCollection",
      features: undergroundBundle.features.map((feat) => ({
        type: "Feature",
        id: feat.underground_feature_id,
        geometry: (feat.geometry_2d as GeoJSONFeature["geometry"]) || { type: "Polygon", coordinates: [] },
        properties: {
          underground_feature_id: feat.underground_feature_id,
          name: feat.name,
          feature_type: feat.feature_type,
          utility_type: feat.utility_type,
          depth_to_top_m: feat.depth_to_top_m,
          depth_to_base_m: feat.depth_to_base_m,
          is_cadastral_property: feat.is_cadastral_property,
        },
      })),
    };
  }, [undergroundBundle]);

  // Step 9: Reset reference layers and source filter on active dataset switch
  const [prevDatasetId, setPrevDatasetId] = useState(activeDatasetId);
  if (activeDatasetId !== prevDatasetId) {
    setPrevDatasetId(activeDatasetId);
    setVisibleReferenceSourceIds([]);
    setReferenceFeaturesGeojson(null);
    setSelectedSourceFilter(null);
  }

  // Step 9: Load reference features when visible sources toggle
  const handleToggleReferenceLayer = async (sourceId: string, visible: boolean) => {
    const nextIds = visible
      ? [...visibleReferenceSourceIds, sourceId]
      : visibleReferenceSourceIds.filter((id) => id !== sourceId);
    setVisibleReferenceSourceIds(nextIds);

    if (nextIds.length === 0) {
      setReferenceFeaturesGeojson(null);
      return;
    }

    try {
      const allFeatures: GeoJSONFeature[] = [];
      for (const sId of nextIds) {
        const fc = await cadastreApi.getSourceFeatures(activeDatasetId, sId);
        if (fc && fc.features) {
          allFeatures.push(...(fc.features as GeoJSONFeature[]));
        }
      }
      setReferenceFeaturesGeojson({
        type: "FeatureCollection",
        features: allFeatures,
      });
    } catch (err) {
      console.error("Failed to load reference features:", err);
    }
  };

  // Step 9: Source-filtered buildings GeoJSON
  const displayedBuildingsGeojson = useMemo(() => {
    if (!buildingsGeojson || !selectedSourceFilter) return buildingsGeojson;
    if (selectedSourceFilter.toUpperCase().includes("OSM")) return buildingsGeojson;
    return {
      ...buildingsGeojson,
      features: buildingsGeojson.features.filter(
        (f) =>
          f.properties?.source_id === selectedSourceFilter ||
          f.properties?.source === selectedSourceFilter
      ),
    };
  }, [buildingsGeojson, selectedSourceFilter]);

  const crsString = validationResult?.crs || geojson?.crs?.properties?.name || "WGS 84 (EPSG:4326)";
  const hasData =
    (geojson && geojson.features.length > 0) ||
    (buildingsGeojson && buildingsGeojson.features.length > 0);

  /* ── Layer toggle helper ──────────────────────────────────────────── */
  const layerBtn = (
    key: "parcels" | "buildings" | "units" | "underground",
    label: string,
    count: number,
    activeVariant: "sage" | "geo" | "accent" | "neutral"
  ) => {
    const active = layerVisibility[key];
    const activeStyles: Record<string, React.CSSProperties> = {
      sage: { backgroundColor: "var(--sth-sage-bg)", color: "var(--sth-sage)", border: "1px solid #C0CAC0" },
      geo: { backgroundColor: "var(--sth-geo-bg)", color: "var(--sth-geo)", border: "1px solid #D8C8A8" },
      accent: { backgroundColor: "var(--sth-clay-bg)", color: "var(--sth-accent)", border: "1px solid #DDBCB4" },
      neutral: { backgroundColor: "var(--sth-surface)", color: "var(--sth-text-2)", border: "1px solid var(--sth-border)" },
    };
    const inactiveStyle: React.CSSProperties = {
      backgroundColor: "var(--sth-surface)",
      color: "var(--sth-text-2)",
      border: "1px solid var(--sth-border)",
    };

    return (
      <button
        type="button"
        onClick={() => {
          if (key === "underground" && !undergroundBundle) loadDemoUnderground();
          toggleLayer(key);
        }}
        className="px-2 py-1 rounded text-[11px] transition-colors cursor-pointer"
        style={{
          ...(active ? activeStyles[activeVariant] : inactiveStyle),
          fontFamily: "var(--font-mono)",
        }}
      >
        {label} ({count})
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative">
      {/* ── Real-World Demo Action Strip (Visible Change #8 & #10) ───── */}
      {activeDatasetId === "STHARA-REALWORLD-DEMO" && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs shrink-0 z-20 gap-2 border-b"
          style={{
            backgroundColor: "var(--sth-sage-bg)",
            borderColor: "#C0CAC0",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider"
              style={{ backgroundColor: "var(--sth-sage)", color: "#FFFFFF" }}
            >
              REAL-WORLD DEMO ACTIVE
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--sth-text)" }}>
              Connaught Tower A (4 Floors, 7 Units)
            </span>
            <span className="text-[10px] hidden md:inline" style={{ color: "var(--sth-text-2)" }}>
              Source: OpenStreetMap | Geometry: Validated | EPSG:32643
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => router.push("/workspace/2d")}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--sth-card)", color: "var(--sth-text)", border: "1px solid var(--sth-border)" }}
            >
              2D MAP
            </button>
            <button
              type="button"
              onClick={() => router.push("/workspace/3d")}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--sth-accent)", color: "#FFFFFF" }}
            >
              3D VIEW
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectorOpen(true);
                setInspectorTab("inspector");
              }}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--sth-surface)", color: "var(--sth-text)", border: "1px solid var(--sth-border)" }}
            >
              INSPECT
            </button>
            <button
              type="button"
              onClick={resetRealWorldDemo}
              disabled={isDemoRunning}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
              style={{ backgroundColor: "var(--sth-clay-bg)", color: "var(--sth-clay)", border: "1px solid #DDBCB4" }}
            >
              RESET DEMO
            </button>
          </div>
        </div>
      )}

      {/* ── Sub-header toolbar ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs shrink-0 z-10 gap-3"
        style={{
          borderBottom: "1px solid var(--sth-border)",
          backgroundColor: "var(--sth-card)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Label */}
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--sth-sage)" }}
            />
            <span className="font-semibold uppercase tracking-widest text-[10px]" style={{ color: "var(--sth-text)" }}>
              2D Cadastral GIS
            </span>
          </div>

          {/* Active dataset chip */}
          <span
            className="px-2 py-0.5 rounded border text-[11px] truncate max-w-[260px]"
            style={{
              color: "var(--sth-geo)",
              borderColor: "#D8C8A8",
              backgroundColor: "var(--sth-geo-bg)",
            }}
            title={activeDatasetName || buildingDatasetName || activeDatasetId}
          >
            {activeDatasetName || buildingDatasetName || activeDatasetId}
          </span>

          <span style={{ color: "var(--sth-border)" }}>|</span>

          {/* Layer toggles */}
          <div className="flex items-center gap-1.5">
            {layerBtn("parcels", "Parcels", geojson?.features?.length || 0, "sage")}
            {layerBtn("buildings", "Buildings", buildingsGeojson?.features?.length || 0, "accent")}
            {layerBtn("units", "Units", unitsGeojson?.features?.length || 0, "geo")}
            {layerBtn("underground", "Subsurface", undergroundBundle?.total_features || 0, "neutral")}

            {/* Step 9: Sources Launcher */}
            <button
              type="button"
              onClick={() => {
                setInspectorOpen(true);
                setInspectorTab("sources");
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer"
              style={{
                backgroundColor: inspectorTab === "sources" && inspectorOpen ? "var(--sth-sage-bg)" : "var(--sth-surface)",
                color: inspectorTab === "sources" && inspectorOpen ? "var(--sth-sage)" : "var(--sth-text-2)",
                border: "1px solid var(--sth-border)",
              }}
              title="Manage Spatial Sources & Reference Layers"
            >
              <span>Sources</span>
              {visibleReferenceSourceIds.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            {/* Step 37+: Unified Project Data Entry Link */}
            <Link
              href="/data"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer shadow-sm hover:border-[#A85D48]"
              style={{
                backgroundColor: "var(--sth-surface)",
                color: "var(--sth-text)",
                border: "1px solid var(--sth-border)",
              }}
              title="STHARA Unified Project Data Entry: Upload all maps and drawings together"
            >
              <span>📁</span>
              <span className="font-semibold">Project Data</span>
            </Link>

            {/* Step 21-36: Drawing Intelligence Button */}
            <button
              type="button"
              onClick={() => {
                if (drawingAnalysis) {
                  setIsDrawingReviewOpen(true);
                } else {
                  setIsDrawingImportOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer shadow-sm"
              style={{
                backgroundColor: drawingAnalysis ? "var(--sth-clay-bg)" : "var(--sth-surface)",
                color: drawingAnalysis ? "var(--sth-accent)" : "var(--sth-text-2)",
                border: drawingAnalysis ? "1px solid #DDBCB4" : "1px solid var(--sth-border)",
              }}
              title="STHARA Drawing Intelligence: Ingest PDFs and generate 3D models"
            >
              <span>📐</span>
              <span className="font-semibold">
                {drawingAnalysis ? `Drawings (${drawingAnalysis.documents.length})` : "Project Drawings"}
              </span>
            </button>

            {spatialSourceStatus?.active_mode === "DRAWINGS_ONLY" && (
              <span
                className="px-2 py-0.5 rounded border text-[10px] font-mono font-bold bg-[#A85D48]/10 text-[#A85D48] border-[#DDBCB4]"
                title="OSM data is missing or empty. Project drawings form the primary spatial source."
              >
                MODE B (DRAWINGS ONLY)
              </span>
            )}

            {selectedSourceFilter && (
              <button
                type="button"
                onClick={() => setSelectedSourceFilter(null)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 border border-amber-700 text-amber-300 cursor-pointer"
                title="Click to clear source filter"
              >
                <span>Filter: {selectedSourceFilter}</span>
                <span>✕</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick 3D switch */}
          <Link
            href="/workspace/3d"
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              color: "var(--sth-accent)",
              border: "1px solid #DDBCB4",
              backgroundColor: "var(--sth-clay-bg)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>Open 3D</span>
          </Link>

          {/* Inspector toggle */}
          <button
            type="button"
            onClick={() => setInspectorOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer"
            style={{
              color: "var(--sth-text-2)",
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
            }}
            title={inspectorOpen ? "Hide Inspector" : "Show Inspector"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <span>{inspectorOpen ? "Hide" : "Inspect"}</span>
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {(generalError || associationError || elevationError || heightError || floorError) && (
        <div
          className="px-4 py-1.5 text-xs flex items-center gap-2 shrink-0"
          style={{
            fontFamily: "var(--font-mono)",
            borderBottom: "1px solid #DDBCB4",
            backgroundColor: "var(--sth-clay-bg)",
            color: "var(--sth-clay)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--sth-clay)" }} />
          <span>{generalError || associationError || elevationError || heightError || floorError}</span>
        </div>
      )}

      {/* ── Map + Inspector ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* MapLibre Canvas */}
        <div className="flex-1 h-full min-h-[350px] relative">
          <CadastralMap
            geojson={geojson}
            buildingsGeojson={displayedBuildingsGeojson}
            unitsGeojson={unitsGeojson}
            undergroundGeojson={undergroundGeojson}
            referenceFeaturesGeojson={referenceFeaturesGeojson}
            selectedParcelId={selectedParcelId}
            selectedBuildingId={selectedBuildingId}
            selectedUnitId={selectedUnitId}
            selectedUndergroundId={selectedUndergroundId}
            onSelectParcel={setSelectedParcelId}
            onSelectBuilding={setSelectedBuildingId}
            onSelectUnit={setSelectedUnitId}
            onSelectUnderground={setSelectedUndergroundId}
            layerVisibility={layerVisibility}
            onToggleLayer={toggleLayer}
            isActive={true}
          />

          {/* Empty State */}
          {!hasData && !isLoading && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center"
              style={{ backgroundColor: "rgba(243,240,232,0.92)", backdropFilter: "blur(2px)" }}
            >
              <div
                className="max-w-md rounded-md p-8"
                style={{
                  backgroundColor: "var(--sth-card)",
                  border: "1px solid var(--sth-border)",
                  boxShadow: "0 4px 24px rgba(37,38,34,0.10)",
                }}
              >
                {drawingAnalysis ? (
                  <>
                    <div
                      className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-md"
                      style={{
                        border: "1px solid #DDBCB4",
                        backgroundColor: "var(--sth-clay-bg)",
                        color: "var(--sth-accent)",
                      }}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2
                      className="text-base font-semibold mb-2"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                    >
                      Drawing-Only Project Mode Active
                    </h2>
                    <p className="text-xs mb-6 leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
                      OSM building data is unpopulated for this dataset. {drawingAnalysis.documents.length} project drawing(s) ({drawingAnalysis.summary.detected_floors_count} detected floors) are ready for spatial candidate review.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsDrawingReviewOpen(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-md transition-colors cursor-pointer shadow-sm"
                        style={{ backgroundColor: "var(--sth-accent)", color: "#fff" }}
                      >
                        📐 Review Drawing Candidates &amp; Build 3D Model
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-md"
                      style={{
                        border: "1px solid var(--sth-border)",
                        backgroundColor: "var(--sth-surface)",
                        color: "var(--sth-accent)",
                      }}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h2
                      className="text-base font-semibold mb-2"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                    >
                      No 2D Data Loaded
                    </h2>
                    <p className="text-xs mb-6 leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
                      Load cadastral parcels, building footprints, real OpenStreetMap data, or attach architectural project drawings.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 flex-wrap">
                      {[
                        { label: "Load Parcels", onClick: loadDemoParcels, variant: "sage" },
                        { label: "Load Buildings", onClick: loadDemoBuildings, variant: "geo" },
                        { label: "Load Real OSM", onClick: loadRealOSMBuildings, variant: "accent" },
                        { label: "Load Units", onClick: loadDemoUnits, variant: "neutral" },
                        { label: "Import Drawings", onClick: () => setIsDrawingImportOpen(true), variant: "accent" },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={btn.onClick}
                          className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-semibold px-3.5 py-2 rounded-md transition-colors cursor-pointer"
                          style={
                            btn.variant === "sage"
                              ? { backgroundColor: "var(--sth-sage)", color: "#fff" }
                              : btn.variant === "geo"
                              ? { backgroundColor: "var(--sth-geo)", color: "#fff" }
                              : btn.variant === "accent"
                              ? { backgroundColor: "var(--sth-accent)", color: "#fff" }
                              : {
                                  border: "1px solid var(--sth-border)",
                                  backgroundColor: "var(--sth-surface)",
                                  color: "var(--sth-text-2)",
                                }
                          }
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {(isLoading || isAssociating) && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{ backgroundColor: "rgba(243,240,232,0.7)", backdropFilter: "blur(1px)" }}
            >
              <div
                className="rounded-md px-4 py-3 flex items-center gap-3 text-xs shadow-xl"
                style={{
                  fontFamily: "var(--font-mono)",
                  border: "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-card)",
                  color: "var(--sth-text)",
                }}
              >
                <span
                  className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--sth-border)", borderTopColor: "var(--sth-accent)" }}
                />
                <span>{isAssociating ? "Running spatial association…" : "Loading 2D dataset…"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Dock */}
        {inspectorOpen && (
          <aside
            aria-label="2D Cadastral Inspector"
            className="w-full lg:w-[380px] shrink-0 h-full flex flex-col overflow-hidden"
            style={{
              borderLeft: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
            }}
          >
            {/* Dock Tab Selector */}
            <div
              className="flex border-b text-xs shrink-0"
              style={{
                borderColor: "var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <button
                type="button"
                onClick={() => setInspectorTab("inspector")}
                className={`flex-1 py-2 text-center text-[11px] font-medium transition-colors cursor-pointer ${
                  inspectorTab === "inspector"
                    ? "font-semibold text-zinc-100 border-b-2"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={{
                  borderBottomColor: inspectorTab === "inspector" ? "var(--sth-geo)" : "transparent",
                }}
              >
                Cadastral Inspector
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("sources")}
                className={`flex-1 py-2 text-center text-[11px] font-medium transition-colors cursor-pointer ${
                  inspectorTab === "sources"
                    ? "font-semibold text-zinc-100 border-b-2"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                style={{
                  borderBottomColor: inspectorTab === "sources" ? "var(--sth-sage)" : "transparent",
                }}
              >
                Data Sources & Fusion
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {inspectorTab === "inspector" ? (
                <ParcelInspector
                  selectedParcel={selectedParcel}
                  selectedBuilding={selectedBuilding}
                  associatedBuildingIds={selectedParcelAssociatedBuildings}
                  associationSummary={associationData?.summary}
                  crs={crsString}
                  parcelElevation={selectedParcelElevation}
                  buildingElevation={selectedBuildingElevation}
                  buildingHeight={selectedBuildingHeight}
                  buildingFloors={selectedBuildingFloors}
                  buildingSpec={selectedBuildingSpec}
                  building3D={selectedBuilding3D}
                  buildingFloors3D={selectedBuildingFloors3D}
                  properties3D={property3DData?.results}
                  ulpins3D={ulpins3D}
                  units={Object.values(configuredUnits).length > 0 ? Object.values(configuredUnits) : unitsGeojson?.features?.map((f) => f.properties)}
                  selectedFloorId={selectedFloorId}
                  selectedPropertyId={selectedPropertyId}
                  selectedUnitId={selectedUnitId}
                  unitPropertyRecord={unitPropertyRecord}
                  demMetadata={demMetadata}
                  isSamplingElevation={isSamplingElevation}
                  isCalculatingHeight={isCalculatingHeight}
                  isGeneratingFloors={isGeneratingFloors}
                  onSelectParcelId={setSelectedParcelId}
                  onSelectBuildingId={setSelectedBuildingId}
                  onSelectFloorId={setSelectedFloorId}
                  onSelectPropertyId={setSelectedPropertyId}
                  onSelectUnitId={setSelectedUnitId}
                  onSampleElevation={sampleActiveElevation}
                  onCalculateHeight={calculateSelectedBuildingHeight}
                  onGenerateFloors={generateSelectedBuildingFloors}
                  onSwitchTo3D={() => {
                    setSubView3D("building");
                    router.push("/workspace/3d");
                  }}
                  onSwitchToFloors3D={() => {
                    setSubView3D("floors");
                    router.push("/workspace/3d");
                  }}
                  onSwitchToProperty3D={() => {
                    setSubView3D("property");
                    router.push("/workspace/3d");
                  }}
                  onConfigureFloors={() => setConfigModalOpen(true)}
                  topologyData={topologyData}
                  isAuditingTopology={isAuditingTopology}
                  onRunTopologyAudit={runTopologyAudit}
                  onLoadDemoTopology={loadDemoTopology}
                />
              ) : (
                <DataSourcesPanel
                  key={activeDatasetId}
                  activeDatasetId={activeDatasetId}
                  onToggleReferenceLayer={handleToggleReferenceLayer}
                  visibleReferenceSourceIds={visibleReferenceSourceIds}
                  onSelectSourceFilter={setSelectedSourceFilter}
                  selectedSourceFilter={selectedSourceFilter}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 2D -> 3D Building Floor Configuration Modal */}
      <BuildingConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        buildingId={selectedBuildingId}
        buildingName={selectedBuildingId ? `Building ${selectedBuildingId}` : undefined}
        sourceAttributes={sourceAttributes}
        initialFloors={sourceAttributes?.defaultFloors || selectedBuildingFloors?.floors?.length || 5}
        initialBasements={sourceAttributes?.defaultBasements ?? 0}
        initialHeight={sourceAttributes?.defaultHeight || selectedBuildingHeight?.building_height || 18.0}
        onGenerate={async (config) => {
          await generateConfiguredBuilding3D({
            buildingId: config.buildingId,
            numberOfFloors: config.numberOfFloors,
            numberOfBasements: config.numberOfBasements,
            buildingHeight: config.buildingHeight,
          });
          setSubView3D("floors");
          router.push("/workspace/3d");
        }}
      />

      {/* Drawing Import Modal */}
      <DrawingImportModal
        isOpen={isDrawingImportOpen}
        onClose={() => setIsDrawingImportOpen(false)}
        datasetId={activeDatasetId}
        onAnalysisReady={(analysis) => {
          setDrawingAnalysis(analysis);
          setIsDrawingReviewOpen(true);
        }}
      />

      {/* Drawing Review & 3D Model Building Workspace */}
      {drawingAnalysis && (
        <DrawingReviewWorkspace
          isOpen={isDrawingReviewOpen}
          onClose={() => setIsDrawingReviewOpen(false)}
          analysis={drawingAnalysis}
          datasetId={activeDatasetId}
          onModelBuilt={async (result) => {
            await handleModelBuiltFromDrawings(result);
          }}
        />
      )}
    </div>
  );
}
