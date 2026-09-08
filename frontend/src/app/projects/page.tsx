"use client";

import React from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

export default function ProjectsPage() {
  const {
    activeProjectName,
    buildingDatasetName,
    conversionResult,
    runOsm3DConversion,
    loadDemoParcels,
  } = useCadastreContext();

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Projects &amp; Datasets Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage local geospatial projects, OpenStreetMap building footprints, and 3D cadastral registries.
          </p>
        </div>

        <Link
          href="/data"
          className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 rounded-lg shadow transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Import New Dataset</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project 1: Delhi Test Area */}
        <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-6 space-y-4 hover:border-cyan-500/60 transition-all shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 mb-2">
                REAL OPENSTREETMAP DATASET
              </span>
              <h2 className="text-lg font-bold text-white">Delhi Test Area</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tagore Garden, New Delhi, India. 155 physical building footprints extruded to 3D.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              Active 3D
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-500">BUILDINGS</div>
              <div className="text-sm font-bold text-white mt-0.5">155</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">CRS</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">EPSG:32643</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">FORMAT</div>
              <div className="text-sm font-bold text-purple-300 mt-0.5">GLB 2.0</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/workspace/3d"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white"
            >
              <span>Open in 3D Workspace &rarr;</span>
            </Link>

            <a
              href="http://localhost:8000/api/v1/export/glb/latest"
              download="city_model_3d.glb"
              className="text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              Download GLB
            </a>
          </div>
        </div>

        {/* Project 2: Pune Cadastral Benchmark */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 hover:border-slate-700 transition-all shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 mb-2">
                SYNTHETIC CADASTRAL BENCHMARK
              </span>
              <h2 className="text-lg font-bold text-white">Pune Cadastral Benchmark</h2>
              <p className="text-xs text-slate-400 mt-1">
                Kothrud, Pune, Maharashtra. Multi-tier land parcels with DEM ground elevation and 3D ULPIN registry.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
              Benchmark
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-500">PARCELS</div>
              <div className="text-sm font-bold text-white mt-0.5">4 Parcels</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">CRS</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">EPSG:32643</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">REGISTRY</div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">3D ULPIN</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/workspace/2d"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white"
            >
              <span>Open in 2D GIS Map &rarr;</span>
            </Link>
            <Link
              href="/pipeline"
              className="text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              View Verification Audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
