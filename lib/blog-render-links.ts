// Render-link contract (blog internal linking) — placement logic ported
// from universal-lp's `lib/blog-render-links.ts` (source of truth).
//
// A `ConversionPill` renders as a bordered inline callout spliced directly
// into the article body, keyed off its coarse `position` label:
//
//  - `intro`  → right after the first content block (first top-level
//               paragraph/element) of the article, via
//               `splitAfterFirstBlock`/`findFirstTopLevelBlockEnd`.
//  - `mid`    → at the MIDDLE top-level `<h2>` boundary of the article
//               (`Math.floor(sectionCount / 2)`), UNLESS the pill carries a
//               resolvable `after_h2` anchor, which wins (a specific hint
//               beats the generic default).
//  - `cta`    → the same "after the whole body" region `promotedSidePages`'
//               `end` anchor already renders in.
//
// At most ONE pill renders per position — `resolveConversionPillLayout`
// takes the FIRST pill for each position and silently drops the rest.
//
// Both split helpers degrade gracefully on malformed/unexpected HTML: no
// resolvable top-level boundary ⇒ the pill falls back to rendering after the
// whole body/section instead of splitting mid-string — never throws, never
// corrupts the HTML.
//
// Pure logic (no React), alias-free import (relative path + `.ts`
// extension) so scripts/test-blog-ctas.ts can import this module directly
// with `node --experimental-strip-types`.

import type { ConversionPill } from "../types/blog.ts";
import { findFirstTopLevelBlockEnd } from "./blog-cta-anchors.ts";

export interface SplitFirstBlockResult {
  /** HTML through the end of the first top-level element (may be the whole string when no boundary was found — see below). */
  first: string;
  /** Everything after `first` (empty when no boundary was found). */
  rest: string;
}

/**
 * Splits `html` right after its first top-level element closes. Falls back
 * to `{ first: html, rest: "" }` when no top-level boundary is found at all
 * (empty input, or content with no wrapping tags) — that fallback is itself
 * a safe placement: a caller inserting content between `first` and `rest`
 * degrades to inserting it after the whole string, never mid-tag.
 */
export function splitAfterFirstBlock(html: string): SplitFirstBlockResult {
  if (!html) return { first: "", rest: "" };

  const end = findFirstTopLevelBlockEnd(html);
  if (end === null) return { first: html, rest: "" };

  return { first: html.slice(0, end), rest: html.slice(end) };
}

export interface ConversionPillLayoutPlacement {
  /** Renders once, right after the article's first content block. */
  intro: ConversionPill | null;
  /**
   * `afterSection[i]` renders immediately after top-level section `i` (the
   * same split `resolveArticleCtaPlan` uses for `promotedSidePages`). At
   * most one non-null entry — the single `mid`-position pill, if any.
   */
  afterSection: (ConversionPill | null)[];
  /**
   * Renders once, after the whole body — the `cta`-position pill, plus the
   * `mid`-position pill as a fallback when the article has no top-level
   * `<h2>` at all (nothing to splice against). Fallback ordered before the
   * `cta` pill.
   */
  afterBody: ConversionPill[];
}

/**
 * Resolves the FULL `conversionPills` list (any mix of positions) into a
 * ready-to-render layout, given how many top-level `<h2>` sections the
 * article's body HTML split into (`sections.length` from
 * `resolveArticleCtaPlan`/`splitArticleAtTopLevelH2` — callers must pass the
 * SAME count so a pill and a `promotedSidePages` card anchored to the same
 * index agree on which section that is).
 *
 * Caps each position to its first pill — "at most one pill per position" —
 * silently dropping any additional pills sharing a position.
 */
export function resolveConversionPillLayout(
  pills: ConversionPill[] | null | undefined,
  sectionCount: number
): ConversionPillLayoutPlacement {
  const list = pills ?? [];
  const intro = list.find((pill) => pill.position === "intro") ?? null;
  const mid = list.find((pill) => pill.position === "mid") ?? null;
  const cta = list.find((pill) => pill.position === "cta") ?? null;

  const afterSection: (ConversionPill | null)[] = Array.from(
    { length: sectionCount },
    () => null
  );
  const afterBody: ConversionPill[] = [];

  if (mid) {
    const anchor = mid.anchor;
    const anchoredIndex =
      anchor?.type === "after_h2" &&
      Number.isInteger(anchor.index) &&
      anchor.index >= 0 &&
      anchor.index < sectionCount
        ? anchor.index
        : null;

    if (sectionCount === 0) {
      // No top-level <h2> at all — nothing to splice against.
      afterBody.push(mid);
    } else {
      const index = anchoredIndex ?? Math.floor(sectionCount / 2);
      afterSection[index] = mid;
    }
  }

  if (cta) afterBody.push(cta);

  return { intro, afterSection, afterBody };
}
