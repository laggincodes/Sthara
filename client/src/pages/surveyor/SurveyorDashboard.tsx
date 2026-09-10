import { useAuth } from "@/_core/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { formatRole, PlatformRoles } from "@shared/permissions";
import {
  Building2,
  CheckCircle2,
  Compass,
  FileCheck,
  FileSpreadsheet,
  Globe2,
  Layers,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function SurveyorDashboard() {
  const { user, logout } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [category, setCategory] = useState<"geojson" | "floorplan">("geojson");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const utils = trpc.useUtils();
  const statsQuery = trpc.surveyor.stats.useQuery();

  const uploadMutation = trpc.surveyor.uploadSurveyData.useMutation({
    onSuccess: res => {
      if (res.stored) {
        toast.success(
          `Survey dataset "${selectedFile?.name}" uploaded and validated successfully!`
        );
        setUploadModalOpen(false);
        setSelectedFile(null);
        void utils.surveyor.stats.invalidate();
      } else {
        toast.error(
          `Validation rejected: ${res.validation?.findings?.join(", ") || "Invalid data format"}`
        );
      }
    },
    onError: err => toast.error(err.message || "Failed to upload survey dataset"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a GeoJSON or floor-plan file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        category,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || "application/geo+json",
        dataBase64: base64,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const stats = statsQuery.data ?? {
    assignedSurveys: 0,
    uploadedDatasets: 0,
    verifiedFootprints: 0,
    recentUploads: [],
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        PlatformRoles.SUPER_ADMIN,
        PlatformRoles.SURVEYOR,
        PlatformRoles.AUTHORITY_ADMIN,
        PlatformRoles.AUTHORITY_OFFICER,
      ]}
    >
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <Compass size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">
                  Field Surveyor & GIS Data Workspace
                </div>
                <div className="text-xs text-amber-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="font-semibold">{formatRole(user?.role)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-amber-600 font-semibold text-white hover:bg-amber-500"
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload size={16} className="mr-1.5" /> Upload Survey Data
              </Button>
              <Link href="/workspace">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D Globe
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

        <main className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>ASSIGNED SURVEY PROJECTS</span>
                <Compass size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.assignedSurveys}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Active geodetic mapping assignments
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>UPLOADED GIS DATASETS</span>
                <Layers size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.uploadedDatasets}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                GeoJSON & BIM Evidence stored in S3
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>SPATIALLY INDEXED FOOTPRINTS</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.verifiedFootprints}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                PostGIS spatial truth database
              </p>
            </div>
          </div>

          {/* Recent Uploads Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-amber-400" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Uploaded Survey Datasets & Evidence Files
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => void statsQuery.refetch()}
              >
                <RefreshCw
                  size={14}
                  className={`mr-1.5 ${statsQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Dataset Name</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Validation Score</th>
                    <th className="px-5 py-3.5">Summary Findings</th>
                    <th className="px-5 py-3.5">Date Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recentUploads && stats.recentUploads.length > 0 ? (
                    stats.recentUploads.map(file => (
                      <tr key={file.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-bold text-white">
                          {file.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                            {file.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400">
                            {file.validationScore}/100
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-[300px] truncate">
                          {file.validationSummary}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No survey datasets uploaded yet. Click "Upload Survey Data" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Upload size={18} className="text-amber-400" /> Upload Survey / GIS Data
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs text-slate-400">Dataset Category</Label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs font-semibold text-white"
                  >
                    <option value="geojson">GeoJSON Cadastral Footprint / Boundaries</option>
                    <option value="floorplan">Vertical Floor Plan / BIM Document</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Select File</Label>
                  <Input
                    type="file"
                    accept=".json,.geojson,.pdf,.png,.jpg"
                    onChange={handleFileChange}
                    required
                    className="mt-1.5 border-slate-800 bg-slate-950 text-xs text-white"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Supports .geojson, .json, and floorplan evidence files.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-amber-600 text-white hover:bg-amber-500 font-semibold"
                    disabled={uploadMutation.isPending || !selectedFile}
                  >
                    {uploadMutation.isPending ? "Validating & Uploading..." : "Upload Dataset"}
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
