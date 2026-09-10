import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  canonicalRole,
  CanonicalPlatformRole,
  formatRole,
  getRoleDashboardPath,
  hasPermission,
  Permission,
  UserStatuses,
} from "@shared/permissions";
import { AlertTriangle, Lock, ShieldAlert, LogOut, ArrowRight } from "lucide-react";
import React from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: CanonicalPlatformRole[];
  requiredPermission?: Permission;
  redirectUnauthenticatedTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
  redirectUnauthenticatedTo = "/access",
}: ProtectedRouteProps) {
  const { user, isSignedIn, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide text-slate-400">
            Verifying government credentials & permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Authentication Required
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            You must sign in with an authorized account to access this government workspace.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
              onClick={() => setLocation(redirectUnauthenticatedTo)}
            >
              Go to Secure Login
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setLocation("/overview")}
            >
              Public Overview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check Account Status (Suspended or Disabled)
  if (
    user.status === UserStatuses.SUSPENDED ||
    user.status === UserStatuses.DISABLED
  ) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-950/20 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <ShieldAlert size={28} />
          </div>
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
            ACCOUNT {user.status}
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
            Access Restricted
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Your staff account has been {user.status.toLowerCase()} by the system administrator. Protected API operations and cadastral workflows are temporarily disabled.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="destructive"
              className="w-full font-semibold"
              onClick={() => void logout()}
            >
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userCanon = canonicalRole(user.role);

  // Check Role Permissions
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = allowedRoles.includes(userCanon);
    if (!isRoleAllowed) {
      const userDashboard = getRoleDashboardPath(user.role);
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 text-center">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <AlertTriangle size={28} />
            </div>
            <span className="text-xs font-semibold tracking-wider text-amber-400">
              403 FORBIDDEN · ACCESS RESTRICTED
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
              Insufficient Privilege
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              This module requires one of the following roles:{" "}
              <span className="font-semibold text-slate-200">
                {allowedRoles.map(r => formatRole(r)).join(", ")}
              </span>
              . Your current role is{" "}
              <span className="font-semibold text-cyan-400">
                {formatRole(user.role)}
              </span>
              .
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="w-full bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
                onClick={() => setLocation(userDashboard)}
              >
                Go to My Dashboard <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setLocation("/overview")}
              >
                Return to Overview
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check Granular Permission
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    const userDashboard = getRoleDashboardPath(user.role);
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <AlertTriangle size={28} />
          </div>
          <span className="text-xs font-semibold tracking-wider text-amber-400">
            PERMISSION REQUIRED
          </span>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            You do not have the required permission (
            <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-amber-300">
              {requiredPermission}
            </code>
            ) to perform this action.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
              onClick={() => setLocation(userDashboard)}
            >
              Return to My Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
