import { useAuth } from "@/_core/hooks/useAuth";
import { SignIn } from "@clerk/react";
import { canonicalRole, formatRole, getRoleDashboardPath, PlatformRoles } from "@shared/permissions";
import { Building2, Compass, ShieldCheck, UserCheck } from "lucide-react";
import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function StaffLogin() {
  const { user, isSignedIn, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isSignedIn && user) {
      const canon = canonicalRole(user.role);
      const dest = getRoleDashboardPath(user.role);
      setLocation(dest);
    }
  }, [isSignedIn, user, setLocation]);

  return (
    <main className="access-portal min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur overflow-hidden">
        {/* Left Side: Government Branding */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
              <ShieldCheck size={14} /> OFFICIAL STAFF & AUTHORITY PORTAL
            </div>
            <h1 className="mt-6 text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              3D ULPIN · Vertical Cadastre
            </h1>
            <p className="mt-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Department of Land Resources · Ministry of Rural Development
            </p>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Dedicated entry point for Verification Officers, Department Administrators, Government Operational Staff, and Field Surveyors.
            </p>

            <div className="mt-8 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <ShieldCheck size={16} className="text-cyan-400" />
                <span>Authority-gated height & floor-plan verification</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <Compass size={16} className="text-amber-400" />
                <span>Field survey & GNSS spatial dataset uploads</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Server-enforced RBAC via Neon PostgreSQL</span>
            <Link href="/overview" className="text-cyan-400 hover:underline">
              Public Portal →
            </Link>
          </div>
        </section>

        {/* Right Side: Clerk Authentication Card */}
        <section className="p-8 lg:p-12 flex flex-col items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Staff Authentication
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sign in with your official account configured via Clerk invitation
              </p>
            </div>

            <div className="access-portal__clerk flex justify-center">
              <SignIn
                path="/staff/login"
                routing="path"
                fallbackRedirectUrl="/authority/dashboard"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
