"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";
import { ValidationCard } from "@/components/cadastral/ValidationCard";

export default function DataWorkspacePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    isValidating,
    isAssociating,
    isSamplingElevation,
    validationError,
    associationError,
    elevationError,
    geojson,
    buildingsGeojson,
    validationResult,
    associationData,
    demMetadata,
    activeDatasetName,
    buildingDatasetName,
    selectedParcelElevation,
    selectedBuildingElevation,
    loadDemoParcels,
    loadDemoBuildings,
    loadRealOSMBuildings,
    uploadGeoJson,
    runValidation,
    runBuildingAssociation,
    sampleActiveElevation,
  } = useCadastreContext();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadGeoJson(file);
      e.target.value = "";
    }
  };

  const parcelCount = geojson?.features?.length || 0;
  const buildingCount = buildingsGeojson?.features?.length || 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hidden File Input for GeoJSON Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        aria-label="Upload GeoJSON File"
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded bg-cyan-950/80 px-2 py-0.5 text-[11px] font-mono font-medium text-cyan-400 border border-cyan-500/30">
              STAGE 01-04 WORKBENCH
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Data Ingestion & Validation</h1>
          <p className="text-sm text-slate-400 mt-1">
            Load, upload, and deterministically validate 2D cadastral parcels, physical footprints, and elevation datasets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/workspace/2d"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Inspect in 2D Map
          </Link>
          <Link
            href="/workspace/3d"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors shadow-lg shadow-cyan-950"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Open 3D Cadastre
          </Link>
        </div>
      </div>

      {/* 4 Core Workbenches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: Data Ingestion & Active Layers */}
        <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">01. Geospatial Ingestion</h2>
                  <p className="text-xs text-slate-400">Load sample datasets or upload GeoJSON files</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Input Engine</span>
            </div>

            {/* Current Active Datasets State */}
            <div className="space-y-3 mb-6">
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-300">Cadastral Parcels Layer</div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                    {activeDatasetName || "None Loaded"}
                  </div>
                </div>
                <span className="rounded bg-emerald-950/80 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/30">
                  {parcelCount} features
                </span>
              </div>

              <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-300">Building Footprints Layer</div>
                  <div className="text-[11px] font-mono text-purple-400 mt-0.5">
                    {buildingDatasetName || "None Loaded"}
                  </div>
                </div>
                <span className="rounded bg-purple-950/80 px-2.5 py-1 text-xs font-mono font-medium text-purple-400 border border-purple-500/30">
                  {buildingCount} features
                </span>
              </div>
            </div>

            {/* Dataset Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={loadDemoParcels}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors disabled:opacity-50"
              >
                <span>Load Demo Parcels</span>
              </button>
              <button
                type="button"
                onClick={loadDemoBuildings}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors disabled:opacity-50"
              >
                <span>Load Demo Buildings</span>
              </button>
              <button
                type="button"
                onClick={loadRealOSMBuildings}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors disabled:opacity-50 sm:col-span-2"
                title="Load real-world OpenStreetMap footprints (155 buildings, New Delhi)"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Load Real OSM Footprints (New Delhi, 155 Bldgs)</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 sm:col-span-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload Custom GeoJSON File</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Real OSM data represents unverified physical building geometry; it is clearly separated from authoritative legal cadastral parcels.
          </div>
        </div>

        {/* CARD 2: Topological Validation */}
        <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">02. Topological Validation</h2>
                  <p className="text-xs text-slate-400">Deterministic GEOS geometry validity & closure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={runValidation}
                disabled={isValidating || parcelCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
              >
                {isValidating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <span>Run Validation</span>
                )}
              </button>
            </div>

            <ValidationCard
              validation={validationResult}
              isValidating={isValidating}
              validationError={validationError}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Enforces ring closure, zero self-intersections, valid WGS84 coordinates, and RFC 7946 GeoJSON compliance.
          </div>
        </div>

        {/* CARD 3: Spatial Relationships & Containment */}
        <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">03. Spatial Relationships</h2>
                  <p className="text-xs text-slate-400">Building-to-parcel association & containment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={runBuildingAssociation}
                disabled={isAssociating || parcelCount === 0 || buildingCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
              >
                {isAssociating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Associating...</span>
                  </>
                ) : (
                  <span>Run Association</span>
                )}
              </button>
            </div>

            {associationError && (
              <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300 mb-4 font-mono">
                {associationError}
              </div>
            )}

            {associationData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Total Buildings</div>
                    <div className="text-base font-bold text-white font-mono mt-0.5">
                      {associationData.summary?.total_buildings ?? associationData.associations?.length ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Associated Buildings</div>
                    <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                      {associationData.summary?.associated_buildings ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Multi-Parcel Overlap</div>
                    <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                      {associationData.summary?.multi_parcel_buildings ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Outside / Unresolved</div>
                    <div className="text-base font-bold text-slate-400 font-mono mt-0.5">
                      {(associationData.summary?.outside_buildings ?? 0) + (associationData.summary?.unresolved_buildings ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Deterministic Engine:</span> Shapely/GEOS point-in-polygon & intersection polygon area calculations.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center">
                <p className="text-xs text-slate-500">
                  Load both Parcels and Buildings, then click &quot;Run Association&quot; to compute spatial intersection matrix.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Assigns physical structures to authoritative cadastral parcel boundaries.
          </div>
        </div>

        {/* CARD 4: Elevation & Terrain Modeling */}
        <div className="rounded-xl border border-slate-800 bg-[#111827]/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">04. DEM Elevation Sampling</h2>
                  <p className="text-xs text-slate-400">Copernicus GLO-30 Digital Elevation Model</p>
                </div>
              </div>
              <button
                type="button"
                onClick={sampleActiveElevation}
                disabled={isSamplingElevation || parcelCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
              >
                {isSamplingElevation ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sampling DEM...</span>
                  </>
                ) : (
                  <span>Sample Elevation</span>
                )}
              </button>
            </div>

            {elevationError && (
              <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-3 text-xs text-red-300 mb-4 font-mono">
                {elevationError}
              </div>
            )}

            <div className="space-y-3">
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>DEM Source:</span>
                  <span className="text-cyan-400 font-semibold">{demMetadata?.filename || "Copernicus DEM GLO-30"}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Spatial Resolution:</span>
                  <span className="text-slate-200">
                    {demMetadata?.resolution ? `${demMetadata.resolution[0]}° x ${demMetadata.resolution[1]}° (~30m)` : "30-meter (1 arc-sec)"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vertical Reference:</span>
                  <span className="text-slate-200">EGM2008 Geoid (m ASL)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>CRS:</span>
                  <span className="text-slate-200">{demMetadata?.crs || "EPSG:4326"}</span>
                </div>
              </div>

              {(selectedParcelElevation || selectedBuildingElevation) ? (
                <div className="rounded-lg bg-blue-950/40 border border-blue-500/30 p-3 text-xs">
                  <span className="text-blue-300 font-semibold">Active Selection Elevation:</span>
                  <div className="mt-1 font-mono text-slate-300">
                    {selectedParcelElevation && <div>Parcel Base: {selectedParcelElevation.elevation_m}m ASL</div>}
                    {selectedBuildingElevation && <div>Building Base: {selectedBuildingElevation.elevation_m}m ASL</div>}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-3 text-xs text-slate-400">
                  Click &quot;Sample Elevation&quot; to query ground z-offsets for all active parcel and building centroids.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Supplies authoritative ground z-offset for 3D extrusion and height modeling.
          </div>
        </div>
      </div>
    </div>
  );
}
