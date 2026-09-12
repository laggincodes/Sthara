import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
  Layers,
  Send,
  Sliders,
  Award,
  Compass,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function AuthorityDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"queue" | "sanction" | "cadastre">("queue");

  // Review state
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"verified" | "rejected">("verified");
  const [reviewNote, setReviewNote] = useState("");

  // Height sanctioning state
  const [sanctionUlpin, setSanctionUlpin] = useState("IN-BR-PAT-0042-3D-F04");
  const [approvedHeight, setApprovedHeight] = useState<number>(45.2);
  const [heightSource, setHeightSource] = useState("TCPO/2026/SANCTION-891");
  const [sanctionNote, setSanctionNote] = useState("Height verified against Municipal Master Plan zoning envelope.");

  // Survey mission dispatch state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<string>("");
  const [assignedSurveyor, setAssignedSurveyor] = useState("");
  const [missionInstructions, setMissionInstructions] = useState("");
  const [missionPriority, setMissionPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  const utils = trpc.useUtils();
  const statsQuery = trpc.authority.stats.useQuery();
  const queueQuery = trpc.authority.verificationQueue.useQuery();
  const propertiesQuery = trpc.authority.assignedProperties.useQuery();
  const officersQuery = trpc.authority.officers.useQuery();

  const reviewMutation = trpc.authority.verifyProperty.useMutation({
    onSuccess: () => {
      toast.success(
        `Property submission marked as ${reviewStatus.toUpperCase()} successfully`
      );
      setSelectedSubmission(null);
      setReviewNote("");
      void utils.authority.stats.invalidate();
      void utils.authority.verificationQueue.invalidate();
      void utils.authority.assignedProperties.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to submit review"),
  });

  const footprintMutation = trpc.postgis.updateFootprint.useMutation({
    onSuccess: () => {
      toast.success(
        `Building height approved & sanctioned to ${approvedHeight}m in PostGIS!`
      );
      void utils.authority.stats.invalidate();
      void utils.authority.assignedProperties.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to update footprint height"),
  });

  const dispatchMutation = trpc.authority.assignSurveyTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setDispatchModalOpen(false);
      setSelectedParcel("");
      setMissionInstructions("");
      void utils.authority.stats.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to dispatch mission"),
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || reviewNote.trim().length < 8) {
      toast.error("A detailed review note (minimum 8 characters) is required.");
      return;
    }
    reviewMutation.mutate({
      id: selectedSubmission.id,
      status: reviewStatus,
      reviewNote: reviewNote.trim(),
    });
  };

  const handleSanctionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sanctionUlpin || approvedHeight <= 0 || !heightSource.trim() || sanctionNote.trim().length < 8) {
      toast.error("All height sanctioning fields and source reference are required.");
      return;
    }
    footprintMutation.mutate({
      ulpin: sanctionUlpin,
      approvedHeightMetres: approvedHeight,
      heightSource: heightSource.trim(),
      editNote: sanctionNote.trim(),
    });
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !assignedSurveyor || missionInstructions.trim().length < 6) {
      toast.error("Please select parcel, surveyor and provide survey instructions.");
      return;
    }
    dispatchMutation.mutate({
      parcelReference: selectedParcel,
      surveyorClerkUserId: assignedSurveyor,
      instructions: missionInstructions.trim(),
      priority: missionPriority,
    });
  };

  const stats = statsQuery.data ?? {
    assignedProperties: 0,
    pendingVerification: 0,
    approvedCount: 0,
    rejectedCount: 0,
    recentSubmissions: [],
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        PlatformRoles.SUPER_ADMIN,
        PlatformRoles.AUTHORITY_ADMIN,
        PlatformRoles.AUTHORITY_OFFICER,
      ]}
    >
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        {/* Header */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Authority Verification & Sanctions Workspace</span>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                    L1–L4 Evidence Review
                  </span>
                </div>
                <div className="text-xs text-cyan-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="font-semibold">{formatRole(user?.role)}</span>
                  {user?.jurisdiction && <span>· {user.jurisdiction}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/workspace">
                <Button
                  size="sm"
                  className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-900/30"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D GIS Workspace
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

          {/* Navigation Tabs */}
          <div className="mx-auto max-w-7xl mt-4 flex border-b border-slate-800 gap-6 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("queue")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "queue"
                  ? "text-cyan-400 border-b-2 border-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCheck2 size={15} /> Verification Queue ({(queueQuery.data || []).length})
            </button>
            <button
              onClick={() => setActiveTab("sanction")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "sanction"
                  ? "text-cyan-400 border-b-2 border-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders size={15} /> Authoritative Height & Extrusion Sanctioning
            </button>
            <button
              onClick={() => setActiveTab("cadastre")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "cadastre"
                  ? "text-cyan-400 border-b-2 border-cyan-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 size={15} /> Jurisdiction Cadastre ({(propertiesQuery.data || []).length})
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>ASSIGNED PROPERTIES</span>
                <Building2 size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.assignedProperties}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                In official jurisdiction
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>PENDING REVIEW</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.pendingVerification}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Awaiting authoritative review
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>APPROVED & SEALED</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.approvedCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Level 4 verified deeds
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>REJECTED / RETURNED</span>
                <XCircle size={16} className="text-rose-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.rejectedCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Discrepancy returned to applicant
              </p>
            </div>
          </div>

          {/* TAB 1: VERIFICATION QUEUE & EVIDENCE LADDER */}
          {activeTab === "queue" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Evidence Review & Verification Queue
                  </h2>
                  <p className="text-xs text-slate-400">
                    Inspect physical survey uploads, municipal sanction drawings, and khatiyan mutation records.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void queueQuery.refetch()}
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw size={14} className={`mr-1.5 ${queueQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh Queue
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">Submission ID & Target</th>
                        <th className="px-5 py-3.5">Evidence Type</th>
                        <th className="px-5 py-3.5">Source Reference</th>
                        <th className="px-5 py-3.5">Submitted Date</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(queueQuery.data || []).length > 0 ? (
                        (queueQuery.data || []).map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-white">
                                {sub.recordReference}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                Tracking #{sub.id}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20 uppercase">
                                {sub.submissionType}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-300">
                              <div className="font-mono text-[11px]">{sub.sourceReference}</div>
                              {sub.notes && (
                                <div className="text-slate-500 text-[10px] line-clamp-1 mt-0.5">
                                  {sub.notes}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                  sub.status === "verified"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : sub.status === "rejected"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setReviewStatus("verified");
                                  setReviewNote(sub.reviewNote || "");
                                }}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs h-7 px-2.5"
                              >
                                <ShieldCheck size={13} className="mr-1" /> Inspect & Sign Off
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            No verification submissions awaiting review in your queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHORITATIVE HEIGHT SANCTIONING */}
          {activeTab === "sanction" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:p-8 backdrop-blur max-w-3xl">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-2">
                  <Sliders size={18} /> Authoritative 3D Volumetric Extrusion & Height Sanction
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Directly sanction building heights and volumetric floor counts. Updates live PostGIS geometry and emits an immutable audit event.
                </p>

                <form onSubmit={handleSanctionSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold">Target 3D ULPIN / Parcel</Label>
                      <Input
                        value={sanctionUlpin}
                        onChange={e => setSanctionUlpin(e.target.value)}
                        placeholder="e.g. IN-BR-PAT-0042-3D-F04"
                        required
                        className="bg-slate-950 border-slate-700 text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold">Approved Height (Metres)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="500"
                        value={approvedHeight}
                        onChange={e => setApprovedHeight(Number(e.target.value))}
                        required
                        className="bg-slate-950 border-slate-700 text-cyan-400 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold">Authoritative Height Source Reference</Label>
                    <Input
                      value={heightSource}
                      onChange={e => setHeightSource(e.target.value)}
                      placeholder="e.g. TCPO Municipal Building Permit #2026/891"
                      required
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold">Statutory Authority Review Note</Label>
                    <Textarea
                      rows={3}
                      value={sanctionNote}
                      onChange={e => setSanctionNote(e.target.value)}
                      placeholder="Explain the statutory basis for height extrusion sanction..."
                      required
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-[11px] text-cyan-300 flex items-start gap-2 mt-4">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">PostGIS Spatial Lock:</span> Sanctioning this height will update the 3D extrusion bounds in PostGIS and tag the record with Level 4 geodetic compliance.
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={footprintMutation.isPending}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-5 text-xs rounded-xl shadow-lg shadow-cyan-950/40 mt-4"
                  >
                    {footprintMutation.isPending ? "Updating PostGIS Extrusions..." : "Approve & Sanction 3D Height"}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: JURISDICTION CADASTRE & DISPATCH */}
          {activeTab === "cadastre" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Jurisdiction Cadastre Catalog
                  </h2>
                  <p className="text-xs text-slate-400">
                    Properties registered in your assigned jurisdiction. Dispatch survey missions to field surveyors.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedParcel("Plot 42/B, Danapur Main");
                    setDispatchModalOpen(true);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                >
                  <Compass size={14} className="mr-1.5" /> Dispatch Survey Mission
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">ULPIN & Title</th>
                        <th className="px-5 py-3.5">Building / Parcel</th>
                        <th className="px-5 py-3.5">Floor Level</th>
                        <th className="px-5 py-3.5">Volume (m³)</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(propertiesQuery.data || []).map(p => (
                        <tr key={p.ulpin} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-white font-mono">{p.ulpin}</div>
                            <div className="text-slate-400 text-[11px]">{p.title}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">
                            <div>{p.building}</div>
                            <div className="text-slate-500 text-[10px]">{p.parcel}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300">Floor {p.floor} ({p.unit})</td>
                          <td className="px-5 py-3.5 text-cyan-400 font-mono">{p.volume} m³</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-cyan-400 hover:bg-slate-800"
                              onClick={() => {
                                setSelectedParcel(p.parcel);
                                setDispatchModalOpen(true);
                              }}
                            >
                              <Compass size={12} className="mr-1" /> Assign Survey
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Review Decision Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <ShieldCheck size={18} className="text-cyan-400" />
                  Statutory Evidence Review & Decision
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Target Parcel Reference</div>
                  <div className="font-mono font-bold text-white text-sm">{selectedSubmission.recordReference}</div>
                  <div className="text-cyan-400 text-xs">Evidence Type: {selectedSubmission.submissionType.toUpperCase()}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Applicant Source Reference & Notes</div>
                  <div className="text-slate-200 font-mono text-[11px]">{selectedSubmission.sourceReference}</div>
                  {selectedSubmission.notes && (
                    <div className="text-slate-400 text-xs mt-1 bg-slate-900 p-2 rounded">
                      "{selectedSubmission.notes}"
                    </div>
                  )}
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-3 pt-2">
                  <div>
                    <Label className="text-slate-300 font-semibold mb-1.5 block">Authoritative Decision</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReviewStatus("verified")}
                        className={`p-3 rounded-xl border text-left font-semibold transition ${
                          reviewStatus === "verified"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <CheckCircle2 size={16} className="mb-1" />
                        <div>Approve & Seal Title</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewStatus("rejected")}
                        className={`p-3 rounded-xl border text-left font-semibold transition ${
                          reviewStatus === "rejected"
                            ? "bg-rose-500/10 border-rose-500 text-rose-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <XCircle size={16} className="mb-1" />
                        <div>Reject with Reason</div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold">Official Review Note (Mandatory)</Label>
                    <Textarea
                      rows={3}
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Provide clear statutory findings for this decision..."
                      required
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubmission(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={reviewMutation.isPending}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                    >
                      {reviewMutation.isPending ? "Recording Decision..." : "Commit Statutory Decision"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Survey Mission Modal */}
        {dispatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Compass size={18} className="text-amber-400" /> Dispatch Field Survey Mission
                </div>
                <button
                  onClick={() => setDispatchModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Target Parcel</Label>
                  <Input
                    value={selectedParcel}
                    onChange={e => setSelectedParcel(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Assign to Field Surveyor</Label>
                  <select
                    value={assignedSurveyor}
                    onChange={e => setAssignedSurveyor(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                  >
                    <option value="">Select Field Surveyor...</option>
                    <option value="surveyor_clerk_01">Sunil Verma (Surveyor - Patna South)</option>
                    <option value="surveyor_clerk_02">Pooja Kumari (Drone / GNSS Specialist)</option>
                    <option value="surveyor_clerk_03">Rahul Sharma (LiDAR Operator)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Priority</Label>
                  <select
                    value={missionPriority}
                    onChange={e => setMissionPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                  >
                    <option value="HIGH">HIGH (Urgent dispute or height conflict)</option>
                    <option value="MEDIUM">MEDIUM (Standard cadastre verification)</option>
                    <option value="LOW">LOW (Routine spatial update)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Field Survey Instructions</Label>
                  <Textarea
                    rows={3}
                    value={missionInstructions}
                    onChange={e => setMissionInstructions(e.target.value)}
                    placeholder="Enter precise ground checks, GCP benchmark targets, and laser height measurements..."
                    required
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDispatchModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={dispatchMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                  >
                    <Send size={13} className="mr-1" />
                    {dispatchMutation.isPending ? "Dispatching..." : "Dispatch Mission"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
