# 4. API reference

Three public, read-only endpoints serve everything this starter renders. No
API key — they only return **published** content. Build your own renderer on
them if this starter doesn't fit.

Base URL: `https://try.postking.app`

## Landing page

```
GET /api/landing-pages/{slug}?host={your-host}
GET /api/landing-pages/{slug}?host={your-host}&sidePage={side-page-slug}
```

- `host` — the hostname your site is served on (`localhost` while testing,
  your verified domain in production). Required outside localhost.
- `sidePage` — returns that side page instead of the main page.

Key fields in the response:

| Field | What it is |
|---|---|
| `content` | the sections: `hero`, `features`, `pricing`, `faq`, `cta`, `footer`, … |
| `sectionOrder` | the order to render sections in |
| `navigation` | header menu items |
| `siteMetadata` | title, description, Open Graph, favicon, noindex |
| `slotMap` / `assets` | images and videos — see below |
| `sitemap.routes` | the page and its side pages |
| `config` | page settings (theme, features) |

### Slots and assets

Media isn't inlined in `content`. Each section's images/videos are **slots**:

```json
"slotMap": { "main": { "header.logoLight": "asset-id", "hero.image": "asset-id" } },
"assets": [ { "id": "asset-id", "type": "IMAGE", "fileUrl": "https://…", "mimeType": "image/png" } ]
```

Look up the slot's id in `assets` and use `fileUrl`. The slot key tells you
where it goes: `header.logoLight` is the header logo, `hero.image` belongs in
the hero, and so on. Relative `fileUrl`s (`/assets/…`) resolve against the
API origin.

## Blog

```
GET /api/blog-posts?slug={landing-page-slug}
GET /api/blog-posts/{article-slug}?slug={landing-page-slug}
```

The landing-page slug identifies the brand. The list returns `articles` plus
`blogInfo`; an article returns `post` (with its HTML `content`), `author`
(`name`, `avatar`), `relatedPosts`, `breadcrumb`, and `schemaGraph` —
ready-made JSON-LD you can output as-is.

### Blog CTAs

An article response may also carry two optional, independent CTA fields —
either can be absent, empty, or `null`; render nothing when they are.

- `promotedSidePages` — an array of side-page CTA cards. Each entry:
  `id`, `slug`, `name`, `ctaHeader?`, `ctaText`, `ctaHref`,
  `ctaButtonText?`, `style?` (`"strong"` | `"light"`, missing means
  `"strong"` — the original full bordered card), and `anchor`: either
  `{ "type": "end" }` (render after the article body) or
  `{ "type": "after_h2", "index": N }` (render immediately after the Nth
  top-level `<h2>` section of `post.content`, 0-based). A legacy single
  `promotedSidePage` field (same shape, no `anchor`/`style`) may also be
  present — it's a back-compat mirror of `promotedSidePages`' `end`-anchored
  entry, not a second, separate CTA; prefer `promotedSidePages` when it's
  non-empty.
- `conversionPills` — smaller inline callouts, top-level siblings of `post`
  (not nested in it). Each entry: `targetUrl`, `anchorText`, `targetTitle`,
  `targetType` (`"side_page"` | `"tool"`), `position` (`"intro"` | `"mid"` |
  `"cta"`), and, for `position: "mid"` only, an optional `anchor` in the
  same `{ type: "after_h2", index }` / `{ type: "end" }` shape as above.

## Running a tool

```
POST {api}/api/tools/{tool-slug}/execute
```

Public, no API key. This starter never calls it directly from the browser —
it proxies through its own same-origin `POST /api/tools/{slug}/execute`
route (`app/api/tools/[slug]/execute/route.ts`), which forwards to PostKing
server-side. That keeps `POSTKING_API_URL` out of client-side code and
avoids a cross-origin request from the visitor's browser; the proxy adds no
auth of its own beyond what PostKing's endpoint already does (none — it's a
public endpoint).

Request body: the tool's `inputSchema` field values (from
`GET /api/tools/{tool-slug}`), keyed by each field's `key`, e.g.
`{ "website": "https://example.com" }`.

Response is one of:

| Shape | Meaning |
|---|---|
| `{ "ok": true, "result": unknown, "redirectUrl"?: string }` | sync success (200) |
| `{ "runId": string, "pollingUrl": string }` | async tool (200) — poll `GET {api}{pollingUrl}` every couple seconds until `status` is `"completed"` (`result`, optional `redirectUrl`) or `"failed"` (`error`) |
| `{ "message": "Validation failed", "errors": string[] }` | input didn't match `inputSchema` (422) |
| `{ "ok": false, "code": "LIMIT_REACHED", "resetsAt": string }` | the tool's daily usage cap was hit (429) |
| `{ "ok": false, "code": "UPSTREAM", "message": string }` | the tool's own configured backend failed (502) |

`redirectUrl` — from either the sync response or a completed poll — takes
precedence over the tool's own configured `handoffUrl` template when
deciding where to send the visitor next.

## Also available

| Endpoint | Returns |
|---|---|
| `GET /api/landing-pages/{slug}/llms.txt` | an `llms.txt` for AI crawlers |
| `GET /api/tools/{tool-slug}` | a published free tool's public config |
| `GET /api/uploads/og-images/{slug}.png` | the page's share image |

## Caching

Responses change only when you publish. Caching for a few minutes (this
starter uses 5) is safe.
