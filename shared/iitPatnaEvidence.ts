export const IIT_PATNA_OFFICIAL_CONTEXT = {
  institution: "Indian Institute of Technology Patna",
  records: [
    {
      label: "Boys' hostel building",
      floors: "8 storeys",
      builtUpArea: "28,849 m²",
      sourceLabel: "IIT Patna — Hostels",
      sourceUrl: "https://www.iitp.ac.in/hostels",
      linkage: "Institution-level context only; not matched to an individual source footprint.",
    },
    {
      label: "Academic Block-4",
      floors: "G+3 stated",
      builtUpArea: "6,667.73 m² total floor area stated",
      sourceLabel: "IIT Patna IWD Academic Area / Annual Report 2015–16",
      sourceUrl: "https://www.iitp.ac.in/administration/annual-reports",
      linkage: "Source-cited institution context only. The supplied IWD and Annual Report paths currently return moved or unavailable assets; this record is not matched to an individual source footprint, GIS polygon, or surveyed height.",
    },
  ],
  lockedRequests: [
    {
      label: "Academic Block-4",
      requirement: "Verified block-to-footprint match, surveyed metre height, and official floor plan/BIM required.",
      outcome: "Cesium metre-height extrusion, floor-by-floor model, and vertical ULPIN remain locked.",
    },
  ],
} as const;

export function isIitPatnaReference(query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized.includes("iit patna") || normalized.includes("indian institute of technology patna");
}
