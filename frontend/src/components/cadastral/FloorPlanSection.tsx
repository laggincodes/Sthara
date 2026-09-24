"use client";

import React, { useRef, useState } from "react";
import { FloorPlanAssociation } from "@/types/floor_plan";

export interface FloorPlanSectionProps {
  buildingId: string;
  floorId: string;
  floorPlan: FloorPlanAssociation | null;
  onAttach: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  onView: () => void;
}

export function FloorPlanSection({
  floorPlan,
  onAttach,
  onRemove,
  onView,
}: FloorPlanSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if replaced
    e.target.value = "";

    // Client-side validations
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const validExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
    if (!validExtensions.includes(ext)) {
      setActionError(`Unsupported file format '${ext}'. Allowed formats: PDF, PNG, JPG.`);
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setActionError("File exceeds 10 MB maximum permitted size limit.");
      return;
    }

    setIsProcessing(true);
    setActionError(null);

    try {
      await onAttach(file);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to upload floor plan document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setActionError(null);

    try {
      await onRemove();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to remove floor plan document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="rounded-md p-3 space-y-2 border text-xs"
      style={{
        borderColor: "var(--sth-border)",
        backgroundColor: "var(--sth-surface)",
      }}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between pb-1 border-b"
        style={{ borderColor: "var(--sth-border)" }}
      >
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[var(--sth-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span
            className="text-[10px] font-mono font-semibold uppercase tracking-wider"
            style={{ color: "var(--sth-text-2)" }}
          >
            Floor Plan / Blueprint
          </span>
        </div>
        <span
          className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border"
          style={
            floorPlan
              ? {
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  color: "#2563eb",
                  borderColor: "rgba(59, 130, 246, 0.3)",
                }
              : {
                  backgroundColor: "var(--sth-card)",
                  color: "var(--sth-text-2)",
                  borderColor: "var(--sth-border)",
                }
          }
        >
          {floorPlan ? "ATTACHED" : "OPTIONAL"}
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Body: Attached vs Unattached */}
      {floorPlan ? (
        <div className="space-y-2">
          {/* Metadata Display */}
          <div
            className="p-2 rounded border space-y-1 font-mono text-[11px]"
            style={{
              backgroundColor: "var(--sth-card)",
              borderColor: "var(--sth-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--sth-text-2)] uppercase">Document</span>
              <span className="text-[9px] px-1 py-0.2 rounded border font-semibold border-blue-400 text-blue-600 bg-blue-50">
                {floorPlan.file_type}
              </span>
            </div>
            <div className="font-semibold text-[var(--sth-text)] truncate" title={floorPlan.filename}>
              {floorPlan.filename}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--sth-text-2)] pt-0.5 border-t border-[var(--sth-border)]">
              <div>
                Size:{" "}
                <strong className="text-[var(--sth-text)]">
                  {(floorPlan.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                </strong>
              </div>
              <div className="text-right">
                Status:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {floorPlan.status}
                </strong>
              </div>
            </div>
          </div>

          {/* Action Buttons: [ View ] [ Replace ] [ Remove ] */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={onView}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded text-[11px] font-mono font-medium text-white transition-opacity cursor-pointer shadow-sm disabled:opacity-50"
              style={{ backgroundColor: "var(--sth-accent)" }}
              title="Preview floor plan document"
            >
              <span>👁</span> View
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded text-[11px] font-mono font-medium border transition-colors cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "var(--sth-surface)",
                borderColor: "var(--sth-border)",
                color: "var(--sth-text)",
              }}
              title="Replace current floor plan with another document"
            >
              <span>↻</span> Replace
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={isProcessing}
              className="inline-flex items-center justify-center py-1.5 px-2.5 rounded text-[11px] font-mono font-medium border text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
              style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}
              title="Remove floor plan association"
            >
              {isProcessing ? (
                <span className="h-3 w-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <span>🗑</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 py-1 text-center">
          <p className="text-[11px] font-mono text-[var(--sth-text-2)]">
            No floor plan attached
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-mono font-medium border border-dashed hover:border-solid transition-colors cursor-pointer disabled:opacity-50"
            style={{
              borderColor: "var(--sth-accent)",
              backgroundColor: "var(--sth-clay-bg)",
              color: "var(--sth-accent)",
            }}
          >
            {isProcessing ? (
              <>
                <span className="h-3 w-3 border-2 border-[var(--sth-accent)]/30 border-t-[var(--sth-accent)] rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>＋</span>
                <span>Attach Floor Plan</span>
              </>
            )}
          </button>
          <span className="text-[9px] font-mono text-[var(--sth-text-2)] block opacity-75">
            Supported formats: PDF, PNG, JPG (max 10 MB)
          </span>
        </div>
      )}

      {/* Error Notice */}
      {actionError && (
        <div className="p-2 rounded border border-[#DDBCB4] bg-[var(--sth-clay-bg)] text-[10px] text-[var(--sth-clay)] font-mono flex items-start gap-1">
          <span>⚠</span>
          <span className="flex-1">{actionError}</span>
        </div>
      )}
    </div>
  );
}
