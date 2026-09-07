"use client";

import React, { useState } from "react";
import {
  TopologyValidationResponse,
  TopologyStatus,
  TopologySeverity,
} from "@/types/cadastre";

interface TopologyCardProps {
  topologyData?: TopologyValidationResponse | null;
  isAuditing?: boolean;
  onRunAudit?: () => void;
  onLoadDemo?: () => void;
  onSelectEntity?: (entityId: string) => void;
}

export function TopologyCard({
  topologyData,
  isAuditing = false,
  onRunAudit,
  onLoadDemo,
  onSelectEntity,
}: TopologyCardProps) {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  const summary = topologyData?.summary;
  const conflicts = topologyData?.conflicts || [];

  const getStatusBadge = (status?: TopologyStatus) => {
    switch (status) {
      case "VALID":
        return "bg-emerald-950/60 text-emerald-400 border-emerald-500/40";
      case "WARNING":
        return "bg-amber-950/60 text-amber-400 border-amber-500/40";
      case "CONFLICT":
        return "bg-rose-950/60 text-rose-400 border-rose-500/40";
      case "UNAVAILABLE":
      default:
        return "bg-slate-900/60 text-slate-400 border-slate-700/60";
    }
  };

  const getSeverityBadge = (severity: TopologySeverity) => {
    switch (severity) {
      case "ERROR":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "WARNING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "INFO":
      default:
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    }
  };

  const filteredConflicts = conflicts.filter((c) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "OVERLAP") {
      return (
        c.conflict_type.includes("OVERLAP") ||
        c.conflict_type === "POSITIVE_AREA_OVERLAP" ||
        c.conflict_type === "POSITIVE_VOLUME_OVERLAP"
      );
    }
    if (activeFilter === "CONTAINMENT") {
      return (
        c.conflict_type.includes("CONTAINMENT") ||
        c.conflict_type === "OUTSIDE_PARENT" ||
        c.conflict_type === "VERTICAL_OUTSIDE_PARENT"
      );
    }
    if (activeFilter === "DUPLICATES") {
      return c.conflict_type.includes("DUPLICATE") || c.conflict_type.includes("SAME_ID");
    }
    if (activeFilter === "3D_MESH") {
      return c.conflict_type === "INVALID_MESH";
    }
    if (activeFilter === "HIERARCHY") {
      return c.conflict_type === "MISSING_REFERENCE";
    }
    return true;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
            06
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Unified Topology & Spatial Conflict Engine
              </h3>
              {summary && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${getStatusBadge(
                    summary.overall_status
                  )}`}
                >
                  {summary.overall_status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              SIH PPT Stage 06 · Overlap Check · Containment · Duplicates · 3D Mesh
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onLoadDemo && (
            <button
              onClick={onLoadDemo}
              disabled={isAuditing}
              className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition disabled:opacity-50"
            >
              Load Demo Scene
            </button>
          )}
          {onRunAudit && (
            <button
              onClick={onRunAudit}
              disabled={isAuditing}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              {isAuditing ? (
                <>
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <span>Audit Topology</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics Bar */}
      {summary ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Checks</div>
              <div className="text-base font-bold text-slate-200 font-mono">{summary.total_checks}</div>
            </div>
            <div className="rounded-lg border border-emerald-950/60 bg-emerald-950/20 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-emerald-400">Passed</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{summary.passed_checks}</div>
            </div>
            <div className="rounded-lg border border-rose-950/60 bg-rose-950/20 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-rose-400">Conflicts</div>
              <div className="text-base font-bold text-rose-400 font-mono">{summary.conflict_checks}</div>
            </div>
            <div className="rounded-lg border border-amber-950/60 bg-amber-950/20 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-amber-400">Overlaps</div>
              <div className="text-base font-bold text-amber-400 font-mono">{summary.overlaps_found}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Containment</div>
              <div className="text-base font-bold text-slate-200 font-mono">{summary.containment_violations}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-center">
              <div className="text-[10px] uppercase font-mono text-slate-400">Duplicates</div>
              <div className="text-base font-bold text-slate-200 font-mono">{summary.duplicates_found}</div>
            </div>
          </div>

          {/* Tolerances Banner */}
          <div className="flex flex-wrap items-center justify-between rounded-lg bg-slate-950/50 border border-slate-800 px-3 py-2 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-300 font-medium">Engineering Tolerances:</span>
            <span>Area: {summary.tolerances.area_tolerance_sqm} m²</span>
            <span>Coord: {(summary.tolerances.geometry_equality_tolerance_m || 0.001) * 1000} mm</span>
            <span>Elev: {(summary.tolerances.vertical_elevation_tolerance_m || 0.001) * 1000} mm</span>
            <span>Subsurface Buffer: {summary.tolerances.underground_clearance_threshold_m} m</span>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2">
            {[
              { id: "ALL", label: `All (${conflicts.length})` },
              { id: "OVERLAP", label: `Overlaps (${summary.overlaps_found})` },
              { id: "CONTAINMENT", label: `Containment (${summary.containment_violations})` },
              { id: "DUPLICATES", label: `Duplicates (${summary.duplicates_found})` },
              { id: "3D_MESH", label: `3D Mesh (${summary.mesh_issues_found})` },
              { id: "HIERARCHY", label: `Hierarchy (${summary.hierarchy_issues_found})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-mono transition whitespace-nowrap ${
                  activeFilter === tab.id
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conflicts List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <span className="text-emerald-400 text-lg mb-1">✓</span>
                <span className="text-xs font-mono">
                  No topological conflicts in this category. All spatial rules satisfied within engineering tolerance.
                </span>
              </div>
            ) : (
              filteredConflicts.map((c) => {
                const isSelected = selectedConflictId === c.conflict_id;
                return (
                  <div
                    key={c.conflict_id}
                    onClick={() => setSelectedConflictId(isSelected ? null : c.conflict_id)}
                    className={`rounded-lg border p-3 cursor-pointer transition ${
                      isSelected
                        ? "border-rose-500/60 bg-rose-950/20"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase ${getSeverityBadge(
                            c.severity
                          )}`}
                        >
                          {c.severity}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {c.conflict_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({c.primary_entity_type}: {c.primary_entity_id}
                          {c.secondary_entity_id ? ` ↔ ${c.secondary_entity_type}: ${c.secondary_entity_id}` : ""})
                        </span>
                      </div>
                      {c.overlap_metric !== null && c.overlap_metric !== undefined && (
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-rose-300 font-semibold">
                          Δ {c.overlap_metric}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{c.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-2 text-[11px]">
                      <div className="text-slate-400 italic">
                        <span className="text-slate-500 not-italic font-mono">Action: </span>
                        {c.recommendation}
                      </div>
                      {onSelectEntity && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntity(c.primary_entity_id);
                          }}
                          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 hover:text-white transition"
                        >
                          Highlight {c.primary_entity_id}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <p className="text-xs font-mono mb-2">
            No topological audit loaded. Click &quot;Audit Topology&quot; to evaluate active boundaries or &quot;Load Demo Scene&quot; to explore benchmark spatial conflicts.
          </p>
        </div>
      )}
    </div>
  );
}
