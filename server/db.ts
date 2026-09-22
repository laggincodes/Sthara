import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import {
  auditLogs,
  cadastralGrievances,
  cadastreRecords,
  departments,
  districts,
  evidenceFiles,
  InsertAuditLog,
  InsertCadastralGrievance,
  InsertDepartment,
  InsertDistrict,
  InsertOrganization,
  InsertUser,
  issueReports,
  organizations,
  rolePermissions,
  users,
  verificationSubmissions,
  type CadastralGrievance,
} from "../drizzle/schema";
import {
  INITIAL_CADASTRE_RECORDS,
  type CadastreRecord,
} from "@shared/cadastre";
import {
  getBuildingFloorStackRecord,
  getUnitCadastreDetails as getUnitDetailsFromCadastre,
  SAMPLE_BUILDING_FLOOR_STACKS,
  type BuildingFloorStackRecord,
  type FloorStackLevel,
  type FloorUnitCadastre,
} from "@shared/floorCadastre";
import {
  canonicalRole,
  CanonicalPlatformRole,
  PlatformRoles,
  PlatformRoleInput,
  UserStatus,
  UserStatuses,
} from "@shared/permissions";
import { createClerkStaffInvitation } from "./clerkInvitationService";

let _db: NodePgDatabase<typeof schema> | null = null;
let _pool: Pool | null = null;

function getApplicationDatabaseUrl() {
  return process.env.POSTGIS_DATABASE_URL ?? process.env.DATABASE_URL;
}

export const INITIAL_SUPER_ADMIN_EMAIL =
  process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim() || "gautamkr192007@gmail.com";

