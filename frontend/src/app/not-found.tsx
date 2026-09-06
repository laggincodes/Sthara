import Link from "next/link";
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = constructMetadata({
  title: "404 - Spatial Boundary Not Found",
  description: "The requested coordinate address or cadastral page does not exist within the registry.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#111827]/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-4 flex justify-center">
          <Breadcrumbs
            items={[{ name: "404 Spatial Error", item: "/404" }]}
            includeJsonLd={false}
          />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/20 px-3 py-1 font-mono text-xs text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
          ERROR CODE: 404_BOUNDARY_UNRESOLVED
        </div>

        <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Spatial Entity Not Found
        </h1>

        <p className="mb-6 text-sm text-slate-400 leading-relaxed">
          The requested URL does not match any registered 3D cadastral parcel, volumetric unit, or application view in this workspace.
        </p>

        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            Return to Cadastral Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
