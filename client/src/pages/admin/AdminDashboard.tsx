import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Globe2,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"stream" | "roster" | "health">("stream");
  const [streamFilter, setStreamFilter] = useState<string>("ALL");
  const [streamSearch, setStreamSearch] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterRoleFilter, setRosterRoleFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    refetchInterval: 12000,
  });
  const surveillanceQuery = trpc.admin.surveillanceStats.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const auditQuery = trpc.admin.auditLogs.useQuery(
    {
      search: streamSearch || undefined,
      action: streamFilter !== "ALL" ? streamFilter : undefined,
      limit: 50,
    },
    { refetchInterval: 8000 }
  );
  const rosterQuery = trpc.admin.userActivityRoster.useQuery(undefined, {
    refetchInterval: 15000,
  });

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

  const surveillance = surveillanceQuery.data ?? {
    totalEvents: 0,
    events24h: 0,
    roleDistribution: {},
    topActions: [],
    highRiskEventsCount: 0,
    recentSecurityAlerts: [],
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toUpperCase()) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "AUTHORITY_ADMIN":
      case "AUTHORITY_OFFICER":
      case "AUTHORITY":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "GOVERNMENT_EMPLOYEE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "SURVEYOR":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "CITIZEN":
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("ACTIVATED") || action.includes("SUCCESS"))
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (action.includes("REJECTED") || action.includes("SUSPENDED") || action.includes("REVOKED") || action.includes("DISABLED"))
      return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    if (action.includes("SANCTIONED") || action.includes("HEIGHT") || action.includes("DISPATCHED"))
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    if (action.includes("CERTIFICATE") || action.includes("CARD"))
      return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    return "text-blue-400 border-blue-500/30 bg-blue-500/10";
  };

  const filteredRoster = (rosterQuery.data ?? []).filter(u => {
    const matchesSearch =
      rosterSearch.length === 0 ||
      u.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      u.clerkUserId.toLowerCase().includes(rosterSearch.toLowerCase());

    const matchesRole =
      rosterRoleFilter === "ALL" ||
      u.role.toUpperCase() === rosterRoleFilter.toUpperCase();

    return matchesSearch && matchesRole;
  });

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Super Admin Surveillance & Command Room"
        subtitle="Real-time omniscient activity tracking, role surveillance, and cadastral governance"
        actionButton={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE SURVEILLANCE ACTIVE
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => {
                void statsQuery.refetch();
                void surveillanceQuery.refetch();
                void auditQuery.refetch();
                void rosterQuery.refetch();
              }}
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 ${auditQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Link href="/admin/authorities">
              <Button size="sm" className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500">
                <Plus size={16} className="mr-1.5" /> Invite Authority
              </Button>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Top 4 Surveillance & Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Citizens Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-400">
                  CITIZEN REPOSITORY
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Users size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">
                {stats.totalCitizens.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-blue-400 font-medium">Clerk Authenticated</span>
                <span className="mx-1.5">·</span>
                <span>Self-service</span>
              </div>
            </div>

            {/* Total Authorities Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-400">
                  OFFICIAL CADRE & STAFF
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">
                {stats.totalAuthorities.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">{stats.activeOfficers} Active Officers</span>
                <span className="mx-1.5">·</span>
                <span>{stats.totalDepartments} Departments</span>
              </div>
            </div>

            {/* Mapped 3D Parcels Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-400">
                  3D CADASTRAL PARCELS
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Building2 size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">
                {stats.mappedProperties.toLocaleString()}
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-purple-400 font-medium">{stats.verifiedProperties} Verified</span>
                <span className="mx-1.5">·</span>
                <span>{stats.pendingApplications} In Queue</span>
              </div>
            </div>

            {/* Platform Audit Pulse Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-900/70 p-5 backdrop-blur transition hover:border-cyan-500/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Radio size={14} className="text-cyan-400 animate-pulse" /> PLATFORM ACTIVITY PULSE
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Activity size={18} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold tracking-tight text-cyan-300">
                {surveillance.totalEvents.toLocaleString()} <span className="text-xs font-normal text-slate-400">logs</span>
              </div>
              <div className="mt-2 flex items-center text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">+{surveillance.events24h} in last 24h</span>
                <span className="mx-1.5">·</span>
                <span>100% Tracked</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab("stream")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "stream"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Radio size={15} /> Live Event Feed ("Who is Doing What")
            </button>
            <button
              onClick={() => setActiveTab("roster")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "roster"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Users size={15} /> User Activity Telemetry Roster ({rosterQuery.data?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "health"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <TrendingUp size={15} /> Role Productivity & System Governance
            </button>
          </div>

          {/* TAB 1: Live Omniscient Surveillance Stream */}
          {activeTab === "stream" && (
            <div className="space-y-4">
              {/* Stream Filter Bar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search live stream (Actor, ULPIN, Action, Parcel)..."
                      value={streamSearch}
                      onChange={e => setStreamSearch(e.target.value)}
                      className="pl-9 bg-slate-950/60 border-slate-800 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {[
                      { id: "ALL", label: "All Events" },
                      { id: "3D_FOOTPRINT_HEIGHT_SANCTIONED", label: "Height Sanctions" },
                      { id: "OFFICIAL_3D_CERTIFICATE_GENERATED", label: "Certificates" },
                      { id: "GCP_BENCHMARK_RECORDED", label: "GCP Surveys" },
                      { id: "SURVEY_MISSION_DISPATCHED", label: "Missions" },
                      { id: "PROPERTY_APPROVED", label: "Approvals" },
                      { id: "ROLE_CHANGED", label: "Role Changes" },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStreamFilter(f.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition whitespace-nowrap ${
                          streamFilter === f.id
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "bg-slate-950/40 text-slate-400 border border-slate-800/80 hover:bg-slate-800/60"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Link href="/admin/audit-logs">
                  <Button variant="outline" size="sm" className="border-slate-800 text-xs text-cyan-400 hover:bg-slate-800">
                    <FileText size={14} className="mr-1.5" /> Full Audit Database
                  </Button>
                </Link>
              </div>

              {/* Stream List */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden">
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-cyan-400 animate-spin" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Real-Time Event Feed (Last 50 Actions)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Auto-polling live stream every 8s
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {auditQuery.data && auditQuery.data.length > 0 ? (
                    auditQuery.data.map(log => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-cyan-400">
                            <Tag size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                                {log.action}
                              </span>
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${getRoleBadgeStyle(log.actorRole)}`}>
                                {formatRole(log.actorRole)}
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {log.actorName || "Platform User"}
                              </span>
                            </div>

                            <div className="mt-1 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                              <span className="text-slate-500">Target:</span>
                              <span className="font-mono text-cyan-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                                {log.targetResource || log.entityId || "Global System"}
                              </span>
                              {log.entityType && (
                                <span className="text-[11px] text-slate-500">
                                  ({log.entityType})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="text-right text-[11px]">
                            <div className="text-slate-300 font-mono">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </div>
                            <div className="text-slate-500 text-[10px]">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-800 bg-slate-950/50 text-[11px] text-slate-300 hover:bg-slate-800"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye size={13} className="mr-1 text-cyan-400" /> Inspect
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-xs text-slate-500">
                      No real-time events found matching criteria.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: User Activity Telemetry Roster */}
          {activeTab === "roster" && (
            <div className="space-y-4">
              {/* Roster Controls */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search by User Name, Email, Clerk ID..."
                      value={rosterSearch}
                      onChange={e => setRosterSearch(e.target.value)}
                      className="pl-9 bg-slate-950/60 border-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={rosterRoleFilter}
                    onChange={e => setRosterRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200"
                  >
                    <option value="ALL">All Roles</option>
                    {Object.values(PlatformRoles).map(r => (
                      <option key={r} value={r}>
                        {formatRole(r)}
                      </option>
                    ))}
                  </select>

                  <Link href="/admin/users">
                    <Button size="sm" className="bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500">
                      <Users size={14} className="mr-1.5" /> Manage Permissions
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">User Identity</th>
                        <th className="px-5 py-3.5">Assigned Role & Status</th>
                        <th className="px-5 py-3.5">Last Signed In</th>
                        <th className="px-5 py-3.5">Total Actions</th>
                        <th className="px-5 py-3.5">Most Recent Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRoster.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-white text-sm">
                              {u.name}
                            </div>
                            <div className="text-slate-400 text-xs">{u.email || "No email"}</div>
                            <div className="text-slate-500 font-mono text-[10px]">{u.clerkUserId}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${getRoleBadgeStyle(u.role)}`}>
                              {formatRole(u.role)}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  u.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-amber-500/10 text-amber-400"
                                }`}
                              >
                                {u.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            {u.lastSignedIn ? (
                              <div>
                                <div className="font-mono text-xs">{new Date(u.lastSignedIn).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-500">{new Date(u.lastSignedIn).toLocaleTimeString()}</div>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-extrabold text-sm text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                              {u.totalActionsCount}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.lastAction ? (
                              <div>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${getActionBadgeColor(u.lastAction)}`}>
                                  {u.lastAction}
                                </span>
                                {u.lastActionTimestamp && (
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {new Date(u.lastActionTimestamp).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">No recorded actions</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Role Productivity & System Governance */}
          {activeTab === "health" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Role Distribution Meter */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck size={18} className="text-cyan-400" /> Action Distribution by Role
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Total operation velocity recorded across all role categories.
                </p>

                <div className="mt-5 space-y-3.5">
                  {Object.entries(surveillance.roleDistribution).map(([role, count]) => {
                    const total = surveillance.totalEvents || 1;
                    const percent = Math.round(((count as number) / total) * 100);
                    return (
                      <div key={role} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300">{formatRole(role)}</span>
                          <span className="font-mono text-cyan-400 font-bold">{count as number} ({percent}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Action Types */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" /> Most Frequent Operations
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Highest volume administrative and field operations.
                </p>

                <div className="mt-5 space-y-3">
                  {surveillance.topActions.map((item: any, idx: number) => (
                    <div
                      key={item.action}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-semibold text-slate-200 truncate max-w-[160px]">
                          {item.action}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {item.count} ops
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Administrative Launcher */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Zap size={18} className="text-amber-400" /> Administrative Operations
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Direct access to core administrative consoles.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    <Link href="/admin/authorities">
                      <Button className="w-full justify-between bg-gradient-to-r from-cyan-600 to-blue-600 text-xs font-bold text-white hover:from-cyan-500 hover:to-blue-500">
                        <span className="flex items-center gap-2">
                          <ShieldCheck size={14} /> + Add / Invite Authority
                        </span>
                        <ArrowUpRight size={14} />
                      </Button>
                    </Link>

                    <Link href="/admin/users">
                      <Button
                        variant="outline"
                        className="w-full justify-between border-slate-800 bg-slate-950/40 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <Users size={14} /> Manage Platform Users
                        </span>
                        <ArrowUpRight size={14} />
                      </Button>
                    </Link>

                    <Link href="/admin/audit-logs">
                      <Button
                        variant="outline"
                        className="w-full justify-between border-slate-800 bg-slate-950/40 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={14} /> Forensic Audit Database
                        </span>
                        <ArrowUpRight size={14} />
                      </Button>
                    </Link>

                    <Link href="/workspace">
                      <Button
                        variant="outline"
                        className="w-full justify-between border-slate-800 bg-slate-950/40 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <Globe2 size={14} /> Open 3D Cesium GIS Globe
                        </span>
                        <ArrowUpRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-[11px] text-cyan-300/90">
                  Super Admin has unrestricted live read/write authority across all districts, departments, and 3D cadastre records.
                </div>
              </div>
            </div>
          )}

          {/* Deep Event Details Inspection Modal */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Forensic Audit Inspection</h3>
                      <p className="text-xs text-slate-400">Audit Log Record #{selectedLog.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Actor Info Card */}
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Actor Name</div>
                    <div className="text-white font-bold text-sm mt-0.5">{selectedLog.actorName || "Staff User"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Actor Role</div>
                    <div className="mt-0.5">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getRoleBadgeStyle(selectedLog.actorRole)}`}>
                        {formatRole(selectedLog.actorRole)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Clerk User ID</div>
                    <div className="font-mono text-cyan-400 text-xs mt-0.5 truncate">{selectedLog.actorClerkUserId}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Recorded Timestamp</div>
                    <div className="font-mono text-slate-300 text-xs mt-0.5">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Action & Target */}
                <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Action Identifier</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold border ${getActionBadgeColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-slate-400">Target Resource:</span>
                    <span className="font-mono text-white font-semibold">{selectedLog.targetResource || selectedLog.entityId || "Global"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Entity Type:</span>
                    <span className="font-mono text-slate-300">{selectedLog.entityType}</span>
                  </div>
                </div>

                {/* JSON Changes / Diff */}
                {selectedLog.newValue && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Payload / Applied State
                    </div>
                    <pre className="max-h-48 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-cyan-300">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.newValue), null, 2);
                        } catch {
                          return selectedLog.newValue;
                        }
                      })()}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Additional Metadata
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300 font-mono">
                      {selectedLog.metadata}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="bg-slate-800 text-white hover:bg-slate-700 text-xs"
                    onClick={() => setSelectedLog(null)}
                  >
                    Close Inspection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