function isBootstrapAdministrator(clerkUserId: string, email?: string | null) {
  const bootstrapIds = (process.env.CLERK_BOOTSTRAP_ADMIN_USER_IDS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (bootstrapIds.includes(clerkUserId)) return true;
  if (
    email &&
    email.toLowerCase().trim() === INITIAL_SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return true;
  }
  return false;
}

export async function getDb() {
  const connectionString = getApplicationDatabaseUrl();
  if (!_db && connectionString) {
    try {
      if (!connectionString.startsWith("postgres")) {
        console.warn(
          "[Database] Clerk application users require a PostgreSQL connection."
        );
        return null;
      }
      _pool = new Pool({
        connectionString,
        ssl:
          connectionString.includes("neon.tech") ||
          connectionString.includes("sslmode=require")
            ? { rejectUnauthorized: false }
            : undefined,
      });
      _db = drizzle(_pool, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Ensures Master Reference Data (Departments, Districts, Organizations, Super Admin)
 * is seeded into the database on startup or first request.
 */
export async function ensureMasterSeedData(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // 1. Seed Departments if empty
    const existingDepts = await db
      .select({ id: departments.id })
      .from(departments)
      .limit(1);
    if (existingDepts.length === 0) {
      await db.insert(departments).values([
        {
          name: "Department of Land Resources (DoLR)",
          code: "DOLR",
          description:
            "Central nodal department for national land records and 3D cadastre modernisation.",
          status: "ACTIVE",
        },
        {
          name: "Revenue & Land Reforms Department",
          code: "REV_LR",
          description:
            "State revenue authority responsible for land administration, khatiyan and mutation.",
          status: "ACTIVE",
        },
        {
          name: "Urban Development & Housing Department",
          code: "URBAN_DEV",
          description:
            "Authority for municipal master plans, vertical property sanctions and building permits.",
          status: "ACTIVE",
        },
        {
          name: "Survey of India (Geodetic Directorate)",
          code: "SOI",
          description:
            "National mapping agency responsible for geodetic reference frames, GNSS/CORS and topographic ground control.",
          status: "ACTIVE",
        },
        {
          name: "Directorate of Land Records & Survey",
          code: "DLRS",
          description:
            "State surveying and spatial mapping agency overseeing digital cadastral operations.",
          status: "ACTIVE",
        },
        {
          name: "Town & Country Planning Organization",
          code: "TCPO",
          description:
            "Regional planning agency governing spatial zoning and vertical height guidelines.",
          status: "ACTIVE",
        },
        {
          name: "Registration & Stamps Department",
          code: "REG_STAMPS",
          description:
            "State deed registration and vertical title conveyance verification.",
          status: "ACTIVE",
        },
      ]);
    }

    // 2. Seed Districts if empty
    const existingDistricts = await db
      .select({ id: districts.id })
      .from(districts)
      .limit(1);
    if (existingDistricts.length === 0) {
      await db.insert(districts).values([
        { name: "Patna", state: "Bihar", code: "PAT", status: "ACTIVE" },
        { name: "Gaya", state: "Bihar", code: "GAY", status: "ACTIVE" },
        { name: "Muzaffarpur", state: "Bihar", code: "MUZ", status: "ACTIVE" },
        { name: "Bhagalpur", state: "Bihar", code: "BHG", status: "ACTIVE" },
        { name: "Nalanda", state: "Bihar", code: "NAL", status: "ACTIVE" },
        { name: "Darbhanga", state: "Bihar", code: "DAR", status: "ACTIVE" },
        { name: "Vaishali", state: "Bihar", code: "VAI", status: "ACTIVE" },
      ]);
    }

    // 3. Seed Organizations if empty
    const existingOrgs = await db
      .select({ id: organizations.id })
      .from(organizations)
      .limit(1);
    if (existingOrgs.length === 0) {
      await db.insert(organizations).values([
        {
          name: "Ministry of Rural Development / DoLR",
          type: "CENTRAL_MINISTRY",
          status: "ACTIVE",
        },
        {
          name: "Bihar Land Records & Survey Directorate",
          type: "STATE_AUTHORITY",
          status: "ACTIVE",
        },
        {
          name: "Patna Municipal Corporation (PMC)",
          type: "MUNICIPAL_CORP",
          status: "ACTIVE",
        },
        {
          name: "Survey of India Eastern Regional Zone",
          type: "NATIONAL_AGENCY",
          status: "ACTIVE",
        },
      ]);
    }

    // 4. Seed initial Cadastre records
    await ensureCadastreSeedData();

    return true;
  } catch (error) {
    console.warn("[Database] Master seed initialization error:", error);
    return false;
  }
}

export async function upsertUser(user: Partial<InsertUser>): Promise<void> {
  if (!user.clerkUserId) {
    throw new Error("Clerk user ID is required for upsert");
  }
  const db = await getDb();
  if (!db) return;

  // Check if a pre-provisioned user exists by email or clerkUserId
  let existing = await getUserByClerkUserId(user.clerkUserId);
  if (!existing && user.email) {
    existing = await getUserByEmail(user.email);
  }

  const isSuperAdminEmail = isBootstrapAdministrator(
    user.clerkUserId,
    user.email ?? existing?.email
  );

  const resolvedRole = isSuperAdminEmail
    ? PlatformRoles.SUPER_ADMIN
    : (user.role ?? existing?.role ?? PlatformRoles.CITIZEN);

  const resolvedStatus =
    user.status ??
    (existing?.status === UserStatuses.INVITED
      ? UserStatuses.ACTIVE
      : (existing?.status ?? UserStatuses.ACTIVE));

  // If upgrading a pre-provisioned invitation account by email to official clerk user ID
  if (existing && existing.clerkUserId !== user.clerkUserId) {
    await db
      .update(users)
      .set({
        clerkUserId: user.clerkUserId,
        name: user.name ?? existing.name,
        role: resolvedRole as schema.User["role"],
        status: resolvedStatus,
        designation: user.designation ?? existing.designation,
        departmentId: user.departmentId ?? existing.departmentId,
        districtId: user.districtId ?? existing.districtId,
        organizationId: user.organizationId ?? existing.organizationId,
        jurisdiction: user.jurisdiction ?? existing.jurisdiction,
        invitationAcceptedAt: user.invitationAcceptedAt ?? (existing.status === UserStatuses.INVITED ? new Date() : existing.invitationAcceptedAt),
        lastSignedIn: user.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return;
  }

  const values: InsertUser = {
    clerkUserId: user.clerkUserId,
    name: user.name ?? existing?.name ?? null,
    email: user.email ?? existing?.email ?? null,
    phone: user.phone ?? existing?.phone ?? null,
    loginMethod: user.loginMethod ?? existing?.loginMethod ?? "clerk",
    role: resolvedRole as schema.User["role"],
    status: resolvedStatus,
    designation: user.designation ?? existing?.designation ?? null,
    departmentId: user.departmentId ?? existing?.departmentId ?? null,
    districtId: user.districtId ?? existing?.districtId ?? null,
    organizationId: user.organizationId ?? existing?.organizationId ?? null,
    jurisdiction: user.jurisdiction ?? existing?.jurisdiction ?? null,
    invitationAcceptedAt:
      user.invitationAcceptedAt ??
      (existing?.status === UserStatuses.INVITED
        ? new Date()
        : existing?.invitationAcceptedAt),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };

  const updateSet: Partial<InsertUser> = {
    name: values.name,
    email: values.email,
    phone: values.phone,
    loginMethod: values.loginMethod,
    role: values.role,
    status: values.status,
    designation: values.designation,
    departmentId: values.departmentId,
    districtId: values.districtId,
    organizationId: values.organizationId,
    jurisdiction: values.jurisdiction,
    invitationAcceptedAt: values.invitationAcceptedAt,
    lastSignedIn: values.lastSignedIn,
    updatedAt: new Date(),
  };

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.clerkUserId, set: updateSet });
}

export async function getUserByClerkUserId(clerkUserId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db || !email) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
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
  if (!db) return INITIAL_CADASTRE_RECORDS;
  const records = await db.select().from(cadastreRecords).limit(100);
  if (records.length === 0) return INITIAL_CADASTRE_RECORDS;
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

export type PlatformRole = PlatformRoleInput;

const inMemoryAuditLogs: schema.AuditLog[] = [];

export async function createAuditLog(input: {
  actorClerkUserId: string;
  actorRole: string;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  targetUserId?: string | null;
  targetResource?: string | null;
  departmentId?: number | null;
  districtId?: number | null;
  metadata?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
}) {
  const memoryLog: schema.AuditLog = {
    id: inMemoryAuditLogs.length + 1,
    actorClerkUserId: input.actorClerkUserId,
    actorRole: input.actorRole,
    actorName: input.actorName ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    targetUserId: input.targetUserId ?? null,
    targetResource: input.targetResource ?? null,
    departmentId: input.departmentId ?? null,
    districtId: input.districtId ?? null,
    metadata: input.metadata ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    ipAddress: input.ipAddress ?? null,
    createdAt: new Date(),
  };
  inMemoryAuditLogs.unshift(memoryLog);

  const db = await getDb();
  if (!db) return true;
  try {
    await db.insert(auditLogs).values({
      actorClerkUserId: input.actorClerkUserId,
      actorRole: input.actorRole,
      actorName: input.actorName ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      targetUserId: input.targetUserId ?? null,
      targetResource: input.targetResource ?? null,
      departmentId: input.departmentId ?? null,
      districtId: input.districtId ?? null,
      metadata: input.metadata ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    return true;
  } catch (err) {
    console.warn("[AuditLog] Failed to record audit log:", err);
    return true;
  }
}

/**
 * Filtered user query for Admin User Management Console
 */
export async function getPlatformUsers(filters?: {
  query?: string;
  role?: string;
  status?: string;
  departmentId?: number;
  districtId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.query) {
    const q = `%${filters.query.trim().toLowerCase()}%`;
    conditions.push(
      or(
        ilike(users.name, q),
        ilike(users.email, q),
        ilike(users.clerkUserId, q),
        ilike(users.designation, q),
        ilike(users.jurisdiction, q)
      )
    );
  }

  if (filters?.role) {
    conditions.push(eq(users.role, filters.role as schema.User["role"]));
  }

  if (filters?.status) {
    conditions.push(eq(users.status, filters.status as schema.User["status"]));
  }

  if (filters?.departmentId) {
    conditions.push(eq(users.departmentId, filters.departmentId));
  }

  if (filters?.districtId) {
    conditions.push(eq(users.districtId, filters.districtId));
  }

  const queryBuilder = db
    .select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      designation: users.designation,
      departmentId: users.departmentId,
      districtId: users.districtId,
      organizationId: users.organizationId,
      jurisdiction: users.jurisdiction,
      invitationSentAt: users.invitationSentAt,
      invitationAcceptedAt: users.invitationAcceptedAt,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
    })
    .from(users);

  if (conditions.length > 0) {
    return queryBuilder
      .where(and(...conditions))
      .orderBy(desc(users.lastSignedIn))
      .limit(filters?.limit ?? 100);
  }

  return queryBuilder.orderBy(desc(users.lastSignedIn)).limit(filters?.limit ?? 100);
}

/**
 * Update user role (Administrator only, self-role assignment blocked)
 */
export async function setPlatformUserRole(input: {
  clerkUserId: string;
  role: PlatformRole;
  actorClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
}) {
  if (input.clerkUserId === input.actorClerkUserId) {
    throw new Error("Administrators cannot change their own role.");
  }

  const targetCanon = canonicalRole(input.role);
  const actorCanon = canonicalRole(input.actorRole);

  // Only SUPER_ADMIN can assign SUPER_ADMIN role
  if (targetCanon === PlatformRoles.SUPER_ADMIN && actorCanon !== PlatformRoles.SUPER_ADMIN) {
    throw new Error("Only a Super Administrator can assign the Super Admin role.");
  }

  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const existing = await getUserByClerkUserId(input.clerkUserId);
  if (!existing) throw new Error("The requested user was not found.");

  await db
    .update(users)
    .set({
      role: input.role as schema.User["role"],
      updatedAt: new Date(),
    })
    .where(eq(users.clerkUserId, input.clerkUserId));

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: "ROLE_CHANGED",
    entityType: "user",
    entityId: input.clerkUserId,
    targetUserId: input.clerkUserId,
    targetResource: existing.email ?? input.clerkUserId,
    oldValue: existing.role,
    newValue: input.role,
  });

  return { previousRole: existing.role, role: input.role };
}

/**
 * Update user account status (Activate / Suspend / Disable / Re-enable)
 */
export async function setPlatformUserStatus(input: {
  clerkUserId: string;
  status: UserStatus;
  actorClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
  reason?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const existing = await getUserByClerkUserId(input.clerkUserId);
  if (!existing) throw new Error("The requested user was not found.");

  await db
    .update(users)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkUserId, input.clerkUserId));

  const actionMap: Record<UserStatus, string> = {
    ACTIVE: "USER_ACTIVATED",
    SUSPENDED: "USER_SUSPENDED",
    DISABLED: "USER_DISABLED",
    INVITED: "USER_INVITED",
  };

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: actionMap[input.status] || "USER_STATUS_UPDATED",
    entityType: "user",
    entityId: input.clerkUserId,
    targetUserId: input.clerkUserId,
    targetResource: existing.email ?? input.clerkUserId,
    metadata: input.reason ?? undefined,
    oldValue: existing.status,
    newValue: input.status,
  });

  return { previousStatus: existing.status, status: input.status };
}

/**
 * Update user jurisdiction, department, district and designation
 */
