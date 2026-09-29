import { useState } from "react";
import { StharaNavigation } from "@/components/StharaNavigation";
import { Compass, CheckCircle2, AlertTriangle, Layers, Building2, Box } from "lucide-react";

export default function SpatialAnalysis() {
  const [activeTab, setActiveTab] = useState<"containment" | "proximity" | "vertical" | "intersection">("containment");

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#788575]/30 bg-[#788575]/10 text-[#788575]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                Spatial Analysis & Relationships
              </h1>
              <p className="text-xs text-[#6F7069]">
                Analyze 3D spatial containment, proximity queries, vertical floor stacks, and unit overlaps.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-[#D7D4CB] gap-2">
          <button
            onClick={() => setActiveTab("containment")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "containment"
                ? "border-[#A85D48] text-[#A85D48]"
                : "border-transparent text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Spatial Containment
          </button>
          <button
            onClick={() => setActiveTab("vertical")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "vertical"
                ? "border-[#A85D48] text-[#A85D48]"
                : "border-transparent text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Vertical Relationships
          </button>
          <button
            onClick={() => setActiveTab("proximity")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "proximity"
                ? "border-[#A85D48] text-[#A85D48]"
                : "border-transparent text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Proximity & Distance
          </button>
          <button
            onClick={() => setActiveTab("intersection")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "intersection"
                ? "border-[#A85D48] text-[#A85D48]"
                : "border-transparent text-[#6F7069] hover:text-[#252622]"
            }`}
          >
            Boundary Intersection
          </button>
        </div>

        {/* Query Output Box */}
        <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          {activeTab === "containment" && (
            <div>
              <h2 className="font-sans text-base font-bold text-[#252622] mb-3">
                Unit-in-Floor Containment Query
              </h2>
              <div className="space-y-3">
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#252622]">Unit 301 (72.4 m²)</span>
                    <span className="block font-mono text-[11px] text-[#A85D48]">
                      DELHI-RAJOURI-B001-F03-U301
                    </span>
                  </div>
                  <span className="rounded bg-[#788575] text-white px-2 py-0.5 text-[10px] font-semibold">
                    Contained in Floor 3
                  </span>
                </div>
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#252622]">Unit 302 (68.0 m²)</span>
                    <span className="block font-mono text-[11px] text-[#A85D48]">
                      DELHI-RAJOURI-B001-F03-U302
                    </span>
                  </div>
                  <span className="rounded bg-[#788575] text-white px-2 py-0.5 text-[10px] font-semibold">
                    Contained in Floor 3
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "vertical" && (
            <div>
              <h2 className="font-sans text-base font-bold text-[#252622] mb-3">
                Vertical Stack Floor Indexing
              </h2>
              <div className="space-y-2 font-mono text-xs">
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 flex justify-between">
                  <span>Floor 4 (Elevation +12.0m → +15.0m)</span>
                  <span className="font-semibold text-[#A85D48]">Directly above Floor 3</span>
                </div>
                <div className="rounded border border-[#A85D48]/40 bg-[#A85D48]/10 p-3 flex justify-between text-[#A85D48] font-bold">
                  <span>Floor 3 (Elevation +9.0m → +12.0m)</span>
                  <span>Target Selected Floor</span>
                </div>
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 flex justify-between">
                  <span>Floor 2 (Elevation +6.0m → +9.0m)</span>
                  <span className="font-semibold text-[#788575]">Directly below Floor 3</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "proximity" && (
            <div>
              <h2 className="font-sans text-base font-bold text-[#252622] mb-3">
                Adjacent Structure Proximity Matrix
              </h2>
              <div className="space-y-3 text-xs">
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#252622]">Tagore Heights B</span>
                    <span className="block font-mono text-[11px] text-[#6F7069]">DELHI-RG-B002</span>
                  </div>
                  <span className="font-mono font-bold text-[#B28A52]">Distance: 14.2 Metres</span>
                </div>
                <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#252622]">Ring Road Commercial Plaza</span>
                    <span className="block font-mono text-[11px] text-[#6F7069]">DELHI-RG-B003</span>
                  </div>
                  <span className="font-mono font-bold text-[#B28A52]">Distance: 28.6 Metres</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "intersection" && (
            <div>
              <h2 className="font-sans text-base font-bold text-[#252622] mb-3">
                Boundary Intersection & Overlap Check
              </h2>
              <div className="rounded border border-[#788575]/40 bg-[#788575]/10 p-4 text-xs">
                <div className="flex items-center gap-2 text-[#788575] font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No Spatial Overlaps Detected</span>
                </div>
                <p className="mt-1 text-[#252622]">
                  All 240 units in Rajouri Garden project dataset have non-overlapping volumetric bounds.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
