import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { fallbackCadastreSearch, mergeAiSearchResponse, validateCadastreUpload } from "./cadastreService";
import { createEvidenceFile, ensureCadastreSeedData, getCadastreRecords } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

const aiSearchInput = z.object({
  query: z.string().trim().min(3, "Ask a little more specifically.").max(280, "Keep the query under 280 characters."),
});

const uploadInput = z.object({
  category: z.enum(["geojson", "floorplan"]),
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(4).max(10_000_000),
});

function safeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  cadastre: router({
    search: publicProcedure.input(aiSearchInput).mutation(async ({ input }) => {
      await ensureCadastreSeedData();
      const catalog = await getCadastreRecords();
      const fallback = fallbackCadastreSearch(catalog, input.query);
      if (!fallback.record) return fallback;
      try {
        const modelResponse = await invokeLLM({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: "You are the semantic search assistant for a vertical cadastre system. Match only against the supplied catalog. Return JSON only. Never invent parcels, ownership, rights, or validation facts.",
            },
            {
              role: "user",
              content: `Query: ${input.query}\n\nRegistered catalog: ${JSON.stringify(catalog.map(({ ulpin, title, parcel, building, unit, floor, status, rights }) => ({ ulpin, title, parcel, building, unit, floor, status, rights })))}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "cadastre_search_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  ulpin: { type: "string" },
                  intent: { type: "string" },
                  answer: { type: "string" },
                  confidence: { type: "number" },
                  rationale: { type: "string" },
                },
                required: ["ulpin", "intent", "answer", "confidence", "rationale"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = modelResponse.choices[0]?.message.content;
        if (!content || typeof content !== "string") return fallback;
        const parsed = JSON.parse(content) as { ulpin?: string; intent?: string; answer?: string; confidence?: number; rationale?: string };
        return mergeAiSearchResponse(catalog, input.query, parsed);
      } catch (error) {
        console.warn("[Cadastre search] AI semantic search unavailable; returning catalog match.", error);
        return fallback;
      }
    }),
    upload: publicProcedure.input(uploadInput).mutation(async ({ input }) => {
      const validation = validateCadastreUpload(input);
      if (!validation.accepted) return { stored: false, validation };
      const buffer = Buffer.from(input.dataBase64, "base64");
      const keyPrefix = input.category === "geojson" ? "cadastre/geojson" : "cadastre/floor-plans";
      const stored = await storagePut(`${keyPrefix}/${Date.now()}-${safeFileName(input.fileName)}`, buffer, input.mimeType);
      const persisted = await createEvidenceFile({
        name: input.fileName,
        category: input.category,
        mimeType: input.mimeType,
        storageKey: stored.key,
        storageUrl: stored.url,
        validationScore: validation.score,
        validationSummary: validation.findings.join(" "),
      });
      return {
        stored: true,
        persisted,
        validation,
        file: { key: stored.key, url: stored.url, name: input.fileName, category: input.category },
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