export async function updateUserJurisdiction(input: {
  clerkUserId: string;
  departmentId?: number | null;
  districtId?: number | null;
  organizationId?: number | null;
  jurisdiction?: string | null;
  designation?: string | null;
  phone?: string | null;
  actorClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const existing = await getUserByClerkUserId(input.clerkUserId);
  if (!existing) throw new Error("The requested user was not found.");

  await db
    .update(users)
    .set({
      departmentId: input.departmentId !== undefined ? input.departmentId : existing.departmentId,
      districtId: input.districtId !== undefined ? input.districtId : existing.districtId,
      organizationId: input.organizationId !== undefined ? input.organizationId : existing.organizationId,
      jurisdiction: input.jurisdiction !== undefined ? input.jurisdiction : existing.jurisdiction,
      designation: input.designation !== undefined ? input.designation : existing.designation,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      updatedAt: new Date(),
    })
    .where(eq(users.clerkUserId, input.clerkUserId));

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: "USER_JURISDICTION_UPDATED",
    entityType: "user",
    entityId: input.clerkUserId,
    targetUserId: input.clerkUserId,
    targetResource: existing.email ?? input.clerkUserId,
    departmentId: input.departmentId ?? undefined,
    districtId: input.districtId ?? undefined,
    newValue: JSON.stringify({
      departmentId: input.departmentId,
      districtId: input.districtId,
      jurisdiction: input.jurisdiction,
      designation: input.designation,
    }),
  });

  return { success: true };
}

/**
 * Invite Authority / Staff User:
 * 1. Validates input
 * 2. Creates pre-provisioned user in Neon with status INVITED
 * 3. Calls Clerk Invitations API
 * 4. Logs audit event AUTHORITY_INVITED
 */
