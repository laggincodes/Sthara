type AcademicBlock4Evidence = {
  displayLabel: string;
  evidenceTier: string;
  statedInstitutionalFacts: {
    storeys: string;
    totalFloorAreaSquareMetres: number;
    areaDescription: string;
  };
  officialSourceCitations: Array<{
    label: string;
    url: string;
    availabilityAtValidation: string;
  }>;
  independentValidationStatus: string;
  activeLocks: Record<string, string>;
};

export function buildAcademicBlock4PdfLines(evidence: AcademicBlock4Evidence) {
  const factLines = [
    `Evidence tier: ${evidence.evidenceTier.replaceAll("_", " ")}`,
    `Storeys: ${evidence.statedInstitutionalFacts.storeys}`,
    `Total floor area: ${evidence.statedInstitutionalFacts.totalFloorAreaSquareMetres.toLocaleString()} m² (${evidence.statedInstitutionalFacts.areaDescription})`,
    `Validation status: ${evidence.independentValidationStatus}`,
  ];
  const citationLines = evidence.officialSourceCitations.flatMap(source => [
    `${source.label}`,
    `${source.url}`,
    `Availability at validation: ${source.availabilityAtValidation}`,
  ]);
  const lockLines = Object.entries(evidence.activeLocks).map(
    ([key, detail]) => `${key}: ${detail}`
  );
  return { factLines, citationLines, lockLines };
}
