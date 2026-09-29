// Blog CTA anchor placement — ported from universal-lp's
// `lib/blog-cta-anchors.ts` (source of truth for this behaviour). PostKing's
// `GET /api/blog-posts/{slug}` returns `post.promotedSidePages: Array<
// PromotedSidePage & { id: string; anchor }>` alongside the legacy single
// `post.promotedSidePage`. Each entry anchors either to "the end of the
// article" or to "immediately after the Nth top-level <h2> section" of
// `post.content`.
//
// Pure logic (no React), so it can be unit tested directly — see
// scripts/test-blog-ctas.ts. Import types via a relative path (no `@/`
// alias) so that plain `node --experimental-strip-types` script can import
// this module without a bundler resolving path aliases.

import type { PromotedSidePage, PromotedSidePageCta } from "../types/blog.ts";

export type CtaAnchor = { type: "after_h2"; index: number } | { type: "end" };

export interface AnchoredCta {
  id: string;
  anchor: CtaAnchor;
}

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// Elements whose text content must never be scanned for tags/h2s (a literal
// "<h2>" inside a <script> string or <style> rule must not be mistaken for a
// heading).
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

// Matches either an HTML comment or a single start/end tag. Group 1 is "/"
// for a close tag, group 2 is the tag name, group 3 is everything up to the
// closing ">" (used only to detect a trailing "/" for self-closing tags).
const TAG_OR_COMMENT_RE =
  /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;

export interface SplitArticleResult {
  /** Content before the first top-level <h2> (may be ""). */
  preamble: string;
  /**
   * One entry per top-level <h2>, each containing that h2 plus every
   * following node up to (not including) the next top-level <h2> — i.e.
   * "section N" is exactly the content an "after_h2 index N" anchor should
   * render after.
   */
  sections: string[];
}

/**
 * Splits article body HTML into a preamble + per-top-level-<h2> sections.
 *
 * This is a depth-tracking tokenizer, not a full HTML parser — it only
 * needs to know the nesting DEPTH at each point in the string to decide
 * whether an <h2> is a direct child of the content root ("top-level") or
 * nested inside some other element (a callout box, a table of contents,
 * etc.), which must NOT count as a section boundary.
 *
 * Malformed/mismatched markup degrades gracefully: depth can drift, in
 * which case a "real" top-level h2 later in the document may be folded into
 * the preceding section instead of starting a new one. It never throws and
 * never drops content — worst case is a coarser split, not a broken page.
 */
export function splitArticleAtTopLevelH2(html: string): SplitArticleResult {
  if (!html) return { preamble: "", sections: [] };

  const boundaries: number[] = [];
  let depth = 0;
  TAG_OR_COMMENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_OR_COMMENT_RE.exec(html))) {
    const full = match[0];
    if (full.startsWith("<!--")) continue; // comment — no depth change

    const isClose = match[1] === "/";
    const tagName = (match[2] ?? "").toLowerCase();
    const attrsAndSlash = match[3] ?? "";
    const isSelfClosing = attrsAndSlash.trimEnd().endsWith("/");

    if (isClose) {
      if (depth > 0) depth -= 1;
      continue;
    }

    if (RAW_TEXT_ELEMENTS.has(tagName) && !isSelfClosing) {
      // Jump past the raw-text element's content entirely — never scan
      // inside a <script>/<style> body for tags.
      const from = match.index + full.length;
      const closeRe = new RegExp(`<\\/${tagName}\\s*>`, "i");
      const closeMatch = closeRe.exec(html.slice(from));
      TAG_OR_COMMENT_RE.lastIndex = closeMatch
        ? from + closeMatch.index + closeMatch[0].length
        : html.length;
      continue;
    }

    if (tagName === "h2" && depth === 0) {
      boundaries.push(match.index);
    }

    if (!VOID_ELEMENTS.has(tagName) && !isSelfClosing) {
      depth += 1;
    }
  }

  if (boundaries.length === 0) {
    return { preamble: html, sections: [] };
  }

  const preamble = html.slice(0, boundaries[0]);
  const sections = boundaries.map((start, i) =>
    html.slice(start, boundaries[i + 1] ?? html.length)
  );
  return { preamble, sections };
}

/**
 * Returns the offset immediately after the FIRST top-level element in
 * `html` closes back to depth 0 — e.g. the end of the article's opening
 * `<p>`, or of a top-level `<h2>` if the content starts with one. Used to
 * splice content in right after "the first content block" (see
 * `blog-render-links.ts`'s `splitAfterFirstBlock`, for the `intro`-position
 * conversion pill).
 *
 * Same depth-tracking tokenizer as `splitArticleAtTopLevelH2` above (see its
 * doc comment for the malformed-markup degradation guarantee) — just exits
 * on the FIRST depth-0 boundary instead of collecting every top-level `<h2>`.
 *
 * Returns `null` when no top-level element boundary is found at all (empty
 * input, or content with no wrapping tags) — callers must treat that as
 * "nothing to split on", never throw or guess an offset.
 */
