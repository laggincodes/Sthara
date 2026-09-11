import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  SAMPLE_BUILDING_FLOOR_STACKS,
  type BuildingFloorStackRecord,
  type FloorStackLevel,
  type FloorUnitCadastre,
} from "@shared/floorCadastre";
import ThreeFloorStackViewer from "@/components/ThreeFloorStackViewer";
import FloorUnitInspectorDrawer from "@/components/FloorUnitInspectorDrawer";
import {
  Building2,
  Sliders,
  AlertTriangle,
  FileText,
  Layers,
  ArrowLeft,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
} from "lucide-react";

export default function FloorExplorer() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = new URLSearchParams(search);
  const buildingIdParam = queryParams.get("building") || "patna-central-heights";

  // Active Building State
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingIdParam);
  const currentBuilding =
    SAMPLE_BUILDING_FLOOR_STACKS.find(b => b.id === selectedBuildingId) ||
    SAMPLE_BUILDING_FLOOR_STACKS[0];

  // 3D Controls State
  const [explosionFactor, setExplosionFactor] = useState(0.4);
  const [clashMode, setClashMode] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [selectedFloorIndex, setSelectedFloorIndex] = useState<number | null>(null);

  // Inspector Drawer State
  const [selectedUnit, setSelectedUnit] = useState<FloorUnitCadastre | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorStackLevel | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Handle floor selection from pills or 3D
  const handleFloorSelect = (floor: FloorStackLevel | null) => {
    if (!floor) {
      setSelectedFloorIndex(null);
      setSelectedFloor(null);
      return;
    }
    setSelectedFloorIndex(floor.floorIndex);
    setSelectedFloor(floor);
  };

  // Handle unit selection
  const handleUnitSelect = (
    unit: FloorUnitCadastre | null,
    floor: FloorStackLevel | null
  ) => {
    setSelectedUnit(unit);
    setSelectedFloor(floor);
    if (unit) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation & Command Bar */}
      <header className="h-16 shrink-0 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 flex items-center justify-between z-30">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Layers size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  3D Exploded Floor Cadastre & Volumetric Slicing
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles size={10} />
                  Top 6 3D Features Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Interactive vertical cadastral subdivision, sub-surface basements, air-rights & spatial clash visualizer
              </p>
            </div>
          </div>
        </div>

        {/* Right: Building Switcher & Quick Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
            <Building2 size={15} className="text-sky-400" />
            <select
              value={selectedBuildingId}
              onChange={e => {
                setSelectedBuildingId(e.target.value);
                setSelectedFloorIndex(null);
                setSelectedUnit(null);
                setIsDrawerOpen(false);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2"
            >
              {SAMPLE_BUILDING_FLOOR_STACKS.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.buildingName} ({b.floors.length} Floors)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setLocation("/workspace")}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors"
          >
            <MapPin size={13} />
            <span>3D GIS Map</span>
          </button>
        </div>
      </header>

      {/* Sub-Header: Building Metrics & Interactive Mode Toggles */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
        {/* Building Telemetry Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700">
            3D ULPIN: <b className="text-sky-300">{currentBuilding.ulpin}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700">
            Sanction: <b className="text-slate-100">{currentBuilding.sanctionedFloors}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700">
            Actual Extrusion: <b className="text-slate-100">{currentBuilding.actualFloors}</b>
          </span>

          {currentBuilding.sanctionStatus === "SANCTIONED_WITH_DEVIATIONS" ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/60 text-red-400 font-semibold text-[11px] border border-red-500/40">
              <AlertTriangle size={13} />
              Height Clash (+{(currentBuilding.actualHeightM - currentBuilding.sanctionedHeightM).toFixed(1)}m)
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 font-semibold text-[11px] border border-emerald-500/40">
              <CheckCircle2 size={13} />
              Fully Compliant Height
            </span>
          )}
        </div>

        {/* Feature Mode Action Toggles */}
        <div className="flex items-center gap-2">
          {/* Spatial Clash Toggle */}
          <button
            type="button"
            onClick={() => setClashMode(!clashMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              clashMode
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30 border border-red-400"
                : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700"
            }`}
          >
            <AlertTriangle size={14} />
            <span>4. Municipal Clash Mode</span>
          </button>

          {/* Blueprint Drape Toggle */}
          <button
            type="button"
            onClick={() => setBlueprintMode(!blueprintMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              blueprintMode
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 border border-sky-400"
                : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700"
            }`}
          >
            <FileText size={14} />
            <span>6. 2D Blueprint Drape</span>
          </button>
        </div>
      </div>

      {/* Floor Filter Bar (Pills) */}
      <div className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar z-20">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-2 flex items-center gap-1 shrink-0">
          <Layers size={13} />
          Floor Filter:
        </span>
        <button
          type="button"
          onClick={() => handleFloorSelect(null)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
            selectedFloorIndex === null
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
          }`}
        >
          All Floors ({currentBuilding.floors.length})
        </button>
        {currentBuilding.floors.map(floor => {
          const isSelected = selectedFloorIndex === floor.floorIndex;
          const isClash = floor.isUnauthorizedFloor && clashMode;
          return (
            <button
              key={floor.floorCode}
              type="button"
              onClick={() => handleFloorSelect(isSelected ? null : floor)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : isClash
                    ? "bg-red-950/70 text-red-300 border border-red-500/50 hover:bg-red-900/60"
                    : floor.floorIndex < 0
                      ? "bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-900/50"
                      : "bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <span>{floor.floorCode}</span>
              {floor.isUnauthorizedFloor && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main 3D WebGL Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <ThreeFloorStackViewer
          building={currentBuilding}
          selectedFloorIndex={selectedFloorIndex}
          selectedUnitId={selectedUnit?.id || null}
          explosionFactor={explosionFactor}
          clashMode={clashMode}
          blueprintMode={blueprintMode}
          onSelectFloor={handleFloorSelect}
          onSelectUnit={handleUnitSelect}
          onExplosionChange={setExplosionFactor}
        />
      </div>

      {/* Slide-Over Forensic Deed Inspector Drawer */}
      <FloorUnitInspectorDrawer
        building={currentBuilding}
        floor={selectedFloor}
        unit={selectedUnit}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
