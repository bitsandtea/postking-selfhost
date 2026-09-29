/**
 * Adds the scheme a human obviously omitted — nothing more.
 *
 * Copied verbatim from ../PostKing/src/utils/normalizeUrl.ts (also mirrored
 * byte-for-byte in ../universal-lp/lib/normalizeUrl.ts). None of these repos
 * share packages, so the body below this header comment must stay
 * byte-identical to that source. Port changes there, not here, and re-copy.
 * Do not add imports — this file is executed directly by
 * `scripts/test-tools.ts` via `node --experimental-strip-types`.
 *
 * Deliberately CONSERVATIVE — this is "add the scheme a human obviously
 * omitted", never "rewrite a URL we don't understand". Anything already
 * schemed, anything relative, anything that doesn't look like a host is
 * returned byte-for-byte unchanged; a caller-side validator is what rejects
 * a genuinely bad value, not this function inventing one.
 *
 * Pure, dependency-free — safe to import from client and server code alike.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  // Empty/whitespace means "cleared", not "invalid" — leave it exactly as
  // typed (including any whitespace) for the caller to treat as empty.
  if (trimmed === "") return input;

  // A value with a space anywhere isn't a URL or a bare host (a host has no
  // spaces) — it's prose, and prose is the caller's/validator's problem, not
  // ours to guess at.
  if (/\s/.test(trimmed)) return input;

  // `host:port` with no scheme, e.g. "localhost:3000" or
  // "postking.app:8080/path". This textually matches the generic scheme
  // regex below too (RFC 3986 scheme grammar allows letters/digits/+/-/.,
  // so both "localhost" and "postking.app" read as syntactically valid
  // scheme names), but what actually disambiguates "host:port" from
  // "scheme:rest" isn't whether the part before the colon has a dot — it's
  // what comes AFTER the colon: a real URI scheme is never followed by
  // nothing but a bare number (optionally then `/`, `?`, or `#`), because no
  // real-world scheme's content is purely numeric. DECISION: digits-only
  // right after the colon strongly imply "this is a port, and therefore a
  // host", so we prefix it (`https://postking.app:8080`) regardless of
  // whether the host part contains a dot.
  if (/^[a-z0-9.-]+:\d+(?:[/?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Already has an explicit scheme — http://, https://, mailto:, tel:,
  // ftp:, data:, or any other `scheme:` prefix. Never touch it, and in
  // particular never upgrade http:// to https:// — the user may be
  // pointing at a local or legacy host on purpose.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return input;

  // Protocol-relative: "//host/path" → "https://host/path".
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  // Site-relative path — legitimate in handoff URLs. Leave it alone.
  if (trimmed.startsWith("/")) return input;

  // A template placeholder supplies the whole URL (e.g. "{{redirectUrl}}").
  if (trimmed.startsWith("{{")) return input;

  // Otherwise, only prefix https:// when this looks like a host: a
  // dot-containing first segment before any `/`, `?`, or `#`. A bare word
  // ("localhost" alone, "run", "todo") or anything else that doesn't look
  // like a host is returned unchanged — silently inventing a URL out of
  // prose is worse than leaving it for the caller to reject.
  const firstSegment = trimmed.split(/[/?#]/, 1)[0] ?? "";
  if (!firstSegment.includes(".")) return input;

  return `https://${trimmed}`;
}
