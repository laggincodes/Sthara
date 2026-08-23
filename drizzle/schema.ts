import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
