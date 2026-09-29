/**
 * Security utilities: banned-path detection for bot/scanner traffic, and
 * side-page slug validation. Pure, no imports — safe to use from the root
 * `proxy.ts` (edge runtime) and from `app/[page]/page.tsx` alike.
 *
 * `isBannedPath` is ported from universal-lp's `lib/security.ts` (source of
 * truth for this behavior), with the two self-hosting changes noted at
 * BANNED_PREFIXES.
 */

const BANNED_PATTERNS = [
  // Environment and config files
  /^\.env/i,
  /\.env(\..+)?$/i,
  /config(\..+)?\.(php|js|json|bak|save|backup)$/i,
  /wp-config/i,

  // Version control
  /^\.git/i,
  /\.git\//i,
  /^\.svn/i,
  /^\.hg/i,

  // Server and language info
  /phpinfo/i,
  /info\.php$/i,
  /test\.php$/i,
  /\.php$/i,
  /^\.htaccess/i,

  // Debugging tools
  /_?debugbar/i,
  /^debug$/i,

  // Cloud and credentials
  /^\.aws/i,
  /aws-credentials/i,
  /aws\.json/i,
  /^\.s3cfg/i,

  // Common CMS attack points
  /xmlrpc\.php/i,
  /wp-admin/i,
  /wp-content/i,
  /wp-includes/i,

  // Other sensitive files
  /composer\.(json|lock)$/i,
  /package\.(json|lock)$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
];

const BANNED_STRINGS = [
  ".env",
  ".git",
  ".aws",
  "wp-config.php",
  "phpinfo.php",
  "info.php",
  "_debugbar",
  ".s3cfg",
  "aws-credentials",
  "xmlrpc.php",
  "wp-login",
  "wp-admin",
  "phpmyadmin",
];

// Changed from universal-lp for self-hosting: `admin`/`backend` match only
// as a leading path segment (so `/blog/category/backend-development` still
// serves), and `/.well-known/` isn't banned (ACME HTTP-01 challenges).
const BANNED_PREFIXES = [/^\/(admin|backend)(\/|$)/i];

/**
 * Checks if a path (or path segment) matches a known scanner/attack
 * pattern — `/.env`, `/wp-admin`, `/.git/config`, `/xmlrpc.php`, etc.
 */
export function isBannedPath(path: string): boolean {
  if (!path) return false;

  // Check exact matches or common substrings first for speed
  const lowerPath = path.toLowerCase();
  if (BANNED_STRINGS.some((s) => lowerPath.includes(s))) {
    return true;
  }

  if (BANNED_PREFIXES.some((pattern) => pattern.test(lowerPath))) {
    return true;
  }

  // Check against regex patterns
  return BANNED_PATTERNS.some((pattern) => pattern.test(path));
}

// PostKing side-page slugs (`src/utils/sidePageSlugPath.ts` in the main
// PostKing repo) are lowercase alnum + hyphen per `/`-segment, capped at 80
// chars per segment at the call sites that generate them. This starter's
// `app/[page]/page.tsx` route only ever captures a single segment (no
// `[...page]` catch-all), so nested (2-segment, `~`-joined) side pages are
// out of scope here — a single-segment slug is the full validity check.
const SIDE_PAGE_SLUG_PATTERN = /^[a-z0-9-]+$/;
const MAX_SIDE_PAGE_SLUG_LENGTH = 80;

/**
 * True for a syntactically valid single-segment side-page slug: lowercase
 * letters, digits, and hyphens only, non-empty, at most 80 characters. This
 * already rejects dots (so file-extension paths like `.env` or `foo.php`
 * never reach `fetchLandingPage`), slashes, and uppercase.
 */
export function isValidSidePageSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.length > MAX_SIDE_PAGE_SLUG_LENGTH) return false;
  return SIDE_PAGE_SLUG_PATTERN.test(slug);
}
