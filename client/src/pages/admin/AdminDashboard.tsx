import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PlatformRoles } from "@shared/permissions";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  FileText,
  Globe2,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import React from "react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const auditQuery = trpc.admin.auditLogs.useQuery(
    { limit: 6 },
    { refetchInterval: 10000 }
  );

  const stats = statsQuery.data ?? {
    totalCitizens: 0,
    totalAuthorities: 0,
    activeOfficers: 0,
    pendingApplications: 0,
    verifiedProperties: 0,
    mappedProperties: 0,
    surveyProjects: 0,
    auditLogsCount: 0,
    totalDepartments: 0,
    totalDistricts: 0,
  };

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Command Center & Executive Overview"
        subtitle="National 3D Cadastre & Vertical Property Administration Console"
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => {
                void statsQuery.refetch();
                void auditQuery.refetch();
              }}
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 ${statsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Link href="/admin/authorities">
              <Button size="sm" className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500">
                <Plus size={16} className="mr-1.5" /> Add Authority
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Citizens Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-400">
                  REGISTERED CITIZENS
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Users size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                {stats.totalCitizens.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">Self-service portal</span>
                <span className="mx-1.5">·</span>
                <span>Clerk authenticated</span>
              </div>
            </div>

            {/* Authorities Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-400">
                  TOTAL AUTHORITIES
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                {stats.totalAuthorities.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-cyan-400 font-medium">
                  {stats.activeOfficers} Active Officers
                </span>
                <span className="mx-1.5">·</span>
                <span>{stats.totalDepartments} Depts</span>
              </div>
            </div>

            {/* Pending Applications Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-400">
                  PENDING VERIFICATIONS
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                {stats.pendingApplications.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-amber-400 font-medium">Authority Review Queue</span>
                <span className="mx-1.5">·</span>
                <span>{stats.verifiedProperties} Verified</span>
              </div>
            </div>

            {/* Mapped 3D Properties Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-400">
                  MAPPED 3D PARCELS
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Building2 size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                {stats.mappedProperties.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-purple-400 font-medium">PostGIS Spatially Index</span>
                <span className="mx-1.5">·</span>
                <span>{stats.totalDistricts} Districts</span>
              </div>
            </div>
          </div>

          {/* Quick Operations & Workspace Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-bold text-white tracking-tight">
                Quick Administrative Actions
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Execute role, authority and governance operations.
              </p>
              <div className="mt-5 space-y-3">
                <Link href="/admin/authorities">
                  <Button className="w-full justify-between bg-gradient-to-r from-cyan-600 to-blue-600 font-semibold text-white hover:from-cyan-500 hover:to-blue-500">
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={16} /> + Add / Invite Authority
                    </span>
                    <ArrowUpRight size={16} />
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button
                    variant="outline"
                    className="w-full justify-between border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Users size={16} /> Manage Users & Roles
                    </span>
                    <ArrowUpRight size={16} />
                  </Button>
                </Link>
                <Link href="/admin/departments">
                  <Button
                    variant="outline"
                    className="w-full justify-between border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 size={16} /> Departments & Districts
                    </span>
                    <ArrowUpRight size={16} />
                  </Button>
                </Link>
                <Link href="/workspace">
                  <Button
                    variant="outline"
                    className="w-full justify-between border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={16} /> Open 3D Cesium GIS Globe
                    </span>
                    <ArrowUpRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>

            {/* System Status & Evidence Ladder Status */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-bold text-white tracking-tight">
                System Health & Security
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Core infrastructure and authentication security guarantees.
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Clerk Authentication
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Identity provider & session verification active
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    SECURE
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <Database size={16} className="text-cyan-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Neon PostgreSQL & PostGIS
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Authoritative role & spatial layer storage
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400">
                    CONNECTED
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <Shield size={16} className="text-purple-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        3-Level Evidence Ladder
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Footprint → Verified Height → Floor Plan/BIM
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-400">
                    ENFORCED
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Trail Preview Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Recent Audit Trail
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Immutable security log feed.
                  </p>
                </div>
                <Link href="/admin/audit-logs">
                  <Button variant="ghost" size="sm" className="text-xs text-cyan-400 hover:text-cyan-300">
                    View All
                  </Button>
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {auditQuery.data && auditQuery.data.length > 0 ? (
                  auditQuery.data.slice(0, 4).map(log => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-cyan-400">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-300 truncate">
                        <span className="text-slate-500">Actor:</span>{" "}
                        {log.actorName || log.actorClerkUserId} (
                        <span className="text-slate-400">{log.actorRole}</span>)
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                    No recent audit log entries.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
