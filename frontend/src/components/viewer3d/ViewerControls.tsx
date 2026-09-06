"use client";

import React from "react";

export interface ViewerLayers {
  buildings: boolean;
  floors: boolean;
  properties: boolean;
  grid: boolean;
}

export interface ViewerControlsProps {
  subView: "building" | "floors" | "property";
  onChangeSubView: (mode: "building" | "floors" | "property") => void;
  layers: ViewerLayers;
  onToggleLayer: (layer: keyof ViewerLayers) => void;
  isWireframe: boolean;
  onToggleWireframe: () => void;
  explodeDistance: number;
  onChangeExplodeDistance: (val: number) => void;
  onResetView: () => void;
  onFitView: () => void;
  onSwitchTo2D?: () => void;
  hasFloorsData: boolean;
  hasPropertiesData: boolean;
}

export function ViewerControls({
  subView,
  onChangeSubView,
  layers,
  onToggleLayer,
  isWireframe,
  onToggleWireframe,
  explodeDistance,
  onChangeExplodeDistance,
  onResetView,
  onFitView,
  onSwitchTo2D,
  hasFloorsData,
  hasPropertiesData,
}: ViewerControlsProps) {
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      {/* Left: View Mode Selector & Layer Toggles */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800/80 bg-[#111827]/90 p-1.5 shadow-xl backdrop-blur-md pointer-events-auto">
        {/* Sub-view Switcher */}
        <div className="flex rounded-md bg-slate-900/90 p-0.5 border border-slate-800 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onChangeSubView("building")}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              subView === "building"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Building Solid
          </button>
          <button
            type="button"
            onClick={() => onChangeSubView("floors")}
            disabled={!hasFloorsData}
            className={`px-2.5 py-1 rounded transition-colors font-medium disabled:opacity-40 ${
              subView === "floors"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Stratified Floors
          </button>
          <button
            type="button"
            onClick={() => onChangeSubView("property")}
            disabled={!hasPropertiesData}
            className={`px-2.5 py-1 rounded transition-colors font-medium disabled:opacity-40 ${
              subView === "property"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Property Volumes
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* Shading Mode Toggle (Solid / Wireframe) */}
        <button
          type="button"
          onClick={onToggleWireframe}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
            isWireframe
              ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle wireframe topology inspection"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>{isWireframe ? "Wireframe" : "Solid"}</span>
        </button>

        {/* Layer Visibility Toggles */}
        <button
          type="button"
          onClick={() => onToggleLayer("grid")}
          className={`px-1.5 py-1 rounded text-[10px] font-mono border transition-colors ${
            layers.grid
              ? "bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-900/40 border-slate-800 text-slate-600"
          }`}
          title="Toggle ground datum reference grid"
        >
          Grid
        </button>

        {/* Exploded Floor Slider (Visible in Floors & Property modes) */}
        {(subView === "floors" || subView === "property") && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">
              Explode:
            </span>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={explodeDistance}
              onChange={(e) => onChangeExplodeDistance(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              title="Explode floors vertically (Visualization Only)"
            />
            <span className="text-[9px] font-mono text-emerald-400 w-6">
              {explodeDistance > 0 ? `+${explodeDistance}m` : "0m"}
            </span>
            {explodeDistance > 0 && (
              <span className="text-[7.5px] font-mono uppercase px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-600/30">
                Vis-Only
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Camera Reset, Fit & 2D Return */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-[#111827]/90 p-1.5 shadow-xl backdrop-blur-md pointer-events-auto">
        <button
          type="button"
          onClick={onFitView}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/40 transition-colors"
          title="Fit view to current 3D property bounding box"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>Fit View</span>
        </button>

        <button
          type="button"
          onClick={onResetView}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-slate-300 hover:text-slate-100 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 transition-colors"
          title="Reset camera to default isometric view"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset</span>
        </button>

        {onSwitchTo2D && (
          <button
            type="button"
            onClick={onSwitchTo2D}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <span>2D Map</span>
          </button>
        )}
      </div>
    </div>
  );
}
