import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  Download,
  Filter,
  History,
  RefreshCw,
  Search,
  Shield,
  Tag,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function AdminAuditLogs() {
  const [actionFilter, setActionFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actorSearch, setActorSearch] = useState("");

  const auditQuery = trpc.admin.auditLogs.useQuery({
    action: actionFilter || undefined,
    actorRole: roleFilter || undefined,
    actorClerkUserId: actorSearch || undefined,
    limit: 100,
  });

  const exportCsv = () => {
    if (!auditQuery.data || auditQuery.data.length === 0) {
      toast.error("No audit records available to export");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "Action",
      "Actor Name",
      "Actor Role",
      "Actor Clerk ID",
      "Entity Type",
      "Entity ID",
      "Target Resource",
      "Old Value",
      "New Value",
      "Metadata",
    ];

    const rows = auditQuery.data.map(log => [
      log.id,
      new Date(log.createdAt).toISOString(),
      log.action,
      log.actorName || "",
      log.actorRole,
      log.actorClerkUserId,
      log.entityType,
      log.entityId,
      log.targetResource || "",
      (log.oldValue || "").replace(/"/g, '""'),
      (log.newValue || "").replace(/"/g, '""'),
      (log.metadata || "").replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(cell => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit log CSV exported successfully");
  };

  const actionOptions = [
    "USER_CREATED",
    "USER_INVITED",
    "AUTHORITY_INVITED",
    "ROLE_CHANGED",
    "USER_STATUS_UPDATED",
    "USER_ACTIVATED",
    "USER_SUSPENDED",
    "USER_DISABLED",
    "USER_JURISDICTION_UPDATED",
    "DEPARTMENT_CREATED",
    "DISTRICT_CREATED",
    "ORGANIZATION_CREATED",
    "PROPERTY_APPROVED",
    "PROPERTY_REJECTED",
    "EVIDENCE_SUBMITTED",
    "EVIDENCE_REVIEWED",
    "ISSUE_REPORT_SUBMITTED",
    "SURVEY_DATA_UPLOADED",
    "evidence_file_uploaded",
    "authoritative_footprint_updated",
    "LOGIN",
    "LOGOUT",
  ];

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Immutable Audit Logs"
        subtitle="Cryptographically tracked security and cadastral operation records"
        actionButton={
          <Button
            size="sm"
            variant="outline"
            className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
            onClick={exportCsv}
          >
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <option value="">All Actions ({actionOptions.length})</option>
                {actionOptions.map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <option value="">All Actor Roles</option>
                {Object.values(PlatformRoles).map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <Input
                placeholder="Search Actor Clerk ID / Name..."
                value={actorSearch}
                onChange={e => setActorSearch(e.target.value)}
                className="w-48 border-slate-800 bg-slate-950/60 text-xs"
              />
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
              Refresh
            </Button>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Action</th>
                    <th className="px-5 py-3.5">Actor Details</th>
                    <th className="px-5 py-3.5">Target / Resource</th>
                    <th className="px-5 py-3.5">Changes / Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditQuery.data && auditQuery.data.length > 0 ? (
                    auditQuery.data.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                          <div>
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-400 border border-cyan-500/20">
                            <Tag size={11} />
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-sans font-semibold text-white">
                            {log.actorName || "Staff User"}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {log.actorRole} · {log.actorClerkUserId.slice(0, 14)}...
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300 truncate max-w-[200px]">
                          {log.targetResource || log.entityId || "System"}
                          <div className="text-[10px] text-slate-500">
                            Type: {log.entityType}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-[300px] truncate font-sans text-xs">
                          {log.newValue ? (
                            <div className="text-slate-300 truncate">
                              <span className="text-slate-500 font-mono text-[10px]">New:</span> {log.newValue}
                            </div>
                          ) : log.metadata ? (
                            <div className="text-slate-400 truncate">
                              {log.metadata}
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-sans text-xs">
                        {auditQuery.isLoading
                          ? "Loading audit trail from Neon PostgreSQL..."
                          : "No audit records found matching criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
