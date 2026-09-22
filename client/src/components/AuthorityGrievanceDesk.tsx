import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Flame,
  Gavel,
  HelpCircle,
  MapPin,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  GrievanceCategoryMeta,
  GrievanceStatusMeta,
  type CadastralGrievance,
  type GrievanceCategory,
  type GrievanceStatus,
  type SurveyorReportData,
} from "@shared/cadastralGrievance";
import { toast } from "sonner";

interface AuthorityGrievanceDeskProps {
  onOpenMapFocus?: (ulpin: string) => void;
  onOpenSealingModal?: (grievance: CadastralGrievance) => void;
}

export function AuthorityGrievanceDesk({
  onOpenMapFocus,
  onOpenSealingModal,
}: AuthorityGrievanceDeskProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrievance, setSelectedGrievance] = useState<CadastralGrievance | null>(null);

  // Reject Modal State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Assign Surveyor Modal State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedSurveyorId, setSelectedSurveyorId] = useState("user_surveyor_demo");
  const [selectedSurveyorName, setSelectedSurveyorName] = useState("Officer Vikram Singh (Field Cadastre)");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("HIGH");
  const [targetDays, setTargetDays] = useState(3);

  const utils = trpc.useUtils();

  const { data: grievances = [], isLoading } = trpc.grievance.list.useQuery({
    limit: 100,
  });

  const { data: stats } = trpc.grievance.stats.useQuery();

  const authorityActionMutation = trpc.grievance.authorityAction.useMutation({
    onSuccess: (_, variables) => {
      utils.grievance.list.invalidate();
      utils.grievance.stats.invalidate();
      if (variables.action === "REJECT") {
        toast.success("Grievance has been formally rejected & citizen notified.");
        setIsRejectOpen(false);
        setRejectionReason("");
      } else {
        toast.success("Field survey mission successfully dispatched to officer!");
        setIsAssignOpen(false);
        setInstructions("");
      }
      setSelectedGrievance(null);
    },
    onError: err => {
      toast.error(`Action failed: ${err.message}`);
    },
  });

  const filteredGrievances = grievances.filter(g => {
    if (filterStatus !== "ALL" && g.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        g.grievanceNumber.toLowerCase().includes(q) ||
        g.ulpinOrReference.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q) ||
        (g.buildingName && g.buildingName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAssign = (g: CadastralGrievance) => {
    setSelectedGrievance(g);
    setInstructions(
      `Conduct on-site physical measurement for ${g.category.replace("_", " ")}, verify sanctioned building permit, check setback clearance, and take photo logs.`
    );
    setIsAssignOpen(true);
  };

  const handleOpenReject = (g: CadastralGrievance) => {
    setSelectedGrievance(g);
    setRejectionReason(
      "Upon spatial cadastre cross-reference and master plan review, the reported activity is within sanctioned legal zoning limits. Complaint dismissed as unfounded."
    );
    setIsRejectOpen(true);
  };

  const submitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;
    authorityActionMutation.mutate({
      grievanceId: selectedGrievance.id,
      action: "ASSIGN_SURVEYOR",
      surveyorClerkUserId: selectedSurveyorId,
      surveyorName: selectedSurveyorName,
      instructions: instructions.trim(),
      priority,
      targetInspectionDays: targetDays,
    });
  };

  const submitReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance || rejectionReason.trim().length < 5) {
      toast.error("Rejection memo must be at least 5 characters.");
      return;
    }
    authorityActionMutation.mutate({
      grievanceId: selectedGrievance.id,
      action: "REJECT",
      rejectionReason: rejectionReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Total Reports</span>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {stats?.totalGrievances ?? grievances.length}
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-amber-500/30 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-amber-300 uppercase">Needs Triage</span>
          <div className="text-xl font-bold font-mono text-amber-400">
            {stats?.submittedPendingTriage ?? 0}
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-yellow-500/30 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-yellow-300 uppercase">Survey In-Progress</span>
          <div className="text-xl font-bold font-mono text-yellow-400">
            {stats?.surveyorAssigned ?? 0}
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-purple-500/30 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-purple-300 uppercase">Field Verified</span>
          <div className="text-xl font-bold font-mono text-purple-400">
            {stats?.fieldVerified ?? 0}
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-rose-500/40 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-rose-300 uppercase">Sealed Properties</span>
          <div className="text-xl font-bold font-mono text-rose-400">
            {stats?.sealedProperties ?? 0}
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-emerald-300 uppercase">Resolved</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {stats?.resolvedClosed ?? 0}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900/95 border border-slate-800 rounded-2xl">
        <div className="flex flex-wrap gap-1.5 items-center">
          {[
            { id: "ALL", label: "All Cases" },
            { id: "SUBMITTED", label: "Pending Triage" },
            { id: "SURVEYOR_ASSIGNED", label: "Survey Assigned" },
            { id: "FIELD_VERIFIED", label: "Field Verified" },
            { id: "SEALED", label: "Sealed" },
            { id: "REJECTED", label: "Rejected" },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === tab.id
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ULPIN or title..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Grievance Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading cases...</div>
        ) : filteredGrievances.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No grievances found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Case / Reference</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Target Building / ULPIN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredGrievances.map(g => {
                  const statusInfo = GrievanceStatusMeta[g.status as GrievanceStatus] || GrievanceStatusMeta.SUBMITTED;
                  const catInfo = GrievanceCategoryMeta[g.category as GrievanceCategory] || GrievanceCategoryMeta.OTHER;
                  const isPendingTriage = g.status === "SUBMITTED";
                  const isFieldVerified = g.status === "FIELD_VERIFIED";

                  return (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-cyan-300">
                          #{g.grievanceNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(g.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${catInfo.badgeColor}25`, color: catInfo.badgeColor, border: `1px solid ${catInfo.badgeColor}40` }}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-100 max-w-[200px] truncate">
                          {g.buildingName || g.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {g.ulpinOrReference}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}40` }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div>{g.citizenName || "Anonymous"}</div>
                        {g.citizenContact && <div className="text-[10px] text-slate-400">{g.citizenContact}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenMapFocus && (
                            <button
                              type="button"
                              onClick={() => onOpenMapFocus(g.ulpinOrReference)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                              title="Inspect on 3D Map"
                            >
                              <Eye size={14} />
                            </button>
                          )}

                          {isPendingTriage && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(g)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-bold border border-rose-500/40 transition-colors"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAssign(g)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[11px] font-bold shadow-sm shadow-amber-500/20 transition-all flex items-center gap-1"
                              >
                                <Send size={12} /> Assign Surveyor
                              </button>
                            </>
                          )}

                          {isFieldVerified && onOpenSealingModal && (
                            <button
                              type="button"
                              onClick={() => onOpenSealingModal(g)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-md shadow-rose-600/30 transition-all flex items-center gap-1"
                            >
                              <Gavel size={12} /> Execute Order / Seal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Surveyor Modal */}
      {isAssignOpen && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-cyan-300">
                <Send size={18} /> Dispatch Field Surveyor Mission
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitAssign} className="space-y-3.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Target Cadastral Record</span>
                <div className="text-xs font-bold text-slate-200">
                  #{selectedGrievance.grievanceNumber} · {selectedGrievance.ulpinOrReference}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign Field Surveyor Officer *
                </label>
                <select
                  value={selectedSurveyorId}
                  onChange={e => {
                    setSelectedSurveyorId(e.target.value);
                    setSelectedSurveyorName(
                      e.target.value === "user_surveyor_demo"
                        ? "Officer Vikram Singh (Field Cadastre)"
                        : "Officer Sunita Roy (Patna Survey Division)"
                    );
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="user_surveyor_demo">Officer Vikram Singh (Field Cadastre - Patna)</option>
                  <option value="user_surveyor_patna_2">Officer Sunita Roy (Survey Division 2)</option>
                  <option value="user_surveyor_field_3">Surveyor Alok Verma (GNSS / RTK Squad)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mission Priority & Deadline
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="HIGH">HIGH (24-48 Hours)</option>
                    <option value="MEDIUM">MEDIUM (3-5 Days)</option>
                    <option value="LOW">LOW (Standard Audit)</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={targetDays}
                    onChange={e => setTargetDays(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="Inspection Days"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Survey & Field Audit Instructions *
                </label>
                <textarea
                  required
                  rows={3}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authorityActionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  {authorityActionMutation.isPending ? "Dispatching..." : "Dispatch Mission to Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-rose-400">
                <AlertOctagon size={18} /> Reject Grievance / Dismiss Complaint
              </h3>
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReject} className="space-y-3.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Target Case</span>
                <div className="text-xs font-bold text-slate-200">
                  #{selectedGrievance.grievanceNumber} · {selectedGrievance.title}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-300 mb-1">
                  Statutory Rejection Memo / Reason *
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Provide legal or cadastral justification for dismissing this complaint..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authorityActionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  {authorityActionMutation.isPending ? "Rejecting..." : "Confirm Formal Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
