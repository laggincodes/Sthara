import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { PlatformRoles } from "@shared/permissions";
import {
  Building2,
  FolderTree,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function AdminDepartments() {
  const [deptModal, setDeptModal] = useState(false);
  const [distModal, setDistModal] = useState(false);
  const [orgModal, setOrgModal] = useState(false);

  // Form states
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  const [distName, setDistName] = useState("");
  const [distCode, setDistCode] = useState("");
  const [distState, setDistState] = useState("Bihar");

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("STATE_AUTHORITY");

  const utils = trpc.useUtils();

  const deptsQuery = trpc.admin.departments.useQuery();
  const distsQuery = trpc.admin.districts.useQuery();
  const orgsQuery = trpc.admin.organizations.useQuery();

  const createDeptMutation = trpc.admin.createDepartment.useMutation({
    onSuccess: () => {
      toast.success("Department created successfully");
      setDeptModal(false);
      setDeptName("");
      setDeptCode("");
      setDeptDesc("");
      void utils.admin.departments.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const createDistMutation = trpc.admin.createDistrict.useMutation({
    onSuccess: () => {
      toast.success("District registered successfully");
      setDistModal(false);
      setDistName("");
      setDistCode("");
      void utils.admin.districts.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const createOrgMutation = trpc.admin.createOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organization added successfully");
      setOrgModal(false);
      setOrgName("");
      void utils.admin.organizations.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  return (
    <ProtectedRoute allowedRoles={[PlatformRoles.SUPER_ADMIN]}>
      <AdminLayout
        title="Departments, Districts & Jurisdictions"
        subtitle="Configure the administrative hierarchy governing vertical property mapping"
      >
        <div className="space-y-8">
          {/* Departments Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FolderTree size={18} className="text-cyan-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Registered Government Departments ({deptsQuery.data?.length ?? 0})
                </h2>
              </div>
              <Button
                size="sm"
                className="bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500"
                onClick={() => setDeptModal(true)}
              >
                <Plus size={14} className="mr-1" /> Add Department
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deptsQuery.data?.map(dept => (
                <div
                  key={dept.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {dept.code}
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {dept.status}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-white">
                    {dept.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {dept.description || "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Districts Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-purple-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Covered Districts & Cadastral Zones ({distsQuery.data?.length ?? 0})
                </h2>
              </div>
              <Button
                size="sm"
                className="bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500"
                onClick={() => setDistModal(true)}
              >
                <Plus size={14} className="mr-1" /> Add District
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {distsQuery.data?.map(dist => (
                <div
                  key={dist.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-400">
                      {dist.code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dist.state}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-white">
                    {dist.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>

          {/* Organizations Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-blue-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Registered Partner Organizations ({orgsQuery.data?.length ?? 0})
                </h2>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500"
                onClick={() => setOrgModal(true)}
              >
                <Plus size={14} className="mr-1" /> Add Organization
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {orgsQuery.data?.map(org => (
                <div
                  key={org.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4"
                >
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-400">
                    {org.type}
                  </span>
                  <h3 className="mt-2 text-sm font-bold text-white">
                    {org.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Department Modal */}
        {deptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <FolderTree size={18} className="text-cyan-400" /> Register Department
                </div>
                <button
                  onClick={() => setDeptModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-400">Department Name</Label>
                  <Input
                    placeholder="e.g. Directorate of Urban Local Bodies"
                    value={deptName}
                    onChange={e => setDeptName(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Code / Acronym</Label>
                  <Input
                    placeholder="e.g. DULB"
                    value={deptCode}
                    onChange={e => setDeptCode(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Description</Label>
                  <Input
                    placeholder="Role and jurisdiction description..."
                    value={deptDesc}
                    onChange={e => setDeptDesc(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button variant="outline" size="sm" onClick={() => setDeptModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
                  disabled={!deptName.trim() || !deptCode.trim() || createDeptMutation.isPending}
                  onClick={() => {
                    createDeptMutation.mutate({
                      name: deptName.trim(),
                      code: deptCode.trim().toUpperCase(),
                      description: deptDesc.trim() || undefined,
                    });
                  }}
                >
                  {createDeptMutation.isPending ? "Saving..." : "Create Department"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add District Modal */}
        {distModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <MapPin size={18} className="text-purple-400" /> Register District
                </div>
                <button
                  onClick={() => setDistModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-400">District Name</Label>
                  <Input
                    placeholder="e.g. Samastipur"
                    value={distName}
                    onChange={e => setDistName(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">District Code</Label>
                  <Input
                    placeholder="e.g. SAM"
                    value={distCode}
                    onChange={e => setDistCode(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">State</Label>
                  <Input
                    value={distState}
                    onChange={e => setDistState(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button variant="outline" size="sm" onClick={() => setDistModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-500 font-semibold"
                  disabled={!distName.trim() || !distCode.trim() || createDistMutation.isPending}
                  onClick={() => {
                    createDistMutation.mutate({
                      name: distName.trim(),
                      code: distCode.trim().toUpperCase(),
                      state: distState.trim(),
                    });
                  }}
                >
                  {createDistMutation.isPending ? "Saving..." : "Add District"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Organization Modal */}
        {orgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Network size={18} className="text-blue-400" /> Register Organization
                </div>
                <button
                  onClick={() => setOrgModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-400">Organization Name</Label>
                  <Input
                    placeholder="e.g. National Informatics Centre (NIC)"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="mt-1 border-slate-800 bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Organization Type</Label>
                  <select
                    value={orgType}
                    onChange={e => setOrgType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-medium text-white"
                  >
                    <option value="CENTRAL_MINISTRY">CENTRAL_MINISTRY</option>
                    <option value="STATE_AUTHORITY">STATE_AUTHORITY</option>
                    <option value="MUNICIPAL_CORP">MUNICIPAL_CORP</option>
                    <option value="NATIONAL_AGENCY">NATIONAL_AGENCY</option>
                    <option value="AUTONOMOUS_BODY">AUTONOMOUS_BODY</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                <Button variant="outline" size="sm" onClick={() => setOrgModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-500 font-semibold"
                  disabled={!orgName.trim() || createOrgMutation.isPending}
                  onClick={() => {
                    createOrgMutation.mutate({
                      name: orgName.trim(),
                      type: orgType,
                    });
                  }}
                >
                  {createOrgMutation.isPending ? "Saving..." : "Add Organization"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