export async function inviteAuthorityUser(input: {
  name: string;
  email: string;
  phone?: string;
  role: PlatformRole;
  departmentId?: number;
  districtId?: number;
  organizationId?: number;
  jurisdiction?: string;
  designation?: string;
  actorClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");

  const cleanEmail = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(cleanEmail);

  const virtualClerkId =
    existing?.clerkUserId ||
    `invited_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Dispatch Clerk Invitation
  const clerkResult = await createClerkStaffInvitation({
    email: cleanEmail,
    role: String(input.role),
    departmentId: input.departmentId,
    districtId: input.districtId,
    organizationId: input.organizationId,
    designation: input.designation,
  });

  // 2. Pre-provision in database
  if (existing) {
    await db
      .update(users)
      .set({
        name: input.name,
        phone: input.phone ?? existing.phone,
        role: input.role as schema.User["role"],
        status: existing.clerkUserId.startsWith("user_") ? existing.status : UserStatuses.INVITED,
        designation: input.designation ?? existing.designation,
        departmentId: input.departmentId ?? existing.departmentId,
        districtId: input.districtId ?? existing.districtId,
        organizationId: input.organizationId ?? existing.organizationId,
        jurisdiction: input.jurisdiction ?? existing.jurisdiction,
        invitationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      clerkUserId: virtualClerkId,
      name: input.name,
      email: cleanEmail,
      phone: input.phone ?? null,
      loginMethod: "clerk",
      role: input.role as schema.User["role"],
      status: UserStatuses.INVITED,
      designation: input.designation ?? null,
      departmentId: input.departmentId ?? null,
      districtId: input.districtId ?? null,
      organizationId: input.organizationId ?? null,
      jurisdiction: input.jurisdiction ?? null,
      invitationSentAt: new Date(),
    });
  }

  // 3. Log Audit
  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: "AUTHORITY_INVITED",
    entityType: "authority_invitation",
    entityId: cleanEmail,
    targetResource: cleanEmail,
    departmentId: input.departmentId ?? undefined,
    districtId: input.districtId ?? undefined,
    newValue: JSON.stringify({
      name: input.name,
      email: cleanEmail,
      role: input.role,
      departmentId: input.departmentId,
      districtId: input.districtId,
      designation: input.designation,
      clerkInvitationStatus: clerkResult.status,
    }),
  });

  return {
    success: true,
    email: cleanEmail,
    role: input.role,
    clerkResult,
  };
}

// Master Data CRUD Helpers
export async function getDepartments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(
  input: InsertDepartment,
  actor: { clerkUserId: string; role: PlatformRole; name?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [created] = await db.insert(departments).values(input).returning();
  await createAuditLog({
    actorClerkUserId: actor.clerkUserId,
    actorRole: String(actor.role),
    actorName: actor.name,
    action: "DEPARTMENT_CREATED",
    entityType: "department",
    entityId: String(created.id),
    newValue: JSON.stringify(created),
  });
  return created;
}

export async function getDistricts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(districts).orderBy(districts.name);
}

export async function createDistrict(
  input: InsertDistrict,
  actor: { clerkUserId: string; role: PlatformRole; name?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [created] = await db.insert(districts).values(input).returning();
  await createAuditLog({
    actorClerkUserId: actor.clerkUserId,
    actorRole: String(actor.role),
    actorName: actor.name,
    action: "DISTRICT_CREATED",
    entityType: "district",
    entityId: String(created.id),
    newValue: JSON.stringify(created),
  });
  return created;
}

export async function getOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(organizations.name);
}

export async function createOrganization(
  input: InsertOrganization,
  actor: { clerkUserId: string; role: PlatformRole; name?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [created] = await db.insert(organizations).values(input).returning();
  await createAuditLog({
    actorClerkUserId: actor.clerkUserId,
    actorRole: String(actor.role),
    actorName: actor.name,
    action: "ORGANIZATION_CREATED",
    entityType: "organization",
    entityId: String(created.id),
    newValue: JSON.stringify(created),
  });
  return created;
}

// Issue Reports & Verifications
export async function createIssueReport(input: {
  recordReference: string;
  category:
    | "footprint"
    | "floor_count"
    | "location"
    | "missing_property"
    | "parcel_boundary";
  details: string;
  reportedByClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [created] = await db
    .insert(issueReports)
    .values({
      recordReference: input.recordReference,
      category: input.category,
      details: input.details,
      reportedByClerkUserId: input.reportedByClerkUserId,
    })
    .returning({ id: issueReports.id });
  const id = String(created?.id);
  await createAuditLog({
    actorClerkUserId: input.reportedByClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: "ISSUE_REPORT_SUBMITTED",
    entityType: "issue_report",
    entityId: id,
    targetResource: input.recordReference,
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
  submittedByClerkUserId: string;
  actorRole: PlatformRole;
  actorName?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");
  const [created] = await db
    .insert(verificationSubmissions)
    .values({
      recordReference: input.recordReference,
      submissionType: input.submissionType,
      sourceUrl: input.sourceUrl ?? null,
      sourceReference: input.sourceReference,
      notes: input.notes,
      submittedByClerkUserId: input.submittedByClerkUserId,
    })
    .returning({ id: verificationSubmissions.id });
  const id = String(created?.id);
  await createAuditLog({
    actorClerkUserId: input.submittedByClerkUserId,
    actorRole: String(input.actorRole),
    actorName: input.actorName,
    action: "EVIDENCE_SUBMITTED",
    entityType: "verification_submission",
    entityId: id,
    targetResource: input.recordReference,
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
  reviewerClerkUserId: string;
  reviewerRole: PlatformRole;
  reviewerName?: string | null;
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
      reviewedByClerkUserId: input.reviewerClerkUserId,
      reviewedAt: new Date(),
    })
    .where(eq(verificationSubmissions.id, input.id));
  await createAuditLog({
    actorClerkUserId: input.reviewerClerkUserId,
    actorRole: String(input.reviewerRole),
    actorName: input.reviewerName,
    action: input.status === "verified" ? "PROPERTY_APPROVED" : input.status === "rejected" ? "PROPERTY_REJECTED" : "EVIDENCE_REVIEWED",
    entityType: "verification_submission",
    entityId: String(input.id),
    targetResource: existing.recordReference,
    oldValue: existing.status,
    newValue: input.status,
    metadata: input.reviewNote,
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

/**
 * Filtered Audit Logs Query with Multi-Dimensional Search
 */
export async function getAuditLogsFiltered(filters?: {
  search?: string;
  actorClerkUserId?: string;
  actorRole?: string;
  action?: string;
  targetUserId?: string;
  departmentId?: number;
  districtId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  let logs: schema.AuditLog[] = [];

  if (db) {
    const conditions = [];

    if (filters?.actorClerkUserId) {
      conditions.push(eq(auditLogs.actorClerkUserId, filters.actorClerkUserId));
    }
    if (filters?.actorRole && filters.actorRole !== "ALL") {
      conditions.push(eq(auditLogs.actorRole, filters.actorRole));
    }
    if (filters?.action && filters.action !== "ALL") {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.targetUserId) {
      conditions.push(eq(auditLogs.targetUserId, filters.targetUserId));
    }
    if (filters?.departmentId) {
      conditions.push(eq(auditLogs.departmentId, filters.departmentId));
    }
    if (filters?.districtId) {
      conditions.push(eq(auditLogs.districtId, filters.districtId));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const queryBuilder = db.select().from(auditLogs);
    if (conditions.length > 0) {
      logs = await queryBuilder
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters?.limit ?? 150);
    } else {
      logs = await queryBuilder
        .orderBy(desc(auditLogs.createdAt))
        .limit(filters?.limit ?? 150);
    }
  }

  if (logs.length === 0 && inMemoryAuditLogs.length > 0) {
    logs = [...inMemoryAuditLogs];
    if (filters?.actorClerkUserId) {
      logs = logs.filter(l => l.actorClerkUserId === filters.actorClerkUserId);
    }
    if (filters?.actorRole && filters.actorRole !== "ALL") {
      logs = logs.filter(l => l.actorRole === filters.actorRole);
    }
    if (filters?.action && filters.action !== "ALL") {
      logs = logs.filter(l => l.action === filters.action);
    }
  }

  if (filters?.search && filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    logs = logs.filter(
      log =>
        log.action.toLowerCase().includes(q) ||
        (log.actorName && log.actorName.toLowerCase().includes(q)) ||
        log.actorClerkUserId.toLowerCase().includes(q) ||
        (log.targetResource && log.targetResource.toLowerCase().includes(q)) ||
        (log.entityId && log.entityId.toLowerCase().includes(q)) ||
        (log.metadata && log.metadata.toLowerCase().includes(q)) ||
        (log.newValue && log.newValue.toLowerCase().includes(q))
    );
  }

  return logs;
}

/**
 * Super Admin Omniscient Surveillance Metrics & Live Pulse
 */
export async function getAdminSurveillanceMetrics() {
  const db = await getDb();
  let allLogs: schema.AuditLog[] = [];

  if (db) {
    allLogs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);
  }

  if (allLogs.length === 0 && inMemoryAuditLogs.length > 0) {
    allLogs = [...inMemoryAuditLogs];
  }

  if (allLogs.length === 0) {
    return {
      totalEvents: 0,
      events24h: 0,
      roleDistribution: {
        SUPER_ADMIN: 0,
        AUTHORITY_ADMIN: 0,
        AUTHORITY_OFFICER: 0,
        GOVERNMENT_EMPLOYEE: 0,
        SURVEYOR: 0,
        CITIZEN: 0,
      },
      topActions: [],
      highRiskEventsCount: 0,
      recentSecurityAlerts: [],
    };
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const events24h = allLogs.filter(l => new Date(l.createdAt) >= oneDayAgo).length;

  const roleDistribution: Record<string, number> = {
    SUPER_ADMIN: 0,
    AUTHORITY_ADMIN: 0,
    AUTHORITY_OFFICER: 0,
    GOVERNMENT_EMPLOYEE: 0,
    SURVEYOR: 0,
    CITIZEN: 0,
  };
  const actionCounts: Record<string, number> = {};

  for (const log of allLogs) {
    const role = log.actorRole || "CITIZEN";
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  }

  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const securityActionKeywords = [
    "ROLE_CHANGED",
    "USER_SUSPENDED",
    "USER_DISABLED",
    "PROPERTY_REJECTED",
    "INVITATION_REVOKED",
    "3D_FOOTPRINT_HEIGHT_SANCTIONED",
  ];

  const recentSecurityAlerts = allLogs.filter(l =>
    securityActionKeywords.some(k => l.action.includes(k))
  );

  return {
    totalEvents: allLogs.length,
    events24h,
    roleDistribution,
    topActions,
    highRiskEventsCount: recentSecurityAlerts.length,
    recentSecurityAlerts: recentSecurityAlerts.slice(0, 6),
  };
}

/**
 * Super Admin User Activity Roster ("Who is Doing What")
 */
export async function getUserActivityRoster() {
  const db = await getDb();
  if (!db) return [];

  const [allUsers, allLogs] = await Promise.all([
    db.select().from(users).orderBy(desc(users.lastSignedIn)).limit(100),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(1000),
  ]);

  const userLogsMap = new Map<string, schema.AuditLog[]>();
  for (const log of allLogs) {
    const list = userLogsMap.get(log.actorClerkUserId) || [];
    list.push(log);
    userLogsMap.set(log.actorClerkUserId, list);
  }

  return allUsers.map(user => {
    const userLogs = userLogsMap.get(user.clerkUserId) || [];
    return {
      id: user.id,
      clerkUserId: user.clerkUserId,
      name: user.name || "Anonymous User",
      email: user.email || "",
      role: user.role,
      status: user.status,
      designation: user.designation,
      departmentId: user.departmentId,
      districtId: user.districtId,
      lastSignedIn: user.lastSignedIn,
      totalActionsCount: userLogs.length,
      lastAction: userLogs[0]?.action || null,
      lastActionTimestamp: userLogs[0]?.createdAt || null,
    };
  });
}

/**
 * Super Admin Dashboard Aggregated Metrics
 */
export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalCitizens: 0,
      totalAuthorities: 0,
      activeOfficers: 0,
      pendingApplications: 0,
      verifiedProperties: 0,
      mappedProperties: 0,
      surveyProjects: 0,
      auditLogsCount: 0,
      totalDepartments: 0,
      totalDistricts: 0,
    };
  }

  const [allUsers, submissions, cadastre, logs, depts, dists, files] =
    await Promise.all([
      db.select({ role: users.role, status: users.status }).from(users),
      db.select({ status: verificationSubmissions.status }).from(verificationSubmissions),
      db.select({ id: cadastreRecords.id, status: cadastreRecords.status }).from(cadastreRecords),
      db.select({ id: auditLogs.id }).from(auditLogs),
      db.select({ id: departments.id }).from(departments),
      db.select({ id: districts.id }).from(districts),
      db.select({ id: evidenceFiles.id }).from(evidenceFiles),
    ]);

  const totalCitizens = allUsers.filter(u => {
    const c = canonicalRole(u.role);
    return c === PlatformRoles.CITIZEN;
  }).length;

  const authorityUsers = allUsers.filter(u => {
    const c = canonicalRole(u.role);
    return (
      c === PlatformRoles.AUTHORITY_ADMIN ||
      c === PlatformRoles.AUTHORITY_OFFICER ||
      c === PlatformRoles.GOVERNMENT_EMPLOYEE ||
      c === PlatformRoles.SURVEYOR
    );
  });

  const activeOfficers = authorityUsers.filter(
    u => u.status === UserStatuses.ACTIVE
  ).length;

  const pendingApplications = submissions.filter(
    s => s.status === "submitted" || s.status === "under_review"
  ).length;

  const verifiedProperties = cadastre.filter(
    c => c.status === "Verified"
  ).length;

  return {
    totalCitizens,
    totalAuthorities: authorityUsers.length,
    activeOfficers,
    pendingApplications,
    verifiedProperties,
    mappedProperties: cadastre.length,
    surveyProjects: files.length,
    auditLogsCount: logs.length,
    totalDepartments: depts.length,
    totalDistricts: dists.length,
  };
}

/**
 * Authority Dashboard Summary
 */
export async function getAuthorityDashboardStats(user?: schema.User | null) {
  const db = await getDb();
  if (!db) {
    return {
      assignedProperties: 0,
      pendingVerification: 0,
      approvedCount: 0,
      rejectedCount: 0,
      recentSubmissions: [],
    };
  }

  const [submissions, cadastre] = await Promise.all([
    db.select().from(verificationSubmissions).orderBy(desc(verificationSubmissions.createdAt)).limit(50),
    db.select({ id: cadastreRecords.id, status: cadastreRecords.status }).from(cadastreRecords),
  ]);

  const pendingVerification = submissions.filter(
    s => s.status === "submitted" || s.status === "under_review"
  ).length;
  const approvedCount = submissions.filter(s => s.status === "verified").length;
  const rejectedCount = submissions.filter(s => s.status === "rejected").length;

  return {
    assignedProperties: cadastre.length,
    pendingVerification,
    approvedCount,
    rejectedCount,
    recentSubmissions: submissions.slice(0, 10),
  };
}

/**
 * Surveyor Dashboard Summary
 */
export async function getSurveyorDashboardStats(user?: schema.User | null) {
  const db = await getDb();
  if (!db) {
    return {
      assignedSurveys: 0,
      uploadedDatasets: 0,
      verifiedFootprints: 0,
      recentUploads: [],
    };
  }

  const [files, cadastre] = await Promise.all([
    db.select().from(evidenceFiles).orderBy(desc(evidenceFiles.createdAt)).limit(50),
    db.select({ id: cadastreRecords.id, status: cadastreRecords.status }).from(cadastreRecords),
  ]);

  return {
    assignedSurveys: 12,
    uploadedDatasets: files.length,
    verifiedFootprints: cadastre.length,
    recentUploads: files.slice(0, 10),
  };
}

/**
 * Citizen Dashboard Summary
 */
export async function getCitizenDashboardStats(clerkUserId: string) {
  const db = await getDb();
  if (!db) {
    return {
      myPropertiesCount: 0,
      myApplicationsCount: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      mySubmissions: [],
      myIssueReports: [],
    };
  }

  const [submissions, issues, cadastre] = await Promise.all([
    db
      .select()
      .from(verificationSubmissions)
      .where(eq(verificationSubmissions.submittedByClerkUserId, clerkUserId))
      .orderBy(desc(verificationSubmissions.createdAt)),
    db
      .select()
      .from(issueReports)
      .where(eq(issueReports.reportedByClerkUserId, clerkUserId))
      .orderBy(desc(issueReports.createdAt)),
    db.select().from(cadastreRecords).limit(5),
  ]);

  const pendingApplications = submissions.filter(
    s => s.status === "submitted" || s.status === "under_review"
  ).length;
  const approvedApplications = submissions.filter(
    s => s.status === "verified"
  ).length;

  return {
    myPropertiesCount: 1, // linked property demo
    myApplicationsCount: submissions.length + issues.length,
    pendingApplications,
    approvedApplications,
    mySubmissions: submissions,
    myIssueReports: issues,
    sampleProperties: cadastre.slice(0, 2),
  };
}

/**
 * Filtered Cadastre Directory query for Government & Authority exploration
 */
export async function getCadastreFiltered(filters?: {
  query?: string;
  districtId?: number;
  status?: string;
  limit?: number;
}) {
  const allRecords = await getCadastreRecords();
  let filtered = allRecords;

  if (filters?.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    filtered = filtered.filter(
      r =>
        r.ulpin.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.parcel.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q)
    );
  }

  if (filters?.status && filters.status !== "ALL") {
    filtered = filtered.filter(
      r => r.status.toLowerCase() === filters.status!.toLowerCase()
    );
  }

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Generates full payload for printable / downloadable official 3D ULPIN Title Certificate
 */
export async function getCertificateData(ulpinOrReference: string) {
  const records = await getCadastreRecords();
  const target =
    records.find(
      r =>
        r.ulpin.toLowerCase() === ulpinOrReference.toLowerCase().trim() ||
        r.parcel.toLowerCase() === ulpinOrReference.toLowerCase().trim()
    ) || records[0];

  if (!target) {
    throw new Error(`No cadastre record found matching ${ulpinOrReference}`);
  }

  const [depts, dists] = await Promise.all([getDepartments(), getDistricts()]);

  const sanitizedUlpin = (target.ulpin || "IN-BR-PAT-0042-3D").replace(/[^a-zA-Z0-9]/g, "-").toUpperCase();

  return {
    certificateNumber: `CERT-ULPIN-${sanitizedUlpin}`,
    ulpin: target.ulpin,
    title: target.title,
    parcelReference: target.parcel,
    buildingName: target.building,
    unitNumber: target.unit,
    floorLevel: target.floor,
    areaSqMeters: target.area,
    volumeCubicMeters: target.volume,
    elevationAboveMSL: target.elevation,
    verificationStatus: target.status,
    ownershipRights: target.rights,
    evidenceChain: target.evidence,
    issuedBy: "3D Land Authority (DoLR), Ministry of Rural Development",
    issuingAuthority: "Department of Land Resources (DoLR), Ministry of Rural Development",
    state: "Bihar",
    district: dists[0]?.name || "Patna",
    geodeticDatum: "WGS84 / EPSG:4326 (3D Ellipsoidal)",
    coordinatesCentroid: {
      latitude: 25.5941,
      longitude: 85.1376,
      heightMSL: target.elevation,
    },
    verificationTimestamp: new Date().toISOString(),
    qrVerificationUrl: `https://sih2026.gov.in/verify-certificate?ulpin=${encodeURIComponent(target.ulpin)}`,
    qrVerificationCode: `https://sih2026.gov.in/verify-certificate?ulpin=${encodeURIComponent(target.ulpin)}`,
    securityWatermark: "NATIONAL 3D CADASTRAL REGISTRY · GOVERNMENT OF INDIA",
  };
}

