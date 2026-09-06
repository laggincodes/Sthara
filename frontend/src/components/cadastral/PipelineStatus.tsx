"use client";

import React, { useState } from "react";

export type PipelineStepStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETE"
  | "WARNING"
  | "ERROR"
  | "UNAVAILABLE";

export interface PipelineStep {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  provenance: string;
  status: PipelineStepStatus;
  detail?: string;
}

interface PipelineStatusProps {
  steps: PipelineStep[];
  isDemoRunning?: boolean;
  onRunDemo?: () => void;
  onResetDemo?: () => void;
}

export function PipelineStatus({
  steps,
  isDemoRunning = false,
  onRunDemo,
  onResetDemo,
}: PipelineStatusProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const completedCount = steps.filter((s) => s.status === "COMPLETE").length;
  const isAllComplete = completedCount === steps.length;

  const getStatusIcon = (status: PipelineStepStatus) => {
    switch (status) {
      case "COMPLETE":
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
            ✓
          </span>
        );
      case "PROCESSING":
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/50">
            <span className="h-2 w-2 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </span>
        );
      case "WARNING":
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
            !
          </span>
        );
      case "ERROR":
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
            ✕
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-[9px]">
            —
          </span>
        );
      default:
        return (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800/80 text-slate-500 border border-slate-700 text-[10px]">
            ○
          </span>
        );
    }
  };

  const getStatusBadge = (status: PipelineStepStatus) => {
    switch (status) {
      case "COMPLETE":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/30";
      case "PROCESSING":
        return "text-cyan-300 bg-cyan-950/50 border-cyan-400/40 animate-pulse";
      case "WARNING":
        return "text-amber-400 bg-amber-950/40 border-amber-500/30";
      case "ERROR":
        return "text-rose-400 bg-rose-950/40 border-rose-500/30";
      case "UNAVAILABLE":
        return "text-slate-400 bg-slate-900/60 border-slate-700/60";
      default:
        return "text-slate-500 bg-slate-900/40 border-slate-800";
    }
  };

  return (
    <div className="border-b border-slate-800 bg-[#0E131F]/95 backdrop-blur-sm transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
            title={isExpanded ? "Collapse Pipeline Status" : "Expand Pipeline Status"}
          >
            <span className="text-[10px] text-cyan-400">
              {isExpanded ? "▼" : "▶"}
            </span>
            <span>END-TO-END PIPELINE AUDIT</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400">
            [ <span className={isAllComplete ? "text-emerald-400 font-bold" : "text-cyan-300 font-semibold"}>{completedCount}</span> / {steps.length} Stages Verified ]
          </span>

          {/* Demo Data disclaimer pill */}
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            SYNTHETIC DEMO DATASET
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRunDemo && (
            <button
              type="button"
              onClick={onRunDemo}
              disabled={isDemoRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
            >
              {isDemoRunning ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-cyan-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                  <span>Run Demo</span>
                </>
              )}
            </button>
          )}

          {onResetDemo && (
            <button
              type="button"
              onClick={onResetDemo}
              disabled={isDemoRunning}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 disabled:opacity-50 transition-colors"
              title="Reset Demo State"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Step Tracker Grid */}
      {isExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 p-2 bg-[#090D17]">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col justify-between p-2 rounded border transition-all text-left ${
                step.status === "COMPLETE"
                  ? "border-emerald-500/20 bg-emerald-950/10"
                  : step.status === "PROCESSING"
                  ? "border-cyan-400/40 bg-cyan-950/20 ring-1 ring-cyan-500/30"
                  : step.status === "ERROR"
                  ? "border-rose-500/30 bg-rose-950/20"
                  : step.status === "WARNING"
                  ? "border-amber-500/30 bg-amber-950/10"
                  : "border-slate-800/60 bg-slate-900/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {step.stepNumber}
                  </span>
                  {getStatusIcon(step.status)}
                </div>
                <div className="text-[11px] font-semibold text-slate-200 truncate leading-tight" title={step.title}>
                  {step.title}
                </div>
                <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5" title={step.provenance}>
                  {step.provenance}
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                <span className={`text-[8px] font-mono px-1 py-0.5 rounded border uppercase font-bold tracking-tight ${getStatusBadge(step.status)}`}>
                  {step.status}
                </span>
                {step.detail && (
                  <span className="text-[8px] font-mono text-slate-400 truncate max-w-[55px] text-right" title={step.detail}>
                    {step.detail}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
