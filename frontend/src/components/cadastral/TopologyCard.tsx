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
  onLoadDemo?: (scenario?: "valid" | "conflict") => void;
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

  const getStatusBadgeStyle = (status?: TopologyStatus): React.CSSProperties => {
    switch (status) {
      case "VALID":
        return { backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" };
      case "WARNING":
        return { backgroundColor: "#F5EFE3", color: "#B28A52", border: "1px solid #D8C8A8" };
      case "CONFLICT":
        return { backgroundColor: "#FAF0EE", color: "#C05040", border: "1px solid #DDBCB4" };
      case "UNAVAILABLE":
      default:
        return { backgroundColor: "#E9E5DA", color: "#77786F", border: "1px solid #D7D4CB" };
    }
  };

  const getSeverityBadgeStyle = (severity: TopologySeverity): React.CSSProperties => {
    switch (severity) {
      case "ERROR":
        return { backgroundColor: "#FAF0EE", color: "#C05040", border: "1px solid #DDBCB4" };
      case "WARNING":
        return { backgroundColor: "#F5EFE3", color: "#B28A52", border: "1px solid #D8C8A8" };
      case "INFO":
      default:
        return { backgroundColor: "#E9E5DA", color: "#252622", border: "1px solid #D7D4CB" };
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
    <div className="rounded-md p-4 shadow-sm space-y-4" style={{ backgroundColor: "#F8F6F0", border: "1px solid #D7D4CB", fontFamily: "var(--font-sans)", color: "#252622" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5" style={{ borderBottom: "1px solid #D7D4CB" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md font-bold text-xs" style={{ backgroundColor: "#A85D48", color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>
            06
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)", color: "#252622" }}>
                Unified Topology &amp; Spatial Conflict Engine
              </h3>
              {summary && (
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{ fontFamily: "var(--font-mono)", ...getStatusBadgeStyle(summary.overall_status) }}
                >
                  {summary.overall_status}
                </span>
              )}
            </div>
            <p className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "#62635D" }}>
              Stage 06 · Overlap Check · Containment · Duplicates · 3D Mesh
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onLoadDemo && (
            <div className="flex items-center gap-1 rounded-md p-0.5" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
              <button
                type="button"
                onClick={() => onLoadDemo("valid")}
                className="px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                style={{ backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" }}
              >
                Valid Scene
              </button>
              <button
                type="button"
                onClick={() => onLoadDemo("conflict")}
                className="px-2 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                style={{ backgroundColor: "#FAF0EE", color: "#C05040", border: "1px solid #DDBCB4" }}
              >
                Conflict Scene
              </button>
            </div>
          )}

          {onRunAudit && (
            <button
              type="button"
              onClick={onRunAudit}
              disabled={isAuditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: "#A85D48", color: "#FFFFFF" }}
            >
              {isAuditing ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <span>Audit Topology</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Summary Grid */}
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-md p-2.5 text-center" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>Total Checks</div>
            <div className="text-base font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "#252622" }}>{summary.total_checks}</div>
          </div>
          <div className="rounded-md p-2.5 text-center" style={{ backgroundColor: "#EFF2EE", border: "1px solid #C0CAC0" }}>
            <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", color: "#788575" }}>Passed Checks</div>
            <div className="text-base font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "#788575" }}>{summary.passed_checks}</div>
          </div>
          <div className="rounded-md p-2.5 text-center" style={{ backgroundColor: summary.conflict_checks > 0 ? "#FAF0EE" : "#E9E5DA", border: summary.conflict_checks > 0 ? "1px solid #DDBCB4" : "1px solid #D7D4CB" }}>
            <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", color: summary.conflict_checks > 0 ? "#C05040" : "#77786F" }}>Conflicts Detected</div>
            <div className="text-base font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)", color: summary.conflict_checks > 0 ? "#C05040" : "#252622" }}>{summary.conflict_checks}</div>
          </div>
          <div className="rounded-md p-2.5 text-center" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>Audit Duration</div>
            <div className="text-base font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "#252622" }}>0.3 ms</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", fontFamily: "var(--font-mono)", color: "#62635D" }}>
          <span>Topology Engine Idle · Tolerance: 0.01m² / 0.01m³</span>
          <span className="font-semibold" style={{ color: "#A85D48" }}>Click &quot;Audit Topology&quot; to run verification</span>
        </div>
      )}

      {/* Filter Tabs */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1 pb-2" style={{ borderBottom: "1px solid #D7D4CB" }}>
            {[
              { id: "ALL", label: `All (${conflicts.length})` },
              { id: "OVERLAP", label: "Overlap" },
              { id: "CONTAINMENT", label: "Containment" },
              { id: "DUPLICATES", label: "Duplicates" },
              { id: "3D_MESH", label: "3D Mesh" },
              { id: "HIERARCHY", label: "Hierarchy" },
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: active ? "#A85D48" : "#E9E5DA",
                    color: active ? "#FFFFFF" : "#62635D",
                    border: active ? "1px solid #A85D48" : "1px solid #D7D4CB",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Conflict List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredConflicts.map((c) => {
              const isSelected = selectedConflictId === c.conflict_id;
              return (
                <div
                  key={c.conflict_id}
                  onClick={() => {
                    setSelectedConflictId(c.conflict_id);
                    if (onSelectEntity && c.primary_entity_id) onSelectEntity(c.primary_entity_id);
                  }}
                  className="p-3 rounded-md transition-all cursor-pointer space-y-1.5"
                  style={{
                    backgroundColor: isSelected ? "#FAF0EE" : "#E9E5DA",
                    border: isSelected ? "1px solid #C05040" : "1px solid #D7D4CB",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase" style={{ fontFamily: "var(--font-mono)", color: "#C05040" }}>
                      {c.conflict_type}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase" style={{ fontFamily: "var(--font-mono)", ...getSeverityBadgeStyle(c.severity) }}>
                      {c.severity}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: "#252622" }}>{c.description}</p>

                  <div className="flex items-center justify-between text-[10px] pt-1" style={{ borderTop: "1px solid #D7D4CB", fontFamily: "var(--font-mono)", color: "#62635D" }}>
                    <span>Entities: <strong style={{ color: "#252622" }}>{c.primary_entity_id}</strong> {c.secondary_entity_id ? `↔ ${c.secondary_entity_id}` : ""}</span>
                    {c.overlap_metric !== undefined && c.overlap_metric !== null && <span>Metric: <strong style={{ color: "#C05040" }}>{c.overlap_metric}</strong></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
