"use client";

import React, { useState } from "react";
import { cadastreApi } from "@/lib/api/client";
import { FusedPropertyContext } from "@/types/cadastre";

interface DataFusionCardProps {
  onContextLoaded?: (context: FusedPropertyContext) => void;
}

export function DataFusionCard({ onContextLoaded }: DataFusionCardProps) {
  const [context, setContext] = useState<FusedPropertyContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"demo" | "osm">("demo");
  const [error, setError] = useState<string | null>(null);

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await cadastreApi.getDemoFusion("EPSG:32643");
      setContext(resp.context);
      setActiveTab("demo");
      if (onContextLoaded) onContextLoaded(resp.context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load demo spatial fusion.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadRealOsm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await cadastreApi.getRealOsmFusion("EPSG:32643", 10);
      setContext(resp.context);
      setActiveTab("osm");
      if (onContextLoaded) onContextLoaded(resp.context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load real OSM fusion.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALID":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "WARNING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "PARTIAL":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "FULL":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-600/50";
      case "PARTIAL":
        return "bg-sky-950/80 text-sky-300 border-sky-600/50";
      case "LIMITED":
        return "bg-amber-950/80 text-amber-300 border-amber-600/50";
      default:
        return "bg-rose-950/80 text-rose-300 border-rose-600/50";
    }
  };

  const layersList = [
    { key: "cadastral_gis", label: "Cadastral GIS (Parcels)" },
    { key: "building_data", label: "Building Footprints" },
    { key: "dem", label: "Digital Elevation (DEM)" },
    { key: "lidar", label: "LiDAR Point Cloud" },
    { key: "floor_data", label: "Floor Strata Levels" },
    { key: "unit_data", label: "Apartment Units / Flats" },
    { key: "gnss_cors", label: "GNSS / CORS Reference Control" },
    { key: "underground", label: "Underground Infrastructure" },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-100">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-slate-100 tracking-wide">
                Multi-Source Georeferencing & Spatial Data Fusion
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                Phase 18
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic spatial alignment: GIS Boundaries + Aerial DEM + LiDAR + Floors + Units + CORS Geodetic Frame
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isLoading}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              activeTab === "demo" && context
                ? "bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isLoading && activeTab === "demo" ? (
              <span className="w-3.5 h-3.5 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Load Demo Fusion
          </button>

          <button
            type="button"
            onClick={handleLoadRealOsm}
            disabled={isLoading}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              activeTab === "osm" && context
                ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            {isLoading && activeTab === "osm" ? (
              <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
            Inspect Real OSM Normalization
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Body Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Alignment Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
              Source Layer Alignment
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Target CRS:{" "}
              <span className="text-cyan-400 font-semibold">
                {context ? context.target_project_crs : "EPSG:32643 (UTM 43N)"}
              </span>
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg divide-y divide-slate-800/60">
            {layersList.map((layer) => {
              const isAligned = context?.source_alignment
                ? Boolean(context.source_alignment[layer.key])
                : false;

              return (
                <div
                  key={layer.key}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors hover:bg-slate-900/50"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-slate-300 font-medium">{layer.label}</span>
                  </div>
                  <div>
                    {context ? (
                      isAligned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          ALIGNED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                          — ABSENT
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 font-mono text-[11px]">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fusion Status & Readiness Overview */}
          {context && (
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Fusion Integrity Status
                </span>
                <span
                  className={`inline-block mt-1 text-xs font-mono font-semibold px-2.5 py-0.5 rounded border ${getStatusColor(
                    context.fusion_status
                  )}`}
                >
                  {context.fusion_status}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Evidence Readiness
                </span>
                <span
                  className={`inline-block mt-1 text-xs font-mono font-semibold px-2.5 py-0.5 rounded border ${getQualityColor(
                    context.quality_level
                  )}`}
                >
                  {context.quality_level} READINESS
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Fused Evidence & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!context ? (
            <div className="h-full min-h-[220px] rounded-lg border border-dashed border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center p-6">
              <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              <p className="text-xs text-slate-400 max-w-sm">
                Click <span className="text-cyan-400 font-semibold">Load Demo Fusion</span> or{" "}
                <span className="text-amber-400 font-semibold">Inspect Real OSM Normalization</span> above to execute the multi-source fusion engine.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Geodetic Reference & LiDAR pill box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GNSS CORS Card */}
                <div className="p-3.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                      GNSS / CORS Reference Control
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {context.gnss_reference ? (context.gnss_reference.reference_type || "CORS_REFERENCE") : "UNAVAILABLE"}
                    </span>
                  </div>
                  {context.gnss_reference ? (
                    <div>
                      <div className="text-slate-200 font-semibold flex items-center justify-between">
                        <span>{context.gnss_reference.control_point_id || context.gnss_reference.station_id}</span>
                        <span className="text-[9px] font-mono text-emerald-400">STATUS: LOCKED</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Native (EPSG:4326): [{context.gnss_reference.coordinates.map((c) => c.toFixed(6)).join(", ")}]
                      </div>
                      {context.gnss_reference.target_coordinates && (
                        <div className="text-[10px] text-cyan-300 font-mono">
                          Target ({context.target_project_crs}): [{context.gnss_reference.target_coordinates.map((c) => c.toFixed(2)).join(", ")}]
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">
                        Elevation: {context.gnss_reference.elevation}m ({context.gnss_reference.elevation_reference})
                        {context.gnss_reference.accuracy_metadata && (
                          <span className="text-slate-400 ml-1">
                            · Accuracy: H: ±{context.gnss_reference.accuracy_metadata.horizontal_accuracy_m}m, V: ±{context.gnss_reference.accuracy_metadata.vertical_accuracy_m}m
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-[11px] italic">No geodetic station active for this dataset</div>
                  )}
                </div>

                {/* LiDAR Source Card */}
                <div className="p-3.5 bg-slate-950/90 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      LiDAR Point Cloud
                    </span>
                    <span>{context.lidar_source ? "CONNECTED" : "UNAVAILABLE"}</span>
                  </div>
                  {context.lidar_source ? (
                    <div>
                      <div className="text-slate-200 font-semibold truncate">{context.lidar_source.source_id}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Points: {context.lidar_source.total_points.toLocaleString()} ({context.lidar_source.point_density_per_sqm} pts/m²)
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        CRS: {context.lidar_source.crs} ({context.lidar_source.vertical_reference})
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-[11px] italic">No point cloud evidence for this area</div>
                  )}
                </div>
              </div>

              {/* Buildings Summary Table */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg overflow-hidden text-xs">
                <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>FUSED BUILDINGS ({context.buildings.length})</span>
                  <span>LEGAL STATUS / ASSOCIATED PARCEL</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {context.buildings.map((bld) => (
                    <div key={bld.building_id} className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-900/60">
                      <div>
                        <div className="font-semibold text-slate-200">{bld.building_id}</div>
                        <div className="text-[10px] text-slate-500">
                          Area: {bld.footprint_area_sqm}m² | Ground: {bld.ground_elevation ? `${bld.ground_elevation}m` : "DEM N/A"} | Height: {bld.building_height ? `${bld.building_height}m` : "N/A"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                            bld.is_cadastral
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                              : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                          }`}
                        >
                          {bld.associated_parcel_id ? bld.associated_parcel_id : "NO PARCEL (NON-CADASTRAL)"}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {bld.association_status || "UNRESOLVED"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflicts & Audit Notices */}
              {context.conflicts.length > 0 && (
                <div className="p-3.5 bg-slate-950/90 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Fusion Conflicts & Topological Notices ({context.conflicts.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {context.conflicts.map((conf) => (
                      <div
                        key={conf.conflict_id}
                        className="text-[11px] p-2 rounded bg-slate-900/80 border border-slate-800 text-slate-300 font-sans"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              conf.severity === "CRITICAL"
                                ? "bg-rose-950 text-rose-400 border border-rose-800"
                                : conf.severity === "WARNING"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-sky-950 text-sky-400 border border-sky-800"
                            }`}
                          >
                            {conf.conflict_type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Entities: {conf.affected_entities.join(", ")}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-tight">{conf.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Cadastral Disclaimer */}
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-start gap-2 text-[10px] text-slate-400 font-mono">
                <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Georeferencing coordinates are normalized using pyproj into {context.target_project_crs}. Native source coordinates are strictly preserved. Physical OSM footprint observations do not imply legal land title or official cadastral registration.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
