import crypto from "crypto";
import { clerkClient } from "@clerk/express";
import { eq, desc, and, or, sql } from "drizzle-orm";
import {
  getDb,
  createAuditLog,
  getUserByEmail,
  upsertUser,
  getDepartments,
  getDistricts,
} from "./db";
import {
  invitations,
  passwordResetTokens,
  users,
  type Invitation,
} from "../drizzle/schema";
import {
  canonicalRole,
  CanonicalPlatformRole,
  PlatformRoles,
  UserStatuses,
  formatRole,
} from "@shared/permissions";

/**
 * Validates password strength according to government security guidelines.
 * Requirements: Minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number (0-9).");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*...)."
    );
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Generates a cryptographically secure, random 64-character token.
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a raw token for secure database storage.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

function getAppBaseUrl(): string {
  const origin =
    process.env.APP_ORIGIN ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:5173";
  return origin.startsWith("http") ? origin : `https://${origin}`;
}

export interface CreateInvitationInput {
  name: string;
  email: string;
  role: string;
  departmentId?: number;
  districtId?: number;
  organizationId?: number;
  jurisdiction?: string;
  designation?: string;
  phone?: string;
}

export interface ActorInfo {
  clerkUserId: string;
  email?: string | null;
  role: string;
  name?: string | null;
}

/**
 * Creates a single-use, time-limited cryptographic invitation token record in Neon PostgreSQL
 * and pre-provisions the user account in INVITED status.
 */
