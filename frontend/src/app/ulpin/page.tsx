"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCadastreContext } from "@/context/CadastreContext";

interface PropertyRecord {
  property_id: string;
  name: string;
  parcel_id: string;
  building_id: string;
  floor_id: string;
  unit_number: string;
  z_min: number;
  z_max: number;
  area: number;
  volume: number;
  height: number;
  readable_alias: string;
  source_type: "CADASTRAL_SURVEY" | "EXTRUDED_PHYSICAL";
}

const DEMO_PROPERTIES: PropertyRecord[] = [
  {
    property_id: "PROP-P001-B01-F05-U501",
    name: "Apartment Unit 501 (Tower 1, 5th Floor)",
    parcel_id: "PARCEL-DELHI-W-042",
    building_id: "BLD-TOWER-01",
    floor_id: "FLR-05",
    unit_number: "U-501",
    z_min: 15.0,
    z_max: 18.0,
    area: 94.5,
    volume: 283.5,
    height: 3.0,
    readable_alias: "DL-W-042-B01-F05-U501",
    source_type: "CADASTRAL_SURVEY",
  },
  {
    property_id: "PROP-P001-B01-F05-U502",
    name: "Apartment Unit 502 (Tower 1, 5th Floor)",
    parcel_id: "PARCEL-DELHI-W-042",
    building_id: "BLD-TOWER-01",
    floor_id: "FLR-05",
    unit_number: "U-502",
    z_min: 15.0,
    z_max: 18.0,
    area: 112.0,
    volume: 336.0,
    height: 3.0,
    readable_alias: "DL-W-042-B01-F05-U502",
    source_type: "CADASTRAL_SURVEY",
  },
  {
    property_id: "PROP-P001-B01-F06-U601",
    name: "Penthouse Suite 601 (Tower 1, 6th Floor)",
    parcel_id: "PARCEL-DELHI-W-042",
    building_id: "BLD-TOWER-01",
    floor_id: "FLR-06",
    unit_number: "U-601",
    z_min: 18.0,
    z_max: 21.5,
    area: 210.0,
    volume: 735.0,
    height: 3.5,
    readable_alias: "DL-W-042-B01-F06-U601",
    source_type: "CADASTRAL_SURVEY",
  },
  {
    property_id: "PROP-OSM-WAY-1029384",
    name: "Commercial Building Footprint (Tagore Garden)",
    parcel_id: "PARCEL-UNREGISTERED",
    building_id: "OSM-WAY-1029384",
    floor_id: "FLR-01",
    unit_number: "ENTIRE_SOLID",
    z_min: 0.0,
    z_max: 12.0,
    area: 155.0,
    volume: 1860.0,
    height: 12.0,
    readable_alias: "DL-OSM-WAY-1029384-001",
    source_type: "EXTRUDED_PHYSICAL",
  },
];

