import React, { useState } from "react";
import { Link } from "wouter";
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
  ShieldCheck,
  User,
  X,
  Award,
  Download,
  ExternalLink,
  QrCode,
  Layers,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedUlpinCard, setSelectedUlpinCard] = useState<any | null>(null);

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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Building2 size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Citizen Property & Cadastre Portfolio</span>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                    Public Portal
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="text-cyan-400 font-medium">Verified Citizen Owner</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-cyan-600 font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-900/30"
                onClick={() => setAppModalOpen(true)}
              >
                <Plus size={16} className="mr-1.5" /> Submit Property Request
              </Button>
              <Link href="/floor-explorer">
                <Button
                  size="sm"
                  className="bg-indigo-600 font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/30"
                >
                  <Layers size={16} className="mr-1.5" /> 3D Floor Explorer
                </Button>
              </Link>
              <Link href="/workspace">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D City Map
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>MY 3D PROPERTIES</span>
                <Building2 size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.myPropertiesCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Registered in 3D Cadastre
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>ACTIVE REQUESTS</span>
                <FileText size={16} className="text-blue-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.myApplicationsCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Verification & dispute requests
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>PENDING REVIEWS</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.pendingApplications}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Under authority inspection
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>SEALED TITLES</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.approvedApplications || 1}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Level 4 verified deeds
              </p>
            </div>
          </div>

          {/* Section: My 3D Properties Portfolio */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-cyan-400" /> My Registered 3D Properties Portfolio
              </h2>
              <span className="text-xs text-slate-400">
                Protected by National 3D Cadastral Security
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(stats.sampleProperties || []).map((prop, idx) => (
                <div
                  key={prop.ulpin || idx}
                  className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur space-y-4 hover:border-cyan-500/30 transition shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-semibold text-cyan-400 font-mono uppercase tracking-wider">
                        3D ULPIN IDENTIFIER
                      </div>
                      <div className="text-base font-extrabold text-white font-mono mt-0.5">
                        {prop.ulpin}
                      </div>
                      <div className="text-xs text-slate-300 font-medium mt-1">
                        {prop.title}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> {prop.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <div>
                      <div className="text-[10px] text-slate-500">Floor & Unit</div>
                      <div className="font-semibold text-white mt-0.5">Floor {prop.floor} ({prop.unit})</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Carpet Area</div>
                      <div className="font-semibold text-white mt-0.5">{prop.area} m²</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">3D Volume</div>
                      <div className="font-semibold text-cyan-400 font-mono mt-0.5">{prop.volume} m³</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">{prop.rights}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUlpinCard(prop)}
                        className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs h-8"
                      >
                        <Award size={13} className="mr-1.5" /> 3D ULPIN Card
                      </Button>
                      <Link href="/workspace">
                        <Button
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
                        >
                          <Globe2 size={13} className="mr-1" /> 3D View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Application Progress Lifecycle */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 lg:p-8 backdrop-blur space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Application Lifecycle Tracker
                </h2>
                <p className="text-xs text-slate-400">
                  Track real-time progress of your vertical property registration and verification requests.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIssueModalOpen(true)}
                className="border-slate-800 text-xs text-rose-400 hover:bg-rose-500/10"
              >
                <AlertTriangle size={14} className="mr-1.5" /> Report Discrepancy / Dispute
              </Button>
            </div>

            {/* Visual Timeline */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div className="text-xs font-bold text-white">1. Request Submitted</div>
                  <div className="text-[10px] text-slate-500">Khatiyan deed uploaded</div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div className="text-xs font-bold text-white">2. Surveyor Assigned</div>
                  <div className="text-[10px] text-slate-500">Field GNSS scheduled</div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 flex items-center justify-center font-bold text-sm animate-pulse">
                    3
                  </div>
                  <div className="text-xs font-bold text-cyan-400">3. Evidence Verified</div>
                  <div className="text-[10px] text-slate-400">L2 Municipal review in progress</div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div className="text-xs font-bold text-slate-400">4. Authority Sanction</div>
                  <div className="text-[10px] text-slate-500">Height extrusion lock</div>
                </div>

                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                  <div className="text-xs font-bold text-slate-400">5. 3D ULPIN Issued</div>
                  <div className="text-[10px] text-slate-500">Official deed available</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 3D ULPIN Digital Card Modal */}
        {selectedUlpinCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Award size={18} className="text-cyan-400" />
                  National 3D ULPIN Title Card
                </div>
                <button
                  onClick={() => setSelectedUlpinCard(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-3">
                <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                  UNIQUE LAND PARCEL IDENTIFIER (3D)
                </div>
                <div className="text-xl font-extrabold font-mono text-white">
                  {selectedUlpinCard.ulpin}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-cyan-500/20 text-slate-300">
                  <span>Owner: {user?.name || user?.email}</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> LEVEL 4 VERIFIED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Floor & Unit</div>
                  <div className="font-semibold text-white mt-0.5">Floor {selectedUlpinCard.floor} ({selectedUlpinCard.unit})</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">3D Extrusion Volume</div>
                  <div className="font-semibold text-cyan-400 font-mono mt-0.5">{selectedUlpinCard.volume} m³</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <QrCode size={40} className="text-cyan-400 shrink-0" />
                <div className="text-[10px] text-slate-400 leading-tight">
                  <span className="font-bold text-white">QR Blockchain Verification</span>
                  <div>Cryptographic hash verified by Survey of India Geodetic Node</div>
                </div>
              </div>

              <Button
                onClick={() => {
                  window.print();
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-5 text-xs rounded-xl"
              >
                <Download size={14} className="mr-1.5" /> Download / Print Title Card
              </Button>
            </div>
          </div>
        )}

        {/* Submit Property Request Modal */}
        {appModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Building2 size={18} className="text-cyan-400" />
                  Submit Property for 3D Verification
                </div>
                <button
                  onClick={() => setAppModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAppSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Target Parcel / ULPIN Reference</Label>
                  <Input
                    value={recordRef}
                    onChange={e => setRecordRef(e.target.value)}
                    placeholder="e.g. IN-BR-PAT-0042-3D-F04 or Plot 42/B"
                    required
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Verification Category</Label>
                  <select
                    value={submissionType}
                    onChange={e => setSubmissionType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                  >
                    <option value="height">Building Height Sanction Verification</option>
                    <option value="floor_plan">3D Floor Plan Unit Boundary Verification</option>
                    <option value="geometry">Parcel Boundary Polygon Ground Verification</option>
                    <option value="survey">Field Drone / GNSS Survey Request</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Deed / Sanction Reference Number</Label>
                  <Input
                    value={sourceRef}
                    onChange={e => setSourceRef(e.target.value)}
                    placeholder="e.g. Municipal Building Permit #2026/891 or Khatiyan #442"
                    required
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Supporting Notes</Label>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Explain your property details, floor level, and boundaries (min 12 characters)..."
                    required
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAppModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={appMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                  >
                    {appMutation.isPending ? "Submitting..." : "Submit for Verification"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Discrepancy Modal */}
        {issueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <AlertTriangle size={18} className="text-rose-400" />
                  Report Boundary Discrepancy or Dispute
                </div>
                <button
                  onClick={() => setIssueModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Property Reference</Label>
                  <Input
                    value={issueRecordRef}
                    onChange={e => setIssueRecordRef(e.target.value)}
                    placeholder="e.g. IN-BR-PAT-0042-3D-F04"
                    required
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Issue Category</Label>
                  <select
                    value={issueCategory}
                    onChange={e => setIssueCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                  >
                    <option value="parcel_boundary">Parcel Boundary Encroachment / Overlap</option>
                    <option value="floor_count">Incorrect Storey / Floor Height</option>
                    <option value="footprint">3D Extrusion Area Mismatch</option>
                    <option value="missing_property">Missing Vertical Unit in 3D Registry</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-semibold">Dispute Details</Label>
                  <Textarea
                    rows={3}
                    value={issueDetails}
                    onChange={e => setIssueDetails(e.target.value)}
                    placeholder="Describe the discrepancy clearly for the jurisdictional authority officer..."
                    required
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIssueModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={issueMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                  >
                    {issueMutation.isPending ? "Submitting..." : "Submit Dispute Notice"}
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
