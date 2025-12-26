import type { MetadataRoute } from "next";

import { CORRIDOR_SEGMENTS } from "@/lib/routePaths";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const baseEntry = {
    url: siteUrl,
    lastModified,
    changeFrequency: "hourly" as const,
    priority: 1
  };

  const corridorEntries = CORRIDOR_SEGMENTS.map((segment) => ({
    url: `${siteUrl}/${segment}`,
    lastModified,
    changeFrequency: "hourly" as const,
    priority: 0.8
  }));

  const truckEntries = [
    {
      url: `${siteUrl}/truck`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.7
    },
    ...CORRIDOR_SEGMENTS.map((segment) => ({
      url: `${siteUrl}/truck/${segment}`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.7
    }))
  ];

  return [
    baseEntry,
    ...corridorEntries,
    ...truckEntries
  ];
}
