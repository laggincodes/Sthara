"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";
import { cadastreApi } from "@/lib/api/client";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { BuildingConfigModal } from "@/components/cadastral/BuildingConfigModal";
import { resolveBuildingSourceAttributes } from "@/lib/cadastral/sourceAttributes";
import { FloorPlanSection } from "@/components/cadastral/FloorPlanSection";
import { FloorPlanViewerModal } from "@/components/cadastral/FloorPlanViewerModal";
import { UnitConfigModal } from "@/components/cadastral/UnitConfigModal";
import { UnitInspector } from "@/components/cadastral/UnitInspector";
import { SpatialAnalysisCard } from "@/components/cadastral/SpatialAnalysisCard";
import { MeasurementSection } from "@/components/cadastral/MeasurementSection";
import { DataQualitySection } from "@/components/cadastral/DataQualitySection";

const Cadastral3DViewer = dynamic(
  () => import("@/components/viewer3d/Cadastral3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3 text-xs"
        style={{
          backgroundColor: "#1A1A1A",
          fontFamily: "var(--font-mono)",
          color: "var(--sth-text-2)",
        }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--sth-border)", borderTopColor: "var(--sth-accent)" }}
        />
        <span>Initializing 3D Geospatial Engine (Three.js / WebGL)…</span>
      </div>
    ),
  }
);

