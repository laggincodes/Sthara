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
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: "var(--sth-bg)" }}
    >
      <div
        className="w-full max-w-md rounded-md p-8"
        style={{
          backgroundColor: "var(--sth-card)",
          border: "1px solid var(--sth-border)",
          boxShadow: "0 4px 24px rgba(37,38,34,0.08)",
        }}
      >
        <div className="mb-4 flex justify-center">
          <Breadcrumbs
            items={[{ name: "404 Spatial Error", item: "/404" }]}
            includeJsonLd={false}
          />
        </div>

        <div
          className="mb-4 inline-flex items-center gap-2 rounded px-3 py-1 text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            border: "1px solid #DDBCB4",
            backgroundColor: "var(--sth-clay-bg)",
            color: "var(--sth-clay)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--sth-clay)" }} />
          ERROR CODE: 404_BOUNDARY_UNRESOLVED
        </div>

        <h1
          className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--sth-text)" }}
        >
          Spatial Entity Not Found
        </h1>

        <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--sth-text-2)" }}>
          The requested URL does not match any registered 3D cadastral parcel, volumetric unit, or application view in this workspace.
        </p>

        <div
          className="pt-4 flex flex-col sm:flex-row gap-3 justify-center"
          style={{ borderTop: "1px solid var(--sth-border)" }}
        >
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: "var(--sth-accent)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
            }}
          >
            Return to Cadastral Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
