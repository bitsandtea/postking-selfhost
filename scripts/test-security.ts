/**
 * Smoke test for lib/security.ts — no test runner, just node:assert.
 * Run with: node --experimental-strip-types scripts/test-security.ts
 */
import assert from "node:assert/strict";
import { isBannedPath, isValidSidePageSlug } from "../lib/security.ts";

let passed = 0;
function check(label: string, actual: boolean, expected: boolean): void {
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  passed += 1;
}

// --- isBannedPath: scanner/attack paths must be banned ---
// Mirrors universal-lp's lib/security.ts exactly (BANNED_PATTERNS/
// BANNED_STRINGS, ported verbatim) — including its gaps. A handful of
// leading-dot paths that look like they should be banned actually aren't,
// because the source module's patterns are anchored without accounting for
// a leading "/" and the strings list doesn't cover them either: "/.svn",
// "/.hg", "/.htaccess", "/debug", "/package-lock.json" all currently pass
// through. Left as-is (not "fixed") to stay faithful to the source of
// truth; not asserted here as banned since that would contradict the
// ported behavior this test is meant to verify.
const bannedPaths = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.git/config",
  "/.git",
  "/wp-admin",
  "/wp-admin/",
  "/wp-admin/install.php",
  "/wp-login.php",
  "/wp-content/uploads",
  "/wp-includes/wlwmanifest.xml",
  "/wp-config.php",
  "/xmlrpc.php",
  "/phpmyadmin",
  "/phpinfo.php",
  "/info.php",
  "/test.php",
  "/config.php",
  "/config.bak",
  "/_debugbar",
  "/.aws",
  "/aws-credentials",
  "/aws.json",
  "/.s3cfg",
  "/composer.json",
  "/composer.lock",
  "/package.json",
  "/yarn.lock",
  "/pnpm-lock.yaml",
  "/admin",
  "/admin/login",
  "/backend",
];
for (const path of bannedPaths) {
  check(`isBannedPath(${path}) is banned`, isBannedPath(path), true);
}

// --- isBannedPath: legit starter routes must NOT be banned ---
const allowedPaths = [
  "/",
  "/pricing",
  "/features",
  "/blog",
  "/blog/how-we-shipped-this",
  "/blog/category/product-updates",
  "/tools/roi-calculator",
  "/api/tools/roi-calculator/execute",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/favicon.ico",
  "/blog/category/backend-development",
  "/site-admin-comparison",
  "/.well-known/acme-challenge/abc123",
];
for (const path of allowedPaths) {
  check(`isBannedPath(${path}) is allowed`, isBannedPath(path), false);
}

// --- isValidSidePageSlug: valid single-segment slugs ---
const validSlugs = ["pricing", "features", "roi-calculator", "about-us-2024", "a", "x".repeat(80)];
for (const slug of validSlugs) {
  check(`isValidSidePageSlug(${slug}) is valid`, isValidSidePageSlug(slug), true);
}

// --- isValidSidePageSlug: invalid slugs (dots, extensions, oversized, charset) ---
const invalidSlugs = [
  "",
  ".env",
  "config.php",
  "index.html",
  "wp-admin.php",
  "Pricing",
  "under_score",
  "has space",
  "has/slash",
  "has~tilde",
  "x".repeat(81),
];
for (const slug of invalidSlugs) {
  check(`isValidSidePageSlug(${JSON.stringify(slug)}) is invalid`, isValidSidePageSlug(slug), false);
}

console.log(`security: ${passed} checks passed`);
