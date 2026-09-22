import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Flame,
  Gavel,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  GrievanceCategoryMeta,
  GrievanceStatusMeta,
  type EnforcementActionData,
  type GrievanceCategory,
  type GrievanceStatus,
  type SurveyorReportData,
} from "@shared/cadastralGrievance";

interface GrievanceTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGrievanceId?: string | number;
}

export function GrievanceTrackerModal({
  isOpen,
  onClose,
  initialGrievanceId = "",
}: GrievanceTrackerModalProps) {
  const [searchQuery, setSearchQuery] = useState(String(initialGrievanceId || ""));
  const [activeQuery, setActiveQuery] = useState(String(initialGrievanceId || ""));

  const { data: grievance, isLoading, isError } = trpc.grievance.getById.useQuery(
    { idOrNumber: activeQuery },
    { enabled: Boolean(activeQuery.trim()) }
  );

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const statusMeta = grievance
    ? GrievanceStatusMeta[grievance.status as GrievanceStatus] || GrievanceStatusMeta.SUBMITTED
    : null;

  const categoryMeta = grievance
    ? GrievanceCategoryMeta[grievance.category as GrievanceCategory] || GrievanceCategoryMeta.OTHER
    : null;

  let surveyorReport: SurveyorReportData | null = null;
  if (grievance?.surveyorReport) {
    try {
      surveyorReport = JSON.parse(grievance.surveyorReport);
    } catch {
      // ignore
    }
  }

  let enforcementAction: EnforcementActionData | null = null;
  if (grievance?.enforcementAction) {
    try {
      enforcementAction = JSON.parse(grievance.enforcementAction);
    } catch {
      // ignore
    }
  }

  let photos: string[] = [];
  if (grievance?.evidencePhotos) {
    try {
      photos = JSON.parse(grievance.evidencePhotos);
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Live Grievance & Cadastral Dispute Tracker
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  Government Transparancy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track real-time authority triage, field surveyor verification, and sealing orders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter Grievance Number (e.g. GRV-2026-PAT-1001) or ULPIN..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              Track Status
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <div className="text-xs">Fetching official grievance record from municipal ledger...</div>
            </div>
          ) : !grievance ? (
            <div className="py-16 text-center space-y-3 text-slate-400">
              <ShieldAlert size={36} className="mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-300">
                {activeQuery ? "No matching grievance found for this reference ID." : "Enter a Grievance Reference ID above to track live status."}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Reference numbers are formatted as GRV-2026-PAT-XXXX. You can also view active grievances in the Authority or Admin Dashboards.
              </p>
            </div>
          ) : (
            <>
              {/* Grievance Summary Banner */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono font-extrabold text-cyan-300 tracking-wider">
                        #{grievance.grievanceNumber}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: statusMeta?.bg,
                          color: statusMeta?.color,
                          border: `1px solid ${statusMeta?.color}40`,
                        }}
                      >
                        {statusMeta?.label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">
                      {grievance.title}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Target Cadastral ULPIN
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-200">
                      {grievance.ulpinOrReference}
                    </span>
                  </div>
                </div>

                {/* Details & Meta Grid */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  {grievance.details}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Category</span>
                    <span className="font-semibold text-slate-200">{categoryMeta?.label}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Filed On</span>
                    <span className="font-semibold text-slate-200">
                      {new Date(grievance.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Reporter</span>
                    <span className="font-semibold text-slate-200">{grievance.citizenName || "Anonymous"}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Priority</span>
                    <span className="font-semibold text-amber-400">{grievance.priority || "MEDIUM"}</span>
                  </div>
                </div>

                {/* Photos */}
                {photos.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <ImageIcon size={12} className="text-cyan-400" /> Attached Evidence Photos ({photos.length})
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {photos.map((photo, i) => (
                        <div
                          key={i}
                          className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-950"
                        >
                          <img
                            src={photo}
                            alt="Evidence"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Timeline Stepper */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                  <Clock size={14} /> Official Lifecycle & Investigation Timeline
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {/* Step 1: Submission */}
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Step 1: Citizen Grievance Filed
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(grievance.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Complaint registered under reference #{grievance.grievanceNumber} and dispatched to Municipal Triage Desk.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Authority Triage or Rejection */}
                  {grievance.status === "REJECTED" ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500 flex items-center justify-center text-[10px] font-bold">
                        ✕
                      </div>
                      <div className="bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300">
                            Step 2: Rejected by Authority (False / Invalid)
                          </span>
                          <span className="text-[10px] text-rose-400 font-mono">
                            {grievance.rejectedAt ? new Date(grievance.rejectedAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-200 font-medium">
                          Statutory Rejection Memo: {grievance.rejectionReason}
                        </p>
                      </div>
                    </div>
                  ) : grievance.assignedSurveyorClerkUserId || grievance.dispatchedAt ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300">
                            Step 2: Field Surveyor Dispatched
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {grievance.dispatchedAt ? new Date(grievance.dispatchedAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <div>
                            <span className="text-slate-400">Assigned Officer: </span>
                            <span className="font-semibold text-slate-100">{grievance.assignedSurveyorName || grievance.assignedSurveyorClerkUserId}</span>
                          </div>
                          {grievance.dispatchInstructions && (
                            <div className="text-slate-400 italic">
                              "{grievance.dispatchInstructions}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative opacity-60">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-[10px] font-bold">
                        2
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-semibold text-slate-400">
                          Step 2: Authority Triage Pending...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Field Verification */}
                  {surveyorReport ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-purple-500/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-300">
                            Step 3: On-Site Field Audit Findings Submitted
                          </span>
                          <span className="text-[10px] text-purple-300 font-mono">
                            {new Date(surveyorReport.submittedAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 bg-slate-900 rounded-lg">
                            <span className="text-slate-400 block text-[9px]">Measured Height</span>
                            <span className="font-bold text-amber-300">
                              {surveyorReport.actualHeightMetres ? `${surveyorReport.actualHeightMetres} m` : "Not verified"}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-900 rounded-lg">
                            <span className="text-slate-400 block text-[9px]">Measured Floors</span>
                            <span className="font-bold text-amber-300">
                              {surveyorReport.actualFloors ? `${surveyorReport.actualFloors} Floors` : "Not verified"}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-900 rounded-lg">
                            <span className="text-slate-400 block text-[9px]">Fire Safety</span>
                            <span className={`font-bold ${surveyorReport.fireSafetyClearance === "PASSED" ? "text-emerald-400" : "text-rose-400"}`}>
                              {surveyorReport.fireSafetyClearance}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-900 rounded-lg">
                            <span className="text-slate-400 block text-[9px]">Surveyor Finding</span>
                            <span className="font-bold text-rose-400">
                              {surveyorReport.verdict}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-300 bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-semibold">Surveyor Remarks: </span>
                          {surveyorReport.remarks}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative opacity-60">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-[10px] font-bold">
                        3
                      </div>
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-semibold text-slate-400">
                          Step 3: On-Site Field Audit in Progress...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Executive Enforcement / Sealing Order */}
                  {enforcementAction ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500 flex items-center justify-center text-[10px] font-bold">
                        ⚡
                      </div>
                      <div className="bg-rose-950/50 p-4 rounded-xl border-2 border-rose-500 shadow-xl shadow-rose-950/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gavel size={18} className="text-rose-400" />
                            <span className="text-sm font-extrabold text-rose-200 uppercase tracking-wide">
                              Executive Municipal Order: {enforcementAction.actionType.replace("_", " ")}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                            #{enforcementAction.orderNumber}
                          </span>
                        </div>

                        <p className="text-xs text-rose-100 font-medium leading-relaxed bg-black/40 p-3 rounded-lg border border-rose-800/60">
                          {enforcementAction.legalNoticeText}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-200">
                          <div>
                            <span className="text-rose-300/80">Issued By: </span>
                            <span className="font-bold">{enforcementAction.issuedByName} ({enforcementAction.issuedByRole})</span>
                          </div>
                          {enforcementAction.fineAmountInr && (
                            <div className="font-bold text-amber-300">
                              Fine Imposed: ₹{enforcementAction.fineAmountInr.toLocaleString()}
                            </div>
                          )}
                          <div className="text-[10px] text-rose-300 font-mono">
                            Executed: {new Date(enforcementAction.executedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : grievance.status === "RESOLVED" ? (
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-500/40 space-y-1">
                        <span className="text-xs font-bold text-emerald-300">
                          Step 4: Grievance Resolved & Closed (Compliant)
                        </span>
                        <p className="text-[11px] text-slate-300">
                          The property was verified to be fully compliant with municipal bylaws, or necessary structural rectifications were completed.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
