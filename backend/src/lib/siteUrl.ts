// Public-facing base URL of the storefront, used for absolute links in
// payment callbacks and the sitemap. Prefers PUBLIC_SITE_URL, then the first
// CORS_ORIGIN entry. Returns "" when nothing is configured so callers can
// decide on a fallback.
export function siteBaseUrl(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const cors = process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  if (cors) return cors.replace(/\/+$/, "");
  return "";
}
