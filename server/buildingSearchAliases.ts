export const sourceBackedSearchAliases = ["Amity University Patna", "Koramangala 5th Block", "cimage"] as const;

export type SourceBackedAlias = (typeof sourceBackedSearchAliases)[number];

const sourceAliasAnchors: Record<SourceBackedAlias, string[]> = {
  "Amity University Patna": ["amity", "rupaspur", "cimage"],
  "Koramangala 5th Block": ["koramangala", "5th block", "south bengaluru"],
  cimage: ["cimage"],
};

export function eligibleSourceAliases(query: string): SourceBackedAlias[] {
  const normalized = query.toLowerCase();
  return sourceBackedSearchAliases.filter(alias => sourceAliasAnchors[alias].some(anchor => normalized.includes(anchor)));
}

export function confirmedSourceAlias(query: string, alias: unknown, confidence: unknown): SourceBackedAlias | null {
  if (typeof alias !== "string" || typeof confidence !== "number" || confidence < 0.6) return null;
  return eligibleSourceAliases(query).find(candidate => candidate === alias) ?? null;
}
