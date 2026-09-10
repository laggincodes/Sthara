import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import {
  canonicalRole,
  CanonicalPlatformRole,
  hasPermission,
  Permission,
  PlatformRoles,
  UserStatuses,
} from "@shared/permissions";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { User } from "../../drizzle/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware verifying active authenticated session.
 * Rejects unauthenticated callers and suspended/disabled accounts.
 */
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const user = ctx.user as User;

  if (
    user.status === UserStatuses.SUSPENDED ||
    user.status === UserStatuses.DISABLED
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Your account is suspended or disabled. Please contact your system administrator.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Procedural guard for Role-based access.
 */
export function roleProcedure(allowedRoles: Array<string | CanonicalPlatformRole>) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      const user = ctx.user as User;

      if (
        user.status === UserStatuses.SUSPENDED ||
        user.status === UserStatuses.DISABLED
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Your account is suspended or disabled. Please contact your system administrator.",
        });
      }

      const userCanon = canonicalRole(user.role);
      const isAllowed =
        allowedRoles.includes(ctx.user.role) ||
        allowedRoles.some(role => {
          const allowedCanon = canonicalRole(role);
          return allowedCanon === userCanon || role === user.role;
        });

      if (!isAllowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: NOT_ADMIN_ERR_MSG,
        });
      }

      return next({
        ctx: {
          ...ctx,
          user,
        },
      });
    })
  );
}

/**
 * Procedural guard for granular permission checking.
 */
export function permissionProcedure(permission: Permission) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: UNAUTHED_ERR_MSG,
        });
      }
      const user = ctx.user as User;

      if (
        user.status === UserStatuses.SUSPENDED ||
        user.status === UserStatuses.DISABLED
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Your account is suspended or disabled. Please contact your system administrator.",
        });
      }
      if (!hasPermission(user.role, permission)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Access denied: missing required permission [${permission}].`,
        });
      }
      return next({
        ctx: {
          ...ctx,
          user,
        },
      });
    })
  );
}

/**
 * Specific Role Procedures
 */
export const superAdminProcedure = roleProcedure([
  PlatformRoles.SUPER_ADMIN,
  "admin",
]);

export const adminProcedure = superAdminProcedure; // Alias for backward compatibility

export const authorityAdminProcedure = roleProcedure([
  PlatformRoles.SUPER_ADMIN,
  PlatformRoles.AUTHORITY_ADMIN,
  "admin",
]);

export const authorityProcedure = roleProcedure([
  PlatformRoles.SUPER_ADMIN,
  PlatformRoles.AUTHORITY_ADMIN,
  PlatformRoles.AUTHORITY_OFFICER,
  "authority",
  "admin",
]);

export const governmentProcedure = roleProcedure([
  PlatformRoles.SUPER_ADMIN,
  PlatformRoles.GOVERNMENT_EMPLOYEE,
  PlatformRoles.AUTHORITY_ADMIN,
  PlatformRoles.AUTHORITY_OFFICER,
  "government_employee",
  "admin",
]);

export const surveyorProcedure = roleProcedure([
  PlatformRoles.SUPER_ADMIN,
  PlatformRoles.SURVEYOR,
  PlatformRoles.AUTHORITY_ADMIN,
  PlatformRoles.AUTHORITY_OFFICER,
  "admin",
]);

export const citizenProcedure = protectedProcedure;
