import { z } from "zod";
import {
  fallbackCadastreSearch,
  mergeAiSearchResponse,
  validateCadastreUpload,
} from "./cadastreService";
import {
  createAuditLog,
  createDepartment,
  createDistrict,
  createEvidenceFile,
  createIssueReport,
  createOrganization,
  createVerificationSubmission,
  ensureCadastreSeedData,
  getAdminDashboardStats,
  getAuditLogsFiltered,
  getAuthorityDashboardStats,
  getCadastreFiltered,
  getCadastreRecords,
  getCertificateData,
  getCitizenDashboardStats,
  getConflictAlerts,
  getDepartments,
  getDistricts,
  getOrganizations,
  getPlatformDashboardSummary,
  getPlatformUsers,
  getRecentAuditLogs,
  getAdminSurveillanceMetrics,
  getUserActivityRoster,
  getAssignedSurveyMissions,
  getSurveyorDashboardStats,
  getUserByClerkUserId,
  getVerificationSubmissions,
  getBuildingFloorStack,
  getAllBuildingFloorStacks,
  getUnitCadastreDetails,
  createCadastralGrievance,
  getCadastralGrievances,
  getGrievanceById,
  rejectGrievanceByAuthority,
  assignGrievanceToSurveyor,
  submitSurveyorVerificationReport,
  executeEnforcementOrder,
  getGrievanceStats,
  inviteAuthorityUser,
  reviewVerificationSubmission,
  setPlatformUserRole,
  setPlatformUserStatus,
  updateUserJurisdiction,
} from "./db";
import { citizenGrievanceInputSchema } from "@shared/cadastralGrievance";
import { extractEvidenceMetadata } from "./evidenceExtraction";
import {
  getPendingClerkInvitations,
  resendClerkStaffInvitation,
  createClerkStaffInvitation,
} from "./clerkInvitationService";
import {
  createInvitationTokenRecord,
  verifyInvitationToken,
  acceptInvitationAndSetPassword,
  getAllInvitations,
  revokeInvitationToken,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPasswordWithToken,
} from "./invitationTokenService";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  authorityAdminProcedure,
  authorityProcedure,
  citizenProcedure,
  governmentProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  superAdminProcedure,
  surveyorProcedure,
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
import {
  ALL_PERMISSIONS,
  canonicalRole,
  formatRole,
  getPermissionsForRole,
  PlatformRoles,
  ROLE_PERMISSIONS,
  UserStatuses,
} from "@shared/permissions";

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

const footprintUpdateInput = z
  .object({
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
  })
  .superRefine((value, ctx) => {
    if (value.approvedHeightMetres && !value.heightSource?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["heightSource"],
        message:
          "An authority-issued height source reference is required before saving an extrusion height.",
      });
    }
    if (value.ownershipRecord && !value.ownershipRecord.sourceReference?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownershipRecord", "sourceReference"],
        message:
          "A verified ownership or parcel source reference is required before linking ownership data.",
      });
    }
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
  clerkUserId: z.string().trim().min(3).max(96),
  role: z.enum([
    "SUPER_ADMIN",
    "AUTHORITY_ADMIN",
    "AUTHORITY_OFFICER",
    "GOVERNMENT_EMPLOYEE",
    "SURVEYOR",
    "CITIZEN",
    "citizen",
    "authority",
    "government_employee",
    "admin",
  ]),
});

const userStatusInput = z.object({
  clerkUserId: z.string().trim().min(3).max(96),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DISABLED"]),
  reason: z.string().optional(),
});

const inviteAuthorityInput = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email("Valid official government email required"),
  phone: z.string().trim().max(32).optional(),
  role: z.enum([
    "AUTHORITY_ADMIN",
    "AUTHORITY_OFFICER",
    "GOVERNMENT_EMPLOYEE",
    "SURVEYOR",
  ]),
  departmentId: z.number().int().positive().optional(),
  districtId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  jurisdiction: z.string().trim().max(320).optional(),
  designation: z.string().trim().max(160).optional(),
});

