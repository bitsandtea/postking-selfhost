# 5. Customize the starter

The starter is deliberately plain: it lays content out and leaves the design to
you.

| To change | Look in |
|---|---|
| Colors, fonts, spacing | `app/globals.css` |
| How a landing-page section renders | `components/sections/` — one small component per section family (`Hero.tsx`, `Pricing.tsx`, `FAQ.tsx`, …), wired up by the dispatcher in `components/sections/index.tsx` |
| Shared section helpers (CTA links, avatars, slot media) | `components/sections/shared.tsx` |
| The fallback for a section type with no dedicated component | `components/Data.tsx`'s generic walk (headings, text, lists, links, media from field-name heuristics) |
| A comparison / spotlight / custom-blocks / plain-text side page | `components/ComparisonSidePage.tsx`, `SpotlightSidePage.tsx`, `CustomBlocksPage.tsx`, `TextSidePage.tsx` — dispatched by `_meta.sidePageType` in `app/[page]/page.tsx` |
| An imported `raw_html` page | `components/RawHtmlPage.tsx` |
| Slot media resolution + default/fallback assets | `lib/slots.ts`, `lib/default-assets.ts`, `public/defaults/` |
| Header and footer | `app/layout.tsx` (fetches once, renders both) and `components/Footer.tsx` |
| Blog pages | `app/blog/` |
| API calls and caching | `lib/postking.ts` |
| Env vars | `lib/config.ts` |

## Tips

- **Unknown sections still render.** A section type with no dedicated
  component under `components/sections/` falls back to a generic renderer in
  `components/Data.tsx` that shows its headings, text, lists, links and media
  from field-name heuristics — so new PostKing section types appear without a
  code change.
- **Keep the SEO output.** Metadata, canonical URLs, JSON-LD, the sitemap,
  `robots.txt` and `llms.txt` are all built from PostKing's data. Restyle
  freely, but keep those routes and `generateMetadata` calls.
- **Testing against a local PostKing over https.** `pnpm dev` trusts your local
  mkcert certificate authority automatically; see the README.

## Known limitations

This starter deliberately trades completeness for staying small and
server-rendered. Fork it and fill these in if you need them:

- **Other languages.** This starter has no `/xx/` language routes. It never
  emits `hreflang`/`alternates.languages` for a brand's other-language
  landing pages — every one of those pages lives on a different origin (its
  own `{slug}.postking.app` or verified custom domain, never this site's
  `SITE_URL`), so there's no same-origin URL to link to yet.
- **Slots.** An array-valued slot (a logo carousel, multiple showcase
  images) renders only its first image — no carousel.
- **Videos.** Shown as a poster-image thumbnail linking out to the source
  (currently YouTube only), never an embedded player.
- **Images.** Plain `<img>` tags throughout — no `next/image`, no
  resizing/optimization.
- **Custom blocks.** A `"custom"` side page's Tier-2 blocks (template
  strings in `blockTemplates`) aren't rendered. Tier-1 (normal section
  types) and Tier-3 (`type: "html"`) blocks are.
- **Raw-HTML pages.** An imported `raw_html` page's `body` renders in full,
  but its `head` (`<title>`/`<meta>`/`<link>`) and `scripts` aren't
  re-injected — there's no client JS layer here to replay them into.

Questions or feature requests: [postking.app](https://postking.app).
