"use client";

import React, { useId } from "react";
import { FloorPlanAssociation } from "@/types/floor_plan";

export interface FloorPlanViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  floorPlan: FloorPlanAssociation | null;
  buildingName?: string | null;
  floorName?: string | null;
}

export function FloorPlanViewerModal({
  isOpen,
  onClose,
  floorPlan,
  buildingName,
  floorName,
}: FloorPlanViewerModalProps) {
  const titleId = useId();

  if (!isOpen || !floorPlan) return null;

  const isPdf = floorPlan.file_type === "PDF" || floorPlan.mime_type === "application/pdf";
  const formattedSize = (floorPlan.file_size_bytes / (1024 * 1024)).toFixed(2);

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
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#DDBCB4]"
              style={{ backgroundColor: "var(--sth-clay-bg)", color: "var(--sth-accent)" }}
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
                  {floorPlan.filename}
                </h2>
                <span
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: "var(--sth-sage-bg)",
                    color: "var(--sth-sage)",
                    borderColor: "#C0CAC0",
                  }}
                >
                  {floorPlan.file_type} ({formattedSize} MB)
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--sth-text-2)]">
                {buildingName || floorPlan.building_id} • {floorName || floorPlan.floor_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={floorPlan.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded border border-[var(--sth-border)] bg-[var(--sth-surface)] text-[var(--sth-text-2)] hover:text-[var(--sth-text)] transition-colors"
              title="Open full document in new browser tab"
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

        {/* Document Content View */}
        <div className="flex-1 bg-[#121212] overflow-hidden relative flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={floorPlan.view_url}
              title={floorPlan.filename}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={floorPlan.view_url}
                alt={floorPlan.filename}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Footer / Attribution Notice */}
        <div
          className="px-5 py-2.5 border-t border-[var(--sth-border)] flex items-center justify-between text-[10px] font-mono text-[var(--sth-text-2)]"
          style={{ backgroundColor: "var(--sth-surface)" }}
        >
          <div>
            Source Attribution: <strong className="text-[var(--sth-text)]">{floorPlan.source}</strong> (Status: {floorPlan.status})
          </div>
          <div>
            Attached: {new Date(floorPlan.uploaded_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
