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
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AuthorityDashboard() {
  const { user, logout } = useAuth();
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"verified" | "rejected">("verified");
  const [reviewNote, setReviewNote] = useState("");

  const utils = trpc.useUtils();
  const statsQuery = trpc.authority.stats.useQuery();
  const queueQuery = trpc.authority.verificationQueue.useQuery();
  const propertiesQuery = trpc.authority.assignedProperties.useQuery();

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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  Authority Verification Workspace
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
                  className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
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
        </header>

        {/* Content */}
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
                Awaiting authority decision
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>VERIFIED & APPROVED</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.approvedCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Extrusion & vertical rights locked
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>REJECTED SUBMISSIONS</span>
                <XCircle size={16} className="text-red-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.rejectedCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Returned with cited defect notes
              </p>
            </div>
          </div>

          {/* Verification Queue Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Verification & Evidence Review Queue
                </h2>
                <p className="text-xs text-slate-400">
                  Authority review required before vertical cadastral data advances on the evidence ladder.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => void queueQuery.refetch()}
              >
                <RefreshCw
                  size={14}
                  className={`mr-1.5 ${queueQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Record / Parcel Reference</th>
                    <th className="px-5 py-3.5">Evidence Type</th>
                    <th className="px-5 py-3.5">Source Reference</th>
                    <th className="px-5 py-3.5">Submission Notes</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {queueQuery.data && queueQuery.data.length > 0 ? (
                    queueQuery.data.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white">
                            {item.recordReference}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ID: #{item.id} · {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                            {item.submissionType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300 truncate max-w-[180px]">
                          {item.sourceReference}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-[240px] truncate">
                          {item.notes}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              item.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.status === "rejected"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-slate-700 text-xs text-cyan-400 hover:bg-slate-800"
                            onClick={() => {
                              setSelectedSubmission(item);
                              setReviewStatus(item.status === "rejected" ? "rejected" : "verified");
                              setReviewNote(item.reviewNote || "");
                            }}
                          >
                            Review & Verify
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No submissions currently in the queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Review & Verify Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ShieldCheck size={18} className="text-cyan-400" /> Review Submission #{selectedSubmission.id}
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1 text-xs">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Target Record:</span>{" "}
                    <span className="font-bold text-white">{selectedSubmission.recordReference}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Evidence Type:</span>{" "}
                    <span className="text-cyan-400 font-semibold">{selectedSubmission.submissionType}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Source:</span>{" "}
                    <span className="text-slate-300">{selectedSubmission.sourceReference}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Applicant Notes:</span>{" "}
                    <span className="text-slate-300">{selectedSubmission.notes}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Official Authority Decision *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                        reviewStatus === "verified"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                      }`}
                      onClick={() => setReviewStatus("verified")}
                    >
                      <CheckCircle2 size={16} /> Approve / Verified
                    </button>
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                        reviewStatus === "rejected"
                          ? "border-red-500 bg-red-500/10 text-red-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                      }`}
                      onClick={() => setReviewStatus("rejected")}
                    >
                      <XCircle size={16} /> Reject / Defect
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Authority Review Citation & Note *</Label>
                  <Textarea
                    placeholder="Provide official rationale, verified field survey reference, or defect explanation..."
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    required
                    className="mt-1.5 min-h-[100px] border-slate-800 bg-slate-950 text-xs text-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    This note is stored permanently in the audit trail.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
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
                    className={
                      reviewStatus === "verified"
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 font-semibold"
                        : "bg-red-600 text-white hover:bg-red-500 font-semibold"
                    }
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending ? "Submitting Decision..." : "Commit Authority Review"}
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
