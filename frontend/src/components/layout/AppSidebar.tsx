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
  badgeVariant?: "accent" | "sage" | "geo" | "neutral";
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
      badgeVariant: "geo",
    },
    {
      name: "3D Cadastre",
      href: "/workspace/3d",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
      badge: building3DData?.summary.successful ? `${building3DData.summary.successful} 3D` : null,
      badgeVariant: "sage",
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
      badgeVariant: "neutral",
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
      badgeVariant: completedSteps === 8 ? "sage" : "neutral",
    },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const badgeClass = (variant: NavItem["badgeVariant"], active: boolean) => {
    if (active) return "bg-white/20 text-white border-white/30";
    switch (variant) {
      case "accent":  return "bg-[#FAF0EE] text-[#A85D48] border-[#DDBCB4]";
      case "sage":    return "bg-[#EFF2EE] text-[#788575] border-[#C0CAC0]";
      case "geo":     return "bg-[#F5EFE3] text-[#B28A52] border-[#D8C8A8]";
      default:        return "bg-[#E9E5DA] text-[#6F7069] border-[#D7D4CB]";
    }
  };

  return (
    <aside
      aria-label="Application Sidebar"
      className="hidden md:flex w-56 shrink-0 flex-col justify-between select-none"
      style={{
        backgroundColor: "var(--sth-surface)",
        borderRight: "1px solid var(--sth-border)",
      }}
    >
      {/* ── Top: Branding ──────────────────────────────────────────────── */}
      <div>
        <div
          className="flex items-center gap-2.5 px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--sth-border)" }}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md p-0.5 transition-opacity hover:opacity-80"
            title="STHARA Dashboard"
          >
            {/* Logo mark */}
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{
                backgroundColor: "var(--sth-accent)",
                color: "#fff",
              }}
            >
              <Image src="/icon.svg" alt="STHARA Mark" width={16} height={16} className="brightness-[10]" />
            </div>

            {/* Wordmark */}
            <div className="flex flex-col">
              <span
                className="text-xs font-bold uppercase tracking-widest leading-none"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text)" }}
              >
                STHARA
              </span>
              <span
                className="text-[9px] tracking-tight leading-none mt-1"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
              >
                3D Cadastre Intel
              </span>
            </div>
          </Link>

          {/* Version badge */}
          <span
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded border"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--sth-text-2)",
              borderColor: "var(--sth-border)",
              backgroundColor: "var(--sth-card)",
            }}
          >
            v1.0
          </span>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav aria-label="Main Navigation" className="p-3 space-y-0.5">
          <div
            className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-widest font-semibold"
            style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
          >
            Workspaces
          </div>

          {navItems.map((item) => {
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all"
                style={
                  active
                    ? {
                        backgroundColor: "var(--sth-accent)",
                        color: "#fff",
                      }
                    : {
                        color: "var(--sth-text-2)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sth-border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--sth-text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--sth-text-2)";
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  <span style={{ fontFamily: "var(--font-sans)" }}>{item.name}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${badgeClass(item.badgeVariant, active)}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Pipeline Validation Box ─────────────────────────────────── */}
        <div
          className="mx-3 mt-2 p-2.5 rounded-md"
          style={{
            border: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-card)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
            >
              Pipeline
            </span>
            <span
              className="text-[10px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: completedSteps === 8 ? "var(--sth-sage)" : "var(--sth-geo)",
              }}
            >
              {completedSteps}/8 verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runEndToEndDemo}
              disabled={isDemoRunning}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 px-2 rounded-md transition-all cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "var(--sth-accent)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
              }}
              title="Run pipeline validation"
            >
              {isDemoRunning ? (
                <>
                  <span className="h-2.5 w-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Running…</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                  <span>Run Validation</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetDemo}
              disabled={isDemoRunning}
              className="inline-flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              style={{
                border: "1px solid var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
                color: "var(--sth-text-2)",
              }}
              title="Reset validation state"
              aria-label="Reset"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Active Dataset Provenance ───────────────────────────────── */}
        {(activeDatasetName || buildingDatasetName) && (
          <div
            className="mx-3 mt-3 p-2 rounded-md space-y-1"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-card)",
            }}
          >
            <div
              className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
            >
              Active Dataset
            </div>
            {activeDatasetName && (
              <div
                className="flex items-center gap-1.5 text-[10px] truncate"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-sage)" }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: "var(--sth-sage)" }}
                />
                <span className="truncate">{activeDatasetName}</span>
              </div>
            )}
            {buildingDatasetName && (
              <div
                className="flex items-center gap-1.5 text-[10px] truncate"
                style={{ fontFamily: "var(--font-mono)", color: "var(--sth-geo)" }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: "var(--sth-geo)" }}
                />
                <span className="truncate">{buildingDatasetName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom: Connectivity ───────────────────────────────────────── */}
      <div
        className="p-3"
        style={{ borderTop: "1px solid var(--sth-border)" }}
      >
        <div
          className="flex items-center justify-between text-[11px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--sth-text-2)" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected === true
                  ? ""
                  : backendConnected === false
                  ? "animate-pulse"
                  : "animate-pulse"
              }`}
              style={{
                backgroundColor:
                  backendConnected === true
                    ? "var(--sth-sage)"
                    : backendConnected === false
                    ? "var(--sth-clay)"
                    : "var(--sth-geo)",
              }}
            />
            <span>
              {backendConnected === true
                ? "API Connected"
                : backendConnected === false
                ? "API Offline"
                : "Connecting…"}
            </span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--sth-border)" }}>
            :8000
          </span>
        </div>
      </div>
    </aside>
  );
}
