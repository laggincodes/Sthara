import React from "react";
import Image from "next/image";
import Link from "next/link";

interface WorkspaceHeaderProps {
  backendConnected: boolean | null;
  isLoading: boolean;
  isAssociating: boolean;
  isSamplingElevation?: boolean;
  isDemoRunning?: boolean;
  onRunDemo?: () => void;
  onResetDemo?: () => void;
  showPipelineStatus?: boolean;
  onTogglePipelineStatus?: () => void;
  onLoadDemoParcels: () => void;
  onLoadDemoBuildings: () => void;
  onLoadRealOSMBuildings?: () => void;
  onUploadClick: () => void;
  onRunValidation: () => void;
  onRunAssociation: () => void;
  onSampleElevation?: () => void;
  onGenerate3D?: () => void;
  isGenerating3D?: boolean;
  onGenerateFloors3D?: () => void;
  isGeneratingFloors3D?: boolean;
  onGenerateProperty3D?: () => void;
  isGeneratingProperty3D?: boolean;
  viewMode?: "2d" | "3d";
  onToggleViewMode?: (mode: "2d" | "3d") => void;
  hasParcels: boolean;
  hasBuildings: boolean;
  has3DData?: boolean;
  hasFloors3DData?: boolean;
  hasProperty3DData?: boolean;
  activeDatasetName?: string | null;
  buildingDatasetName?: string | null;
}

