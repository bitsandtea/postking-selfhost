import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isBannedPath } from "@/lib/security";

/**
 * Root request filter for scanner/bot noise (`/.env`, `/wp-admin`,
 * `/.git/config`, `/xmlrpc.php`, …) — returns a plain 404 before any route
 * (and therefore before any PostKing API call) runs.
 *
 * Named `proxy.ts` / exports `proxy`, not `middleware.ts` — Next 16.2.3
 * (this starter's pinned version) still accepts `middleware.ts`, but the
 * build compiler (`node_modules/next/dist/build/index.js`) warns that the
 * "middleware" file convention is deprecated in favor of "proxy" (see
 * https://nextjs.org/docs/messages/middleware-to-proxy), and the two file
 * conventions are mutually exclusive (having both is a build error).
 * universal-lp's `middleware.ts` does the same job under the old name.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isBannedPath(pathname) || isBannedPath(safeDecode(pathname))) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

/** `/%2Eenv` must match like `/.env`; malformed escapes fall back to raw. */
function safeDecode(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

// Runs on every request except static/image optimization assets — those are
// never scanner targets and don't need the banned-path check. Everything
// else (including `/api/tools/{slug}/execute`, `/blog`, `/tools/{slug}`,
// `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and any
// side-page slug) passes through `isBannedPath` above and falls through
// untouched, since none of those match a banned pattern.
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