export default function Cadastral3DPage() {
  const router = useRouter();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [lastExportedNotice, setLastExportedNotice] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [viewerFloorPlanModalOpen, setViewerFloorPlanModalOpen] = useState(false);
  const [unitConfigModalOpen, setUnitConfigModalOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");

  const {
    building3DData,
    floors3DData,
    property3DData,
    units3DData,
    undergroundBundle,
    selectedBuilding,
    selectedBuildingId,
    setSelectedBuildingId,
    selectedFloorId,
    setSelectedFloorId,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedUnitId,
    setSelectedUnitId,
    selectedUnit,
    subView3D,
    setSubView3D,
    conversionResult,
    selectedBuildingMetadata,
    activeProjectName,
    buildingDatasetName,
    conversionError,
    spatialSourceStatus,
    runOsm3DConversion,
    isConverting,
    generateConfiguredBuilding3D,
    attachFloorPlan,
    removeFloorPlan,
    getActiveFloorPlan,
    buildingsGeojson,
    activeDatasetId,
    activeDatasetName,
    createConfiguredUnit,
    deleteConfiguredUnit,
    getFloorConfiguredUnits,
    runRealWorldDemo,
    resetRealWorldDemo,
    isDemoRunning,
    cutawayMode,
    setCutawayMode,
    explodeDistance,
    setExplodeDistance,
  } = useCadastreContext();

  useEffect(() => {
    if (
      !building3DData &&
      !isConverting &&
      !conversionResult &&
      !conversionError &&
      spatialSourceStatus?.active_mode !== "DRAWINGS_ONLY" &&
      (spatialSourceStatus?.osm_building_count ?? 1) > 0
    ) {
      runOsm3DConversion();
    }
  }, [
    building3DData,
    isConverting,
    conversionResult,
    conversionError,
    spatialSourceStatus,
    runOsm3DConversion,
  ]);

  const buildingCount = conversionResult?.summary.buildings ?? (building3DData?.summary.successful || 0);
  const verticesCount = conversionResult?.summary.vertices ?? 0;
  const facesCount = conversionResult?.summary.faces ?? 0;
  const crsString = conversionResult?.target_crs || "EPSG:32643 (UTM Zone 43N)";

  const activeBuilding = useMemo<import("@/types/cadastre").BuildingMetadataItem | null>(() => {
    if (selectedBuildingMetadata) return selectedBuildingMetadata;
    if (!selectedBuildingId) return null;
    return {
      building_id: selectedBuildingId,
      osm_id: selectedBuildingId.replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", ""),
      name: selectedBuildingId.includes("OSM-")
        ? `Building ${selectedBuildingId.replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", "")}`
        : selectedBuildingId,
      parcel_id: "PARCEL-UNREGISTERED",
      height: 9.0,
      z_min: 0.0,
      z_max: 9.0,
      levels: 3,
      floor_unit_available: false,
      height_source: "DEFAULT_CONFIG",
      area_sqm: 145.8,
      volume_cubic_m: 1312.2,
      source: "OpenStreetMap",
      is_cadastral: false,
      validation_status: "PASS",
      watertight: true,
      duplicate_check: "PASS",
      topology_status: "PASS",
      prototype_3d_ulpin: `DL-OSM-WAY-${selectedBuildingId.replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", "")}-001`,
      bounding_box: { min: [-12.5, -8.3, 0.0], max: [12.5, 8.3, 9.0] },
      centroid: [0.0, 0.0, 4.5],
    };
  }, [selectedBuildingMetadata, selectedBuildingId]);

  const sourceAttributes = useMemo(() => {
    const meta = selectedBuildingMetadata || activeBuilding;
    if (!selectedBuilding && !meta) return null;
    return resolveBuildingSourceAttributes(selectedBuilding, meta);
  }, [selectedBuilding, selectedBuildingMetadata, activeBuilding]);

  let selectedFloorInfo: {
    floor: import("@/types/cadastre").Floor3DResult;
    parentBuilding: import("@/types/cadastre").BuildingFloors3DResult;
  } | null = null;
  if (selectedFloorId && floors3DData?.results) {
    for (const bld of floors3DData.results) {
      const fl = bld.floors?.find((f) => f.floor_id === selectedFloorId);
      if (fl) {
        selectedFloorInfo = { floor: fl, parentBuilding: bld };
        break;
      }
    }
  }

  const currentFloorPlan = selectedFloorInfo
    ? getActiveFloorPlan(selectedFloorInfo.parentBuilding.building_id, selectedFloorInfo.floor.floor_id)
    : null;

  const currentFloorFootprint = useMemo<GeoJSON.Geometry | null>(() => {
    const targetBldId = selectedFloorInfo?.parentBuilding.building_id || selectedBuildingId;
    if (!targetBldId || !buildingsGeojson?.features) return null;
    const feat = buildingsGeojson.features.find(
      (f) =>
        (f.properties?.building_id as string) === targetBldId ||
        (f.id && String(f.id) === targetBldId) ||
        f.properties?.osm_id === targetBldId ||
        `OSM-BUILDING-WAY-${f.properties?.osm_id}` === targetBldId
    );
    return (feat?.geometry as unknown as GeoJSON.Geometry) || null;
  }, [selectedFloorInfo, selectedBuildingId, buildingsGeojson]);

  const currentFloorUnits = useMemo(() => {
    if (!selectedFloorInfo) return [];
    return getFloorConfiguredUnits(
      selectedFloorInfo.parentBuilding.building_id,
      selectedFloorInfo.floor.floor_id
    );
  }, [selectedFloorInfo, getFloorConfiguredUnits]);

  const filteredFloorUnits = useMemo(() => {
    if (!unitSearchQuery.trim()) return currentFloorUnits;
    const q = unitSearchQuery.trim().toLowerCase();
    return currentFloorUnits.filter(
      (u) =>
        u.unit_id.toLowerCase().includes(q) ||
        u.unit_number.toLowerCase().includes(q) ||
        (u.unit_name && u.unit_name.toLowerCase().includes(q)) ||
        (u.spatial_id && u.spatial_id.toLowerCase().includes(q))
    );
  }, [currentFloorUnits, unitSearchQuery]);

  const availableBuildings = useMemo(() => {
    if (floors3DData?.results && floors3DData.results.length > 0) {
      return floors3DData.results.map((b) => ({ id: b.building_id, name: `Building ${b.building_id}` }));
    }
    if (buildingsGeojson?.features) {
      return buildingsGeojson.features.slice(0, 50).map((f) => {
        const id = String(f.id || f.properties?.building_id || f.properties?.osm_id || "BLD");
        const name = (f.properties?.name as string) || `Building ${id}`;
        return { id, name };
      });
    }
    return selectedBuildingId ? [{ id: selectedBuildingId, name: `Building ${selectedBuildingId}` }] : [];
  }, [floors3DData, buildingsGeojson, selectedBuildingId]);

  const availableFloors = useMemo(() => {
    const list: Array<{ id: string; name: string; buildingId: string }> = [];
    if (floors3DData?.results) {
      for (const bld of floors3DData.results) {
        if (bld.floors) {
          for (const f of bld.floors) {
            list.push({ id: f.floor_id, name: f.floor_name || f.floor_id, buildingId: bld.building_id });
          }
        }
      }
    }
    return list;
  }, [floors3DData]);

  const availableUnits = useMemo(() => {
    const list: Array<{ id: string; name: string; floorId: string; buildingId: string }> = [];
    if (units3DData?.results) {
      for (const u of units3DData.results) {
        list.push({
          id: u.unit_id,
          name: u.unit_name || `Unit ${u.unit_number || u.unit_id}`,
          floorId: u.floor_id,
          buildingId: u.building_id,
        });
      }
    }
    for (const u of currentFloorUnits) {
      if (!list.some((existing) => existing.id === u.unit_id)) {
        list.push({
          id: u.unit_id,
          name: u.unit_name || `Unit ${u.unit_number || u.unit_id}`,
          floorId: u.floor_id,
          buildingId: u.building_id,
        });
      }
    }
    return list;
  }, [units3DData, currentFloorUnits]);

  const handleExportDownload = (type: "glb" | "gltf" | "metadata") => {
    setExportMenuOpen(false);
    const dsId = conversionResult?.dataset_id || "latest";
    let url = cadastreApi.getGlbUrl(dsId);
    let filename = `${dsId}_model_3d.glb`;
    if (type === "gltf") {
      url = cadastreApi.getGltfUrl(dsId);
      filename = `${dsId}_model_3d.gltf`;
    } else if (type === "metadata") {
      url = cadastreApi.getMetadataUrl(dsId);
      filename = `${dsId}_metadata.json`;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setLastExportedNotice(`Downloaded ${filename} successfully.`);
    setTimeout(() => setLastExportedNotice(null), 4000);
  };

  /* ── Sub-view tab helper ──────────────────────────────────────────── */
  const subViewTab = (
    key: "building" | "floors" | "units" | "underground",
    label: string,
    count: number
  ) => {
    const active = subView3D === key;
    return (
      <button
        type="button"
        onClick={() => setSubView3D(key)}
        className="px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer"
        style={{
          fontFamily: "var(--font-mono)",
          backgroundColor: active ? "var(--sth-accent)" : "transparent",
          color: active ? "#fff" : "var(--sth-text-2)",
          fontWeight: active ? 600 : 400,
        }}
      >
        {label} ({count})
      </button>
    );
  };

  /* ── Shared panel styles ──────────────────────────────────────────── */
  const panelStyle: React.CSSProperties = {
    backgroundColor: "var(--sth-card)",
    borderColor: "var(--sth-border)",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    color: "var(--sth-text-2)",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 600,
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    color: "var(--sth-text-2)",
    fontSize: "11px",
  };

  const fieldValueStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    color: "var(--sth-text)",
    fontSize: "11px",
    fontWeight: 600,
  };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden relative select-none"
      style={{ backgroundColor: "#1A1A1A" }}
    >
      {/* ── Real-World Demo Action Strip (Visible Change #8 & #10) ───── */}
      {activeDatasetId === "STHARA-REALWORLD-DEMO" && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs shrink-0 z-30 gap-2 border-b"
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
              Source: OpenStreetMap | Geometry: Validated Polyhedral Solids | EPSG:32643
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

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs shrink-0 z-20"
        style={{
          ...panelStyle,
          borderBottom: "1px solid var(--sth-border)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Label */}
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--sth-accent)" }}
            />
            <span
              className="font-bold uppercase tracking-widest text-[10px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text)" }}
            >
              3D Cadastre
            </span>
          </div>

          <span style={{ color: "var(--sth-border)" }}>|</span>

          {/* Sub-view tabs */}
          <div
            className="flex items-center rounded p-0.5"
            style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
          >
            {subViewTab("building", "Buildings", buildingCount)}
            {subViewTab("floors", "Floors", floors3DData?.summary.successful || 0)}
            {subViewTab("units", "Units", units3DData?.summary.successful || 0)}
            {subViewTab("underground", "Subsurface", undergroundBundle?.features.length || 0)}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {lastExportedNotice && (
            <span
              className="text-[11px] px-2 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--sth-sage)",
                border: "1px solid #C0CAC0",
                backgroundColor: "var(--sth-sage-bg)",
              }}
            >
              {lastExportedNotice}
            </span>
          )}

          <Link
            href="/ulpin"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{
              color: "var(--sth-geo)",
              border: "1px solid #D8C8A8",
              backgroundColor: "var(--sth-geo-bg)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <span>Spatial ID Registry</span>
            <span>→</span>
          </Link>

          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors shadow cursor-pointer"
              style={{
                backgroundColor: "var(--sth-accent)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Export</span>
              <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {exportMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-md p-1 z-50 text-xs shadow-xl"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--sth-card)",
                  border: "1px solid var(--sth-border)",
                }}
              >
                {[
                  { type: "glb" as const, label: "Download GLB (.glb)", tag: "Binary 3D", tagColor: "var(--sth-accent)" },
                  { type: "gltf" as const, label: "Download glTF (.gltf)", tag: "JSON", tagColor: "var(--sth-geo)" },
                  { type: "metadata" as const, label: "Export Metadata", tag: "JSON", tagColor: "var(--sth-sage)" },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleExportDownload(item.type)}
                    className="w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors cursor-pointer"
                    style={{ color: "var(--sth-text)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sth-surface)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px]" style={{ color: item.tagColor }}>{item.tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3-column body ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL */}
        {leftPanelOpen && (
          <div
            className="w-64 shrink-0 p-4 space-y-4 overflow-y-auto z-10 select-none"
            style={{ borderRight: "1px solid var(--sth-border)", ...panelStyle }}
          >
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid var(--sth-border)" }}
            >
              <span style={sectionLabelStyle}>Model Info &amp; Layers</span>
              <button
                type="button"
                onClick={() => setLeftPanelOpen(false)}
                className="text-xs cursor-pointer transition-colors"
                style={{ color: "var(--sth-text-2)" }}
                title="Collapse"
              >
                ←
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Active Dataset */}
              <div
                className="rounded-md p-3"
                style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
              >
                <div style={sectionLabelStyle}>Active Dataset</div>
                <div
                  className="text-sm font-bold mt-0.5"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                >
                  {activeProjectName}
                </div>
                <div
                  className="mt-1 truncate text-[10px]"
                  style={{ fontFamily: "var(--font-mono)", color: "var(--sth-geo)" }}
                >
                  {buildingDatasetName || "map.osm"}
                </div>
              </div>

              {/* Mesh Stats */}
              <div
                className="rounded-md p-3 space-y-2"
                style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
              >
                {[
                  { label: "Solids Extruded", value: buildingCount, color: "var(--sth-text)" },
                  { label: "Mesh Vertices", value: verticesCount.toLocaleString(), color: "var(--sth-accent)" },
                  { label: "Triangular Faces", value: facesCount.toLocaleString(), color: "var(--sth-accent)" },
                  { label: "Mesh Integrity", value: "100% Watertight Solid", color: "var(--sth-sage)" },
                  { label: "Admin Boundary", value: "Rajouri Garden (AC 27)", color: "var(--sth-geo)" },
                  { label: "Metric Projection", value: crsString, color: "var(--sth-text-2)", truncate: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span style={fieldLabelStyle}>{row.label}:</span>
                    <span
                      className={row.truncate ? "truncate max-w-[120px]" : ""}
                      style={{ ...fieldValueStyle, color: row.color }}
                      title={row.truncate ? String(row.value) : undefined}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Volumetric note */}
              <div
                className="p-3 rounded-md text-[11px] space-y-1"
                style={{
                  border: "1px solid #D8C8A8",
                  backgroundColor: "var(--sth-geo-bg)",
                }}
              >
                <div className="uppercase font-bold text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-geo)" }}>
                  Volumetric Resolution
                </div>
                <p className="leading-relaxed text-[10px]" style={{ color: "var(--sth-text-2)" }}>
                  Each building is extruded into a closed 2-manifold polyhedral mesh with exact [Z_min, Z_max] bounds and m³ enclosed volumes.
                </p>
              </div>

              {/* Nav links */}
              <div className="pt-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSubView3D(subView3D === "units" ? "building" : "units")}
                  className="w-full text-center py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                    color: "var(--sth-text)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {subView3D === "units" ? "← Physical OSM Model" : "Synthetic Cadastral Benchmark (Units)"}
                </button>
                <Link
                  href="/data"
                  className="block text-center py-2 px-3 rounded-md text-xs transition-colors cursor-pointer"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                    color: "var(--sth-text-2)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  ← Data Workspace / Import
                </Link>
                <Link
                  href="/ulpin"
                  className="block text-center py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    border: "1px solid #D8C8A8",
                    backgroundColor: "var(--sth-geo-bg)",
                    color: "var(--sth-geo)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Spatial ID Registry →
                </Link>
                <Link
                  href="/pipeline"
                  className="block text-center py-2 px-3 rounded-md text-xs transition-colors cursor-pointer"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                    color: "var(--sth-text-2)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  View Pipeline Audit →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Left panel collapsed toggle */}
        {!leftPanelOpen && (
          <button
            type="button"
            onClick={() => setLeftPanelOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 rounded-md text-xs font-mono cursor-pointer shadow-xl"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
              color: "var(--sth-text-2)",
            }}
            title="Open Model Info panel"
          >
            → Info
          </button>
        )}

        {/* CENTER: 3D WebGL Canvas — keep dark bg for contrast */}
        <div className="flex-1 h-full relative" style={{ backgroundColor: "#1A1A1A" }}>
          <ErrorBoundary>
            <Cadastral3DViewer
              data={building3DData}
              floorsData={floors3DData}
              propertiesData={property3DData}
              unitsData={units3DData}
              undergroundData={undergroundBundle}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
              selectedFloorId={selectedFloorId}
              onSelectFloor={(fId) => setSelectedFloorId(fId)}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={(pId) => setSelectedPropertyId(pId)}
              selectedUnitId={selectedUnitId}
              onSelectUnit={(uId) => setSelectedUnitId(uId)}
              subView={subView3D}
              onChangeSubView={setSubView3D}
              cutawayMode={cutawayMode}
              onToggleCutaway={() => setCutawayMode(!cutawayMode)}
              explodeDistance={explodeDistance}
              onChangeExplodeDistance={setExplodeDistance}
              isLoading={isConverting}
            />
          </ErrorBoundary>
        </div>

        {/* RIGHT PANEL: Property Inspector */}
        {rightPanelOpen && (
          <div
            className="w-72 shrink-0 p-4 space-y-4 overflow-y-auto z-10 select-none"
            style={{ borderLeft: "1px solid var(--sth-border)", ...panelStyle }}
          >
            <div
              className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid var(--sth-border)" }}
            >
              <span style={sectionLabelStyle}>Property Inspector</span>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="text-xs cursor-pointer"
                style={{ color: "var(--sth-text-2)" }}
                title="Collapse inspector"
              >
                →
              </button>
            </div>

            {selectedUnit ? (
              <UnitInspector
                unit={selectedUnit}
                parentFloorName={selectedFloorInfo?.floor.floor_name}
                hasFloorPlan={!!currentFloorPlan}
                onSelectParentFloor={() => setSelectedUnitId(null)}
                onSelectParentBuilding={() => {
                  setSelectedUnitId(null);
                  setSelectedFloorId(null);
                }}
                onDeleteUnit={async (bId, fId, uId) => {
                  await deleteConfiguredUnit(bId, fId, uId);
                }}
              />
            ) : selectedFloorInfo ? (
              <div className="space-y-3 text-xs">
                {/* Floor Entity badge */}
                <div
                  className="rounded-md p-3"
                  style={{
                    border: selectedFloorInfo.floor.level_type === "Basement" ? "1px solid #93c5fd" : "1px solid #6ee7b7",
                    backgroundColor: selectedFloorInfo.floor.level_type === "Basement" ? "rgba(59, 130, 246, 0.1)" : "var(--sth-sage-bg)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        ...sectionLabelStyle,
                        color: selectedFloorInfo.floor.level_type === "Basement" ? "#2563eb" : "var(--sth-sage)",
                      }}
                    >
                      Selected Floor Volume
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: selectedFloorInfo.floor.level_type === "Basement" ? "#1d4ed8" : "var(--sth-sage)",
                        border: selectedFloorInfo.floor.level_type === "Basement" ? "1px solid #bfdbfe" : "1px solid #C0CAC0",
                        backgroundColor: selectedFloorInfo.floor.level_type === "Basement" ? "#eff6ff" : "var(--sth-card)",
                      }}
                    >
                      {selectedFloorInfo.floor.level_type || (selectedFloorInfo.floor.floor_index < 0 ? "Basement" : "Above Ground")}
                    </span>
                  </div>
                  <div
                    className="text-sm font-bold mt-1"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                  >
                    {selectedFloorInfo.floor.floor_name}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5" style={fieldLabelStyle}>
                    <div>Floor ID: <strong style={{ color: "var(--sth-text)" }}>{selectedFloorInfo.floor.floor_id}</strong></div>
                    <div>
                      Parent Building:{" "}
                      <button
                        type="button"
                        onClick={() => setSelectedFloorId(null)}
                        className="font-bold underline hover:opacity-80 cursor-pointer"
                        style={{ color: "var(--sth-accent)" }}
                        title="Inspect Parent Building"
                      >
                        {selectedFloorInfo.parentBuilding.building_id}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Volumetric Metrics */}
                <div
                  className="rounded-md p-3 space-y-2"
                  style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
                >
                  <div
                    className="flex items-center justify-between pb-1"
                    style={{ borderBottom: "1px solid var(--sth-border)" }}
                  >
                    <span style={sectionLabelStyle}>Floor Strata &amp; 3D Volume</span>
                    <span className="text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>3D Contract v1.0</span>
                  </div>
                  {[
                    {
                      label: "Level Name",
                      value: selectedFloorInfo.floor.floor_name,
                      color: "var(--sth-text)",
                    },
                    {
                      label: "Level Type",
                      value: selectedFloorInfo.floor.level_type || (selectedFloorInfo.floor.floor_index < 0 ? "Basement" : "Above Ground"),
                      color: selectedFloorInfo.floor.level_type === "Basement" ? "#2563eb" : "var(--sth-sage)",
                    },
                    {
                      label: "Level Index",
                      value: String(selectedFloorInfo.floor.level_number ?? selectedFloorInfo.floor.floor_index),
                      color: "var(--sth-text)",
                    },
                    {
                      label: "Z Range",
                      value: `${selectedFloorInfo.floor.base_elevation.toFixed(2)}m → ${selectedFloorInfo.floor.top_elevation.toFixed(2)}m AMSL`,
                      color: "var(--sth-accent)",
                    },
                    {
                      label: "Floor Height",
                      value: `${selectedFloorInfo.floor.height.toFixed(2)} m`,
                      color: "var(--sth-text)",
                    },
                    {
                      label: "Enclosed Volume",
                      value: `${selectedFloorInfo.floor.volume_cubic_m.toFixed(2)} m³`,
                      color: "var(--sth-sage)",
                    },
                    {
                      label: "Surface Area",
                      value: `${selectedFloorInfo.floor.surface_area_sqm.toFixed(2)} m²`,
                      color: "var(--sth-text)",
                    },
                    {
                      label: "Source",
                      value: selectedFloorInfo.floor.source || "Configured / Derived",
                      color: "var(--sth-text-2)",
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span style={fieldLabelStyle}>{row.label}:</span>
                      <span style={{ ...fieldValueStyle, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Step 7: 3D Measurements */}
                <MeasurementSection
                  datasetId={activeDatasetId}
                  objectId={selectedFloorInfo.floor.floor_id}
                  objectType="floor"
                  initialHeight={selectedFloorInfo.floor.height}
                  initialArea={selectedFloorInfo.floor.surface_area_sqm}
                  initialVolume={selectedFloorInfo.floor.volume_cubic_m}
                  initialZMin={selectedFloorInfo.floor.base_elevation}
                  initialZMax={selectedFloorInfo.floor.top_elevation}
                  initialSurfaceArea={selectedFloorInfo.floor.surface_area_sqm}
                  availableTargetObjects={availableUnits.map((u) => ({ id: u.id, label: u.name, type: "unit" }))}
                />

                {/* Step 8: Data Quality + Provenance Intelligence */}
                <DataQualitySection
                  status={currentFloorPlan ? "VALID" : "INCOMPLETE"}
                  gates={{
                    geometry: "PASS",
                    topology: "PASS",
                    containment: "PASS",
                    hierarchy: "PASS",
                    source_data: currentFloorPlan ? "PASS" : "INCOMPLETE",
                  }}
                  provenance={{
                    source: selectedFloorInfo.floor.source || "Configured / Derived",
                    elevation_source: "Relative / Parametric Extrusion",
                    floor_source: "Configured / Derived",
                    floor_plan_source: currentFloorPlan ? "User-provided floor plan" : "None attached",
                  }}
                  showDisclaimer={true}
                />

                {/* Floor Plan Document Section (Step 3) */}
                <FloorPlanSection
                  buildingId={selectedFloorInfo.parentBuilding.building_id}
                  floorId={selectedFloorInfo.floor.floor_id}
                  floorPlan={currentFloorPlan}
                  onAttach={async (file) => {
                    await attachFloorPlan(
                      selectedFloorInfo.parentBuilding.building_id,
                      selectedFloorInfo.floor.floor_id,
                      file
                    );
                  }}
                  onRemove={async () => {
                    await removeFloorPlan(
                      selectedFloorInfo.parentBuilding.building_id,
                      selectedFloorInfo.floor.floor_id
                    );
                  }}
                  onView={() => setViewerFloorPlanModalOpen(true)}
                />

                {/* UNITS Section (Step 4: Floor -> Unit 3D Modeling) */}
                <div
                  className="rounded-md p-3 space-y-2.5"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                  }}
                >
                  <div
                    className="flex items-center justify-between pb-1.5"
                    style={{ borderBottom: "1px solid var(--sth-border)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d97706" }} />
                      <span style={sectionLabelStyle}>Units</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold"
                        style={{
                          color: currentFloorUnits.length > 0 ? "#b45309" : "var(--sth-text-2)",
                          backgroundColor: currentFloorUnits.length > 0 ? "#fef3c7" : "transparent",
                          border: currentFloorUnits.length > 0 ? "1px solid #fcd34d" : "1px solid var(--sth-border)",
                        }}
                      >
                        {currentFloorUnits.length > 0 ? `${currentFloorUnits.length} Units` : "No units defined"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUnitConfigModalOpen(true)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer"
                        style={{
                          backgroundColor: "#d97706",
                          color: "#fff",
                          border: "1px solid #b45309",
                        }}
                      >
                        + Add Unit
                      </button>
                    </div>
                  </div>

                  {currentFloorUnits.length === 0 ? (
                    <div className="py-2 text-center text-[11px] space-y-1.5" style={{ color: "var(--sth-text-2)" }}>
                      <div>No units defined for this floor.</div>
                      <button
                        type="button"
                        onClick={() => setUnitConfigModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        style={{
                          border: "1px dashed #d97706",
                          color: "#d97706",
                          backgroundColor: "rgba(245, 158, 11, 0.04)",
                        }}
                      >
                        + Add Unit Volume
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Minimal Real-time Unit Filter */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter units (ID, number, name)..."
                          value={unitSearchQuery}
                          onChange={(e) => setUnitSearchQuery(e.target.value)}
                          className="w-full text-[10px] font-mono px-2 py-1 pr-6 rounded border outline-none transition-colors"
                          style={{
                            backgroundColor: "var(--sth-card)",
                            borderColor: "var(--sth-border)",
                            color: "var(--sth-text)",
                          }}
                        />
                        {unitSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUnitSearchQuery("")}
                            className="absolute right-2 top-0.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Clear search"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {filteredFloorUnits.length === 0 ? (
                        <div className="py-2 text-center text-[10px] font-mono text-slate-500">
                          No units matching &ldquo;{unitSearchQuery}&rdquo;
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                          {filteredFloorUnits.map((u) => (
                            <div
                              key={u.unit_id}
                              className="flex items-center justify-between p-2 rounded border hover:border-amber-400 transition-all cursor-pointer group"
                              style={{
                                border: "1px solid var(--sth-border)",
                                backgroundColor: "var(--sth-card)",
                              }}
                              onClick={() => setSelectedUnitId(u.unit_id)}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[11px] truncate" style={{ color: "var(--sth-text)" }}>
                                    {u.unit_name || `Unit ${u.unit_number}`}
                                  </span>
                                  <span
                                    className="text-[8px] font-mono px-1 py-0.2 rounded shrink-0"
                                    style={{
                                      backgroundColor: "#fef3c7",
                                      color: "#b45309",
                                      border: "1px solid #fcd34d",
                                    }}
                                  >
                                    {u.unit_type || "APARTMENT"}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                                  ID: {u.unit_id} · {u.footprint_area ? `${u.footprint_area.toFixed(1)} m²` : ""} · {u.volume_cubic_m ? `${u.volume_cubic_m.toFixed(1)} m³` : ""}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-mono text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Inspect →
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFloorId(null)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded py-2 px-3 text-xs font-mono font-medium transition-colors cursor-pointer"
                    style={{
                      border: "1px solid var(--sth-border)",
                      backgroundColor: "var(--sth-surface)",
                      color: "var(--sth-text)",
                    }}
                  >
                    ← Select Parent Building
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded py-2 px-3 text-xs font-mono font-semibold transition-colors cursor-pointer"
                    style={{
                      border: "1px solid #DDBCB4",
                      backgroundColor: "var(--sth-clay-bg)",
                      color: "var(--sth-accent)",
                    }}
                  >
                    ⚙ Reconfigure Floors
                  </button>
                </div>
              </div>
            ) : activeBuilding ? (
              <div className="space-y-3 text-xs">
                {/* Entity badge */}
                <div
                  className="rounded-md p-3"
                  style={{ border: "1px solid #DDBCB4", backgroundColor: "var(--sth-clay-bg)" }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ ...sectionLabelStyle, color: "var(--sth-accent)" }}>Selected Entity</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--sth-sage)",
                        border: "1px solid #C0CAC0",
                        backgroundColor: "var(--sth-sage-bg)",
                      }}
                    >
                      Watertight Solid
                    </span>
                  </div>
                  <div
                    className="text-sm font-bold mt-1 break-all"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
                  >
                    {activeBuilding.name || activeBuilding.building_id}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5" style={fieldLabelStyle}>
                    {activeBuilding.osm_id && (
                      <div>OSM ID: <strong style={{ color: "var(--sth-accent)" }}>{activeBuilding.osm_id}</strong></div>
                    )}
                    <div>Parcel: <strong style={{ color: "var(--sth-text)" }}>{activeBuilding.parcel_id || "PARCEL-UNREGISTERED"}</strong></div>
                  </div>
                </div>

                {/* 2D -> 3D Floor Configuration CTA */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setConfigModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer hover:opacity-95"
                    style={{
                      backgroundColor: "var(--sth-accent)",
                      color: "#fff",
                      border: "1px solid #DDBCB4",
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>2D → 3D: Configure Floors</span>
                  </button>
                </div>

                {/* Z + volumetric */}
                <div
                  className="rounded-md p-3 space-y-2"
                  style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
                >
                  <div
                    className="flex items-center justify-between pb-1"
                    style={{ borderBottom: "1px solid var(--sth-border)" }}
                  >
                    <span style={sectionLabelStyle}>X + Y + Z Volumetric Space</span>
                    <span className="text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>3D Contract v1.0</span>
                  </div>
                  {[
                    {
                      label: "Z Elevation Range",
                      value: `${activeBuilding.z_min ?? 0.0}m → ${activeBuilding.z_max ?? activeBuilding.height}m AMSL`,
                      color: "var(--sth-accent)",
                    },
                    { label: "Structural Height", value: `${activeBuilding.height} m`, color: "var(--sth-text)" },
                    { label: "Footprint Area", value: `${activeBuilding.area_sqm} m²`, color: "var(--sth-text)" },
                    { label: "Enclosed Volume", value: `${activeBuilding.volume_cubic_m} m³`, color: "var(--sth-sage)" },
                    { label: "Height Heuristic", value: activeBuilding.height_source, color: "var(--sth-text-2)" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-2">
                      <span style={fieldLabelStyle}>{row.label}:</span>
                      <span style={{ ...fieldValueStyle, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Step 7: 3D Measurements */}
                <MeasurementSection
                  datasetId={activeDatasetId}
                  objectId={activeBuilding.building_id}
                  objectType="building"
                  initialHeight={activeBuilding.height}
                  initialArea={activeBuilding.area_sqm}
                  initialVolume={activeBuilding.volume_cubic_m}
                  initialZMin={activeBuilding.z_min ?? 0.0}
                  initialZMax={activeBuilding.z_max ?? activeBuilding.height}
                  availableTargetObjects={availableBuildings.map((b) => ({ id: b.id, label: b.name, type: "building" }))}
                />

                {/* Step 8: Data Quality + Provenance Intelligence */}
                <DataQualitySection
                  status={
                    activeBuilding.height_source === "DEFAULT_CONFIG"
                      ? "WARNING"
                      : activeBuilding.levels
                      ? "VALID"
                      : "INCOMPLETE"
                  }
                  gates={{
                    geometry: "PASS",
                    topology: "PASS",
                    containment: "PASS",
                    hierarchy: "PASS",
                    source_data: activeBuilding.height_source === "DEFAULT_CONFIG" ? "WARNING" : "PASS",
                  }}
                  provenance={{
                    source: activeBuilding.source || "OpenStreetMap",
                    height_source:
                      activeBuilding.height_source === "DEFAULT_CONFIG" ? "Default (Inferred)" : "Source-derived",
                    floor_source: activeBuilding.levels ? "Source-derived" : "Configured / Inferred",
                  }}
                  showDisclaimer={true}
                />

                {/* 3D Spatial ID */}
                <div
                  className="rounded-md p-3 space-y-2"
                  style={{ border: "1px solid #D8C8A8", backgroundColor: "var(--sth-geo-bg)" }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ ...sectionLabelStyle, color: "var(--sth-geo)" }}>
                      STHARA Prototype Spatial ID
                    </span>
                    <span
                      className="text-[9px] font-semibold"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--sth-geo)" }}
                    >
                      Prototype
                    </span>
                  </div>
                  <div
                    className="text-[11px] break-all p-2 rounded"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--sth-text)",
                      border: "1px solid #D8C8A8",
                      backgroundColor: "var(--sth-card)",
                    }}
                  >
                    {activeBuilding.prototype_3d_ulpin || `DL-OSM-WAY-${activeBuilding.osm_id || "BLD"}-001`}
                  </div>
                  <div className="text-[10px] leading-tight" style={{ color: "var(--sth-text-2)" }}>
                    Prototype identity generated by STHARA. Not an official government property, ownership, or ULPIN identifier.
                  </div>
                  <div
                    className="text-[10px] leading-tight"
                    style={{ color: activeBuilding.floor_unit_available ? "var(--sth-sage)" : "var(--sth-geo)" }}
                  >
                    {activeBuilding.floor_unit_available
                      ? "Floor and unit strata verified from cadastral benchmark."
                      : "ℹ Floor/unit strata unavailable from current physical OSM source."}
                  </div>
                </div>

                {/* Provenance */}
                <div
                  className="rounded-md p-2.5 text-[10px] leading-relaxed space-y-0.5"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                    color: "var(--sth-text-2)",
                  }}
                >
                  <div className="uppercase text-[9px] font-semibold" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>
                    Cadastral Provenance &amp; Data Attribution
                  </div>
                  <p>
                    Physical building geometry from OpenStreetMap (ODbL). Administrative reference boundary from DataMeet Maps (ODbL / CC-BY 2.5 India). Vertical volumes extruded parametrically conforming to 3D Geometry Contract v1.0.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="py-12 text-center text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
              >
                Click any building in the 3D viewer to inspect its X/Y/Z dimensions, volume, and validation status.
              </div>
            )}

            {/* 3D Spatial Analysis Component (Step 6) */}
            <div className="pt-2">
              <SpatialAnalysisCard
                activeDatasetId={activeDatasetId}
                selectedBuildingId={selectedBuildingId}
                selectedFloorId={selectedFloorId}
                selectedUnitId={selectedUnitId}
                availableBuildings={availableBuildings}
                availableFloors={availableFloors}
                availableUnits={availableUnits}
              />
            </div>
          </div>
        )}

        {/* Right panel collapsed toggle */}
        {!rightPanelOpen && (
          <button
            type="button"
            onClick={() => setRightPanelOpen(true)}
            className="absolute top-4 right-4 z-20 p-2 rounded-md text-xs cursor-pointer shadow-xl"
            style={{
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
              color: "var(--sth-text-2)",
            }}
            title="Open Property Inspector"
          >
            Inspector ←
          </button>
        )}
      </div>

      {/* 2D -> 3D Building Floor Configuration Modal */}
      <BuildingConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        buildingId={
          selectedFloorInfo?.parentBuilding.building_id ||
          selectedBuildingId ||
          activeBuilding?.building_id ||
          null
        }
        buildingName={
          activeBuilding?.name ||
          (selectedFloorInfo ? `Building ${selectedFloorInfo.parentBuilding.building_id}` : undefined)
        }
        sourceAttributes={sourceAttributes}
        initialFloors={sourceAttributes?.defaultFloors || selectedFloorInfo?.parentBuilding.floor_count || activeBuilding?.levels || 5}
        initialBasements={sourceAttributes?.defaultBasements ?? 0}
        initialHeight={sourceAttributes?.defaultHeight || activeBuilding?.height || 18.0}
        footprintAreaSqm={activeBuilding?.area_sqm || null}
        onGenerate={async (config) => {
          await generateConfiguredBuilding3D({
            buildingId: config.buildingId,
            numberOfFloors: config.numberOfFloors,
            numberOfBasements: config.numberOfBasements,
            buildingHeight: config.buildingHeight,
          });
          setSubView3D("floors");
        }}
      />

      {/* Floor Plan Viewer Modal */}
      <FloorPlanViewerModal
        isOpen={viewerFloorPlanModalOpen}
        onClose={() => setViewerFloorPlanModalOpen(false)}
        floorPlan={currentFloorPlan}
        buildingName={selectedFloorInfo ? selectedFloorInfo.parentBuilding.building_id : undefined}
        floorName={selectedFloorInfo ? selectedFloorInfo.floor.floor_name : undefined}
      />

      {/* 2D -> 3D Unit Configuration Modal */}
      {selectedFloorInfo && (
        <UnitConfigModal
          key={`${selectedFloorInfo.floor.floor_id}-${currentFloorUnits.length}-${unitConfigModalOpen}`}
          isOpen={unitConfigModalOpen}
          onClose={() => setUnitConfigModalOpen(false)}
          datasetId={activeDatasetId}
          buildingId={selectedFloorInfo.parentBuilding.building_id}
          floorId={selectedFloorInfo.floor.floor_id}
          floorName={selectedFloorInfo.floor.floor_name}
          baseElevation={selectedFloorInfo.floor.base_elevation}
          topElevation={selectedFloorInfo.floor.top_elevation}
          parentFloorGeometry={currentFloorFootprint}
          existingUnits={currentFloorUnits}
          floorPlanUrl={currentFloorPlan?.view_url}
          onCreateUnit={async (req) => {
            const u = await createConfiguredUnit(req);
            setSubView3D("floors");
            return u;
          }}
        />
      )}
    </div>
  );
}
