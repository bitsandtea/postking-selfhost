import type { PromotedSidePage, PromotedSidePageCtaStyle } from "@/types/blog";
import { isSafeFinalUrl } from "@/lib/handoffUrlSafety";

interface PromotedSidePageCtaProps {
  sidePage: PromotedSidePage;
  /**
   * "strong" (default/absent) = full bordered card — the legacy single
   * `promotedSidePage` and every pre-style `promotedSidePages[]` entry carry
   * no `style` field and must keep rendering this way (back-compat). "light"
   * = compact editorial callout that blends into the article flow. Mirrors
   * universal-lp's `components/Blog/PromotedSidePageCta.tsx`, restyled to
   * this starter's plain `.button`-link convention (no theming, no pill
   * buttons — see app/globals.css).
   */
  style?: PromotedSidePageCtaStyle;
}

/**
 * Renders a single promoted-side-page CTA card. Shared by:
 *  - the legacy single CTA rendered below the article body
 *    (`post.promotedSidePage`, always "strong"), and
 *  - each anchored CTA in the `post.promotedSidePages` multi-CTA list
 *    (`style` per-entry).
 *
 * `sidePage.ctaHref` is rendered as-is — it's normally this site's own
 * relative side-page path (`/{slug}`), but a customer can point a CTA at a
 * genuinely external URL via PostKing's CTA tools, so it's never rewritten
 * (contrast `ConversionPillCard`, whose `targetUrl` is always internal and
 * IS rewritten — see `lib/blog-index.ts`'s `localPathFromUrl`). Non-http(s)
 * schemes (`data:`, `vbscript:`) are dropped — React only blocks `javascript:`.
 */
export default function PromotedSidePageCta({ sidePage, style }: PromotedSidePageCtaProps) {
  const light = style === "light";
  if (!isSafeFinalUrl(sidePage.ctaHref)) return null;
  return (
    <aside className={light ? "pk-cta pk-cta-light" : "pk-cta"}>
      {sidePage.ctaHeader && <p className="pk-cta-header">{sidePage.ctaHeader}</p>}
      <p className="pk-cta-body">{sidePage.ctaText}</p>
      <a className="button" href={sidePage.ctaHref}>
        {sidePage.ctaButtonText || sidePage.name}
      </a>
    </aside>
  );
}
