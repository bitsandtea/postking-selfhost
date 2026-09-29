/**
 * Smoke test for lib/blog-cta-anchors.ts and lib/blog-render-links.ts — no
 * test runner (vitest isn't installed here), just node:assert. Ports the
 * relevant cases from universal-lp's `lib/blog-cta-anchors.test.ts`,
 * `lib/blog-render-links.test.ts`, and the pure-logic scenarios from
 * `components/Blog/ArticleBodyWithCtas.test.tsx` (that file itself renders
 * React to static markup — here the same scenarios are checked directly
 * against `resolveArticleCtaPlan` + `resolveConversionPillLayout`, which is
 * all `ArticleBodyWithCtas.tsx` actually calls).
 *
 * Run with: node --experimental-strip-types scripts/test-blog-ctas.ts
 */
import assert from "node:assert/strict";
import {
  LEGACY_PROMOTED_SIDE_PAGE_ID,
  findFirstTopLevelBlockEnd,
  resolveArticleCtaPlan,
  resolveCtaPlacements,
  splitArticleAtTopLevelH2,
  type AnchoredCta,
} from "../lib/blog-cta-anchors.ts";
import {
  resolveConversionPillLayout,
  splitAfterFirstBlock,
} from "../lib/blog-render-links.ts";
import type { ConversionPill, PromotedSidePage, PromotedSidePageCta } from "../types/blog.ts";

