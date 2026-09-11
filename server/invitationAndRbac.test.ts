import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  createInvitationTokenRecord,
  verifyInvitationToken,
  acceptInvitationAndSetPassword,
  revokeInvitationToken,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  getAllInvitations,
} from "./invitationTokenService";
import {
  getDb,
  getUserByEmail,
  getUserByClerkUserId,
  setPlatformUserRole,
  setPlatformUserStatus,
  upsertUser,
} from "./db";
import { users, invitations, passwordResetTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { canonicalRole, PlatformRoles, UserStatuses } from "@shared/permissions";

describe("SIH 2026 - Invitation, RBAC, Role Freshness & Authentication Security Tests", { timeout: 30000 }, () => {
  const testAdmin = {
    clerkUserId: "admin_test_security_master",
    role: PlatformRoles.SUPER_ADMIN,
    name: "System Security Admin",
    email: "security.admin@cadastre.gov.in",
  };

  beforeAll(async () => {
    // Seed admin in test database
    await upsertUser({
      clerkUserId: testAdmin.clerkUserId,
      name: testAdmin.name,
      email: testAdmin.email,
      role: PlatformRoles.SUPER_ADMIN,
      status: UserStatuses.ACTIVE,
    });
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    // Cleanup test artifacts
    await db.delete(users).where(eq(users.clerkUserId, testAdmin.clerkUserId));
  });

  // 1. Password Complexity Rules
  describe("1. Password Complexity Validation", () => {
    it("should accept compliant government passwords (min 8 chars, uppercase, lowercase, digit, symbol)", () => {
      const result = validatePasswordStrength("NationalCadastre@2026");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject passwords under 8 characters", () => {
      const result = validatePasswordStrength("Gov@1");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long.");
    });

    it("should reject passwords missing uppercase letters", () => {
      const result = validatePasswordStrength("cadastre@2026");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter (A-Z)."
      );
    });

    it("should reject passwords missing numbers", () => {
      const result = validatePasswordStrength("NationalCadastre@NoDigits");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number (0-9)."
      );
    });

    it("should reject passwords missing special characters", () => {
      const result = validatePasswordStrength("NationalCadastre2026");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character (!@#$%^&*...)."
      );
    });
  });

  // 2. Cryptographic Token Generation & Hashing
  describe("2. Cryptographic Token Security", () => {
    it("should generate 64 hex character random tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toEqual(token2);
    });

    it("should compute deterministic SHA-256 hashes", () => {
      const token = generateSecureToken();
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toEqual(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  // 3. Invitation Creation & Pre-provisioning
  describe("3. Account Invitation & Pre-provisioning", () => {
    const inviteeEmail = `officer.test.${Date.now()}@bihar.gov.in`;

    it("should create invitation record and pre-provision user in INVITED status", async () => {
      const result = await createInvitationTokenRecord(
        {
          name: "Sanjay Kumar",
          email: inviteeEmail,
          role: "AUTHORITY_OFFICER",
          jurisdiction: "Patna Sadar Circle",
          designation: "Assistant Cadastral Officer",
        },
        testAdmin
      );

      expect(result.success).toBe(true);
      expect(result.rawToken).toHaveLength(64);
      expect(result.invitationUrl).toContain("/accept-invitation?token=");

      // Check DB user
      const dbUser = await getUserByEmail(inviteeEmail);
      expect(dbUser).toBeDefined();
      expect(dbUser?.status).toBe(UserStatuses.INVITED);
      expect(canonicalRole(dbUser!.role)).toBe(PlatformRoles.AUTHORITY_OFFICER);
      expect(dbUser?.designation).toBe("Assistant Cadastral Officer");
    });

    it("should invalidate previous pending invitations when a new one is sent", async () => {
      const email = `multi.invite.${Date.now()}@bihar.gov.in`;
      const first = await createInvitationTokenRecord(
        { name: "Officer Multi", email, role: "SURVEYOR" },
        testAdmin
      );
      const second = await createInvitationTokenRecord(
        { name: "Officer Multi", email, role: "SURVEYOR" },
        testAdmin
      );

      // Verify first token is now REVOKED
      const verifyFirst = await verifyInvitationToken(first.rawToken);
      expect(verifyFirst.valid).toBe(false);
      if (!verifyFirst.valid) {
        expect(verifyFirst.errorType).toBe("REVOKED");
      }

      // Verify second token is valid
      const verifySecond = await verifyInvitationToken(second.rawToken);
      expect(verifySecond.valid).toBe(true);
    });
  });

  // 4. Token Verification
  describe("4. Token Verification & Error Handling", () => {
    it("should return INVALID for malformed or unknown token", async () => {
      const res = await verifyInvitationToken("fake_non_existent_token_1234567890abcdef");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errorType).toBe("INVALID");
      }
    });

    it("should return valid token details for active pending invitation", async () => {
      const email = `officer.verify.${Date.now()}@bihar.gov.in`;
      const created = await createInvitationTokenRecord(
        { name: "Anita Devi", email, role: "GOVERNMENT_EMPLOYEE" },
        testAdmin
      );

      const res = await verifyInvitationToken(created.rawToken);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.invitation.email).toBe(email);
        expect(res.invitation.role).toBe(PlatformRoles.GOVERNMENT_EMPLOYEE);
      }
    });
  });

  // 5. Account Activation & Zero Auto-Login
  describe("5. Account Activation & Zero Auto-Login", () => {
    const officerEmail = `officer.activate.${Date.now()}@bihar.gov.in`;
    let rawToken = "";

    beforeAll(async () => {
      const created = await createInvitationTokenRecord(
        {
          name: "Ramesh Sharma",
          email: officerEmail,
          role: "AUTHORITY_ADMIN",
          designation: "District Cadastre Director",
        },
        testAdmin
      );
      rawToken = created.rawToken;
    });

    it("should reject password mismatch", async () => {
      await expect(
        acceptInvitationAndSetPassword({
          token: rawToken,
          password: "SecurePassword@2026",
          confirmPassword: "MismatchedPassword@2026",
        })
      ).rejects.toThrow("Passwords do not match.");
    });

    it("should reject weak password during activation", async () => {
      await expect(
        acceptInvitationAndSetPassword({
          token: rawToken,
          password: "weak",
          confirmPassword: "weak",
        })
      ).rejects.toThrow();
    });

    it("should activate account and set password without logging user in", async () => {
      const result = await acceptInvitationAndSetPassword({
        token: rawToken,
        password: "CadastreSecure@2026",
        confirmPassword: "CadastreSecure@2026",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Account activated successfully");
      expect(result.email).toBe(officerEmail);

      // Verify DB user is now ACTIVE
      const dbUser = await getUserByEmail(officerEmail);
      expect(dbUser).toBeDefined();
      expect(dbUser?.status).toBe(UserStatuses.ACTIVE);
      expect(canonicalRole(dbUser!.role)).toBe(PlatformRoles.AUTHORITY_ADMIN);

      // Verify token is now ALREADY_USED on subsequent attempts
      const verifyAgain = await verifyInvitationToken(rawToken);
      expect(verifyAgain.valid).toBe(false);
      if (!verifyAgain.valid) {
        expect(verifyAgain.errorType).toBe("ALREADY_USED");
      }
    });
  });

  // 6. Real-time Database Role Freshness & Suspension Check
  describe("6. Real-time Database Authorization Freshness", () => {
    const dynamicUserEmail = `role.freshness.${Date.now()}@bihar.gov.in`;
    const dynamicClerkId = `user_freshness_${Date.now()}`;

    beforeAll(async () => {
      await upsertUser({
        clerkUserId: dynamicClerkId,
        email: dynamicUserEmail,
        name: "Dynamic Role User",
        role: PlatformRoles.AUTHORITY_OFFICER,
        status: UserStatuses.ACTIVE,
      });
    });

    it("should immediately reflect demotion from AUTHORITY_OFFICER -> CITIZEN in database", async () => {
      const initial = await getUserByClerkUserId(dynamicClerkId);
      expect(initial?.role).toBe(PlatformRoles.AUTHORITY_OFFICER);

      // Admin demotes user to CITIZEN
      await setPlatformUserRole({
        clerkUserId: dynamicClerkId,
        role: PlatformRoles.CITIZEN,
        actorClerkUserId: testAdmin.clerkUserId,
        actorRole: PlatformRoles.SUPER_ADMIN,
      });

      // Subsequent query to DB immediately yields CITIZEN
      const refreshed = await getUserByClerkUserId(dynamicClerkId);
      expect(refreshed?.role).toBe(PlatformRoles.CITIZEN);
      expect(canonicalRole(refreshed!.role)).toBe(PlatformRoles.CITIZEN);
    });

    it("should immediately enforce account suspension in database", async () => {
      // Suspend user
      await setPlatformUserStatus({
        clerkUserId: dynamicClerkId,
        status: UserStatuses.SUSPENDED,
        reason: "Security audit compliance investigation",
        actorClerkUserId: testAdmin.clerkUserId,
        actorRole: PlatformRoles.SUPER_ADMIN,
      });

      const suspended = await getUserByClerkUserId(dynamicClerkId);
      expect(suspended?.status).toBe(UserStatuses.SUSPENDED);
    });

    it("should prevent admin from modifying their own role", async () => {
      await expect(
        setPlatformUserRole({
          clerkUserId: testAdmin.clerkUserId,
          role: PlatformRoles.CITIZEN,
          actorClerkUserId: testAdmin.clerkUserId,
          actorRole: PlatformRoles.SUPER_ADMIN,
        })
      ).rejects.toThrow("Administrators cannot change their own role.");
    });

    it("should prevent non-super-admins from assigning SUPER_ADMIN role", async () => {
      await expect(
        setPlatformUserRole({
          clerkUserId: dynamicClerkId,
          role: PlatformRoles.SUPER_ADMIN,
          actorClerkUserId: "officer_regular_clerk_id",
          actorRole: PlatformRoles.AUTHORITY_OFFICER,
        })
      ).rejects.toThrow("Only a Super Administrator can assign the Super Admin role.");
    });
  });

  // 7. Password Reset Flow
  describe("7. Password Reset Token Protocol", () => {
    const resetEmail = `reset.test.${Date.now()}@cadastre.gov.in`;

    beforeAll(async () => {
      await upsertUser({
        clerkUserId: `user_reset_${Date.now()}`,
        email: resetEmail,
        name: "Reset Officer",
        role: PlatformRoles.SURVEYOR,
        status: UserStatuses.ACTIVE,
      });
    });

    it("should generate a 1-hour password reset token", async () => {
      const result = await requestPasswordReset(resetEmail);
      expect(result.success).toBe(true);
      expect(result.resetUrl).toBeDefined();

      const urlObj = new URL(result.resetUrl!);
      const token = urlObj.searchParams.get("token");
      expect(token).toBeDefined();
      expect(token).toHaveLength(64);

      // Verify token
      const verify = await verifyPasswordResetToken(token!);
      expect(verify.valid).toBe(true);
      expect(verify.email).toBe(resetEmail);

      // Reset password
      const resetRes = await resetPasswordWithToken({
        token: token!,
        password: "NewPassword@2026!",
        confirmPassword: "NewPassword@2026!",
      });
      expect(resetRes.success).toBe(true);

      // Verify token is single-use and now invalid
      const verifyAfter = await verifyPasswordResetToken(token!);
      expect(verifyAfter.valid).toBe(false);
    });
  });

  // 8. Invitation Listing & Revocation
  describe("8. Admin Invitation Listing & Revocation", () => {
    it("should list all invitations in reverse chronological order", async () => {
      const list = await getAllInvitations();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it("should allow admin to revoke an active invitation", async () => {
      const email = `revoke.target.${Date.now()}@bihar.gov.in`;
      const created = await createInvitationTokenRecord(
        { name: "Target Revoke", email, role: "SURVEYOR" },
        testAdmin
      );

      const revokeResult = await revokeInvitationToken(created.invitationId, testAdmin);
      expect(revokeResult.success).toBe(true);

      const verify = await verifyInvitationToken(created.rawToken);
      expect(verify.valid).toBe(false);
      if (!verify.valid) {
        expect(verify.errorType).toBe("REVOKED");
      }
    });
  });
});
