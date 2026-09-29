import type { JsonRecord } from "@/types/landing-page";

/**
 * `_meta.sidePageType === "text"` (e.g. a Contact or Legal page) — mirrors
 * universal-lp's own `TextSidePage.tsx`: renders ONLY `title` + `htmlContent`.
 *
 * This is deliberate, not a leak-avoidance shortcut: the wire payload for a
 * "text" page still carries the ROOT LP's full `hero`/`pricing`/`features`/
 * `cta`/`faq`/etc. verbatim inside `content` (PostKing's
 * `sidePageRenderer.ts` returns a text page's own standalone `content`
 * unmerged, but the DB row's `overrides` for these particular pages happen
 * to still hold that older, full section set) — showing all of that on a
 * Contact/Legal page would duplicate the homepage under a page whose whole
 * point is to be a short, standalone note. universal-lp's own renderer
 * discards it too; this starter matches that, rather than rendering
 * everything the generic walk happens to find.
 */
export function TextSidePage({ content }: { content: JsonRecord }) {
  const title = typeof content.title === "string" ? content.title : undefined;
  const htmlContent = typeof content.htmlContent === "string" ? content.htmlContent : "";

  return (
    <div className="pk-container pk-article">
      {title && <h1>{title}</h1>}
      {/* eslint-disable-next-line react/no-danger -- the customer's own page HTML */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}
