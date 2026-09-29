import { localPathFromUrl } from "@/lib/blog-index";
import type { ConversionPill } from "@/types/blog";

interface ConversionPillCardProps {
  pill: ConversionPill;
  /** Generic CTA button label — the wire carries no dedicated button copy
   * for a pill (only `anchorText`/`targetTitle`, used for the header/body
   * text below), so every card shares this one label. */
  ctaLabel?: string;
}

/**
 * A single `ConversionPill` spliced into the article body at the position
 * `lib/blog-render-links.ts`'s `resolveConversionPillLayout` resolves for
 * it (see `components/blog/ArticleBodyWithCtas.tsx`, the only caller).
 * Mirrors universal-lp's `components/Blog/ConversionPillCard.tsx`
 * content-wise: plain bordered callout, `.button` link, no theming.
 *
 * `targetTitle` is the header (falling back to `anchorText` when absent);
 * `anchorText` is the short body text, omitted when identical to the
 * header (nothing left to say twice).
 */
export default function ConversionPillCard({ pill, ctaLabel = "Learn more" }: ConversionPillCardProps) {
  const header = pill.targetTitle || pill.anchorText;
  const bodyText = pill.anchorText && pill.anchorText !== header ? pill.anchorText : undefined;

  return (
    <aside className="pk-cta pk-cta-light">
      <p className="pk-cta-header">{header}</p>
      {bodyText && <p className="pk-cta-body">{bodyText}</p>}
      <a className="button" href={localPathFromUrl(pill.targetUrl)}>
        {ctaLabel}
      </a>
    </aside>
  );
}
