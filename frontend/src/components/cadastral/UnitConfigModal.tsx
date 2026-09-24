"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { Unit, UnitType, UnitCreateRequest } from "@/types/cadastre";

interface UnitConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  buildingId: string;
  floorId: string;
  floorName: string;
  baseElevation: number;
  topElevation: number;
  parentFloorGeometry?: GeoJSON.Geometry | null;
  existingUnits: Unit[];
  floorPlanUrl?: string | null;
  onCreateUnit: (payload: UnitCreateRequest) => Promise<Unit>;
}

// ---------------------------------------------------------------------------
// Sutherland-Hodgman Polygon Clipping for Presets
// ---------------------------------------------------------------------------
type Point2D = [number, number];

function clipPolygonAxis(
  poly: Point2D[],
  axis: 0 | 1,
  limit: number,
  isGreater: boolean
): Point2D[] {
  if (poly.length === 0) return [];
  const output: Point2D[] = [];

  const isInside = (pt: Point2D) =>
    isGreater ? pt[axis] >= limit : pt[axis] <= limit;

  const intersect = (p1: Point2D, p2: Point2D): Point2D => {
    const t = (limit - p1[axis]) / (p2[axis] - p1[axis]);
    const otherAxis = axis === 0 ? 1 : 0;
    const otherVal = p1[otherAxis] + t * (p2[otherAxis] - p1[otherAxis]);
    return axis === 0 ? [limit, otherVal] : [otherVal, limit];
  };

  let prev = poly[poly.length - 1];
  let prevInside = isInside(prev);

  for (const curr of poly) {
    const currInside = isInside(curr);
    if (currInside) {
      if (!prevInside) {
        output.push(intersect(prev, curr));
      }
      output.push(curr);
    } else if (prevInside) {
      output.push(intersect(prev, curr));
    }
    prev = curr;
    prevInside = currInside;
  }

  return output;
}