/**
 * Inter-Departmental Spatial Conflict & Height Clearance Alerts
 */
export async function getConflictAlerts() {
  return [
    {
      id: "CONF-2026-081",
      severity: "HIGH",
      title: "Municipal Height Limit Discrepancy",
      conflictType: "MUNICIPAL_HEIGHT_LIMIT_DISCREPANCY",
      ulpin: "IN-BR-PAT-0042-3D-F04",
      parcel: "Plot 42/B, Danapur Main",
      involvedDepartments: ["URBAN_DEV", "REV_LR"],
      description:
        "Building permit sanctions 45.2m extrusion; revenue record specifies G+3 zoning height restriction (15.0m max).",
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: "OPEN",
    },
    {
      id: "CONF-2026-044",
      severity: "MEDIUM",
      title: "Vertical Floor Plan Overlap",
      conflictType: "VERTICAL_FLOOR_PLAN_OVERLAP",
      ulpin: "IN-BR-PAT-0012-3D-U02",
      parcel: "Survey 12, Exhibition Road",
      involvedDepartments: ["DLRS", "TCPO"],
      description:
        "Commercial unit boundary slice overlaps 0.8m with adjacent common utility corridor.",
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
      status: "UNDER_INSPECTION",
    },
    {
      id: "CONF-2026-019",
      severity: "LOW",
      title: "Pending Khatiyan Deed Mutation Link",
      conflictType: "PENDING_KHATIYAN_MUTATION",
      ulpin: "IN-BR-PAT-0088-3D-F01",
      parcel: "Khasra 88, Kankarbagh",
      involvedDepartments: ["REG_STAMPS", "REV_LR"],
      description:
        "Conveyance deed registered; automated 3D spatial boundary update awaiting land revenue mutation clearance.",
      timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
      status: "PENDING_CLEARANCE",
    },
  ];
}

/**
 * Assigned Survey Missions for Field Surveyors
 */
