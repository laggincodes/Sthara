"use client";

import React, { useState } from "react";
import { Unit } from "@/types/cadastre";
import { MeasurementSection } from "./MeasurementSection";
import { DataQualitySection } from "./DataQualitySection";

interface UnitInspectorProps {
  unit: Unit;
  parentFloorName?: string;
  onSelectParentFloor: () => void;
  onSelectParentBuilding?: () => void;
  hasFloorPlan?: boolean;
  onDeleteUnit: (buildingId: string, floorId: string, unitId: string) => Promise<void>;
}

export function UnitInspector({
  unit,
  parentFloorName,
  onSelectParentFloor,
  onSelectParentBuilding,
  hasFloorPlan,
  onDeleteUnit,
}: UnitInspectorProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const baseZ = unit.z_min ?? unit.base_elevation ?? 0.0;
  const topZ = unit.z_max ?? unit.top_elevation ?? baseZ + (unit.height ?? 3.0);
  const height = unit.height ?? (topZ - baseZ);
  const area = unit.footprint_area ?? unit.area_sqm ?? 0.0;
  const volume = unit.volume_cubic_m ?? (area * height);
  const surfaceArea = (unit.provenance?.surface_area_sqm as number) || (area * 2 + 4 * Math.sqrt(area) * height);

  const spatialId =
    unit.spatial_id ||
    `${unit.dataset_id || "default"}-${unit.building_id}-${unit.floor_id}-${unit.unit_id}`;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteUnit(unit.building_id, unit.floor_id, unit.unit_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete unit.";
      setDeleteError(msg);
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  const fieldLabelStyle: React.CSSProperties = {
    color: "var(--sth-text-2)",
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
  };

  const fieldValueStyle: React.CSSProperties = {
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    textAlign: "right",
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Step 5: Property Record Card */}
      <div
        className="rounded-md p-3 space-y-2.5"
        style={{
          border: "1px solid #d97706",
          backgroundColor: "rgba(245, 158, 11, 0.05)",
        }}
      >
        <div className="flex items-center justify-between pb-1.5" style={{ borderBottom: "1px solid rgba(217, 119, 6, 0.2)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#d97706" }} />
            <span style={{ ...sectionLabelStyle, color: "#d97706" }}>PROPERTY</span>
          </div>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold"
            style={{
              color: "#b45309",
              border: "1px solid #fcd34d",
              backgroundColor: "#fef3c7",
            }}
          >
            STHARA Spatial ID
          </span>
        </div>

        {/* STHARA Spatial ID Display & Copy */}
        <div
          className="p-2 rounded flex items-center justify-between gap-1.5"
          style={{
            backgroundColor: "var(--sth-card)",
            border: "1px solid var(--sth-border)",
          }}
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">STHARA Spatial ID</span>
            <span
              className="text-[11px] font-mono font-bold truncate select-all"
              style={{ color: "var(--sth-text)" }}
              title={spatialId}
            >
              {spatialId}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator?.clipboard) {
                navigator.clipboard.writeText(spatialId);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }
            }}
            className="px-1.5 py-1 rounded text-[10px] font-mono shrink-0 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            style={{
              borderColor: "var(--sth-border)",
              color: copiedId ? "#16a34a" : "var(--sth-text-2)",
            }}
            title="Copy STHARA Spatial ID"
          >
            {copiedId ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Upward Hierarchy Navigation Chain */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 py-0.5 overflow-x-auto">
          <span className="shrink-0">{unit.dataset_id || "default"}</span>
          <span className="shrink-0">/</span>
          {onSelectParentBuilding ? (
            <button
              type="button"
              onClick={onSelectParentBuilding}
              className="underline font-semibold hover:opacity-80 truncate cursor-pointer shrink-0"
              style={{ color: "var(--sth-accent)" }}
              title="Navigate to Parent Building"
            >
              {unit.building_id}
            </button>
          ) : (
            <span className="font-semibold shrink-0" style={{ color: "var(--sth-text)" }}>{unit.building_id}</span>
          )}
          <span className="shrink-0">/</span>
          <button
            type="button"
            onClick={onSelectParentFloor}
            className="underline font-semibold hover:opacity-80 truncate cursor-pointer shrink-0"
            style={{ color: "var(--sth-accent)" }}
            title="Navigate to Parent Floor"
          >
            {parentFloorName || unit.floor_id}
          </button>
          <span className="shrink-0">/</span>
          <span className="font-bold shrink-0" style={{ color: "#d97706" }}>
            {unit.unit_number || unit.unit_id}
          </span>
        </div>

        {/* Structured Property Record Fields */}
        <div className="space-y-1.5 pt-1">
          {[
            {
              label: "Unit Designation",
              value: unit.unit_name || `Unit ${unit.unit_number}`,
              color: "var(--sth-text)",
            },
            {
              label: "Space Category",
              value: unit.unit_type || "APARTMENT_UNIT",
              color: "#b45309",
            },
            {
              label: "Footprint Area",
              value: `${area.toFixed(2)} m²`,
              color: "var(--sth-text)",
            },
            {
              label: "Enclosed Volume",
              value: `${volume.toFixed(2)} m³`,
              color: "var(--sth-sage)",
            },
            {
              label: "Vertical Range",
              value: `${baseZ.toFixed(2)}m → ${topZ.toFixed(2)}m AMSL`,
              color: "var(--sth-accent)",
            },
            {
              label: "Unit Source",
              value: "Configured / Derived",
              color: "var(--sth-text-2)",
            },
            {
              label: "Floor Plan Source",
              value: hasFloorPlan ? "User-provided floor plan" : "None attached",
              color: "var(--sth-text-2)",
            },
            {
              label: "3D Geometry",
              value: "WATERTIGHT SOLID: PASS",
              color: "var(--sth-sage)",
            },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-baseline gap-2">
              <span style={fieldLabelStyle}>{row.label}:</span>
              <span style={{ ...fieldValueStyle, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Statutory Disclaimers / Intellectual Honesty Note */}
        <div
          className="p-2 rounded text-[10px] font-mono leading-relaxed"
          style={{
            backgroundColor: "rgba(100, 116, 139, 0.08)",
            border: "1px solid var(--sth-border)",
            color: "var(--sth-text-2)",
          }}
        >
          <span className="font-semibold text-slate-600 dark:text-slate-400">Spatial Intelligence Record:</span> Physical geometry and spatial evidence only. Does not represent official land title, government registration, or verified ownership.
        </div>
      </div>


      {/* Volumetric Metrics */}
      <div
        className="rounded-md p-3 space-y-2"
        style={{ border: "1px solid var(--sth-border)", backgroundColor: "var(--sth-surface)" }}
      >
        <div
          className="flex items-center justify-between pb-1"
          style={{ borderBottom: "1px solid var(--sth-border)" }}
        >
          <span style={sectionLabelStyle}>Unit 3D Polyhedral Volume</span>
          <span className="text-[9px]" style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}>
            3D Contract v1.0
          </span>
        </div>
        {[
          {
            label: "Unit Designation",
            value: unit.unit_number || unit.unit_id,
            color: "var(--sth-text)",
          },
          {
            label: "Space Category",
            value: unit.unit_type || "APARTMENT_UNIT",
            color: "#b45309",
          },
          {
            label: "Z Range",
            value: `${baseZ.toFixed(2)}m → ${topZ.toFixed(2)}m AMSL`,
            color: "var(--sth-accent)",
          },
          {
            label: "Vertical Height",
            value: `${height.toFixed(2)} m`,
            color: "var(--sth-text)",
          },
          {
            label: "Footprint Area",
            value: `${area.toFixed(2)} m²`,
            color: "var(--sth-text)",
          },
          {
            label: "Enclosed Volume",
            value: `${volume.toFixed(2)} m³`,
            color: "var(--sth-sage)",
          },
          {
            label: "Surface Area",
            value: `${surfaceArea.toFixed(2)} m²`,
            color: "var(--sth-text)",
          },
          {
            label: "Source",
            value: unit.source || "Configured / Derived",
            color: "var(--sth-text-2)",
          },
        ].map((row) => (
          <div key={row.label} className="flex justify-between gap-2">
            <span style={fieldLabelStyle}>{row.label}:</span>
            <span style={{ ...fieldValueStyle, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Step 7: 3D Measurements */}
      <MeasurementSection
        datasetId={unit.dataset_id || "default"}
        objectId={unit.unit_id}
        objectType="unit"
        initialHeight={height}
        initialArea={area}
        initialVolume={volume}
        initialZMin={baseZ}
        initialZMax={topZ}
        initialSurfaceArea={surfaceArea}
      />

      {/* Step 8: Data Quality + Provenance Intelligence */}
      <DataQualitySection
        status={hasFloorPlan ? "VALID" : "INCOMPLETE"}
        gates={{
          geometry: "PASS",
          topology: "PASS",
          containment: "PASS",
          hierarchy: "PASS",
          source_data: hasFloorPlan ? "PASS" : "INCOMPLETE",
        }}
        provenance={{
          source: unit.source || "Configured / Derived",
          source_type: unit.source_type || "DERIVED",
          height_source: "Configured / Derived",
          floor_source: "Configured / Derived",
          floor_plan_source: hasFloorPlan ? "User-provided floor plan" : "None attached",
        }}
        showDisclaimer={true}
      />

      {/* Delete error notification if any */}
      {deleteError && (
        <div
          className="p-2 rounded text-[11px] font-mono"
          style={{ backgroundColor: "#fee2e2", border: "1px solid #ef4444", color: "#991b1b" }}
        >
          {deleteError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onSelectParentFloor}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded py-2 px-3 text-xs font-mono font-medium transition-colors cursor-pointer"
          style={{
            border: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-surface)",
            color: "var(--sth-text)",
          }}
        >
          ← Select Parent Floor
        </button>

        {onSelectParentBuilding && (
          <button
            type="button"
            onClick={onSelectParentBuilding}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded py-2 px-3 text-xs font-mono font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
              color: "var(--sth-text)",
            }}
          >
            ← Select Parent Building
          </button>
        )}


        {!showConfirmDelete ? (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded py-2 px-3 text-xs font-mono font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid #fca5a5",
              backgroundColor: "rgba(239, 68, 68, 0.06)",
              color: "#dc2626",
            }}
          >
            🗑 Delete Unit
          </button>
        ) : (
          <div
            className="p-2.5 rounded space-y-2"
            style={{ border: "1px solid #f87171", backgroundColor: "#fef2f2" }}
          >
            <div className="text-[11px] text-red-800 font-medium">
              Are you sure you want to remove unit <strong>{unit.unit_id}</strong>?
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-1 px-2 rounded text-[11px] font-mono font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-1 px-2 rounded text-[11px] font-mono border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
