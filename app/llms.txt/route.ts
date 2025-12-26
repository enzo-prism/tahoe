import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/site";

export function GET() {
  const siteUrl = getSiteUrl();
  const body = `# Tahoe Chain Control
> Live chain control updates for Bay Area and Lake Tahoe travel.

## Website
${siteUrl}/

## Description
This site provides live chain control status, corridor summaries, and map visualizations.

## Key URLs
- ${siteUrl}/
- ${siteUrl}/i-80
- ${siteUrl}/us-50
- ${siteUrl}/sr-88
- ${siteUrl}/truck
- ${siteUrl}/truck/i-80
- ${siteUrl}/truck/us-50
- ${siteUrl}/truck/sr-88

## Allowed
/

## Disallowed
/api
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
