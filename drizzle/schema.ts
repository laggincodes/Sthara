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
  "citizen",
  "authority",
  "government_employee",
  "admin",
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerkUserId", { length: 96 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: platformRole("role").default("citizen").notNull(),
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
  actorRole: platformRole("actorRole").notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  entityType: varchar("entityType", { length: 96 }).notNull(),
  entityId: varchar("entityId", { length: 128 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
