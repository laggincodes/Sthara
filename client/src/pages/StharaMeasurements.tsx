import { useState } from "react";
import { StharaNavigation } from "@/components/StharaNavigation";
import { Ruler, Box, Maximize2, MoveHorizontal, MoveVertical } from "lucide-react";

export default function StharaMeasurements() {
  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#A85D48]/30 bg-[#A85D48]/10 text-[#A85D48]">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                Spatial Measurements & Dimensions
              </h1>
              <p className="text-xs text-[#6F7069]">
                Measure 3D distances, surface areas, carpet volumes, floor clearances, and setback dimensions.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#A85D48] font-bold text-xs mb-2">
              <MoveHorizontal className="h-4 w-4" />
              <span>Linear Distance</span>
            </div>
            <p className="font-mono text-2xl font-bold text-[#252622]">24.50 m</p>
            <p className="text-[11px] text-[#6F7069] mt-1">Building A to Tagore Heights B clear span</p>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#788575] font-bold text-xs mb-2">
              <Maximize2 className="h-4 w-4" />
              <span>Carpet Area</span>
            </div>
            <p className="font-mono text-2xl font-bold text-[#252622]">72.40 m²</p>
            <p className="text-[11px] text-[#6F7069] mt-1">Unit 301 internal enclosed footprint</p>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#B28A52] font-bold text-xs mb-2">
              <Box className="h-4 w-4" />
              <span>3D Enclosed Volume</span>
            </div>
            <p className="font-mono text-2xl font-bold text-[#252622]">217.20 m³</p>
            <p className="text-[11px] text-[#6F7069] mt-1">Unit 301 3D volumetric space</p>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#252622] font-bold text-xs mb-2">
              <MoveVertical className="h-4 w-4" />
              <span>Floor Elevation</span>
            </div>
            <p className="font-mono text-2xl font-bold text-[#252622]">3.20 m</p>
            <p className="text-[11px] text-[#6F7069] mt-1">Floor 3 slab-to-ceiling clearance</p>
          </div>
        </div>
      </main>
    </div>
  );
}
