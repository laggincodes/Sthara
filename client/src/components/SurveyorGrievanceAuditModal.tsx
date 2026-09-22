import { useState, useRef } from "react";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  FileCheck,
  Flame,
  MapPin,
  Scaling,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { CadastralGrievance } from "@shared/cadastralGrievance";
import { toast } from "sonner";

interface SurveyorGrievanceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  grievance: CadastralGrievance | null;
  onAuditSubmitted?: () => void;
}

export function SurveyorGrievanceAuditModal({
  isOpen,
  onClose,
  grievance,
  onAuditSubmitted,
}: SurveyorGrievanceAuditModalProps) {
  const [actualHeight, setActualHeight] = useState<string>("");
  const [approvedHeight, setApprovedHeight] = useState<string>("");
  const [actualFloors, setActualFloors] = useState<string>("");
  const [approvedFloors, setApprovedFloors] = useState<string>("");
  const [fireSafety, setFireSafety] = useState<"PASSED" | "FAILED" | "NOT_APPLICABLE">("PASSED");
  const [setbackEncroachment, setSetbackEncroachment] = useState<string>("");
  const [verdict, setVerdict] = useState<"VIOLATION_CONFIRMED" | "COMPLIANT_NO_VIOLATION" | "RE_SURVEY_RECOMMENDED">("VIOLATION_CONFIRMED");
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const submitReportMutation = trpc.grievance.surveyorSubmitReport.useMutation({
    onSuccess: () => {
      utils.grievance.list.invalidate();
      utils.grievance.stats.invalidate();
      toast.success("Field survey verification report submitted to Authority!");
      onAuditSubmitted?.();
      onClose();
    },
    onError: err => {
      toast.error(`Report submission failed: ${err.message}`);
    },
  });

  if (!isOpen || !grievance) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotos(prev => [...prev, reader.result as string].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remarks.trim().length < 5) {
      toast.error("Surveyor remarks must be at least 5 characters.");
      return;
    }

    submitReportMutation.mutate({
      grievanceId: grievance.id,
      actualHeightMetres: actualHeight ? parseFloat(actualHeight) : null,
      approvedHeightMetres: approvedHeight ? parseFloat(approvedHeight) : null,
      actualFloors: actualFloors ? parseInt(actualFloors, 10) : null,
      approvedFloors: approvedFloors ? parseInt(approvedFloors, 10) : null,
      fireSafetyClearance: fireSafety,
      setbackEncroachmentMetres: setbackEncroachment ? parseFloat(setbackEncroachment) : null,
      sitePhotos: photos,
      remarks: remarks.trim(),
      verdict,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Field Verification Audit Form
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50">
                  Surveyor Desk
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official on-site physical measurement & statutory violation assessment
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
          {/* Grievance Details Box */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono font-bold text-cyan-300">
                #{grievance.grievanceNumber} · {grievance.ulpinOrReference}
              </span>
              <span className="text-amber-400 font-bold uppercase text-[10px]">
                {grievance.category.replace("_", " ")}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200">{grievance.title}</div>
            <p className="text-[11px] text-slate-400">{grievance.details}</p>
          </div>

          {/* Measurements Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Scaling size={14} /> Laser & Physical Measurements
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Actual Height (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualHeight}
                  onChange={e => setActualHeight(e.target.value)}
                  placeholder="e.g. 24.5"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Sanctioned Height (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={approvedHeight}
                  onChange={e => setApprovedHeight(e.target.value)}
                  placeholder="e.g. 18.0"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Actual Floors Count
                </label>
                <input
                  type="number"
                  value={actualFloors}
                  onChange={e => setActualFloors(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Sanctioned Floors
                </label>
                <input
                  type="number"
                  value={approvedFloors}
                  onChange={e => setApprovedFloors(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fire Safety & Setback Clearance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Flame size={14} className="text-orange-400" /> Fire Safety & Emergency Access Audit
              </label>
              <select
                value={fireSafety}
                onChange={e => setFireSafety(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400"
              >
                <option value="PASSED">PASSED (Adequate access & fire NOC verified)</option>
                <option value="FAILED">FAILED (Blocked access, no NOC or safety violation)</option>
                <option value="NOT_APPLICABLE">NOT APPLICABLE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Setback Encroachment (Metres)
              </label>
              <input
                type="number"
                step="0.1"
                value={setbackEncroachment}
                onChange={e => setSetbackEncroachment(e.target.value)}
                placeholder="e.g. 1.8 (0 if no encroachment)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>
          </div>

          {/* Verdict Recommendation */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-1.5">
              Surveyor Statutory Finding & Verdict *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "VIOLATION_CONFIRMED", label: "VIOLATION CONFIRMED", desc: "Action & Sealing Recommended", color: "#ef4444" },
                { id: "COMPLIANT_NO_VIOLATION", label: "COMPLIANT / NO VIOLATION", desc: "Structure matches permit", color: "#22c55e" },
                { id: "RE_SURVEY_RECOMMENDED", label: "RE-SURVEY REQUIRED", desc: "Complex title/boundary ambiguity", color: "#f59e0b" },
              ].map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVerdict(v.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    verdict === v.id
                      ? "bg-purple-950/80 border-purple-400 text-slate-100 ring-1 ring-purple-400 shadow-md shadow-purple-900/40"
                      : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="text-xs font-bold" style={{ color: v.color }}>{v.label}</div>
                  <div className="text-[10px] text-slate-400">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Field Audit Remarks & Evidence Notes *
            </label>
            <textarea
              required
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Record precise findings: height measurement technique used (RTK/Laser distometer), deviations from municipal sanctioned plan, and physical state..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-400 resize-none"
            />
          </div>

          {/* On-site Photos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Camera size={14} /> Attach Field Survey Photos ({photos.length}/4)
              </label>
            </div>
            <div className="flex gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-purple-500/40">
                  <img src={photo} alt="Field Photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-600 text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-400 flex flex-col items-center justify-center text-slate-400 hover:text-purple-300 transition-all text-[10px]"
                >
                  <Upload size={16} />
                  Upload
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Buttons */}
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
              disabled={submitReportMutation.isPending}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all"
            >
              {submitReportMutation.isPending ? "Submitting..." : "Submit Signed Verification Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
