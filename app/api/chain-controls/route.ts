import { NextResponse } from "next/server";

import { normalizeFeed } from "@/lib/chainControls";
import type { CaltransFeed, ChainControlResponse } from "@/lib/types";

export const revalidate = 60;

const DISTRICT_FEEDS = [
  "https://cwwp2.dot.ca.gov/data/d3/cc/ccStatusD03.json",
  "https://cwwp2.dot.ca.gov/data/d10/cc/ccStatusD10.json"
];

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string): Promise<CaltransFeed> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return (await response.json()) as CaltransFeed;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    DISTRICT_FEEDS.map((url) => fetchWithTimeout(url))
  );

  const feeds = results
    .filter((result): result is PromiseFulfilledResult<CaltransFeed> => {
      return result.status === "fulfilled";
    })
    .map((result) => result.value);

  const points = feeds.flatMap((feed) => normalizeFeed(feed));
  const payload: ChainControlResponse = {
    updatedAt: new Date().toISOString(),
    points
  };

  if (feeds.length === 0) {
    return NextResponse.json(payload, { status: 502 });
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60"
    }
  });
}
