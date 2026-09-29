import { config } from "./config";

/**
 * Absolutizes a possibly-relative asset path against `POSTKING_IMAGE_BASE_URL`
 * (defaulting to the PostKing API origin) — mirrors universal-lp's
 * `lib/assets.ts` / `lib/env.ts` IMAGE_BASE_URL convention, without the CDN
 * migration machinery (this app never needs per-directory routing, just one
 * base origin). Absolute URLs and data URIs pass through untouched.
 */
export function absolutizeAssetUrl(value: string): string {
  if (!value) return value;
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${config.imageBaseUrl}${value}`;
  }
  return value;
}
