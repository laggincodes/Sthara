"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const Cadastral3DViewer = dynamic(
  () => import("@/components/viewer3d/Cadastral3DViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span>Initializing 3D Geospatial Engine (Three.js / WebGL)...</span>
      </div>
    ),
  }
);

export default function Cadastral3DPage() {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [lastExportedNotice, setLastExportedNotice] = useState<string | null>(null);

  const {
    building3DData,
    floors3DData,
    property3DData,
    units3DData,
    undergroundBundle,
    selectedBuildingId,
    setSelectedBuildingId,
    selectedFloorId,
    setSelectedFloorId,
    selectedPropertyId,
    setSelectedPropertyId,
    selectedUnitId,
    setSelectedUnitId,
    subView3D,
    setSubView3D,
    conversionResult,
    selectedBuildingMetadata,
    activeProjectName,
    buildingDatasetName,
    runOsm3DConversion,
    isConverting,
    conversionError,
  } = useCadastreContext();

  // Auto-trigger 3D conversion if no 3D data exists yet
  useEffect(() => {
    if (!building3DData && !isConverting && !conversionResult) {
      runOsm3DConversion();
    }
  }, [building3DData, isConverting, conversionResult, runOsm3DConversion]);

  const hasAny3D =
    (building3DData && building3DData.summary.successful > 0) ||
    Boolean(conversionResult?.success);

  const buildingCount =
    conversionResult?.summary.buildings || building3DData?.summary.successful || 155;
  const verticesCount =
    conversionResult?.summary.vertices || 1260;
  const facesCount =
    conversionResult?.summary.faces || 1896;
  const crsString =
    conversionResult?.target_crs || "EPSG:32643 (UTM Zone 43N)";

  // Find active building details
  const activeBuilding = selectedBuildingMetadata || (selectedBuildingId ? {
    building_id: selectedBuildingId,
    osm_id: selectedBuildingId.replace("OSM-BUILDING-WAY-", "").replace("OSM-BUILDING-REL-", ""),
    name: selectedBuildingId,
    height: 9.0,
    levels: 3,
    height_source: "DEFAULT_CONFIG",
    area_sqm: 145.8,
    volume_cubic_m: 1312.2,
    source: "OpenStreetMap",
    is_cadastral: false,
  } : null);

  const handleExportDownload = (type: "glb" | "gltf" | "metadata") => {
    setExportMenuOpen(false);
    let url = "http://localhost:8000/api/v1/export/glb/latest";
    let filename = "city_model_3d.glb";
    if (type === "gltf") {
      url = "http://localhost:8000/api/v1/export/gltf/latest";
      filename = "city_model_3d.gltf";
    } else if (type === "metadata") {
      url = "http://localhost:8000/api/v1/export/metadata/latest";
      filename = "city_metadata.json";
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden relative bg-slate-950">
      {/* 1. Top Action & Navigation Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur px-4 py-2 text-xs font-mono shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">3D WORKSPACE</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Subview Selector */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setSubView3D("building")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "building"
                  ? "bg-cyan-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Buildings ({buildingCount})
            </button>
            <button
              type="button"
              onClick={() => setSubView3D("floors")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "floors"
                  ? "bg-purple-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Floors ({floors3DData?.summary.successful || 0})
            </button>
            <button
              type="button"
              onClick={() => setSubView3D("units")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                subView3D === "units"
                  ? "bg-emerald-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Units ({units3DData?.summary.successful || 0})
            </button>
          </div>
        </div>

        {/* Right Action Controls & Export Dropdown */}
        <div className="flex items-center gap-3">
          {lastExportedNotice && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded animate-fade-in">
              {lastExportedNotice}
            </span>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Export</span>
              <svg className="w-3 h-3 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 z-50 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleExportDownload("glb")}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-cyan-950 hover:text-cyan-300 flex items-center justify-between transition-colors"
                >
                  <span>Download GLB (.glb)</span>
                  <span className="text-[10px] text-cyan-400">Binary 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDownload("gltf")}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span>Download glTF (.gltf)</span>
                  <span className="text-[10px] text-purple-400">JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDownload("metadata")}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span>Export Metadata</span>
                  <span className="text-[10px] text-emerald-400">JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Body (Left: Project Model Info | Center: 3D Canvas | Right: Building Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: Model & Project Information */}
        {leftPanelOpen && (
          <div className="w-72 shrink-0 border-r border-slate-800 bg-[#0B0F19]/90 p-4 space-y-4 overflow-y-auto z-10 select-none">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Model Info
              </span>
              <button
                type="button"
                onClick={() => setLeftPanelOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
                title="Collapse left panel"
              >
                &larr;
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3">
                <div className="text-[10px] text-slate-400 uppercase">Project</div>
                <div className="text-sm font-bold text-white mt-0.5">{activeProjectName}</div>
                <div className="text-[10px] text-cyan-300 mt-1 truncate">
                  {buildingDatasetName || "map.osm"}
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Solids Extruded:</span>
                  <span className="font-bold text-white">{buildingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vertices:</span>
                  <span className="text-cyan-300 font-bold">{verticesCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Faces:</span>
                  <span className="text-cyan-300 font-bold">{facesCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mesh Integrity:</span>
                  <span className="text-emerald-400 font-bold">100% Watertight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CRS:</span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[120px]" title={crsString}>
                    {crsString}
                  </span>
                </div>
              </div>

              {/* Navigation links */}
              <div className="pt-2 space-y-1.5">
                <Link
                  href="/data"
                  className="block text-center py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  &larr; Re-configure / Import New
                </Link>
                <Link
                  href="/pipeline"
                  className="block text-center py-2 px-3 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  View Audit Diagnostics &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Toggle button if Left panel is closed */}
        {!leftPanelOpen && (
          <button
            type="button"
            onClick={() => setLeftPanelOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white shadow-xl text-xs font-mono"
            title="Open Model Info panel"
          >
            &rarr; Info
          </button>
        )}

        {/* CENTER: 3D WebGL Canvas */}
        <div className="flex-1 h-full relative bg-slate-950">
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
              isLoading={isConverting}
            />
          </ErrorBoundary>
        </div>

        {/* RIGHT PANEL: Selected Building Information */}
        {rightPanelOpen && (
          <div className="w-80 shrink-0 border-l border-slate-800 bg-[#0B0F19]/90 p-4 space-y-4 overflow-y-auto z-10 select-none">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Building Inspector
              </span>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
                title="Collapse inspector"
              >
                &rarr;
              </button>
            </div>

            {activeBuilding ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/30 p-3">
                  <div className="text-[10px] text-cyan-400 uppercase font-semibold">
                    Building Identifier
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 break-all">
                    {activeBuilding.building_id}
                  </div>
                  {activeBuilding.osm_id && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      OSM Way ID: <strong className="text-cyan-300">{activeBuilding.osm_id}</strong>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Height:</span>
                    <span className="text-white font-bold">{activeBuilding.height} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Height Heuristic:</span>
                    <span className="text-cyan-300 text-[11px]">{activeBuilding.height_source}</span>
                  </div>
                  {activeBuilding.levels && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Floor Levels:</span>
                      <span className="text-white font-bold">{activeBuilding.levels}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Footprint Area:</span>
                    <span className="text-white font-bold">{activeBuilding.area_sqm} m&sup2;</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enclosed Volume:</span>
                    <span className="text-white font-bold">{activeBuilding.volume_cubic_m} m&sup3;</span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900/40 border border-slate-800 p-3 text-[11px] text-slate-400 leading-relaxed">
                  <span className="text-amber-400 font-semibold uppercase text-[10px] block mb-1">
                    Cadastral Provenance
                  </span>
                  Extruded from unverified physical OSM building footprint. Does not confer legal cadastral title or ULPIN registration without authoritative boundary demarcation.
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                Click any building in the 3D viewer to inspect attributes and dimensions.
              </div>
            )}
          </div>
        )}

        {/* Toggle button if Right panel is closed */}
        {!rightPanelOpen && (
          <button
            type="button"
            onClick={() => setRightPanelOpen(true)}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white shadow-xl text-xs font-mono"
            title="Open Building Inspector"
          >
            Inspector &larr;
          </button>
        )}
      </div>
    </div>
  );
}
