import { StharaNavigation } from "@/components/StharaNavigation";
import { FileSpreadsheet, Database, FileCode2, CheckCircle2 } from "lucide-react";

export default function StharaSources() {
  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#788575]/30 bg-[#788575]/10 text-[#788575]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                Data Sources & Spatial Provenance
              </h1>
              <p className="text-xs text-[#6F7069]">
                Every spatial object in STHARA tracks its data source, confidence rating, and geometry origin.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-4 shadow-xs">
            <div className="flex items-center justify-between font-bold text-[#252622]">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-[#A85D48]" />
                <span>Architectural DWG / PDF Drawings</span>
              </div>
              <span className="font-mono text-[#788575]">Drawing Intelligence</span>
            </div>
            <p className="mt-1 text-[#6F7069]">
              Provides floor-by-floor unit partitions, room bounds, elevator core locations, and exact floor elevations.
            </p>
          </div>

          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-4 shadow-xs">
            <div className="flex items-center justify-between font-bold text-[#252622]">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[#788575]" />
                <span>PostGIS Spatial Parcels</span>
              </div>
              <span className="font-mono text-[#788575]">Geospatial Database</span>
            </div>
            <p className="mt-1 text-[#6F7069]">
              Provides ground footprint polygon boundaries, georeferenced coordinates (EPSG:4326), and terrain elevations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
