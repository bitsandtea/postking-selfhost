import { Fragment } from "react";
import { resolveArticleCtaPlan } from "@/lib/blog-cta-anchors";
import { resolveConversionPillLayout, splitAfterFirstBlock } from "@/lib/blog-render-links";
import type { ConversionPill, PromotedSidePage, PromotedSidePageCta as PromotedSidePageCtaType } from "@/types/blog";
import ConversionPillCard from "./ConversionPillCard";
import PromotedSidePageCta from "./PromotedSidePageCta";

interface ArticleBodyWithCtasProps {
  /** Article body HTML — already run through `stripInlineJsonLd` by the
   * caller (see app/blog/[slug]/page.tsx). */
  postText: string;
  promotedSidePage?: PromotedSidePage | null;
  promotedSidePages?: PromotedSidePageCtaType[];
  conversionPills?: ConversionPill[];
}

/** A raw article-body HTML chunk — the customer's own content. Plain
 * server-rendered div, no client-side enhancements (no lightbox/table-wrap
 * — those are client-only in universal-lp's BlogArticleBody and out of
 * scope here; this starter stays server-rendered and static). */
function Body({ html }: { html: string }) {
  if (!html) return null;
  // eslint-disable-next-line react/no-danger -- the customer's own article HTML from PostKing
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Renders the article body plus its CTA(s) and conversion pill(s), ported
 * from universal-lp's `components/Blog/ArticleBodyWithCtas.tsx` (source of
 * truth for this placement behaviour):
 *  - Legacy: a single `promotedSidePage` rendered once, below the whole
 *    body.
 *  - Multi-CTA: an ordered `promotedSidePages` list, each anchored either to
 *    `end` (same spot as the legacy single CTA) or to `after_h2` index N,
 *    rendered immediately after that top-level `<h2>` section.
 *  - Conversion pills: the `intro`-position pill splices in right after the
 *    article's first content block; the `mid`-position pill splices in
 *    after the middle top-level `<h2>` boundary (or its own anchored
 *    section, if it has one); the `cta`-position pill renders in the same
 *    "after the whole body" region as the `promotedSidePages` `end` CTAs.
 *    At most one pill per position.
 *
 * The two CTA fields are reconciled by `resolveArticleCtaPlan`, NOT here —
 * this component only ever sees the merged plan, so it has no branch
 * capable of rendering the legacy CTA and the list at the same time.
 */
export default function ArticleBodyWithCtas({
  postText,
  promotedSidePage,
  promotedSidePages,
  conversionPills,
}: ArticleBodyWithCtasProps) {
  const { preamble, sections, afterSection, end } = resolveArticleCtaPlan({
    postText,
    promotedSidePage,
    promotedSidePages,
  });

  // Section-aware placement for `conversionPills`, computed against the
  // EXACT SAME `sections` split above (same `postText`, one tokenizer pass)
  // — never re-split independently, so a pill and a promoted-side-page CTA
  // anchored to the same index always agree on which section that is.
  const pillPlacement = resolveConversionPillLayout(conversionPills, sections.length);

  const hasSectionSplice =
    afterSection.some((bucket) => bucket.length > 0) ||
    pillPlacement.afterSection.some((pill) => pill !== null);

  // Nothing is spliced anywhere mid-article — render the body as ONE block
  // (legacy path stays byte-identical to a plain dangerouslySetInnerHTML).
  if (!pillPlacement.intro && !hasSectionSplice) {
    return (
      <>
        <Body html={postText} />
        {end.map((cta, i) => (
          <PromotedSidePageCta key={`${i}-${cta.id}`} sidePage={cta} style={cta.style} />
        ))}
        {pillPlacement.afterBody.map((pill, i) => (
          <ConversionPillCard key={`${i}-${pill.targetUrl}`} pill={pill} />
        ))}
      </>
    );
  }

  // Split the preamble further so the `intro` pill can splice in right
  // after the article's first content block. Degrades to
  // `{ first: preamble, rest: "" }` (pill renders after the whole preamble,
  // right before the first <h2>) when no top-level boundary is found.
  const { first: preambleFirstBlock, rest: preambleRest } = pillPlacement.intro
    ? splitAfterFirstBlock(preamble)
    : { first: preamble, rest: "" };

  return (
    <>
      <Body html={preambleFirstBlock} />
      {pillPlacement.intro && <ConversionPillCard pill={pillPlacement.intro} />}
      <Body html={preambleRest} />

      {sections.map((sectionHtml, i) => {
        const sectionPill = pillPlacement.afterSection[i] ?? null;
        const sectionCtas = afterSection[i] ?? [];
        return (
          <Fragment key={`${i}-section`}>
            <Body html={sectionHtml} />
            {sectionPill && <ConversionPillCard pill={sectionPill} />}
            {sectionCtas.map((cta, j) => (
              <PromotedSidePageCta key={`${j}-${cta.id}`} sidePage={cta} style={cta.style} />
            ))}
          </Fragment>
        );
      })}

      {end.map((cta, i) => (
        <PromotedSidePageCta key={`${i}-${cta.id}`} sidePage={cta} style={cta.style} />
      ))}
      {pillPlacement.afterBody.map((pill, i) => (
        <ConversionPillCard key={`${i}-${pill.targetUrl}`} pill={pill} />
      ))}
    </>
  );
}
