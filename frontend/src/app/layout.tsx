import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { constructMetadata } from "@/lib/metadata";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { CadastreProvider } from "@/context/CadastreContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="h-full overflow-hidden bg-[#0B0F19] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        <CadastreProvider>
          <AppShell>{children}</AppShell>
        </CadastreProvider>
      </body>
    </html>
  );
}
