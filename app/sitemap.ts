import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1
    }
  ];
}
