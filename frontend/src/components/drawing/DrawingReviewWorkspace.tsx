"use client";

import React, { useState } from "react";
import {
  cadastreApi,
  DrawingAnalysis,
  DrawingDocument,
  DrawingPage,
  BuildModelResponse,
} from "@/lib/api/client";

interface DrawingReviewWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DrawingAnalysis;
  datasetId: string;
  onModelBuilt?: (result: BuildModelResponse) => void;
}

export function DrawingReviewWorkspace({
  isOpen,
  onClose,
  analysis: initialAnalysis,
  datasetId,
  onModelBuilt,
}: DrawingReviewWorkspaceProps) {
  const [analysis, setAnalysis] = useState<DrawingAnalysis>(initialAnalysis);
  const [selectedDocId, setSelectedDocId] = useState<string>(
    initialAnalysis.documents[0]?.document_id || ""
  );
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [imageType, setImageType] = useState<"original" | "processed">("original");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isBuildingModel, setIsBuildingModel] = useState<boolean>(false);
  const [buildResult, setBuildResult] = useState<BuildModelResponse | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const [prevAnalysisId, setPrevAnalysisId] = useState<string>(initialAnalysis.analysis_id);
  if (initialAnalysis.analysis_id !== prevAnalysisId) {
    setPrevAnalysisId(initialAnalysis.analysis_id);
    setAnalysis(initialAnalysis);
    if (initialAnalysis.documents.length > 0) {
      setSelectedDocId(initialAnalysis.documents[0].document_id);
      setSelectedPageNum(1);
    }
  }

  if (!isOpen) return null;

  const currentDoc: DrawingDocument | undefined = analysis.documents.find(
    (d) => d.document_id === selectedDocId
  );
  const currentPage: DrawingPage | undefined = currentDoc?.pages.find(
    (p) => p.page_number === selectedPageNum
  );

  const pageRegions = analysis.regions.filter(
    (r) => r.document_id === selectedDocId && r.page_number === selectedPageNum
  );
  const pageCandidates = analysis.candidates.filter(
    (c) => c.document_id === selectedDocId && c.page_number === selectedPageNum
  );

  const selectedCandidate = analysis.candidates.find(
    (c) => c.candidate_id === selectedCandidateId
  );

  const handleConfirmCandidate = async (candidateId: string) => {
    try {
      const updated = await cadastreApi.confirmDrawingCandidate(analysis.analysis_id, candidateId);
      setAnalysis((prev) => ({
        ...prev,
        candidates: prev.candidates.map((c) => (c.candidate_id === candidateId ? updated : c)),
      }));
    } catch (err) {
      console.error("Failed to confirm candidate:", err);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      const updated = await cadastreApi.rejectDrawingCandidate(analysis.analysis_id, candidateId);
      setAnalysis((prev) => ({
        ...prev,
        candidates: prev.candidates.map((c) => (c.candidate_id === candidateId ? updated : c)),
      }));
    } catch (err) {
      console.error("Failed to reject candidate:", err);
    }
  };

  const handleAcceptAllHighConfidence = async () => {
    for (const cand of analysis.candidates) {
      if (cand.confidence === "HIGH" && cand.status !== "CONFIRMED") {
        await handleConfirmCandidate(cand.candidate_id);
      }
    }
  };

  const handleBuildModel = async (forceDrawingOnly = false) => {
    setIsBuildingModel(true);
    try {
      const result = await cadastreApi.buildStharaModelFromDrawing(analysis.analysis_id, {
        target_building_id: forceDrawingOnly ? "DRAWING-B001" : undefined,
        target_building_name: "Tower 01 (Project Drawings)",
        ground_elevation: 0.0,
        apply_units_to_all_typical_floors: true,
        create_as_drawing_only: forceDrawingOnly,
      });
      setBuildResult(result);
      if (onModelBuilt) onModelBuilt(result);
    } catch (err) {
      console.error("Failed to build model:", err);
    } finally {
      setIsBuildingModel(false);
    }
  };

  const getCandidateColor = (status: string, isSelected: boolean) => {
    if (isSelected) return { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.35)", strokeWidth: 3 };
    switch (status) {
      case "CONFIRMED":
        return { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.22)", strokeWidth: 2 };
      case "REVIEW":
        return { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.22)", strokeWidth: 2 };
      case "REJECTED":
        return { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.10)", strokeWidth: 1.5 };
      default:
        return { stroke: "#94a3b8", fill: "rgba(148, 163, 184, 0.15)", strokeWidth: 1.5 };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-7xl rounded-2xl border border-[#D7D4CB] bg-[#F4F1EA] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#D7D4CB] bg-[#E9E5DA] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85D48] text-white font-mono font-bold text-xs shadow-sm">
              DI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono text-[#252622]">
                  DRAWING INTELLIGENCE WORKSPACE
                </h2>
                <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-[#788575]">
                  {analysis.summary.confirmed_candidates}/{analysis.summary.total_candidates} Confirmed
                </span>
                <span className="rounded bg-[#F4F1EA] border border-[#D7D4CB] px-1.5 py-0.5 text-[9px] font-mono text-[#62635D]">
                  Dataset: {datasetId}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#77786F]">
                Controlled Document Understanding • Human Visual Review &amp; Confirmation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAllHighConfidence}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 text-[#788575] font-mono text-xs font-semibold hover:bg-emerald-900/30 transition-colors cursor-pointer"
            >
              ✓ Accept High Confidence
            </button>
            <button
              type="button"
              onClick={() => handleBuildModel(true)}
              disabled={isBuildingModel}
              className="px-3 py-1.5 rounded-lg border border-[#DDBCB4] bg-[#F4F1EA] text-[#A85D48] font-mono text-xs font-semibold hover:bg-[#E9E5DA] transition-colors cursor-pointer disabled:opacity-50"
              title="Create as independent drawing-derived STHARA building in local metric space"
            >
              📐 Mode B (Drawing-Only)
            </button>
            <button
              type="button"
              onClick={() => handleBuildModel(false)}
              disabled={isBuildingModel}
              className="px-4 py-1.5 rounded-lg bg-[#A85D48] text-white font-mono text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isBuildingModel ? (
                <>
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating 3D Model...</span>
                </>
              ) : (
                <>
                  <span>🚀 Build STHARA Model</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#62635D] hover:bg-[#D7D4CB] hover:text-[#252622] transition-colors cursor-pointer ml-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 3-Panel Workspace Body */}
        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
          {/* LEFT PANEL: Document & Sheet Explorer (3 cols) */}
          <div className="col-span-3 border-r border-[#D7D4CB] bg-[#E9E5DA]/50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#D7D4CB] bg-[#E9E5DA] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#62635D]">
                Project Drawings ({analysis.documents.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#D7D4CB] p-2 space-y-1">
              {analysis.documents.map((doc) => {
                const isSelected = doc.document_id === selectedDocId;
                const isPrimary = doc.role === "PRIMARY_SPATIAL";
                return (
                  <div
                    key={doc.document_id}
                    onClick={() => {
                      setSelectedDocId(doc.document_id);
                      setSelectedPageNum(1);
                      setSelectedCandidateId(null);
                    }}
                    className={`rounded-lg p-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#F4F1EA] border border-[#DDBCB4] shadow-sm"
                        : "hover:bg-[#E9E5DA] border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="truncate">
                        <span className="font-mono font-bold text-xs text-[#252622] block truncate">
                          {doc.filename}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`rounded px-1.5 py-0.2 text-[8px] font-mono font-bold ${
                              isPrimary
                                ? "bg-[#A85D48]/15 text-[#A85D48] border border-[#DDBCB4]"
                                : "bg-slate-200 text-[#62635D] border border-[#D7D4CB]"
                            }`}
                          >
                            {isPrimary ? "PRIMARY SPATIAL" : "SUPPORTING STRUCTURAL"}
                          </span>
                          <span className="text-[9px] font-mono text-[#77786F]">
                            {doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Detected Regions within this doc */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-[#D7D4CB] space-y-1">
                        <div className="text-[9px] font-mono font-semibold text-[#77786F] uppercase">
                          Detected Regions ({pageRegions.length})
                        </div>
                        <div className="space-y-1">
                          {pageRegions.map((reg) => (
                            <div
                              key={reg.region_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRegionId(reg.region_id);
                              }}
                              className={`rounded px-2 py-1 text-[10px] font-mono flex items-center justify-between cursor-pointer ${
                                selectedRegionId === reg.region_id
                                  ? "bg-[#A85D48]/20 text-[#A85D48] font-bold"
                                  : "bg-[#E9E5DA] text-[#62635D] hover:bg-[#D7D4CB]"
                              }`}
                            >
                              <span className="truncate">{reg.title}</span>
                              <span className="text-[8px] font-normal text-[#77786F]">{reg.scale}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drawing Summary Card */}
            <div className="p-3 border-t border-[#D7D4CB] bg-[#E9E5DA] font-mono text-[10px] space-y-1">
              <div className="flex justify-between text-[#62635D]">
                <span>Floors Detected:</span>
                <span className="font-bold text-[#252622]">{analysis.summary.detected_floors_count} Levels</span>
              </div>
              <div className="flex justify-between text-[#62635D]">
                <span>Estimated Total Height:</span>
                <span className="font-bold text-[#252622]">{analysis.summary.estimated_total_height_m}m</span>
              </div>
              <div className="flex justify-between text-[#62635D]">
                <span>Architectural Scale:</span>
                <span className="font-bold text-[#A85D48]">{analysis.summary.detected_scale || "1:100"}</span>
              </div>
            </div>
          </div>

          {/* CENTER PANEL: Visual Drawing Overlay Canvas (6 cols) */}
          <div className="col-span-6 flex flex-col bg-[#DFDCD3] overflow-hidden relative">
            {/* View Controls Toolbar */}
            <div className="p-2.5 border-b border-[#D7D4CB] bg-[#E9E5DA] flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#62635D] font-bold">VIEW MODE:</span>
                <div className="flex rounded-md border border-[#D7D4CB] bg-[#F4F1EA] p-0.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setImageType("original")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      imageType === "original"
                        ? "bg-[#A85D48] text-white"
                        : "text-[#62635D] hover:text-[#252622]"
                    }`}
                  >
                    Original Drawing
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageType("processed")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      imageType === "processed"
                        ? "bg-[#A85D48] text-white"
                        : "text-[#62635D] hover:text-[#252622]"
                    }`}
                  >
                    Contrast / Vector
                  </button>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className="rounded border border-[#D7D4CB] bg-[#F4F1EA] px-2 py-0.5 text-xs font-mono text-[#252622] hover:bg-[#D7D4CB]"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-[10px] font-mono text-[#62635D] px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="rounded border border-[#D7D4CB] bg-[#F4F1EA] px-2 py-0.5 text-xs font-mono text-[#252622] hover:bg-[#D7D4CB]"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1.0)}
                  className="rounded border border-[#D7D4CB] bg-[#F4F1EA] px-2 py-0.5 text-[10px] font-mono text-[#62635D] hover:bg-[#D7D4CB]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Overlay Sheet Viewport */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
              {currentPage ? (
                <div
                  className="relative shadow-2xl border border-slate-400 bg-white transition-transform duration-100 origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* Rendered Drawing Image */}
                  <img
                    src={cadastreApi.getDrawingPageImageUrl(
                      analysis.analysis_id,
                      currentPage.page_id,
                      imageType
                    )}
                    alt={currentDoc?.filename}
                    className="max-w-none block select-none pointer-events-none"
                    style={{
                      width: `${currentPage.width_px > 1200 ? currentPage.width_px / 1.5 : currentPage.width_px}px`,
                      height: "auto",
                    }}
                  />

                  {/* SVG Overlay Layer for Regions & Candidate Polygons */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                  >
                    {/* 1. Region Outlines */}
                    {pageRegions.map((reg) => {
                      const { xmin, ymin, xmax, ymax } = reg.bbox;
                      const x = xmin * 1000;
                      const y = ymin * 1000;
                      const w = (xmax - xmin) * 1000;
                      const h = (ymax - ymin) * 1000;
                      const isSelected = selectedRegionId === reg.region_id;

                      return (
                        <g key={reg.region_id}>
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            fill="none"
                            stroke={isSelected ? "#A85D48" : "rgba(100, 116, 139, 0.4)"}
                            strokeWidth={isSelected ? "3" : "1.5"}
                            strokeDasharray={isSelected ? "none" : "4 2"}
                            className="transition-all"
                          />
                        </g>
                      );
                    })}

                    {/* 2. Candidate Polygons */}
                    {pageCandidates.map((cand) => {
                      if (!cand.polygon_normalized || cand.polygon_normalized.length === 0) return null;
                      const isSelected = selectedCandidateId === cand.candidate_id;
                      const style = getCandidateColor(cand.status, isSelected);

                      const pointsStr = cand.polygon_normalized
                        .map(([nx, ny]) => `${nx * 1000},${ny * 1000}`)
                        .join(" ");

                      return (
                        <g
                          key={cand.candidate_id}
                          className="cursor-pointer"
                          onClick={() => setSelectedCandidateId(cand.candidate_id)}
                        >
                          <polygon
                            points={pointsStr}
                            fill={style.fill}
                            stroke={style.stroke}
                            strokeWidth={style.strokeWidth}
                            className="transition-all hover:opacity-80"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="text-center font-mono text-xs text-[#77786F]">
                  Select a document to render drawing sheet.
                </div>
              )}
            </div>

            {/* Color Legend Footer */}
            <div className="p-2 border-t border-[#D7D4CB] bg-[#E9E5DA] flex items-center justify-between text-[10px] font-mono text-[#62635D]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-amber-500" />
                  <span>Review Required</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500" />
                  <span>Rejected</span>
                </div>
              </div>
              <div>Click any candidate polygon on the drawing to inspect &amp; confirm</div>
            </div>
          </div>

          {/* RIGHT PANEL: Candidates Inspector & Confirmation (3 cols) */}
          <div className="col-span-3 border-l border-[#D7D4CB] bg-[#E9E5DA]/50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#D7D4CB] bg-[#E9E5DA] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#62635D]">
                Candidates ({analysis.candidates.length})
              </span>
              <div className="flex gap-1 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => setFilterType("ALL")}
                  className={`px-1.5 py-0.5 rounded ${
                    filterType === "ALL" ? "bg-[#A85D48] text-white font-bold" : "text-[#62635D]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("UNIT")}
                  className={`px-1.5 py-0.5 rounded ${
                    filterType === "UNIT" ? "bg-[#A85D48] text-white font-bold" : "text-[#62635D]"
                  }`}
                >
                  Units
                </button>
              </div>
            </div>

            {/* Candidates List / Detail */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedCandidate ? (
                /* Selected Candidate Detail Card */
                <div className="rounded-xl border border-[#DDBCB4] bg-[#F4F1EA] p-3 shadow-md space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#A85D48] font-bold">
                        {selectedCandidate.candidate_type}
                      </span>
                      <h4 className="font-mono font-bold text-xs text-[#252622] mt-0.5">
                        {selectedCandidate.name}
                      </h4>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8px] font-mono font-bold ${
                        selectedCandidate.status === "CONFIRMED"
                          ? "bg-emerald-950/60 text-[#788575] border border-emerald-500/30"
                          : selectedCandidate.status === "REJECTED"
                          ? "bg-rose-950/60 text-rose-300 border border-rose-500/30"
                          : "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {selectedCandidate.status}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    {selectedCandidate.area_sqm && (
                      <div className="rounded bg-[#E9E5DA] p-1.5 border border-[#D7D4CB]">
                        <span className="text-[#77786F] block text-[8px]">ESTIMATED AREA</span>
                        <span className="font-bold text-[#252622]">{selectedCandidate.area_sqm} m²</span>
                      </div>
                    )}
                    {selectedCandidate.height && (
                      <div className="rounded bg-[#E9E5DA] p-1.5 border border-[#D7D4CB]">
                        <span className="text-[#77786F] block text-[8px]">HEIGHT</span>
                        <span className="font-bold text-[#A85D48]">{selectedCandidate.height}m</span>
                      </div>
                    )}
                    {selectedCandidate.floor_range && (
                      <div className="col-span-2 rounded bg-[#E9E5DA] p-1.5 border border-[#D7D4CB]">
                        <span className="text-[#77786F] block text-[8px]">APPLIES TO FLOORS</span>
                        <span className="font-bold text-[#788575]">
                          Floors {selectedCandidate.floor_range.join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedCandidate.rooms && (
                      <div className="col-span-2 rounded bg-[#E9E5DA] p-1.5 border border-[#D7D4CB]">
                        <span className="text-[#77786F] block text-[8px]">ROOMS RECOGNIZED</span>
                        <span className="text-[#252622] text-[9px] block">
                          {selectedCandidate.rooms.join(" • ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-[#D7D4CB]">
                    <button
                      type="button"
                      onClick={() => handleConfirmCandidate(selectedCandidate.candidate_id)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-[10px] font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      ✓ Confirm Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectCandidate(selectedCandidate.candidate_id)}
                      className="py-1.5 px-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-mono text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ) : null}

              {/* All Candidates Scrollable Cards */}
              <div className="space-y-1.5">
                {analysis.candidates
                  .filter((c) => filterType === "ALL" || c.candidate_type === filterType)
                  .map((cand) => {
                    const isSelected = cand.candidate_id === selectedCandidateId;
                    return (
                      <div
                        key={cand.candidate_id}
                        onClick={() => {
                          setSelectedCandidateId(cand.candidate_id);
                          setSelectedDocId(cand.document_id);
                          setSelectedPageNum(cand.page_number);
                        }}
                        className={`rounded-lg p-2 font-mono text-[10px] cursor-pointer border transition-all ${
                          isSelected
                            ? "bg-[#F4F1EA] border-[#A85D48] shadow-sm"
                            : "bg-[#E9E5DA] border-[#D7D4CB] hover:bg-[#F4F1EA]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#A85D48] font-bold">
                            {cand.candidate_type}
                          </span>
                          <span
                            className={`rounded px-1 py-0.2 text-[8px] font-bold ${
                              cand.status === "CONFIRMED"
                                ? "text-emerald-700 bg-emerald-100"
                                : cand.status === "REJECTED"
                                ? "text-rose-700 bg-rose-100"
                                : "text-amber-700 bg-amber-100"
                            }`}
                          >
                            {cand.status}
                          </span>
                        </div>
                        <div className="font-bold text-[#252622] mt-0.5 truncate">{cand.name}</div>
                        {cand.area_sqm && (
                          <div className="text-[9px] text-[#77786F] mt-0.5">
                            Area: {cand.area_sqm} m² • Conf: {cand.confidence}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Model Generation Success Alert */}
            {buildResult && (
              <div className="p-3 border-t border-emerald-500/30 bg-emerald-950/20 text-emerald-900 font-mono text-[10px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-emerald-700">
                  <span>✓ STHARA 3D MODEL GENERATED ({buildResult.building_id})</span>
                </div>
                <div>{buildResult.floors_created.length} Floors • {buildResult.units_created_count} Units</div>
                <div>Total Height: {buildResult.total_height_m}m • Watertight Mesh: Yes</div>
                <div className="text-[9px] text-[#A85D48] pt-1">
                  Source: {buildResult.spatial_source}
                </div>
                <div className="text-[9px] text-[#77786F]">
                  Geo-Positioning: {buildResult.geographic_status === "UNRESOLVED_LOCAL_SPACE" ? "Unresolved (Local Metric Coordinates)" : "Positioned (WGS84 / Projected)"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
