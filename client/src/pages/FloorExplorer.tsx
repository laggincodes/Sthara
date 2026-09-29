import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  SAMPLE_BUILDING_FLOOR_STACKS,
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
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export default function FloorExplorer() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryParams = new URLSearchParams(search);
  const buildingIdParam = queryParams.get("building") || "rajouri-garden-block-a";

  // Active Building State
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingIdParam);
  const currentBuilding =
    SAMPLE_BUILDING_FLOOR_STACKS.find(b => b.id === selectedBuildingId) ||
    SAMPLE_BUILDING_FLOOR_STACKS[0];

  // 3D Controls State
  const [explosionFactor, setExplosionFactor] = useState(0.35);
  const [clashMode, setClashMode] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [selectedFloorIndex, setSelectedFloorIndex] = useState<number | null>(null);

  // Left Panel Collapsed State (Responsive)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // Inspector Drawer State
  const [selectedUnit, setSelectedUnit] = useState<FloorUnitCadastre | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorStackLevel | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Handle floor selection synchronized between left panel & direct 3D click
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
    if (floor) {
      setSelectedFloorIndex(floor.floorIndex);
    }
    if (unit) {
      setIsDrawerOpen(true);
    }
  };

  // Sort floors top-to-bottom for natural vertical architectural representation
  const sortedFloors = [...currentBuilding.floors].sort(
    (a, b) => b.floorIndex - a.floorIndex
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F3F0E8] text-[#252622] font-sans">
      {/* Top Header & Context Bar */}
      <header className="h-14 shrink-0 bg-[#F8F6F0] border-b border-[#D7D4CB] px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/workspace")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] border border-[#D7D4CB] text-xs font-semibold transition-colors"
            title="Return to Map Workspace"
          >
            <ArrowLeft size={14} />
            <span>Map Workspace</span>
          </button>

          <div className="h-4 w-px bg-[#D7D4CB] mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#A85D48]/30 bg-[#A85D48]/10 text-[#A85D48]">
              <Layers size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-[#252622] tracking-tight">
                  3D Model Explorer
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E9E5DA] text-[#6F7069] border border-[#D7D4CB]">
                  {currentBuilding.ulpin}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Header: Building Selector & Mode Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Blueprint Drape Toggle */}
          <button
            type="button"
            onClick={() => setBlueprintMode(!blueprintMode)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              blueprintMode
                ? "bg-[#A85D48] text-white shadow-xs border border-[#A85D48]"
                : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] border border-[#D7D4CB]"
            }`}
          >
            <FileText size={13} />
            <span>2D CAD Drape</span>
          </button>

          {/* Spatial Clash Toggle */}
          <button
            type="button"
            onClick={() => setClashMode(!clashMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              clashMode
                ? "bg-rose-600 text-white shadow-xs border border-rose-500"
                : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] border border-[#D7D4CB]"
            }`}
          >
            <AlertTriangle size={13} />
            <span>Clash Review</span>
          </button>

          {/* Building Switcher */}
          <div className="flex items-center gap-1.5 bg-[#E9E5DA] px-2.5 py-1.5 rounded-lg border border-[#D7D4CB]">
            <Building2 size={14} className="text-[#A85D48]" />
            <select
              value={selectedBuildingId}
              onChange={e => {
                setSelectedBuildingId(e.target.value);
                setSelectedFloorIndex(null);
                setSelectedUnit(null);
                setIsDrawerOpen(false);
              }}
              className="bg-transparent text-xs font-semibold text-[#252622] focus:outline-none cursor-pointer pr-1"
            >
              {SAMPLE_BUILDING_FLOOR_STACKS.map(b => (
                <option key={b.id} value={b.id}>
                  {b.buildingName} ({b.floors.length} Floors)
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Floor Panel + 3D Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT-SIDE VERTICAL FLOOR CONTROL PANEL */}
        <aside
          className={`shrink-0 border-r border-[#D7D4CB] bg-[#F8F6F0] flex flex-col justify-between transition-all duration-200 z-20 ${
            isLeftPanelOpen ? "w-64" : "w-12"
          }`}
        >
          {/* Top of Floor Panel: Header & Toggle */}
          <div className="p-3 border-b border-[#D7D4CB] flex items-center justify-between">
            {isLeftPanelOpen && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#A85D48]">
                  FLOORS
                </span>
                <span className="text-[10px] text-[#6F7069] font-mono">
                  ({currentBuilding.floors.length})
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="p-1 rounded text-[#6F7069] hover:text-[#252622] hover:bg-[#E9E5DA] transition-colors ml-auto"
              title={isLeftPanelOpen ? "Collapse Panel" : "Expand Floor Panel"}
            >
              {isLeftPanelOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          </div>

          {/* Floor Selection List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {/* ALL FLOORS Option */}
            <button
              type="button"
              onClick={() => handleFloorSelect(null)}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs font-bold transition-all flex items-center justify-between ${
                selectedFloorIndex === null
                  ? "bg-[#A85D48] text-white shadow-xs"
                  : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] border border-[#D7D4CB]"
              }`}
            >
              <span>{isLeftPanelOpen ? "ALL FLOORS" : "ALL"}</span>
              {isLeftPanelOpen && (
                <span className="text-[10px] font-mono opacity-80">
                  {currentBuilding.floors.length} Levels
                </span>
              )}
            </button>

            {/* Dynamic Individual Floor Items */}
            {sortedFloors.map(floor => {
              const isSelected = selectedFloorIndex === floor.floorIndex;
              const isClash = floor.isUnauthorizedFloor && clashMode;
              return (
                <button
                  key={floor.floorCode}
                  type="button"
                  onClick={() => handleFloorSelect(isSelected ? null : floor)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-[#A85D48] text-white font-bold shadow-xs ring-1 ring-[#A85D48]"
                      : isClash
                        ? "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                        : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB] border border-[#D7D4CB]"
                  }`}
                  title={`${floor.floorName} (${floor.elevationMsl})`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold w-7 shrink-0 text-center">
                      {floor.floorCode}
                    </span>
                    {isLeftPanelOpen && (
                      <span className="truncate text-[11px] font-medium opacity-90">
                        {floor.floorName.split("·")[0]}
                      </span>
                    )}
                  </div>

                  {isLeftPanelOpen && (
                    <span className="text-[10px] font-mono shrink-0 opacity-70">
                      {floor.units.length > 0 ? `${floor.units.length}U` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom of Floor Panel: EXPLODE FLOORS Slider */}
          {isLeftPanelOpen ? (
            <div className="p-3 border-t border-[#D7D4CB] bg-[#E9E5DA]/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[11px] text-[#A85D48] font-mono uppercase tracking-wider">
                  EXPLODE FLOORS
                </span>
                <span className="font-mono text-[11px] text-[#252622]">
                  {Math.round(explosionFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={explosionFactor}
                onChange={e => setExplosionFactor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#D7D4CB] rounded appearance-none cursor-pointer accent-[#A85D48]"
              />
              <div className="flex justify-between text-[9px] font-mono text-[#6F7069]">
                <span>0% Solid</span>
                <span>50% Sep</span>
                <span>100% Explode</span>
              </div>
            </div>
          ) : (
            <div className="p-2 border-t border-[#D7D4CB] text-center">
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(true)}
                className="p-1 rounded text-[#6F7069] hover:text-[#252622]"
                title="Expand Floor Panel to adjust Explode Slider"
              >
                <Sliders size={14} />
              </button>
            </div>
          )}
        </aside>

        {/* 3D WebGL Canvas Viewport (Takes majority of screen) */}
        <main className="flex-1 relative overflow-hidden bg-stone-900">
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
        </main>
      </div>

      {/* Forensic Unit Inspector Drawer */}
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
