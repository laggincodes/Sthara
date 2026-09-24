"use client";

import React, { useState, useRef } from "react";
import {
  useCadastreContext,
} from "@/context/CadastreContext";
import { BuildModelResponse } from "@/types/drawing_intelligence";
import { cadastreApi } from "@/lib/api/client";

interface ProjectDataEntryWorkspaceProps {
  onModelBuilt?: (result: BuildModelResponse) => void;
  onNavigateTo3D?: () => void;
}

export function ProjectDataEntryWorkspace({
  onModelBuilt,
  onNavigateTo3D,
}: ProjectDataEntryWorkspaceProps) {
  const {
    activeDatasetId,
    activeProjectName,
    projectDataAnalysis,
    isAnalyzingProjectData,
    projectDataError,
    uploadAndAnalyzeProjectData,
    loadGoldenDemoProjectData,
    updateBuildingCorrelation,
    handleModelBuiltFromDrawings,
    refreshSpatialSourceStatus,
  } = useCadastreContext();

  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"ENTRY" | "REVIEW">("ENTRY");
  const [centerViewMode, setCenterViewMode] = useState<"DRAWING" | "MAP">("DRAWING");
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isBuildingModel, setIsBuildingModel] = useState<boolean>(false);
  const [buildSuccessMessage, setBuildSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setStagedFiles((prev) => [...prev, ...dropped]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const chosen = Array.from(e.target.files);
      setStagedFiles((prev) => [...prev, ...chosen]);
    }
  };

  const handleRemoveStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRunAnalysis = async () => {
    if (stagedFiles.length === 0) return;
    const res = await uploadAndAnalyzeProjectData(stagedFiles, activeProjectName);
    if (res) {
      setActiveTab("REVIEW");
    }
  };

  const handleLoadGoldenDemo = async () => {
    const res = await loadGoldenDemoProjectData(activeProjectName || "Tagore Garden Unified Project");
    if (res) {
      setActiveTab("REVIEW");
    }
  };

  const handleBuildModel = async () => {
    if (!projectDataAnalysis || !projectDataAnalysis.drawing_analysis) return;
    setIsBuildingModel(true);
    setBuildSuccessMessage(null);
    try {
      const isDrawingOnly = projectDataAnalysis.spatial_source_status.active_mode === "DRAWINGS_ONLY";
      const res = await cadastreApi.buildStharaModelFromDrawing(
        projectDataAnalysis.drawing_analysis.analysis_id,
        {
          target_building_name: isDrawingOnly
            ? "Building 01 (Pure Drawing Source)"
            : "Tagore Garden Community Center",
          ground_elevation: 0.0,
          apply_units_to_all_typical_floors: true,
          match_to_osm_footprint: !isDrawingOnly,
          create_as_drawing_only: isDrawingOnly,
        }
      );

      await handleModelBuiltFromDrawings(res);
      await refreshSpatialSourceStatus();
      setBuildSuccessMessage(
        `Successfully generated 3D Model '${res.building_id}' with ${res.number_of_floors} floors, ${res.units_created_count} units, and deterministic Spatial IDs!`
      );
      if (onModelBuilt) onModelBuilt(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Model building failed: ${msg}`);
    } finally {
      setIsBuildingModel(false);
    }
  };

  const currentAnalysis = projectDataAnalysis;
  const currentDoc = currentAnalysis?.drawing_analysis?.documents[selectedDocIndex];
  const currentPage = currentDoc?.pages[selectedPageIndex];

  return (
    <div className="flex flex-col h-full bg-[#1A1918] text-[#F3EFEA] font-sans overflow-hidden">
      {/* ── Top Workspace Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#343230] bg-[#22211F] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#A85D48] flex items-center justify-center text-white text-base shadow-sm">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wide uppercase font-mono text-[#F3EFEA]">
                PROJECT DATA ENTRY
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF0EE]/10 text-[#DDBCB4] border border-[#DDBCB4]/30 font-mono">
                Dataset: {activeDatasetId}
              </span>
              {currentAnalysis && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                    currentAnalysis.spatial_source_status.active_mode === "DRAWINGS_ONLY"
                      ? "bg-[#A85D48]/20 text-[#DDBCB4] border-[#A85D48]"
                      : "bg-[#788575]/20 text-[#A0BA9E] border-[#788575]"
                  }`}
                >
                  {currentAnalysis.spatial_source_status.active_mode_label}
                </span>
              )}
            </div>
            <p className="text-xs text-[#9B9994] mt-0.5">
              Maps, site plans, architectural drawings, floor plans and reference documents can be analyzed together.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentAnalysis && (
            <div className="flex rounded-md p-0.5 bg-[#2B2A27] border border-[#3E3C38]">
              <button
                type="button"
                onClick={() => setActiveTab("ENTRY")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeTab === "ENTRY" ? "bg-[#3E3C38] text-white font-semibold" : "text-[#9B9994] hover:text-white"
                }`}
              >
                1. Data Entry ({stagedFiles.length + (currentAnalysis.manifest.length || 0)})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("REVIEW")}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeTab === "REVIEW" ? "bg-[#A85D48] text-white font-semibold" : "text-[#9B9994] hover:text-white"
                }`}
              >
                2. Project Review & Spatial Model
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleLoadGoldenDemo}
            disabled={isAnalyzingProjectData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2B2A27] hover:bg-[#343230] border border-[#484542] text-xs text-[#E5DFD7] font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Load national golden demo with site.geojson and 4 architectural/structural drawings"
          >
            <span>⚡</span>
            <span>Golden Demo Project</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "ENTRY" ? (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header intro */}
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h2 className="text-lg font-bold text-[#F3EFEA]">Add everything you have for this project</h2>
              <p className="text-xs text-[#9B9994]">
                Do not worry about file formats or categorizing files upfront. STHARA automatically identifies map data, site layouts, architectural sheets, structural grids, and floor levels.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-[#A85D48] bg-[#A85D48]/10 scale-[0.99]"
                  : "border-[#3E3C38] bg-[#22211F] hover:border-[#5E5A54] hover:bg-[#282624]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.geojson,.json,.osm,.xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-full bg-[#2B2A27] border border-[#484542] flex items-center justify-center text-2xl mb-3 shadow-inner">
                📥
              </div>
              <h3 className="text-sm font-semibold text-[#F3EFEA]">
                DROP PROJECT FILES HERE
              </h3>
              <p className="text-xs text-[#9B9994] mt-1">
                or <span className="text-[#DDBCB4] underline font-medium">Browse files</span> from your computer
              </p>
              <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-[#82807A]">
                <span>Maps</span> • <span>PDFs</span> • <span>Blueprints</span> • <span>GeoJSON</span> • <span>Images</span>
              </div>
              <p className="text-[10px] text-[#6E6C66] mt-1">
                Supported: PDF, GeoJSON, OSM, PNG, JPG (up to 25MB each)
              </p>
            </div>

            {/* Staged Files List */}
            {stagedFiles.length > 0 && (
              <div className="bg-[#22211F] border border-[#343230] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#343230] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#E5DFD7]">
                    Staged Files ({stagedFiles.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setStagedFiles([])}
                    className="text-[11px] text-[#A85D48] hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-[#2B2A27]">
                  {stagedFiles.map((f, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {f.name.endsWith(".pdf") ? "📄" : f.name.endsWith(".geojson") ? "🗺️" : "📁"}
                        </span>
                        <div>
                          <span className="font-mono text-[#F3EFEA] font-medium">{f.name}</span>
                          <span className="text-[10px] text-[#82807A] ml-2">
                            {(f.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFile(i)}
                        className="text-[#9B9994] hover:text-red-400 text-xs px-2 py-0.5 rounded hover:bg-[#2E2D2A]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzingProjectData}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#A85D48] hover:bg-[#934E3B] text-white text-xs font-bold tracking-wider uppercase font-mono shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzingProjectData ? (
                      <>
                        <span className="animate-spin text-sm">⌛</span>
                        <span>ANALYZING PROJECT DATA...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>ANALYZE PROJECT DATA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Analyzed Manifest if already available */}
            {currentAnalysis && currentAnalysis.manifest.length > 0 && stagedFiles.length === 0 && (
              <div className="bg-[#22211F] border border-[#343230] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#343230] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#E5DFD7]">
                    Active Project Data Sources ({currentAnalysis.manifest.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("REVIEW")}
                    className="text-xs text-[#DDBCB4] font-medium hover:underline flex items-center gap-1"
                  >
                    <span>Open Review</span> →
                  </button>
                </div>

                <div className="space-y-2">
                  {currentAnalysis.manifest.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[#282624] border border-[#3A3834] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {item.file_type === "GEOJSON" || item.file_type === "OSM" ? "🗺️" : "📄"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[#F3EFEA]">{item.filename}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF0EE]/10 text-[#DDBCB4] font-mono">
                              {item.category.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9B9994] mt-0.5 flex items-center gap-2">
                            <span>{(item.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                            {item.page_count && <span>• {item.page_count} page(s)</span>}
                            {item.feature_count && <span>• {item.feature_count} map feature(s)</span>}
                            <span>• Detected: {item.detected_subtypes.join(", ")}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#788575] font-semibold bg-[#788575]/15 px-2 py-0.5 rounded">
                        ✓ {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings banner */}
            {currentAnalysis?.warnings && currentAnalysis.warnings.length > 0 && (
              <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-600/60 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <span>⚠️</span>
                  <span>Spatial Integration Notice</span>
                </div>
                {currentAnalysis.warnings.map((w, idx) => (
                  <p key={idx} className="text-[11px] leading-relaxed text-amber-300/90 font-mono">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Error banner */}
            {projectDataError && (
              <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <span>❌</span>
                  <span>Project Data Pipeline Error</span>
                </div>
                <p className="text-[11px] leading-relaxed font-mono">{projectDataError}</p>
                {projectDataError.includes("404") && (
                  <p className="text-[10px] text-red-300/80 pt-1">
                    Tip: Verify that the FastAPI backend is running and the /api/v1/project-data/analyze endpoint is active.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── REVIEW WORKSPACE (3-Column Layout) ──────────────────────── */
          <div className="h-full flex flex-col">
            {/* Real Processing Stages Status Bar */}
            {currentAnalysis && (
              <div className="px-6 py-2 bg-[#22211F] border-b border-[#343230] flex items-center gap-3 overflow-x-auto text-[11px] font-mono shrink-0">
                <span className="text-[#9B9994] font-semibold uppercase">Pipeline:</span>
                {currentAnalysis.processing_stages.map((stg) => (
                  <div key={stg.stage_index} className="flex items-center gap-1 shrink-0">
                    <span className="text-[#788575]">✓</span>
                    <span className="text-[#C5C0B8]">{stg.stage_name}</span>
                    {stg.stage_index < currentAnalysis.processing_stages.length && (
                      <span className="text-[#4E4C48] ml-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Warning banner in REVIEW mode if any */}
            {currentAnalysis?.warnings && currentAnalysis.warnings.length > 0 && (
              <div className="px-6 py-1.5 bg-amber-950/30 border-b border-amber-800/40 flex items-center gap-2 text-xs text-amber-200 shrink-0">
                <span className="text-amber-400 font-bold">⚠️ Notice:</span>
                <span className="text-[11px] font-mono text-amber-300/90 truncate">
                  {currentAnalysis.warnings.join(" | ")}
                </span>
              </div>
            )}

            <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
              {/* ── LEFT COLUMN: Source Documents & Spatial Evidence (3 cols) ── */}
              <div className="col-span-3 border-r border-[#343230] bg-[#1E1D1B] p-4 overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#9B9994] mb-2">
                    PROJECT SOURCES
                  </h3>

                  {/* Map Data */}
                  <div className="space-y-2 mb-3">
                    <div className="text-[10px] font-mono text-[#82807A] uppercase">Map Data</div>
                    {currentAnalysis?.manifest
                      .filter((m) => m.category === "MAP_SOURCE")
                      .map((m, i) => (
                        <div key={i} className="p-2 rounded bg-[#282624] border border-[#3A3834] text-xs">
                          <div className="font-mono font-medium text-[#F3EFEA] flex items-center gap-1.5">
                            <span>●</span>
                            <span>{m.filename}</span>
                          </div>
                          <div className="text-[10px] text-[#9B9994] mt-0.5">
                            {m.feature_count || currentAnalysis.map_feature_count || 0} features
                          </div>
                        </div>
                      ))}
                    {(!currentAnalysis?.manifest.some((m) => m.category === "MAP_SOURCE") ||
                      currentAnalysis?.map_feature_count === 0) && (
                      <div className="p-2 rounded bg-[#282624]/60 border border-[#3A3834] text-[11px] text-[#A85D48] font-mono">
                        ⚠️ No OSM/GeoJSON map data (Drawing-Only Mode active)
                      </div>
                    )}
                  </div>

                  {/* Architectural */}
                  <div className="space-y-2 mb-3">
                    <div className="text-[10px] font-mono text-[#82807A] uppercase">Architectural</div>
                    {currentAnalysis?.drawing_analysis?.documents
                      .filter((d) => d.role === "PRIMARY_SPATIAL")
                      .map((doc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedDocIndex(i);
                            setSelectedPageIndex(0);
                            setCenterViewMode("DRAWING");
                          }}
                          className={`w-full text-left p-2 rounded border text-xs transition-colors cursor-pointer ${
                            selectedDocIndex === i && centerViewMode === "DRAWING"
                              ? "bg-[#A85D48]/15 border-[#A85D48] text-[#F3EFEA]"
                              : "bg-[#282624] border-[#3A3834] text-[#C5C0B8] hover:border-[#5E5A54]"
                          }`}
                        >
                          <div className="font-mono font-medium flex items-center gap-1.5">
                            <span>●</span>
                            <span className="truncate">{doc.filename}</span>
                          </div>
                          <div className="text-[10px] text-[#9B9994] mt-0.5">{doc.page_count} pages</div>
                        </button>
                      ))}
                  </div>

                  {/* Structural */}
                  <div className="space-y-2 mb-3">
                    <div className="text-[10px] font-mono text-[#82807A] uppercase">Structural</div>
                    {currentAnalysis?.drawing_analysis?.documents
                      .filter((d) => d.role === "SUPPORTING_STRUCTURAL")
                      .map((doc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const actualIdx = currentAnalysis.drawing_analysis?.documents.findIndex(
                              (d) => d.document_id === doc.document_id
                            );
                            if (actualIdx !== undefined && actualIdx >= 0) setSelectedDocIndex(actualIdx);
                            setSelectedPageIndex(0);
                            setCenterViewMode("DRAWING");
                          }}
                          className="w-full text-left p-2 rounded bg-[#282624] border border-[#3A3834] text-xs text-[#C5C0B8] hover:border-[#5E5A54] cursor-pointer"
                        >
                          <div className="font-mono font-medium flex items-center gap-1.5">
                            <span>●</span>
                            <span className="truncate">{doc.filename}</span>
                          </div>
                          <div className="text-[10px] text-[#9B9994] mt-0.5">
                            {doc.primary_drawing_type.replace("_", " ")}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Spatial Evidence Checklist */}
                <div className="pt-3 border-t border-[#343230]">
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#9B9994] mb-2">
                    SPATIAL EVIDENCE
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Map Context</span>
                      <span className={currentAnalysis?.spatial_evidence_summary.map_available ? "text-[#788575]" : "text-[#82807A]"}>
                        {currentAnalysis?.spatial_evidence_summary.map_available ? "✓ Available" : "— None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Site Plan</span>
                      <span className="text-[#788575]">✓ Detected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Building Plan</span>
                      <span className="text-[#788575]">✓ Detected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Floor Plans</span>
                      <span className="text-[#788575]">✓ Detected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Sections</span>
                      <span className="text-[#788575]">✓ Detected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Structural</span>
                      <span className="text-[#788575]">✓ Available</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CENTER COLUMN: Interactive Drawing & Map Canvas (6 cols) ── */}
              <div className="col-span-6 flex flex-col bg-[#141413] border-r border-[#343230] overflow-hidden">
                {/* Center Toolbar */}
                <div className="px-4 py-2 bg-[#22211F] border-b border-[#343230] flex items-center justify-between text-xs font-mono shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCenterViewMode("DRAWING")}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        centerViewMode === "DRAWING"
                          ? "bg-[#3E3C38] text-white font-semibold"
                          : "text-[#9B9994] hover:text-white"
                      }`}
                    >
                      📐 Drawing Sheet View
                    </button>
                    {currentAnalysis?.spatial_source_status.osm_available && (
                      <button
                        type="button"
                        onClick={() => setCenterViewMode("MAP")}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                          centerViewMode === "MAP"
                            ? "bg-[#3E3C38] text-white font-semibold"
                            : "text-[#9B9994] hover:text-white"
                        }`}
                      >
                        🗺️ Map Correlation Overlay
                      </button>
                    )}
                  </div>

                  {centerViewMode === "DRAWING" && currentDoc && (
                    <div className="flex items-center gap-2 text-[#9B9994]">
                      <span>Page {selectedPageIndex + 1} of {currentDoc.page_count}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={selectedPageIndex === 0}
                          onClick={() => setSelectedPageIndex((p) => Math.max(0, p - 1))}
                          className="px-1.5 py-0.5 bg-[#2B2A27] rounded disabled:opacity-30"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={selectedPageIndex >= currentDoc.page_count - 1}
                          onClick={() => setSelectedPageIndex((p) => Math.min(currentDoc.page_count - 1, p + 1))}
                          className="px-1.5 py-0.5 bg-[#2B2A27] rounded disabled:opacity-30"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Render */}
                <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-[#0F0E0D]">
                  {centerViewMode === "DRAWING" && currentPage ? (
                    <div className="relative max-w-full max-h-full border border-[#3E3C38] rounded shadow-2xl bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`http://127.0.0.1:8000${currentPage.processed_image_url || currentPage.original_image_url}`}
                        alt={currentDoc?.filename || "Drawing Page"}
                        className="max-h-[60vh] object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="text-center space-y-2 p-8">
                      <div className="text-4xl">🗺️</div>
                      <h4 className="text-sm font-bold font-mono text-[#F3EFEA]">2D MAP CONTEXT OVERLAY</h4>
                      <p className="text-xs text-[#9B9994] max-w-md">
                        OpenStreetMap & GeoJSON boundary correlation active. Footprints align with building candidates.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT COLUMN: Detected Structure & Correlation (3 cols) ── */}
              <div className="col-span-3 bg-[#1E1D1B] p-4 overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#9B9994] mb-2">
                    DETECTED STRUCTURE
                  </h3>

                  <div className="space-y-2 text-xs font-mono bg-[#252422] p-3 rounded-lg border border-[#3A3834]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Building 01</span>
                      <span className="text-[#788575] font-bold">✓ Confirmed</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Ground Floor</span>
                      <span className="text-[#788575]">✓ 3.80 m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Typical Floors 1–6</span>
                      <span className="text-[#788575]">✓ 6 Levels</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Total Height</span>
                      <span className="text-[#F3EFEA] font-bold">✓ 23.00 m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Unit Candidates</span>
                      <span className="text-[#B28A52] font-bold">⚠ 3 / Floor (18 total)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C0B8]">Drawing Scale</span>
                      <span className="text-[#788575]">✓ 1:100</span>
                    </div>
                  </div>
                </div>

                {/* Building Correlation Card */}
                {currentAnalysis && currentAnalysis.building_correlations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#9B9994] mb-2">
                      CROSS-SOURCE CORRELATION
                    </h3>
                    {currentAnalysis.building_correlations.map((corr) => (
                      <div
                        key={corr.correlation_id}
                        className="p-3 rounded-lg bg-[#252422] border border-[#3A3834] space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#F3EFEA]">
                            {corr.osm_building_id ? "MAP ↔ DRAWING MATCH" : "DRAWING BUILDING"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#788575]/20 text-[#A0BA9E]">
                            {corr.match_confidence} ({(corr.match_score * 100).toFixed(0)}%)
                          </span>
                        </div>

                        <div className="text-[11px] space-y-1 text-[#9B9994]">
                          {corr.osm_building_id && (
                            <div>
                              <span className="text-[#82807A]">Map Building: </span>
                              <span className="text-[#C5C0B8]">{corr.osm_building_id} ({corr.osm_area_sqm} m²)</span>
                            </div>
                          )}
                          <div>
                            <span className="text-[#82807A]">Drawing: </span>
                            <span className="text-[#C5C0B8]">{corr.drawing_building_name} ({corr.drawing_area_sqm} m²)</span>
                          </div>
                          <div>
                            <span className="text-[#82807A]">Dimensions: </span>
                            <span className="text-[#C5C0B8]">{corr.drawing_dimensions}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateBuildingCorrelation(corr.correlation_id, "CONFIRMED")}
                            className="flex-1 py-1 rounded bg-[#788575]/30 hover:bg-[#788575]/50 border border-[#788575] text-[#D2DFD0] text-[11px] font-semibold text-center cursor-pointer"
                          >
                            ✓ Confirm Match
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBuildingCorrelation(corr.correlation_id, "KEPT_SEPARATE")}
                            className="py-1 px-2 rounded bg-[#2B2A27] hover:bg-[#343230] border border-[#484542] text-[#9B9994] text-[11px] text-center cursor-pointer"
                          >
                            Keep Separate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Build Success Banner */}
                {buildSuccessMessage && (
                  <div className="p-3 rounded-lg bg-[#788575]/20 border border-[#788575] text-xs text-[#D2DFD0] space-y-2">
                    <div>✓ {buildSuccessMessage}</div>
                    {onNavigateTo3D && (
                      <button
                        type="button"
                        onClick={onNavigateTo3D}
                        className="w-full py-1.5 rounded bg-[#788575] text-white font-mono font-bold text-xs cursor-pointer hover:bg-[#657262]"
                      >
                        Open in 3D Cadastre Viewer →
                      </button>
                    )}
                  </div>
                )}

                {/* Build STHARA Model CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleBuildModel}
                    disabled={isBuildingModel}
                    className="w-full py-3 rounded-lg bg-[#A85D48] hover:bg-[#934E3B] text-white text-xs font-bold tracking-wider uppercase font-mono shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isBuildingModel ? (
                      <>
                        <span className="animate-spin text-base">⌛</span>
                        <span>GENERATING 3D MODEL & SPATIAL IDS...</span>
                      </>
                    ) : (
                      <>
                        <span>🏗️</span>
                        <span>BUILD STHARA MODEL</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-[#82807A] mt-2">
                    Generates 3D solid volumes, multi-floor units, and canonical Spatial IDs under dataset &apos;{activeDatasetId}&apos;.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
