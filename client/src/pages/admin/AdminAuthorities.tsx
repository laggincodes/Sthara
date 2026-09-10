import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  formatRole,
  PlatformRoles,
  UserStatuses,
} from "@shared/permissions";
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function AdminAuthorities() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [successLinkModalOpen, setSuccessLinkModalOpen] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteEmail, setLatestInviteEmail] = useState("");
  const [search, setSearch] = useState("");

  // Invite Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<
    "AUTHORITY_ADMIN" | "AUTHORITY_OFFICER" | "GOVERNMENT_EMPLOYEE" | "SURVEYOR"
  >("AUTHORITY_OFFICER");
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<number | undefined>(undefined);
  const [jurisdiction, setJurisdiction] = useState("");
  const [designation, setDesignation] = useState("");

  const utils = trpc.useUtils();

  const usersQuery = trpc.admin.users.useQuery({
    query: search || undefined,
  });

  const deptsQuery = trpc.admin.departments.useQuery();
  const distsQuery = trpc.admin.districts.useQuery();
  const orgsQuery = trpc.admin.organizations.useQuery();
  const pendingInvitesQuery = trpc.admin.pendingInvitations.useQuery();

  const resendMutation = trpc.admin.resendInvitation.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Invitation resent to ${variables.email}!`);
      void utils.admin.pendingInvitations.invalidate();
      void utils.admin.users.invalidate();
      if (data.invitationUrl) {
        setLatestInviteUrl(data.invitationUrl);
        setLatestInviteEmail(variables.email);
        setSuccessLinkModalOpen(true);
      }
    },
    onError: err => {
      toast.error(err.message || "Failed to resend invitation");
    },
  });

  const inviteMutation = trpc.admin.inviteAuthority.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Authority account invitation created for ${data.email}!`
      );
      setInviteModalOpen(false);

      if (data.clerkResult?.invitationUrl) {
        setLatestInviteUrl(data.clerkResult.invitationUrl);
        setLatestInviteEmail(data.email);
        setSuccessLinkModalOpen(true);
      }

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setDesignation("");
      setJurisdiction("");
      void utils.admin.users.invalidate();
      void utils.admin.stats.invalidate();
      void utils.admin.auditLogs.invalidate();
      void utils.admin.pendingInvitations.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to invite authority");
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and official email are required.");
      return;
    }

    inviteMutation.mutate({
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      role,
      departmentId,
      districtId,
      organizationId,
      jurisdiction: jurisdiction.trim() || undefined,
      designation: designation.trim() || undefined,
    });
  };

  const copyToClipboard = (text: string, label = "Link") => {
    navigator.clipboard.writeText(text);
    toast.success(`📋 ${label} copied to clipboard!`);
  };

  const deptsMap = new Map((deptsQuery.data ?? []).map(d => [d.id, d.name]));
  const distsMap = new Map((distsQuery.data ?? []).map(d => [d.id, d.name]));

  // Filter for staff / authority users
  const staffUsers = (usersQuery.data ?? []).filter(u => {
    const r = u.role.toUpperCase();
    return (
      r === "AUTHORITY_ADMIN" ||
      r === "AUTHORITY_OFFICER" ||
      r === "GOVERNMENT_EMPLOYEE" ||
      r === "SURVEYOR" ||
      r === "AUTHORITY" ||
      r === "GOVERNMENT"
    );
  });

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Authority & Staff Management"
        subtitle="Provision and invite verification officers, department heads, and field surveyors via Clerk"
        actionButton={
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 font-semibold text-white hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20"
            onClick={() => setInviteModalOpen(true)}
          >
            <Plus size={16} className="mr-1.5" /> Add Authority
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">
                  ACTIVE OFFICERS
                </span>
                <ShieldCheck size={18} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-white">
                {staffUsers.filter(s => s.status === "ACTIVE").length}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Authorized for cadastral review & GIS validation
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">
                  INVITED / PENDING SETUP
                </span>
                <Clock size={18} className="text-amber-400" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-white">
                {staffUsers.filter(s => s.status === "INVITED").length}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Clerk invitation email dispatched, awaiting user password setup
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase">
                  DEPARTMENTS DEPLOYED
                </span>
                <Building2 size={18} className="text-purple-400" />
              </div>
              <div className="mt-3 text-2xl font-extrabold text-white">
                {deptsQuery.data?.length ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                DoLR, Survey of India, Revenue & Land Reforms, Urban Development
              </p>
            </div>
          </div>

          {/* Authorities Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-cyan-400" />
                <span className="font-bold text-sm text-white">
                  Official Authority & Officer Roster ({staffUsers.length})
                </span>
              </div>
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Officer Name & Contact</th>
                    <th className="px-5 py-3.5">Staff Role</th>
                    <th className="px-5 py-3.5">Account Status</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">District Jurisdiction</th>
                    <th className="px-5 py-3.5">Invitation / Setup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staffUsers.length > 0 ? (
                    staffUsers.map(u => {
                      const deptName = u.departmentId ? deptsMap.get(u.departmentId) : null;
                      const distName = u.districtId ? distsMap.get(u.districtId) : null;

                      return (
                        <tr key={u.clerkUserId} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white">
                              {u.name || "Unnamed Officer"}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {u.email}
                            </div>
                            {u.designation && (
                              <div className="text-cyan-400 text-[10px] font-medium mt-0.5">
                                {u.designation}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
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
                              <span className="font-medium text-slate-200">
                                {deptName}
                              </span>
                            ) : (
                              <span className="text-slate-500">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-cyan-400 shrink-0" />
                              <span>{distName || "State-wide"}</span>
                            </div>
                            {u.jurisdiction && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {u.jurisdiction}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                            {u.status === "INVITED" ? (
                              <div className="space-y-1.5">
                                <div className="text-blue-400 font-medium flex items-center gap-1">
                                  <Mail size={12} /> Invitation Sent
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {u.invitationSentAt
                                    ? `Sent: ${new Date(u.invitationSentAt).toLocaleDateString()}`
                                    : `Pending setup`}
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  {(() => {
                                    const matching = (
                                      pendingInvitesQuery.data ?? []
                                    ).find(
                                      p =>
                                        p.email_address.toLowerCase() ===
                                        u.email?.toLowerCase()
                                    );
                                    return matching?.url ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                                        onClick={() =>
                                          copyToClipboard(
                                            matching.url!,
                                            "Officer Setup Link"
                                          )
                                        }
                                      >
                                        <Copy size={10} className="mr-1" /> Copy Link
                                      </Button>
                                    ) : null;
                                  })()}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800"
                                    disabled={resendMutation.isPending}
                                    onClick={() =>
                                      resendMutation.mutate({
                                        email: u.email!,
                                        role: u.role,
                                      })
                                    }
                                  >
                                    <RotateCw
                                      size={10}
                                      className={`mr-1 ${
                                        resendMutation.isPending &&
                                        resendMutation.variables?.email ===
                                          u.email
                                          ? "animate-spin"
                                          : ""
                                      }`}
                                    />
                                    Resend
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Setup Completed
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {u.createdAt
                                    ? `Joined: ${new Date(u.createdAt).toLocaleDateString()}`
                                    : ""}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No authority staff users provisioned yet. Click "+ Add Authority" to invite officers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add / Invite Authority Modal */}
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <UserPlus size={18} className="text-cyan-400" /> Add & Invite Authority Officer
                </div>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Full Name *</Label>
                    <Input
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">Official Gov Email *</Label>
                    <Input
                      type="email"
                      placeholder="e.g. rajesh.kumar@bihar.gov.in"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Staff Role *</Label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as any)}
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs font-semibold text-cyan-400"
                    >
                      <option value="AUTHORITY_ADMIN">AUTHORITY_ADMIN (Department Head)</option>
                      <option value="AUTHORITY_OFFICER">AUTHORITY_OFFICER (Verification Officer)</option>
                      <option value="GOVERNMENT_EMPLOYEE">GOVERNMENT_EMPLOYEE (Operations Staff)</option>
                      <option value="SURVEYOR">SURVEYOR (Field Survey & GNSS)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">Official Designation</Label>
                    <Input
                      placeholder="e.g. Assistant Director (Land Records)"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Department</Label>
                    <select
                      value={departmentId ?? ""}
                      onChange={e =>
                        setDepartmentId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                    >
                      <option value="">Select Department...</option>
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
                      value={districtId ?? ""}
                      onChange={e =>
                        setDistrictId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                    >
                      <option value="">Select District...</option>
                      {(distsQuery.data ?? []).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Organization</Label>
                    <select
                      value={organizationId ?? ""}
                      onChange={e =>
                        setOrganizationId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                    >
                      <option value="">Select Organization...</option>
                      {(orgsQuery.data ?? []).map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">Phone (Optional)</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">
                    Jurisdiction / Assigned Circles
                  </Label>
                  <Input
                    placeholder="e.g. Patna Sadar, Danapur Circle, Phulwari Sharif"
                    value={jurisdiction}
                    onChange={e => setJurisdiction(e.target.value)}
                    className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck size={14} /> Official Clerk Secure Account Setup Protocol
                  </div>
                  <p className="mt-1 text-[11px] text-cyan-200/80">
                    The invited officer will receive an official setup email through Clerk to create their secure password. Plaintext passwords are never emailed or stored.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInviteModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
                    disabled={inviteMutation.isPending}
                  >
                    <Send size={14} className="mr-1.5" />
                    {inviteMutation.isPending ? "Dispatching Invitation..." : "Send Clerk Invitation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Setup Link Success / Direct Copy Modal */}
        {successLinkModalOpen && latestInviteUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-blue-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  Official Account Invitation Created
                </div>
                <button
                  onClick={() => setSuccessLinkModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300">
                  An invitation has been registered for{" "}
                  <strong className="text-white">{latestInviteEmail}</strong>.
                </p>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                    <span>DIRECT CLERK SETUP LINK:</span>
                    <span className="text-emerald-400">One-Time Secure Ticket</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-blue-300 break-all font-mono select-all max-h-24 overflow-y-auto">
                    {latestInviteUrl}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300 flex items-start gap-2">
                  <Info size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-semibold">Email Delivery Note:</span>{" "}
                    In Clerk development mode, emails may land in the <strong>Spam / Junk</strong> folder or be queued. You can copy this direct link and share it directly with the officer (via WhatsApp/Email) to activate their account immediately!
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-800 text-xs"
                  onClick={() => setSuccessLinkModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                  onClick={() => copyToClipboard(latestInviteUrl, "Setup Link")}
                >
                  <Copy size={14} className="mr-1.5" /> Copy Setup Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-xs"
                  onClick={() => window.open(latestInviteUrl, "_blank")}
                >
                  <ExternalLink size={14} className="mr-1.5" /> Open Link
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