export async function getAssignedSurveyMissions(surveyorClerkUserId?: string) {
  return [
    {
      id: "SM-2026-001",
      missionName: "Patna Central Volumetric Height Survey",
      parcelReference: "Plot 42/B, Danapur Main",
      ulpin: "IN-BR-PAT-0042-3D-F04",
      priority: "HIGH",
      status: "IN_PROGRESS",
      targetDistrict: "Patna",
      instructions: "Perform GNSS RTK CORS ground check and measure total building height to verify municipal permit claim.",
      assignedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      gcpPointsCount: 4,
    },
    {
      id: "SM-2026-002",
      missionName: "Exhibition Road 3D Floor Boundary Verification",
      parcelReference: "Survey 12, Exhibition Road",
      ulpin: "IN-BR-PAT-0012-3D-U02",
      priority: "MEDIUM",
      status: "ASSIGNED",
      targetDistrict: "Patna",
      instructions: "Capture laser distance measurements of 2nd floor commercial parcel boundary and verify common wall clearance.",
      assignedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      gcpPointsCount: 0,
    },
    {
      id: "SM-2026-003",
      missionName: "Bailey Road Multi-Storey Drone Photogrammetry",
      parcelReference: "Plot 104, Bailey Road Corridor",
      ulpin: "IN-BR-PAT-0104-3D-F12",
      priority: "LOW",
      status: "COMPLETED",
      targetDistrict: "Patna",
      instructions: "Ingest high-density point cloud and extract building boundary polygon coordinates.",
      assignedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      gcpPointsCount: 8,
    },
  ];
}

/**
 * 3D Floor Cadastre & Unit-Level Volumetric Slicing Methods
 */
export async function getBuildingFloorStack(buildingIdOrUlpin: string): Promise<BuildingFloorStackRecord> {
  const stack = getBuildingFloorStackRecord(buildingIdOrUlpin);
  if (!stack) {
    return SAMPLE_BUILDING_FLOOR_STACKS[0];
  }
  return stack;
}

export async function getAllBuildingFloorStacks(): Promise<BuildingFloorStackRecord[]> {
  return SAMPLE_BUILDING_FLOOR_STACKS;
}

export async function getUnitCadastreDetails(ulpin3d: string): Promise<{
  building: BuildingFloorStackRecord;
  floor: FloorStackLevel;
  unit: FloorUnitCadastre;
} | null> {
  return getUnitDetailsFromCadastre(ulpin3d);
}

// ==========================================
// CADASTRAL GRIEVANCES & ENFORCEMENT ENGINE
// ==========================================

import type {
  CitizenGrievanceInput,
  EnforcementActionData,
  GrievanceCategory,
  GrievanceStatus,
  SurveyorReportData,
} from "@shared/cadastralGrievance";

let _grievanceSequence = 1004;

const _inMemoryGrievances: CadastralGrievance[] = [
  {
    id: 1,
    grievanceNumber: "GRV-2026-PAT-1001",
    ulpinOrReference: "IN-BR-PAT-0042-3D-B01",
    buildingName: "IIT Patna Admin Complex - Block B",
    category: "HEIGHT_VIOLATION",
    title: "Unapproved 5th Floor Construction and Height Limit Breach",
    details: "The sanctioned map allows ground + 3 floors (14.5m), but contractor is actively constructing a 5th floor (exceeding 21m) without clearance.",
    latitude: "25.6124294",
    longitude: "85.054779",
    evidencePhotos: JSON.stringify([
      "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80"
    ]),
    citizenClerkUserId: "user_citizen_demo",
    citizenName: "Rahul Sharma",
    citizenContact: "+91 98765 43210",
    isAnonymous: "false",
    status: "SURVEYOR_ASSIGNED",
    rejectionReason: null,
    rejectedAt: null,
    rejectedByClerkUserId: null,
    assignedSurveyorClerkUserId: "user_surveyor_demo",
    assignedSurveyorName: "Officer Vikram Singh (Field Cadastre)",
    dispatchInstructions: "Conduct GNSS RTK CORS height audit and laser measure total building height against sanctioned 14.5m municipal limit.",
    priority: "HIGH",
    dispatchedAt: new Date(Date.now() - 3600000 * 36),
    targetInspectionDate: new Date(Date.now() + 3600000 * 24),
    surveyorReport: null,
    enforcementAction: null,
    createdAt: new Date(Date.now() - 3600000 * 48),
    updatedAt: new Date(Date.now() - 3600000 * 36),
  },
  {
    id: 2,
    grievanceNumber: "GRV-2026-PAT-1002",
    ulpinOrReference: "IN-BR-PAT-0012-3D-U02",
    buildingName: "Exhibition Road Commercial Tower",
    category: "FIRE_SAFETY_HAZARD",
    title: "Emergency Fire Escape Blocked by Commercial Stalls",
    details: "Main emergency stairway and fire tender movement corridor blocked by unapproved retail extensions. Zero setback clearance.",
    latitude: "25.608120",
    longitude: "85.141230",
    evidencePhotos: JSON.stringify([
      "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f7?auto=format&fit=crop&w=800&q=80"
    ]),
    citizenClerkUserId: "user_citizen_demo2",
    citizenName: "Priya Verma",
    citizenContact: "+91 98111 22334",
    isAnonymous: "false",
    status: "FIELD_VERIFIED",
    rejectionReason: null,
    rejectedAt: null,
    rejectedByClerkUserId: null,
    assignedSurveyorClerkUserId: "user_surveyor_demo",
    assignedSurveyorName: "Officer Vikram Singh (Field Cadastre)",
    dispatchInstructions: "Verify 6-metre minimum fire driveway corridor and emergency exit compliance.",
    priority: "HIGH",
    dispatchedAt: new Date(Date.now() - 3600000 * 72),
    targetInspectionDate: new Date(Date.now() - 3600000 * 24),
    surveyorReport: JSON.stringify({
      actualHeightMetres: 24.2,
      approvedHeightMetres: 24.0,
      actualFloors: 6,
      approvedFloors: 6,
      fireSafetyClearance: "FAILED",
      setbackEncroachmentMetres: 2.8,
      remarks: "Field audit confirmed emergency exit corridor is encroached by 2.8m permanent structures. Fire tender access completely obstructed.",
      verdict: "VIOLATION_CONFIRMED",
      submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      surveyorClerkUserId: "user_surveyor_demo",
      surveyorName: "Officer Vikram Singh (Field Cadastre)",
    } satisfies SurveyorReportData),
    enforcementAction: null,
    createdAt: new Date(Date.now() - 3600000 * 96),
    updatedAt: new Date(Date.now() - 3600000 * 12),
  },
  {
    id: 3,
    grievanceNumber: "GRV-2026-PAT-1003",
    ulpinOrReference: "IN-BR-PAT-0099-3D-Z04",
    buildingName: "Ganga Riverfront Prohibited Eco-Zone",
    category: "ZONING_PROHIBITED_AREA",
    title: "Illegal Resort Construction Inside Prohibited Eco-Sensitive Zone",
    details: "Heavy concrete construction in progress within 200m prohibited river embankment green buffer zone.",
    latitude: "25.623400",
    longitude: "85.184200",
    evidencePhotos: JSON.stringify([]),
    citizenClerkUserId: "user_citizen_demo3",
    citizenName: "Amit Kumar",
    citizenContact: "+91 97766 55443",
    isAnonymous: "false",
    status: "SEALED",
    rejectionReason: null,
    rejectedAt: null,
    rejectedByClerkUserId: null,
    assignedSurveyorClerkUserId: "user_surveyor_demo",
    assignedSurveyorName: "Officer Vikram Singh (Field Cadastre)",
    dispatchInstructions: "Confirm geo-coordinates against state riverfront master plan boundary.",
    priority: "HIGH",
    dispatchedAt: new Date(Date.now() - 3600000 * 120),
    targetInspectionDate: new Date(Date.now() - 3600000 * 90),
    surveyorReport: JSON.stringify({
      actualHeightMetres: 12.0,
      approvedHeightMetres: 0,
      actualFloors: 3,
      approvedFloors: 0,
      fireSafetyClearance: "FAILED",
      setbackEncroachmentMetres: 180,
      remarks: "Structure is fully located within Non-Development Zone buffer. No municipal building permission exists on record.",
      verdict: "VIOLATION_CONFIRMED",
      submittedAt: new Date(Date.now() - 3600000 * 80).toISOString(),
      surveyorClerkUserId: "user_surveyor_demo",
      surveyorName: "Officer Vikram Singh (Field Cadastre)",
    } satisfies SurveyorReportData),
    enforcementAction: JSON.stringify({
      actionType: "SEAL_PROPERTY",
      orderNumber: "SEAL-ORD-2026-PAT-0089",
      fineAmountInr: 500000,
      legalNoticeText: "By order of the Competent Municipal Authority & District Magistrate, this unauthorized structure is hereby IMMEDIATELY SEALED under Bihar Municipal Act Sec 314. Trespassers and unauthorized occupants will face immediate penal prosecution.",
      issuedByClerkUserId: "user_admin_demo",
      issuedByName: "Super Administrator / DM Patna",
      issuedByRole: "SUPER_ADMIN",
      executedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    } satisfies EnforcementActionData),
    createdAt: new Date(Date.now() - 3600000 * 140),
    updatedAt: new Date(Date.now() - 3600000 * 40),
  }
];

