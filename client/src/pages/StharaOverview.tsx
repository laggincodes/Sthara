import { useState } from "react";
import { Link } from "wouter";
import { StharaNavigation } from "@/components/StharaNavigation";
import {
  Box,
  Building2,
  Layers3,
  Map,
  FileCode2,
  Compass,
  Ruler,
  QrCode,
  Download,
  Info,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";

type BuildingOverview = {
  id: string;
  name: string;
  floors: number;
  heightM: number;
  units: number;
  carpetAreaSqM: number;
  spatialId: string;
  status: "VALID" | "REVIEW";
  crs: string;
  volumeCuM: number;
  source: string;
};

const RAJOURI_GARDEN_BUILDINGS: BuildingOverview[] = [
  {
    id: "DELHI-RG-B001",
    name: "Rajouri Tower A",
    floors: 8,
    heightM: 24.5,
    units: 32,
    carpetAreaSqM: 2840,
    spatialId: "DELHI-RAJOURI-B001-F01-U101",
    status: "VALID",
    crs: "EPSG:4326 (WGS84)",
    volumeCuM: 8520,
    source: "Architectural Drawing v2 + PostGIS",
  },
  {
    id: "DELHI-RG-B002",
    name: "Tagore Heights B",
    floors: 12,
    heightM: 36.0,
    units: 48,
    carpetAreaSqM: 4120,
    spatialId: "DELHI-RAJOURI-B002-F04-U402",
    status: "VALID",
    crs: "EPSG:4326 (WGS84)",
    volumeCuM: 12360,
    source: "CAD Blueprint + LiDAR Ground Survey",
  },
  {
    id: "DELHI-RG-B003",
    name: "Ring Road Commercial Plaza",
    floors: 5,
    heightM: 16.2,
    units: 20,
    carpetAreaSqM: 1980,
    spatialId: "DELHI-RAJOURI-B003-F02-U201",
    status: "VALID",
    crs: "EPSG:4326 (WGS84)",
    volumeCuM: 5940,
    source: "Drawing Intelligence Auto-Extracted",
  },
  {
    id: "DELHI-RG-B004",
    name: "Block C Residency",
    floors: 4,
    heightM: 12.8,
    units: 16,
    carpetAreaSqM: 1450,
    spatialId: "DELHI-RAJOURI-B004-F01-U104",
    status: "VALID",
    crs: "EPSG:4326 (WGS84)",
    volumeCuM: 4350,
    source: "OpenStreetMap Footprint + Floor Height Model",
  },
];

export default function StharaOverview() {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingOverview | null>(null);

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {/* Header Banner */}
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#A85D48]">
                <span className="h-2 w-2 rounded-full bg-[#A85D48]"></span>
                STHARA 3D SPATIAL PROPERTY INTELLIGENCE
              </div>
              <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-[#252622] sm:text-3xl">
                Rajouri Garden Spatial Workspace
              </h1>
              <p className="mt-1 text-sm text-[#6F7069]">
                Structured 2D & 3D property boundaries, vertical floor stacks, and deterministic STHARA Spatial IDs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/workspace?segment=3d"
                className="flex items-center gap-2 rounded bg-[#A85D48] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#934E3B]"
              >
                <Box className="h-4 w-4" />
                <span>Launch 3D Explorer</span>
              </Link>
              <Link
                href="/drawing-intelligence"
                className="flex items-center gap-2 rounded border border-[#B28A52] bg-[#B28A52]/10 px-4 py-2 text-xs font-semibold text-[#B28A52] transition-colors hover:bg-[#B28A52]/20"
              >
                <FileCode2 className="h-4 w-4" />
                <span>Drawing Intelligence</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#D7D4CB] pt-6 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">Buildings</span>
              <p className="font-mono text-xl font-bold text-[#252622]">14</p>
            </div>
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">Total Floors</span>
              <p className="font-mono text-xl font-bold text-[#252622]">68</p>
            </div>
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">Total Units</span>
              <p className="font-mono text-xl font-bold text-[#252622]">240</p>
            </div>
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">Total Carpet Area</span>
              <p className="font-mono text-xl font-bold text-[#252622]">18,450 m²</p>
            </div>
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">3D Volumetric Bounds</span>
              <p className="font-mono text-xl font-bold text-[#788575]">100% Valid</p>
            </div>
            <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3">
              <span className="text-[11px] font-medium text-[#6F7069]">Spatial IDs Issued</span>
              <p className="font-mono text-xl font-bold text-[#B28A52]">240</p>
            </div>
          </div>
        </div>

        {/* Workflow Pipeline Navigator */}
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#E9E5DA] p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6F7069]">
            STHARA Product Workflow
          </span>
          <div className="mt-3 flex overflow-x-auto items-center gap-2 text-xs font-medium no-scrollbar">
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] font-semibold border border-[#D7D4CB]">Project</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">Import Data</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">2D Map</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#A85D48] px-3 py-1.5 text-white font-semibold shadow-xs">Select Building</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">Floors & Units</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">3D Explosion</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">STHARA Spatial ID</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6F7069] shrink-0" />
            <span className="rounded bg-[#F8F6F0] px-3 py-1.5 text-[#252622] border border-[#D7D4CB]">Export</span>
          </div>
        </div>

        {/* Building Grid Section (Progressive Disclosure) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-sans text-lg font-bold text-[#252622]">
                Building Structures & Volumetric Context
              </h2>
              <p className="text-xs text-[#6F7069]">
                Click <span className="font-semibold text-[#252622]">[Details]</span> to expand spatial geometry provenance and parameters.
              </p>
            </div>
            <Link
              href="/workspace?segment=buildings"
              className="text-xs font-semibold text-[#A85D48] hover:underline flex items-center gap-1"
            >
              <span>View all buildings</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RAJOURI_GARDEN_BUILDINGS.map((building) => (
              <div
                key={building.id}
                className="flex flex-col justify-between rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-5 shadow-xs transition-all hover:border-[#A85D48]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded border border-[#788575]/30 bg-[#788575]/10 px-2 py-0.5 text-[10px] font-semibold text-[#788575]">
                      {building.status}
                    </span>
                    <span className="font-mono text-[10px] text-[#6F7069]">{building.id}</span>
                  </div>

                  <h3 className="mt-2 font-sans text-base font-bold text-[#252622]">
                    {building.name}
                  </h3>

                  {/* Compact Default View */}
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-[#E9E5DA] p-2.5 text-center font-mono text-xs">
                    <div>
                      <span className="block text-[10px] text-[#6F7069] font-sans">Floors</span>
                      <span className="font-semibold text-[#252622]">{building.floors}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6F7069] font-sans">Height</span>
                      <span className="font-semibold text-[#252622]">{building.heightM}m</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#6F7069] font-sans">Units</span>
                      <span className="font-semibold text-[#252622]">{building.units}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#D7D4CB] pt-3">
                  <Link
                    href={`/workspace?segment=3d&buildingId=${building.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[#A85D48] hover:underline"
                  >
                    <Box className="h-3.5 w-3.5" />
                    <span>View 3D</span>
                  </Link>

                  <button
                    onClick={() => setSelectedBuilding(building)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#6F7069] hover:text-[#252622]"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for Progressive Disclosure Details */}
        {selectedBuilding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252622]/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#D7D4CB] pb-3">
                <div>
                  <h3 className="font-sans text-lg font-bold text-[#252622]">
                    {selectedBuilding.name}
                  </h3>
                  <span className="font-mono text-xs text-[#6F7069]">
                    {selectedBuilding.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="rounded p-1 text-[#6F7069] hover:bg-[#E9E5DA] hover:text-[#252622]"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 font-sans text-xs text-[#252622]">
                <div className="flex justify-between border-b border-[#D7D4CB] pb-2">
                  <span className="text-[#6F7069]">STHARA Spatial ID:</span>
                  <span className="font-mono font-semibold text-[#B28A52]">
                    {selectedBuilding.spatialId}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#D7D4CB] pb-2">
                  <span className="text-[#6F7069]">Coordinate Reference System:</span>
                  <span className="font-mono">{selectedBuilding.crs}</span>
                </div>
                <div className="flex justify-between border-b border-[#D7D4CB] pb-2">
                  <span className="text-[#6F7069]">Total Volume:</span>
                  <span className="font-mono font-semibold">{selectedBuilding.volumeCuM} m³</span>
                </div>
                <div className="flex justify-between border-b border-[#D7D4CB] pb-2">
                  <span className="text-[#6F7069]">Carpet Area:</span>
                  <span className="font-mono font-semibold">{selectedBuilding.carpetAreaSqM} m²</span>
                </div>
                <div className="flex justify-between border-b border-[#D7D4CB] pb-2">
                  <span className="text-[#6F7069]">Data Source & Provenance:</span>
                  <span className="text-[#252622]">{selectedBuilding.source}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-[#6F7069]">Geometry Validity:</span>
                  <span className="font-semibold text-[#788575]">✓ 3D Mesh Validated</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-[#D7D4CB] pt-4">
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="rounded border border-[#D7D4CB] bg-[#E9E5DA] px-4 py-2 text-xs font-semibold text-[#252622] hover:bg-[#D7D4CB]"
                >
                  Close
                </button>
                <Link
                  href={`/floor-explorer?buildingId=${selectedBuilding.id}`}
                  className="rounded bg-[#A85D48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#934E3B]"
                >
                  Inspect Floor Explosion
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
