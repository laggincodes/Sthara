import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

interface ConstructMetadataProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  image = siteConfig.ogImage,
  noIndex = false,
}: ConstructMetadataProps = {}): Metadata {
  const url = path.startsWith("http") ? path : new URL(path, siteConfig.url).toString();

  return {
    title: title
      ? {
          default: title,
          template: `%s | ${siteConfig.name}`,
        }
      : {
          default: siteConfig.name,
          template: `%s | ${siteConfig.name}`,
        },
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-icon.svg", type: "image/svg+xml" },
      ],
    },
    openGraph: {
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - ${siteConfig.tagline}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description,
      images: [image],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
