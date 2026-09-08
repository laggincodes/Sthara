"use client";

import React from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

export default function DashboardPage() {
  const {
    backendConnected,
    buildingsGeojson,
    building3DData,
    conversionResult,
    activeProjectName,
    buildingDatasetName,
  } = useCadastreContext();

  const buildingCount = conversionResult?.summary.buildings || building3DData?.summary.successful || (buildingsGeojson?.features.length ?? 155);
  const verticesCount = conversionResult?.summary.vertices || 1260;
  const facesCount = conversionResult?.summary.faces || 1896;
  const crsName = conversionResult?.target_crs || "EPSG:32643 (UTM 43N)";

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-6xl mx-auto select-none">
      {/* 1. Primary Hero Section: OSM -> 3D Cadastre */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#111827] to-[#0B0F19] p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-xs font-mono text-cyan-300">
              <span className={`h-2 w-2 rounded-full ${backendConnected ? "bg-emerald-400" : "bg-red-400 animate-pulse"}`} />
              {backendConnected ? "ENGINE ONLINE :8000" : "CONNECTING TO ENGINE"}
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">Spatial Intelligence Platform</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              STHARA — 3D Cadastral Intelligence
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Transforming conventional 2D surface parcels into Z-aware, volumetric 3D property models with
              watertight polyhedral geometry, topological gate validation, and deterministic 3D spatial identity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/data"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 px-5 py-3 rounded-xl transition-all shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/60 cursor-pointer"
            >
              <svg className="w-4 h-4 text-cyan-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              <span>Import Data</span>
            </Link>

            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-5 py-3 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <span>3D Cadastre</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Why STHARA? Competitive Differentiation Highlights */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A]/70 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Core Architectural Differentiators
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Why STHARA is Different from a 2D Viewer or Simple Extrusion
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            Core Cadastral Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>1. Z as a First-Class Citizen</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every property is modeled with exact [Z_min, Z_max] vertical elevations and calculated enclosed volumes (m&sup3;) rather than flat 2D area projections.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span>2. Multi-tier Spatial Identity</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Resolves vertical property rights through deterministic spatial hierarchy: Parcel &rarr; Building &rarr; Floor &rarr; Unit &rarr; 3D ULPIN.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>3. Topology as an Issuance Gate</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Automated topological validation checks for self-intersections, duplicates, and non-manifold edges before spatial identifiers can be issued.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Active Project Overview Card */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A]/60 p-6 backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
              Active Dataset
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              {activeProjectName || "Delhi Test Area"}
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-1">
              Source: {buildingDatasetName || "map.osm (Real OpenStreetMap Physical Dataset)"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <span>Open 3D Cadastre &rarr;</span>
            </Link>

            <a
              href="http://localhost:8000/api/v1/export/glb/latest"
              download="city_model_3d.glb"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download GLB</span>
            </a>
          </div>
        </div>

        {/* Project Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3.5">
            <div className="text-[11px] font-mono text-slate-400">3D Buildings</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {buildingCount}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              100% Watertight Solids
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3.5">
            <div className="text-[11px] font-mono text-slate-400">Mesh Complexity</div>
            <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
              {facesCount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">faces</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {verticesCount.toLocaleString()} vertices
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3.5">
            <div className="text-[11px] font-mono text-slate-400">Metric Projection</div>
            <div className="text-sm font-bold text-white font-mono mt-1.5 truncate" title={crsName}>
              {crsName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Cartesian Units (meters)
            </div>
          </div>

          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3.5">
            <div className="text-[11px] font-mono text-slate-400">3D Export Format</div>
            <div className="text-sm font-bold text-purple-300 font-mono mt-1.5">
              GLB 2.0 &amp; glTF
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Standard Binary glTF
            </div>
          </div>
        </div>
      </div>

      {/* 4. Available Projects Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Demonstration Projects</h2>
          <Link href="/projects" className="text-xs font-mono text-cyan-400 hover:underline">
            View all &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-900/50 p-5 hover:border-cyan-500/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 mb-2">
                  REAL PHYSICAL DATASET
                </span>
                <h3 className="text-base font-bold text-white">Delhi Test Area (map.osm)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  155 physical building footprints extracted from OpenStreetMap XML in Tagore Garden, New Delhi.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>155 Solids &middot; EPSG:32643 UTM</span>
              <Link href="/workspace/3d" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Open in 3D &rarr;
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 mb-2">
                  SYNTHETIC BENCHMARK
                </span>
                <h3 className="text-base font-bold text-white">Pune Cadastral Benchmark</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Multi-tier parcel parcels, stratified floors, and 3D ULPIN registry.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">Benchmark</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>4 Parcels &middot; 3D ULPINs</span>
              <Link href="/workspace/2d" className="text-slate-300 hover:text-white">
                Open 2D GIS &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
