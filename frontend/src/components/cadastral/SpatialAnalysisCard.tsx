"use client";

import React, { useState, useMemo } from "react";
import { cadastreApi, ApiError } from "@/lib/api/client";
import {
  SpatialObjectType,
  ContainmentResponse,
  IntersectionResponse,
  ProximityResponse,
  VerticalRelationshipResponse,
  SpatialObjectRef,
} from "@/types/cadastre";

type AnalysisMode = "containment" | "intersection" | "proximity" | "vertical";

interface SpatialAnalysisCardProps {
  activeDatasetId: string;
  selectedBuildingId?: string | null;
  selectedFloorId?: string | null;
  selectedUnitId?: string | null;
  availableBuildings?: Array<{ id: string; name?: string }>;
  availableFloors?: Array<{ id: string; name: string; buildingId: string }>;
  availableUnits?: Array<{ id: string; name: string; floorId: string; buildingId: string }>;
}

export function SpatialAnalysisCard({
  activeDatasetId,
  selectedBuildingId,
  selectedFloorId,
  selectedUnitId,
  availableBuildings = [],
  availableFloors = [],
  availableUnits = [],
}: SpatialAnalysisCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<AnalysisMode>("containment");

  // Object A configuration
  const [typeA, setTypeA] = useState<SpatialObjectType>(() => (selectedFloorId ? "floor" : "building"));
  const [idA, setIdA] = useState<string>(() => selectedFloorId || selectedBuildingId || "");
  const [datasetA, setDatasetA] = useState<string>(() => activeDatasetId || "default");

  // Object B configuration
  const [typeB, setTypeB] = useState<SpatialObjectType>(() => (selectedUnitId ? "unit" : "floor"));
  const [idB, setIdB] = useState<string>(() => selectedUnitId || "");
  const [datasetB, setDatasetB] = useState<string>(() => activeDatasetId || "default");

  // Execution state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [containmentResult, setContainmentResult] = useState<ContainmentResponse | null>(null);
  const [intersectionResult, setIntersectionResult] = useState<IntersectionResponse | null>(null);
  const [proximityResult, setProximityResult] = useState<ProximityResponse | null>(null);
  const [verticalResult, setVerticalResult] = useState<VerticalRelationshipResponse | null>(null);

  // Options list for A and B
  const getOptionsForType = React.useCallback(
    (type: SpatialObjectType) => {
      if (type === "building") {
        return availableBuildings.map((b) => ({ id: b.id, label: `${b.name || b.id}` }));
      }
      if (type === "floor") {
        return availableFloors.map((f) => ({ id: f.id, label: `${f.name} (${f.buildingId})` }));
      }
      return availableUnits.map((u) => ({ id: u.id, label: `${u.name} (Fl: ${u.floorId})` }));
    },
    [availableBuildings, availableFloors, availableUnits]
  );

  const optionsA = useMemo(() => getOptionsForType(typeA), [typeA, getOptionsForType]);
  const optionsB = useMemo(() => getOptionsForType(typeB), [typeB, getOptionsForType]);

  // Reset analysis results
  const clearResults = () => {
    setContainmentResult(null);
    setIntersectionResult(null);
    setProximityResult(null);
    setVerticalResult(null);
    setErrorMsg(null);
  };

  // Run analysis handler
  const handleExecute = async () => {
    const targetIdA = idA.trim();
    const targetIdB = idB.trim();

    if (!targetIdA || !targetIdB) {
      setErrorMsg("Please select or enter identifiers for both Object A and Object B.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const objA: SpatialObjectRef = {
      id: targetIdA,
      type: typeA,
      dataset_id: datasetA || activeDatasetId,
    };
    const objB: SpatialObjectRef = {
      id: targetIdB,
      type: typeB,
      dataset_id: datasetB || activeDatasetId,
    };

    try {
      if (mode === "containment") {
        const res = await cadastreApi.analyzeContainment({ object_a: objA, object_b: objB });
        setContainmentResult(res);
      } else if (mode === "intersection") {
        const res = await cadastreApi.analyzeIntersection({ object_a: objA, object_b: objB });
        setIntersectionResult(res);
      } else if (mode === "proximity") {
        const res = await cadastreApi.analyzeProximity({ object_a: objA, object_b: objB });
        setProximityResult(res);
      } else if (mode === "vertical") {
        const res = await cadastreApi.analyzeVerticalRelationship({ object_a: objA, object_b: objB });
        setVerticalResult(res);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Spatial analysis request failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick preset helper
  const applyPreset = (preset: "unit_in_floor" | "unit_unit_intersect" | "building_proximity" | "floor_vertical") => {
    clearResults();
    if (preset === "unit_in_floor") {
      setMode("containment");
      setTypeA("floor");
      setIdA(selectedFloorId || (availableFloors[0]?.id ?? ""));
      setTypeB("unit");
      setIdB(selectedUnitId || (availableUnits[0]?.id ?? ""));
      setDatasetA(activeDatasetId);
      setDatasetB(activeDatasetId);
    } else if (preset === "unit_unit_intersect") {
      setMode("intersection");
      setTypeA("unit");
      setIdA(selectedUnitId || (availableUnits[0]?.id ?? ""));
      setTypeB("unit");
      setIdB(availableUnits[1]?.id || availableUnits[0]?.id || "");
      setDatasetA(activeDatasetId);
      setDatasetB(activeDatasetId);
    } else if (preset === "building_proximity") {
      setMode("proximity");
      setTypeA("building");
      setIdA(selectedBuildingId || (availableBuildings[0]?.id ?? ""));
      setTypeB("building");
      setIdB(availableBuildings[1]?.id || availableBuildings[0]?.id || "");
      setDatasetA(activeDatasetId);
      setDatasetB(activeDatasetId);
    } else if (preset === "floor_vertical") {
      setMode("vertical");
      setTypeA("floor");
      setIdA(selectedFloorId || (availableFloors[0]?.id ?? ""));
      setTypeB("floor");
      setIdB(availableFloors[1]?.id || availableFloors[0]?.id || "");
      setDatasetA(activeDatasetId);
      setDatasetB(activeDatasetId);
    }
  };

  return (
    <div
      className="rounded-lg text-xs overflow-hidden transition-all shadow-sm"
      style={{
        border: "1px solid var(--sth-border)",
        backgroundColor: "var(--sth-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        style={{
          borderBottom: isOpen ? "1px solid var(--sth-border)" : "none",
          backgroundColor: "var(--sth-card)",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📐</span>
          <div>
            <div className="font-bold text-[11px]" style={{ color: "var(--sth-text)" }}>
              3D Spatial Analysis
            </div>
            <div className="text-[9px] font-mono text-slate-500">
              Deterministic Containment · Overlap · Proximity · Vertical
            </div>
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
        >
          {isOpen ? "▲" : "▼"}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-4 gap-1 p-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {(
              [
                { key: "containment", label: "Contain" },
                { key: "intersection", label: "Intersect" },
                { key: "proximity", label: "Proximity" },
                { key: "vertical", label: "Vertical" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setMode(t.key);
                  clearResults();
                }}
                className={`py-1 text-[10px] font-mono font-medium rounded transition-all cursor-pointer ${
                  mode === t.key
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[9px] font-mono uppercase text-slate-400">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("unit_in_floor")}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 border border-transparent transition-colors cursor-pointer"
            >
              Floor ⊃ Unit
            </button>
            <button
              type="button"
              onClick={() => applyPreset("unit_unit_intersect")}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 border border-transparent transition-colors cursor-pointer"
            >
              Unit ∩ Unit
            </button>
            <button
              type="button"
              onClick={() => applyPreset("building_proximity")}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 border border-transparent transition-colors cursor-pointer"
            >
              Bld ↔ Bld Dist
            </button>
            <button
              type="button"
              onClick={() => applyPreset("floor_vertical")}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 border border-transparent transition-colors cursor-pointer"
            >
              Level Z Rel
            </button>
          </div>

          {/* Object A Selector */}
          <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-slate-500 uppercase">
                Object A {mode === "containment" ? "(Container)" : "(Subject)"}
              </span>
              <div className="flex gap-1">
                {(["building", "floor", "unit"] as SpatialObjectType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeA(t);
                      setIdA("");
                    }}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      typeA === t
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5">
              {optionsA.length > 0 ? (
                <select
                  value={idA}
                  onChange={(e) => setIdA(e.target.value)}
                  className="w-full text-[11px] font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                >
                  <option value="">-- Select {typeA} --</option>
                  {optionsA.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={`Enter ${typeA} identifier...`}
                  value={idA}
                  onChange={(e) => setIdA(e.target.value)}
                  className="w-full text-[11px] font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                />
              )}
            </div>
          </div>

          {/* Object B Selector */}
          <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold text-slate-500 uppercase">
                Object B {mode === "containment" ? "(Contained)" : "(Target)"}
              </span>
              <div className="flex gap-1">
                {(["building", "floor", "unit"] as SpatialObjectType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTypeB(t);
                      setIdB("");
                    }}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      typeB === t
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-700"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5">
              {optionsB.length > 0 ? (
                <select
                  value={idB}
                  onChange={(e) => setIdB(e.target.value)}
                  className="w-full text-[11px] font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                >
                  <option value="">-- Select {typeB} --</option>
                  {optionsB.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={`Enter ${typeB} identifier...`}
                  value={idB}
                  onChange={(e) => setIdB(e.target.value)}
                  className="w-full text-[11px] font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
                />
              )}
            </div>
          </div>

          {/* Dataset Isolation Check indicator */}
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
            <span>Isolation: Strict Dataset Scope</span>
            {datasetA !== datasetB ? (
              <span className="text-rose-500 font-semibold">Different Datasets (Will Reject)</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Same Dataset ({activeDatasetId})</span>
            )}
          </div>

          {/* Run Analysis Action Button */}
          <button
            type="button"
            disabled={loading || !idA || !idB}
            onClick={handleExecute}
            className="w-full py-2 px-3 rounded text-[11px] font-mono font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            style={{ backgroundColor: "var(--sth-accent)" }}
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Geometry...</span>
              </>
            ) : (
              <>
                <span>▶ Run {mode.toUpperCase()} Analysis</span>
              </>
            )}
          </button>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-mono space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>⚠ Analysis Rejected</span>
              </div>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Analysis Results */}
          {containmentResult && mode === "containment" && (
            <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono font-semibold text-[10px] text-slate-500">CONTAINMENT RESULT</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                    containmentResult.status === "PASS"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                  }`}
                >
                  {containmentResult.status}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Horizontal 2D Planar:</span>
                  <span className={containmentResult.horizontal_contained ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                    {containmentResult.horizontal_contained ? "✓ INSIDE" : "✗ OUTSIDE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vertical [Z_min, Z_max]:</span>
                  <span className={containmentResult.vertical_contained ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                    {containmentResult.vertical_contained ? "✓ ENCLOSED" : "✗ EXCEEDED"}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                {containmentResult.message}
              </div>
            </div>
          )}

          {intersectionResult && mode === "intersection" && (
            <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono font-semibold text-[10px] text-slate-500">INTERSECTION RESULT</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                    intersectionResult.intersects
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {intersectionResult.intersects ? "INTERSECTING" : "DISJOINT"}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Overlap Area:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {intersectionResult.intersection_area_sqm.toFixed(2)} m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party Wall Touch:</span>
                  <span className={intersectionResult.boundary_touch ? "text-blue-600 font-bold" : "text-slate-500"}>
                    {intersectionResult.boundary_touch ? "YES (Boundary Contact Only)" : "NO"}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                {intersectionResult.message}
              </div>
            </div>
          )}

          {proximityResult && mode === "proximity" && (
            <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono font-semibold text-[10px] text-slate-500">PROXIMITY METRICS</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  EUCLIDEAN
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">3D Distance:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {proximityResult.distance_m.toFixed(2)} meters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">2D Planar Distance:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {proximityResult.distance_2d_m.toFixed(2)} meters
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vertical Separation (ΔZ):</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {proximityResult.distance_z_m.toFixed(2)} meters
                  </span>
                </div>
              </div>
            </div>
          )}

          {verticalResult && mode === "vertical" && (
            <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-mono font-semibold text-[10px] text-slate-500">VERTICAL RELATIONSHIP</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                  {verticalResult.relationship}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Object A Elevation:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {verticalResult.object_a_z.min_z.toFixed(1)}m → {verticalResult.object_a_z.max_z.toFixed(1)}m (h: {verticalResult.object_a_z.height.toFixed(1)}m)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Object B Elevation:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {verticalResult.object_b_z.min_z.toFixed(1)}m → {verticalResult.object_b_z.max_z.toFixed(1)}m (h: {verticalResult.object_b_z.height.toFixed(1)}m)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vertical Separation Gap:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {verticalResult.vertical_separation_m.toFixed(2)} meters
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
