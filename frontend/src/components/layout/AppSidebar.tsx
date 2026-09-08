"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCadastreContext } from "@/context/CadastreContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number | null;
  badgeColor?: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const {
    backendConnected,
    buildingsGeojson,
    building3DData,
    pipelineSteps,
    activeDatasetName,
    buildingDatasetName,
    isDemoRunning,
    runEndToEndDemo,
    resetDemo,
  } = useCadastreContext();

  const completedSteps = pipelineSteps.filter((s) => s.status === "COMPLETE").length;

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      name: "Data Workspace",
      href: "/data",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      ),
      badge: (buildingsGeojson?.features.length || 0) > 0 ? `${buildingsGeojson?.features.length}` : null,
      badgeColor: "bg-amber-950/60 text-amber-400 border-amber-500/30",
    },
    {
      name: "3D Cadastre",
      href: "/workspace/3d",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
      badge: building3DData?.summary.successful ? `${building3DData.summary.successful} 3D` : "155 3D",
      badgeColor: "bg-cyan-950/60 text-cyan-400 border-cyan-500/30",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      ),
    },
    {
      name: "ULPIN",
      href: "/ulpin",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.364a4.125 4.125 0 0 0-6.338 0c-.23.28-.09.761.27.761h5.798c.36 0 .5-.48.27-.761Z" />
        </svg>
      ),
      badge: "3D ID",
      badgeColor: "bg-purple-950/60 text-purple-300 border-purple-500/30",
    },
    {
      name: "Pipeline Audit",
      href: "/pipeline",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      badge: `${completedSteps}/8`,
      badgeColor:
        completedSteps === 8
          ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
          : "bg-slate-800 text-slate-400 border-slate-700",
    },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="Application Sidebar"
      className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#0B0F19] select-none"
    >
      {/* Top Branding Section */}
      <div>
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800/80">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 rounded-md p-0.5"
            title="STHARA Dashboard"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
              <Image
                src="/icon.svg"
                alt="STHARA Mark"
                width={18}
                height={18}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-white font-mono leading-none">
                STHARA
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight leading-none mt-1">
                3D Cadastre Intel
              </span>
            </div>
          </Link>
          <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/30 text-cyan-300">
            SIH 2026
          </span>
        </div>

        {/* Navigation Menu */}
        <nav aria-label="Main Navigation" className="p-3 space-y-1">
          <div className="px-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
            Workspaces
          </div>
          {navItems.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-slate-800/90 text-cyan-300 font-semibold shadow-xs border border-slate-700"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={active ? "text-cyan-400" : "text-slate-500"}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      item.badgeColor || "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Demo Execution Box */}
        <div className="mx-3 mt-2 p-2.5 rounded-lg border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              SIH 8-Stage Demo
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {completedSteps}/8 Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runEndToEndDemo}
              disabled={isDemoRunning}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 py-1.5 px-2 rounded-md transition-all shadow-xs cursor-pointer"
              title="Run 8-stage end-to-end demo"
            >
              {isDemoRunning ? (
                <>
                  <span className="h-2.5 w-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 text-emerald-200" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                  <span>Run Demo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetDemo}
              disabled={isDemoRunning}
              className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors cursor-pointer"
              title="Reset demo state"
              aria-label="Reset Demo"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Dataset Provenance Snapshot */}
        {(activeDatasetName || buildingDatasetName) && (
          <div className="mx-3 mt-3 p-2 rounded-lg border border-slate-800/80 bg-[#111827]/60 text-[10px] font-mono space-y-1">
            <div className="text-slate-500 uppercase tracking-wider font-semibold">
              Active Dataset
            </div>
            {activeDatasetName && (
              <div className="flex items-center gap-1 text-emerald-400 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{activeDatasetName}</span>
              </div>
            )}
            {buildingDatasetName && (
              <div className="flex items-center gap-1 text-purple-400 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate">{buildingDatasetName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status & Connectivity */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected === true
                  ? "bg-emerald-400"
                  : backendConnected === false
                  ? "bg-red-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>
              {backendConnected === true
                ? "API Connected"
                : backendConnected === false
                ? "API Offline"
                : "Connecting..."}
            </span>
          </div>
          <span className="text-[10px] text-slate-600">:8000</span>
        </div>
      </div>
    </aside>
  );
}
