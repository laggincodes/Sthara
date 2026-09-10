import { useAuth } from "@/_core/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  FileWarning,
  Globe2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  // Application form
  const [recordRef, setRecordRef] = useState("");
  const [submissionType, setSubmissionType] = useState<
    "geometry" | "height" | "floor_count" | "floor_plan" | "survey"
  >("height");
  const [sourceRef, setSourceRef] = useState("");
  const [notes, setNotes] = useState("");

  // Issue report form
  const [issueRecordRef, setIssueRecordRef] = useState("");
  const [issueCategory, setIssueCategory] = useState<
    "footprint" | "floor_count" | "location" | "missing_property" | "parcel_boundary"
  >("footprint");
  const [issueDetails, setIssueDetails] = useState("");

  const utils = trpc.useUtils();
  const statsQuery = trpc.citizen.stats.useQuery();

  const appMutation = trpc.citizen.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Property verification request submitted successfully!");
      setAppModalOpen(false);
      setRecordRef("");
      setSourceRef("");
      setNotes("");
      void utils.citizen.stats.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to submit request"),
  });

  const issueMutation = trpc.citizen.reportIssue.useMutation({
    onSuccess: () => {
      toast.success("Correction/Issue report submitted to authorities!");
      setIssueModalOpen(false);
      setIssueRecordRef("");
      setIssueDetails("");
      void utils.citizen.stats.invalidate();
    },
    onError: err => toast.error(err.message || "Failed to submit issue report"),
  });

  const handleAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordRef.trim() || !sourceRef.trim() || notes.trim().length < 12) {
      toast.error(
        "Please provide all required details (notes must be at least 12 characters)."
      );
      return;
    }
    appMutation.mutate({
      recordReference: recordRef.trim(),
      submissionType,
      sourceReference: sourceRef.trim(),
      notes: notes.trim(),
    });
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueRecordRef.trim() || issueDetails.trim().length < 12) {
      toast.error(
        "Please provide all required details (details must be at least 12 characters)."
      );
      return;
    }
    issueMutation.mutate({
      recordReference: issueRecordRef.trim(),
      category: issueCategory,
      details: issueDetails.trim(),
    });
  };

  const stats = statsQuery.data ?? {
    myPropertiesCount: 0,
    myApplicationsCount: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    mySubmissions: [],
    myIssueReports: [],
    sampleProperties: [],
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        {/* Header */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Building2 size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  Citizen Property & Cadastre Dashboard
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="text-cyan-400 font-medium">Public Portal</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500"
                onClick={() => setAppModalOpen(true)}
              >
                <Plus size={16} className="mr-1.5" /> Submit Property Request
              </Button>
              <Link href="/workspace">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D City Explorer
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>MY SUBMISSIONS & REQUESTS</span>
                <FileText size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.myApplicationsCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Total verification and correction requests
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>IN AUTHORITY REVIEW</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.pendingApplications}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Assigned to department verification officers
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>VERIFIED PROPERTIES</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.approvedApplications}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Official vertical ULPIN & height status granted
              </p>
            </div>
          </div>

          {/* Submissions & Issue Reports List */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* My Property Verification Requests */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white tracking-tight">
                  My Verification Requests ({stats.mySubmissions.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-cyan-400"
                  onClick={() => setAppModalOpen(true)}
                >
                  + New Request
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {stats.mySubmissions && stats.mySubmissions.length > 0 ? (
                  stats.mySubmissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{sub.recordReference}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            sub.status === "verified"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : sub.status === "rejected"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {sub.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">Evidence Type:</span> {sub.submissionType}
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500">Source Reference:</span> {sub.sourceReference}
                      </div>
                      {sub.reviewNote && (
                        <div className="rounded bg-slate-900 p-2 text-[11px] text-cyan-300">
                          <span className="font-semibold text-slate-400">Authority Note:</span> {sub.reviewNote}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No verification requests submitted yet.
                  </div>
                )}
              </div>
            </div>

            {/* My Reported Issues */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white tracking-tight">
                  My Cadastral Correction Reports ({stats.myIssueReports.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-amber-400"
                  onClick={() => setIssueModalOpen(true)}
                >
                  + Report Issue
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {stats.myIssueReports && stats.myIssueReports.length > 0 ? (
                  stats.myIssueReports.map((issue: any) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{issue.recordReference}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          {issue.category}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs">{issue.details}</p>
                      <div className="text-[10px] text-slate-500">
                        Reported: {new Date(issue.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No correction reports submitted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Submit Application Modal */}
        {appModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <FileCheck size={18} className="text-cyan-400" /> Submit Property Request
                </div>
                <button
                  onClick={() => setAppModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAppSubmit} className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Property / ULPIN / Parcel Ref *</Label>
                  <Input
                    placeholder="e.g. ULPIN-PAT-108 / Plot 808"
                    value={recordRef}
                    onChange={e => setRecordRef(e.target.value)}
                    required
                    className="mt-1 border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Request Type</Label>
                  <select
                    value={submissionType}
                    onChange={e => setSubmissionType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-semibold text-white"
                  >
                    <option value="height">Height & Elevation Verification</option>
                    <option value="floor_count">Floor Count & Vertical Extrusion</option>
                    <option value="floor_plan">Floor Plan & Unit Boundary Review</option>
                    <option value="geometry">Parcel Boundary Alignment</option>
                    <option value="survey">Ground Survey Submission</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Authority Document Reference / Citation *</Label>
                  <Input
                    placeholder="e.g. Registry Deed #2024/PAT/8912 or Sanctioned Plan"
                    value={sourceRef}
                    onChange={e => setSourceRef(e.target.value)}
                    required
                    className="mt-1 border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Applicant Notes / Explanation *</Label>
                  <Textarea
                    placeholder="Explain the correction or verification requested in detail..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    required
                    className="mt-1 min-h-[90px] border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAppModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-cyan-600 text-white hover:bg-cyan-500 font-semibold"
                    disabled={appMutation.isPending}
                  >
                    {appMutation.isPending ? "Submitting..." : "Submit to Authority"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submit Issue Report Modal */}
        {issueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <FileWarning size={18} className="text-amber-400" /> Report Cadastral Discrepancy
                </div>
                <button
                  onClick={() => setIssueModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleIssueSubmit} className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Record / Location Reference *</Label>
                  <Input
                    placeholder="e.g. Block 4, IIT Patna Campus or Plot 102"
                    value={issueRecordRef}
                    onChange={e => setIssueRecordRef(e.target.value)}
                    required
                    className="mt-1 border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Issue Category</Label>
                  <select
                    value={issueCategory}
                    onChange={e => setIssueCategory(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs font-semibold text-white"
                  >
                    <option value="footprint">Incorrect Building Footprint</option>
                    <option value="floor_count">Mismatch in Floor Count</option>
                    <option value="location">Incorrect Geo-location / Offset</option>
                    <option value="parcel_boundary">Parcel Boundary Discrepancy</option>
                    <option value="missing_property">Missing Building / Vertical Structure</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Discrepancy Details *</Label>
                  <Textarea
                    placeholder="Describe the discrepancy observed on the 3D map..."
                    value={issueDetails}
                    onChange={e => setIssueDetails(e.target.value)}
                    required
                    className="mt-1 min-h-[90px] border-slate-800 bg-slate-950 text-xs text-white"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIssueModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-amber-600 text-white hover:bg-amber-500 font-semibold"
                    disabled={issueMutation.isPending}
                  >
                    {issueMutation.isPending ? "Submitting..." : "Submit Correction Report"}
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
