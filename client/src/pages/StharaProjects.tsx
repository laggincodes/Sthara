import { Link } from "wouter";
import { StharaNavigation } from "@/components/StharaNavigation";
import { FolderKanban, MapPin, Building2, Box, ArrowRight, CheckCircle2 } from "lucide-react";

export default function StharaProjects() {
  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-[#A85D48]/30 bg-[#A85D48]/10 text-[#A85D48]">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-sans text-2xl font-bold text-[#252622]">
                  STHARA Spatial Projects
                </h1>
                <p className="text-xs text-[#6F7069]">
                  Organize 3D building models, GIS spatial datasets, and architectural drawings by project.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Project Card */}
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-lg border-2 border-[#A85D48] bg-[#F8F6F0] p-6 shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#D7D4CB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#A85D48] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    Primary Active Workspace
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#6F7069]">
                    <MapPin className="h-3.5 w-3.5 text-[#A85D48]" />
                    Delhi, India
                  </span>
                </div>
                <h2 className="mt-2 font-sans text-xl font-bold text-[#252622]">
                  Rajouri Garden Spatial Model
                </h2>
                <p className="text-xs text-[#6F7069] mt-0.5">
                  High-density mixed residential & commercial urban spatial model with 3D floor explosion and CAD blueprint alignment.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/workspace?segment=map"
                  className="flex items-center gap-1.5 rounded border border-[#D7D4CB] bg-[#E9E5DA] px-4 py-2 text-xs font-semibold text-[#252622] hover:bg-[#D7D4CB]"
                >
                  <MapPin className="h-4 w-4 text-[#788575]" />
                  <span>Open 2D Map</span>
                </Link>
                <Link
                  href="/workspace?segment=3d"
                  className="flex items-center gap-1.5 rounded bg-[#A85D48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#934E3B]"
                >
                  <Box className="h-4 w-4" />
                  <span>Launch 3D Explorer</span>
                </Link>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 font-mono text-xs sm:grid-cols-4">
              <div className="rounded bg-[#E9E5DA] p-3">
                <span className="block font-sans text-[10px] text-[#6F7069]">Buildings</span>
                <span className="font-bold text-[#252622]">14 Structures</span>
              </div>
              <div className="rounded bg-[#E9E5DA] p-3">
                <span className="block font-sans text-[10px] text-[#6F7069]">Floors</span>
                <span className="font-bold text-[#252622]">68 Floor Slabs</span>
              </div>
              <div className="rounded bg-[#E9E5DA] p-3">
                <span className="block font-sans text-[10px] text-[#6F7069]">Units</span>
                <span className="font-bold text-[#252622]">240 Spatial Units</span>
              </div>
              <div className="rounded bg-[#E9E5DA] p-3">
                <span className="block font-sans text-[10px] text-[#6F7069]">Coordinate System</span>
                <span className="font-bold text-[#788575]">WGS84 Ellipsoid</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
