const DEFAULT_PRODUCTION_URL = "https://chain-map.live";

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) {
    return normalizeUrl(explicit);
  }

  if (process.env.VERCEL_ENV === "production") {
    return DEFAULT_PRODUCTION_URL;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) {
    return normalizeUrl(vercelUrl);
  }

  return "http://localhost:3000";
}
