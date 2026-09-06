"use client";

import React from "react";

export type ViewerErrorKind = "INVALID" | "UNAVAILABLE" | "NO_GEOMETRY" | "GENERIC";

export interface ViewerErrorProps {
  kind?: ViewerErrorKind;
  title?: string;
  message: string;
  errors?: string[];
  onRetry?: () => void;
  onSwitchTo2D?: () => void;
}

export function ViewerError({
  kind = "GENERIC",
  title,
  message,
  errors = [],
  onRetry,
  onSwitchTo2D,
}: ViewerErrorProps) {
  const defaultTitle =
    kind === "INVALID"
      ? "3D Geometry Validation Failed"
      : kind === "UNAVAILABLE"
      ? "3D Geometry Unavailable"
      : kind === "NO_GEOMETRY"
      ? "No 3D Models Extruded"
      : "3D Viewer Notice";

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0F19]/85 p-6 text-center">
      <div className="max-w-md rounded-xl border border-slate-800 bg-[#111827]/95 p-6 shadow-2xl">
        <div
          className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border ${
            kind === "INVALID"
              ? "border-rose-500/40 bg-rose-950/40 text-rose-400"
              : kind === "UNAVAILABLE"
              ? "border-amber-500/40 bg-amber-950/40 text-amber-400"
              : "border-cyan-500/30 bg-cyan-950/40 text-cyan-400"
          }`}
        >
          {kind === "INVALID" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h3 className="text-sm font-bold font-mono text-slate-100 mb-1.5">
          {title || defaultTitle}
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          {message}
        </p>

        {errors.length > 0 && (
          <div className="mb-4 max-h-28 overflow-y-auto rounded bg-slate-950/80 p-2 text-left font-mono text-[10px] text-rose-300 border border-rose-950">
            {errors.map((err, i) => (
              <div key={i} className="py-0.5">• {err}</div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-1">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 text-xs font-mono font-medium transition-colors"
            >
              Extrude 3D Models
            </button>
          )}
          {onSwitchTo2D && (
            <button
              type="button"
              onClick={onSwitchTo2D}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 text-xs font-mono transition-colors"
            >
              Return to 2D Map
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
