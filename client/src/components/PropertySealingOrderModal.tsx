import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck,
  FileText,
  Flame,
  Gavel,
  Lock,
  MapPin,
  Scale,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type {
  CadastralGrievance,
  SurveyorReportData,
} from "@shared/cadastralGrievance";
import { toast } from "sonner";

interface PropertySealingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  grievance: CadastralGrievance | null;
  onOrderExecuted?: () => void;
}

export function PropertySealingOrderModal({
  isOpen,
  onClose,
  grievance,
  onOrderExecuted,
}: PropertySealingOrderModalProps) {
  const [actionType, setActionType] = useState<
    "SEAL_PROPERTY" | "DEMOLITION_ORDER" | "PENALTY" | "CLEARED" | "RE_SURVEY"
  >("SEAL_PROPERTY");
  const [fineAmount, setFineAmount] = useState<string>("250000");
  const [legalNoticeText, setLegalNoticeText] = useState<string>(
    "Under Section 314 of Bihar Municipal Corporation Act & State Urban Planning Bylaws, this premises is hereby ORDERED IMMEDIATELY SEALED. All commercial, residential, and construction activities are suspended with immediate effect. Unauthorized entry or tampering with official seals will attract immediate penal prosecution."
  );

  const utils = trpc.useUtils();

  const enforcementMutation = trpc.grievance.adminEnforcement.useMutation({
    onSuccess: (_, variables) => {
      utils.grievance.list.invalidate();
      utils.grievance.stats.invalidate();
      const actionName =
        variables.actionType === "SEAL_PROPERTY"
          ? "PROPERTY SEALED"
          : variables.actionType === "DEMOLITION_ORDER"
            ? "DEMOLITION NOTICE ISSUED"
            : "ENFORCEMENT ORDER EXECUTED";
      toast.success(`${actionName} successfully registered on 3D Cadastre & Municipal Ledger!`);
      onOrderExecuted?.();
      onClose();
    },
    onError: err => {
      toast.error(`Enforcement execution failed: ${err.message}`);
    },
  });

  if (!isOpen || !grievance) return null;

  let surveyorReport: SurveyorReportData | null = null;
  if (grievance.surveyorReport) {
    try {
      surveyorReport = JSON.parse(grievance.surveyorReport);
    } catch {
      // ignore
    }
  }

  const handleActionChange = (
    type: "SEAL_PROPERTY" | "DEMOLITION_ORDER" | "PENALTY" | "CLEARED" | "RE_SURVEY"
  ) => {
    setActionType(type);
    if (type === "SEAL_PROPERTY") {
      setLegalNoticeText(
        "Under Section 314 of Bihar Municipal Corporation Act & State Urban Planning Bylaws, this premises is hereby ORDERED IMMEDIATELY SEALED. All commercial, residential, and construction activities are suspended with immediate effect. Unauthorized entry or tampering with official seals will attract immediate penal prosecution."
      );
      setFineAmount("250000");
    } else if (type === "DEMOLITION_ORDER") {
      setLegalNoticeText(
        "Under Section 317 of Municipal Bylaws, notice is hereby served to the registered owner to remove/demolish the unauthorized structural deviations within 15 days, failing which the municipal demolition squad will execute structural razing at the owner's expense."
      );
      setFineAmount("500000");
    } else if (type === "PENALTY") {
      setLegalNoticeText(
        "Compounding penalty levied for minor floor height / setback deviation. The registered owner is directed to deposit the fine within 30 statutory days."
      );
      setFineAmount("100000");
    } else if (type === "CLEARED") {
      setLegalNoticeText(
        "Following field surveyor verification and inspection of municipal records, the grievance is found non-actionable or rectified. The property is cleared as compliant."
      );
      setFineAmount("");
    } else {
      setLegalNoticeText(
        "A senior survey squad is ordered to re-demarcate boundary pillars and recalculate volumetric parcel boundaries."
      );
      setFineAmount("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (legalNoticeText.trim().length < 5) {
      toast.error("Legal notice text must be at least 5 characters.");
      return;
    }

    enforcementMutation.mutate({
      grievanceId: grievance.id,
      actionType,
      fineAmountInr: fineAmount ? parseFloat(fineAmount) : null,
      legalNoticeText: legalNoticeText.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Gavel size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Executive Cadastral Enforcement & Sealing Order
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                  Super Admin / Magistrate
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Execute statutory property sealing, demolition orders, or compounding penalties
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Target Summary */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-cyan-300">
                Case #{grievance.grievanceNumber}
              </span>
              <span className="font-mono text-slate-300">
                ULPIN: {grievance.ulpinOrReference}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {grievance.buildingName || grievance.title}
            </div>
          </div>

          {/* Surveyor Findings Review */}
          {surveyorReport && (
            <div className="p-3.5 bg-purple-950/40 rounded-xl border border-purple-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <FileCheck size={14} /> Field Surveyor Verified Audit Findings:
                </span>
                <span className="text-rose-400 font-extrabold uppercase text-[10px]">
                  {surveyorReport.verdict}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Measured Height</span>
                  <span className="font-bold text-amber-300">
                    {surveyorReport.actualHeightMetres ? `${surveyorReport.actualHeightMetres} m` : "N/A"}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Measured Floors</span>
                  <span className="font-bold text-amber-300">
                    {surveyorReport.actualFloors ? `${surveyorReport.actualFloors} Floors` : "N/A"}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Fire Safety</span>
                  <span className={`font-bold ${surveyorReport.fireSafetyClearance === "PASSED" ? "text-emerald-400" : "text-rose-400"}`}>
                    {surveyorReport.fireSafetyClearance}
                  </span>
                </div>
                <div className="p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">Encroachment</span>
                  <span className="font-bold text-amber-300">
                    {surveyorReport.setbackEncroachmentMetres ? `${surveyorReport.setbackEncroachmentMetres} m` : "0 m"}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 italic">
                "{surveyorReport.remarks}"
              </p>
            </div>
          )}

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
              Select Executive Enforcement Action *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "SEAL_PROPERTY",
                  label: "🔒 SEAL PROPERTY",
                  desc: "Locks property on 3D map & issues seal order",
                  color: "#ef4444",
                },
                {
                  id: "DEMOLITION_ORDER",
                  label: "⚠️ DEMOLITION NOTICE",
                  desc: "Orders municipal structural razing squad",
                  color: "#ea580c",
                },
                {
                  id: "PENALTY",
                  label: "💰 LEVY STATUTORY FINE",
                  desc: "Imposes municipal compounding penalty",
                  color: "#eab308",
                },
                {
                  id: "CLEARED",
                  label: "✅ RESOLVE & CLEAR",
                  desc: "Marks compliant and closes grievance",
                  color: "#22c55e",
                },
                {
                  id: "RE_SURVEY",
                  label: "🔄 ORDER RE-SURVEY",
                  desc: "Re-demarcation by senior survey team",
                  color: "#38bdf8",
                },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleActionChange(item.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    actionType === item.id
                      ? "bg-rose-950/80 border-rose-400 text-slate-100 ring-1 ring-rose-400 shadow-md shadow-rose-950/50"
                      : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="text-xs font-bold" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fine Amount (if penalty or sealing) */}
          {(actionType === "SEAL_PROPERTY" || actionType === "PENALTY" || actionType === "DEMOLITION_ORDER") && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Statutory Municipal Fine / Compounding Amount (INR ₹)
              </label>
              <input
                type="number"
                value={fineAmount}
                onChange={e => setFineAmount(e.target.value)}
                placeholder="e.g. 250000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-400"
              />
            </div>
          )}

          {/* Legal Notice Text */}
          <div>
            <label className="block text-xs font-semibold text-rose-300 mb-1">
              Official Statutory Order Text & Legal Notice *
            </label>
            <textarea
              required
              rows={4}
              value={legalNoticeText}
              onChange={e => setLegalNoticeText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-400 resize-none font-sans"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={enforcementMutation.isPending}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
            >
              <Gavel size={14} />
              {enforcementMutation.isPending ? "Executing Order..." : "Sign & Execute Official Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
