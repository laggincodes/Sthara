import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cadastreRecords, evidenceFiles, InsertUser, users } from "../drizzle/schema";
import { INITIAL_CADASTRE_RECORDS, type CadastreRecord } from "@shared/cadastre";
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
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function parseEvidence(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function ensureCadastreSeedData() {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select({ id: cadastreRecords.id }).from(cadastreRecords).limit(1);
  if (existing.length > 0) return true;
  await db.insert(cadastreRecords).values(INITIAL_CADASTRE_RECORDS.map(record => ({ ...record, evidence: JSON.stringify(record.evidence) })));
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
