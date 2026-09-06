import React from "react";
import { GeoJSONValidationResult } from "@/types/cadastre";

interface ValidationCardProps {
  validation: GeoJSONValidationResult | null;
  isValidating: boolean;
  validationError: string | null;
}

export function ValidationCard({
  validation,
  isValidating,
  validationError,
}: ValidationCardProps) {
  if (isValidating) {
    return (
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3.5 text-xs text-cyan-300 flex items-center gap-3">
        <span className="h-4 w-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin shrink-0" />
        <div>
          <div className="font-semibold">Running Spatial Validation</div>
          <div className="text-[11px] text-cyan-400/80 font-mono">
            Checking topology, polygon closure, and CRS projections...
          </div>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-300">
        <div className="flex items-center gap-2 font-semibold text-red-400 mb-1">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
          Validation Failed / Connection Issue
        </div>
        <p className="text-[11px] text-red-300 leading-relaxed font-mono">
          {validationError}
        </p>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-600" />
          <span>Validation Status</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">Awaiting Analysis</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3.5 text-xs ${
        validation.valid
          ? "border-emerald-500/30 bg-emerald-950/15 text-emerald-200"
          : "border-red-500/30 bg-red-950/15 text-red-200"
      }`}
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              validation.valid ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          <span className={validation.valid ? "text-emerald-300" : "text-red-300"}>
            {validation.valid ? "Spatial Validation Passed" : "Validation Violations Detected"}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">
          {validation.feature_count} Feature(s)
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 my-2.5 text-[11px] font-mono">
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-1.5">
          <span className="text-slate-500 block text-[9px] uppercase">Input CRS</span>
          <span className="text-slate-200 font-medium truncate block" title={validation.crs}>
            {validation.crs}
          </span>
        </div>
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-1.5">
          <span className="text-slate-500 block text-[9px] uppercase">Suggested 3D Metric CRS</span>
          <span className="text-cyan-400 font-medium truncate block">
            {validation.suggested_projected_crs || "Projected Metric"}
          </span>
        </div>
      </div>

      {/* Errors List */}
      {validation.errors.length > 0 && (
        <div className="mt-2.5 space-y-1.5 border-t border-red-900/40 pt-2">
          <div className="text-[10px] font-mono uppercase text-red-400 font-semibold">
            Topological Errors ({validation.errors.length}):
          </div>
          {validation.errors.map((err, i) => (
            <div
              key={i}
              className="rounded bg-red-950/40 border border-red-500/20 p-2 text-[11px] font-mono text-red-200"
            >
              <div className="font-bold text-red-300">
                [Feature #{err.feature_index + 1}] {err.issue_type}
              </div>
              <div>{err.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings List */}
      {validation.warnings.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-slate-800/60 pt-2">
          {validation.warnings.map((w, idx) => (
            <div key={idx} className="text-[10px] text-amber-400/90 font-mono">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