export async function createCadastralGrievance(input: CitizenGrievanceInput & {
  citizenClerkUserId: string;
  actorRole?: string;
  actorName?: string;
}): Promise<CadastralGrievance> {
  const grievanceNumber = `GRV-2026-PAT-${++_grievanceSequence}`;
  const now = new Date();

  const grievanceRecord: CadastralGrievance = {
    id: _grievanceSequence,
    grievanceNumber,
    ulpinOrReference: input.ulpinOrReference,
    buildingName: input.buildingName || "Reference Cadastral Footprint",
    category: input.category,
    title: input.title,
    details: input.details,
    latitude: input.latitude || null,
    longitude: input.longitude || null,
    evidencePhotos: JSON.stringify(input.evidencePhotos || []),
    citizenClerkUserId: input.citizenClerkUserId,
    citizenName: input.isAnonymous ? "Anonymous Citizen" : (input.citizenName || input.actorName || "Concerned Citizen"),
    citizenContact: input.isAnonymous ? null : (input.citizenContact || null),
    isAnonymous: input.isAnonymous ? "true" : "false",
    status: "SUBMITTED",
    rejectionReason: null,
    rejectedAt: null,
    rejectedByClerkUserId: null,
    assignedSurveyorClerkUserId: null,
    assignedSurveyorName: null,
    dispatchInstructions: null,
    priority: "MEDIUM",
    dispatchedAt: null,
    targetInspectionDate: null,
    surveyorReport: null,
    enforcementAction: null,
    createdAt: now,
    updatedAt: now,
  };

  _inMemoryGrievances.unshift(grievanceRecord);

  const db = await getDb();
  if (db) {
    try {
      await db.insert(cadastralGrievances).values({
        grievanceNumber: grievanceRecord.grievanceNumber,
        ulpinOrReference: grievanceRecord.ulpinOrReference,
        buildingName: grievanceRecord.buildingName,
        category: grievanceRecord.category,
        title: grievanceRecord.title,
        details: grievanceRecord.details,
        latitude: grievanceRecord.latitude,
        longitude: grievanceRecord.longitude,
        evidencePhotos: grievanceRecord.evidencePhotos,
        citizenClerkUserId: grievanceRecord.citizenClerkUserId,
        citizenName: grievanceRecord.citizenName,
        citizenContact: grievanceRecord.citizenContact,
        isAnonymous: grievanceRecord.isAnonymous,
        status: grievanceRecord.status,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      console.warn("[Database] cadastralGrievances table insert fallback to memory:", err);
    }
  }

  await createAuditLog({
    actorClerkUserId: input.citizenClerkUserId,
    actorRole: input.actorRole || "CITIZEN",
    actorName: grievanceRecord.citizenName,
    action: "CADASTRAL_GRIEVANCE_SUBMITTED",
    entityType: "cadastral_grievance",
    entityId: grievanceNumber,
    targetResource: input.ulpinOrReference,
    newValue: JSON.stringify({
      grievanceNumber,
      category: input.category,
      title: input.title,
      ulpin: input.ulpinOrReference,
    }),
  });

  return grievanceRecord;
}

export async function getCadastralGrievances(filters?: {
  status?: string;
  category?: string;
  citizenClerkUserId?: string;
  assignedSurveyorClerkUserId?: string;
  ulpinOrReference?: string;
  limit?: number;
}): Promise<CadastralGrievance[]> {
  const db = await getDb();
  if (db) {
    try {
      let query = db.select().from(cadastralGrievances).$dynamic();
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(cadastralGrievances.status, filters.status));
      }
      if (filters?.category) {
        conditions.push(eq(cadastralGrievances.category, filters.category));
      }
      if (filters?.citizenClerkUserId) {
        conditions.push(eq(cadastralGrievances.citizenClerkUserId, filters.citizenClerkUserId));
      }
      if (filters?.assignedSurveyorClerkUserId) {
        conditions.push(eq(cadastralGrievances.assignedSurveyorClerkUserId, filters.assignedSurveyorClerkUserId));
      }
      if (filters?.ulpinOrReference) {
        conditions.push(eq(cadastralGrievances.ulpinOrReference, filters.ulpinOrReference));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const dbRows = await query.orderBy(desc(cadastralGrievances.createdAt)).limit(filters?.limit ?? 50);
      if (dbRows && dbRows.length > 0) {
        return dbRows;
      }
    } catch {
      // Fallback to memory
    }
  }

  // In-memory filter
  return _inMemoryGrievances.filter(g => {
    if (filters?.status && g.status !== filters.status) return false;
    if (filters?.category && g.category !== filters.category) return false;
    if (filters?.citizenClerkUserId && g.citizenClerkUserId !== filters.citizenClerkUserId) return false;
    if (filters?.assignedSurveyorClerkUserId && g.assignedSurveyorClerkUserId !== filters.assignedSurveyorClerkUserId) return false;
    if (filters?.ulpinOrReference && g.ulpinOrReference !== filters.ulpinOrReference) return false;
    return true;
  }).slice(0, filters?.limit ?? 50);
}

export async function getGrievanceById(idOrNumber: string | number): Promise<CadastralGrievance | null> {
  const match = _inMemoryGrievances.find(
    g => g.id === Number(idOrNumber) || g.grievanceNumber === String(idOrNumber)
  );
  if (match) return match;

  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(cadastralGrievances)
        .where(
          typeof idOrNumber === "number" || !isNaN(Number(idOrNumber))
            ? or(eq(cadastralGrievances.id, Number(idOrNumber)), eq(cadastralGrievances.grievanceNumber, String(idOrNumber)))
            : eq(cadastralGrievances.grievanceNumber, String(idOrNumber))
        )
        .limit(1);
      if (rows[0]) return rows[0];
    } catch {
      // ignore
    }
  }

  return null;
}

export async function rejectGrievanceByAuthority(input: {
  grievanceId: number | string;
  rejectionReason: string;
  actorClerkUserId: string;
  actorRole: string;
  actorName?: string | null;
}): Promise<CadastralGrievance> {
  const grievance = await getGrievanceById(input.grievanceId);
  if (!grievance) throw new Error("Grievance record not found.");

  const now = new Date();
  grievance.status = "REJECTED";
  grievance.rejectionReason = input.rejectionReason;
  grievance.rejectedAt = now;
  grievance.rejectedByClerkUserId = input.actorClerkUserId;
  grievance.updatedAt = now;

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(cadastralGrievances)
        .set({
          status: "REJECTED",
          rejectionReason: input.rejectionReason,
          rejectedAt: now,
          rejectedByClerkUserId: input.actorClerkUserId,
          updatedAt: now,
        })
        .where(eq(cadastralGrievances.id, grievance.id));
    } catch {
      // memory updated
    }
  }

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: "GRIEVANCE_REJECTED_BY_AUTHORITY",
    entityType: "cadastral_grievance",
    entityId: grievance.grievanceNumber,
    targetResource: grievance.ulpinOrReference,
    newValue: JSON.stringify({
      grievanceNumber: grievance.grievanceNumber,
      rejectionReason: input.rejectionReason,
    }),
  });

  return grievance;
}