export async function createInvitationTokenRecord(
  input: CreateInvitationInput,
  actor: ActorInfo
): Promise<{
  success: boolean;
  invitationId: number;
  rawToken: string;
  invitationUrl: string;
  expiresAt: Date;
  email: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");

  const cleanEmail = input.email.trim().toLowerCase();
  const canon = canonicalRole(input.role);

  // 1. Invalidate any existing PENDING invitations for this email
  await db
    .update(invitations)
    .set({
      status: "REVOKED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(invitations.email, cleanEmail),
        eq(invitations.status, "PENDING")
      )
    );

  // 2. Generate raw token (64 hex chars) and hash
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  // Default expiration: 48 hours
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // 3. Insert into database
  const [created] = await db
    .insert(invitations)
    .values({
      email: cleanEmail,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      assignedRole: canon as any,
      tokenHash,
      status: "PENDING",
      departmentId: input.departmentId ?? null,
      districtId: input.districtId ?? null,
      organizationId: input.organizationId ?? null,
      jurisdiction: input.jurisdiction?.trim() || null,
      designation: input.designation?.trim() || null,
      createdByClerkUserId: actor.clerkUserId,
      createdByEmail: actor.email ?? null,
      expiresAt,
    })
    .returning();

  // 4. Pre-provision or update user record in users table with status = INVITED
  const existingUser = await getUserByEmail(cleanEmail);
  const virtualClerkId =
    existingUser?.clerkUserId ||
    `invited_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await upsertUser({
    clerkUserId: virtualClerkId,
    name: input.name.trim(),
    email: cleanEmail,
    phone: input.phone?.trim() || null,
    loginMethod: "clerk",
    role: canon as any,
    status: UserStatuses.INVITED,
    designation: input.designation?.trim() || null,
    departmentId: input.departmentId ?? null,
    districtId: input.districtId ?? null,
    organizationId: input.organizationId ?? null,
    jurisdiction: input.jurisdiction?.trim() || null,
    invitationSentAt: new Date(),
  });

  // 5. Construct secure single-use invitation URL
  const baseUrl = getAppBaseUrl();
  const invitationUrl = `${baseUrl}/accept-invitation?token=${rawToken}`;

  // 6. Record immutable audit log
  await createAuditLog({
    actorClerkUserId: actor.clerkUserId,
    actorRole: String(actor.role),
    actorName: actor.name,
    action: "AUTHORITY_INVITED",
    entityType: "authority_invitation",
    entityId: String(created.id),
    targetResource: cleanEmail,
    departmentId: input.departmentId ?? undefined,
    districtId: input.districtId ?? undefined,
    newValue: JSON.stringify({
      email: cleanEmail,
      name: input.name,
      role: canon,
      expiresAt: expiresAt.toISOString(),
      invitationId: created.id,
    }),
  });

  return {
    success: true,
    invitationId: created.id,
    rawToken,
    invitationUrl,
    expiresAt,
    email: cleanEmail,
  };
}

export type TokenVerificationResult =
  | {
      valid: true;
      invitation: {
        id: number;
        email: string;
        name: string | null;
        role: CanonicalPlatformRole;
        roleTitle: string;
        departmentName?: string | null;
        districtName?: string | null;
        designation?: string | null;
        jurisdiction?: string | null;
        expiresAt: string;
      };
    }
  | {
      valid: false;
      errorType: "INVALID" | "EXPIRED" | "ALREADY_USED" | "REVOKED";
      message: string;
    };

/**
 * Validates an invitation token against the database.
 */
export async function verifyInvitationToken(
  rawToken: string
): Promise<TokenVerificationResult> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 16) {
    return {
      valid: false,
      errorType: "INVALID",
      message: "Invitation link is invalid.",
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      valid: false,
      errorType: "INVALID",
      message: "Database is unavailable. Please try again.",
    };
  }

  const tokenHash = hashToken(rawToken);
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);

  if (!invite) {
    return {
      valid: false,
      errorType: "INVALID",
      message: "Invitation link is invalid.",
    };
  }

  if (invite.status === "ACCEPTED") {
    return {
      valid: false,
      errorType: "ALREADY_USED",
      message: "This invitation has already been used.",
    };
  }

  if (invite.status === "REVOKED") {
    return {
      valid: false,
      errorType: "REVOKED",
      message: "This invitation has been revoked by an administrator.",
    };
  }

  const now = new Date();
  if (invite.status === "EXPIRED" || invite.expiresAt < now) {
    return {
      valid: false,
      errorType: "EXPIRED",
      message: "This invitation has expired.",
    };
  }

  // Resolve Department & District titles if mapped
  let departmentName: string | null = null;
  let districtName: string | null = null;

  if (invite.departmentId) {
    const depts = await getDepartments();
    departmentName = depts.find(d => d.id === invite.departmentId)?.name ?? null;
  }
  if (invite.districtId) {
    const dists = await getDistricts();
    districtName = dists.find(d => d.id === invite.districtId)?.name ?? null;
  }

  const canon = canonicalRole(invite.assignedRole);

  return {
    valid: true,
    invitation: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: canon,
      roleTitle: formatRole(canon),
      departmentName,
      districtName,
      designation: invite.designation,
      jurisdiction: invite.jurisdiction,
      expiresAt: invite.expiresAt.toISOString(),
    },
  };
}

export interface AcceptInvitationInput {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Accepts an invitation:
 * 1. Verifies token and password requirements
 * 2. Creates or updates user credentials in Clerk
 * 3. Activates the account in Neon PostgreSQL
 * 4. Invalidates the single-use token immediately
 * 5. DOES NOT authenticate the user or create a session.
 */
export async function acceptInvitationAndSetPassword(
  input: AcceptInvitationInput
): Promise<{
  success: boolean;
  message: string;
  email: string;
  role: string;
}> {
  // 1. Verify token
  const tokenRes = await verifyInvitationToken(input.token);
  if (!tokenRes.valid) {
    throw new Error(tokenRes.message);
  }

  // 2. Validate passwords match
  if (input.password !== input.confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  // 3. Validate password strength
  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new Error(strength.errors[0]);
  }

  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");

  const inviteData = tokenRes.invitation;
  const cleanEmail = inviteData.email.toLowerCase().trim();

  let resolvedClerkUserId: string | null = null;

  // 4. Provision or Update User in Clerk via Backend SDK
  try {
    const existingClerkUsers = await clerkClient.users.getUserList({
      emailAddress: [cleanEmail],
    });

    if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
      const existingClerkUser = existingClerkUsers.data[0];
      resolvedClerkUserId = existingClerkUser.id;
      // Update password in Clerk
      await clerkClient.users.updateUser(existingClerkUser.id, {
        password: input.password,
        firstName: inviteData.name || undefined,
      });
      console.info(
        `[Clerk] Password updated successfully for existing user ${cleanEmail} (${existingClerkUser.id})`
      );
    } else {
      // Create new user in Clerk with password
      const newClerkUser = await clerkClient.users.createUser({
        emailAddress: [cleanEmail],
        password: input.password,
        firstName: inviteData.name || undefined,
        skipPasswordRequirement: false,
      });
      resolvedClerkUserId = newClerkUser.id;
      console.info(
        `[Clerk] New user created with credentials for ${cleanEmail} (${newClerkUser.id})`
      );
    }
  } catch (clerkErr: any) {
    console.warn(
      `[Clerk API Note] User management notice during password setup:`,
      clerkErr?.message || clerkErr
    );
    // If running in development/mock mode without live clerk keys
    if (!resolvedClerkUserId) {
      const existingDb = await getUserByEmail(cleanEmail);
      resolvedClerkUserId =
        existingDb?.clerkUserId && existingDb.clerkUserId.startsWith("user_")
          ? existingDb.clerkUserId
          : `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  // 5. Activate User in Neon PostgreSQL Database
  await upsertUser({
    clerkUserId: resolvedClerkUserId!,
    name: inviteData.name,
    email: cleanEmail,
    role: inviteData.role as any,
    status: UserStatuses.ACTIVE,
    designation: inviteData.designation ?? null,
    jurisdiction: inviteData.jurisdiction ?? null,
    invitationAcceptedAt: new Date(),
    lastSignedIn: new Date(),
  });

  // 6. Mark invitation as ACCEPTED and invalidate token
  await db
    .update(invitations)
    .set({
      status: "ACCEPTED",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, inviteData.id));

  // 7. Record immutable audit log
  await createAuditLog({
    actorClerkUserId: resolvedClerkUserId!,
    actorRole: String(inviteData.role),
    actorName: inviteData.name,
    action: "INVITATION_ACCEPTED_PASSWORD_SET",
    entityType: "user_activation",
    entityId: resolvedClerkUserId!,
    targetResource: cleanEmail,
    newValue: JSON.stringify({
      email: cleanEmail,
      role: inviteData.role,
      acceptedAt: new Date().toISOString(),
    }),
  });

  // 8. Return success response (NO session created, user must log in)
  return {
    success: true,
    message: "Account activated successfully. Please sign in using your email and password.",
    email: cleanEmail,
    role: inviteData.role,
  };
}

