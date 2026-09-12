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
  Radio,
  Crosshair,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function SurveyorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"missions" | "upload" | "gcp">("missions");

  // Upload modal state
  const [category, setCategory] = useState<"geojson" | "floorplan">("geojson");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // GCP Logger state
  const [pointCode, setPointCode] = useState("GCP-PAT-042-A");
  const [latitude, setLatitude] = useState<number>(25.5941);
  const [longitude, setLongitude] = useState<number>(85.1376);
  const [ellipsoidalHeight, setEllipsoidalHeight] = useState<number>(53.4);
  const [rtkAccuracyCm, setRtkAccuracyCm] = useState<number>(2.5);
  const [markerType, setMarkerType] = useState("BENCHMARK_PILLAR");
  const [gcpNotes, setGcpNotes] = useState("GNSS RTK CORS Dual-frequency ground observation lock.");

  const [loggedPoints, setLoggedPoints] = useState<any[]>([
    {
      pointCode: "GCP-PAT-042-A",
      latitude: 25.5941,
      longitude: 85.1376,
      ellipsoidalHeight: 53.4,
      rtkAccuracyCm: 2.5,
      markerType: "BENCHMARK_PILLAR",
      recordedAt: new Date(Date.now() - 3600000 * 2).toLocaleString(),
    },
    {
      pointCode: "GCP-PAT-042-B",
      latitude: 25.5948,
      longitude: 85.1382,
      ellipsoidalHeight: 53.8,
      rtkAccuracyCm: 1.8,
      markerType: "ROOF_CORNER",
      recordedAt: new Date(Date.now() - 3600000 * 4).toLocaleString(),
    },
  ]);

  const utils = trpc.useUtils();
  const statsQuery = trpc.surveyor.stats.useQuery();
  const missionsQuery = trpc.surveyor.assignedMissions.useQuery();

  const uploadMutation = trpc.surveyor.uploadSurveyData.useMutation({
    onSuccess: res => {
      if (res.stored) {
        toast.success(
          `Survey dataset "${selectedFile?.name}" uploaded and validated successfully!`
        );
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

  const gcpMutation = trpc.surveyor.submitGcpMeasurement.useMutation({
    onSuccess: data => {
      toast.success(`GCP Point ${data.pointCode} recorded with RTK geodetic verification!`);
      setLoggedPoints(prev => [
        {
          pointCode,
          latitude,
          longitude,
          ellipsoidalHeight,
          rtkAccuracyCm,
          markerType,
          recordedAt: new Date().toLocaleString(),
        },
        ...prev,
      ]);
      setPointCode(`GCP-PAT-042-${String.fromCharCode(67 + loggedPoints.length)}`);
    },
    onError: err => toast.error(err.message || "Failed to log GCP measurement"),
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

  const handleGcpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointCode.trim() || !latitude || !longitude) {
      toast.error("Point code, latitude, and longitude are required.");
      return;
    }
    gcpMutation.mutate({
      pointCode: pointCode.trim(),
      latitude,
      longitude,
      ellipsoidalHeight,
      rtkAccuracyCm,
      markerType,
      notes: gcpNotes.trim(),
    });
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
        {/* Header */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Compass size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Field Surveyor & GIS Data Workspace</span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                    GNSS / CORS / Drone
                  </span>
                </div>
                <div className="text-xs text-amber-400 flex items-center gap-1.5">
                  <span>{user?.name || user?.email}</span>
                  <span>·</span>
                  <span className="font-semibold">{formatRole(user?.role)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/workspace">
                <Button
                  size="sm"
                  className="bg-amber-600 font-semibold text-white hover:bg-amber-500 shadow-md shadow-amber-900/30"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D Spatial Viewer
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
              onClick={() => setActiveTab("missions")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "missions"
                  ? "text-amber-400 border-b-2 border-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass size={15} /> Assigned Survey Missions ({(missionsQuery.data || []).length})
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "upload"
                  ? "text-amber-400 border-b-2 border-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload size={15} /> Spatial Data & Blueprint Ingestion
            </button>
            <button
              onClick={() => setActiveTab("gcp")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "gcp"
                  ? "text-amber-400 border-b-2 border-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Crosshair size={15} /> GNSS / GCP Benchmark Logger
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
          {/* Summary Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>ASSIGNED SURVEY MISSIONS</span>
                <Compass size={16} className="text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {(missionsQuery.data || []).length}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Ground RTK & drone inspection tasks
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>UPLOADED SPATIAL DATASETS</span>
                <Upload size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.uploadedDatasets}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                GeoJSON, Shapefiles & Blueprints
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>VERIFIED 3D FOOTPRINTS</span>
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">
                {stats.verifiedFootprints}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                PostGIS building extrusion records
              </p>
            </div>
          </div>

          {/* TAB 1: ASSIGNED SURVEY MISSIONS */}
          {activeTab === "missions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Active Field Survey Tasks & Ground Missions
                  </h2>
                  <p className="text-xs text-slate-400">
                    Missions assigned by Line Authorities for on-ground GNSS benchmark verification and height measurement.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void missionsQuery.refetch()}
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw size={14} className={`mr-1.5 ${missionsQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(missionsQuery.data || []).map(m => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col md:flex-row justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            m.priority === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : m.priority === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {m.priority} PRIORITY
                        </span>
                        <span className="font-mono text-xs font-bold text-white">{m.id}</span>
                        <span className="text-slate-500 text-xs">·</span>
                        <span className="text-xs text-slate-400">District: {m.targetDistrict}</span>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {m.missionName}
                      </div>

                      <div className="text-xs text-cyan-400 font-mono">
                        Target Parcel: {m.parcelReference} ({m.ulpin})
                      </div>

                      <p className="text-xs text-slate-300 max-w-2xl bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        {m.instructions}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Assigned: {new Date(m.assignedAt).toLocaleDateString()}</span>
                        <span>Logged GCPs: {m.gcpPointsCount} points</span>
                      </div>
                    </div>

                    <div className="flex md:flex-col justify-end items-end gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab("gcp");
                          setPointCode(`GCP-${m.ulpin.slice(0, 10)}`);
                          toast.info(`Ready to log GCP points for ${m.parcelReference}`);
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                      >
                        <Crosshair size={13} className="mr-1.5" /> Log GCP Benchmark
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab("upload");
                          toast.info(`Ready to upload spatial data for ${m.parcelReference}`);
                        }}
                        className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        <Upload size={13} className="mr-1.5" /> Upload Dataset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SPATIAL DATA INGESTION */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:p-8 backdrop-blur max-w-3xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                  <Upload size={18} /> Ingest Field Spatial Dataset / Floor Plans
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Upload GeoJSON boundaries, Shapefiles, or CAD architectural floor drawings for automated PostGIS topology verification.
                </p>

                <form onSubmit={handleUploadSubmit} className="space-y-5 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold">Dataset Category</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCategory("geojson")}
                        className={`p-3 rounded-xl border text-left font-semibold transition ${
                          category === "geojson"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Layers size={16} className="mb-1" />
                        <div>GeoJSON 3D Boundary (.geojson / .json)</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory("floorplan")}
                        className={`p-3 rounded-xl border text-left font-semibold transition ${
                          category === "floorplan"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Building2 size={16} className="mb-1" />
                        <div>Floor Plan Blueprint (.png / .pdf / .dxf)</div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-semibold">Select Local Spatial File</Label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-6 text-center bg-slate-950/60 transition">
                      <input
                        type="file"
                        id="spatial-file-input"
                        onChange={handleFileChange}
                        accept=".json,.geojson,.png,.jpg,.pdf,.dxf"
                        className="hidden"
                      />
                      <label
                        htmlFor="spatial-file-input"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload size={32} className="text-amber-400 animate-bounce" />
                        <span className="text-slate-300 font-medium text-xs">
                          {selectedFile ? selectedFile.name : "Click or drag spatial dataset here"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Supports GeoJSON (EPSG:4326), Shapefiles, Floorplan Blueprints
                        </span>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-5 text-xs rounded-xl shadow-lg shadow-amber-950/40"
                  >
                    {uploadMutation.isPending ? "Validating & Ingesting..." : "Submit Spatial Ingestion"}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: GNSS / GCP BENCHMARK LOGGER */}
          {activeTab === "gcp" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* GCP Logger Form */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Crosshair size={18} /> Record Ground Control Point (GCP)
                  </div>
                  <p className="text-xs text-slate-400">
                    Log millimeter-accurate RTK GPS benchmark markers for Level 4 Geodetic validation.
                  </p>

                  <form onSubmit={handleGcpSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold">Benchmark Marker Code</Label>
                      <Input
                        value={pointCode}
                        onChange={e => setPointCode(e.target.value)}
                        placeholder="e.g. GCP-PAT-042-A"
                        required
                        className="bg-slate-950 border-slate-700 text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 font-semibold">Latitude (°N)</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={latitude}
                          onChange={e => setLatitude(Number(e.target.value))}
                          required
                          className="bg-slate-950 border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 font-semibold">Longitude (°E)</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={longitude}
                          onChange={e => setLongitude(Number(e.target.value))}
                          required
                          className="bg-slate-950 border-slate-700 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 font-semibold">Ellipsoidal Height (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ellipsoidalHeight}
                          onChange={e => setEllipsoidalHeight(Number(e.target.value))}
                          required
                          className="bg-slate-950 border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-300 font-semibold">RTK Accuracy (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="50"
                          value={rtkAccuracyCm}
                          onChange={e => setRtkAccuracyCm(Number(e.target.value))}
                          required
                          className="bg-slate-950 border-slate-700 text-emerald-400 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold">Marker Type</Label>
                      <select
                        value={markerType}
                        onChange={e => setMarkerType(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                      >
                        <option value="BENCHMARK_PILLAR">Survey of India Concrete Pillar</option>
                        <option value="ROOF_CORNER">Building Parapet / Roof Corner</option>
                        <option value="GROUND_PIN">Brass Ground Pin / Road Center</option>
                        <option value="CORS_ANTENNA">Continuous Operating Reference Station (CORS)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-300 font-semibold">Field Observation Notes</Label>
                      <Textarea
                        rows={2}
                        value={gcpNotes}
                        onChange={e => setGcpNotes(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={gcpMutation.isPending}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-5 text-xs rounded-xl shadow-lg shadow-amber-950/40"
                    >
                      {gcpMutation.isPending ? "Recording Benchmark..." : "Save GCP Benchmark"}
                    </Button>
                  </form>
                </div>

                {/* Logged GCPs Table */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">
                      Logged Field Benchmarks ({loggedPoints.length})
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      RTK Accuracy &lt; 5.0cm Verified
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {loggedPoints.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1.5 text-xs hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-400">{pt.pointCode}</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                            ±{pt.rtkAccuracyCm} cm
                          </span>
                        </div>
                        <div className="text-slate-300 font-mono text-[11px]">
                          {pt.latitude.toFixed(6)}°N, {pt.longitude.toFixed(6)}°E · Elev: +{pt.ellipsoidalHeight}m
                        </div>
                        <div className="text-slate-500 text-[10px] flex justify-between pt-1 border-t border-slate-800/80">
                          <span>{pt.markerType}</span>
                          <span>{pt.recordedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
