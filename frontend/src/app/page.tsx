import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { WebPageJsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <>
      <WebPageJsonLd
        title={siteConfig.name}
        description={siteConfig.description}
        url={siteConfig.url}
      />

      <div className="flex min-h-screen flex-col justify-between">
        {/* Top Minimal Navigation Bar */}
        <header className="border-b border-slate-800 bg-[#111827]/60 backdrop-blur-md px-6 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 font-bold text-sm">
                <Image
                  src="/icon.svg"
                  alt="3D Cadastral Intelligence Logo"
                  width={22}
                  height={22}
                  priority
                />
              </div>
              <span className="font-semibold text-sm tracking-wide text-white">
                3D Cadastral Intelligence
              </span>
            </div>

            <nav aria-label="Quick Links" className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-0.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                PHASE 1 FOUNDATION ACTIVE
              </span>
              <a
                href="/llms.txt"
                className="transition-colors hover:text-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
                target="_blank"
                rel="noreferrer"
              >
                llms.txt
              </a>
            </nav>
          </div>
        </header>

        {/* Main Content Hero Stage */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-1 text-xs font-mono text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              NEXT-GENERATION 3D SPATIAL CADASTRE
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              3D Cadastral Intelligence
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              A spatial intelligence platform for transforming 2D cadastral GIS boundaries and structural elevation data into validated 3D property representations and prototype 3D-ULPIN indexes.
            </p>

            {/* Architecture Pillar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
              <div className="rounded-lg border border-slate-800 bg-[#111827]/40 p-4">
                <div className="font-mono text-xs text-cyan-400 uppercase tracking-wider mb-1">
                  01 • Volumetric Modeling
                </div>
                <h2 className="text-sm font-semibold text-slate-200 mb-1">
                  Stratified 3D Extrusion
                </h2>
                <p className="text-xs text-slate-400">
                  Deterministic polyhedral modeling of surface parcels, above-ground floors, and sub-surface basements.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#111827]/40 p-4">
                <div className="font-mono text-xs text-emerald-400 uppercase tracking-wider mb-1">
                  02 • Spatial Validation
                </div>
                <h2 className="text-sm font-semibold text-slate-200 mb-1">
                  Boundary Clash Detection
                </h2>
                <p className="text-xs text-slate-400">
                  Algorithmic detection of vertical overhangs, illegal cantilever expansions, and unit collisions.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#111827]/40 p-4">
                <div className="font-mono text-xs text-amber-400 uppercase tracking-wider mb-1">
                  03 • 3D Property Index
                </div>
                <h2 className="text-sm font-semibold text-slate-200 mb-1">
                  Prototype 3D-ULPIN
                </h2>
                <p className="text-xs text-slate-400">
                  Coordinate, stratum, and elevation-indexed vertical land parcel identification numbers.
                </p>
              </div>
            </div>

            {/* System Status & Internal Actions */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 shadow-md"
              >
                Launch 2D Cadastral Workspace &rarr;
              </Link>
            </div>
          </div>
        </main>

        {/* Footer with Disclaimer */}
        <footer className="border-t border-slate-800/80 bg-[#111827]/40 px-6 py-4 text-center">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              &copy; {new Date().getFullYear()} 3D Cadastral Intelligence. Built for Smart India Hackathon (SIH).
            </span>
            <span className="max-w-xl text-[11px] leading-tight text-slate-600">
              {siteConfig.disclaimer}
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
