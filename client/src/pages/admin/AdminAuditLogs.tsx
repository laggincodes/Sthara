import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  Activity,
  Calendar,
  Clock,
  Download,
  Eye,
  FileCode,
  FileText,
  Filter,
  History,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Tag,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const auditQuery = trpc.admin.auditLogs.useQuery(
    {
      search: searchTerm || undefined,
      action: actionFilter !== "ALL" ? actionFilter : undefined,
      actorRole: roleFilter !== "ALL" ? roleFilter : undefined,
      limit: 200,
    },
    { refetchInterval: 10000 }
  );

  const exportCsv = () => {
    if (!auditQuery.data || auditQuery.data.length === 0) {
      toast.error("No audit records available to export");
      return;
    }

    const headers = [
      "Log ID",
      "Timestamp",
      "Action",
      "Actor Name",
      "Actor Role",
      "Actor Clerk ID",
      "Entity Type",
      "Entity ID",
      "Target Resource",
      "Applied Payload / Value",
      "Metadata",
    ];

    const rows = auditQuery.data.map(log => [
      log.id,
      new Date(log.createdAt).toISOString(),
      log.action,
      log.actorName || "Staff User",
      log.actorRole,
      log.actorClerkUserId,
      log.entityType,
      log.entityId,
      log.targetResource || "",
      (log.newValue || log.oldValue || "").replace(/"/g, '""'),
      (log.metadata || "").replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(cell => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `3D-Cadastre-Audit-Trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Forensic audit CSV exported successfully");
  };

  const exportJson = () => {
    if (!auditQuery.data || auditQuery.data.length === 0) {
      toast.error("No audit records available to export");
      return;
    }

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(auditQuery.data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `3D-Cadastre-Audit-Records-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Forensic audit JSON database exported successfully");
  };

  const actionOptions = [
    { id: "ALL", label: "All Platform Actions" },
    { id: "OFFICIAL_3D_CERTIFICATE_GENERATED", label: "Official Certificate Issued" },
    { id: "DIGITAL_ULPIN_CARD_GENERATED", label: "Digital ULPIN Card Downloaded" },
    { id: "3D_FOOTPRINT_HEIGHT_SANCTIONED", label: "3D Footprint Height Sanctioned" },
    { id: "GCP_BENCHMARK_RECORDED", label: "GCP GNSS Benchmark Recorded" },
    { id: "SURVEY_MISSION_DISPATCHED", label: "Survey Mission Dispatched" },
    { id: "PROPERTY_APPROVED", label: "3D Property Approved" },
    { id: "PROPERTY_REJECTED", label: "3D Property Rejected" },
    { id: "EVIDENCE_SUBMITTED", label: "Evidence Ladder Submitted" },
    { id: "EVIDENCE_REVIEWED", label: "Evidence Ladder Reviewed" },
    { id: "ROLE_CHANGED", label: "User Role Changed" },
    { id: "USER_STATUS_UPDATED", label: "User Status Updated" },
    { id: "AUTHORITY_INVITED", label: "Authority Officer Invited" },
    { id: "USER_ACTIVATED", label: "Account Activated" },
    { id: "DEPARTMENT_CREATED", label: "Department Created" },
    { id: "DISTRICT_CREATED", label: "District Created" },
    { id: "SURVEY_DATA_UPLOADED", label: "Survey Dataset Ingested" },
    { id: "LOGOUT", label: "User Session Logout" },
  ];

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

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Forensic Audit Logs & Activity Surveillance"
        subtitle="Cryptographically immutable records of all actions, authorizations, and spatial mutations"
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
              onClick={exportJson}
            >
              <FileCode size={14} className="mr-1.5 text-purple-400" /> Export JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
              onClick={exportCsv}
            >
              <Download size={14} className="mr-1.5 text-cyan-400" /> Export CSV
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Multi-Dimensional Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Full-text search (Actor, Clerk ID, ULPIN, Action, Payload)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200"
              >
                {actionOptions.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200"
              >
                <option value="ALL">All Actor Roles</option>
                {Object.values(PlatformRoles).map(r => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => void auditQuery.refetch()}
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 ${auditQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh ({auditQuery.data?.length ?? 0} loaded)
            </Button>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Log ID / Timestamp</th>
                    <th className="px-5 py-3.5">Action Identifier</th>
                    <th className="px-5 py-3.5">Actor Identity</th>
                    <th className="px-5 py-3.5">Target Resource</th>
                    <th className="px-5 py-3.5">Applied Payload Preview</th>
                    <th className="px-5 py-3.5 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditQuery.data && auditQuery.data.length > 0 ? (
                    auditQuery.data.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                          <div className="font-mono text-cyan-400 font-bold text-xs">#{log.id}</div>
                          <div className="text-slate-300 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold border ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            Type: {log.entityType}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white text-xs">
                            {log.actorName || "Staff User"}
                          </div>
                          <div className="mt-0.5">
                            <span className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-bold border ${getRoleBadgeStyle(log.actorRole)}`}>
                              {formatRole(log.actorRole)}
                            </span>
                          </div>
                          <div className="text-slate-500 font-mono text-[10px] truncate max-w-[140px] mt-0.5">
                            {log.actorClerkUserId}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          <span className="font-mono text-xs text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 inline-block max-w-[180px] truncate">
                            {log.targetResource || log.entityId || "Global System"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300 max-w-[260px] truncate font-mono text-[11px]">
                          {log.newValue ? (
                            <span className="text-slate-300 truncate inline-block max-w-[240px]">
                              {log.newValue}
                            </span>
                          ) : log.metadata ? (
                            <span className="text-slate-400 truncate inline-block max-w-[240px]">
                              {log.metadata}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-800 bg-slate-950/60 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye size={13} className="mr-1 text-cyan-400" /> Inspect
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-500 font-sans text-xs">
                        {auditQuery.isLoading
                          ? "Querying forensic audit records from Neon PostgreSQL..."
                          : "No audit records found matching criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                      <h3 className="text-base font-bold text-white">Forensic Audit Record #{selectedLog.id}</h3>
                      <p className="text-xs text-slate-400">Complete operation state & telemetry diff</p>
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
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Actor Identity</div>
                    <div className="text-white font-bold text-sm mt-0.5">{selectedLog.actorName || "Staff User"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Platform Role</div>
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
                      Applied Payload / State
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

