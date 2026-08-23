import { invokeLLM } from "./_core/llm";

export type EvidenceExtraction = {
  sourceType: "geojson" | "floorplan";
  buildingName: string | null;
  footprintCount: number;
  detectedFloorCount: number | null;
  floorLabels: string[];
  unitLabels: string[];
  confidence: number;
  needsGeoreference: boolean;
  normalizedFootprint: { x: number; y: number }[];
  summary: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function extractEvidenceMetadata(input: {
  category: "geojson" | "floorplan";
  dataBase64: string;
  mimeType: string;
  signedUrl: string;
}): Promise<EvidenceExtraction> {
  if (input.category === "geojson") {
    const parsed = JSON.parse(Buffer.from(input.dataBase64, "base64").toString("utf8")) as {
      features?: { geometry?: { type?: string }; properties?: Record<string, unknown> }[];
    };
    const features = Array.isArray(parsed.features) ? parsed.features : [];
    const footprints = features.filter(feature => ["Polygon", "MultiPolygon"].includes(feature.geometry?.type ?? ""));
    const propertySample = features.slice(0, 10).map(feature => feature.properties ?? {});
    const aiResult = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: "Extract only explicit building and floor metadata from the provided GeoJSON properties. Never invent a ULPIN, floor, or building name. Return JSON only." },
        { role: "user", content: `Feature count: ${features.length}. Polygon footprint count: ${footprints.length}. Properties sample: ${JSON.stringify(propertySample)}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "geojson_evidence_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              buildingName: { type: ["string", "null"] },
              detectedFloorCount: { type: ["integer", "null"] },
              floorLabels: { type: "array", items: { type: "string" } },
              unitLabels: { type: "array", items: { type: "string" } },
              confidence: { type: "integer" },
              summary: { type: "string" },
            },
            required: ["buildingName", "detectedFloorCount", "floorLabels", "unitLabels", "confidence", "summary"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = aiResult.choices[0]?.message.content;
    const metadata = typeof content === "string" ? JSON.parse(content) as Record<string, unknown> : {};
    return {
      sourceType: "geojson",
      buildingName: asText(metadata.buildingName),
      footprintCount: footprints.length,
      detectedFloorCount: typeof metadata.detectedFloorCount === "number" ? metadata.detectedFloorCount : null,
      floorLabels: Array.isArray(metadata.floorLabels) ? metadata.floorLabels.filter((item): item is string => typeof item === "string") : [],
      unitLabels: Array.isArray(metadata.unitLabels) ? metadata.unitLabels.filter((item): item is string => typeof item === "string") : [],
      confidence: typeof metadata.confidence === "number" ? Math.max(0, Math.min(100, metadata.confidence)) : 0,
      needsGeoreference: false,
      normalizedFootprint: [],
      summary: asText(metadata.summary) ?? `${footprints.length} polygon footprints identified from the uploaded GeoJSON layer.`,
    };
  }

  const isImage = input.mimeType.startsWith("image/");
  const aiResult = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You extract explicit building name, floor count, floor labels, unit labels, and the exterior building footprint from a floor plan. For the footprint, return only a simple clockwise polygon in normalized page coordinates where x and y range from 0 to 1. Do not invent map coordinates or a ULPIN. If the exterior boundary is not visible, return an empty outline. A floor plan must still be georeferenced before its footprint can be inserted into a cadastral map. Return JSON only." },
      { role: "user", content: isImage ? [{ type: "image_url", image_url: { url: input.signedUrl, detail: "high" } }] : [{ type: "file_url", file_url: { url: input.signedUrl, mime_type: "application/pdf" } }] },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "floorplan_evidence_metadata",
        strict: true,
        schema: {
            type: "object",
            properties: {
            buildingName: { type: ["string", "null"] },
            detectedFloorCount: { type: ["integer", "null"] },
            floorLabels: { type: "array", items: { type: "string" } },
            unitLabels: { type: "array", items: { type: "string" } },
              confidence: { type: "integer" },
              normalizedFootprint: {
                type: "array",
                items: {
                  type: "object",
                  properties: { x: { type: "number" }, y: { type: "number" } },
                  required: ["x", "y"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
          required: ["buildingName", "detectedFloorCount", "floorLabels", "unitLabels", "confidence", "normalizedFootprint", "summary"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = aiResult.choices[0]?.message.content;
  const metadata = typeof content === "string" ? JSON.parse(content) as Record<string, unknown> : {};
  const normalizedFootprint: { x: number; y: number }[] = [];
  if (Array.isArray(metadata.normalizedFootprint)) {
    for (const point of metadata.normalizedFootprint) {
      const candidate = point as { x?: unknown; y?: unknown } | null;
      if (!candidate || typeof candidate.x !== "number" || typeof candidate.y !== "number") continue;
      normalizedFootprint.push({ x: Math.max(0, Math.min(1, candidate.x)), y: Math.max(0, Math.min(1, candidate.y)) });
    }
  }
  return {
    sourceType: "floorplan",
    buildingName: asText(metadata.buildingName),
    footprintCount: normalizedFootprint.length >= 3 ? 1 : 0,
    detectedFloorCount: typeof metadata.detectedFloorCount === "number" ? metadata.detectedFloorCount : null,
    floorLabels: Array.isArray(metadata.floorLabels) ? metadata.floorLabels.filter((item): item is string => typeof item === "string") : [],
    unitLabels: Array.isArray(metadata.unitLabels) ? metadata.unitLabels.filter((item): item is string => typeof item === "string") : [],
    confidence: typeof metadata.confidence === "number" ? Math.max(0, Math.min(100, metadata.confidence)) : 0,
    needsGeoreference: true,
    normalizedFootprint,
    summary: asText(metadata.summary) ?? "Floor-plan metadata extracted. Add georeferencing before publishing a footprint to the 3D map.",
  };
}
