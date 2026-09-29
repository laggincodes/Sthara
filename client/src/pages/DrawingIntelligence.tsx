import { useState } from "react";
import { Link } from "wouter";
import { StharaNavigation } from "@/components/StharaNavigation";
import {
  FileCode2,
  UploadCloud,
  FileCheck2,
  Box,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";

type ExtractedFeature = {
  label: string;
  value: string;
  confidence: number;
  provenance: string;
};

export default function DrawingIntelligence() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleSimulateAnalysis = () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setAnalysisComplete(false);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisComplete(true);
    }, 1500);
  };

  const extractedFeatures: ExtractedFeature[] = [
    {
      label: "Building Footprint & Slab Boundary",
      value: "Multi-segment contour with rear light-wells & cantilevered balconies (20.0m x 14.5m)",
      confidence: 0.99,
      provenance: "Site & Typical Floor Plan Vector Perimeter",
    },
    {
      label: "Vertical Structure & Floor Stack",
      value: "G + 6 (7 Levels) + Terrace | Total Height: 20.02m",
      confidence: 0.99,
      provenance: "Section A-A Dimension Line (Ground 3.22m, Floors 1–6 2.80m each)",
    },
    {
      label: "Basement Status & Provenance",
      value: "0 Basements (basement_count: 0)",
      confidence: 1.0,
      provenance: "basement_source: Drawing does not identify basement",
    },
    {
      label: "Flat & Unit Demarcation",
      value: "30 Residential Flats (5 Flats/Floor across F1–F6) + Ground Stilt Parking (P1–P6)",
      confidence: 0.98,
      provenance: "Typical Floor Plan Flat Layout (Flats X01–X05) & Ground Bay Schedule",
    },
    {
      label: "Central Core & Circulation",
      value: "Enclosed Lift Shaft (2.2m x 2.0m) + Dog-leg Staircase with Treads (2.4m x 4.6m) + Lobby",
      confidence: 0.97,
      provenance: "Central Shaft Vector Polygons & Stair Flight Lines",
    },
    {
      label: "Wall Geometry Extraction",
      value: "86 Calibrated Wall Segments (Exterior 0.23m, Core 0.23m, Partitions 0.115m)",
      confidence: 0.96,
      provenance: "Architectural Wall Trace Layer",
    },
    {
      label: "Roof & Bulkhead Extraction",
      value: "1.0m Parapet Wall + 2.6m Lift Machine Room & Water Tank Bulkhead",
      confidence: 0.99,
      provenance: "Roof Plan & Section A-A Bulkhead Coordinates",
    },
    {
      label: "STHARA Spatial ID Cadastre",
      value: "DL-RG-B001-F01-U101 to DL-RG-B001-F06-U605 (30 3D Units)",
      confidence: 1.0,
      provenance: "STHARA Spatial ID Generator & Cadastral Registry",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F3F0E8] text-[#252622]">
      <StharaNavigation />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {/* Header Section */}
        <div className="mb-8 rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-[#B28A52]/30 bg-[#B28A52]/10 text-[#B28A52]">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-[#252622]">
                Drawing Intelligence
              </h1>
              <p className="text-xs text-[#6F7069]">
                Turn architectural blueprints, CAD DWGs, and PDF floor plans into structured 3D spatial models.
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-5 text-xs font-medium">
          <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-center">
            <span className="block font-mono text-[10px] text-[#A85D48]">STEP 1</span>
            <span className="font-bold text-[#252622]">Import Drawing</span>
          </div>
          <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-center">
            <span className="block font-mono text-[10px] text-[#A85D48]">STEP 2</span>
            <span className="font-bold text-[#252622]">Vector Analysis</span>
          </div>
          <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-center">
            <span className="block font-mono text-[10px] text-[#A85D48]">STEP 3</span>
            <span className="font-bold text-[#252622]">Extract Features</span>
          </div>
          <div className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-center">
            <span className="block font-mono text-[10px] text-[#A85D48]">STEP 4</span>
            <span className="font-bold text-[#252622]">Build Spatial Model</span>
          </div>
          <div className="rounded border border-[#D7D4CB] bg-[#A85D48] p-3 text-center text-white">
            <span className="block font-mono text-[10px] opacity-80">STEP 5</span>
            <span className="font-bold">3D Floor Slicer</span>
          </div>
        </div>

        {/* Provenance Alert */}
        <div className="mb-6 rounded border border-[#B28A52]/30 bg-[#B28A52]/10 p-4 text-xs text-[#252622] flex items-start gap-3">
          <Info className="h-5 w-5 text-[#B28A52] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Strict Drawing-Grounded Provenance Rules:</span>
            <p className="mt-0.5 text-[#6F7069]">
              STHARA extracts vertical levels directly from explicit drawing annotations. Basements are generated <strong>ONLY</strong> when explicitly identified by architectural evidence (e.g., "BASEMENT PLAN", "B1"). If a drawing specifies G+6 without a basement, 0 basements are generated.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* File Upload Box */}
          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
            <h2 className="font-sans text-base font-bold text-[#252622] mb-2">
              Import Architectural Drawing
            </h2>
            <p className="text-xs text-[#6F7069] mb-4">
              Supported formats: Architectural PDF (e.g. <code>20 ARCH PLAN.pdf</code>), DWG, DXF, PNG, JPG.
            </p>

            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#D7D4CB] bg-[#E9E5DA]/50 p-8 text-center transition-colors hover:border-[#A85D48]">
              <UploadCloud className="h-10 w-10 text-[#6F7069] mb-3" />
              <p className="text-sm font-semibold text-[#252622]">
                Drag and drop architectural drawing here
              </p>
              <p className="text-xs text-[#6F7069] mt-1">or browse file from device</p>
              <input
                type="file"
                className="mt-4 text-xs text-[#6F7069] file:mr-4 file:rounded file:border-0 file:bg-[#A85D48] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#934E3B]"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#D7D4CB] pt-3">
              <span className="text-xs text-[#6F7069]">Or load verified blueprint:</span>
              <button
                type="button"
                onClick={() => {
                  const simulatedRef = new File(["dummy"], "Architectural_Reference_G+6_Section_AA.png", { type: "image/png" });
                  setSelectedFile(simulatedRef);
                  setAnalyzing(true);
                  setAnalysisComplete(false);
                  setTimeout(() => {
                    setAnalyzing(false);
                    setAnalysisComplete(true);
                  }, 800);
                }}
                className="rounded border border-[#A85D48]/30 bg-[#A85D48]/10 px-3 py-1 text-xs font-semibold text-[#A85D48] hover:bg-[#A85D48]/20"
              >
                Load Reference G+6 Plan
              </button>
            </div>

            {selectedFile && (
              <div className="mt-4 rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-[#788575]" />
                  <span className="font-semibold text-[#252622]">{selectedFile.name}</span>
                  <span className="font-mono text-[#6F7069]">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={handleSimulateAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 rounded bg-[#A85D48] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#934E3B] disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Extract Spatial Model</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Analysis Results Display */}
          <div className="rounded-lg border border-[#D7D4CB] bg-[#F8F6F0] p-6 shadow-xs">
            <h2 className="font-sans text-base font-bold text-[#252622] mb-2">
              Extracted Spatial Features
            </h2>
            <p className="text-xs text-[#6F7069] mb-4">
              {analysisComplete
                ? "Drawing analyzed successfully. Grounded spatial features extracted:"
                : "Import a drawing (such as 20 ARCH PLAN.pdf) or load the reference plan above."}
            </p>

            {analysisComplete ? (
              <div className="space-y-3">
                {extractedFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-[#D7D4CB] bg-[#E9E5DA] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-[#252622]">
                      <span>{feat.label}</span>
                      <span className="font-mono text-[10px] text-[#788575]">
                        Confidence: {(feat.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[#A85D48] font-bold">
                      {feat.value}
                    </p>
                    <p className="mt-1 text-[10px] text-[#6F7069]">
                      Source: {feat.provenance}
                    </p>
                  </div>
                ))}

                <div className="mt-6 border-t border-[#D7D4CB] pt-4 flex justify-end">
                  <Link
                    href="/floor-explorer?building=rajouri-garden-block-a"
                    className="flex items-center gap-2 rounded bg-[#A85D48] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#934E3B]"
                  >
                    <Box className="h-4 w-4" />
                    <span>View 3D Floor Slicer</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded border border-[#D7D4CB] bg-[#E9E5DA]/30 p-12 text-center text-xs text-[#6F7069]">
                <FileCode2 className="h-8 w-8 text-[#D7D4CB] mb-2" />
                <p>No drawing analyzed yet.</p>
                <p className="mt-1 text-[10px]">
                  Select an architectural PDF or DWG file on the left to extract floor plans and 3D volumes.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
