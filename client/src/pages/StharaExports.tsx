import { StharaNavigation } from "@/components/StharaNavigation";
import { Download, FileJson, FileSpreadsheet, Box } from "lucide-react";

export default function StharaExports() {
  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#A85D48]/30 bg-[#A85D48]/10 text-[#A85D48]">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                Spatial Model Exports
              </h1>
              <p className="text-xs text-[#6F7069]">
                Export STHARA 3D spatial models, GeoJSON footprints, CSV unit spatial registries, and architectural summaries.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <FileJson className="h-8 w-8 text-[#A85D48] mb-3" />
              <h3 className="font-bold text-sm text-[#252622]">GeoJSON 3D Boundaries</h3>
              <p className="text-xs text-[#6F7069] mt-1">
                Export georeferenced 2D polygons & extruded 3D height parameters.
              </p>
            </div>
            <button className="mt-6 w-full rounded bg-[#A85D48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#934E3B]">
              Export GeoJSON
            </button>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <FileSpreadsheet className="h-8 w-8 text-[#788575] mb-3" />
              <h3 className="font-bold text-sm text-[#252622]">STHARA Spatial ID Registry (CSV)</h3>
              <p className="text-xs text-[#6F7069] mt-1">
                Export complete CSV register of 240 units, carpet areas, and Spatial IDs.
              </p>
            </div>
            <button className="mt-6 w-full rounded bg-[#788575] px-4 py-2 text-xs font-semibold text-white hover:bg-[#687565]">
              Export CSV Registry
            </button>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs flex flex-col justify-between">
            <div>
              <Box className="h-8 w-8 text-[#B28A52] mb-3" />
              <h3 className="font-bold text-sm text-[#252622]">3D OBJ / GLTF Mesh</h3>
              <p className="text-xs text-[#6F7069] mt-1">
                Export 3D volumetric building meshes for CAD & BIM tools.
              </p>
            </div>
            <button className="mt-6 w-full rounded border border-[#B28A52] bg-[#B28A52]/10 px-4 py-2 text-xs font-semibold text-[#B28A52] hover:bg-[#B28A52]/20">
              Export 3D Mesh
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
