"use client";

import React from "react";
import { DataQualityStatus, ValidationGates, ProvenanceInfo } from "@/types/cadastre";

interface DataQualitySectionProps {
  status?: DataQualityStatus;
  gates?: Partial<ValidationGates>;
  provenance?: Partial<ProvenanceInfo>;
  showDisclaimer?: boolean;
}

export function DataQualitySection({
  status = "VALID",
  gates = {
    geometry: "PASS",
    topology: "PASS",
    containment: "PASS",
    hierarchy: "PASS",
    source_data: "PASS",
  },
  provenance = {
    source: "OpenStreetMap",
    height_source: "Source-derived",
    floor_source: "Source-derived",
  },
  showDisclaimer = true,
}: DataQualitySectionProps) {
  const getStatusColor = (s: DataQualityStatus) => {
    switch (s) {
      case "VALID":
        return {
          bg: "var(--sth-sage-bg)",
          border: "#C0CAC0",
          text: "var(--sth-sage)",
        };
      case "WARNING":
        return {
          bg: "var(--sth-geo-bg)",
          border: "#D8C8A8",
          text: "var(--sth-geo)",
        };
      case "INCOMPLETE":
        return {
          bg: "rgba(59, 130, 246, 0.08)",
          border: "#93c5fd",
          text: "#2563eb",
        };
      case "INVALID":
        return {
          bg: "rgba(239, 68, 68, 0.08)",
          border: "#fca5a5",
          text: "#dc2626",
        };
    }
  };

  const statusStyle = getStatusColor(status);

  return (
    <div
      className="rounded-md p-3 space-y-2.5 text-xs"
      style={{
        border: `1px solid ${statusStyle.border}`,
        backgroundColor: statusStyle.bg,
      }}
    >
      {/* Header with deterministic status */}
      <div
        className="flex items-center justify-between pb-1.5"
        style={{ borderBottom: `1px solid ${statusStyle.border}` }}
      >
        <span
          className="uppercase tracking-wider font-semibold text-[10px]"
          style={{ fontFamily: "var(--font-mono)", color: statusStyle.text }}
        >
          DATA QUALITY
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold"
          style={{
            backgroundColor: "var(--sth-card)",
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
          }}
        >
          {status}
        </span>
      </div>

      {/* Validation Gates Summary */}
      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
        {[
          { label: "Geometry", val: gates.geometry || "PASS" },
          { label: "Topology", val: gates.topology || "PASS" },
          { label: "Containment", val: gates.containment || "PASS" },
          { label: "Hierarchy", val: gates.hierarchy || "PASS" },
          { label: "Source Data", val: gates.source_data || "PASS" },
        ].map((gate) => (
          <div key={gate.label} className="flex items-center justify-between pr-1">
            <span className="text-slate-500">{gate.label}:</span>
            <span
              className={`font-semibold ${
                gate.val === "PASS"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : gate.val === "WARNING"
                  ? "text-amber-700 dark:text-amber-400"
                  : gate.val === "INCOMPLETE"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {gate.val}
            </span>
          </div>
        ))}
      </div>

      {/* Small Textual Source Badges */}
      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap gap-1">
        {provenance.source && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
            SOURCE: {provenance.source}
          </span>
        )}
        {provenance.height_source && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
            HEIGHT: {provenance.height_source}
          </span>
        )}
        {provenance.floor_source && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
            FLOORS: {provenance.floor_source}
          </span>
        )}
        {provenance.floor_plan_source && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
            FLOOR PLAN: {provenance.floor_plan_source}
          </span>
        )}
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          GEOMETRY: Validated
        </span>
      </div>

      {/* Compact Disclaimers */}
      {showDisclaimer && (
        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 text-[9px] text-slate-500 leading-tight">
          <p>
            STHARA Spatial ID is a prototype spatial identifier and is not an official government property or ownership identifier.
          </p>
          <p>
            Geometry and source information represent spatial evidence/configuration and do not establish legal ownership or title.
          </p>
        </div>
      )}
    </div>
  );
}
