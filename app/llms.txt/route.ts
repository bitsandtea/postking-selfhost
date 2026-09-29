import { NextResponse } from "next/server";
import { fetchLandingPageLlmsTxt } from "@/lib/postking";

/** Proxies PostKing's own per-landing-page llms.txt
 * (`{api}/api/landing-pages/{slug}/llms.txt`) — PostKing already builds and
 * caches this from the LP's real content, so we just pass it through rather
 * than reconstructing it from the JSON payload. */
export async function GET() {
  const text = await fetchLandingPageLlmsTxt();
  if (text === null) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