let passed = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  assert.deepEqual(actual, expected, `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  passed += 1;
}

// ---------------------------------------------------------------------------
// splitArticleAtTopLevelH2
// ---------------------------------------------------------------------------

check(
  "no h2 -> whole string is preamble",
  splitArticleAtTopLevelH2("<p>intro</p><p>more</p>"),
  { preamble: "<p>intro</p><p>more</p>", sections: [] }
);

check("empty input -> empty result", splitArticleAtTopLevelH2(""), { preamble: "", sections: [] });

{
  const html =
    "<p>intro</p>" +
    "<h2>First</h2><p>a</p>" +
    "<h2>Second</h2><p>b</p><p>c</p>" +
    "<h2>Third</h2><p>d</p>";
  const { preamble, sections } = splitArticleAtTopLevelH2(html);
  check("splits into preamble + per-h2 sections (preamble)", preamble, "<p>intro</p>");
  check("splits into preamble + per-h2 sections (sections)", sections, [
    "<h2>First</h2><p>a</p>",
    "<h2>Second</h2><p>b</p><p>c</p>",
    "<h2>Third</h2><p>d</p>",
  ]);
}

{
  const html = "<h2>First</h2><p>a</p><h2>Second</h2><p>b</p>";
  const { preamble, sections } = splitArticleAtTopLevelH2(html);
  check("no preamble when article starts with h2 (preamble)", preamble, "");
  check("no preamble when article starts with h2 (sections)", sections, [
    "<h2>First</h2><p>a</p>",
    "<h2>Second</h2><p>b</p>",
  ]);
}

{
  const html =
    "<h2>First</h2>" +
    '<div class="callout"><h2>Not a real section</h2><p>nested</p></div>' +
    "<h2>Second</h2><p>b</p>";
  const { sections } = splitArticleAtTopLevelH2(html);
  check("nested h2 inside a div is not a boundary (count)", sections.length, 2);
  check(
    "nested h2 inside a div is not a boundary (section 0)",
    sections[0],
    "<h2>First</h2>" + '<div class="callout"><h2>Not a real section</h2><p>nested</p></div>'
  );
}

{
  const html =
    "<h2>First</h2>" +
    "<table><tbody><tr><td><h2>table h2</h2></td></tr></tbody></table>" +
    "<h2>Second</h2>";
  const { sections } = splitArticleAtTopLevelH2(html);
  check("h2 inside a table is not a boundary", sections.length, 2);
  assert.ok(sections[0]?.includes("table h2"), "table h2 stays folded into section 0");
  passed += 1;
}

{
  const html =
    "<h2>First</h2>" +
    "<script>const s = '<h2>fake</h2>';</script>" +
    "<style>.x::before{content:'<h2>'}</style>" +
    "<h2>Second</h2>";
  check("h2-like string inside script/style is ignored", splitArticleAtTopLevelH2(html).sections.length, 2);
}

{
  const html = '<h2>First</h2><p>a</p><img src="x.png"><hr><br>' + "<h2>Second</h2>";
  const { sections } = splitArticleAtTopLevelH2(html);
  check("void elements between sections don't break the split (count)", sections.length, 2);
  check(
    "void elements between sections don't break the split (section 0)",
    sections[0],
    '<h2>First</h2><p>a</p><img src="x.png"><hr><br>'
  );
}

{
  const html = "<h2>First</h2><br/><h2>Second</h2>";
  check("XHTML-style self-closing void element", splitArticleAtTopLevelH2(html).sections.length, 2);
}

// ---------------------------------------------------------------------------
// resolveCtaPlacements
// ---------------------------------------------------------------------------

const cta = (id: string, anchor: AnchoredCta["anchor"]): AnchoredCta => ({ id, anchor });

{
  const result = resolveCtaPlacements([cta("a", { type: "end" })], 3);
  check("end-anchored CTA buckets into end", result.end.map((c) => c.id), ["a"]);
  check("end-anchored CTA leaves afterSection empty", result.afterSection, [[], [], []]);
}

{
  const result = resolveCtaPlacements([cta("a", { type: "after_h2", index: 1 })], 3);
  check("after_h2 CTA buckets into matching section", (result.afterSection[1] ?? []).map((c) => c.id), ["a"]);
  check("after_h2 CTA: other sections stay empty", result.afterSection[0], []);
  check("after_h2 CTA: end stays empty", result.end, []);
}

{
  const result = resolveCtaPlacements(
    [cta("too-high", { type: "after_h2", index: 5 }), cta("negative", { type: "after_h2", index: -1 })],
    3
  );
  check("out-of-range after_h2 index falls back to end", result.end.map((c) => c.id), ["too-high", "negative"]);
}

{
  const malformed = { id: "no-anchor" } as unknown as AnchoredCta;
  const result = resolveCtaPlacements([malformed], 2);
  check("malformed/missing anchor falls back to end", result.end.map((c) => c.id), ["no-anchor"]);
}

{
  const result = resolveCtaPlacements(
    [cta("first", { type: "after_h2", index: 0 }), cta("second", { type: "after_h2", index: 0 })],
    1
  );
  check("preserves input order within a bucket", (result.afterSection[0] ?? []).map((c) => c.id), ["first", "second"]);
}

{
  const result = resolveCtaPlacements([cta("a", { type: "after_h2", index: 0 })], 0);
  check("zero sections sends after_h2 CTAs to end (afterSection)", result.afterSection, []);
  check("zero sections sends after_h2 CTAs to end (end)", result.end.map((c) => c.id), ["a"]);
}

// ---------------------------------------------------------------------------
// resolveArticleCtaPlan
// ---------------------------------------------------------------------------

const HTML = "<p>intro</p><h2>One</h2><p>a</p><h2>Two</h2><p>b</p><h2>Three</h2><p>c</p>";

const legacy: PromotedSidePage = {
  id: "sp1",
  slug: "pricing",
  name: "Pricing",
  ctaHeader: "Legacy header",
  ctaText: "Legacy text",
  ctaHref: "/pricing",
  ctaButtonText: "See pricing",
};

const anchored = (
  id: string,
  anchor: PromotedSidePageCta["anchor"],
  style?: PromotedSidePageCta["style"]
): PromotedSidePageCta => ({ ...legacy, id, anchor, style });

const allRendered = (plan: ReturnType<typeof resolveArticleCtaPlan>) => [...plan.afterSection.flat(), ...plan.end];

check("neither field present -> nothing rendered", allRendered(resolveArticleCtaPlan({ postText: HTML })), []);

{
  const plan = resolveArticleCtaPlan({ postText: HTML, promotedSidePage: legacy });
  check("legacy CTA renders as a single end-anchored strong entry (afterSection)", plan.afterSection.flat(), []);
  check("legacy CTA renders as a single end-anchored strong entry (count)", plan.end.length, 1);
  check("legacy CTA renders as a single end-anchored strong entry (style)", plan.end[0]?.style, "strong");
  check("legacy CTA renders as a single end-anchored strong entry (href)", plan.end[0]?.ctaHref, "/pricing");
}

{
  const plan = resolveArticleCtaPlan({ postText: HTML, promotedSidePage: { ...legacy, id: "" } });
  check("legacy entry with blank id gets a usable key", plan.end[0]?.id, LEGACY_PROMOTED_SIDE_PAGE_ID);
}

{
  const plan = resolveArticleCtaPlan({
    postText: HTML,
    promotedSidePage: legacy,
    promotedSidePages: [anchored("multi", { type: "after_h2", index: 0 }, "light")],
  });
  const rendered = allRendered(plan);
  check("non-empty promotedSidePages ignores the legacy field entirely (count)", rendered.length, 1);
  check("non-empty promotedSidePages ignores the legacy field entirely (id)", rendered[0]?.id, "multi");
}

{
  const plan = resolveArticleCtaPlan({
    postText: HTML,
    promotedSidePage: legacy,
    promotedSidePages: [anchored("only-end", { type: "end" }, "strong")],
  });
  check(
    "legacy never renders alongside the list, even when the list is all end-anchored",
    allRendered(plan).map((c) => c.id),
    ["only-end"]
  );
}

{
  const plan = resolveArticleCtaPlan({ postText: HTML, promotedSidePage: legacy, promotedSidePages: [] });
  check("empty promotedSidePages falls back to the legacy CTA", plan.end[0]?.ctaHref, "/pricing");
}

{
  const plan = resolveArticleCtaPlan({
    postText: HTML,
    promotedSidePages: [
      anchored("s0", { type: "after_h2", index: 0 }, "light"),
      anchored("s2", { type: "after_h2", index: 2 }, "light"),
      anchored("e", { type: "end" }, "strong"),
    ],
  });
  check("anchored CTAs placed after their section, end kept separate (sections)", plan.sections.length, 3);
  check("anchored CTAs placed after their section, end kept separate (preamble)", plan.preamble, "<p>intro</p>");
  check("anchored CTAs placed after their section, end kept separate (section 0)", (plan.afterSection[0] ?? []).map((c) => c.id), ["s0"]);
  check("anchored CTAs placed after their section, end kept separate (section 1)", plan.afterSection[1], []);
  check("anchored CTAs placed after their section, end kept separate (section 2)", (plan.afterSection[2] ?? []).map((c) => c.id), ["s2"]);
  check("anchored CTAs placed after their section, end kept separate (end)", plan.end.map((c) => c.id), ["e"]);
}

{
  const plan = resolveArticleCtaPlan({
    postText: "<p>just a paragraph</p>",
    promotedSidePages: [anchored("a", { type: "after_h2", index: 0 }, "light")],
  });
  check("no top-level h2 -> every anchor sent to end", plan.end.map((c) => c.id), ["a"]);
}

// ---------------------------------------------------------------------------
// findFirstTopLevelBlockEnd / splitAfterFirstBlock
// ---------------------------------------------------------------------------

check("findFirstTopLevelBlockEnd: empty input -> null", findFirstTopLevelBlockEnd(""), null);
check("findFirstTopLevelBlockEnd: no boundary at all -> null", findFirstTopLevelBlockEnd("plain text, no tags"), null);

{
  const html = "<p>intro</p><p>second</p>";
  const end = findFirstTopLevelBlockEnd(html);
  check("findFirstTopLevelBlockEnd: first top-level <p>", html.slice(0, end ?? 0), "<p>intro</p>");
}

check("splitAfterFirstBlock: empty input", splitAfterFirstBlock(""), { first: "", rest: "" });

check("splitAfterFirstBlock: splits after first <p>", splitAfterFirstBlock("<p>intro</p><p>second</p><p>third</p>"), {
  first: "<p>intro</p>",
  rest: "<p>second</p><p>third</p>",
});

check("splitAfterFirstBlock: leading h2, no preceding paragraph", splitAfterFirstBlock("<h2>First</h2><p>a</p>"), {
  first: "<h2>First</h2>",
  rest: "<p>a</p>",
});

check(
  "splitAfterFirstBlock: no top-level boundary falls back to whole string in `first`",
  splitAfterFirstBlock("plain text with no tags at all"),
  { first: "plain text with no tags at all", rest: "" }
);

// ---------------------------------------------------------------------------
// resolveConversionPillLayout
// ---------------------------------------------------------------------------

const pill = (position: ConversionPill["position"], id: string, anchor?: ConversionPill["anchor"]): ConversionPill => ({
  targetUrl: `/target-${id}`,
  anchorText: `anchor-${id}`,
  position,
  targetTitle: `Title ${id}`,
  targetType: "side_page",
  ...(anchor ? { anchor } : {}),
});

check("resolveConversionPillLayout: undefined/null/empty input", resolveConversionPillLayout(undefined, 3), {
  intro: null,
  afterSection: [null, null, null],
  afterBody: [],
});
check("resolveConversionPillLayout: null input, zero sections", resolveConversionPillLayout(null, 0), {
  intro: null,
  afterSection: [],
  afterBody: [],
});

{
  const introPill = pill("intro", "i");
  const result = resolveConversionPillLayout([introPill], 3);
  check("intro pill routed to `intro`", result.intro, introPill);
  check("intro pill leaves afterSection empty", result.afterSection, [null, null, null]);
}

{
  // 3 sections -> Math.floor(3/2) === 1 (the middle one).
  const midPill = pill("mid", "m");
  const result = resolveConversionPillLayout([midPill], 3);
  check("mid pill with no anchor lands at the middle section boundary", result.afterSection, [null, midPill, null]);
}

{
  const midPill = pill("mid", "m", { type: "after_h2", index: 0 });
  const result = resolveConversionPillLayout([midPill], 3);
  check("resolvable anchor on a mid pill wins over the middle-section default", result.afterSection, [midPill, null, null]);
}

{
  const midPill = pill("mid", "m", { type: "after_h2", index: 99 });
  const result = resolveConversionPillLayout([midPill], 3);
  check("out-of-range mid anchor falls back to the middle section", result.afterSection, [null, midPill, null]);
}

{
  const midPill = pill("mid", "m");
  const result = resolveConversionPillLayout([midPill], 0);
  check("no top-level h2 at all -> mid pill falls back to afterBody", result.afterBody, [midPill]);
}

{
  const ctaPill = pill("cta", "c");
  const result = resolveConversionPillLayout([ctaPill], 2);
  check("cta pill always routes to afterBody", result.afterBody, [ctaPill]);
}

{
  const introA = pill("intro", "ia");
  const introB = pill("intro", "ib");
  const midA = pill("mid", "ma");
  const midB = pill("mid", "mb");
  const ctaA = pill("cta", "ca");
  const ctaB = pill("cta", "cb");
  const result = resolveConversionPillLayout([introA, introB, midA, midB, ctaA, ctaB], 2);
  check("caps each position to its first pill, dropping the rest (intro)", result.intro, introA);
  check("caps each position to its first pill, dropping the rest (afterSection)", result.afterSection, [null, midA]);
  check("caps each position to its first pill, dropping the rest (afterBody)", result.afterBody, [ctaA]);
}

{
  const ctaPill = pill("cta", "c");
  const midFallback = pill("mid", "m");
  const result = resolveConversionPillLayout([ctaPill, midFallback], 0);
  check("afterBody orders the no-h2 mid fallback before the cta pill", result.afterBody, [midFallback, ctaPill]);
}

console.log(`blog-ctas: ${passed} checks passed`);
