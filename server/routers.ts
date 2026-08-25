import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  fallbackCadastreSearch,
  mergeAiSearchResponse,
  validateCadastreUpload,
} from "./cadastreService";
import {
  createAuditLog,
  createEvidenceFile,
  createIssueReport,
  createVerificationSubmission,
  ensureCadastreSeedData,
  getCadastreRecords,
  getPlatformDashboardSummary,
  getPlatformUsers,
  getRecentAuditLogs,
  getUserByOpenId,
  getVerificationSubmissions,
  reviewVerificationSubmission,
  setPlatformUserRole,
} from "./db";
import { extractEvidenceMetadata } from "./evidenceExtraction";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  authorityProcedure,
  governmentProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  confirmedSourceAlias,
  eligibleSourceAliases,
  sourceBackedSearchAliases,
} from "./buildingSearchAliases";
import { buildPlaceIntelligence } from "./placeIntelligence";
import {
  getPostgisFeatureCollection,
  searchPostgisLayeredArea,
  updatePostgisFootprint,
  upsertPostgisGeoJsonFeatures,
} from "./postgis";
import { buildSyntheticGcpDemoResult } from "../shared/syntheticGcpDemo";
import { storageGetSignedUrl, storagePut } from "./storage";

const aiSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Ask a little more specifically.")
    .max(280, "Keep the query under 280 characters."),
});

const uploadInput = z.object({
  category: z.enum(["geojson", "floorplan"]),
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(4).max(10_000_000),
});

const footprintUpdateInput = z.object({
  ulpin: z.string().trim().min(3).max(96),
  geometry: z
    .object({
      type: z.enum(["Polygon", "MultiPolygon"]),
      coordinates: z.unknown(),
    })
    .optional(),
  approvedHeightMetres: z.number().positive().max(600).optional(),
  heightSource: z.string().trim().max(240).optional(),
  ownershipRecord: z
    .object({
      parcelReference: z.string().trim().min(2).max(128),
      ulpinRecord: z.string().trim().min(3).max(128),
      ownerName: z.string().trim().min(2).max(240),
      ownershipBasis: z.string().trim().min(3).max(400),
      rightsSummary: z.string().trim().max(800).optional(),
      sourceReference: z.string().trim().max(400).optional(),
    })
    .optional(),
  editNote: z.string().trim().min(8).max(1200),
});

const layeredAreaSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Enter a site, ULPIN, parcel, or ownership reference.")
    .max(180),
});

const buildingResolutionInput = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Enter a building or place to resolve.")
    .max(180),
});

const issueReportInput = z.object({
  recordReference: z.string().trim().min(3).max(128),
  category: z.enum([
    "footprint",
    "floor_count",
    "location",
    "missing_property",
    "parcel_boundary",
  ]),
  details: z.string().trim().min(12).max(2_000),
});

const evidenceSubmissionInput = z.object({
  recordReference: z.string().trim().min(3).max(128),
  submissionType: z.enum([
    "geometry",
    "height",
    "floor_count",
    "floor_plan",
    "survey",
  ]),
  sourceUrl: z.string().url().optional(),
  sourceReference: z.string().trim().min(4).max(320),
  notes: z.string().trim().min(12).max(3_000),
});

const reviewSubmissionInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(["under_review", "verified", "rejected"]),
  reviewNote: z.string().trim().min(8).max(3_000),
});

const assignRoleInput = z.object({
  openId: z.string().trim().min(3).max(64),
  role: z.enum(["citizen", "authority", "government_employee", "admin"]),
});

