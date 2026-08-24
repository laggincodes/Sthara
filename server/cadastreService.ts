import type { CadastreRecord } from "@shared/cadastre";

export type SearchResponse = {
  intent: string;
  answer: string;
  confidence: number;
  record: CadastreRecord | null;
  rationale: string;
  poweredBy: "AI semantic match" | "Catalog match" | "No records available";
};

export type UploadCategory = "geojson" | "floorplan";

export type UploadValidation = {
  accepted: boolean;
  score: number;
  checks: { label: string; state: "passed" | "warning" | "failed" }[];
  findings: string[];
  featureCount?: number;
};

function queryScore(record: CadastreRecord, query: string) {
  const normalized = query.toLowerCase();
  const searchable = [record.ulpin, record.title, record.parcel, record.building, record.unit, record.rights, record.status].join(" ").toLowerCase();
  const tokens = normalized.match(/[a-z0-9-]+/g) ?? [];
  return (searchable.includes(normalized) ? 8 : 0)
    + tokens.filter(token => token.length > 1 && searchable.includes(token)).length
    + (normalized.includes("verified") && record.status === "Verified" ? 3 : 0)
    + ((normalized.includes("conflict") || normalized.includes("review")) && record.status === "Review required" ? 3 : 0)
    + (normalized.includes(`floor ${record.floor}`) || normalized.includes(`f${record.floor}`) ? 2 : 0);
}

export function fallbackCadastreSearch(records: CadastreRecord[], query: string): SearchResponse {
  const record = [...records].sort((a, b) => queryScore(b, query) - queryScore(a, query))[0] ?? null;
  if (!record) {
    return { intent: "Find a registered vertical property record", answer: "No persisted ULPIN records are available yet. Upload approved cadastral data or add a record before searching.", confidence: 0, record: null, rationale: "The project catalog has no stored ULPIN records.", poweredBy: "No records available" };
  }
  const queryLower = query.toLowerCase();
  const intent = queryLower.includes("conflict") || queryLower.includes("review") ? "Find a property requiring cadastral review" : queryLower.includes("parking") ? "Find a parking-rights volume" : "Find a vertical property record";
  return { intent, answer: `${record.title} is ${record.status.toLowerCase()} under ${record.ulpin}. It occupies ${record.volume} between ${record.elevation}.`, confidence: Math.min(98, 76 + queryScore(record, query) * 3), record, rationale: `Matched against persisted parcel, building, unit, floor, rights, and validation-state fields for ${record.ulpin}.`, poweredBy: "Catalog match" };
}

export function mergeAiSearchResponse(records: CadastreRecord[], query: string, candidate: Partial<Pick<SearchResponse, "intent" | "answer" | "confidence" | "rationale">> & { ulpin?: string }): SearchResponse {
  const fallback = fallbackCadastreSearch(records, query);
  if (!fallback.record) return fallback;
  const record = candidate.ulpin ? records.find(item => item.ulpin === candidate.ulpin) ?? fallback.record : fallback.record;
  return { intent: candidate.intent?.trim() || fallback.intent, answer: candidate.answer?.trim() || fallback.answer, confidence: typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) ? Math.max(0, Math.min(100, Math.round(candidate.confidence))) : fallback.confidence, record, rationale: candidate.rationale?.trim() || fallback.rationale, poweredBy: "AI semantic match" };
}

function decodeBase64(value: string) {
  try { return Buffer.from(value, "base64"); } catch { return null; }
}

export function validateCadastreUpload(input: { category: UploadCategory; fileName: string; mimeType: string; dataBase64: string }): UploadValidation {
  const fileName = input.fileName.toLowerCase();
  const buffer = decodeBase64(input.dataBase64);
  const basicChecks: UploadValidation["checks"] = [{ label: "File signature received", state: buffer && buffer.length > 0 ? "passed" : "failed" }, { label: "File size within 7 MB limit", state: buffer && buffer.length <= 7 * 1024 * 1024 ? "passed" : "failed" }];
  if (!buffer || buffer.length === 0) return { accepted: false, score: 0, checks: basicChecks, findings: ["No file bytes were received. Choose a file and try again."] };
  if (buffer.length > 7 * 1024 * 1024) return { accepted: false, score: 0, checks: basicChecks, findings: ["The file exceeds the 7 MB demonstration upload limit."] };
  if (input.category === "geojson") {
    const extensionValid = fileName.endsWith(".geojson") || fileName.endsWith(".json");
    basicChecks.push({ label: "GeoJSON extension detected", state: extensionValid ? "passed" : "failed" });
    if (!extensionValid) return { accepted: false, score: 30, checks: basicChecks, findings: ["Use a .geojson or .json parcel layer."] };
    try {
      const parsed = JSON.parse(buffer.toString("utf8")) as { type?: string; features?: unknown[]; geometry?: unknown };
      const featureCount = parsed.type === "FeatureCollection" && Array.isArray(parsed.features) ? parsed.features.length : parsed.type === "Feature" && parsed.geometry ? 1 : 0;
      basicChecks.push({ label: "GeoJSON geometry structure", state: featureCount > 0 ? "passed" : "failed" }, { label: "Coordinate reference review", state: "warning" });
      if (!featureCount) return { accepted: false, score: 40, checks: basicChecks, findings: ["The JSON file does not contain a valid GeoJSON Feature or FeatureCollection."] };
      return { accepted: true, score: 88, featureCount, checks: basicChecks, findings: [`${featureCount} ${featureCount === 1 ? "feature" : "features"} detected. Confirm EPSG / CRS metadata during spatial processing.`] };
    } catch {
      basicChecks.push({ label: "GeoJSON geometry structure", state: "failed" });
      return { accepted: false, score: 35, checks: basicChecks, findings: ["The file cannot be parsed as JSON. Export a valid GeoJSON layer and try again."] };
    }
  }
  const isPdf = fileName.endsWith(".pdf") || input.mimeType === "application/pdf";
  const isImage = /\.(png|jpe?g)$/i.test(fileName) || input.mimeType.startsWith("image/");
  basicChecks.push({ label: "Floor-plan format detected", state: isPdf || isImage ? "passed" : "failed" }, { label: "Plan georeference required", state: "warning" });
  if (!isPdf && !isImage) return { accepted: false, score: 30, checks: basicChecks, findings: ["Upload a PDF, PNG, or JPG floor plan."] };
  return { accepted: true, score: 81, checks: basicChecks, findings: ["Plan format is ready for extraction. Add a scale, north reference, and building identifier during the next review step."] };
}