export async function assignGrievanceToSurveyor(input: {
  grievanceId: number | string;
  surveyorClerkUserId: string;
  surveyorName?: string;
  instructions: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  targetInspectionDays?: number;
  actorClerkUserId: string;
  actorRole: string;
  actorName?: string | null;
}): Promise<CadastralGrievance> {
  const grievance = await getGrievanceById(input.grievanceId);
  if (!grievance) throw new Error("Grievance record not found.");

  const now = new Date();
  const targetDate = new Date(Date.now() + (input.targetInspectionDays || 3) * 86400000);

  grievance.status = "SURVEYOR_ASSIGNED";
  grievance.assignedSurveyorClerkUserId = input.surveyorClerkUserId;
  grievance.assignedSurveyorName = input.surveyorName || "Assigned Field Cadastre Surveyor";
  grievance.dispatchInstructions = input.instructions;
  grievance.priority = input.priority || "MEDIUM";
  grievance.dispatchedAt = now;
  grievance.targetInspectionDate = targetDate;
  grievance.updatedAt = now;

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(cadastralGrievances)
        .set({
          status: "SURVEYOR_ASSIGNED",
          assignedSurveyorClerkUserId: input.surveyorClerkUserId,
          assignedSurveyorName: grievance.assignedSurveyorName,
          dispatchInstructions: input.instructions,
          priority: grievance.priority,
          dispatchedAt: now,
          targetInspectionDate: targetDate,
          updatedAt: now,
        })
        .where(eq(cadastralGrievances.id, grievance.id));
    } catch {
      // memory updated
    }
  }

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: "GRIEVANCE_SURVEYOR_ASSIGNED",
    entityType: "cadastral_grievance",
    entityId: grievance.grievanceNumber,
    targetUserId: input.surveyorClerkUserId,
    targetResource: grievance.ulpinOrReference,
    newValue: JSON.stringify({
      grievanceNumber: grievance.grievanceNumber,
      surveyorClerkUserId: input.surveyorClerkUserId,
      instructions: input.instructions,
      priority: grievance.priority,
    }),
  });

  return grievance;
}

export async function submitSurveyorVerificationReport(input: {
  grievanceId: number | string;
  report: Omit<SurveyorReportData, "submittedAt" | "surveyorClerkUserId" | "surveyorName">;
  actorClerkUserId: string;
  actorRole: string;
  actorName?: string | null;
}): Promise<CadastralGrievance> {
  const grievance = await getGrievanceById(input.grievanceId);
  if (!grievance) throw new Error("Grievance record not found.");

  const now = new Date();
  const fullReport: SurveyorReportData = {
    ...input.report,
    submittedAt: now.toISOString(),
    surveyorClerkUserId: input.actorClerkUserId,
    surveyorName: input.actorName || "Field Surveyor",
  };

  grievance.status = "FIELD_VERIFIED";
  grievance.surveyorReport = JSON.stringify(fullReport);
  grievance.updatedAt = now;

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(cadastralGrievances)
        .set({
          status: "FIELD_VERIFIED",
          surveyorReport: grievance.surveyorReport,
          updatedAt: now,
        })
        .where(eq(cadastralGrievances.id, grievance.id));
    } catch {
      // memory updated
    }
  }

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: "GRIEVANCE_FIELD_AUDIT_SUBMITTED",
    entityType: "cadastral_grievance",
    entityId: grievance.grievanceNumber,
    targetResource: grievance.ulpinOrReference,
    newValue: JSON.stringify(fullReport),
  });

  return grievance;
}

export async function executeEnforcementOrder(input: {
  grievanceId: number | string;
  actionType: "SEAL_PROPERTY" | "DEMOLITION_ORDER" | "PENALTY" | "CLEARED" | "RE_SURVEY";
  fineAmountInr?: number | null;
  legalNoticeText: string;
  actorClerkUserId: string;
  actorRole: string;
  actorName?: string | null;
}): Promise<CadastralGrievance> {
  const grievance = await getGrievanceById(input.grievanceId);
  if (!grievance) throw new Error("Grievance record not found.");

  const now = new Date();
  const orderNumber = `${input.actionType === "SEAL_PROPERTY" ? "SEAL-ORD" : input.actionType === "DEMOLITION_ORDER" ? "DEMO-ORD" : "ENF-ORD"}-2026-PAT-${Math.floor(1000 + Math.random() * 9000)}`;

  const enforcementData: EnforcementActionData = {
    actionType: input.actionType,
    orderNumber,
    fineAmountInr: input.fineAmountInr || null,
    legalNoticeText: input.legalNoticeText,
    issuedByClerkUserId: input.actorClerkUserId,
    issuedByName: input.actorName || "Executive Enforcement Authority",
    issuedByRole: input.actorRole,
    executedAt: now.toISOString(),
  };

  const statusMap: Record<typeof input.actionType, GrievanceStatus> = {
    SEAL_PROPERTY: "SEALED",
    DEMOLITION_ORDER: "DEMOLITION_ORDER",
    PENALTY: "PENALTY_ISSUED",
    CLEARED: "RESOLVED",
    RE_SURVEY: "SURVEYOR_ASSIGNED",
  };

  grievance.status = statusMap[input.actionType] || "RESOLVED";
  grievance.enforcementAction = JSON.stringify(enforcementData);
  grievance.updatedAt = now;

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(cadastralGrievances)
        .set({
          status: grievance.status,
          enforcementAction: grievance.enforcementAction,
          updatedAt: now,
        })
        .where(eq(cadastralGrievances.id, grievance.id));
    } catch {
      // memory updated
    }
  }

  await createAuditLog({
    actorClerkUserId: input.actorClerkUserId,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: input.actionType === "SEAL_PROPERTY" ? "PROPERTY_SEALING_ORDER_EXECUTED" : "CADASTRAL_ENFORCEMENT_ORDER_EXECUTED",
    entityType: "cadastral_grievance",
    entityId: grievance.grievanceNumber,
    targetResource: grievance.ulpinOrReference,
    newValue: JSON.stringify(enforcementData),
  });

  return grievance;
}

export async function getGrievanceStats(): Promise<{
  totalGrievances: number;
  submittedPendingTriage: number;
  surveyorAssigned: number;
  fieldVerified: number;
  sealedProperties: number;
  demolitionOrders: number;
  penaltiesIssued: number;
  resolvedClosed: number;
  rejectedCount: number;
}> {
  const grievances = await getCadastralGrievances({ limit: 1000 });
  return {
    totalGrievances: grievances.length,
    submittedPendingTriage: grievances.filter(g => g.status === "SUBMITTED").length,
    surveyorAssigned: grievances.filter(g => g.status === "SURVEYOR_ASSIGNED").length,
    fieldVerified: grievances.filter(g => g.status === "FIELD_VERIFIED").length,
    sealedProperties: grievances.filter(g => g.status === "SEALED").length,
    demolitionOrders: grievances.filter(g => g.status === "DEMOLITION_ORDER").length,
    penaltiesIssued: grievances.filter(g => g.status === "PENALTY_ISSUED").length,
    resolvedClosed: grievances.filter(g => g.status === "RESOLVED").length,
    rejectedCount: grievances.filter(g => g.status === "REJECTED").length,
  };
}


