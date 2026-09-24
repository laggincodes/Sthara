"use client";

import React, { useState, useRef } from "react";
import { cadastreApi, DrawingAnalysis } from "@/lib/api/client";

interface DrawingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  onAnalysisReady: (analysis: DrawingAnalysis) => void;
}

export function DrawingImportModal({
  isOpen,
  onClose,
  datasetId,
  onAnalysisReady,
}: DrawingImportModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
      setErrorMsg(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAnalyze = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg("Please select at least one drawing file.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressStage("Uploading project drawings...");

    try {
      setTimeout(() => setProgressStage("Rendering vector sheets to high-res raster..."), 400);
      setTimeout(() => setProgressStage("Classifying architectural vs structural sheets..."), 800);
      setTimeout(() => setProgressStage("Detecting drawing regions & OCR token extraction..."), 1200);
      setTimeout(() => setProgressStage("Delineating building, floor, & unit candidates..."), 1600);

      const analysis = await cadastreApi.uploadDrawingSet(selectedFiles, datasetId);
      setProgressStage("Analysis complete.");
      onAnalysisReady(analysis);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process drawings.";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadGoldenDemo = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressStage("Loading 4 Golden Project Drawings (ARCH & STRU)...");

    try {
      setTimeout(() => setProgressStage("PyMuPDF rasterizing 4 vector drawing sheets..."), 300);
      setTimeout(() => setProgressStage("Classifying: 20 ARCH PLAN (Primary) & STRU 1-3 (Supporting)..."), 700);
      setTimeout(() => setProgressStage("Extracting Site Plan, Ground, Typical Floors (1-6) & Section A-A..."), 1100);
      setTimeout(() => setProgressStage("Delineating Units A-01, A-02, A-03 & deterministic candidates..."), 1500);

      const analysis = await cadastreApi.loadGoldenDemoDrawings(datasetId);
      setProgressStage("Golden set ready.");
      onAnalysisReady(analysis);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load golden test drawing set.";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-xl border border-[#D7D4CB] bg-[#F4F1EA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#D7D4CB] bg-[#E9E5DA] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85D48]/15 text-[#A85D48] border border-[#DDBCB4]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight text-[#252622]">
                DRAWING INTELLIGENCE v1
              </h2>
              <p className="text-[11px] font-mono text-[#62635D]">
                Plan-to-Spatial Model / Multi-Drawing PDF Ingestion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-[#62635D] hover:bg-[#D7D4CB] hover:text-[#252622] transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          {/* Quick Demo Action Banner */}
          <div className="rounded-lg border border-[#DDBCB4] bg-[#A85D48]/5 p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#A85D48]" />
                <span className="font-mono font-bold text-xs text-[#A85D48]">
                  GOLDEN TEST CASE (4 SHEETS)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#62635D] leading-relaxed">
                Includes <span className="font-mono font-semibold text-[#252622]">20 ARCH PLAN.pdf</span> (Primary) &amp; <span className="font-mono font-semibold text-[#252622]">20 STRU PLAN 1–3.pdf</span> (Supporting Structural).
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadGoldenDemo}
              disabled={isProcessing}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#A85D48] text-white font-mono text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Load Golden Set</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D7D4CB] hover:border-[#A85D48] bg-[#E9E5DA]/50 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#E9E5DA] text-[#62635D] border border-[#D7D4CB]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <span className="font-mono font-semibold text-xs text-[#252622]">
                Click or drag &amp; drop project drawings here
              </span>
              <p className="text-[11px] font-mono text-[#77786F] mt-0.5">
                Supports PDF, PNG, JPG, JPEG • Maximum 20MB per file
              </p>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#62635D]">
                Selected Documents ({selectedFiles.length})
              </div>
              <div className="divide-y divide-[#D7D4CB] rounded-lg border border-[#D7D4CB] bg-[#E9E5DA] max-h-40 overflow-y-auto">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 text-[11px] font-mono">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="rounded bg-[#F4F1EA] border border-[#D7D4CB] px-1 py-0.5 text-[9px] font-bold text-[#A85D48]">
                        {f.name.endsWith(".pdf") ? "PDF" : "IMG"}
                      </span>
                      <span className="truncate font-medium text-[#252622]">{f.name}</span>
                      <span className="text-[10px] text-[#77786F]">({formatFileSize(f.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      disabled={isProcessing}
                      className="text-rose-600 hover:text-rose-800 p-1 text-[11px] cursor-pointer"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress / Status Display */}
          {isProcessing && (
            <div className="rounded-lg border border-[#DDBCB4] bg-[#A85D48]/10 p-3 flex items-center gap-3">
              <span className="h-4 w-4 border-2 border-[#A85D48] border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="font-mono text-xs text-[#A85D48] font-medium">
                {progressStage}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-rose-700 font-mono text-xs">
              {errorMsg}
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-lg border border-[#D7D4CB] bg-[#E9E5DA]/60 p-2.5 text-[10px] font-mono text-[#62635D] leading-relaxed">
            <span className="font-bold text-[#252622]">NOTE: </span>
            Drawing Intelligence performs AI/CV assisted interpretation of project architectural and structural drawings. Extracted geometry serves as candidate spatial layouts and requires human visual review and confirmation prior to entering the 3D model. Does not represent official land title or government registration.
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between border-t border-[#D7D4CB] bg-[#E9E5DA] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg border border-[#D7D4CB] bg-[#F4F1EA] px-3.5 py-1.5 font-mono text-xs text-[#252622] hover:bg-[#D7D4CB] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadAndAnalyze}
            disabled={isProcessing || selectedFiles.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#A85D48] px-4 py-1.5 font-mono text-xs font-semibold text-white hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? "Analyzing Drawings..." : `Analyze Selected (${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
