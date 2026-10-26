const fallbackSiteUrl = "http://localhost:3000";
const productionSiteUrl = "https://www.wavystudio.xyz";

/** Shares the public origin across canonical URLs, social cards and sitemaps. */
export function getSiteUrl() {
  // Prefer the stable production origin over a per-deployment Vercel URL.
  // Canonical URLs, sitemaps and social cards must never point at a preview.
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    // The apex domain redirects to www, so keep canonical URLs on the final
    // destination even if Vercel reports the shorter apex as its project URL.
    ?? (process.env.VERCEL ? productionSiteUrl : undefined)
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL
    ?? fallbackSiteUrl;
  const value = configured.startsWith("http") ? configured : `https://${configured}`;

  try {
    return new URL(value);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}
