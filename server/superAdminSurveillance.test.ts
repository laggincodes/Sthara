import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { PlatformRoles, UserStatuses } from "../shared/permissions";

function createMockContext(userOptions?: {
  role?: string;
  status?: string;
  clerkUserId?: string;
  email?: string;
  name?: string;
  departmentId?: number;
  districtId?: number;
}): TrpcContext {
  const role = userOptions?.role ?? "CITIZEN";
  const status = userOptions?.status ?? "ACTIVE";
  const clerkUserId = userOptions?.clerkUserId ?? `user_${role.toLowerCase()}`;

  return {
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: {
      id: 1,
      clerkUserId,
      name: userOptions?.name ?? `${role} Test User`,
      email: userOptions?.email ?? `${role.toLowerCase()}@example.test`,
      phone: null,
      loginMethod: "clerk",
      role: role as any,
      status: status as any,
      designation: null,
      departmentId: userOptions?.departmentId ?? null,
      districtId: userOptions?.districtId ?? null,
      organizationId: null,
      jurisdiction: null,
      invitationSentAt: null,
      invitationAcceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  };
}

describe("Super Admin Omniscient Surveillance & Audit Surveillance Tests", () => {
  describe("1. Super Admin Surveillance Metrics & Pulse", () => {
    it("allows Super Admin to fetch real-time surveillance statistics and role distribution", async () => {
      const ctx = createMockContext({ role: PlatformRoles.SUPER_ADMIN });
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.admin.surveillanceStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEvents).toBe("number");
      expect(typeof stats.events24h).toBe("number");
      expect(stats.roleDistribution).toBeDefined();
      expect(Array.isArray(stats.topActions)).toBe(true);
      expect(Array.isArray(stats.recentSecurityAlerts)).toBe(true);
    });

    it("blocks Citizen, Surveyor, and Government Employee from accessing surveillance metrics", async () => {
      const citizenCtx = createMockContext({ role: PlatformRoles.CITIZEN });
      const citizenCaller = appRouter.createCaller(citizenCtx);
      await expect(citizenCaller.admin.surveillanceStats()).rejects.toThrow();

      const surveyorCtx = createMockContext({ role: PlatformRoles.SURVEYOR });
      const surveyorCaller = appRouter.createCaller(surveyorCtx);
      await expect(surveyorCaller.admin.surveillanceStats()).rejects.toThrow();

      const govtCtx = createMockContext({ role: PlatformRoles.GOVERNMENT_EMPLOYEE });
      const govtCaller = appRouter.createCaller(govtCtx);
      await expect(govtCaller.admin.surveillanceStats()).rejects.toThrow();
    });
  });

  describe("2. User Activity Telemetry Roster", () => {
    it("allows Super Admin to fetch the active user roster with action telemetry", async () => {
      const ctx = createMockContext({ role: PlatformRoles.SUPER_ADMIN });
      const caller = appRouter.createCaller(ctx);

      const roster = await caller.admin.userActivityRoster();

      expect(Array.isArray(roster)).toBe(true);
      if (roster.length > 0) {
        const user = roster[0];
        expect(user).toHaveProperty("clerkUserId");
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("totalActionsCount");
        expect(typeof user.totalActionsCount).toBe("number");
      }
    });

    it("blocks non-admin users from accessing the user activity roster", async () => {
      const citizenCtx = createMockContext({ role: PlatformRoles.CITIZEN });
      const caller = appRouter.createCaller(citizenCtx);

      await expect(caller.admin.userActivityRoster()).rejects.toThrow();
    });
  });

  describe("3. Multi-Dimensional Forensic Audit Search", () => {
    it("allows Super Admin to query audit logs with search, role, and action filters", async () => {
      const ctx = createMockContext({ role: PlatformRoles.SUPER_ADMIN });
      const caller = appRouter.createCaller(ctx);

      const logs = await caller.admin.auditLogs({
        search: "",
        actorRole: "ALL",
        action: "ALL",
        limit: 20,
      });

      expect(Array.isArray(logs)).toBe(true);
      if (logs.length > 0) {
        const log = logs[0];
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("action");
        expect(log).toHaveProperty("actorRole");
        expect(log).toHaveProperty("actorClerkUserId");
      }
    });
  });

  describe("4. End-to-End Action Audit Logging Verification", () => {
    it("generates audit log when government officer generates a 3D ULPIN Title Certificate", async () => {
      const govtCtx = createMockContext({
        role: PlatformRoles.GOVERNMENT_EMPLOYEE,
        clerkUserId: "user_govt_surveillance_test",
        name: "Govt Surveillance Tester",
      });
      const govtCaller = appRouter.createCaller(govtCtx);

      const cert = await govtCaller.government.generateCertificateData({
        ulpinOrReference: "ULPIN-SURVEILLANCE-001",
      });
      expect(cert).toBeDefined();

      const adminCtx = createMockContext({ role: PlatformRoles.SUPER_ADMIN });
      const adminCaller = appRouter.createCaller(adminCtx);

      const logs = await adminCaller.admin.auditLogs({
        actorClerkUserId: "user_govt_surveillance_test",
      });

      const certLog = logs.find(l => l.action === "OFFICIAL_3D_CERTIFICATE_GENERATED");
      expect(certLog).toBeDefined();
      expect(certLog?.actorRole).toBe(PlatformRoles.GOVERNMENT_EMPLOYEE);
    });

    it("generates audit log when citizen generates their Digital ULPIN Card", async () => {
      const citizenCtx = createMockContext({
        role: PlatformRoles.CITIZEN,
        clerkUserId: "user_citizen_surveillance_test",
        name: "Citizen Card Tester",
      });
      const citizenCaller = appRouter.createCaller(citizenCtx);

      const cert = await citizenCaller.citizen.certificate({
        ulpin: "ULPIN-SURVEILLANCE-001",
      });
      expect(cert).toBeDefined();

      const adminCtx = createMockContext({ role: PlatformRoles.SUPER_ADMIN });
      const adminCaller = appRouter.createCaller(adminCtx);

      const logs = await adminCaller.admin.auditLogs({
        actorClerkUserId: "user_citizen_surveillance_test",
      });

      const cardLog = logs.find(l => l.action === "DIGITAL_ULPIN_CARD_GENERATED");
      expect(cardLog).toBeDefined();
      expect(cardLog?.actorRole).toBe(PlatformRoles.CITIZEN);
    });
  });
});