function safeFileName(fileName: string) {
  return (
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "upload"
  );
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async opts => {
      if (!opts.ctx.user) return null;
      return (await getUserByOpenId(opts.ctx.user.openId)) ?? opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  postgis: router({
    geojson: publicProcedure.query(async () => getPostgisFeatureCollection()),
    syntheticGcpDemo: publicProcedure.query(() =>
      buildSyntheticGcpDemoResult()
    ),
    areaSearch: publicProcedure
      .input(layeredAreaSearchInput)
      .query(async ({ input }) => searchPostgisLayeredArea(input.query)),
    placeFacts: publicProcedure
      .input(layeredAreaSearchInput)
      .query(async ({ input }) =>
        buildPlaceIntelligence(await searchPostgisLayeredArea(input.query))
      ),
    resolveBuilding: publicProcedure
      .input(buildingResolutionInput)
      .mutation(async ({ input }) => {
        const direct = await searchPostgisLayeredArea(input.query);
        if (direct.buildingCount > 0)
          return {
            ...direct,
            resolvedQuery: input.query,
            resolution: "direct-source-match" as const,
            rationale: "Matched directly against live source-backed geometry.",
          };
        const candidateAliases = eligibleSourceAliases(input.query);
        if (candidateAliases.length === 0)
          return {
            ...direct,
            resolvedQuery: input.query,
            resolution: "unavailable" as const,
            rationale:
              "No live source-backed building geometry matches this search.",
          };
        try {
          const response = await invokeLLM({
            model: "gpt-5-mini",
            messages: [
              {
                role: "system",
                content:
                  "Resolve the user query to at most one item from the supplied source-backed alias catalog. Return JSON only. Do not invent locations, buildings, heights, floors, owners, ULPINs, or geometry. Use 'none' when no catalog alias is justified.",
              },
              {
                role: "user",
                content: `Query: ${input.query}\nLexically eligible source-backed aliases: ${JSON.stringify(candidateAliases)}`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "source_backed_building_resolution",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    alias: { type: "string" },
                    confidence: { type: "number" },
                    rationale: { type: "string" },
                  },
                  required: ["alias", "confidence", "rationale"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response.choices[0]?.message.content;
          const parsed =
            content && typeof content === "string"
              ? (JSON.parse(content) as {
                  alias?: string;
                  confidence?: number;
                  rationale?: string;
                })
              : null;
          const alias = confirmedSourceAlias(
            input.query,
            parsed?.alias,
            parsed?.confidence
          );
          if (!alias)
            return {
              ...direct,
              resolvedQuery: input.query,
              resolution: "unavailable" as const,
              rationale:
                "No live source-backed building geometry matches this search.",
            };
          const resolved = await searchPostgisLayeredArea(alias);
          if (resolved.buildingCount === 0)
            return {
              ...direct,
              resolvedQuery: input.query,
              resolution: "unavailable" as const,
              rationale: "The suggested alias has no current live geometry.",
            };
          return {
            ...resolved,
            resolvedQuery: alias,
            resolution: "ai-assisted-source-alias" as const,
            confidence: Math.max(0, Math.min(1, parsed?.confidence ?? 0)),
            rationale:
              "AI routed the request to an existing source-backed area; rendered geometry is live PostGIS data.",
          };
        } catch (error) {
          console.warn(
            "[PostGIS resolver] AI alias resolution unavailable.",
            error
          );
          return {
            ...direct,
            resolvedQuery: input.query,
            resolution: "unavailable" as const,
            rationale:
              "No live source-backed building geometry matches this search.",
          };
        }
      }),
    updateFootprint: adminProcedure
      .input(footprintUpdateInput)
      .mutation(async ({ input, ctx }) => {
        const result = await updatePostgisFootprint({
          ...input,
          editorName: ctx.user.name?.trim() || ctx.user.openId,
        });
        await createAuditLog({
          actorOpenId: ctx.user.openId,
          actorRole: ctx.user.role,
          action: "authoritative_footprint_updated",
          entityType: "postgis_footprint",
          entityId: input.ulpin,
          newValue: JSON.stringify({
            hasGeometry: Boolean(input.geometry),
            approvedHeightMetres: input.approvedHeightMetres ?? null,
          }),
        });
        return result;
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
              content:
                "You are the semantic search assistant for a vertical cadastre system. Match only against the supplied catalog. Return JSON only. Never invent parcels, ownership, rights, or validation facts.",
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
                required: [
                  "ulpin",
                  "intent",
                  "answer",
                  "confidence",
                  "rationale",
                ],
                additionalProperties: false,
              },
            },
          },
        });
        const content = modelResponse.choices[0]?.message.content;
        if (!content || typeof content !== "string") return fallback;
        const parsed = JSON.parse(content) as {
          ulpin?: string;
          intent?: string;
          answer?: string;
          confidence?: number;
          rationale?: string;
        };
        return mergeAiSearchResponse(catalog, input.query, parsed);
      } catch (error) {
        console.warn(
          "[Cadastre search] AI semantic search unavailable; returning catalog match.",
          error
        );
        return fallback;
      }
    }),
    upload: authorityProcedure
      .input(uploadInput)
      .mutation(async ({ input, ctx }) => {
        const validation = validateCadastreUpload(input);
        if (!validation.accepted) return { stored: false, validation };
        const buffer = Buffer.from(input.dataBase64, "base64");
        const keyPrefix =
          input.category === "geojson"
            ? "cadastre/geojson"
            : "cadastre/floor-plans";
        const stored = await storagePut(
          `${keyPrefix}/${Date.now()}-${safeFileName(input.fileName)}`,
          buffer,
          input.mimeType
        );
        const signedUrl = await storageGetSignedUrl(stored.key);
        let extraction = null;
        let spatialImport = { imported: 0, skipped: 0 };
        try {
          extraction = await extractEvidenceMetadata({
            category: input.category,
            dataBase64: input.dataBase64,
            mimeType: input.mimeType,
            signedUrl,
          });
          if (input.category === "geojson") {
            const parsed = JSON.parse(buffer.toString("utf8"));
            spatialImport = await upsertPostgisGeoJsonFeatures(parsed);
          }
        } catch (error) {
          console.warn(
            "[Cadastre upload] AI extraction or PostGIS geometry import could not complete.",
            error
          );
        }
        const persisted = await createEvidenceFile({
          name: input.fileName,
          category: input.category,
          mimeType: input.mimeType,
          storageKey: stored.key,
          storageUrl: stored.url,
          validationScore: validation.score,
          validationSummary: validation.findings.join(" "),
        });
        await createAuditLog({
          actorOpenId: ctx.user.openId,
          actorRole: ctx.user.role,
          action: "evidence_file_uploaded",
          entityType: "evidence_file",
          entityId: stored.key,
          newValue: JSON.stringify({
            category: input.category,
            name: input.fileName,
          }),
        });
        return {
          stored: true,
          persisted,
          validation,
          extraction,
          spatialImport,
          file: {
            key: stored.key,
            url: stored.url,
            name: input.fileName,
            category: input.category,
          },
        };
      }),
  }),
  platform: router({
    dashboardSummary: protectedProcedure.query(async () =>
      getPlatformDashboardSummary()
    ),
    reportIssue: protectedProcedure
      .input(issueReportInput)
      .mutation(async ({ input, ctx }) =>
        createIssueReport({
          ...input,
          reportedBy: ctx.user.openId,
          actorRole: ctx.user.role,
        })
      ),
    submitEvidence: authorityProcedure
      .input(evidenceSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        createVerificationSubmission({
          ...input,
          submittedBy: ctx.user.openId,
          actorRole: ctx.user.role,
        })
      ),
    verificationQueue: authorityProcedure.query(async () =>
      getVerificationSubmissions()
    ),
    reviewEvidence: authorityProcedure
      .input(reviewSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        reviewVerificationSubmission({
          ...input,
          reviewerOpenId: ctx.user.openId,
          reviewerRole: ctx.user.role,
        })
      ),
    governmentSummary: governmentProcedure.query(async () =>
      getPlatformDashboardSummary()
    ),
    adminUsers: adminProcedure.query(async () => getPlatformUsers()),
    assignRole: adminProcedure
      .input(assignRoleInput)
      .mutation(async ({ input, ctx }) => {
        if (input.openId === ctx.user.openId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators cannot change their own role.",
          });
        }
        return setPlatformUserRole({
          ...input,
          actorOpenId: ctx.user.openId,
          actorRole: ctx.user.role,
        });
      }),
    auditLogs: adminProcedure.query(async () => getRecentAuditLogs()),
  }),
});

export type AppRouter = typeof appRouter;
