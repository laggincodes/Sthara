import { useAuth } from "@/_core/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Globe2,
  LogOut,
  Map,
  MapPin,
  RefreshCw,
  Shield,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { Link } from "wouter";

export default function GovernmentDashboard() {
  const { user, logout } = useAuth();
  const summaryQuery = trpc.government.stats.useQuery();
  const deptsQuery = trpc.government.departments.useQuery();
  const distsQuery = trpc.government.districts.useQuery();

  const stats = summaryQuery.data ?? {
    records: 0,
    pendingVerification: 0,
    reviewedVerification: 0,
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        PlatformRoles.SUPER_ADMIN,
        PlatformRoles.GOVERNMENT_EMPLOYEE,
        PlatformRoles.AUTHORITY_ADMIN,
        PlatformRoles.AUTHORITY_OFFICER,
      ]}
    >
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <Map size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  Government Operations & Analytics Console
                </div>
                <div className="text-xs text-blue-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="font-semibold">{formatRole(user?.role)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/workspace">
                <Button
                  size="sm"
                  className="bg-blue-600 font-semibold text-white hover:bg-blue-500"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D Spatial Explorer
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => void logout()}
              >
                <LogOut size={16} className="mr-1.5" /> Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>TOTAL REGISTERED CADASTRE</span>
                <Building2 size={16} className="text-blue-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.records}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Catalog records in PostGIS & Drizzle
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>PENDING VERIFICATION</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.pendingVerification}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Departmental review in progress
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>COMPLETED REVIEWS</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.reviewedVerification}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Verified vertical parcels & heights
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-bold text-white tracking-tight">
                Participating Line Ministries & Departments
              </h2>
              <div className="mt-4 space-y-3">
                {deptsQuery.data?.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{d.name}</div>
                      <div className="text-[11px] text-slate-400">{d.description}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {d.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-bold text-white tracking-tight">
                Cadastral Districts Coverage
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {distsQuery.data?.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                  >
                    <MapPin size={16} className="text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold text-white">{d.name}</div>
                      <div className="text-[10px] text-slate-400">{d.state} · {d.code}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
