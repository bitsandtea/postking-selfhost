import type { CustomHtmlSection } from "@/types/landing-page";

/**
 * A freeform `content.customHtml:<id>` section (PostKing feature 117; see
 * universal-lp `components/CustomHtml.tsx`). `section` is already the
 * resolved `content.customHtml[id]` entry — the dispatcher in
 * `components/sections/index.tsx` looks it up before calling this
 * component, since `customHtml:<id>` is never itself a `content` key.
 *
 * Renders verbatim: PostKing sanitizes this markup at WRITE time
 * (`sanitizeBlockHtml`, author mode, reject-not-strip) — the same trust
 * level as a blog article body or a Tier 3 side-page block. This component
 * must NOT re-sanitize or strip anything. Note for docs: a browser never
 * executes a `<script>` tag injected via `dangerouslySetInnerHTML` (same
 * mechanism universal-lp's own `HtmlBlock` uses) — an author relying on an
 * inline `<script>` in a customHtml section won't see it run here, same as
 * on universal-lp.
 *
 * Missing or empty entries (a stale `customHtml:<id>` left in `sectionOrder`
 * after the section was deleted) render nothing rather than garbage.
 */
export function CustomHtml({ section }: { section: CustomHtmlSection | undefined }) {
  const html = typeof section?.html === "string" ? section.html : "";
  if (!html) return null;

  // eslint-disable-next-line react/no-danger -- pre-sanitized at write time, same trust as a blog body
  return <div className="pk-raw-html" dangerouslySetInnerHTML={{ __html: html }} />;
}
