export const siteConfig = {
  name: "3D Cadastral Intelligence",
  shortName: "3D Cadastre",
  description:
    "A spatial intelligence platform for transforming cadastral and geospatial data into validated 3D property representations.",
  tagline: "Volumetric Land Rights Modeling & Prototype 3D-ULPIN System",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/opengraph-image",
  links: {
    github: "https://github.com/3d-cadastral-intelligence",
  },
  authors: [
    {
      name: "3D Cadastral Intelligence Research & Engineering Team",
    },
  ],
  keywords: [
    "3D Cadastre",
    "Spatial Intelligence",
    "Volumetric Land Rights",
    "3D ULPIN",
    "Cadastral Validation",
    "Geospatial Extrusion",
    "ISO 19152 LADM",
    "Digital Land Records",
  ],
  disclaimer:
    "This platform is a research prototype demonstrating 3D spatial cadastre concepts, deterministic geometry validation, and prototype 3D-ULPIN indexing. It does not issue legally binding land registry deeds or government-certified cadastral determinations.",
} as const;

export type SiteConfig = typeof siteConfig;
