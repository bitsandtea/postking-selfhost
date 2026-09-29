/**
 * Tool result/handoff template renderer.
 *
 * Mustache-style `{{path.to.value}}` substitution only: dotted paths into
 * the client API's JSON response, plus `{{input.<key>}}` into the visitor's
 * own form submission. No loops, no conditionals — `{{#...}}` / `{{/...}}`
 * are left literal on purpose.
 *
 * Copied verbatim from ../PostKing/src/services/tools/resultTemplate.ts
 * (also mirrored in ../universal-lp/lib/resultTemplate.ts). None of these
 * repos share packages, so the body below this header comment must stay
 * byte-identical to that source. Port changes there, not here, and re-copy.
 * Do not add imports — this file is executed directly by
 * `scripts/test-tools.ts` via `node --experimental-strip-types`.
 */

export interface RenderTemplateContext {
  response: unknown;
  input: Record<string, unknown>;
}

const TOKEN_RE = /\{\{\s*([^{}]*?)\s*\}\}/g;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Resolves one trimmed `{{path}}` token against the render context. */
function resolveToken(
  path: string,
  ctx: RenderTemplateContext
): { value: string; missing: boolean } {
  const raw = path.startsWith("input.")
    ? getByPath(ctx.input, path.slice("input.".length))
    : getByPath(ctx.response, path);

  if (raw === undefined || raw === null) return { value: "", missing: true };
  if (typeof raw === "object") return { value: "", missing: true };
  return { value: String(raw), missing: false };
}

function substitute(
  template: string,
  ctx: RenderTemplateContext,
  format: (value: string) => string
): { text: string; missingKeys: string[] } {
  const missingKeys: string[] = [];
  const text = template.replace(TOKEN_RE, (full, rawPath: string) => {
    const path = rawPath.trim();
    // Structural tags ({{#if}}, {{/if}}, {{#each}}, {{/each}}) are out of
    // scope — leave them exactly as written rather than resolving them.
    if (path.startsWith("#") || path.startsWith("/")) return full;
    const { value, missing } = resolveToken(path, ctx);
    if (missing) missingKeys.push(path);
    return format(value);
  });
  return { text, missingKeys };
}

/**
 * Matches every `href="..."` attribute in the rendered HTML string. This is
 * a regex over a string, not a real HTML tokenizer — that is unsound in
 * general, but it is sound HERE specifically because: (1) the template
 * reaching this function was already sanitized at write time on PostKing
 * (`src/lib/blocks/sanitizeBlockHtml.ts`), and for tool result templates
 * only `<a href>` carries a URL-bearing attribute at all; and (2)
 * `escapeHtml` above has already turned every literal `"` a substituted
 * value could contain into `&quot;`, so nothing substituted into the
 * template can inject a stray `"` that would desync this regex from what a
 * real tokenizer would see. Do not reuse this pattern on HTML whose
 * write-time shape isn't already constrained this way.
 */
const HREF_RE = /href="([^"]*)"/g;

/**
 * True for a rendered `href` value that's safe to show to a visitor:
 * absolute `http:`/`https:`, a site-relative `/path` (not a
 * `//protocol-relative` URL), a `#anchor`, or a `mailto:` address.
 * Deliberately broader than `handoffUrlSafety.ts`'s `isSafeFinalUrl`, which
 * only ever accepts `http:`/`https:` because it resolves every value against
 * a placeholder `https://` base for a client-side redirect — a rendered
 * result-template link legitimately points at an in-page anchor, an in-app
 * relative path, or a `mailto:` address too, not just an outbound URL.
 */
function isSafeRenderedHref(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  // Browsers treat "\" as "/" for special schemes, so a value like
  // "/\evil.com" is NOT the site-relative path it looks like here — it
  // resolves to "https://evil.com/" once a browser parses it. Reject any
  // backslash outright, before the "/"-prefix branch below can wave it
  // through as site-relative.
  if (trimmed.includes("\\")) return false;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Replaces every `href="..."` whose value isn't `isSafeRenderedHref` with
 *  `href="#"`, in place, after substitution has already run. */
function scrubUnsafeHrefs(html: string): string {
  return html.replace(HREF_RE, (full, value: string) =>
    isSafeRenderedHref(value) ? full : 'href="#"'
  );
}

/**
 * Renders a result template into sanitizer-safe HTML (values escaped), then
 * scrubs every `href` whose filled-in value isn't a safe URL. This is the
 * render-time half of the whole-value `{{placeholder}}` href opt-in: the
 * write-time sanitizer on PostKing trusts the placeholder token itself (it
 * can't know what the tool owner's endpoint will return), so this is where
 * the actual resolved value gets checked before a visitor ever sees it —
 * this renderer never re-sanitizes beyond this.
 */
export function renderToolTemplate(
  template: string,
  ctx: RenderTemplateContext
): { html: string; missingKeys: string[] } {
  const { text, missingKeys } = substitute(template, ctx, escapeHtml);
  const html = scrubUnsafeHrefs(text);
  return { html, missingKeys };
}

/** A template that is nothing but one placeholder — the resolved value IS the
 *  whole URL, so percent-encoding it would destroy its scheme and slashes. */
const WHOLE_URL_TOKEN_RE = /^\s*\{\{[^{}]+\}\}\s*$/;

/**
 * Fills a handoff URL template, URL-encoding every substituted value — except
 * when the template is a single placeholder standing in for the entire URL,
 * which is passed through raw. Callers gate the filled result with
 * `isSafeFinalUrl` either way.
 */
export function fillTemplateString(template: string, ctx: RenderTemplateContext): string {
  const format = WHOLE_URL_TOKEN_RE.test(template)
    ? (value: string) => value.trim()
    : encodeURIComponent;
  return substitute(template, ctx, format).text.trim();
}
