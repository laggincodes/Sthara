import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const platformRole = mysqlEnum("role", [
  "citizen",
  "authority",
  "government_employee",
  "admin",
]);

export const verificationStatus = mysqlEnum("verificationStatus", [
  "submitted",
  "under_review",
  "verified",
  "rejected",
]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  clerkUserId: varchar("clerkUserId", { length: 96 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: platformRole.default("citizen").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const cadastreRecords = mysqlTable("cadastreRecords", {
  id: int("id").autoincrement().primaryKey(),
  ulpin: varchar("ulpin", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  parcel: varchar("parcel", { length: 96 }).notNull(),
  building: varchar("building", { length: 120 }).notNull(),
  unit: varchar("unit", { length: 96 }).notNull(),
  floor: int("floor").notNull(),
  area: varchar("area", { length: 48 }).notNull(),
  volume: varchar("volume", { length: 48 }).notNull(),
  elevation: varchar("elevation", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["Verified", "Review required"]).notNull(),
  rights: text("rights").notNull(),
  evidence: text("evidence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const evidenceFiles = mysqlTable("evidenceFiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["geojson", "floorplan"]).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  storageKey: varchar("storageKey", { length: 255 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  validationScore: int("validationScore").notNull(),
  validationSummary: text("validationSummary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationSubmissions = mysqlTable("verificationSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  recordReference: varchar("recordReference", { length: 128 }).notNull(),
  submissionType: mysqlEnum("submissionType", [
    "geometry",
    "height",
    "floor_count",
    "floor_plan",
    "survey",
  ]).notNull(),
  sourceUrl: text("sourceUrl"),
  sourceReference: varchar("sourceReference", { length: 320 }).notNull(),
  notes: text("notes").notNull(),
  status: verificationStatus.default("submitted").notNull(),
  submittedByClerkUserId: varchar("submittedByClerkUserId", {
    length: 96,
  }).notNull(),
  reviewedByClerkUserId: varchar("reviewedByClerkUserId", { length: 96 }),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const issueReports = mysqlTable("issueReports", {
  id: int("id").autoincrement().primaryKey(),
  recordReference: varchar("recordReference", { length: 128 }).notNull(),
  category: mysqlEnum("category", [
    "footprint",
    "floor_count",
    "location",
    "missing_property",
    "parcel_boundary",
  ]).notNull(),
  details: text("details").notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "closed"])
    .default("submitted")
    .notNull(),
  reportedByClerkUserId: varchar("reportedByClerkUserId", {
    length: 96,
  }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorClerkUserId: varchar("actorClerkUserId", { length: 96 }).notNull(),
  actorRole: platformRole.notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  entityType: varchar("entityType", { length: 96 }).notNull(),
  entityId: varchar("entityId", { length: 128 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
