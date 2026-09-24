"use client";

import React, { useState, useMemo } from "react";
import { cadastreApi, ApiError } from "@/lib/api/client";
import {
  SpatialObjectType,
  DimensionsResponse,
  DistanceResponse,
} from "@/types/cadastre";

interface MeasurementSectionProps {
  datasetId: string;
  objectId: string;
  objectType: SpatialObjectType;
  initialWidth?: number | null;
  initialDepth?: number | null;
  initialHeight?: number | null;
  initialArea?: number | null;
  initialVolume?: number | null;
  initialZMin?: number | null;
  initialZMax?: number | null;
  initialSurfaceArea?: number | null;
  availableTargetObjects?: Array<{ id: string; label: string; type: SpatialObjectType }>;
}

export function MeasurementSection({
  datasetId,
  objectId,
  objectType,
  initialWidth,
  initialDepth,
  initialHeight,
  initialArea,
  initialVolume,
  initialZMin,
  initialZMax,
  initialSurfaceArea,
  availableTargetObjects = [],
}: MeasurementSectionProps) {
  const [dimensions, setDimensions] = useState<DimensionsResponse | null>(null);
  const [targetObjectId, setTargetObjectId] = useState<string>("");
  const [distanceResult, setDistanceResult] = useState<DistanceResponse | null>(null);
  const [loadingDim, setLoadingDim] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [distError, setDistError] = useState<string | null>(null);

  // Resolved metrics: prefer live API measurement or fallback to existing entity attributes
  const width = dimensions?.width_m ?? (initialWidth != null ? initialWidth : null);
  const depth = dimensions?.depth_m ?? (initialDepth != null ? initialDepth : null);
  const height = dimensions?.height_m ?? (initialHeight != null ? initialHeight : null);
  const area = dimensions?.area_sqm ?? (initialArea != null ? initialArea : null);
  const volume = dimensions?.volume_cubic_m ?? (initialVolume != null ? initialVolume : null);
  const zMin = dimensions?.z_min ?? (initialZMin != null ? initialZMin : null);
  const zMax = dimensions?.z_max ?? (initialZMax != null ? initialZMax : null);
  const surfaceArea = dimensions?.surface_area_sqm ?? (initialSurfaceArea != null ? initialSurfaceArea : null);

  // Target object type
  const targetObj = useMemo(
    () => availableTargetObjects.find((o) => o.id === targetObjectId),
    [availableTargetObjects, targetObjectId]
  );

  // Refresh dimensions via API
  const handleMeasureDimensions = async () => {
    setLoadingDim(true);
    try {
      const res = await cadastreApi.getDimensions({
        dataset_id: datasetId,
        object_id: objectId,
        object_type: objectType,
        base_elevation: initialZMin ?? undefined,
        top_elevation: initialZMax ?? undefined,
        height: initialHeight ?? undefined,
      });
      setDimensions(res);
    } catch {
      // Keep initial attributes if API call fails
    } finally {
      setLoadingDim(false);
    }
  };

  // Measure distance to target object
  const handleMeasureDistance = async () => {
    if (!targetObjectId.trim()) return;
    setLoadingDist(true);
    setDistError(null);
    try {
      const res = await cadastreApi.getDistance({
        dataset_id: datasetId,
        object_a: objectId,
        object_b: targetObjectId,
        object_a_type: objectType,
        object_b_type: targetObj?.type || "unit",
      });
      setDistanceResult(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDistError(err.message);
      } else if (err instanceof Error) {
        setDistError(err.message);
      } else {
        setDistError("Distance measurement failed.");
      }
    } finally {
      setLoadingDist(false);
    }
  };

  return (
    <div
      className="rounded-md p-3 space-y-3 text-xs"
      style={{
        border: "1px solid var(--sth-border)",
        backgroundColor: "var(--sth-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between pb-1.5"
        style={{ borderBottom: "1px solid var(--sth-border)" }}
      >
        <span
          className="uppercase tracking-wider font-semibold text-[10px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--sth-accent)" }}
        >
          MEASUREMENTS
        </span>
        <button
          type="button"
          onClick={handleMeasureDimensions}
          disabled={loadingDim}
          className="text-[9px] font-mono text-slate-500 hover:text-slate-700 underline cursor-pointer disabled:opacity-50"
        >
          {loadingDim ? "Computing…" : "Recalculate"}
        </button>
      </div>

      {/* 1. Dimensions */}
      <div className="space-y-1">
        <div
          className="text-[9px] uppercase tracking-wide font-semibold text-slate-500"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Dimensions
        </div>
        <div className="space-y-0.5 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Width:</span>
            <span style={{ color: "var(--sth-text)" }}>
              {width != null ? `${width.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Depth:</span>
            <span style={{ color: "var(--sth-text)" }}>
              {depth != null ? `${depth.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Height:</span>
            <span style={{ color: "var(--sth-text)" }}>
              {height != null ? `${height.toFixed(2)} m` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Spatial */}
      <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
        <div
          className="text-[9px] uppercase tracking-wide font-semibold text-slate-500"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Spatial
        </div>
        <div className="space-y-0.5 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Area:</span>
            <span style={{ color: "var(--sth-text)" }}>
              {area != null ? `${area.toFixed(2)} m²` : "—"}
            </span>
          </div>
          {surfaceArea != null && (
            <div className="flex justify-between">
              <span className="text-slate-500">Surface Area:</span>
              <span style={{ color: "var(--sth-text)" }}>
                {`${surfaceArea.toFixed(2)} m²`}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Volume:</span>
            <span style={{ color: "var(--sth-sage)" }}>
              {volume != null ? `${volume.toFixed(2)} m³` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Elevation */}
      <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
        <div
          className="text-[9px] uppercase tracking-wide font-semibold text-slate-500"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Elevation
        </div>
        <div className="space-y-0.5 font-mono text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Z Min:</span>
            <span style={{ color: "var(--sth-text)" }}>
              {zMin != null ? `${zMin.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Z Max:</span>
            <span style={{ color: "var(--sth-accent)" }}>
              {zMax != null ? `${zMax.toFixed(2)} m` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Distance Tool */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
        <div
          className="text-[9px] uppercase tracking-wide font-semibold text-slate-500"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Distance Measurement
        </div>
        <div className="space-y-1 font-mono text-[10px]">
          <div className="flex justify-between items-center text-slate-500">
            <span>Object A:</span>
            <span className="font-semibold truncate max-w-[150px]" style={{ color: "var(--sth-text)" }}>
              {objectId}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 shrink-0">Object B:</span>
            {availableTargetObjects.length > 0 ? (
              <select
                value={targetObjectId}
                onChange={(e) => {
                  setTargetObjectId(e.target.value);
                  setDistanceResult(null);
                  setDistError(null);
                }}
                className="w-full text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none truncate"
              >
                <option value="">-- Select Target --</option>
                {availableTargetObjects
                  .filter((o) => o.id !== objectId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Target ID..."
                value={targetObjectId}
                onChange={(e) => {
                  setTargetObjectId(e.target.value);
                  setDistanceResult(null);
                  setDistError(null);
                }}
                className="w-full text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
              />
            )}
          </div>
          <button
            type="button"
            disabled={loadingDist || !targetObjectId}
            onClick={handleMeasureDistance}
            className="w-full mt-1 py-1 px-2 rounded text-[10px] font-mono font-medium text-white transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "var(--sth-accent)" }}
          >
            {loadingDist ? "Measuring…" : "Measure Distance"}
          </button>
        </div>

        {distError && (
          <div className="text-[9px] font-mono text-rose-500 p-1 rounded bg-rose-50 dark:bg-rose-950/30">
            {distError}
          </div>
        )}

        {distanceResult && (
          <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Horizontal Dist:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {distanceResult.horizontal_distance_m.toFixed(2)} m
              </span>
            </div>
            {distanceResult.vertical_distance_m > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Vertical Gap (ΔZ):</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {distanceResult.vertical_distance_m.toFixed(2)} m
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">3D Euclidean:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {distanceResult.distance_3d_m.toFixed(2)} m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
