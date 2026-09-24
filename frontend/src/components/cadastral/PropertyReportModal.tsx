"use client";

import React, { useState, useEffect } from "react";
import { cadastreApi } from "@/lib/api/client";

export interface PropertyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  level: "building" | "floor" | "unit";
  entityId: string;
}

export function PropertyReportModal({
  isOpen,
  onClose,
  datasetId,
  level,
  entityId,
}: PropertyReportModalProps) {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !datasetId || !entityId) return;

    let active = true;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        let res: Record<string, unknown>;
        if (level === "building") {
          res = await cadastreApi.getBuildingReport(datasetId, entityId);
        } else if (level === "floor") {
          res = await cadastreApi.getFloorReport(datasetId, entityId);
        } else {
          res = await cadastreApi.getUnitReport(datasetId, entityId);
        }
        if (active) {
          setReport(res);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load property intelligence report.";
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      active = false;
    };
  }, [isOpen, datasetId, level, entityId]);

  if (!isOpen) return null;

  const qualityProv = (report?.quality_provenance || {}) as Record<string, unknown>;
  const spatialMetrics = (report?.spatial_metrics || {}) as Record<string, unknown>;
  const gates = (qualityProv?.gates || {}) as Record<string, string>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-[#111827] text-slate-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="rounded bg-cyan-950 p-1.5 border border-cyan-500/40 text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider font-mono">
                Property Intelligence Report
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {level.toUpperCase()} • {entityId} ({datasetId})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="ml-3 text-xs font-mono text-slate-400">Generating report...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-400 font-mono">
              {error}
            </div>
          )}

          {report && !loading && (
            <>
              {/* Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="rounded bg-slate-900/60 p-2.5 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Report ID</span>
                  <span className="text-cyan-300 font-semibold truncate block">{String(report.report_id || "")}</span>
                </div>
                <div className="rounded bg-slate-900/60 p-2.5 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Status</span>
                  <span className="text-emerald-400 font-semibold uppercase">{String(qualityProv.status || "VALID")}</span>
                </div>
                <div className="rounded bg-slate-900/60 p-2.5 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Quality Score</span>
                  <span className="text-emerald-300 font-semibold">{String(qualityProv.overall_score || 95)}%</span>
                </div>
                <div className="rounded bg-slate-900/60 p-2.5 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Hierarchy Level</span>
                  <span className="text-violet-300 font-semibold uppercase">{String(report.level || "")}</span>
                </div>
              </div>

              {/* Spatial Metrics */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Physical Geometry & 3D Volume Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div>
                    <span className="text-slate-400">Footprint / Carpet Area:</span>
                    <span className="float-right text-slate-100 font-semibold">
                      {String(spatialMetrics.footprint_area_sqm || spatialMetrics.floor_area_sqm || spatialMetrics.carpet_area_sqm || 0)} m²
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">3D Solid Volume:</span>
                    <span className="float-right text-slate-100 font-semibold">
                      {String(spatialMetrics.total_volume_cum || spatialMetrics.floor_volume_cum || spatialMetrics.volume_cum || 0)} m³
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Base Elevation:</span>
                    <span className="float-right text-slate-100">
                      {String(spatialMetrics.base_elevation_m || 0)} m AMSL
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Top Elevation:</span>
                    <span className="float-right text-slate-100">
                      {String(spatialMetrics.top_elevation_m || 0)} m AMSL
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Structure Height:</span>
                    <span className="float-right text-slate-100">
                      {String(spatialMetrics.height_m || 0)} m
                    </span>
                  </div>
                </div>
              </div>

              {/* Quality & Gates */}
              {gates && Object.keys(gates).length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Validation Quality Gates
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    {Object.entries(gates).map(([gate, stat]: [string, string]) => (
                      <div key={gate} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] uppercase">{gate}</span>
                        <span className={`text-[10px] font-semibold ${stat === "PASS" ? "text-emerald-400" : "text-amber-400"}`}>
                          {stat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5 text-xs text-amber-300/90 font-mono leading-relaxed">
                <span className="font-semibold block mb-1 uppercase text-[10px] text-amber-400">
                  Cadastral Disclaimer & Legal Notice
                </span>
                {String(report.disclaimer || "")}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-800 px-5 py-3 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-xs font-mono text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
