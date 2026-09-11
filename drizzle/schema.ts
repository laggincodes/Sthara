import {
  pgEnum,
  pgTable,
  integer,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const platformRole = pgEnum("platform_role", [
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
]);

export const userStatus = pgEnum("user_status", [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
]);

export const verificationStatus = pgEnum("verification_status", [
  "submitted",
  "under_review",
  "verified",
  "rejected",
]);

export const cadastreStatus = pgEnum("cadastre_status", [
  "Verified",
  "Review required",
]);

export const evidenceFileCategory = pgEnum("evidence_file_category", [
  "geojson",
  "floorplan",
]);

export const verificationSubmissionType = pgEnum(
  "verification_submission_type",
  ["geometry", "height", "floor_count", "floor_plan", "survey"]
);

export const issueReportCategory = pgEnum("issue_report_category", [
  "footprint",
  "floor_count",
  "location",
  "missing_property",
  "parcel_boundary",
]);

export const issueReportStatus = pgEnum("issue_report_status", [
  "submitted",
  "under_review",
  "closed",
]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 48 }).notNull().unique(),
  description: text("description"),
  status: varchar("status", { length: 32 }).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).default("Bihar").notNull(),
  code: varchar("code", { length: 48 }).notNull().unique(),
  status: varchar("status", { length: 32 }).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  status: varchar("status", { length: 32 }).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 64 }).notNull(),
  permission: varchar("permission", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerkUserId", { length: 96 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 48 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: platformRole("role").default("citizen").notNull(),
  status: userStatus("status").default("ACTIVE").notNull(),
  designation: varchar("designation", { length: 160 }),
  departmentId: integer("departmentId"),
  districtId: integer("districtId"),
  organizationId: integer("organizationId"),
  jurisdiction: text("jurisdiction"),
  invitationSentAt: timestamp("invitationSentAt"),
  invitationAcceptedAt: timestamp("invitationAcceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const cadastreRecords = pgTable("cadastreRecords", {
  id: serial("id").primaryKey(),
  ulpin: varchar("ulpin", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  parcel: varchar("parcel", { length: 96 }).notNull(),
  building: varchar("building", { length: 120 }).notNull(),
  unit: varchar("unit", { length: 96 }).notNull(),
  floor: integer("floor").notNull(),
  area: varchar("area", { length: 48 }).notNull(),
  volume: varchar("volume", { length: 48 }).notNull(),
  elevation: varchar("elevation", { length: 80 }).notNull(),
  status: cadastreStatus("status").notNull(),
  rights: text("rights").notNull(),
  evidence: text("evidence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const evidenceFiles = pgTable("evidenceFiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: evidenceFileCategory("category").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 255 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  validationScore: integer("validationScore").notNull(),
  validationSummary: text("validationSummary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationSubmissions = pgTable("verificationSubmissions", {
  id: serial("id").primaryKey(),
  recordReference: varchar("recordReference", { length: 128 }).notNull(),
  submissionType: verificationSubmissionType("submissionType").notNull(),
  sourceUrl: text("sourceUrl"),
  sourceReference: varchar("sourceReference", { length: 320 }).notNull(),
  notes: text("notes").notNull(),
  status: verificationStatus("status").default("submitted").notNull(),
  submittedByClerkUserId: varchar("submittedByClerkUserId", {
    length: 96,
  }).notNull(),
  reviewedByClerkUserId: varchar("reviewedByClerkUserId", { length: 96 }),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const issueReports = pgTable("issueReports", {
  id: serial("id").primaryKey(),
  recordReference: varchar("recordReference", { length: 128 }).notNull(),
  category: issueReportCategory("category").notNull(),
  details: text("details").notNull(),
  status: issueReportStatus("status").default("submitted").notNull(),
  reportedByClerkUserId: varchar("reportedByClerkUserId", {
    length: 96,
  }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  actorClerkUserId: varchar("actorClerkUserId", { length: 96 }).notNull(),
  actorRole: varchar("actorRole", { length: 64 }).notNull(),
  actorName: varchar("actorName", { length: 160 }),
  action: varchar("action", { length: 96 }).notNull(),
  targetUserId: varchar("targetUserId", { length: 96 }),
  targetResource: varchar("targetResource", { length: 160 }),
  entityType: varchar("entityType", { length: 96 }).notNull(),
  entityId: varchar("entityId", { length: 128 }).notNull(),
  departmentId: integer("departmentId"),
  districtId: integer("districtId"),
  metadata: text("metadata"),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 160 }),
  phone: varchar("phone", { length: 48 }),
  assignedRole: platformRole("assignedRole").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  status: varchar("status", { length: 32 }).default("PENDING").notNull(), // PENDING, ACCEPTED, EXPIRED, REVOKED
  departmentId: integer("departmentId"),
  districtId: integer("districtId"),
  organizationId: integer("organizationId"),
  jurisdiction: text("jurisdiction"),
  designation: varchar("designation", { length: 160 }),
  createdByClerkUserId: varchar("createdByClerkUserId", { length: 96 }),
  createdByEmail: varchar("createdByEmail", { length: 320 }),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  status: varchar("status", { length: 32 }).default("PENDING").notNull(), // PENDING, USED, EXPIRED
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export type District = typeof districts.$inferSelect;
export type InsertDistrict = typeof districts.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

