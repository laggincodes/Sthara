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
  ],
  lockedRequests: [
    {
      label: "Academic Block-4",
      requirement: "Verified block-to-footprint match and official floor plan/BIM required.",
      outcome: "Floor-by-floor model and vertical ULPIN remain locked.",
    },
  ],
} as const;

export function isIitPatnaReference(query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized.includes("iit patna") || normalized.includes("indian institute of technology patna");
}
