import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  canonicalRole,
  formatRole,
  hasPermission,
  Permissions,
  PlatformRoles,
  UserStatuses,
} from "../shared/permissions";

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

describe("Complete Authentication, Admin, Authority & RBAC System", () => {
  describe("1. Role Canonicalization & Permissions Matrix", () => {
    it("canonicalizes all role variants to standard uppercase representation", () => {
      expect(canonicalRole("SUPER_ADMIN")).toBe(PlatformRoles.SUPER_ADMIN);
      expect(canonicalRole("admin")).toBe(PlatformRoles.SUPER_ADMIN);
      expect(canonicalRole("AUTHORITY_ADMIN")).toBe(PlatformRoles.AUTHORITY_ADMIN);
      expect(canonicalRole("AUTHORITY_OFFICER")).toBe(PlatformRoles.AUTHORITY_OFFICER);
      expect(canonicalRole("authority")).toBe(PlatformRoles.AUTHORITY_OFFICER);
      expect(canonicalRole("GOVERNMENT_EMPLOYEE")).toBe(PlatformRoles.GOVERNMENT_EMPLOYEE);
      expect(canonicalRole("government_employee")).toBe(PlatformRoles.GOVERNMENT_EMPLOYEE);
      expect(canonicalRole("SURVEYOR")).toBe(PlatformRoles.SURVEYOR);
      expect(canonicalRole("CITIZEN")).toBe(PlatformRoles.CITIZEN);
      expect(canonicalRole("citizen")).toBe(PlatformRoles.CITIZEN);
      expect(canonicalRole(null)).toBe(PlatformRoles.CITIZEN);
    });

    it("verifies granular permissions for each role", () => {
      // Super Admin has all permissions
      expect(hasPermission("SUPER_ADMIN", Permissions.MANAGE_USERS)).toBe(true);
      expect(hasPermission("SUPER_ADMIN", Permissions.MANAGE_AUTHORITIES)).toBe(true);
      expect(hasPermission("SUPER_ADMIN", Permissions.VERIFY_PROPERTY)).toBe(true);

      // Authority Officer has property verification, but not user management
      expect(hasPermission("AUTHORITY_OFFICER", Permissions.VERIFY_PROPERTY)).toBe(true);
      expect(hasPermission("AUTHORITY_OFFICER", Permissions.MANAGE_USERS)).toBe(false);
      expect(hasPermission("AUTHORITY_OFFICER", Permissions.MANAGE_SYSTEM)).toBe(false);

      // Surveyor has survey & GeoJSON upload, but not user management
      expect(hasPermission("SURVEYOR", Permissions.UPLOAD_SURVEY_DATA)).toBe(true);
      expect(hasPermission("SURVEYOR", Permissions.UPLOAD_GEOJSON)).toBe(true);
      expect(hasPermission("SURVEYOR", Permissions.MANAGE_USERS)).toBe(false);

      // Citizen has public view & application creation
      expect(hasPermission("CITIZEN", Permissions.VIEW_OWN_PROPERTY)).toBe(true);
      expect(hasPermission("CITIZEN", Permissions.CREATE_PROPERTY_APPLICATION)).toBe(true);
      expect(hasPermission("CITIZEN", Permissions.VERIFY_PROPERTY)).toBe(false);
      expect(hasPermission("CITIZEN", Permissions.MANAGE_USERS)).toBe(false);
    });
  });

  describe("2. Citizen Access Controls", () => {
    it("allows Citizen to view auth profile and dashboard summary", async () => {
      const caller = appRouter.createCaller(createMockContext({ role: "CITIZEN" }));
      const me = await caller.auth.me();
      expect(me).toBeDefined();
      expect(me?.canonicalRole).toBe("CITIZEN");
      expect(me?.permissions).toContain(Permissions.VIEW_OWN_PROPERTY);
    });

    it("strictly forbids Citizen from accessing Super Admin endpoints", async () => {
      const caller = appRouter.createCaller(createMockContext({ role: "CITIZEN" }));

      await expect(caller.admin.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.admin.users()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.admin.rolesAndPermissions()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("strictly forbids Citizen from accessing Authority endpoints", async () => {
      const caller = appRouter.createCaller(createMockContext({ role: "CITIZEN" }));

      await expect(caller.authority.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(caller.authority.assignedProperties()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("3. Authority Officer Access Controls", () => {
    it("allows Authority Officer to access assigned properties and verification stats", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "AUTHORITY_OFFICER" })
      );
      const stats = await caller.authority.stats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("assignedProperties");
      expect(stats).toHaveProperty("pendingVerification");
    });

    it("strictly forbids Authority Officer from accessing Super Admin endpoints", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "AUTHORITY_OFFICER" })
      );

      await expect(caller.admin.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.admin.inviteAuthority({
          name: "Test Officer",
          email: "test@bihar.gov.in",
          role: "AUTHORITY_OFFICER",
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("4. Surveyor Access Controls", () => {
    it("allows Surveyor to access surveyor stats", async () => {
      const caller = appRouter.createCaller(createMockContext({ role: "SURVEYOR" }));
      const stats = await caller.surveyor.stats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("assignedSurveys");
      expect(stats).toHaveProperty("uploadedDatasets");
    });

    it("strictly forbids Surveyor from accessing Admin endpoints", async () => {
      const caller = appRouter.createCaller(createMockContext({ role: "SURVEYOR" }));
      await expect(caller.admin.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("5. Government Employee Access Controls", () => {
    it("allows Government Employee to access operational statistics", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "GOVERNMENT_EMPLOYEE" })
      );
      const stats = await caller.government.stats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("records");
    });

    it("strictly forbids Government Employee from managing users or roles", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "GOVERNMENT_EMPLOYEE" })
      );
      await expect(
        caller.admin.updateRole({
          clerkUserId: "user_other",
          role: "SUPER_ADMIN",
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("6. Super Admin Operations & Security Guarantees", () => {
    it("allows Super Admin to view full system stats and roles matrix", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "SUPER_ADMIN", clerkUserId: "user_super_admin" })
      );
      const rolesMatrix = await caller.admin.rolesAndPermissions();
      expect(rolesMatrix).toBeDefined();
      expect(rolesMatrix.roles).toContain("SUPER_ADMIN");
      expect(rolesMatrix.roles).toContain("AUTHORITY_OFFICER");
    });

    it("strictly prevents Super Admin from changing their own role", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "SUPER_ADMIN", clerkUserId: "user_super_admin" })
      );

      await expect(
        caller.admin.updateRole({
          clerkUserId: "user_super_admin",
          role: "CITIZEN",
        })
      ).rejects.toThrow("Administrators cannot change their own role");
    });

    it("strictly prevents Super Admin from suspending their own account", async () => {
      const caller = appRouter.createCaller(
        createMockContext({ role: "SUPER_ADMIN", clerkUserId: "user_super_admin" })
      );

      await expect(
        caller.admin.updateStatus({
          clerkUserId: "user_super_admin",
          status: "SUSPENDED",
        })
      ).rejects.toThrow("Administrators cannot suspend or disable their own account");
    });
  });

  describe("7. Suspended / Disabled User Enforcement", () => {
    it("rejects SUSPENDED accounts from protected procedures with 403 Forbidden", async () => {
      const caller = appRouter.createCaller(
        createMockContext({
          role: "AUTHORITY_OFFICER",
          status: "SUSPENDED",
        })
      );

      await expect(caller.authority.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: expect.stringContaining("suspended or disabled"),
      });
    });

    it("rejects DISABLED accounts from protected procedures with 403 Forbidden", async () => {
      const caller = appRouter.createCaller(
        createMockContext({
          role: "CITIZEN",
          status: "DISABLED",
        })
      );

      await expect(caller.citizen.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: expect.stringContaining("suspended or disabled"),
      });
    });
  });
});
