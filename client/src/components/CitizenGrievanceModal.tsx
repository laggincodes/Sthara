import { useState, useRef } from "react";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  Copy,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Scale,
  Scaling,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  GrievanceCategories,
  GrievanceCategoryMeta,
  type GrievanceCategory,
} from "@shared/cadastralGrievance";
import { toast } from "sonner";

interface CitizenGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUlpin?: string;
  defaultBuildingName?: string;
  defaultLatitude?: number | string;
  defaultLongitude?: number | string;
  onGrievanceCreated?: (grievanceNumber: string) => void;
}

export function CitizenGrievanceModal({
  isOpen,
  onClose,
  defaultUlpin = "",
  defaultBuildingName = "",
  defaultLatitude = "",
  defaultLongitude = "",
  onGrievanceCreated,
}: CitizenGrievanceModalProps) {
  const [category, setCategory] =
    useState<GrievanceCategory>("HEIGHT_VIOLATION");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [ulpinOrRef, setUlpinOrRef] = useState(defaultUlpin);
  const [buildingName, setBuildingName] = useState(defaultBuildingName);
  const [latitude, setLatitude] = useState(String(defaultLatitude || ""));
  const [longitude, setLongitude] = useState(String(defaultLongitude || ""));
  const [citizenName, setCitizenName] = useState("");
  const [citizenContact, setCitizenContact] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submittedGrievanceNumber, setSubmittedGrievanceNumber] = useState<
    string | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = trpc.grievance.submit.useMutation({
    onSuccess: data => {
      setSubmittedGrievanceNumber(data.grievanceNumber);
      toast.success(
        `Grievance #${data.grievanceNumber} filed successfully with municipal desk!`
      );
      onGrievanceCreated?.(data.grievanceNumber);
    },
    onError: err => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload valid image files (JPEG, PNG, WebP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Each photo must be under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotos(prev => [...prev, reader.result as string].slice(0, 5));
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
    if (!ulpinOrRef.trim()) {
      toast.error("Please provide a Cadastral ULPIN or Building reference.");
      return;
    }
    if (title.trim().length < 4) {
      toast.error("Title must be at least 4 characters.");
      return;
    }
    if (details.trim().length < 10) {
      toast.error("Please explain the violation in detail (min 10 characters).");
      return;
    }

    submitMutation.mutate({
      ulpinOrReference: ulpinOrRef.trim(),
      buildingName: buildingName.trim() || undefined,
      category,
      title: title.trim(),
      details: details.trim(),
      latitude: latitude ? String(latitude) : undefined,
      longitude: longitude ? String(longitude) : undefined,
      evidencePhotos: photos,
      citizenName: citizenName.trim() || undefined,
      citizenContact: citizenContact.trim() || undefined,
      isAnonymous,
    });
  };

  const copyTrackingNumber = () => {
    if (submittedGrievanceNumber) {
      navigator.clipboard.writeText(submittedGrievanceNumber);
      toast.success("Grievance tracking ID copied to clipboard!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Report Cadastral Grievance & Violation
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  Citizen Portal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official grievance triage for illegal heights, red zones, fire hazards & encroachments
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {submittedGrievanceNumber ? (
            /* Success View */
            <div className="py-8 px-6 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-emerald-300">
                  Grievance Registered Successfully!
                </h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Your complaint has been forwarded to the Municipal Authority & Enforcement Triage Desk for review.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-cyan-500/30 max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-[10px] uppercase font-mono text-cyan-400">
                    Official Tracking Reference ID
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-100 tracking-wider">
                    {submittedGrievanceNumber}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyTrackingNumber}
                  className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/40 transition-colors"
                >
                  <Copy size={14} /> Copy
                </button>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl text-left text-xs text-slate-300 space-y-2 border border-slate-700/60 max-w-md mx-auto">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" /> Next Workflow Steps:
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Authority Officer will inspect spatial context & historical building permits.</li>
                  <li>A Field Surveyor will be dispatched to measure height/setbacks with laser/GCP if verified.</li>
                  <li>Super Admin & Municipal Magistrate can issue Sealing Orders or Demolition Notices.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
              >
                Done & Return to Map
              </button>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                  Violation Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(GrievanceCategories).map(([key, value]) => {
                    const meta = GrievanceCategoryMeta[value as GrievanceCategory];
                    const isSelected = category === value;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(value as GrievanceCategory)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-cyan-950/80 border-cyan-400 text-slate-100 ring-1 ring-cyan-400 shadow-md shadow-cyan-900/40"
                            : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 mt-1 rounded-full shrink-0"
                          style={{ backgroundColor: meta.badgeColor }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {meta.label}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {meta.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cadastral Target Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ULPIN / Property Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={ulpinOrRef}
                    onChange={e => setUlpinOrRef(e.target.value)}
                    placeholder="e.g. IN-BR-PAT-0042-3D-B01"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Building / Land Name
                  </label>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={e => setBuildingName(e.target.value)}
                    placeholder="e.g. City Heights Tower B"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Complaint Summary / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Unapproved rooftop 6th floor exceeding sanctioned 21m height limit"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Grievance & Facts *
                </label>
                <textarea
                  required
                  rows={3}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Describe the nature of the violation, visible encroachment, construction activity, safety concerns, or non-compliance observed on-site..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Photo Evidence Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Camera size={14} /> Attach Site Photos / Evidence (Up to 5)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {photos.length}/5 Attached
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-950 group"
                    >
                      <img
                        src={photo}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-400/80 bg-slate-950/60 hover:bg-slate-900 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 transition-all"
                    >
                      <Upload size={18} />
                      <span className="text-[10px] mt-1 font-semibold">Upload</span>
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

              {/* Optional Reporter Info */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Reporter Information
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0"
                    />
                    Submit Anonymously
                  </label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={citizenName}
                      onChange={e => setCitizenName(e.target.value)}
                      placeholder="Your Name (Optional)"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="tel"
                      value={citizenContact}
                      onChange={e => setCitizenContact(e.target.value)}
                      placeholder="Mobile Number for SMS Status"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitMutation.isPending ? (
                    "Submitting to Authority..."
                  ) : (
                    <>
                      <ShieldAlert size={14} /> File Official Grievance
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
