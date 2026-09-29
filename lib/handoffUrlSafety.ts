/**
 * Handoff/redirect URL safety — guards against `javascript:`/`data:`/other
 * dangerous URL schemes reaching `window.location.assign()` or an
 * `<a href>` once a tool result is rendered.
 *
 * `isSafeFinalUrl` is copied verbatim from
 * ../PostKing/src/services/tools/handoffUrlSafety.ts (also mirrored in
 * ../universal-lp/lib/handoffUrlSafety.ts). None of these repos share
 * packages, so the body below this header comment must stay byte-identical
 * to that source. Port changes there, not here, and re-copy. Do not add
 * imports.
 *
 * `isSafeHandoffTemplate` (the write-time check on `Tool.handoffUrl`) is
 * intentionally NOT ported here — this renderer never writes a `handoffUrl`,
 * it only ever renders the already-validated one PostKing's `GET
 * /api/tools/{slug}` hands back, so only the render-time check applies.
 */

/**
 * True when a fully-filled URL (placeholders already substituted) is safe to
 * navigate to: it must parse as a URL — relative paths resolve against a
 * placeholder base — and its protocol must be `http:` or `https:`. Rejects
 * `javascript:`, `data:`, `vbscript:`, and any other non-http(s) scheme.
 */
export function isSafeFinalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return false;
  try {
    const parsed = new URL(trimmed, "https://placeholder.invalid");
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
