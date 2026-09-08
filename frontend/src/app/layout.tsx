import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { constructMetadata } from "@/lib/metadata";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { CadastreProvider } from "@/context/CadastreContext";
import { AppShell } from "@/components/layout/AppShell";

/* ── Fonts ──────────────────────────────────────────────────────────────── */

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#F3F0E8] text-[#252622]">
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        <CadastreProvider>
          <AppShell>{children}</AppShell>
        </CadastreProvider>
      </body>
    </html>
  );
}
