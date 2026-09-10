import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { trpc } from "@/lib/trpc";
import { PlatformRoles } from "@shared/permissions";
import { CheckCircle2, Database, Key, Lock, Shield, Sliders } from "lucide-react";
import React from "react";

export default function AdminSettings() {
  const settingsQuery = trpc.admin.settings.useQuery();

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="System Configuration & Security Policy"
        subtitle="Cryptographic verification standards, evidence ladder policies and database boundaries"
      >
        <div className="space-y-6 max-w-4xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Shield size={18} className="text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Security Guarantees & Access Policy
                </h2>
                <p className="text-xs text-slate-400">
                  {settingsQuery.data?.note || "Strict server-enforced security boundaries."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Lock size={16} className="text-emerald-400" /> Zero Client-Side Role Trust
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Roles and permissions are retrieved exclusively from Neon PostgreSQL based on authenticated Clerk sessions. Client requests cannot override or dictate privilege levels.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Database size={16} className="text-cyan-400" /> Immutable Audit Logging
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Every privileged mutation (footprint edit, role assignment, status suspension, evidence upload, property verification) writes directly to the immutable PostgreSQL <code className="text-cyan-400">auditLogs</code> table.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Key size={16} className="text-purple-400" /> Zero Plaintext Password Storage
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Passwords and credentials are never stored in the database or sent over email. Official Clerk invitation workflows enable authorities and staff to configure secure credentials through official protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
