import type { RawHtmlPayload } from "@/types/landing-page";

/**
 * `renderMode: "raw_html"` — an imported page whose body is the customer's
 * own HTML (see PostKing's `RawHtmlPayload`/universal-lp's `RawHtmlPage.tsx`
 * + `RawShellChrome.tsx`). Rendered as trusted content, same trust level as
 * a blog article body (`lib/html.ts`'s `stripInlineJsonLd`) — it's the
 * customer's own imported markup, not third-party/user-submitted input.
 *
 * Known, documented gap: universal-lp additionally hoists `rawHtml.head`
 * (`<link>`/`<meta>`/`<title>`) into the real `<head>` and re-executes
 * `rawHtml.scripts[]` client-side after mount. This starter is a static,
 * server-rendered reference — there's no client JS layer to replay scripts
 * into, and Next's typed `generateMetadata` API has no clean way to splice
 * an arbitrary HTML string into `<head>` — so `head`/`scripts` are not
 * reproduced here. The imported page's body content still renders in full.
 */
export function RawHtmlPage({ rawHtml }: { rawHtml: RawHtmlPayload | undefined }) {
  const body = rawHtml?.body;
  if (!body) return null;
  // eslint-disable-next-line react/no-danger -- the customer's own imported page HTML
  return <div className="pk-raw-html" dangerouslySetInnerHTML={{ __html: body }} />;
}
