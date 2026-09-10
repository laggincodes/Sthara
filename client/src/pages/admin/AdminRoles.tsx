import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { trpc } from "@/lib/trpc";
import {
  ALL_PERMISSIONS,
  formatRole,
  PlatformRoles,
  ROLE_PERMISSIONS,
} from "@shared/permissions";
import { Check, Shield, X } from "lucide-react";
import React from "react";

export default function AdminRoles() {
  const rolesQuery = trpc.admin.rolesAndPermissions.useQuery();

  const roles = [
    PlatformRoles.SUPER_ADMIN,
    PlatformRoles.AUTHORITY_ADMIN,
    PlatformRoles.AUTHORITY_OFFICER,
    PlatformRoles.GOVERNMENT_EMPLOYEE,
    PlatformRoles.SURVEYOR,
    PlatformRoles.CITIZEN,
  ];

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Roles & Permissions Matrix"
        subtitle="Authoritative server-enforced permissions mapping across all platform roles"
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Shield size={18} className="text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Centralized Permissions Matrix
                </h2>
                <p className="text-xs text-slate-400">
                  Granular permission gates enforced in backend tRPC procedures and database transactions.
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80">
                    <th className="px-4 py-3 font-semibold uppercase text-slate-400 text-[11px] sticky left-0 bg-slate-950/90 backdrop-blur z-10">
                      Permission Name
                    </th>
                    {roles.map(r => (
                      <th
                        key={r}
                        className="px-4 py-3 font-semibold text-center text-slate-300 text-[11px] min-w-[120px]"
                      >
                        <div className="font-bold text-cyan-400">{r}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatRole(r)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ALL_PERMISSIONS.map(perm => {
                    return (
                      <tr key={perm} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-mono font-medium text-slate-200 sticky left-0 bg-slate-900/90 backdrop-blur z-10 border-r border-slate-800/50">
                          {perm}
                        </td>
                        {roles.map(r => {
                          const has = ROLE_PERMISSIONS[r]?.includes(perm as any);
                          return (
                            <td key={r} className="px-4 py-3 text-center">
                              {has ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                                  <Check size={14} />
                                </span>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/40 text-slate-600">
                                  <X size={14} />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
