import { NextResponse } from "next/server";
import { fetchLandingPage } from "@/lib/postking";

/** Serves the brand's own favicon (from `siteMetadata.favicon`) at the
 * conventional `/favicon.ico` URL — browsers and crawlers request this path
 * directly, bypassing the `<link rel="icon">` metadata on every page. */
export async function GET() {
  const data = await fetchLandingPage();
  const faviconUrl = data?.siteMetadata?.favicon;
  if (!faviconUrl) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.redirect(faviconUrl, { status: 307 });
}
