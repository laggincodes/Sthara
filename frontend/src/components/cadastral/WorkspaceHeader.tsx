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
    <header className="px-4 py-2.5 shadow-sm" style={{ backgroundColor: "#F8F6F0", borderBottom: "1px solid #D7D4CB", fontFamily: "var(--font-sans)", color: "#252622" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Workspace Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 rounded-md p-1"
            title="Return to Homepage"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: "#A85D48", color: "#FFFFFF" }}>
              <Image
                src="/icon.svg"
                alt="3D Cadastral Mark"
                width={18}
                height={18}
                className="brightness-0 invert"
              />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)", color: "#252622" }}>
              3D Cadastre
            </span>
          </Link>

          <span className="hidden sm:inline" style={{ color: "#D7D4CB" }} aria-hidden="true">
            /
          </span>

          <h1 className="text-sm font-semibold tracking-tight flex items-center gap-2 flex-wrap" style={{ color: "#252622" }}>
            <span>2D Cadastral Workspace</span>
            {activeDatasetName && (
              <span className="text-xs font-semibold rounded px-1.5 py-0.5" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" }}>
                Parcels: {activeDatasetName}
              </span>
            )}
            {buildingDatasetName && (
              <span className="text-xs font-semibold rounded px-1.5 py-0.5" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#F5EFE3", color: "#B28A52", border: "1px solid #D8C8A8" }}>
                Buildings: {buildingDatasetName}
              </span>
            )}
          </h1>
        </div>

        {/* Action Controls & Backend Status */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Backend Health Status Indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md"
            style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#62635D" }}
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
                  ? "bg-emerald-600"
                  : backendConnected === false
                  ? "bg-red-600 animate-pulse"
                  : "bg-amber-600 animate-pulse"
              }`}
            />
            <span className="text-[11px] hidden md:inline">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-md transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: "#A85D48" }}
              title="Run end-to-end deterministic demonstration pipeline"
            >
              {isDemoRunning ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Executing Demo...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
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
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#62635D" }}
              title="Reset demo data &amp; viewport selections"
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
              style={{
                backgroundColor: showPipelineStatus ? "#FAF0EE" : "#E9E5DA",
                border: showPipelineStatus ? "1px solid #DDBCB4" : "1px solid #D7D4CB",
                color: showPipelineStatus ? "#A85D48" : "#62635D",
              }}
              title="Toggle Pipeline Status Bar"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#A85D48" }} />
              <span>Pipeline Audit</span>
            </button>
          )}

          {/* Action: Load Demo Parcels */}
          <button
            type="button"
            onClick={onLoadDemoParcels}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#252622" }}
          >
            Load Demo Parcels
          </button>

          {/* Action: Load Demo Buildings */}
          <button
            type="button"
            onClick={onLoadDemoBuildings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#252622" }}
          >
            Load Demo Buildings
          </button>

          {/* Action: Load Real OSM Buildings */}
          {onLoadRealOSMBuildings && (
            <button
              type="button"
              onClick={onLoadRealOSMBuildings}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ backgroundColor: "#F5EFE3", color: "#B28A52", border: "1px solid #D8C8A8" }}
              title="Load 155 real building footprints extracted from OpenStreetMap (Tagore Garden, New Delhi)"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#B28A52" }} />
              Load Real OSM
            </button>
          )}

          {/* Action: Upload GeoJSON */}
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#252622" }}
          >
            Upload GeoJSON
          </button>

          {/* Action: Run Validation */}
          <button
            type="button"
            onClick={onRunValidation}
            disabled={isLoading || !hasParcels}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "#FAF0EE", color: "#A85D48", border: "1px solid #DDBCB4" }}
          >
            Validate Parcels
          </button>

          {/* Action: Analyze Building Relationships */}
          <button
            type="button"
            onClick={onRunAssociation}
            disabled={isLoading || isAssociating || !hasParcels || !hasBuildings}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-md transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "#B28A52" }}
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-md transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "#788575" }}
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-md transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: "#A85D48" }}
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

          {/* View Mode Segmented Toggle: 2D vs 3D */}
          {onToggleViewMode && (
            <div className="flex items-center rounded-md p-0.5 ml-1" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
              <button
                type="button"
                onClick={() => onToggleViewMode("2d")}
                className="px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer"
                style={{
                  backgroundColor: viewMode === "2d" ? "#F8F6F0" : "transparent",
                  color: viewMode === "2d" ? "#252622" : "#62635D",
                  border: viewMode === "2d" ? "1px solid #D7D4CB" : "1px solid transparent",
                }}
              >
                2D Map
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode("3d")}
                className="px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  backgroundColor: viewMode === "3d" ? "#A85D48" : "transparent",
                  color: viewMode === "3d" ? "#FFFFFF" : "#62635D",
                  border: viewMode === "3d" ? "1px solid transparent" : "1px solid transparent",
                }}
              >
                <span>3D Cadastre</span>
                {has3DData && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