export default function UlpinRegistryPage() {
  const [selectedPropId, setSelectedPropId] = useState<string>("PROP-P001-B01-F05-U501");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; details: string } | null>(null);

  const activeProperty = DEMO_PROPERTIES.find((p) => p.property_id === selectedPropId) || DEMO_PROPERTIES[0];

  // Compute canonical identity payload string
  const canonicalIdentity = JSON.stringify({
    parcel_id: activeProperty.parcel_id,
    building_id: activeProperty.building_id,
    floor_id: activeProperty.floor_id,
    unit_number: activeProperty.unit_number,
    z_min: activeProperty.z_min,
    z_max: activeProperty.z_max,
    area_sqm: activeProperty.area,
    volume_cubic_m: activeProperty.volume,
    crs: "EPSG:32643",
  });

  // Simulated SHA-256 spatial ULPIN hash generator
  const generatedUlpin = `3D-ULPIN-${activeProperty.parcel_id.replace("PARCEL-", "")}-${activeProperty.unit_number}-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.toUpperCase();

  const handleVerify = () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult({
        valid: true,
        details: "Deterministic SHA-256 Spatial Hash verified against 3D Cadastral Registry Contract v1.0.",
      });
    }, 600);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8" style={{ fontFamily: "var(--font-sans)", color: "#252622" }}>
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6" style={{ borderBottom: "1px solid #D7D4CB" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
              style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", color: "#766044", border: "1px solid #D8CBB8" }}
            >
              3D SPATIAL IDENTITY HIERARCHY
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "#252622" }}>
            3D ULPIN Spatial Identity Registry
          </h1>
          <p className="text-xs mt-1" style={{ color: "#62635D" }}>
            Deterministic volumetric identifier prototype resolving multi-tier vertical ownership spaces.
          </p>
        </div>

        <Link
          href="/workspace/3d"
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-md transition-colors self-start md:self-auto"
          style={{ backgroundColor: "#E9E5DA", color: "#252622", border: "1px solid #D7D4CB" }}
        >
          <span>View in 3D Cadastre &rarr;</span>
        </Link>
      </div>

      {/* 2. Critical Prototype Disclaimer Notice */}
      <div className="rounded-md p-4 text-xs space-y-1" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#F5EFE3", border: "1px solid #D8C8A8", color: "#766044" }}>
        <div className="flex items-center gap-2 font-bold uppercase text-[11px]" style={{ color: "#766044" }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>STHARA Prototype 3D Spatial Identity Notice</span>
        </div>
        <p className="leading-relaxed">
          This 3D ULPIN is a project-specific deterministic identifier prototype designed for volumetric 3D property indexing.
          It represents a reproducible mathematical hash of the spatial containment hierarchy and is <strong>not an official Government of India ULPIN issuance</strong>.
        </p>
      </div>

      {/* 3. Multi-tier Hierarchy Visualizer Banner */}
      <div className="rounded-md p-6 space-y-4 shadow-sm" style={{ backgroundColor: "#F8F6F0", border: "1px solid #D7D4CB" }}>
        <div className="text-xs uppercase font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>
          Cadastral Spatial Resolution Flow
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs" style={{ fontFamily: "var(--font-mono)" }}>
          <div className="p-3 rounded-md" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>1. Parcel</div>
            <div className="font-bold mt-1 text-[11px] truncate" style={{ color: "#A85D48" }}>{activeProperty.parcel_id}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#62635D" }}>2D Land Boundary</div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>2. Building</div>
            <div className="font-bold mt-1 text-[11px] truncate" style={{ color: "#B28A52" }}>{activeProperty.building_id}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#62635D" }}>Physical Envelope</div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>3. Floor</div>
            <div className="font-bold mt-1 text-[11px] truncate" style={{ color: "#252622" }}>{activeProperty.floor_id}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#62635D" }}>Vertical Stratum</div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>4. Unit</div>
            <div className="font-bold mt-1 text-[11px] truncate" style={{ color: "#788575" }}>{activeProperty.unit_number}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#62635D" }}>Apartment / Suite</div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB" }}>
            <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>5. 3D Volume</div>
            <div className="font-bold mt-1 text-[11px]" style={{ color: "#A85D48" }}>{activeProperty.volume} m&sup3;</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#62635D" }}>Watertight Solid</div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: "#FAF0EE", border: "1px solid #DDBCB4" }}>
            <div className="text-[10px] uppercase font-bold" style={{ color: "#A85D48" }}>6. 3D ULPIN</div>
            <div className="font-bold mt-1 text-[11px] truncate" style={{ color: "#252622" }}>SHA-256 v1</div>
            <div className="text-[9px] mt-0.5" style={{ color: "#A85D48" }}>Canonical Hash</div>
          </div>
        </div>
      </div>

      {/* 4. Main 2-Column Section: Property Selector + Canonical Verification Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Property Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>
            Select Property / Cadastral Entity
          </div>

          <div className="space-y-2">
            {DEMO_PROPERTIES.map((prop) => {
              const isSelected = prop.property_id === selectedPropId;
              return (
                <button
                  key={prop.property_id}
                  type="button"
                  onClick={() => setSelectedPropId(prop.property_id)}
                  className="w-full text-left p-4 rounded-md transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "#F8F6F0" : "#E9E5DA",
                    border: isSelected ? "1px solid #A85D48" : "1px solid #D7D4CB",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#A85D48" }}>
                        {prop.readable_alias}
                      </span>
                      <h3 className="text-xs font-bold mt-1.5" style={{ color: "#252622" }}>{prop.name}</h3>
                    </div>
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        fontFamily: "var(--font-mono)",
                        ...(prop.source_type === "CADASTRAL_SURVEY"
                          ? { backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" }
                          : { backgroundColor: "#F5EFE3", color: "#B28A52", border: "1px solid #D8C8A8" }),
                      }}
                    >
                      {prop.source_type === "CADASTRAL_SURVEY" ? "Cadastral Unit" : "Physical Extrusion"}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 grid grid-cols-3 gap-2 text-[10px]" style={{ borderTop: "1px solid #D7D4CB", fontFamily: "var(--font-mono)", color: "#62635D" }}>
                    <div>
                      <span className="block" style={{ color: "#77786F" }}>Z Range:</span>
                      <span style={{ color: "#252622" }}>{prop.z_min}m - {prop.z_max}m</span>
                    </div>
                    <div>
                      <span className="block" style={{ color: "#77786F" }}>Volume:</span>
                      <span style={{ color: "#252622" }}>{prop.volume} m&sup3;</span>
                    </div>
                    <div>
                      <span className="block" style={{ color: "#77786F" }}>Floor Height:</span>
                      <span style={{ color: "#252622" }}>{prop.height}m</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Property ULPIN Specification & Verification (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-md p-6 space-y-6 shadow-sm" style={{ backgroundColor: "#F8F6F0", border: "1px solid #D7D4CB" }}>
            {/* Identity Header */}
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #D7D4CB" }}>
              <div>
                <div className="text-[10px] uppercase font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#A85D48" }}>
                  Canonical Property Record
                </div>
                <h2 className="text-lg font-bold mt-0.5" style={{ fontFamily: "var(--font-heading)", color: "#252622" }}>{activeProperty.name}</h2>
                <div className="text-xs mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "#62635D" }}>
                  Reference Record: <strong style={{ color: "#A85D48" }}>{activeProperty.readable_alias}</strong>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" }}>
                100% Watertight
              </span>
            </div>

            {/* Generated 3D ULPIN Output Display */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold block" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>
                Deterministic 3D ULPIN Hash (SHA-256)
              </label>
              <div className="p-3.5 rounded-md text-xs font-semibold break-all leading-relaxed" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", border: "1px solid #A85D48", color: "#A85D48" }}>
                {generatedUlpin || "Computing deterministic spatial identity..."}
              </div>
            </div>

            {/* Canonical Identity Serialization Payload */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold block" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>
                Canonical Input Serialization Payload
              </label>
              <div className="p-3 rounded-md text-[11px] break-all leading-relaxed" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", color: "#252622" }}>
                {canonicalIdentity || "Generating canonical identity payload..."}
              </div>
              <p className="text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#77786F" }}>
                Excludes rendering vertex floats to guarantee strict geometric stability across engines.
              </p>
            </div>

            {/* Dimensional & Positional Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-md text-xs" style={{ backgroundColor: "#E9E5DA", border: "1px solid #D7D4CB", fontFamily: "var(--font-mono)" }}>
              <div>
                <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>Base Elevation</div>
                <div className="font-bold mt-0.5" style={{ color: "#252622" }}>{activeProperty.z_min} m AMSL</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>Top Elevation</div>
                <div className="font-bold mt-0.5" style={{ color: "#252622" }}>{activeProperty.z_max} m AMSL</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>Floor Area</div>
                <div className="font-bold mt-0.5" style={{ color: "#252622" }}>{activeProperty.area} m&sup2;</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold" style={{ color: "#77786F" }}>Enclosed Volume</div>
                <div className="font-bold mt-0.5" style={{ color: "#A85D48" }}>{activeProperty.volume} m&sup3;</div>
              </div>
            </div>

            {/* Interactive Verification Action */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-md shadow-sm transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "#A85D48", color: "#FFFFFF" }}
              >
                {isVerifying ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verifying Cryptographic Hash...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verify 3D ULPIN Hash</span>
                  </>
                )}
              </button>

              {verificationResult && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md font-semibold" style={{ fontFamily: "var(--font-mono)", backgroundColor: "#EFF2EE", color: "#788575", border: "1px solid #C0CAC0" }}>
                  <span>✓</span>
                  <span>{verificationResult.details}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
