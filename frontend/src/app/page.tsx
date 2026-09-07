"use client";

import React from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

export default function DashboardPage() {
  const {
    backendConnected,
    geojson,
    buildingsGeojson,
    building3DData,
    floors3DData,
    property3DData,
    ulpins3D,
    activeDatasetName,
    buildingDatasetName,
    pipelineSteps,
    isDemoRunning,
    runEndToEndDemo,
    resetDemo,
  } = useCadastreContext();

  const parcelCount = geojson?.features.length ?? 0;
  const buildingCount = buildingsGeojson?.features.length ?? 0;
  const solidCount = building3DData?.summary.successful ?? 0;
  const floorCount = floors3DData?.summary.successful ?? 0;
  const propertyCount = property3DData?.summary.successful ?? 0;
  const ulpinCount = Object.keys(ulpins3D).length;

  const completedSteps = pipelineSteps.filter((s) => s.status === "COMPLETE").length;
  const progressPercent = Math.round((completedSteps / 8) * 100);

  // Classify dataset type
  const getDatasetType = () => {
    if (buildingDatasetName?.includes("osm")) return "Real OpenStreetMap (Physical Surface)";
    if (activeDatasetName?.includes("demo") || buildingDatasetName?.includes("demo")) return "Synthetic Cadastral Benchmark";
    if (activeDatasetName || buildingDatasetName) return "User Uploaded GeoJSON";
    return "No Dataset Active";
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#111827]/80 to-slate-900/90 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-[11px] font-mono text-cyan-400">
              <span className={`h-1.5 w-1.5 rounded-full ${backendConnected ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
              {backendConnected ? "API ONLINE :8000" : "API OFFLINE"}
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-[11px] font-mono text-slate-300">
              <span className="text-slate-500">Source:</span>
              <span className="text-cyan-300">{getDatasetType()}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            3D Cadastral Intelligence &amp; Volumetric Land Rights
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Deterministic computational geometry engine for multi-tier spatial parcel boundaries,
            Copernicus DEM ground elevations, stratified floor levels, and prototype 3D ULPIN registry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={runEndToEndDemo}
            disabled={isDemoRunning}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-all shadow-md shadow-cyan-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {isDemoRunning ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
                <span>Run Demo Pipeline</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetDemo}
            disabled={isDemoRunning}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 rounded-lg transition-colors"
            title="Reset active datasets & selections"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics & Pipeline Progress Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Parcels */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Cadastral Parcels
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {parcelCount}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {activeDatasetName || "None loaded"}
          </div>
        </div>

        {/* Metric 2: Buildings */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Footprints
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {buildingCount}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {buildingDatasetName || "None loaded"}
          </div>
        </div>

        {/* Metric 3: 3D Solids */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            3D Envelopes
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {solidCount}
          </div>
          <div className="text-[10px] text-slate-500">
            Mesh3D Solids v1.0
          </div>
        </div>

        {/* Metric 4: Sliced Floors */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Floor Solids
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {floorCount}
          </div>
          <div className="text-[10px] text-slate-500">
            Stratified Levels
          </div>
        </div>

        {/* Metric 5: Property Volumes */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Property Volumes
          </div>
          <div className="text-xl font-bold font-mono text-violet-400">
            {propertyCount}
          </div>
          <div className="text-[10px] text-slate-500">
            Cadastral Units
          </div>
        </div>

        {/* Metric 6: Prototype 3D ULPIN */}
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#111827]/70 space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            3D ULPINs
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {ulpinCount}
          </div>
          <div className="text-[10px] text-slate-500">
            SHA-256 Prototypes
          </div>
        </div>
      </div>

      {/* 3. Pipeline Progress & Status Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#111827]/60 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-slate-300">
            Pipeline Execution Status ({completedSteps}/8 Stages Complete)
          </span>
          <Link
            href="/pipeline"
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <span>View Full Audit</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stage Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {pipelineSteps.map((step) => {
            const isComplete = step.status === "COMPLETE";
            const isProcessing = step.status === "PROCESSING";
            return (
              <div
                key={step.id}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-mono flex flex-col justify-between ${
                  isComplete
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : isProcessing
                    ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-300 animate-pulse"
                    : "bg-slate-900/40 border-slate-800 text-slate-500"
                }`}
              >
                <span className="font-semibold truncate">{step.title}</span>
                <span className="text-[9px] text-slate-400 mt-0.5 truncate">
                  {step.detail || step.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Data Workspace */}
        <Link
          href="/data"
          className="group p-5 rounded-xl border border-slate-800 bg-[#111827]/70 hover:bg-slate-800/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 group-hover:border-cyan-500/40 group-hover:text-cyan-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Data Workspace
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingest parcels, load OSM or demo footprints, execute topological validation, and sample DEM raster elevations.
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
            <span>Open Data Workbench</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>

        {/* Card 2: 2D GIS Map */}
        <Link
          href="/workspace/2d"
          className="group p-5 rounded-xl border border-slate-800 bg-[#111827]/70 hover:bg-slate-800/60 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 0 1-1.006 0L9.503 3.31a1.12 1.12 0 0 0-1.006 0L3.622 5.748A1.125 1.125 0 0 0 3 6.754v11.425c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 0 1 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              2D GIS Map
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore 2D cadastral survey boundaries, building footprint intersections, and property parcel attributes on MapLibre.
            </p>
          </div>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <span>Explore 2D Map</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>

        {/* Card 3: 3D Cadastre */}
        <Link
          href="/workspace/3d"
          className="group p-5 rounded-xl border border-slate-800 bg-[#111827]/70 hover:bg-slate-800/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 group-hover:border-cyan-500/40 group-hover:text-cyan-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              3D Cadastre Stage
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive WebGL stage for watertight building polyhedra, exploded floor slicing, property units, and 3D ULPIN proofs.
            </p>
          </div>
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
            <span>Launch 3D Stage</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>

        {/* Card 4: Pipeline Audit */}
        <Link
          href="/pipeline"
          className="group p-5 rounded-xl border border-slate-800 bg-[#111827]/70 hover:bg-slate-800/60 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 group-hover:border-purple-500/40 group-hover:text-purple-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
              Pipeline Audit
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Comprehensive inspection of mathematical formulas, topological proofs, CRS projections, and SHA-256 hashes.
            </p>
          </div>
          <div className="text-xs font-mono text-purple-400 flex items-center gap-1">
            <span>Inspect Audit Logs</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>
      </div>

      {/* 5. Provenance & Regulatory Notices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>OpenStreetMap Dataset Notice</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            OSM building footprints represent unverified physical surface geometries. They do not constitute legal land titles, municipal registries, or official cadastral parcel boundaries.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>3D ULPIN Prototype Specification</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            All 3D ULPIN identifiers displayed are deterministic research prototypes formulated via cryptographically verified spatial attributes (geohash, elevation bounds, and stratum). They are not an official Government of India standard.
          </p>
        </div>
      </div>
    </div>
  );
}
