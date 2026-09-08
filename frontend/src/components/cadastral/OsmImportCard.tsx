"use client";

import React, { useRef, useCallback } from "react";
import { useCadastreContext } from "@/context/CadastreContext";

/**
 * OsmImportCard — Dedicated OpenStreetMap .osm file import UI.
 *
 * IMPORTANT SEMANTICS:
 * Imported OSM data is REAL OPENSTREETMAP DATA but is NOT cadastral.
 * It does not represent legal parcels, land ownership, or official ULPIN records.
 * This is strictly separate from the GeoJSON upload action.
 */
export function OsmImportCard() {
  const {
    osmUploadPhase,
    osmUploadFile,
    osmUploadResult,
    osmUploadError,
    selectOsmFile,
    importOsmFile,
  } = useCadastreContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) selectOsmFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".osm")) {
        selectOsmFile(null);
        return;
      }
      selectOsmFile(file);
    },
    [selectOsmFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClear = () => {
    selectOsmFile(null);
  };

  const bbox = osmUploadResult?.bounding_box;
  const summary = osmUploadResult;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5 mt-4">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Import OSM</h3>
            <p className="text-[10px] text-amber-400/70">OpenStreetMap XML → Building Extraction</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-400 border border-amber-500/30">
            REAL DATA
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 border border-slate-700">
            NON-CADASTRAL
          </span>
        </div>
      </div>

      {/* Hidden file input — .osm only */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".osm"
        className="hidden"
        aria-label="Choose .osm file"
        onChange={handleFileChange}
      />

      {/* Drop Zone / File Picker */}
      {(osmUploadPhase === "idle" || osmUploadPhase === "selected") && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="rounded-lg border border-dashed border-amber-500/30 bg-amber-950/20 p-4 text-center cursor-pointer hover:border-amber-400/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          aria-label="Drop .osm file or click to browse"
        >
          <svg className="w-6 h-6 mx-auto mb-2 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs text-amber-300 font-medium">
            {osmUploadPhase === "selected" && osmUploadFile
              ? "Click to choose a different file"
              : "Drop .osm file here or click to browse"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Accepts: .osm (OpenStreetMap XML) · Max 50 MB</p>
        </div>
      )}

      {/* File Selected State */}
      {osmUploadPhase === "selected" && osmUploadFile && (
        <div className="mt-3 rounded-lg bg-slate-900/80 border border-amber-500/20 p-3 space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">File:</span>
            <span className="text-amber-300 font-semibold truncate max-w-[60%]">{osmUploadFile.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Size:</span>
            <span className="text-slate-200">{(osmUploadFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Type:</span>
            <span className="text-slate-200">OpenStreetMap XML</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Status:</span>
            <span className="text-emerald-400 font-semibold">Ready to import</span>
          </div>
        </div>
      )}

      {/* Import Button */}
      {osmUploadPhase === "selected" && osmUploadFile && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => importOsmFile()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import OSM
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 border border-slate-700 transition-colors"
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      {/* Importing Spinner */}
      {osmUploadPhase === "importing" && (
        <div className="mt-3 rounded-lg bg-amber-950/30 border border-amber-500/20 p-4 flex items-center justify-center gap-3">
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-amber-300 font-medium">Importing OSM file…</span>
        </div>
      )}

      {/* Error State */}
      {osmUploadPhase === "error" && osmUploadError && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300 font-mono">
            {osmUploadError}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Try a different file
          </button>
        </div>
      )}

      {/* Success: Import Result */}
      {osmUploadPhase === "done" && summary && (
        <div className="mt-3 space-y-3">
          {/* Semantic labels */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-400 border border-amber-500/30">
              REAL OPENSTREETMAP DATA
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 border border-slate-700">
              NON-CADASTRAL PHYSICAL BUILDING DATA
            </span>
          </div>

          {/* Result table */}
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Source:</span>
              <span className="text-amber-300 font-semibold">OpenStreetMap</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Source file:</span>
              <span className="text-slate-200 truncate max-w-[55%]">{summary.source_file}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Type:</span>
              <span className="text-slate-200">Physical Building Footprints</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cadastral:</span>
              <span className="text-red-400 font-semibold">NO</span>
            </div>
            <div className="border-t border-slate-800 mt-1.5 pt-1.5" />
            <div className="flex justify-between text-slate-400">
              <span>Buildings discovered:</span>
              <span className="text-emerald-400 font-bold">{summary.total_extracted_buildings}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Buildings converted:</span>
              <span className="text-emerald-400 font-semibold">
                {(summary.ways_extracted || 0) + (summary.relations_extracted || 0)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Skipped:</span>
              <span className="text-slate-300">{summary.degenerate_or_skipped ?? 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Height information:</span>
              <span className="text-slate-300">
                {summary.buildings_with_height ?? 0} bldgs ({summary.buildings_with_height_pct ?? 0}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Floor information:</span>
              <span className="text-slate-300">
                {summary.buildings_with_levels ?? 0} bldgs ({summary.buildings_with_levels_pct ?? 0}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CRS:</span>
              <span className="text-slate-200">WGS 84 (EPSG:4326)</span>
            </div>
            {bbox && (
              <div className="flex justify-between text-slate-400">
                <span>Bounds:</span>
                <span className="text-slate-200 text-[10px]">
                  [{bbox.bbox.map((v: number) => v.toFixed(4)).join(", ")}]
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-semibold">Imported</span>
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5 text-[10px] text-slate-500 leading-relaxed">
            <span className="text-amber-500/80 font-semibold">⚠ Non-cadastral data.</span>{" "}
            This dataset does NOT represent official cadastral parcel boundaries, legal land ownership,
            or government ULPIN records. It is unverified physical building geometry from OpenStreetMap contributors.
          </div>

          {/* Import another */}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Import a different .osm file
          </button>
        </div>
      )}
    </div>
  );
}
