import type { Metadata } from "next";

import { getSiteUrl } from "@/lib/site";

interface SeoConfig {
  title: string;
  description: string;
  canonicalPath: string;
}

export function buildMetadata({ title, description, canonicalPath }: SeoConfig): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "Tahoe Chain Control",
      locale: "en_US"
    },
    twitter: {
      card: "summary",
      title,
      description
    }
  };
}
