/**
 * Single source of truth for this app's env vars. Every other module reads
 * config through here, never `process.env` directly, and only server-side
 * (no `NEXT_PUBLIC_` vars exist in this app on purpose — nothing here needs
 * to reach the browser bundle).
 */

/** Trims whitespace and surrounding quotes. */
function clean(value: string): string {
  return value.trim().replace(/^(['"])(.*)\1$/, "$2");
}

function required(name: string): string {
  const value = clean(process.env[name] ?? "");
  if (!value) {
    throw new Error(
      `Missing required env var "${name}". Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

/** Validates `value` as an absolute http(s) URL and returns it without a
 * trailing slash. Names the offending var so a malformed .env line (e.g.
 * `POSTKING_IMAGE_BASE_URL=SITE_URL=...`, two assignments on one line) is
 * obvious instead of a bare "Invalid URL". */
function urlVar(name: string, value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `${name} is not a valid URL: "${value}". Expected e.g. https://example.com. ` +
        `Check .env: each variable needs its own line, in the form ${name}=https://...`
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must start with http:// or https:// (got "${value}").`);
  }
  return value.replace(/\/+$/, "");
}

const apiUrl = urlVar("POSTKING_API_URL", required("POSTKING_API_URL"));
const siteUrl = urlVar("SITE_URL", required("SITE_URL"));
const imageBaseRaw = clean(process.env.POSTKING_IMAGE_BASE_URL ?? "");

export const config = {
  /** Origin of your PostKing account, e.g. "https://try.postking.app". */
  apiUrl,
  /** This site's own landing-page slug in PostKing. */
  brandSlug: required("POSTKING_BRAND_SLUG"),
  /** The public URL this site is served at — drives canonical/sitemap/OG. */
  siteUrl,
  /** Origin that relative "/assets/..." paths from PostKing resolve against. */
  imageBaseUrl: new URL(
    imageBaseRaw ? urlVar("POSTKING_IMAGE_BASE_URL", imageBaseRaw) : apiUrl
  ).origin,
};

/** Hostname (no port) of `SITE_URL`, forwarded to PostKing's landing-pages
 * API as `?host=` — see lib/postking.ts's doc comment on `landingPageUrl`
 * for why. */
export const siteHost = new URL(siteUrl).hostname;
