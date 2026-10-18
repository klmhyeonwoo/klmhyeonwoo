const fallbackSiteUrl = "http://localhost:3000";

/** Shares the public origin across canonical URLs, social cards and sitemaps. */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : fallbackSiteUrl);

  try {
    return new URL(configured);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}
