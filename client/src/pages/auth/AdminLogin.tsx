import { useAuth } from "@/_core/hooks/useAuth";
import { SignIn } from "@clerk/react";
import { canonicalRole, PlatformRoles } from "@shared/permissions";
import { Lock, Shield, ShieldAlert } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function AdminLogin() {
  const { user, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isSignedIn && user) {
      const canon = canonicalRole(user.role);
      if (canon === PlatformRoles.SUPER_ADMIN) {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [isSignedIn, user, setLocation]);

  return (
    <main className="access-portal min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden">
        {/* Left Side */}
        <section className="bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-900 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              <Shield size={14} /> SUPER ADMINISTRATOR CONTROL ROOM
            </div>
            <h1 className="mt-6 text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              System Administration
            </h1>
            <p className="mt-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Department of Land Resources · SIH 2026
            </p>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Restricted management console for provisioning authorities, configuring line departments, managing RBAC policies, and reviewing system audit trails.
            </p>

            <div className="mt-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-purple-200">
              <div className="font-semibold flex items-center gap-1.5">
                <Lock size={14} /> Elevated Access Controls
              </div>
              <p className="mt-1 text-[11px] text-purple-300/80">
                Non-administrative users attempting access will receive 403 Forbidden responses.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Security Zone · DoLR</span>
            <Link href="/overview" className="text-purple-400 hover:underline">
              Public Portal →
            </Link>
          </div>
        </section>

        {/* Right Side */}
        <section className="p-8 lg:p-12 flex flex-col items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Admin Sign-In
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authenticate with Clerk Super Admin identity
              </p>
            </div>

            <div className="access-portal__clerk flex justify-center">
              <SignIn
                path="/admin/login"
                routing="path"
                fallbackRedirectUrl="/admin/dashboard"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
