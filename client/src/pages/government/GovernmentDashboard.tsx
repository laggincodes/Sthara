import React, { useState } from "react";
import { Link } from "wouter";
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
  Clock,
  Globe2,
  LogOut,
  Map,
  MapPin,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  FileText,
  AlertTriangle,
  QrCode,
  Printer,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Award,
  Filter,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

export default function GovernmentDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "catalog" | "certificate" | "conflicts"
  >("overview");

  // Catalog search state
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<number | undefined>(undefined);

  // Modal / Detail state
  const [selectedCadastre, setSelectedCadastre] = useState<any | null>(null);
  const [certificateUlpin, setCertificateUlpin] = useState<string>("IN-BR-PAT-0042-3D-F04");

  const utils = trpc.useUtils();
  const summaryQuery = trpc.government.stats.useQuery();
  const deptsQuery = trpc.government.departments.useQuery();
  const distsQuery = trpc.government.districts.useQuery();
  const catalogQueryData = trpc.government.cadastreCatalog.useQuery({
    query: catalogQuery || undefined,
    status: selectedStatus !== "ALL" ? selectedStatus : undefined,
    districtId: selectedDistrict,
  });
  const certificateQuery = trpc.government.generateCertificateData.useQuery(
    { ulpinOrReference: certificateUlpin },
    { enabled: Boolean(certificateUlpin) }
  );
  const conflictsQuery = trpc.government.conflictAlerts.useQuery();

  const stats = summaryQuery.data ?? {
    records: 0,
    pendingVerification: 0,
    reviewedVerification: 0,
  };

  const handleExportCsv = () => {
    const data = catalogQueryData.data || [];
    if (data.length === 0) {
      toast.error("No catalog records to export.");
      return;
    }
    const headers = [
      "ULPIN",
      "Title",
      "Parcel",
      "Building",
      "Unit",
      "Floor",
      "Area_sqm",
      "Volume_cum",
      "Elevation_m",
      "Status",
      "Rights",
    ];
    const rows = data.map(r => [
      r.ulpin,
      `"${r.title}"`,
      `"${r.parcel}"`,
      `"${r.building}"`,
      r.unit,
      r.floor,
      r.area,
      r.volume,
      r.elevation,
      r.status,
      `"${r.rights}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `National_3D_Cadastre_Catalog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Cadastre Catalog exported to CSV successfully!");
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        PlatformRoles.SUPER_ADMIN,
        PlatformRoles.GOVERNMENT_EMPLOYEE,
        PlatformRoles.AUTHORITY_ADMIN,
        PlatformRoles.AUTHORITY_OFFICER,
      ]}
    >
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        {/* Top Header */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 px-6 py-4 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Map size={22} />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Government Operations & Analytics Console</span>
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                    DoLR · Nodal Agency
                  </span>
                </div>
                <div className="text-xs text-blue-400 flex items-center gap-1.5">
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
                  className="bg-blue-600 font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-900/30"
                >
                  <Globe2 size={16} className="mr-1.5" /> 3D Spatial Explorer
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
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "overview"
                  ? "text-blue-400 border-b-2 border-blue-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 size={15} /> Overview & Regional Analytics
            </button>
            <button
              onClick={() => setActiveTab("catalog")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "catalog"
                  ? "text-blue-400 border-b-2 border-blue-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={15} /> National Cadastre Directory ({(catalogQueryData.data || []).length})
            </button>
            <button
              onClick={() => setActiveTab("certificate")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "certificate"
                  ? "text-blue-400 border-b-2 border-blue-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Award size={15} /> 3D ULPIN Title Deed Generator
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`pb-2.5 transition flex items-center gap-2 ${
                activeTab === "conflicts"
                  ? "text-blue-400 border-b-2 border-blue-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle size={15} /> Inter-Departmental Clearances ({(conflictsQuery.data || []).length})
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
          {/* TAB 1: OVERVIEW & REGIONAL ANALYTICS */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>REGISTERED 3D CADASTRE</span>
                    <Building2 size={16} className="text-blue-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {stats.records}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Catalog parcels in PostGIS database
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>PENDING VERIFICATIONS</span>
                    <Clock size={16} className="text-amber-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {stats.pendingVerification}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Active departmental reviews
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>SANCTIONED PARCELS</span>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {stats.reviewedVerification}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Verified heights & title deeds
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>LINE MINISTRIES CONNECTED</span>
                    <ShieldCheck size={16} className="text-purple-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {deptsQuery.data?.length ?? 0}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    DoLR, SOI, DLRS, Rev & Urban Dev
                  </p>
                </div>
              </div>

              {/* Departments & District Coverage */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Participating Line Ministries & Departments
                    </h2>
                    <span className="text-xs text-blue-400 font-mono">
                      {deptsQuery.data?.length ?? 0} Active
                    </span>
                  </div>
                  <div className="space-y-3">
                    {deptsQuery.data?.map(d => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{d.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {d.description}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {d.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Cadastral District Deployment
                    </h2>
                    <span className="text-xs text-emerald-400 font-mono">
                      State of Bihar (Phase 1)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {distsQuery.data?.map(d => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-cyan-400" />
                          <div>
                            <div className="text-xs font-bold text-white">{d.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {d.state} · Code: {d.code}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ACTIVE
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-200 mt-4 flex items-start gap-2.5">
                    <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">3D Cadastre Compliance Mandate:</span>{" "}
                      All registered units enforce unique 14-digit ULPIN codes with 3D volumetric bounding coordinates, elevation above Mean Sea Level (MSL), and Evidence Ladder certification.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NATIONAL CADASTRE DIRECTORY & SEARCH */}
          {activeTab === "catalog" && (
            <div className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Input
                    placeholder="Search by ULPIN, Building, Parcel, or Title..."
                    value={catalogQuery}
                    onChange={e => setCatalogQuery(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white pl-9 text-xs"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs font-medium text-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Verified">Verified</option>
                    <option value="Under Survey">Under Survey</option>
                    <option value="Provisional">Provisional</option>
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCsv}
                    className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <FileSpreadsheet size={14} className="mr-1.5 text-emerald-400" /> Export CSV
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">ULPIN Reference & Title</th>
                        <th className="px-5 py-3.5">Building & Parcel</th>
                        <th className="px-5 py-3.5">Floor & Unit</th>
                        <th className="px-5 py-3.5">Area / Volume</th>
                        <th className="px-5 py-3.5">Elevation (MSL)</th>
                        <th className="px-5 py-3.5">Verification Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(catalogQueryData.data || []).length > 0 ? (
                        (catalogQueryData.data || []).map(rec => (
                          <tr key={rec.ulpin} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-white font-mono text-xs">
                                {rec.ulpin}
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                {rec.title}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="text-slate-200 font-medium">
                                {rec.building}
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                {rec.parcel}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-300">
                              <span className="font-semibold text-white">
                                {rec.unit}
                              </span>{" "}
                              (Floor {rec.floor})
                            </td>
                            <td className="px-5 py-3.5 text-slate-300">
                              <div>{rec.area} m²</div>
                              <div className="text-cyan-400 text-[10px] font-mono">
                                {rec.volume} m³
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-300 font-mono">
                              +{rec.elevation} m
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                  rec.status === "Verified"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {rec.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                                onClick={() => setSelectedCadastre(rec)}
                              >
                                <Eye size={12} className="mr-1" /> View 3D Profile
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                onClick={() => {
                                  setCertificateUlpin(rec.ulpin);
                                  setActiveTab("certificate");
                                }}
                              >
                                <Award size={12} className="mr-1" /> Certificate
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            No matching cadastre records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 3D ULPIN TITLE DEED & CERTIFICATE GENERATOR */}
          {activeTab === "certificate" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Official 3D ULPIN Title Certificate Generator
                  </h2>
                  <p className="text-xs text-slate-400">
                    National 3D Cadastral Deed formatted with WGS84 coordinates and Evidence Ladder verification seal.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePrintCertificate}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                  >
                    <Printer size={14} className="mr-1.5" /> Print / Save as PDF
                  </Button>
                </div>
              </div>

              {/* Certificate Canvas / Card */}
              {certificateQuery.data && (
                <div
                  id="printable-certificate"
                  className="rounded-3xl border-2 border-blue-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-8 lg:p-12 shadow-2xl relative overflow-hidden"
                >
                  {/* Decorative Header Badge */}
                  <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-bold text-blue-400 tracking-wider uppercase mb-3">
                      <ShieldCheck size={14} /> GOVERNMENT OF INDIA · DEPARTMENT OF LAND RESOURCES
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight uppercase">
                      Certificate of 3D Volumetric Property Title
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Issued under National Land Records Modernisation Programme (NLRMP) · SIH 2026
                    </p>
                  </div>

                  {/* Core ULPIN Code Banner */}
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                        UNIQUE LAND PARCEL IDENTIFICATION NUMBER (3D ULPIN)
                      </div>
                      <div className="text-2xl lg:text-3xl font-mono font-extrabold text-white mt-1">
                        {certificateQuery.data.ulpin}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Title: {certificateQuery.data.title}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <QrCode size={48} className="text-cyan-400" />
                      <div className="text-[10px] text-slate-400 leading-tight">
                        <div className="font-bold text-white">QR Verified Deed</div>
                        <div>Scan to view live 3D PostGIS geometry</div>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
                    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <div className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Building2 size={16} className="text-blue-400" /> Spatial & Volumetric Metrics
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Building / Structure:</span>
                        <span className="font-semibold text-white">{certificateQuery.data.buildingName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Unit / Flat Number:</span>
                        <span className="font-semibold text-white">{certificateQuery.data.unitNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Floor Level:</span>
                        <span className="font-semibold text-white">Floor {certificateQuery.data.floorLevel}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Carpet Area:</span>
                        <span className="font-semibold text-white">{certificateQuery.data.areaSqMeters} m²</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">3D Volumetric Extrusion:</span>
                        <span className="font-semibold text-cyan-400 font-mono">{certificateQuery.data.volumeCubicMeters} m³</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Elevation Above MSL:</span>
                        <span className="font-semibold text-white font-mono">+{certificateQuery.data.elevationAboveMSL} metres</span>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                      <div className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-400" /> Geodetic & Legal Registry
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Geodetic Reference Frame:</span>
                        <span className="font-semibold text-white">{certificateQuery.data.geodeticDatum}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Centroid Coordinates:</span>
                        <span className="font-semibold text-white font-mono">
                          {certificateQuery.data.coordinatesCentroid.latitude.toFixed(4)}°N, {certificateQuery.data.coordinatesCentroid.longitude.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Jurisdiction District:</span>
                        <span className="font-semibold text-white">{certificateQuery.data.district}, {certificateQuery.data.state}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Ownership Conveyance:</span>
                        <span className="font-semibold text-emerald-400">{certificateQuery.data.ownershipRights}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Verification Seal:</span>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} /> LEVEL 4 GEODETIC LOCK
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Seal */}
                  <div className="border-t-2 border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
                    <div>
                      <div>Issuing Authority: {certificateQuery.data.issuingAuthority}</div>
                      <div>Timestamp: {new Date(certificateQuery.data.verificationTimestamp).toLocaleString()}</div>
                    </div>
                    <div className="font-mono text-cyan-400 text-right">
                      {certificateQuery.data.securityWatermark}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTER-DEPARTMENTAL CLEARANCES & CONFLICT MONITOR */}
          {activeTab === "conflicts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Inter-Departmental Spatial & Height Clearances
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cross-verification monitor detecting height sanction discrepancies and multi-departmental cadastral overlap.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void conflictsQuery.refetch()}
                  className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw size={14} className={`mr-1.5 ${conflictsQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh Queue
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(conflictsQuery.data || []).map(conf => (
                  <div
                    key={conf.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col md:flex-row justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            conf.severity === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : conf.severity === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {conf.severity} PRIORITY
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          {conf.id}
                        </span>
                        <span className="text-slate-500 text-xs">·</span>
                        <span className="text-xs text-slate-400">{conf.title}</span>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        ULPIN: <span className="text-cyan-400 font-mono">{conf.ulpin}</span> · {conf.parcel}
                      </div>

                      <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                        {conf.description}
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-500">Involved Departments:</span>
                        {conf.involvedDepartments.map(dept => (
                          <span
                            key={dept}
                            className="font-mono text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded"
                          >
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex md:flex-col justify-end items-end gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success(`Clearance workflow initiated for ${conf.id}`);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                      >
                        Initiate Joint Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toast.info(`Dispatched notice to ${conf.involvedDepartments.join(" & ")}`);
                        }}
                        className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Forward Notice
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* 3D Property Profile Modal */}
        {selectedCadastre && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Building2 size={18} className="text-cyan-400" />
                  3D Volumetric Property Details
                </div>
                <button
                  onClick={() => setSelectedCadastre(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">
                    ULPIN Identifier
                  </div>
                  <div className="font-mono font-bold text-cyan-400 text-sm">
                    {selectedCadastre.ulpin}
                  </div>
                  <div className="text-slate-300 font-medium">{selectedCadastre.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Building / Parcel</div>
                    <div className="font-semibold text-white mt-0.5">{selectedCadastre.building}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Floor & Unit</div>
                    <div className="font-semibold text-white mt-0.5">Floor {selectedCadastre.floor}, Unit {selectedCadastre.unit}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Carpet Area</div>
                    <div className="font-semibold text-white mt-0.5">{selectedCadastre.area} m²</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">3D Extrusion Volume</div>
                    <div className="font-semibold text-cyan-400 font-mono mt-0.5">{selectedCadastre.volume} m³</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">
                    Evidence & Rights Verification Chain
                  </div>
                  <div className="text-emerald-400 font-medium mt-1">
                    {selectedCadastre.rights}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Attached Evidence: {selectedCadastre.evidence.join(", ")}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-800 text-xs"
                  onClick={() => setSelectedCadastre(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                  onClick={() => {
                    setCertificateUlpin(selectedCadastre.ulpin);
                    setSelectedCadastre(null);
                    setActiveTab("certificate");
                  }}
                >
                  <Award size={14} className="mr-1" /> View Title Certificate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
