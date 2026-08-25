import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  cadastreRecords,
  evidenceFiles,
  InsertUser,
  issueReports,
  users,
  verificationSubmissions,
} from "../drizzle/schema";
import {
  INITIAL_CADASTRE_RECORDS,
  type CadastreRecord,
} from "@shared/cadastre";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role =
    user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "citizen");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

function parseEvidence(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function ensureCadastreSeedData() {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select({ id: cadastreRecords.id })
    .from(cadastreRecords)
    .limit(1);
  if (existing.length > 0) return true;
  await db.insert(cadastreRecords).values(
    INITIAL_CADASTRE_RECORDS.map(record => ({
      ...record,
      evidence: JSON.stringify(record.evidence),
    }))
  );
  return true;
}

export async function getCadastreRecords(): Promise<CadastreRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(cadastreRecords).limit(100);
  return records.map(record => ({
    ulpin: record.ulpin,
    title: record.title,
    parcel: record.parcel,
    building: record.building,
    unit: record.unit,
    floor: record.floor,
    area: record.area,
    volume: record.volume,
    elevation: record.elevation,
    status: record.status,
    rights: record.rights,
    evidence: parseEvidence(record.evidence),
  }));
}

export async function createEvidenceFile(input: {
  name: string;
  category: "geojson" | "floorplan";
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  validationScore: number;
  validationSummary: string;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(evidenceFiles).values(input);
  return true;
}

export type PlatformRole =
  | "citizen"
  | "authority"
  | "government_employee"
  | "admin";

export async function createAuditLog(input: {
  actorOpenId: string;
  actorRole: PlatformRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(auditLogs).values(input);
  return true;
}

export async function getPlatformUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn))
    .limit(100);
}

export async function setPlatformUserRole(input: {
  openId: string;
  role: PlatformRole;
  actorOpenId: string;
  actorRole: PlatformRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const existing = await getUserByOpenId(input.openId);
  if (!existing) throw new Error("The requested user was not found.");
  await db
    .update(users)
    .set({ role: input.role })
    .where(eq(users.openId, input.openId));
  await createAuditLog({
    actorOpenId: input.actorOpenId,
    actorRole: input.actorRole,
    action: "role_assigned",
    entityType: "user",
    entityId: input.openId,
    oldValue: existing.role,
    newValue: input.role,
  });
  return { previousRole: existing.role, role: input.role };
}

export async function createIssueReport(input: {
  recordReference: string;
  category:
    | "footprint"
    | "floor_count"
    | "location"
    | "missing_property"
    | "parcel_boundary";
  details: string;
  reportedBy: string;
  actorRole: PlatformRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const result = await db.insert(issueReports).values({
    recordReference: input.recordReference,
    category: input.category,
    details: input.details,
    reportedBy: input.reportedBy,
  });
  const id = String(result[0].insertId);
  await createAuditLog({
    actorOpenId: input.reportedBy,
    actorRole: input.actorRole,
    action: "issue_report_submitted",
    entityType: "issue_report",
    entityId: id,
    newValue: JSON.stringify({
      recordReference: input.recordReference,
      category: input.category,
    }),
  });
  return { id };
}

export async function createVerificationSubmission(input: {
  recordReference: string;
  submissionType:
    | "geometry"
    | "height"
    | "floor_count"
    | "floor_plan"
    | "survey";
  sourceUrl?: string;
  sourceReference: string;
  notes: string;
  submittedBy: string;
  actorRole: PlatformRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const result = await db.insert(verificationSubmissions).values({
    recordReference: input.recordReference,
    submissionType: input.submissionType,
    sourceUrl: input.sourceUrl ?? null,
    sourceReference: input.sourceReference,
    notes: input.notes,
    submittedBy: input.submittedBy,
  });
  const id = String(result[0].insertId);
  await createAuditLog({
    actorOpenId: input.submittedBy,
    actorRole: input.actorRole,
    action: "evidence_submitted",
    entityType: "verification_submission",
    entityId: id,
    newValue: JSON.stringify({
      recordReference: input.recordReference,
      submissionType: input.submissionType,
    }),
  });
  return { id, status: "submitted" as const };
}

export async function getVerificationSubmissions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(verificationSubmissions)
    .orderBy(desc(verificationSubmissions.createdAt))
    .limit(100);
}

export async function reviewVerificationSubmission(input: {
  id: number;
  status: "under_review" | "verified" | "rejected";
  reviewNote: string;
  reviewerOpenId: string;
  reviewerRole: PlatformRole;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [existing] = await db
    .select()
    .from(verificationSubmissions)
    .where(eq(verificationSubmissions.id, input.id))
    .limit(1);
  if (!existing) throw new Error("The requested submission was not found.");
  await db
    .update(verificationSubmissions)
    .set({
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedBy: input.reviewerOpenId,
      reviewedAt: new Date(),
    })
    .where(eq(verificationSubmissions.id, input.id));
  await createAuditLog({
    actorOpenId: input.reviewerOpenId,
    actorRole: input.reviewerRole,
    action: "evidence_reviewed",
    entityType: "verification_submission",
    entityId: String(input.id),
    oldValue: existing.status,
    newValue: input.status,
  });
  return { recordReference: existing.recordReference, status: input.status };
}

export async function getPlatformDashboardSummary() {
  const db = await getDb();
  if (!db)
    return { records: 0, pendingVerification: 0, reviewedVerification: 0 };
  const [records, submissions] = await Promise.all([
    db.select({ id: cadastreRecords.id }).from(cadastreRecords),
    db
      .select({ status: verificationSubmissions.status })
      .from(verificationSubmissions),
  ]);
  return {
    records: records.length,
    pendingVerification: submissions.filter(
      item => item.status === "submitted" || item.status === "under_review"
    ).length,
    reviewedVerification: submissions.filter(
      item => item.status === "verified" || item.status === "rejected"
    ).length,
  };
}

export async function getRecentAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);
}
