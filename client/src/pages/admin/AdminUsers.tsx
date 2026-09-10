import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  canonicalRole,
  CanonicalPlatformRole,
  formatRole,
  PlatformRoles,
  UserStatus,
  UserStatuses,
} from "@shared/permissions";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit2,
  Filter,
  MapPin,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<{
    clerkUserId: string;
    name: string | null;
    email: string | null;
    currentRole: string;
  } | null>(null);
  const [targetRole, setTargetRole] = useState<string>("");

  const [statusModalUser, setStatusModalUser] = useState<{
    clerkUserId: string;
    name: string | null;
    currentStatus: string;
  } | null>(null);
  const [targetStatus, setTargetStatus] = useState<UserStatus>("ACTIVE");
  const [statusReason, setStatusReason] = useState("");

  const [jurisdictionModalUser, setJurisdictionModalUser] = useState<{
    clerkUserId: string;
    name: string | null;
    departmentId: number | null;
    districtId: number | null;
    jurisdiction: string | null;
    designation: string | null;
    phone: string | null;
  } | null>(null);
  const [editDeptId, setEditDeptId] = useState<number | undefined>(undefined);
  const [editDistId, setEditDistId] = useState<number | undefined>(undefined);
  const [editJurisdiction, setEditJurisdiction] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const utils = trpc.useUtils();

  const usersQuery = trpc.admin.users.useQuery({
    query: search || undefined,
    role: selectedRole || undefined,
    status: selectedStatus || undefined,
    departmentId: selectedDept || undefined,
  });

  const deptsQuery = trpc.admin.departments.useQuery();
  const distsQuery = trpc.admin.districts.useQuery();

  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      setRoleModalUser(null);
      void utils.admin.users.invalidate();
      void utils.admin.stats.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to update role");
    },
  });

  const updateStatusMutation = trpc.admin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("User account status updated successfully");
      setStatusModalUser(null);
      void utils.admin.users.invalidate();
      void utils.admin.stats.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const updateJurisdictionMutation = trpc.admin.updateJurisdiction.useMutation({
    onSuccess: () => {
      toast.success("User jurisdiction updated successfully");
      setJurisdictionModalUser(null);
      void utils.admin.users.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to update jurisdiction");
    },
  });

  const handleOpenRoleModal = (u: any) => {
    setRoleModalUser({
      clerkUserId: u.clerkUserId,
      name: u.name,
      email: u.email,
      currentRole: u.role,
    });
    setTargetRole(u.role);
  };

  const handleOpenStatusModal = (u: any) => {
    setStatusModalUser({
      clerkUserId: u.clerkUserId,
      name: u.name || u.email,
      currentStatus: u.status,
    });
    setTargetStatus(u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    setStatusReason("");
  };

  const handleOpenJurisdictionModal = (u: any) => {
    setJurisdictionModalUser({
      clerkUserId: u.clerkUserId,
      name: u.name || u.email,
      departmentId: u.departmentId,
      districtId: u.districtId,
      jurisdiction: u.jurisdiction,
      designation: u.designation,
      phone: u.phone,
    });
    setEditDeptId(u.departmentId || undefined);
    setEditDistId(u.districtId || undefined);
    setEditJurisdiction(u.jurisdiction || "");
    setEditDesignation(u.designation || "");
    setEditPhone(u.phone || "");
  };

  const deptsMap = new Map((deptsQuery.data ?? []).map(d => [d.id, d.name]));
  const distsMap = new Map((distsQuery.data ?? []).map(d => [d.id, d.name]));

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="User & RBAC Management"
        subtitle="Manage platform identities, server-enforced roles, departments, and account statuses"
      >
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <Input
                placeholder="Search by name, email, clerk ID, jurisdiction..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-slate-800 bg-slate-950/60 pl-9 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <option value="">All Roles</option>
                {Object.values(PlatformRoles).map(r => (
                  <option key={r} value={r}>
                    {formatRole(r)}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <option value="">All Statuses</option>
                {Object.values(UserStatuses).map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={selectedDept ?? ""}
                onChange={e =>
                  setSelectedDept(e.target.value ? Number(e.target.value) : undefined)
                }
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <option value="">All Departments</option>
                {(deptsQuery.data ?? []).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => void usersQuery.refetch()}
              >
                <RefreshCw
                  size={14}
                  className={`mr-1.5 ${usersQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">User / Official Details</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Department & Jurisdiction</th>
                    <th className="px-5 py-3.5">Last Signed In</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersQuery.data && usersQuery.data.length > 0 ? (
                    usersQuery.data.map(u => {
                      const canon = canonicalRole(u.role);
                      const isSuperAdmin = canon === PlatformRoles.SUPER_ADMIN;
                      const deptName = u.departmentId ? deptsMap.get(u.departmentId) : null;
                      const distName = u.districtId ? distsMap.get(u.districtId) : null;

                      return (
                        <tr key={u.clerkUserId} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white">
                              {u.name || "Unnamed User"}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {u.email || "No email"}
                            </div>
                            {u.designation && (
                              <div className="text-cyan-400 text-[10px] font-medium mt-0.5">
                                {u.designation}
                              </div>
                            )}
                            <div className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
                              {u.clerkUserId}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                isSuperAdmin
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : canon === PlatformRoles.AUTHORITY_ADMIN ||
                                    canon === PlatformRoles.AUTHORITY_OFFICER
                                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                  : canon === PlatformRoles.SURVEYOR
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : canon === PlatformRoles.GOVERNMENT_EMPLOYEE
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              <Shield size={12} />
                              {formatRole(u.role)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : u.status === "INVITED"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : u.status === "SUSPENDED"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            {deptName ? (
                              <div className="font-medium text-slate-200">
                                {deptName}
                              </div>
                            ) : (
                              <span className="text-slate-500">Unassigned Dept</span>
                            )}
                            {(distName || u.jurisdiction) && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-cyan-400 shrink-0" />
                                <span>
                                  {distName}
                                  {u.jurisdiction ? ` (${u.jurisdiction})` : ""}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">
                            <div>
                              {u.lastSignedIn
                                ? new Date(u.lastSignedIn).toLocaleDateString()
                                : "Never"}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {u.lastSignedIn
                                ? new Date(u.lastSignedIn).toLocaleTimeString()
                                : ""}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 border-slate-800 text-[11px] hover:bg-slate-800 text-slate-300"
                                onClick={() => handleOpenRoleModal(u)}
                              >
                                Change Role
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 border-slate-800 text-[11px] hover:bg-slate-800 text-slate-300"
                                onClick={() => handleOpenJurisdictionModal(u)}
                              >
                                Edit Dept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-[11px] ${
                                  u.status === "ACTIVE"
                                    ? "text-red-400 hover:bg-red-500/10"
                                    : "text-emerald-400 hover:bg-emerald-500/10"
                                }`}
                                onClick={() => handleOpenStatusModal(u)}
                              >
                                {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        {usersQuery.isLoading
                          ? "Loading platform users from database..."
                          : "No platform users found matching criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Change Role Modal */}
        {roleModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Shield size={18} className="text-cyan-400" /> Change User Role
                </div>
                <button
                  onClick={() => setRoleModalUser(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Target User</Label>
                  <div className="font-semibold text-white">
                    {roleModalUser.name || "Unnamed"} ({roleModalUser.email || roleModalUser.clerkUserId})
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Select New Role</Label>
                  <select
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-medium text-white"
                  >
                    {Object.values(PlatformRoles).map(role => (
                      <option key={role} value={role}>
                        {formatRole(role)} ({role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle size={14} /> Server-Assigned Role Security
                  </div>
                  <p className="mt-1 text-[11px] text-amber-200/80">
                    Role assignment takes effect immediately on the backend and is recorded in the immutable audit log.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoleModalUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
                  disabled={updateRoleMutation.isPending || targetRole === roleModalUser.currentRole}
                  onClick={() => {
                    updateRoleMutation.mutate({
                      clerkUserId: roleModalUser.clerkUserId,
                      role: targetRole as any,
                    });
                  }}
                >
                  {updateRoleMutation.isPending ? "Updating..." : "Confirm Role Change"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Change Status Modal */}
        {statusModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <UserX size={18} className="text-red-400" /> Update Account Status
                </div>
                <button
                  onClick={() => setStatusModalUser(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Target User</Label>
                  <div className="font-semibold text-white">
                    {statusModalUser.name}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Status</Label>
                  <select
                    value={targetStatus}
                    onChange={e => setTargetStatus(e.target.value as UserStatus)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-sm font-medium text-white"
                  >
                    {Object.values(UserStatuses).map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Administrative Reason (Optional)</Label>
                  <Input
                    placeholder="Reason for status change..."
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    className="mt-1.5 border-slate-800 bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusModalUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={
                    targetStatus === "SUSPENDED" || targetStatus === "DISABLED"
                      ? "bg-red-600 text-white hover:bg-red-500 font-semibold"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                  }
                  disabled={updateStatusMutation.isPending}
                  onClick={() => {
                    updateStatusMutation.mutate({
                      clerkUserId: statusModalUser.clerkUserId,
                      status: targetStatus,
                      reason: statusReason,
                    });
                  }}
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Save Status"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Jurisdiction Modal */}
        {jurisdictionModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Building2 size={18} className="text-cyan-400" /> Assign Department & Jurisdiction
                </div>
                <button
                  onClick={() => setJurisdictionModalUser(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Department</Label>
                    <select
                      value={editDeptId ?? ""}
                      onChange={e =>
                        setEditDeptId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                    >
                      <option value="">None / Unassigned</option>
                      {(deptsQuery.data ?? []).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">District</Label>
                    <select
                      value={editDistId ?? ""}
                      onChange={e =>
                        setEditDistId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                    >
                      <option value="">None / State-wide</option>
                      {(distsQuery.data ?? []).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Specific Jurisdiction (e.g. Circles, Wards)</Label>
                  <Input
                    placeholder="Patna Sadar, Danapur Circle, Ward 12..."
                    value={editJurisdiction}
                    onChange={e => setEditJurisdiction(e.target.value)}
                    className="mt-1.5 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Designation</Label>
                    <Input
                      placeholder="Senior Verification Officer"
                      value={editDesignation}
                      onChange={e => setEditDesignation(e.target.value)}
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Official Contact</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setJurisdictionModalUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
                  disabled={updateJurisdictionMutation.isPending}
                  onClick={() => {
                    updateJurisdictionMutation.mutate({
                      clerkUserId: jurisdictionModalUser.clerkUserId,
                      departmentId: editDeptId ?? null,
                      districtId: editDistId ?? null,
                      jurisdiction: editJurisdiction || null,
                      designation: editDesignation || null,
                      phone: editPhone || null,
                    });
                  }}
                >
                  {updateJurisdictionMutation.isPending ? "Saving..." : "Save Jurisdiction"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
