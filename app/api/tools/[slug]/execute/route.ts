import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

/**
 * Thin same-origin proxy for `POST {POSTKING_API_URL}/api/tools/{slug}/execute`.
 *
 * Exists purely so the visitor's browser can POST to this site's own origin
 * (avoiding a cross-origin request to `POSTKING_API_URL`, which PostKing's
 * own execute route gates by CORS allow-list anyway — see PostKing's
 * `app/api/tools/[slug]/execute/route.ts`) and so the API origin itself
 * never has to be exposed to client JS. It is NOT an auth boundary: the
 * upstream route is public/no-auth, and this proxy forwards no secret.
 *
 * - The slug is validated against a strict allowlist before it ever touches
 *   a URL, and always `encodeURIComponent`-ed on top of that; the upstream
 *   origin comes only from `config.apiUrl` (never from request input), so
 *   there's no SSRF surface here — a caller can pick which *tool* runs, never
 *   which *host* this proxy talks to.
 * - Only the JSON body is forwarded, capped at 64 KB and re-stringified
 *   after parsing (never the raw bytes) — this also means a non-JSON or
 *   oversized body never reaches PostKing.
 * - Forwarded headers are limited to `content-type`, the visitor's IP
 *   (`x-forwarded-for`) and PostKing's guest-id cookie. PostKing's per-tool
 *   daily limit buckets callers by IP and that cookie; without them every
 *   proxied call looks like a brand-new guest and the limit never fires.
 *   The guest cookie PostKing mints is re-set on this site's own origin.
 *   Put this app behind a reverse proxy that sets `x-forwarded-for`, or the
 *   visitor can spoof it.
 * - The upstream's status and JSON body are passed through as-is (its error
 *   shapes are part of the public `ToolExecuteResponse` contract — see
 *   `types/tool.ts`), with 502/504 reserved for this proxy's own
 *   network/timeout failures.
 */

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 60_000;
const GUEST_COOKIE = "postking_tool_cid";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;

  if (!SLUG_RE.test(slug)) {
    return jsonError("Tool not found", 404);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Content-Type must be application/json", 400);
  }

  const rawBody = await readCappedBody(request);
  if (rawBody === null) {
    return jsonError("Request body too large", 413);
  }

  let body: unknown;
  try {
    body = rawBody === "" ? {} : JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError("Request body must be a JSON object", 400);
  }

  const upstreamUrl = `${config.apiUrl}/api/tools/${encodeURIComponent(slug)}/execute`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders(request),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError("The tool took too long to respond", 504);
    }
    return jsonError("Could not reach the tool endpoint", 502);
  }

  const responseText = await upstreamResponse.text();
  let responseJson: unknown;
  try {
    responseJson = responseText === "" ? null : JSON.parse(responseText);
  } catch {
    return jsonError("The tool returned an invalid response", 502);
  }

  const response = NextResponse.json(responseJson, { status: upstreamResponse.status });
  const guestId = upstreamGuestId(upstreamResponse);
  if (guestId) {
    response.cookies.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      maxAge: GUEST_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  }
  return response;
}

/** Reads the body, giving up (null) as soon as it passes MAX_BODY_BYTES —
 * never buffers an oversized upload in full. */
async function readCappedBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function upstreamHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  if (ip) headers["x-forwarded-for"] = ip;
  const guestId = request.cookies.get(GUEST_COOKIE)?.value;
  if (guestId && /^[a-z0-9]{1,64}$/i.test(guestId)) {
    headers.cookie = `${GUEST_COOKIE}=${guestId}`;
  }
  return headers;
}

/** The guest id PostKing minted for a first-time caller, if any. */
function upstreamGuestId(upstream: Response): string | null {
  for (const cookie of upstream.headers.getSetCookie()) {
    const match = new RegExp(`^${GUEST_COOKIE}=([a-z0-9]{1,64})(;|$)`, "i").exec(cookie);
    if (match?.[1]) return match[1];
  }
  return null;
}