const updateJurisdictionInput = z.object({
  clerkUserId: z.string().trim().min(3).max(96),
  departmentId: z.number().int().positive().nullable().optional(),
  districtId: z.number().int().positive().nullable().optional(),
  organizationId: z.number().int().positive().nullable().optional(),
  jurisdiction: z.string().trim().max(320).nullable().optional(),
  designation: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
});

const acceptInvitationInput = z.object({
  token: z.string().trim().min(1, "Invitation token is required."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long."),
});

const forgotPasswordInput = z.object({
  email: z.string().trim().email("Valid official email required."),
});

const resetPasswordInput = z.object({
  token: z.string().trim().min(1, "Reset token is required."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long."),
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
      const dbUser =
        (await getUserByClerkUserId(opts.ctx.user.clerkUserId)) ?? opts.ctx.user;
      const canon = canonicalRole(dbUser.role);
      const permissions = getPermissionsForRole(canon);
      const roleTitle = formatRole(canon);

      return {
        ...dbUser,
        canonicalRole: canon,
        roleTitle,
        permissions,
      };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user) {
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "LOGOUT",
          entityType: "session",
          entityId: ctx.user.clerkUserId,
        });
      }
      return { success: true } as const;
    }),

    verifyInvitationToken: publicProcedure
      .input(z.object({ token: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        return verifyInvitationToken(input.token);
      }),

    acceptInvitation: publicProcedure
      .input(acceptInvitationInput)
      .mutation(async ({ input }) => {
        try {
          return await acceptInvitationAndSetPassword(input);
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "Failed to activate account.",
          });
        }
      }),

    forgotPassword: publicProcedure
      .input(forgotPasswordInput)
      .mutation(async ({ input }) => {
        return requestPasswordReset(input.email);
      }),

    verifyResetToken: publicProcedure
      .input(z.object({ token: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        return verifyPasswordResetToken(input.token);
      }),

    resetPassword: publicProcedure
      .input(resetPasswordInput)
      .mutation(async ({ input }) => {
        try {
          return await resetPasswordWithToken(input);
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "Failed to reset password.",
          });
        }
      }),
  }),

  // Super Admin Control Room Router
  admin: router({
    stats: superAdminProcedure.query(async () => getAdminDashboardStats()),

    users: superAdminProcedure
      .input(
        z
          .object({
            query: z.string().optional(),
            role: z.string().optional(),
            status: z.string().optional(),
            departmentId: z.number().optional(),
            districtId: z.number().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => getPlatformUsers(input)),

    inviteAuthority: superAdminProcedure
      .input(inviteAuthorityInput)
      .mutation(async ({ input, ctx }) => {
        const tokenRecord = await createInvitationTokenRecord(input, {
          clerkUserId: ctx.user.clerkUserId,
          role: ctx.user.role,
          name: ctx.user.name,
          email: ctx.user.email,
        });

        const clerkResult = await createClerkStaffInvitation({
          email: input.email,
          role: input.role,
          departmentId: input.departmentId,
          districtId: input.districtId,
          organizationId: input.organizationId,
          designation: input.designation,
          redirectUrl: tokenRecord.invitationUrl,
        });

        return {
          success: true,
          email: input.email,
          role: input.role,
          invitationId: tokenRecord.invitationId,
          invitationUrl: tokenRecord.invitationUrl,
          rawToken: tokenRecord.rawToken,
          expiresAt: tokenRecord.expiresAt,
          clerkResult,
        };
      }),

    invitations: superAdminProcedure.query(async () => {
      return getAllInvitations();
    }),

    revokeInvitation: superAdminProcedure
      .input(z.object({ invitationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        return revokeInvitationToken(input.invitationId, {
          clerkUserId: ctx.user.clerkUserId,
          role: ctx.user.role,
          name: ctx.user.name,
          email: ctx.user.email,
        });
      }),

    pendingInvitations: superAdminProcedure.query(async () =>
      getPendingClerkInvitations()
    ),

    resendInvitation: superAdminProcedure
      .input(
        z.object({
          email: z.string().trim().email(),
          role: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await resendClerkStaffInvitation(
          input.email,
          input.role
        );
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "AUTHORITY_INVITATION_RESENT",
          entityType: "authority_invitation",
          entityId: input.email,
          targetResource: input.email,
          newValue: JSON.stringify(result),
        });
        return result;
      }),

    updateRole: superAdminProcedure
      .input(assignRoleInput)
      .mutation(async ({ input, ctx }) => {
        if (input.clerkUserId === ctx.user.clerkUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators cannot change their own role.",
          });
        }
        return setPlatformUserRole({
          clerkUserId: input.clerkUserId,
          role: input.role,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        });
      }),

    updateStatus: superAdminProcedure
      .input(userStatusInput)
      .mutation(async ({ input, ctx }) => {
        if (input.clerkUserId === ctx.user.clerkUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators cannot suspend or disable their own account.",
          });
        }
        return setPlatformUserStatus({
          clerkUserId: input.clerkUserId,
          status: input.status,
          reason: input.reason,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        });
      }),

    updateJurisdiction: superAdminProcedure
      .input(updateJurisdictionInput)
      .mutation(async ({ input, ctx }) =>
        updateUserJurisdiction({
          ...input,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        })
      ),

    departments: superAdminProcedure.query(async () => getDepartments()),

    createDepartment: superAdminProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(160),
          code: z.string().trim().min(2).max(48),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) =>
        createDepartment(input, {
          clerkUserId: ctx.user.clerkUserId,
          role: ctx.user.role,
          name: ctx.user.name,
        })
      ),

    districts: superAdminProcedure.query(async () => getDistricts()),

    createDistrict: superAdminProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          state: z.string().trim().default("Bihar"),
          code: z.string().trim().min(2).max(48),
        })
      )
      .mutation(async ({ input, ctx }) =>
        createDistrict(input, {
          clerkUserId: ctx.user.clerkUserId,
          role: ctx.user.role,
          name: ctx.user.name,
        })
      ),

    organizations: superAdminProcedure.query(async () => getOrganizations()),

    createOrganization: superAdminProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(160),
          type: z.string().trim().min(2).max(80),
        })
      )
      .mutation(async ({ input, ctx }) =>
        createOrganization(input, {
          clerkUserId: ctx.user.clerkUserId,
          role: ctx.user.role,
          name: ctx.user.name,
        })
      ),

    rolesAndPermissions: superAdminProcedure.query(() => ({
      roles: Object.values(PlatformRoles),
      permissions: ALL_PERMISSIONS,
      rolePermissions: ROLE_PERMISSIONS,
    })),

    surveillanceStats: superAdminProcedure.query(async () =>
      getAdminSurveillanceMetrics()
    ),

    userActivityRoster: superAdminProcedure.query(async () =>
      getUserActivityRoster()
    ),

    auditLogs: superAdminProcedure
      .input(
        z
          .object({
            search: z.string().optional(),
            actorClerkUserId: z.string().optional(),
            actorRole: z.string().optional(),
            action: z.string().optional(),
            targetUserId: z.string().optional(),
            departmentId: z.number().optional(),
            districtId: z.number().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => getAuditLogsFiltered(input)),

    settings: superAdminProcedure.query(() => ({
      access: "server-assigned-administrator-only" as const,
      sections: [
        "Role assignment & Permissions Matrix",
        "Authority & Staff Invitation Protocol",
        "Jurisdiction & Department Hierarchy",
        "Immutable Audit Trail Inspection",
        "3D Evidence Ladder Policy",
      ],
      note:
        "Security settings and authorization are strictly enforced by backend procedures and Neon PostgreSQL database state.",
    })),
  }),

  // Authority Operations Router
  authority: router({
    stats: authorityProcedure.query(async ({ ctx }) =>
      getAuthorityDashboardStats(ctx.user)
    ),
    assignedProperties: authorityProcedure.query(async () =>
      getCadastreRecords()
    ),
    verificationQueue: authorityProcedure.query(async () =>
      getVerificationSubmissions()
    ),
    verifyProperty: authorityProcedure
      .input(reviewSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        reviewVerificationSubmission({
          ...input,
          reviewerClerkUserId: ctx.user.clerkUserId,
          reviewerRole: ctx.user.role,
          reviewerName: ctx.user.name,
        })
      ),
    submitEvidence: authorityProcedure
      .input(evidenceSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        createVerificationSubmission({
          ...input,
          submittedByClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        })
      ),
    officers: authorityAdminProcedure.query(async () =>
      getPlatformUsers({ role: PlatformRoles.AUTHORITY_OFFICER })
    ),
    assignSurveyTask: authorityProcedure
      .input(
        z.object({
          parcelReference: z.string().trim().min(2),
          surveyorClerkUserId: z.string().trim().min(3),
          instructions: z.string().trim().min(6),
          priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "SURVEY_MISSION_DISPATCHED",
          entityType: "survey_mission",
          entityId: input.parcelReference,
          targetUserId: input.surveyorClerkUserId,
          newValue: JSON.stringify(input),
        });
        return {
          success: true,
          message: `Survey mission dispatched to field surveyor for parcel ${input.parcelReference}.`,
        };
      }),
  }),

  // Government Operations Router
  government: router({
    stats: governmentProcedure.query(async () =>
      getPlatformDashboardSummary()
    ),
    departments: governmentProcedure.query(async () => getDepartments()),
    districts: governmentProcedure.query(async () => getDistricts()),
    cadastreCatalog: governmentProcedure
      .input(
        z
          .object({
            query: z.string().optional(),
            districtId: z.number().optional(),
            status: z.string().optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => getCadastreFiltered(input)),
    generateCertificateData: governmentProcedure
      .input(z.object({ ulpinOrReference: z.string().trim().min(2) }))
      .query(async ({ input, ctx }) => {
        const cert = await getCertificateData(input.ulpinOrReference);
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "OFFICIAL_3D_CERTIFICATE_GENERATED",
          entityType: "certificate",
          entityId: cert.ulpin,
          targetResource: cert.ulpin,
          newValue: JSON.stringify({
            certificateNumber: cert.certificateNumber,
            ulpin: cert.ulpin,
            generatedAt: new Date().toISOString(),
          }),
        });
        return cert;
      }),
    conflictAlerts: governmentProcedure.query(async () => getConflictAlerts()),
  }),

  // Field Surveyor Workspace Router
  surveyor: router({
    stats: surveyorProcedure.query(async ({ ctx }) =>
      getSurveyorDashboardStats(ctx.user)
    ),
    assignedMissions: surveyorProcedure.query(async ({ ctx }) =>
      getAssignedSurveyMissions(ctx.user.clerkUserId)
    ),
    submitGcpMeasurement: surveyorProcedure
      .input(
        z.object({
          pointCode: z.string().trim().min(2).max(48),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          ellipsoidalHeight: z.number(),
          rtkAccuracyCm: z.number().positive().max(100).default(2.5),
          markerType: z.string().trim().default("BENCHMARK_PILLAR"),
          notes: z.string().trim().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "GCP_BENCHMARK_RECORDED",
          entityType: "gcp_measurement",
          entityId: input.pointCode,
          newValue: JSON.stringify(input),
        });
        return {
          success: true,
          pointCode: input.pointCode,
          recordedAt: new Date().toISOString(),
          accuracyVerified: input.rtkAccuracyCm <= 5.0,
        };
      }),
    uploadSurveyData: surveyorProcedure
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
          console.warn("[Surveyor Upload] Extraction warning:", error);
        }
        await createEvidenceFile({
          name: input.fileName,
          category: input.category,
          mimeType: input.mimeType,
          storageKey: stored.key,
          storageUrl: stored.url,
          validationScore: validation.score,
          validationSummary: validation.findings.join(" "),
        });
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "SURVEY_DATA_UPLOADED",
          entityType: "survey_file",
          entityId: stored.key,
          newValue: JSON.stringify({
            category: input.category,
            fileName: input.fileName,
          }),
        });
        return {
          stored: true,
          validation,
          extraction,
          spatialImport,
          fileKey: stored.key,
        };
      }),
  }),

  // Citizen Self-Service Router
  citizen: router({
    stats: citizenProcedure.query(async ({ ctx }) =>
      getCitizenDashboardStats(ctx.user.clerkUserId)
    ),
    certificate: citizenProcedure
      .input(z.object({ ulpin: z.string().trim().min(2) }))
      .query(async ({ input, ctx }) => {
        const cert = await getCertificateData(input.ulpin);
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
          action: "DIGITAL_ULPIN_CARD_GENERATED",
          entityType: "citizen_card",
          entityId: cert.ulpin,
          targetResource: cert.ulpin,
          newValue: JSON.stringify({
            ulpin: cert.ulpin,
            generatedAt: new Date().toISOString(),
          }),
        });
        return cert;
      }),
    submitApplication: citizenProcedure
      .input(evidenceSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        createVerificationSubmission({
          ...input,
          submittedByClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        })
      ),
    reportIssue: citizenProcedure
      .input(issueReportInput)
      .mutation(async ({ input, ctx }) =>
        createIssueReport({
          ...input,
          reportedByClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        })
      ),
  }),

  // Spatial & PostGIS Operations
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
    updateFootprint: authorityProcedure
      .input(footprintUpdateInput)
      .mutation(async ({ input, ctx }) => {
        const result = await updatePostgisFootprint({
          ...input,
          editorName: ctx.user.name?.trim() || ctx.user.clerkUserId,
        });
        await createAuditLog({
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
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

  // Cadastre Search & Upload Router
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
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
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

    buildingFloorStacksList: publicProcedure.query(async () => {
      return getAllBuildingFloorStacks();
    }),

    buildingFloorStack: publicProcedure
      .input(z.object({ buildingIdOrUlpin: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        return getBuildingFloorStack(input.buildingIdOrUlpin);
      }),

    unitDetails: publicProcedure
      .input(z.object({ ulpin3d: z.string().trim().min(1) }))
      .query(async ({ input }) => {
        return getUnitCadastreDetails(input.ulpin3d);
      }),
  }),

  // Legacy Platform Router (Kept 100% compatible for existing frontend components)
  platform: router({
    dashboardSummary: protectedProcedure.query(async () =>
      getPlatformDashboardSummary()
    ),
    reportIssue: protectedProcedure
      .input(issueReportInput)
      .mutation(async ({ input, ctx }) =>
        createIssueReport({
          ...input,
          reportedByClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        })
      ),
    submitEvidence: authorityProcedure
      .input(evidenceSubmissionInput)
      .mutation(async ({ input, ctx }) =>
        createVerificationSubmission({
          ...input,
          submittedByClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
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
          reviewerClerkUserId: ctx.user.clerkUserId,
          reviewerRole: ctx.user.role,
          reviewerName: ctx.user.name,
        })
      ),
    governmentSummary: governmentProcedure.query(async () =>
      getPlatformDashboardSummary()
    ),
    adminSettings: adminProcedure.query(() => ({
      access: "server-assigned-administrator-only" as const,
      sections: [
        "Role assignment",
        "Audit access",
        "Evidence workflow policy",
      ],
      note:
        "Settings visibility never grants permissions; protected actions remain enforced by server procedures.",
    })),
    adminUsers: adminProcedure.query(async () => getPlatformUsers()),
    assignRole: adminProcedure
      .input(assignRoleInput)
      .mutation(async ({ input, ctx }) => {
        if (input.clerkUserId === ctx.user.clerkUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Administrators cannot change their own role.",
          });
        }
        return setPlatformUserRole({
          clerkUserId: input.clerkUserId,
          role: input.role,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: ctx.user.role,
          actorName: ctx.user.name,
        });
      }),
    auditLogs: adminProcedure.query(async () => getRecentAuditLogs()),
  }),

  // Cadastral Grievances & Property Sealing Enforcement Router
  grievance: router({
    submit: publicProcedure
      .input(citizenGrievanceInputSchema)
      .mutation(async ({ input, ctx }) => {
        const citizenClerkUserId = ctx.user?.clerkUserId || `anon_${Date.now()}`;
        return createCadastralGrievance({
          ...input,
          citizenClerkUserId,
          actorRole: ctx.user?.role ? String(ctx.user.role) : "CITIZEN",
          actorName: ctx.user?.name || input.citizenName,
        });
      }),

    list: publicProcedure
      .input(
        z
          .object({
            status: z.string().optional(),
            category: z.string().optional(),
            citizenClerkUserId: z.string().optional(),
            assignedSurveyorClerkUserId: z.string().optional(),
            ulpinOrReference: z.string().optional(),
            limit: z.number().max(200).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => getCadastralGrievances(input)),

    getById: publicProcedure
      .input(z.object({ idOrNumber: z.union([z.string(), z.number()]) }))
      .query(async ({ input }) => getGrievanceById(input.idOrNumber)),

    authorityAction: authorityProcedure
      .input(
        z.object({
          grievanceId: z.union([z.string(), z.number()]),
          action: z.enum(["REJECT", "ASSIGN_SURVEYOR"]),
          rejectionReason: z.string().trim().optional(),
          surveyorClerkUserId: z.string().trim().optional(),
          surveyorName: z.string().trim().optional(),
          instructions: z.string().trim().optional(),
          priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
          targetInspectionDays: z.number().int().min(1).max(30).default(3),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.action === "REJECT") {
          if (!input.rejectionReason || input.rejectionReason.trim().length < 5) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A formal rejection justification of at least 5 characters is required.",
            });
          }
          return rejectGrievanceByAuthority({
            grievanceId: input.grievanceId,
            rejectionReason: input.rejectionReason.trim(),
            actorClerkUserId: ctx.user.clerkUserId,
            actorRole: String(ctx.user.role),
            actorName: ctx.user.name,
          });
        }

        if (!input.surveyorClerkUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A field surveyor must be selected for on-site inspection dispatch.",
          });
        }

        return assignGrievanceToSurveyor({
          grievanceId: input.grievanceId,
          surveyorClerkUserId: input.surveyorClerkUserId,
          surveyorName: input.surveyorName,
          instructions: input.instructions || "Conduct on-site physical measurement, fire clearance audit, and photo documentation.",
          priority: input.priority,
          targetInspectionDays: input.targetInspectionDays,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
        });
      }),

    surveyorSubmitReport: surveyorProcedure
      .input(
        z.object({
          grievanceId: z.union([z.string(), z.number()]),
          actualHeightMetres: z.number().nullable().optional(),
          approvedHeightMetres: z.number().nullable().optional(),
          actualFloors: z.number().int().nullable().optional(),
          approvedFloors: z.number().int().nullable().optional(),
          fireSafetyClearance: z.enum(["PASSED", "FAILED", "NOT_APPLICABLE"]),
          setbackEncroachmentMetres: z.number().nullable().optional(),
          sitePhotos: z.array(z.string()).optional(),
          remarks: z.string().trim().min(5, "Surveyor remarks must be at least 5 characters"),
          verdict: z.enum(["VIOLATION_CONFIRMED", "COMPLIANT_NO_VIOLATION", "RE_SURVEY_RECOMMENDED"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { grievanceId, ...report } = input;
        return submitSurveyorVerificationReport({
          grievanceId,
          report,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
        });
      }),

    adminEnforcement: authorityAdminProcedure
      .input(
        z.object({
          grievanceId: z.union([z.string(), z.number()]),
          actionType: z.enum(["SEAL_PROPERTY", "DEMOLITION_ORDER", "PENALTY", "CLEARED", "RE_SURVEY"]),
          fineAmountInr: z.number().nullable().optional(),
          legalNoticeText: z.string().trim().min(5, "Legal notice text must be at least 5 characters"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return executeEnforcementOrder({
          grievanceId: input.grievanceId,
          actionType: input.actionType,
          fineAmountInr: input.fineAmountInr,
          legalNoticeText: input.legalNoticeText,
          actorClerkUserId: ctx.user.clerkUserId,
          actorRole: String(ctx.user.role),
          actorName: ctx.user.name,
        });
      }),

    stats: publicProcedure.query(async () => getGrievanceStats()),
  }),
});

export type AppRouter = typeof appRouter;

