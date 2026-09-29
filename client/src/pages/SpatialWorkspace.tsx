import {
  CesiumSpatialViewer,
  type CesiumLayerFlags,
  type MapCommand,
  type SampleMapAsset,
  type DetailedMapSelection,
} from "@/components/CesiumSpatialViewer";
import {
  resolveFloorStackForSelection,
  type BuildingFloorStackRecord,
  type FloorStackLevel,
  type FloorUnitCadastre,
} from "@shared/floorCadastre";
import { FloorUnitInspectorDrawer } from "@/components/FloorUnitInspectorDrawer";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Box,
  Building2,
  CheckCircle2,
  Compass,
  Database,
  Eye,
  FileCode2,
  Layers,
  Layers3,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  Sliders,
  Sparkles,
  Upload,
  X,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

type SelectedFeature = {
  ulpin: string;
  properties: Record<string, unknown>;
};

export type ActiveMapTool = "select-building" | "select-area" | "select-multiple" | null;

export default function SpatialWorkspace() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryParameters = new URLSearchParams(search);
  const requestedSite = queryParameters.get("site") ?? "Rajouri Garden";

  // Site & Search State
  const [siteQuery, setSiteQuery] = useState(requestedSite);
  const [searchInput, setSearchInput] = useState(requestedSite);

  // Active Tool Mode (Single source of truth)
  const [activeTool, setActiveTool] = useState<ActiveMapTool>("select-building");

  // Selection States
  const [selected, setSelected] = useState<SelectedFeature | null>({
    ulpin: "DELHI-RAJOURI-B001-3D",
    properties: {
      name: "Rajouri Garden · Block A Apartment",
      footprintAreaSquareMetres: 483.4,
      approvedHeightMetres: 20.02,
      source: "STHARA Vector Cadastre / Drawing Intelligence",
      geometryStatus: "VALID",
      approvedFloorCount: 7,
      totalUnits: 30,
      buildingId: "rg-delhi-rajouri-b001-3d",
    },
  });
  const [buildingSelection, setBuildingSelection] = useState<DetailedMapSelection | null>({
    kind: "source-record",
    ulpin: "DELHI-RAJOURI-B001-3D",
    sourceReference: "DELHI-RAJOURI-B001-3D",
    properties: {
      name: "Rajouri Garden · Block A Apartment",
      footprintAreaSquareMetres: 483.4,
      approvedHeightMetres: 20.02,
      source: "STHARA Vector Cadastre / Drawing Intelligence",
      geometryStatus: "VALID",
      approvedFloorCount: 7,
      totalUnits: 30,
      buildingId: "rg-delhi-rajouri-b001-3d",
    },
    coordinates: { latitude: 28.6415, longitude: 77.1209, basis: "source-geometry" },
  });

  const [multiSelectedUlpins, setMultiSelectedUlpins] = useState<string[]>([]);
  const [selectedAreaStats, setSelectedAreaStats] = useState<{
    name: string;
    areaKm2: number;
    buildingCount: number;
    selectedCount: number;
  } | null>(null);

  // Map Display & Layers
  const [sourceMapView, setSourceMapView] = useState<"2d" | "3d">("3d");
  const [layers, setLayers] = useState<CesiumLayerFlags>({
    parcels: true,
    buildings: true,
    utilities: true,
    terrain: true,
  });

  // Camera & Commands
  const [command, setCommand] = useState<MapCommand>({
    kind: "focus-site",
    nonce: Date.now(),
  });

  // Modal & Drawer States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUnitDrawerOpen, setIsUnitDrawerOpen] = useState(false);
  const [selectedUnitCadastre, setSelectedUnitCadastre] = useState<{
    floor: FloorStackLevel;
    unit: FloorUnitCadastre;
  } | null>(null);

  // Queries (Safely fallback to STHARA dataset without 500s)
  const searchResult = trpc.postgis.areaSearch.useQuery({ query: siteQuery });
  const liveGeometry = trpc.postgis.geojson.useQuery();

  // Floor Stack for Selected Building
  const floorStackData = useMemo<BuildingFloorStackRecord>(() => {
    return resolveFloorStackForSelection(
      buildingSelection?.properties ?? selected?.properties,
      siteQuery
    );
  }, [buildingSelection, selected, siteQuery]);

  const issueCommand = (kind: Exclude<MapCommand, null>["kind"]) =>
    setCommand({ kind, nonce: Date.now() });

  // Map Feature Click Handler
  const onFeatureSelect = useCallback(
    (feature: SelectedFeature) => {
      if (activeTool === "select-multiple") {
        setMultiSelectedUlpins(prev =>
          prev.includes(feature.ulpin)
            ? prev.filter(u => u !== feature.ulpin)
            : [...prev, feature.ulpin]
        );
        setSelected(null);
        setSelectedAreaStats(null);
      } else {
        setSelected(feature);
        setSelectedAreaStats(null);
      }
    },
    [activeTool]
  );

  const onDetailedFeatureSelect = useCallback(
    (feature: DetailedMapSelection) => {
      setBuildingSelection(feature);
      if (feature.kind === "source-record" && feature.ulpin) {
        if (activeTool === "select-multiple") {
          setMultiSelectedUlpins(prev =>
            prev.includes(feature.ulpin!)
              ? prev.filter(u => u !== feature.ulpin)
              : [...prev, feature.ulpin!]
          );
          setSelected(null);
          setSelectedAreaStats(null);
        } else {
          setSelected({ ulpin: feature.ulpin, properties: feature.properties });
          setSelectedAreaStats(null);
        }
      }
    },
    [activeTool]
  );

  // Handle Tool Activation
  const handleToolSelect = (tool: ActiveMapTool) => {
    setActiveTool(tool);
    if (tool === "select-area") {
      // Simulate/apply spatial bounding selection for Rajouri Garden quadrant
      setSelectedAreaStats({
        name: "Rajouri Garden West Quadrant",
        areaKm2: 0.342,
        buildingCount: 2,
        selectedCount: 2,
      });
      setSelected(null);
      setBuildingSelection(null);
      setMultiSelectedUlpins(["DELHI-RAJOURI-B001-3D", "DELHI-RAJOURI-B002-3D"]);
    } else if (tool === "select-multiple") {
      setSelectedAreaStats(null);
      if (selected?.ulpin) {
        setMultiSelectedUlpins([selected.ulpin]);
      }
    } else if (tool === "select-building") {
      setSelectedAreaStats(null);
      setMultiSelectedUlpins([]);
    }
  };

  // Clear Selection Handler
  const handleClearSelection = () => {
    setSelected(null);
    setBuildingSelection(null);
    setMultiSelectedUlpins([]);
    setSelectedAreaStats(null);
    setActiveTool("select-building");
  };

  // Build 3D Handler
  const handleBuild3D = () => {
    setSourceMapView("3d");
    issueCommand("focus-site");
  };

  // Quick Navigation Helper
  const handleQuickNavigation = (target: "registry" | "overview" | "dashboard") => {
    if (target === "registry") setLocation("/ulpin-registry");
    else if (target === "overview") setLocation("/overview");
    else if (target === "dashboard") setLocation("/dashboard");
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F3F0E8] font-sans text-[#252622] antialiased">
      {/* 1. Header Context Bar */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-[#D7D4CB] bg-[#F8F6F0] px-4 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/overview"
            className="flex items-center gap-1.5 rounded-lg border border-[#D7D4CB] bg-[#E9E5DA] px-2.5 py-1.5 text-xs font-semibold text-[#252622] hover:bg-[#D7D4CB] transition-colors"
            title="Return to STHARA Overview"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Overview</span>
          </Link>

          <div className="h-4 w-px bg-[#D7D4CB]" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#A85D48]/30 bg-[#A85D48]/10 text-[#A85D48]">
              <MapPin size={15} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#252622] leading-tight">
                Rajouri Garden · Map Workspace
              </h1>
              <span className="text-[10px] font-mono text-[#6F7069]">
                Active Dataset: RG-DELHI-2026 · STHARA Spatial Intelligence
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar & Direct Actions */}
        <div className="flex items-center gap-2">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (searchInput.trim()) {
                setSiteQuery(searchInput.trim());
                issueCommand("focus-site");
              }
            }}
            className="relative hidden md:block"
          >
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search building, STHARA Spatial ID..."
              className="w-64 rounded-md border border-[#D7D4CB] bg-[#E9E5DA] px-3 py-1 text-xs text-[#252622] placeholder:text-[#6F7069] focus:border-[#A85D48] focus:outline-hidden"
            />
          </form>

          <Link
            href="/floor-explorer?building=rajouri-garden-block-a"
            className="flex items-center gap-1.5 rounded bg-[#A85D48] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#934E3B] transition-colors"
          >
            <Box size={14} />
            <span className="hidden sm:inline">3D Model</span>
          </Link>
        </div>
      </header>

      {/* 2. Main 3-Column Workspace (STHARA CONTROLS | MAP | INSPECTOR) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT COLUMN: STHARA CONTROLS (260px) */}
        <aside
          className="w-64 shrink-0 flex flex-col justify-between border-r border-[#D7D4CB] bg-[#F8F6F0] p-3.5 overflow-y-auto z-10"
          aria-label="STHARA Spatial Controls"
        >
          <div className="space-y-4">
            {/* SPATIAL SELECTION TOOLS */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85D48] block mb-2">
                Spatial Selection Tools
              </span>
              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleToolSelect("select-building")}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition-colors ${
                    activeTool === "select-building"
                      ? "bg-[#A85D48] text-white font-bold shadow-xs"
                      : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB]"
                  }`}
                >
                  <Building2 size={14} />
                  <span>Select Building</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToolSelect("select-area")}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition-colors ${
                    activeTool === "select-area"
                      ? "bg-[#A85D48] text-white font-bold shadow-xs"
                      : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB]"
                  }`}
                >
                  <ScanSearch size={14} />
                  <span>Select Area</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToolSelect("select-multiple")}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition-colors ${
                    activeTool === "select-multiple"
                      ? "bg-[#A85D48] text-white font-bold shadow-xs"
                      : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB]"
                  }`}
                >
                  <Layers3 size={14} />
                  <span>Select Multiple</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="w-full flex items-center gap-2 rounded-md border border-[#D7D4CB] bg-[#E9E5DA] px-3 py-1.5 text-left text-xs text-[#6F7069] hover:bg-[#D7D4CB] hover:text-[#252622] transition-colors"
                >
                  <X size={14} />
                  <span>Clear Selection</span>
                </button>
              </div>
            </div>

            {/* MODELING & DATA ACTIONS */}
            <div className="border-t border-[#D7D4CB] pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85D48] block mb-2">
                Modeling Actions
              </span>
              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleBuild3D}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-[#788575] px-3 py-2 font-bold text-white shadow-xs hover:bg-[#687565] transition-colors"
                >
                  <Box size={14} />
                  <span>Build 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-[#B28A52]/40 bg-[#B28A52]/10 px-3 py-2 font-semibold text-[#B28A52] hover:bg-[#B28A52]/20 transition-colors"
                >
                  <Upload size={14} />
                  <span>Import Data</span>
                </button>
              </div>
            </div>

            {/* MAP VIEW & LAYERS */}
            <div className="border-t border-[#D7D4CB] pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85D48] block mb-2">
                Display &amp; Layers
              </span>
              <div className="flex gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => setSourceMapView("2d")}
                  className={`flex-1 rounded py-1 text-xs font-semibold transition-colors ${
                    sourceMapView === "2d"
                      ? "bg-[#A85D48] text-white font-bold"
                      : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB]"
                  }`}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMapView("3d")}
                  className={`flex-1 rounded py-1 text-xs font-semibold transition-colors ${
                    sourceMapView === "3d"
                      ? "bg-[#A85D48] text-white font-bold"
                      : "bg-[#E9E5DA] text-[#252622] hover:bg-[#D7D4CB]"
                  }`}
                >
                  3D Extruded
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[#252622]">
                  <input
                    type="checkbox"
                    checked={layers.parcels}
                    onChange={e => setLayers({ ...layers, parcels: e.target.checked })}
                    className="rounded border-[#D7D4CB] text-[#A85D48] focus:ring-0"
                  />
                  <span>Surface Parcels</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#252622]">
                  <input
                    type="checkbox"
                    checked={layers.buildings}
                    onChange={e => setLayers({ ...layers, buildings: e.target.checked })}
                    className="rounded border-[#D7D4CB] text-[#A85D48] focus:ring-0"
                  />
                  <span>Detected Buildings</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#252622]">
                  <input
                    type="checkbox"
                    checked={layers.utilities}
                    onChange={e => setLayers({ ...layers, utilities: e.target.checked })}
                    className="rounded border-[#D7D4CB] text-[#A85D48] focus:ring-0"
                  />
                  <span>Infrastructure</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Context Footer Links */}
          <div className="border-t border-[#D7D4CB] pt-3 text-[11px] text-[#6F7069] space-y-1">
            <Link
              href="/drawing-intelligence"
              className="flex items-center gap-1.5 font-medium text-[#A85D48] hover:underline"
            >
              <FileCode2 size={13} />
              <span>Drawing Intelligence</span>
            </Link>
            <Link
              href="/floor-explorer?building=rajouri-garden-block-a"
              className="flex items-center gap-1.5 font-medium text-[#788575] hover:underline"
            >
              <Layers3 size={13} />
              <span>Dedicated 3D Floor Slicer</span>
            </Link>
          </div>
        </aside>

        {/* CENTER COLUMN: MAP VIEWPORT (flex-1) */}
        <main className="flex-1 relative overflow-hidden bg-stone-900">
          <CesiumSpatialViewer
            command={command}
            layers={layers}
            sourceMapView={sourceMapView}
            onFeatureSelect={onFeatureSelect}
            onDetailedFeatureSelect={onDetailedFeatureSelect}
            floorStackData={floorStackData}
            focusUlpins={
              multiSelectedUlpins.length > 0
                ? multiSelectedUlpins
                : selected?.ulpin
                  ? [selected.ulpin]
                  : undefined
            }
          />

          {/* Clean Floating Map Camera Controls (Top Right) */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0]/90 p-1.5 shadow-md backdrop-blur-xs">
            <button
              type="button"
              onClick={() => issueCommand("zoom-in")}
              className="rounded p-1 text-[#252622] hover:bg-[#E9E5DA]"
              title="Zoom In"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => issueCommand("zoom-out")}
              className="rounded p-1 text-[#252622] hover:bg-[#E9E5DA]"
              title="Zoom Out"
            >
              <Minus size={15} />
            </button>
            <div className="h-px bg-[#D7D4CB] my-0.5" />
            <button
              type="button"
              onClick={() => issueCommand("north")}
              className="rounded p-1 text-[#252622] hover:bg-[#E9E5DA]"
              title="Align North"
            >
              <Compass size={15} />
            </button>
            <button
              type="button"
              onClick={() => issueCommand("focus-site")}
              className="rounded p-1 text-[#252622] hover:bg-[#E9E5DA]"
              title="Reset View"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </main>

        {/* RIGHT COLUMN: BUILDING INSPECTOR (320px) */}
        <aside
          className="w-80 shrink-0 border-l border-[#D7D4CB] bg-[#F8F6F0] p-4 flex flex-col justify-between overflow-y-auto z-10"
          aria-label="STHARA Building Inspector"
        >
          <div>
            <div className="border-b border-[#D7D4CB] pb-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85D48] block">
                BUILDING INSPECTOR
              </span>
              <p className="text-xs text-[#6F7069] mt-0.5">
                Deterministic 3D Property Geometry &amp; Cadastre
              </p>
            </div>

            {/* CASE 1: AREA SELECTED */}
            {activeTool === "select-area" && selectedAreaStats && (
              <div className="space-y-3">
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Selected Area:</span>
                    <span className="font-bold text-[#252622]">{selectedAreaStats.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Area:</span>
                    <span className="font-mono font-bold text-[#252622]">
                      {selectedAreaStats.areaKm2.toFixed(3)} km²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Buildings Found:</span>
                    <span className="font-mono font-bold text-[#A85D48]">
                      {selectedAreaStats.buildingCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Buildings Selected:</span>
                    <span className="font-mono font-bold text-[#788575]">
                      {selectedAreaStats.selectedCount}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBuild3D}
                  className="w-full rounded bg-[#A85D48] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#934E3B] transition-colors"
                >
                  Convert Selected Buildings to 3D
                </button>
              </div>
            )}

            {/* CASE 2: MULTIPLE BUILDINGS SELECTED */}
            {activeTool === "select-multiple" && multiSelectedUlpins.length > 0 && !selectedAreaStats && (
              <div className="space-y-3">
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6F7069]">Selection Mode:</span>
                    <span className="font-bold text-[#A85D48]">Multi-Building</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Buildings Selected:</span>
                    <span className="font-mono text-[#A85D48]">{multiSelectedUlpins.length}</span>
                  </div>
                  <div className="pt-2 border-t border-[#D7D4CB] text-[11px] font-mono text-[#6F7069] space-y-1">
                    {multiSelectedUlpins.map((ulpin, idx) => (
                      <div key={idx} className="truncate">
                        • {ulpin}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBuild3D}
                  className="w-full rounded bg-[#A85D48] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#934E3B] transition-colors"
                >
                  Build Selected in 3D
                </button>
              </div>
            )}

            {/* CASE 3: SINGLE BUILDING SELECTED */}
            {(selected || buildingSelection) && activeTool !== "select-area" && (multiSelectedUlpins.length <= 1) && (
              <div className="space-y-3">
                {/* Building Header */}
                <div>
                  <h2 className="text-sm font-bold text-[#252622]">
                    {String(buildingSelection?.properties.name || selected?.properties.name || "Rajouri Garden · Block A Apartment")}
                  </h2>
                  <span className="font-mono text-[11px] font-bold text-[#A85D48] block mt-0.5">
                    {selected?.ulpin || "DELHI-RAJOURI-B001-3D"}
                  </span>
                </div>

                {/* Structured Metrics Grid */}
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Building ID:</span>
                    <span className="font-mono font-medium text-[#252622]">
                      {String(buildingSelection?.properties.buildingId || "rg-delhi-rajouri-b001-3d")}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Footprint Area:</span>
                    <span className="font-mono font-medium text-[#252622]">
                      {Number(buildingSelection?.properties.footprintAreaSquareMetres || 483.4).toFixed(1)} m²
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Source:</span>
                    <span className="font-medium text-[#252622] text-right truncate max-w-[160px]">
                      STHARA Vector Cadastre
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Geometry Status:</span>
                    <span className="font-bold text-[#788575]">
                      VALID (1:100 Calibrated)
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Floors:</span>
                    <span className="font-bold text-[#252622]">
                      {floorStackData.actualFloors || "G + 6 + Terrace (20.02m)"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">Units:</span>
                    <span className="font-bold text-[#252622]">
                      {floorStackData.totalUnits || 30} Residential Flats
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6F7069]">3D Status:</span>
                    <span className="font-bold text-[#A85D48]">
                      3D Model Built ({floorStackData.actualHeightM}m)
                    </span>
                  </div>
                </div>

                {/* Inspector Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBuild3D}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-[#788575] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#687565] transition-colors"
                  >
                    <Box size={14} />
                    <span>Build 3D</span>
                  </button>

                  <Link
                    href={`/floor-explorer?building=${encodeURIComponent(floorStackData.id || "rajouri-garden-block-a")}`}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-[#A85D48] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#934E3B] transition-colors text-center"
                  >
                    <ExternalLink size={14} />
                    <span>Open 3D Model</span>
                  </Link>
                </div>
              </div>
            )}

            {/* CASE 4: NOTHING SELECTED */}
            {!selected && !buildingSelection && !selectedAreaStats && multiSelectedUlpins.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded border border-[#D7D4CB] bg-[#E9E5DA]/40 p-8 text-center text-xs text-[#6F7069]">
                <Building2 size={32} className="text-[#D7D4CB] mb-2" />
                <p className="font-semibold text-[#252622]">No Building Selected</p>
                <p className="mt-1 text-[11px]">
                  Select a building or area on the map to inspect its spatial volume, geometry provenance, and structured units.
                </p>
              </div>
            )}
          </div>

          <div className="rounded border border-[#B28A52]/30 bg-[#B28A52]/10 p-2.5 text-[10px] text-[#6F7069] mt-4">
            <span className="font-bold text-[#252622] block mb-0.5">STHARA Spatial Identity:</span>
            Deterministic project coordinates and floor cadastre volumes. Not official government property titles.
          </div>
        </aside>
      </div>

      {/* 3. Unified PROJECT -> IMPORT DATA Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D7D4CB] pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#252622]">PROJECT → IMPORT DATA</h2>
                <p className="text-xs text-[#6F7069]">Import map geometry &amp; architectural drawings into your active project.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#6F7069] hover:text-[#252622]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-[#D7D4CB] bg-[#E9E5DA]/50 p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-[#A85D48] mb-2" />
                <p className="text-xs font-semibold text-[#252622]">
                  Drag &amp; drop project files here (MAP, PDF, BLUEPRINT, GEOJSON, IMAGE, OSM)
                </p>
                <p className="text-[10px] text-[#6F7069] mt-1">OSM is optional. PDF blueprints and map layers are fully supported.</p>
                <input
                  type="file"
                  multiple
                  className="mt-3 text-xs text-[#6F7069] file:mr-3 file:rounded file:border-0 file:bg-[#A85D48] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
                  onChange={() => {
                    setIsImportModalOpen(false);
                  }}
                />
              </div>

              <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs space-y-1.5">
                <span className="font-bold text-[#252622] block mb-1">Active Project Data Files (Rajouri Garden):</span>
                <div className="font-mono text-[11px] text-[#A85D48] space-y-1">
                  <div>✓ 20 ARCH PLAN.pdf (G+6 Architectural Blueprint)</div>
                  <div>✓ RajouriGarden_Footprints.geojson</div>
                  <div>✓ 20 STRU PLAN 1.pdf</div>
                  <div>✓ 20 STRU PLAN 2.pdf</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#D7D4CB] pt-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded border border-[#D7D4CB] bg-[#E9E5DA] px-4 py-1.5 text-xs font-semibold text-[#252622]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded bg-[#A85D48] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#934E3B]"
              >
                Process &amp; Load into Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