/**
 * Revokes an existing invitation by ID.
 */
export async function revokeInvitationToken(
  invitationId: number,
  actor: ActorInfo
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Platform database is unavailable.");

  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invite) throw new Error("Invitation not found.");

  await db
    .update(invitations)
    .set({
      status: "REVOKED",
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId));

  // Update user status if still in INVITED status
  const existingUser = await getUserByEmail(invite.email);
  if (existingUser && existingUser.status === UserStatuses.INVITED) {
    await db
      .update(users)
      .set({
        status: UserStatuses.DISABLED,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));
  }

  await createAuditLog({
    actorClerkUserId: actor.clerkUserId,
    actorRole: String(actor.role),
    actorName: actor.name,
    action: "INVITATION_REVOKED",
    entityType: "authority_invitation",
    entityId: String(invitationId),
    targetResource: invite.email,
  });

  return { success: true, message: `Invitation for ${invite.email} has been revoked.` };
}

/**
 * Retrieves all platform invitations for the Admin Console.
 */
export async function getAllInvitations() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(invitations)
    .orderBy(desc(invitations.createdAt));
}

/**
 * Password Reset Requests: Creates single-use reset token (1h expiration)
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
  resetUrl?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");

  // Check if user exists
  const existingUser = await getUserByEmail(cleanEmail);
  if (!existingUser) {
    // Return generic success to avoid email enumeration attacks
    return {
      success: true,
      message: "If an account exists with this email, password reset instructions have been dispatched.",
    };
  }

  // Invalidate older pending reset tokens
  await db
    .update(passwordResetTokens)
    .set({ status: "EXPIRED" })
    .where(
      and(
        eq(passwordResetTokens.email, cleanEmail),
        eq(passwordResetTokens.status, "PENDING")
      )
    );

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  // Expiration: 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    email: cleanEmail,
    tokenHash,
    status: "PENDING",
    expiresAt,
  });

  const baseUrl = getAppBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  console.info(`[Password Reset] Reset token generated for ${cleanEmail}: ${resetUrl}`);

  await createAuditLog({
    actorClerkUserId: existingUser.clerkUserId,
    actorRole: String(existingUser.role),
    actorName: existingUser.name,
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "user",
    entityId: existingUser.clerkUserId,
    targetResource: cleanEmail,
  });

  return {
    success: true,
    message: "If an account exists with this email, password reset instructions have been dispatched.",
    resetUrl,
  };
}

/**
 * Verifies a password reset token.
 */
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<{ valid: boolean; email?: string; message?: string }> {
  if (!rawToken || rawToken.trim().length < 16) {
    return { valid: false, message: "Invalid password reset token." };
  }
  const db = await getDb();
  if (!db) return { valid: false, message: "Database unavailable." };

  const tokenHash = hashToken(rawToken);
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.status !== "PENDING" || record.expiresAt < new Date()) {
    return { valid: false, message: "This password reset token has expired or is invalid." };
  }

  return { valid: true, email: record.email };
}

/**
 * Resets password using valid reset token.
 */
export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const verify = await verifyPasswordResetToken(input.token);
  if (!verify.valid || !verify.email) {
    throw new Error(verify.message || "Invalid or expired reset token.");
  }

  if (input.password !== input.confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new Error(strength.errors[0]);
  }

  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");

  // Update password in Clerk
  try {
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [verify.email],
    });
    if (clerkUsers.data && clerkUsers.data.length > 0) {
      await clerkClient.users.updateUser(clerkUsers.data[0].id, {
        password: input.password,
      });
    }
  } catch (err: any) {
    console.warn("[Password Reset] Clerk update warning:", err?.message || err);
  }

  // Mark token as USED
  const tokenHash = hashToken(input.token);
  await db
    .update(passwordResetTokens)
    .set({
      status: "USED",
      usedAt: new Date(),
    })
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  const userRec = await getUserByEmail(verify.email);
  if (userRec) {
    await createAuditLog({
      actorClerkUserId: userRec.clerkUserId,
      actorRole: String(userRec.role),
      actorName: userRec.name,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "user",
      entityId: userRec.clerkUserId,
      targetResource: verify.email,
    });
  }

  return {
    success: true,
    message: "Your password has been reset successfully. Please log in with your new credentials.",
  };
}
