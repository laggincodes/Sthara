import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { clerkClient, getAuth } from "@clerk/express";
import type { User } from "../../drizzle/schema";
import {
  ensureMasterSeedData,
  getUserByClerkUserId,
  getUserByEmail,
  INITIAL_SUPER_ADMIN_EMAIL,
  upsertUser,
} from "../db";
import { PlatformRoles, UserStatuses } from "@shared/permissions";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Ensure master seed data is present in database
  void ensureMasterSeedData().catch(err =>
    console.warn("[Context] Master seed check non-blocking warning:", err)
  );

  const { userId } = getAuth(opts.req);

  if (userId) {
    try {
      user = (await getUserByClerkUserId(userId)) ?? null;

      if (!user) {
        // First-time sign in for this Clerk User ID:
        let email: string | null = null;
        let fullName: string | null = null;

        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          fullName = clerkUser.fullName || clerkUser.username || null;
          email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
        } catch {
          // If Clerk client retrieval fails in offline/mock mode
        }

        // Check if pre-provisioned by email (Staff/Authority invitation)
        let preProvisioned = email ? await getUserByEmail(email) : undefined;

        const isSuperAdmin =
          (email &&
            email.toLowerCase().trim() ===
              INITIAL_SUPER_ADMIN_EMAIL.toLowerCase()) ||
          (process.env.CLERK_BOOTSTRAP_ADMIN_USER_IDS ?? "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .includes(userId);

        await upsertUser({
          clerkUserId: userId,
          name: fullName || preProvisioned?.name || null,
          email: email || preProvisioned?.email || null,
          phone: preProvisioned?.phone || null,
          loginMethod: "clerk",
          role: isSuperAdmin
            ? PlatformRoles.SUPER_ADMIN
            : (preProvisioned?.role ?? PlatformRoles.CITIZEN),
          status:
            preProvisioned?.status === UserStatuses.SUSPENDED ||
            preProvisioned?.status === UserStatuses.DISABLED
              ? preProvisioned.status
              : UserStatuses.ACTIVE,
          designation: preProvisioned?.designation ?? null,
          departmentId: preProvisioned?.departmentId ?? null,
          districtId: preProvisioned?.districtId ?? null,
          organizationId: preProvisioned?.organizationId ?? null,
          jurisdiction: preProvisioned?.jurisdiction ?? null,
          lastSignedIn: new Date(),
        });

        user = (await getUserByClerkUserId(userId)) ?? null;
      } else {
        // User already exists in database
        const isSuperAdmin =
          (user.email &&
            user.email.toLowerCase().trim() ===
              INITIAL_SUPER_ADMIN_EMAIL.toLowerCase()) ||
          (process.env.CLERK_BOOTSTRAP_ADMIN_USER_IDS ?? "")
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
            .includes(userId);

        if (isSuperAdmin && user.role !== PlatformRoles.SUPER_ADMIN && user.role !== "admin") {
          await upsertUser({
            clerkUserId: userId,
            role: PlatformRoles.SUPER_ADMIN,
            lastSignedIn: new Date(),
          });
          user = (await getUserByClerkUserId(userId)) ?? null;
        } else {
          await upsertUser({
            clerkUserId: userId,
            name: user.name,
            email: user.email,
            loginMethod: "clerk",
            role: user.role,
            status: user.status,
            lastSignedIn: new Date(),
          });
        }
      }
    } catch (error) {
      console.warn(
        "[Clerk] Session user could not be mapped to application data",
        error
      );
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
