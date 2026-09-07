"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";

export function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const {
    backendConnected,
    activeDatasetName,
    buildingDatasetName,
    generalError,
    associationError,
    elevationError,
    heightError,
    floorError,
    building3DError,
    floors3DError,
    property3DError,
    isDemoRunning,
    runEndToEndDemo,
  } = useCadastreContext();

  const currentError =
    generalError ||
    associationError ||
    elevationError ||
    heightError ||
    floorError ||
    building3DError ||
    floors3DError ||
    property3DError;

  const getBreadcrumbs = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/data") return "Data Workspace";
    if (pathname === "/workspace/2d") return "2D Cadastral GIS";
    if (pathname === "/workspace/3d") return "3D Cadastre Stage";
    if (pathname === "/pipeline") return "Pipeline Audit";
    if (pathname.startsWith("/workspace")) return "Cadastral Workspace";
    return "STHARA";
  };

  const navLinks = [
    { name: "Dashboard", href: "/" },
    { name: "Data", href: "/data" },
    { name: "2D Map", href: "/workspace/2d" },
    { name: "3D Cadastre", href: "/workspace/3d" },
    { name: "Pipeline Audit", href: "/pipeline" },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#111827]/90 backdrop-blur-md z-30 shrink-0 select-none">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 hidden sm:inline">STHARA</span>
            <span className="text-slate-700 hidden sm:inline">/</span>
            <span className="text-white font-semibold">{getBreadcrumbs()}</span>
          </div>

          {/* Active Dataset Provenance Chips */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            {activeDatasetName && (
              <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 rounded px-2 py-0.5 bg-emerald-950/20 truncate max-w-[200px]" title={activeDatasetName}>
                Parcels: {activeDatasetName}
              </span>
            )}
            {buildingDatasetName && (
              <span className="text-[10px] font-mono text-purple-400 border border-purple-500/30 rounded px-2 py-0.5 bg-purple-950/20 truncate max-w-[200px]" title={buildingDatasetName}>
                Buildings: {buildingDatasetName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick 2D/3D Mode Switch & Actions */}
        <div className="flex items-center gap-2">
          {/* Fast 2D / 3D Mode Toggle Switcher when in workspace */}
          {pathname.startsWith("/workspace") && (
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900/90 p-0.5 mr-1">
              <Link
                href="/workspace/2d"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  pathname === "/workspace/2d"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                2D Map
              </Link>
              <Link
                href="/workspace/3d"
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                  pathname === "/workspace/3d"
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>3D Cadastre</span>
              </Link>
            </div>
          )}

          {/* Mobile Demo Trigger */}
          <button
            type="button"
            onClick={runEndToEndDemo}
            disabled={isDemoRunning}
            className="md:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 px-2.5 py-1 rounded-md"
          >
            {isDemoRunning ? "Running..." : "Demo"}
          </button>

          {/* Compact Connection Pip */}
          <div
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 px-2 py-1 rounded border border-slate-800 bg-slate-900/60"
            title={
              backendConnected === true
                ? "FastAPI Backend connected (:8000)"
                : backendConnected === false
                ? "Backend offline (:8000)"
                : "Checking backend..."
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected === true
                  ? "bg-emerald-400"
                  : backendConnected === false
                  ? "bg-red-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="hidden sm:inline">
              {backendConnected === true ? "API 8000" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B0F19] px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-xs font-medium ${
                pathname === link.href
                  ? "bg-slate-800 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}

      {/* Global Error Banner */}
      {currentError && (
        <div className="border-t border-red-500/30 bg-red-950/40 px-4 py-1.5 text-xs font-mono text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
            <span className="truncate">{currentError}</span>
          </div>
          <span className="text-[10px] text-red-400/70 shrink-0 ml-2">FastAPI :8000</span>
        </div>
      )}
    </header>
  );
}
