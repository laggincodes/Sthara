"use client";

import React, { useId } from "react";
import { BuildingBlueprintRecord } from "@/lib/api/client";

export interface BuildingBlueprintViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: BuildingBlueprintRecord | null;
  buildingName?: string | null;
}

export function BuildingBlueprintViewerModal({
  isOpen,
  onClose,
  blueprint,
  buildingName,
}: BuildingBlueprintViewerModalProps) {
  const titleId = useId();

  if (!isOpen || !blueprint) return null;

  const isPdf = blueprint.file_type === "PDF" || blueprint.mime_type === "application/pdf";
  const formattedSize = (blueprint.file_size_bytes / (1024 * 1024)).toFixed(2);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl h-[85vh] rounded-xl border border-[var(--sth-border)] bg-[var(--sth-card)] shadow-2xl overflow-hidden flex flex-col"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b border-[var(--sth-border)] flex items-center justify-between"
          style={{ backgroundColor: "var(--sth-surface)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#D8C8A8]"
              style={{ backgroundColor: "var(--sth-geo-bg)", color: "var(--sth-geo)" }}
            >
              {isPdf ? (
                <span className="font-mono text-xs font-bold">PDF</span>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="text-sm font-bold text-[var(--sth-text)] truncate max-w-[340px]">
                  {blueprint.filename}
                </h2>
                <span
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: "var(--sth-geo-bg)",
                    color: "var(--sth-geo)",
                    borderColor: "#D8C8A8",
                  }}
                >
                  Building Blueprint • {blueprint.file_type} ({formattedSize} MB)
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--sth-text-2)]">
                {buildingName || blueprint.building_id} • Entire Building Reference
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={blueprint.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text-2)] hover:text-[var(--sth-text)] transition-colors"
              title="Open full blueprint document in new browser tab"
            >
              <span>↗</span> Open Tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--sth-text-2)] hover:text-[var(--sth-text)] p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 bg-[#1A1A1A] relative flex items-center justify-center overflow-auto p-4">
          {isPdf ? (
            <iframe
              src={blueprint.view_url}
              title={`Building Blueprint - ${blueprint.filename}`}
              className="w-full h-full rounded border-0 bg-white"
            />
          ) : (
            <img
              src={blueprint.view_url}
              alt={`Building Blueprint - ${blueprint.filename}`}
              className="max-w-full max-h-full object-contain rounded shadow-lg"
            />
          )}
        </div>

        {/* Footer Provenance Note */}
        <div
          className="px-5 py-2.5 border-t border-[var(--sth-border)] flex items-center justify-between text-[11px] font-mono"
          style={{ backgroundColor: "var(--sth-surface)", color: "var(--sth-text-2)" }}
        >
          <div>
            Source: <strong className="text-[var(--sth-geo)]">{blueprint.source}</strong> (Whole Building)
          </div>
          <div className="text-[10px]">
            Status: <span className="text-[var(--sth-sage)] font-semibold">{blueprint.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