function clipPolygonToBBox(
  poly: Point2D[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Point2D[] {
  let result = clipPolygonAxis(poly, 0, minX, true);
  result = clipPolygonAxis(result, 0, maxX, false);
  result = clipPolygonAxis(result, 1, minY, true);
  result = clipPolygonAxis(result, 1, maxY, false);
  return result;
}

// Compute 2D polygon area using Shoelace formula
function computePolygonArea(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2.0;
}

// Convert GeoJSON geometry to list of 2D coordinates [x, y]
function extractExteriorRing(geom?: GeoJSON.Geometry | null): Point2D[] {
  if (!geom) return [];
  try {
    if (geom.type === "Polygon") {
      const coords = (geom as GeoJSON.Polygon).coordinates[0];
      return coords.map((c) => [c[0], c[1]] as Point2D);
    } else if (geom.type === "MultiPolygon") {
      const coords = (geom as GeoJSON.MultiPolygon).coordinates[0][0];
      return coords.map((c) => [c[0], c[1]] as Point2D);
    }
  } catch {
    return [];
  }
  return [];
}

export function UnitConfigModal({
  isOpen,
  onClose,
  datasetId,
  buildingId,
  floorId,
  floorName,
  baseElevation,
  topElevation,
  parentFloorGeometry,
  existingUnits,
  floorPlanUrl,
  onCreateUnit,
}: UnitConfigModalProps) {
  // Extract parent floor polygon points in Geographic/Projected coords
  const floorPoints = useMemo(() => {
    return extractExteriorRing(parentFloorGeometry);
  }, [parentFloorGeometry]);

  // Compute bounding box of floor polygon
  const floorBBox = useMemo(() => {
    if (floorPoints.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of floorPoints) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const width = maxX - minX || 0.0001;
    const height = maxY - minY || 0.0001;
    return { minX, minY, maxX, maxY, width, height };
  }, [floorPoints]);

  const nextIdx = existingUnits.length + 1;
  const defaultNum = `${nextIdx < 10 ? "0" : ""}${nextIdx}`;
  const [unitNumber, setUnitNumber] = useState(defaultNum);
  const [unitId, setUnitId] = useState(`${floorId}-U${defaultNum}`);
  const [unitName, setUnitName] = useState(`Unit ${defaultNum}`);
  const [unitType, setUnitType] = useState<UnitType>("APARTMENT_UNIT");

  const initialPoints = useMemo(() => {
    if (floorPoints.length < 3) return [];
    const { minX, minY, maxX, maxY } = floorBBox;
    const midX = (minX + maxX) / 2;
    const ring =
      floorPoints[0][0] === floorPoints[floorPoints.length - 1][0] &&
      floorPoints[0][1] === floorPoints[floorPoints.length - 1][1]
        ? floorPoints.slice(0, -1)
        : floorPoints;
    if (existingUnits.length === 0) {
      return [...ring];
    } else if (existingUnits.length === 1) {
      return clipPolygonToBBox(ring, midX, minY, maxX, maxY);
    }
    return [];
  }, [floorPoints, floorBBox, existingUnits.length]);

  const [drawnPoints, setDrawnPoints] = useState<Point2D[]>(initialPoints);
  const [isPolygonClosed, setIsPolygonClosed] = useState<boolean>(initialPoints.length >= 3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SVG drawing area dimensions
  const svgWidth = 460;
  const svgHeight = 280;
  const svgPadding = 25;
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Coordinate transforms: Geo/Native -> SVG Screen Space
  const geoToSvg = useMemo(() => {
    const availW = svgWidth - 2 * svgPadding;
    const availH = svgHeight - 2 * svgPadding;
    const scale = Math.min(availW / floorBBox.width, availH / floorBBox.height);
    const offsetX = svgPadding + (availW - floorBBox.width * scale) / 2;
    const offsetY = svgPadding + (availH - floorBBox.height * scale) / 2;

    return (pt: Point2D): [number, number] => {
      const sx = offsetX + (pt[0] - floorBBox.minX) * scale;
      // Invert Y because SVG Y goes downward while GIS latitude/Y goes upward
      const sy = offsetY + (floorBBox.maxY - pt[1]) * scale;
      return [sx, sy];
    };
  }, [floorBBox, svgWidth, svgHeight, svgPadding]);

  // Inverse transform: SVG Screen Space -> Geo/Native
  const svgToGeo = useMemo(() => {
    const availW = svgWidth - 2 * svgPadding;
    const availH = svgHeight - 2 * svgPadding;
    const scale = Math.min(availW / floorBBox.width, availH / floorBBox.height);
    const offsetX = svgPadding + (availW - floorBBox.width * scale) / 2;
    const offsetY = svgPadding + (availH - floorBBox.height * scale) / 2;

    return (sx: number, sy: number): Point2D => {
      const gx = floorBBox.minX + (sx - offsetX) / scale;
      const gy = floorBBox.maxY - (sy - offsetY) / scale;
      return [gx, gy];
    };
  }, [floorBBox, svgWidth, svgHeight, svgPadding]);

  // Keep Unit ID synchronized when user edits unitNumber
  const handleUnitNumberChange = (val: string) => {
    setUnitNumber(val);
    const cleanNum = val.trim();
    if (cleanNum) {
      setUnitId(`${floorId}-U${cleanNum}`);
      if (!unitName || unitName.startsWith("Unit ")) {
        setUnitName(`Unit ${cleanNum}`);
      }
    }
  };

  // Presets applicator
  const applyPreset = useCallback((preset: "full" | "left" | "right" | "top" | "bottom" | "q1" | "q2" | "q3" | "q4") => {
    if (floorPoints.length < 3) return;
    const { minX, minY, maxX, maxY } = floorBBox;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Remove duplicate closing point if present for clipping
    const ring =
      floorPoints[0][0] === floorPoints[floorPoints.length - 1][0] &&
      floorPoints[0][1] === floorPoints[floorPoints.length - 1][1]
        ? floorPoints.slice(0, -1)
        : floorPoints;

    let clipped: Point2D[] = [];
    if (preset === "full") {
      clipped = [...ring];
    } else if (preset === "left") {
      clipped = clipPolygonToBBox(ring, minX, minY, midX, maxY);
    } else if (preset === "right") {
      clipped = clipPolygonToBBox(ring, midX, minY, maxX, maxY);
    } else if (preset === "top") {
      clipped = clipPolygonToBBox(ring, minX, midY, maxX, maxY);
    } else if (preset === "bottom") {
      clipped = clipPolygonToBBox(ring, minX, minY, maxX, midY);
    } else if (preset === "q1") {
      // NE
      clipped = clipPolygonToBBox(ring, midX, midY, maxX, maxY);
    } else if (preset === "q2") {
      // NW
      clipped = clipPolygonToBBox(ring, minX, midY, midX, maxY);
    } else if (preset === "q3") {
      // SW
      clipped = clipPolygonToBBox(ring, minX, minY, midX, midY);
    } else if (preset === "q4") {
      // SE
      clipped = clipPolygonToBBox(ring, midX, minY, maxX, midY);
    }

    if (clipped.length >= 3) {
      setDrawnPoints(clipped);
      setIsPolygonClosed(true);
    }
  }, [floorPoints, floorBBox]);

  // Click on SVG canvas to draw custom vertices
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPolygonClosed) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const pt = svgToGeo(sx, sy);

    // If near the first point and >= 3 points, close it
    if (drawnPoints.length >= 3) {
      const firstSvg = geoToSvg(drawnPoints[0]);
      const dist = Math.hypot(firstSvg[0] - sx, firstSvg[1] - sy);
      if (dist < 14) {
        setIsPolygonClosed(true);
        return;
      }
    }

    setDrawnPoints((prev) => [...prev, pt]);
  };

  const handleClearDrawing = () => {
    setDrawnPoints([]);
    setIsPolygonClosed(false);
  };

  const handleClosePolygon = () => {
    if (drawnPoints.length >= 3) {
      setIsPolygonClosed(true);
    }
  };

  // Validation Metrics
  const polygonArea = useMemo(() => {
    return computePolygonArea(drawnPoints);
  }, [drawnPoints]);

  const validationGate = useMemo(() => {
    const hasEnoughPoints = drawnPoints.length >= 3;
    const isClosed = isPolygonClosed && hasEnoughPoints;
    const hasArea = polygonArea > 0;
    const idValid = unitId.trim().length > 0;
    const numValid = unitNumber.trim().length > 0;
    const isDuplicateId = existingUnits.some((u) => u.unit_id === unitId.trim());
    const isDuplicateNum = existingUnits.some((u) => u.unit_number === unitNumber.trim());

    return {
      pointsCount: drawnPoints.length,
      isClosed,
      hasArea,
      idValid,
      numValid,
      isDuplicateId,
      isDuplicateNum,
      canSubmit: isClosed && hasArea && idValid && numValid && !isDuplicateId && !isDuplicateNum,
    };
  }, [drawnPoints, isPolygonClosed, polygonArea, unitId, unitNumber, existingUnits]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationGate.canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Ensure polygon ring is closed in coordinates
      const ring = [...drawnPoints];
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        ring.push([ring[0][0], ring[0][1]]);
      }

      const payload: UnitCreateRequest = {
        unit_id: unitId.trim(),
        dataset_id: datasetId,
        building_id: buildingId,
        floor_id: floorId,
        unit_number: unitNumber.trim(),
        unit_name: unitName.trim() || `Unit ${unitNumber.trim()}`,
        unit_type: unitType,
        geometry_2d: {
          type: "Polygon",
          coordinates: [ring.map((p) => [p[0], p[1]])],
        },
        base_elevation: baseElevation,
        top_elevation: topElevation,
        parent_floor_geometry: parentFloorGeometry as { type: string; coordinates: unknown },
        source: "Configured / Derived",
      };

      await onCreateUnit(payload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create unit volume.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          border: "1px solid var(--sth-border)",
          backgroundColor: "var(--sth-card)",
          color: "var(--sth-text)",
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            borderBottom: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-surface)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#d97706" }}
            />
            <div>
              <h2
                className="text-sm font-bold tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Configure 3D Unit Volume
              </h2>
              <div
                className="text-[10px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
              >
                Floor: <strong style={{ color: "var(--sth-text)" }}>{floorName}</strong> ({floorId})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg leading-none cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metadata & Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">
                Unit Number *
              </label>
              <input
                type="text"
                required
                value={unitNumber}
                onChange={(e) => handleUnitNumberChange(e.target.value)}
                placeholder="e.g. 101, G01"
                className="w-full px-2.5 py-1.5 rounded text-xs font-mono border focus:outline-none"
                style={{
                  border: validationGate.isDuplicateNum ? "1px solid #ef4444" : "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-surface)",
                  color: "var(--sth-text)",
                }}
              />
              {validationGate.isDuplicateNum && (
                <span className="text-[9px] text-red-500 font-mono">Already used on floor</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">
                Unit ID *
              </label>
              <input
                type="text"
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="e.g. U101"
                className="w-full px-2.5 py-1.5 rounded text-xs font-mono border focus:outline-none"
                style={{
                  border: validationGate.isDuplicateId ? "1px solid #ef4444" : "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-surface)",
                  color: "var(--sth-text)",
                }}
              />
              {validationGate.isDuplicateId && (
                <span className="text-[9px] text-red-500 font-mono">ID already exists</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">
                Unit Name
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="e.g. Apt 101"
                className="w-full px-2.5 py-1.5 rounded text-xs font-mono border focus:outline-none"
                style={{
                  border: "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-surface)",
                  color: "var(--sth-text)",
                }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1">
                Unit Type
              </label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                className="w-full px-2 py-1.5 rounded text-xs font-mono border focus:outline-none cursor-pointer"
                style={{
                  border: "1px solid var(--sth-border)",
                  backgroundColor: "var(--sth-surface)",
                  color: "var(--sth-text)",
                }}
              >
                <option value="APARTMENT_UNIT">Apartment Unit</option>
                <option value="RESIDENTIAL_UNIT">Residential Unit</option>
                <option value="OFFICE">Office</option>
                <option value="SHOP">Shop / Retail</option>
                <option value="OTHER">Other Space</option>
              </select>
            </div>
          </div>

          {/* Inherited Vertical Interval Banner */}
          <div
            className="p-2.5 rounded-md flex items-center justify-between text-[11px]"
            style={{
              border: "1px solid #d8c8a8",
              backgroundColor: "var(--sth-geo-bg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[9px] block">
                Inherited Vertical Interval [Z_base, Z_top]
              </span>
              <span className="font-bold" style={{ color: "var(--sth-accent)" }}>
                {baseElevation.toFixed(2)}m → {topElevation.toFixed(2)}m AMSL
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold uppercase text-[9px] block">
                Floor Height
              </span>
              <span className="font-bold" style={{ color: "var(--sth-text)" }}>
                {(topElevation - baseElevation).toFixed(2)} m
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold uppercase text-[9px] block">
                Source Attribution
              </span>
              <span className="font-semibold text-slate-700">Configured / Derived</span>
            </div>
          </div>

          {/* 2D Footprint Definition: Presets Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                Horizontal Footprint Partition Presets
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearDrawing}
                  className="text-[10px] font-mono text-red-500 hover:text-red-700 cursor-pointer underline"
                >
                  Clear Drawing
                </button>
                {!isPolygonClosed && drawnPoints.length >= 3 && (
                  <button
                    type="button"
                    onClick={handleClosePolygon}
                    className="text-[10px] font-mono font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer underline"
                  >
                    Close Polygon ✓
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Full Floor", preset: "full" as const },
                { label: "Left Half", preset: "left" as const },
                { label: "Right Half", preset: "right" as const },
                { label: "Top Half", preset: "top" as const },
                { label: "Bottom Half", preset: "bottom" as const },
                { label: "Q1 (NE)", preset: "q1" as const },
                { label: "Q2 (NW)", preset: "q2" as const },
                { label: "Q3 (SW)", preset: "q3" as const },
                { label: "Q4 (SE)", preset: "q4" as const },
              ].map(({ label, preset }) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded text-[10px] font-mono border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  style={{
                    border: "1px solid var(--sth-border)",
                    backgroundColor: "var(--sth-surface)",
                    color: "var(--sth-text)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive 2D SVG Footprint Drawer */}
          <div
            className="rounded-lg p-2 flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
            }}
          >
            <div className="absolute top-2 left-3 z-10 text-[9px] font-mono text-slate-400">
              Interactive 2D Floor Plan Canvas (Click to place vertices, or choose a preset above)
            </div>

            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              onClick={handleSvgClick}
              className="cursor-crosshair mt-4"
              style={{ touchAction: "none" }}
            >
              {/* Optional Floor Plan Backdrop Reference */}
              {floorPlanUrl && (
                <image
                  href={floorPlanUrl}
                  x={svgPadding}
                  y={svgPadding}
                  width={svgWidth - 2 * svgPadding}
                  height={svgHeight - 2 * svgPadding}
                  opacity={0.3}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}

              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#21262d" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

              {/* Parent Floor Footprint Outline */}
              {floorPoints.length >= 3 && (
                <polygon
                  points={floorPoints.map(geoToSvg).map((p) => p.join(",")).join(" ")}
                  fill="rgba(56, 189, 248, 0.06)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}

              {/* Existing Sibling Units on this Floor */}
              {existingUnits.map((u) => {
                const ring = extractExteriorRing(u.geometry_2d as GeoJSON.Geometry);
                if (ring.length < 3) return null;
                const pts = ring.map(geoToSvg);
                const center = pts.reduce(
                  (acc, p) => [acc[0] + p[0] / pts.length, acc[1] + p[1] / pts.length],
                  [0, 0]
                );
                return (
                  <g key={u.unit_id}>
                    <polygon
                      points={pts.map((p) => p.join(",")).join(" ")}
                      fill="rgba(100, 116, 139, 0.2)"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={center[0]}
                      y={center[1]}
                      fill="#cbd5e1"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {u.unit_number || u.unit_id}
                    </text>
                  </g>
                );
              })}

              {/* Currently Drawn Unit Polygon */}
              {drawnPoints.length > 0 && (
                <>
                  <polygon
                    points={drawnPoints.map(geoToSvg).map((p) => p.join(",")).join(" ")}
                    fill="rgba(245, 158, 11, 0.25)"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  {drawnPoints.map((pt, idx) => {
                    const [sx, sy] = geoToSvg(pt);
                    return (
                      <circle
                        key={idx}
                        cx={sx}
                        cy={sy}
                        r={idx === 0 ? 5 : 3.5}
                        fill={idx === 0 ? "#10b981" : "#f59e0b"}
                        stroke="#fff"
                        strokeWidth="1"
                      />
                    );
                  })}
                </>
              )}
            </svg>

            <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 px-2 pt-1 border-t border-slate-800">
              <span>Vertices: {drawnPoints.length}</span>
              <span>Status: {isPolygonClosed ? "Polygon Closed ✓" : "Drawing Active (Click first vertex to close)"}</span>
              <span>Sibling Units: {existingUnits.length}</span>
            </div>
          </div>

          {/* Live Validation Gate */}
          <div
            className="p-3 rounded-md space-y-1 text-[11px]"
            style={{
              border: validationGate.canSubmit ? "1px solid #C0CAC0" : "1px solid #fca5a5",
              backgroundColor: validationGate.canSubmit ? "var(--sth-sage-bg)" : "rgba(239, 68, 68, 0.05)",
            }}
          >
            <div className="flex items-center justify-between font-mono font-semibold">
              <span style={{ color: validationGate.canSubmit ? "var(--sth-sage)" : "#dc2626" }}>
                Cadastral Unit Validation Gate
              </span>
              <span style={{ color: validationGate.canSubmit ? "var(--sth-sage)" : "#dc2626" }}>
                {validationGate.canSubmit ? "GATE PASSED ✓" : "VALIDATION REQUIRED"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono pt-1">
              <div className={validationGate.isClosed ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                {validationGate.isClosed ? "✓" : "○"} Closed 2D Polygon (≥ 3 points)
              </div>
              <div className={validationGate.hasArea ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                {validationGate.hasArea ? "✓" : "○"} Positive Footprint Area
              </div>
              <div className={validationGate.idValid && !validationGate.isDuplicateId ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                {validationGate.idValid && !validationGate.isDuplicateId ? "✓" : "✗"} Unique Unit ID
              </div>
              <div className={validationGate.numValid && !validationGate.isDuplicateNum ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                {validationGate.numValid && !validationGate.isDuplicateNum ? "✓" : "✗"} Unique Unit Number
              </div>
            </div>
          </div>

          {/* Backend Error Banner */}
          {errorMessage && (
            <div
              className="p-2.5 rounded text-[11px] font-mono"
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                color: "#991b1b",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-3"
          style={{
            borderTop: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-surface)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
              color: "var(--sth-text)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!validationGate.canSubmit || isSubmitting}
            onClick={handleSubmit}
            className="px-4 py-2 rounded text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
            style={{
              backgroundColor: "#d97706",
              color: "#fff",
              border: "1px solid #b45309",
            }}
          >
            {isSubmitting ? "Extruding 3D Solid..." : "Create Unit 3D Volume"}
          </button>
        </div>
      </div>
    </div>
  );
}
