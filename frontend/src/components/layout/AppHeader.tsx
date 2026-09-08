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
    activeProjectName,
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

  const getBreadcrumbItems = () => {
    const project = activeProjectName || "Delhi Test Area";
    if (pathname === "/") return ["Projects", project, "Dashboard"];
    if (pathname === "/data") return ["Projects", project, "Import & Convert"];
    if (pathname === "/workspace/3d") return ["Projects", project, "3D Workspace"];
    if (pathname === "/workspace/2d") return ["Projects", project, "2D Footprints"];
    if (pathname === "/projects") return ["Projects Directory"];
    if (pathname === "/pipeline") return ["Projects", project, "Audit & Diagnostics"];
    return ["Projects", project, "Workspace"];
  };

  const navLinks = [
    { name: "Dashboard", href: "/" },
    { name: "Import", href: "/data" },
    { name: "3D Workspace", href: "/workspace/3d" },
    { name: "Projects", href: "/projects" },
    { name: "Audit", href: "/pipeline" },
  ];

  const breadcrumbs = getBreadcrumbItems();

  return (
    <header
      className="shrink-0 select-none z-30"
      style={{
        backgroundColor: "var(--sth-card)",
        borderBottom: "1px solid var(--sth-border)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-md transition-colors"
            style={{
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
              color: "var(--sth-text-2)",
            }}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <div
            className="flex items-center gap-1 text-xs truncate"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <span className="font-semibold shrink-0" style={{ color: "var(--sth-accent)" }}>
              STHARA
            </span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span style={{ color: "var(--sth-border)" }}>/</span>
                <span
                  className={idx === breadcrumbs.length - 1 ? "font-semibold truncate" : "hidden sm:inline truncate"}
                  style={{
                    color:
                      idx === breadcrumbs.length - 1
                        ? "var(--sth-text)"
                        : "var(--sth-text-2)",
                  }}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Active Dataset Chips */}
          <div className="hidden lg:flex items-center gap-1.5 ml-1 shrink-0">
            {activeDatasetName && (
              <span
                className="text-[10px] px-2 py-0.5 rounded border truncate max-w-[180px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--sth-sage)",
                  borderColor: "#C0CAC0",
                  backgroundColor: "var(--sth-sage-bg)",
                }}
                title={activeDatasetName}
              >
                Parcels: {activeDatasetName}
              </span>
            )}
            {buildingDatasetName && (
              <span
                className="text-[10px] px-2 py-0.5 rounded border truncate max-w-[180px]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--sth-geo)",
                  borderColor: "#D8C8A8",
                  backgroundColor: "var(--sth-geo-bg)",
                }}
                title={buildingDatasetName}
              >
                Buildings: {buildingDatasetName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 2D / 3D mode toggle when in workspace */}
          {pathname.startsWith("/workspace") && (
            <div
              className="flex items-center rounded-md p-0.5"
              style={{
                border: "1px solid var(--sth-border)",
                backgroundColor: "var(--sth-surface)",
              }}
            >
              <Link
                href="/workspace/2d"
                className="px-2.5 py-1 text-xs font-semibold rounded-sm transition-all"
                style={
                  pathname === "/workspace/2d"
                    ? {
                        backgroundColor: "var(--sth-card)",
                        color: "var(--sth-text)",
                        boxShadow: "0 1px 2px rgba(37,38,34,0.08)",
                        border: "1px solid var(--sth-border)",
                      }
                    : {
                        color: "var(--sth-text-2)",
                        border: "1px solid transparent",
                      }
                }
              >
                2D Map
              </Link>
              <Link
                href="/workspace/3d"
                className="px-2.5 py-1 text-xs font-semibold rounded-sm transition-all"
                style={
                  pathname === "/workspace/3d"
                    ? {
                        backgroundColor: "var(--sth-accent)",
                        color: "#fff",
                        border: "1px solid transparent",
                      }
                    : {
                        color: "var(--sth-text-2)",
                        border: "1px solid transparent",
                      }
                }
              >
                3D Cadastre
              </Link>
            </div>
          )}

          {/* Mobile Demo Trigger */}
          <button
            type="button"
            onClick={runEndToEndDemo}
            disabled={isDemoRunning}
            className="md:hidden inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md"
            style={{ backgroundColor: "var(--sth-accent)", color: "#fff" }}
          >
            {isDemoRunning ? "Running…" : "Validate"}
          </button>

          {/* Backend status pip */}
          <div
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
            style={{
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--sth-border)",
              backgroundColor: "var(--sth-surface)",
              color: "var(--sth-text-2)",
            }}
            title={
              backendConnected === true
                ? "FastAPI Backend connected (:8000)"
                : backendConnected === false
                ? "Backend offline (:8000)"
                : "Checking backend…"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${backendConnected !== true ? "animate-pulse" : ""}`}
              style={{
                backgroundColor:
                  backendConnected === true
                    ? "var(--sth-sage)"
                    : backendConnected === false
                    ? "var(--sth-clay)"
                    : "var(--sth-geo)",
              }}
            />
            <span className="hidden sm:inline">
              {backendConnected === true ? "API 8000" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden px-4 py-3 space-y-1"
          style={{
            borderTop: "1px solid var(--sth-border)",
            backgroundColor: "var(--sth-surface)",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-xs font-medium transition-colors"
              style={
                pathname === link.href
                  ? {
                      backgroundColor: "var(--sth-accent)",
                      color: "#fff",
                    }
                  : {
                      color: "var(--sth-text-2)",
                    }
              }
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}

      {/* Global Error Banner */}
      {currentError && (
        <div
          className="px-4 py-1.5 text-xs flex items-center justify-between"
          style={{
            borderTop: "1px solid #DDBCB4",
            backgroundColor: "var(--sth-clay-bg)",
            fontFamily: "var(--font-mono)",
            color: "var(--sth-clay)",
          }}
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: "var(--sth-clay)" }}
            />
            <span className="truncate">{currentError}</span>
          </div>
          <span
            className="text-[10px] shrink-0 ml-2"
            style={{ color: "var(--sth-text-2)" }}
          >
            FastAPI :8000
          </span>
        </div>
      )}
    </header>
  );
}