export function findFirstTopLevelBlockEnd(html: string): number | null {
  if (!html) return null;

  let depth = 0;
  let sawTopLevelElement = false;
  TAG_OR_COMMENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_OR_COMMENT_RE.exec(html))) {
    const full = match[0];
    if (full.startsWith("<!--")) continue; // comment — no depth change

    const isClose = match[1] === "/";
    const tagName = (match[2] ?? "").toLowerCase();
    const attrsAndSlash = match[3] ?? "";
    const isSelfClosing = attrsAndSlash.trimEnd().endsWith("/");

    if (RAW_TEXT_ELEMENTS.has(tagName) && !isClose && !isSelfClosing) {
      const from = match.index + full.length;
      const closeRe = new RegExp(`<\\/${tagName}\\s*>`, "i");
      const closeMatch = closeRe.exec(html.slice(from));
      const endIndex = closeMatch
        ? from + closeMatch.index + closeMatch[0].length
        : html.length;
      if (depth === 0) return endIndex;
      TAG_OR_COMMENT_RE.lastIndex = endIndex;
      continue;
    }

    if (isClose) {
      if (depth > 0) depth -= 1;
      if (depth === 0 && sawTopLevelElement) {
        return match.index + full.length;
      }
      continue;
    }

    if (depth === 0) {
      sawTopLevelElement = true;
      if (VOID_ELEMENTS.has(tagName) || isSelfClosing) {
        // A void/self-closing element sitting directly at depth 0 (e.g. a
        // bare top-level <img>) IS its own complete top-level block.
        return match.index + full.length;
      }
    }

    if (!VOID_ELEMENTS.has(tagName) && !isSelfClosing) {
      depth += 1;
    }
  }

  return null;
}

export interface CtaPlacements<T extends AnchoredCta> {
  /** `afterSection[i]` holds the CTAs anchored to `after_h2` index `i`, in input order. */
  afterSection: T[][];
  /** CTAs anchored to `end` — also the fallback bucket for any out-of-range or malformed anchor. */
  end: T[];
}

/**
 * Buckets a `promotedSidePages` list into "render after section N" groups
 * plus an "end" group, given how many top-level sections the article HTML
 * actually split into.
 *
 * An out-of-range `after_h2` index (>= sectionCount, or negative) falls
 * back to `end` placement rather than being dropped — a CTA must always
 * render somewhere. Missing/malformed anchors fall back the same way,
 * which also protects against any future anchor shape this renderer
 * doesn't understand yet.
 */
export function resolveCtaPlacements<T extends AnchoredCta>(
  ctas: readonly T[],
  sectionCount: number
): CtaPlacements<T> {
  const afterSection: T[][] = Array.from({ length: sectionCount }, () => []);
  const end: T[] = [];

  for (const cta of ctas) {
    const anchor = cta.anchor;
    const index = anchor?.type === "after_h2" ? anchor.index : undefined;
    if (
      anchor?.type === "after_h2" &&
      typeof index === "number" &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < sectionCount
    ) {
      afterSection[index]?.push(cta);
    } else {
      end.push(cta);
    }
  }

  return { afterSection, end };
}

// ---------------------------------------------------------------------------
// The single entry point every blog theme renders from
// ---------------------------------------------------------------------------

/**
 * React key for the synthetic entry built from the legacy single
 * `promotedSidePage`. That shape's `id` is the SIDE PAGE's id, which the API
 * serves as `""` whenever the CTA has no matched side page (a purely
 * generated CTA) — so it can't be trusted as a key.
 */
export const LEGACY_PROMOTED_SIDE_PAGE_ID = "legacy-promoted-side-page";

export interface ArticleCtaPlan {
  /** Article HTML before the first top-level `<h2>` (may be ""). */
  preamble: string;
  /** Per-top-level-`<h2>` article HTML chunks, in document order. */
  sections: string[];
  /** `afterSection[i]` renders immediately after `sections[i]`. */
  afterSection: PromotedSidePageCta[][];
  /** Renders after the whole body — where the legacy single CTA has always rendered. */
  end: PromotedSidePageCta[];
}

/**
 * Merges the two CTA fields the API serves into ONE ordered list.
 *
 * `promotedSidePages[]` wins outright when non-empty. The legacy
 * `promotedSidePage` is used ONLY as a fallback, and only then — because
 * `promotedSidePage` is a MIRROR of the list (the `end` entry, else the last
 * entry), rendering both would duplicate one of the list's own CTAs on
 * screen.
 *
 * Doing the merge here rather than in a component is the point: a theme
 * receives one list and physically cannot render both fields.
 */
function mergeCtaFields(
  promotedSidePages: readonly PromotedSidePageCta[] | undefined,
  promotedSidePage: PromotedSidePage | null | undefined
): PromotedSidePageCta[] {
  if (promotedSidePages && promotedSidePages.length > 0) {
    return [...promotedSidePages];
  }
  if (!promotedSidePage) return [];
  // Legacy CTA: end-anchored, always the full card — byte-identical to how
  // it rendered before multi-CTA existed.
  return [
    {
      ...promotedSidePage,
      id: promotedSidePage.id || LEGACY_PROMOTED_SIDE_PAGE_ID,
      anchor: { type: "end" },
      style: "strong",
    },
  ];
}

/**
 * Turns an article's body HTML plus whichever CTA fields the API returned
 * into a ready-to-render plan: where the body splits, and which CTAs go
 * after each section / at the end.
 *
 * This is the ONE entry point the renderer should call — it is what makes
 * "legacy and multi-CTA rendered simultaneously" unrepresentable rather than
 * merely avoided by convention.
 */
export function resolveArticleCtaPlan(args: {
  postText: string;
  promotedSidePage?: PromotedSidePage | null;
  promotedSidePages?: readonly PromotedSidePageCta[];
}): ArticleCtaPlan {
  const ctas = mergeCtaFields(args.promotedSidePages, args.promotedSidePage);
  const { preamble, sections } = splitArticleAtTopLevelH2(args.postText);
  const { afterSection, end } = resolveCtaPlacements(ctas, sections.length);
  return { preamble, sections, afterSection, end };
}
