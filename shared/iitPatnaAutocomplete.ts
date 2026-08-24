export const IIT_PATNA_AUTOCOMPLETE = [
  {
    label: "IIT Patna",
    query: "IIT Patna",
    detail:
      "Search four live public source footprints at the IIT Patna reference area.",
  },
  {
    label: "Academic Block-4 · source-cited institutional context",
    query: "Academic Block-4 at IIT Patna",
    detail:
      "G+3 and 6,667.73 m² are institution context; no footprint match is asserted.",
  },
  {
    label: "Boys' hostel · verified institution context",
    query: "Boys hostel at IIT Patna",
    detail:
      "8 storeys and 28,849 m² are institution-level facts; no footprint match is asserted.",
  },
] as const;

export function filterIitPatnaAutocomplete(query: string) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  return IIT_PATNA_AUTOCOMPLETE.filter(suggestion =>
    `${suggestion.label} ${suggestion.query}`.toLowerCase().includes(normalized)
  );
}
