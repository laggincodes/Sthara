"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DemoUndergroundResponse,
  UndergroundValidationResponse,
  UndergroundConflictResponse,
} from "@/types/cadastre";
import { cadastreApi } from "@/lib/api/client";

export function UndergroundDataCard() {
  const [bundle, setBundle] = useState<DemoUndergroundResponse | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<UndergroundValidationResponse | null>(null);
  const [conflictResult, setConflictResult] = useState<UndergroundConflictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemoAssets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cadastreApi.getUndergroundDemo();
      setBundle(data);
      if (data.features.length > 0) {
        setSelectedFeatureId(data.features[0].underground_feature_id);
      }
      setValidationResult(null);
      setConflictResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load underground demo bundle.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFeature = bundle?.features.find(
    (f) => f.underground_feature_id === selectedFeatureId
  ) ?? null;

  const handleValidate = async () => {
    if (!selectedFeature) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await cadastreApi.validateUndergroundFeature({
        feature: selectedFeature,
      });
      setValidationResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClashDetection = async () => {
    if (!selectedFeature || !bundle) return;
    setIsLoading(true);
    setError(null);
    try {
      const existing = bundle.features.filter(
        (f) => f.underground_feature_id !== selectedFeature.underground_feature_id
      );
      const res = await cadastreApi.evaluateUndergroundConflicts({
        candidate_feature: selectedFeature,
        existing_features: existing,
        clearance_threshold_m: 1.0,
      });
      setConflictResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clash detection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🕳️</span>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              Underground & Subsurface Spatial Modeling
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              Step 20 • Subsurface Layer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic subsurface solids, basement property strata, utility corridors, and 3D clash detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDemoAssets}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isLoading ? "Loading..." : "Load Demo Subsurface"}
          </button>
          <Link
            href="/workspace/3d"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 flex items-center gap-1.5"
          >
            Inspect in 3D ↗
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Registered Subsurface
          </div>
          <div className="text-lg font-bold text-white mt-0.5">
            {bundle ? `${bundle.total_features} Assets` : "—"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">DEMO-401/1 Testbed</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Basement Strata
          </div>
          <div className="text-lg font-bold text-blue-400 mt-0.5">
            {bundle ? `${bundle.basement_count} Volume` : "—"}
          </div>
          <div className="text-[10px] text-blue-300/80 mt-0.5">Property Volume Eligible</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Utilities / Conduits
          </div>
          <div className="text-lg font-bold text-amber-400 mt-0.5">
            {bundle ? `${bundle.utility_count} Corridors` : "—"}
          </div>
          <div className="text-[10px] text-amber-300/80 mt-0.5">Non-Property Public Infra</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Reference Surface
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {bundle ? "920.0 m" : "—"}
          </div>
          <div className="text-[10px] text-emerald-300/80 mt-0.5">EGM2008 / AMSL Datum</div>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      {bundle && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            {bundle.features.map((feat) => {
              const isSelected = feat.underground_feature_id === selectedFeatureId;
              const isBasement = feat.feature_type === "BASEMENT";
              return (
                <button
                  key={feat.underground_feature_id}
                  type="button"
                  onClick={() => {
                    setSelectedFeatureId(feat.underground_feature_id);
                    setValidationResult(null);
                    setConflictResult(null);
                  }}
                  className={`px-3 py-2 rounded-lg text-left transition-all border text-xs ${
                    isSelected
                      ? "bg-slate-800 border-cyan-500/80 text-white shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isBasement ? "bg-blue-400" : "bg-amber-400"}`} />
                    <span className="font-mono font-semibold">{feat.underground_feature_id}</span>
                  </div>
                  <div className="text-[11px] truncate max-w-[190px] mt-0.5 text-slate-300">
                    {feat.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    Depth: {feat.depth_to_top_m}m - {feat.depth_to_base_m}m
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Feature Detail */}
          {selectedFeature && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              {/* Left 2 Cols: Technical & Ownership Breakdown */}
              <div className="lg:col-span-2 space-y-4">
                {/* Legal Ownership Distinction Callout */}
                <div
                  className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                    selectedFeature.is_cadastral_property
                      ? "bg-blue-950/30 border-blue-800/60 text-blue-200"
                      : "bg-amber-950/30 border-amber-800/60 text-amber-200"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {selectedFeature.is_cadastral_property ? (
                      <>
                        <span className="text-blue-400">🏢 CADASTRAL PROPERTY VOLUME</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-[10px] text-blue-300 font-mono">
                          Eligible for Title
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-400">⚡ PUBLIC UTILITY INFRASTRUCTURE</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-900/60 text-[10px] text-amber-300 font-mono">
                          No Private Ownership Claim
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">
                    {selectedFeature.is_cadastral_property
                      ? "This subterranean stratum represents private building infrastructure (Basement Parking & Vault) legally attached to Building BLD-DEMO-101 and Parcel DEMO-401/1."
                      : "Public infrastructure conduit (Municipal Water / Telecom Duct). Modelled as a physical 3D easement corridor. It does NOT transfer ownership to the parcel proprietor."}
                  </p>
                </div>

                {/* Elevation & Depth Math Breakdown */}
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                    Elevation & Depth Coordinate Mathematics (Z-Up Convention)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Reference Ground (Z_ground)</span>
                      <span className="text-white font-bold text-sm">
                        {selectedFeature.ground_elevation_m.toFixed(2)} m ASL
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Top Elevation (Z_top)</span>
                      <span className="text-cyan-400 font-bold text-sm">
                        {selectedFeature.top_elevation_m.toFixed(2)} m ASL
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Base Elevation (Z_base)</span>
                      <span className="text-cyan-400 font-bold text-sm">
                        {selectedFeature.base_elevation_m.toFixed(2)} m ASL
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Depth to Top (Z_g - Z_t)</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {selectedFeature.depth_to_top_m.toFixed(2)} m
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Depth to Base (Z_g - Z_b)</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {selectedFeature.depth_to_base_m.toFixed(2)} m
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Solid Thickness (Z_t - Z_b)</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {selectedFeature.thickness_m.toFixed(2)} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conflict & Clash Evaluation Section */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    Audit Spatial & Depth Validity
                  </button>
                  <button
                    type="button"
                    onClick={handleClashDetection}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    Run Subsurface Clash Detection
                  </button>
                </div>

                {/* Validation Result Box */}
                {validationResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs ${
                      validationResult.is_valid
                        ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-200"
                        : "bg-red-950/30 border-red-800/60 text-red-200"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      <span>{validationResult.is_valid ? "✓ Validation Passed" : "✗ Validation Failed"}</span>
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-900">
                        Status: {validationResult.spatial_status}
                      </span>
                    </div>
                    {validationResult.warnings.length > 0 && (
                      <ul className="list-disc list-inside mt-1 text-[11px] text-amber-300">
                        {validationResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Conflict Detection Results Box */}
                {conflictResult && (
                  <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        Clash Detection: {conflictResult.total_conflicts_found} Spatial Relation(s)
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          conflictResult.has_invalid_clash
                            ? "bg-red-950 text-red-400 border border-red-800"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        }`}
                      >
                        {conflictResult.has_invalid_clash ? "Physical Clash Detected" : "No Unresolved Clashes"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{conflictResult.summary_message}</p>
                    {conflictResult.conflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-slate-900/80 border border-slate-800 space-y-1 font-mono text-[11px]"
                      >
                        <div className="flex items-center justify-between text-slate-300">
                          <span>
                            {c.feature_a_id} ↔ {c.feature_b_id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] ${
                              c.conflict_class === "ALLOWED_INTERSECTION"
                                ? "bg-blue-900/60 text-blue-300"
                                : c.conflict_class === "REVIEW_REQUIRED"
                                ? "bg-amber-900/60 text-amber-300"
                                : "bg-red-900/60 text-red-300"
                            }`}
                          >
                            {c.conflict_class}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Overlap Area: {c.horizontal_overlap_area_m2}m² | Clearance: {c.vertical_clearance_m}m | 3D Clash: {c.is_3d_clash ? "YES" : "NO"}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-sans mt-0.5">
                          Recommendation: {c.resolution_recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Col: Provenance & Technical Metadata */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                    Survey & Provenance
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Source Dataset:</span>
                      <span className="font-mono text-[11px]">{selectedFeature.provenance.source_dataset}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Survey Method:</span>
                      <span className="text-[11px]">{selectedFeature.provenance.survey_method || "Direct As-built"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Horizontal CRS:</span>
                      <span className="font-mono text-[11px]">{selectedFeature.provenance.crs}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Vertical Datum:</span>
                      <span className="font-mono text-[11px]">{selectedFeature.provenance.vertical_datum}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">3D Geometry Status:</span>
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                        {selectedFeature.geometry_status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-300 block mb-1">Cadastral Compliance Note:</span>
                  Underground spatial modeling enforces strict separation between private property strata and public infrastructure utilities. Utility corridors do not trigger property ULPIN generation and remain non-property easement assets.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
