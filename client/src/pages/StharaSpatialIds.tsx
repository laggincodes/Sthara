import { useState } from "react";
import { StharaNavigation } from "@/components/StharaNavigation";
import { QrCode, Search, Copy, Check, Info } from "lucide-react";

type SpatialIdEntry = {
  id: string;
  project: string;
  building: string;
  floor: string;
  unit: string;
  carpetArea: string;
  volume: string;
};

const SAMPLE_SPATIAL_IDS: SpatialIdEntry[] = [
  {
    id: "DELHI-RAJOURI-B001-F03-U301",
    project: "Rajouri Garden, Delhi",
    building: "Rajouri Tower A",
    floor: "Floor 3",
    unit: "Unit 301",
    carpetArea: "72.4 m²",
    volume: "217.2 m³",
  },
  {
    id: "DELHI-RAJOURI-B001-F03-U302",
    project: "Rajouri Garden, Delhi",
    building: "Rajouri Tower A",
    floor: "Floor 3",
    unit: "Unit 302",
    carpetArea: "68.0 m²",
    volume: "204.0 m³",
  },
  {
    id: "DELHI-RAJOURI-B002-F04-U402",
    project: "Rajouri Garden, Delhi",
    building: "Tagore Heights B",
    floor: "Floor 4",
    unit: "Unit 402",
    carpetArea: "85.2 m²",
    volume: "255.6 m³",
  },
  {
    id: "DELHI-RAJOURI-B003-F02-U201",
    project: "Rajouri Garden, Delhi",
    building: "Ring Road Commercial Plaza",
    floor: "Floor 2",
    unit: "Unit 201",
    carpetArea: "110.5 m²",
    volume: "331.5 m³",
  },
];

export default function StharaSpatialIds() {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = SAMPLE_SPATIAL_IDS.filter(
    (item) =>
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#B28A52]/30 bg-[#B28A52]/10 text-[#B28A52]">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                STHARA Spatial ID Registry
              </h1>
              <p className="text-xs text-[#6F7069]">
                Deterministic spatial identifiers used by STHARA for 3D object indexing, search, and object linking.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs text-[#6F7069]">
            <span className="font-bold text-[#252622]">Identifier Format: </span>
            <span className="font-mono text-[#A85D48] font-bold">
              CITY-PROJECT-BUILDING-FLOOR-UNIT
            </span>{" "}
            (e.g., DELHI-RAJOURI-B001-F03-U301)
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] px-4 py-2.5 shadow-xs">
          <Search className="h-4 w-4 text-[#6F7069]" />
          <input
            type="text"
            placeholder="Search by STHARA Spatial ID or Building name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-[#252622] outline-none placeholder-[#6F7069]"
          />
        </div>

        {/* Spatial ID Table */}
        <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D7D4CB] bg-[#E9E5DA] font-semibold text-[#6F7069]">
                <th className="p-3 font-mono">STHARA Spatial ID</th>
                <th className="p-3 font-sans">Building</th>
                <th className="p-3 font-sans">Floor & Unit</th>
                <th className="p-3 font-sans">Carpet Area</th>
                <th className="p-3 font-sans">Volume</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7D4CB] font-mono">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#E9E5DA]/50 transition-colors">
                  <td className="p-3 font-bold text-[#A85D48]">{item.id}</td>
                  <td className="p-3 font-sans font-medium text-[#252622]">{item.building}</td>
                  <td className="p-3 font-sans text-[#6F7069]">
                    {item.floor} · {item.unit}
                  </td>
                  <td className="p-3">{item.carpetArea}</td>
                  <td className="p-3">{item.volume}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleCopy(item.id)}
                      className="inline-flex items-center gap-1 rounded border border-[#D7D4CB] bg-[#E9E5DA] px-2.5 py-1 text-[11px] font-sans font-semibold text-[#252622] hover:bg-[#D7D4CB]"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-[#788575]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