export function WorkspaceHeader({
  backendConnected,
  isLoading,
  isAssociating,
  isSamplingElevation = false,
  isDemoRunning = false,
  onRunDemo,
  onResetDemo,
  showPipelineStatus = true,
  onTogglePipelineStatus,
  isGenerating3D = false,
  onGenerateFloors3D,
  isGeneratingFloors3D = false,
  onGenerateProperty3D,
  isGeneratingProperty3D = false,
  viewMode = "2d",
  onToggleViewMode,
  onLoadDemoParcels,
  onLoadDemoBuildings,
  onLoadRealOSMBuildings,
  onUploadClick,
  onRunValidation,
  onRunAssociation,
  onSampleElevation,
  onGenerate3D,
  hasParcels,
  hasBuildings,
  has3DData = false,
  hasFloors3DData = false,
  hasProperty3DData = false,
  activeDatasetName,
  buildingDatasetName,
}: WorkspaceHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#111827]/90 px-4 py-2.5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Workspace Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 rounded-md p-1"
            title="Return to Homepage"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/30">
              <Image
                src="/icon.svg"
                alt="3D Cadastral Mark"
                width={18}
                height={18}
              />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              3D Cadastre
            </span>
          </Link>

          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
            /
          </span>

          <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>2D Cadastral Workspace</span>
            {activeDatasetName && (
              <span className="text-xs font-mono font-normal text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5 bg-emerald-950/20">
                Parcels: {activeDatasetName}
              </span>
            )}
            {buildingDatasetName && (
              <span className="text-xs font-mono font-normal text-purple-400 border border-purple-500/30 rounded px-1.5 py-0.5 bg-purple-950/20">
                Buildings: {buildingDatasetName}
              </span>
            )}
          </h1>
        </div>

        {/* Action Controls & Backend Status */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Backend Health Status Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/80"
            title={
              backendConnected === true
                ? "Backend service connected (:8000)"
                : backendConnected === false
                ? "Geospatial processing service unavailable"
                : "Checking backend connection..."
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected === true
                  ? "bg-emerald-400"
                  : backendConnected === false
                  ? "bg-red-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="text-slate-400 text-[11px] hidden md:inline">
              {backendConnected === true
                ? "API Connected"
                : backendConnected === false
                ? "API Offline"
                : "Connecting..."}
            </span>
          </div>

          {/* Primary Demo Action: Run Demo */}
          {onRunDemo && (
            <button
              type="button"
              onClick={onRunDemo}
              disabled={isLoading || isDemoRunning}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              title="Run end-to-end deterministic demonstration pipeline"
            >
              {isDemoRunning ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Executing Demo...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                  <span className="font-bold">Run Demo</span>
                </>
              )}
            </button>
          )}

          {/* Action: Reset Demo State */}
          {onResetDemo && (
            <button
              type="button"
              onClick={onResetDemo}
              disabled={isLoading || isDemoRunning}
              className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Reset demo data & viewport selections"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
          )}

          {/* Action: Toggle Pipeline Status Drawer */}
          {onTogglePipelineStatus && (
            <button
              type="button"
              onClick={onTogglePipelineStatus}
              className={`inline-flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1.5 rounded-lg transition-colors ${
                showPipelineStatus
                  ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                  : "bg-slate-800/90 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Pipeline Status Bar"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>Pipeline Audit</span>
            </button>
          )}

          {/* Action: Load Demo Parcels */}
          <button
            type="button"
            onClick={onLoadDemoParcels}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Load Demo Parcels
          </button>

          {/* Action: Load Demo Buildings */}
          <button
            type="button"
            onClick={onLoadDemoBuildings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Load Demo Buildings
          </button>

          {/* Action: Load Real OSM Buildings */}
          {onLoadRealOSMBuildings && (
            <button
              type="button"
              onClick={onLoadRealOSMBuildings}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 shadow-sm"
              title="Load 155 real building footprints extracted from OpenStreetMap (Tagore Garden, New Delhi)"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Load Real OSM
            </button>
          )}

          {/* Action: Upload GeoJSON */}
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Upload GeoJSON
          </button>

          {/* Action: Run Validation */}
          <button
            type="button"
            onClick={onRunValidation}
            disabled={isLoading || !hasParcels}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/60 disabled:opacity-40 border border-cyan-800/80 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Validate Parcels
          </button>

          {/* Action: Analyze Building Relationships */}
          <button
            type="button"
            onClick={onRunAssociation}
            disabled={isLoading || isAssociating || !hasParcels || !hasBuildings}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
          >
            {isAssociating ? (
              <>
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Relationships...
              </>
            ) : (
              "Analyze Relationships"
            )}
          </button>

          {/* Action: Sample Ground Elevation (Step 8) */}
          <button
            type="button"
            onClick={onSampleElevation}
            disabled={isLoading || isSamplingElevation || (!hasParcels && !hasBuildings)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            {isSamplingElevation ? (
              <>
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sampling DEM...
              </>
            ) : (
              "Sample DEM Elevation"
            )}
          </button>

          {/* Action: Generate 3D Building Models (Step 11) */}
          <button
            type="button"
            onClick={onGenerate3D}
            disabled={isLoading || isGenerating3D || !hasBuildings}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {isGenerating3D ? (
              <>
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Extruding 3D...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                Extrude 3D
              </>
            )}
          </button>

          {/* Action: Generate 3D Stratified Floor Volumes (Step 12) */}
          {onGenerateFloors3D && (
            <button
              type="button"
              onClick={onGenerateFloors3D}
              disabled={isLoading || isGeneratingFloors3D || !hasBuildings}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
            >
              {isGeneratingFloors3D ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Slicing Floors...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Stratify Floors</span>
                  {hasFloors3DData && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />}
                </>
              )}
            </button>
          )}

          {/* Action: Generate 3D Property Volumes (Step 12) */}
          {onGenerateProperty3D && (
            <button
              type="button"
              onClick={onGenerateProperty3D}
              disabled={isLoading || isGeneratingProperty3D || !hasBuildings}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              {isGeneratingProperty3D ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Binding Units...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Property Volumes</span>
                  {hasProperty3DData && <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />}
                </>
              )}
            </button>
          )}

          {/* View Mode Segmented Toggle: 2D vs 3D */}
          {onToggleViewMode && (
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900/90 p-0.5 ml-1">
              <button
                type="button"
                onClick={() => onToggleViewMode("2d")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "2d"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                2D Map
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode("3d")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                  viewMode === "3d"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>3D Cadastre</span>
                {has3DData && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
