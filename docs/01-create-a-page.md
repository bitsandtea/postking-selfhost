# 1. Create a PostKing page

[PostKing](https://postking.app) generates landing pages, side pages and blog
articles from your brand. This starter renders what you create there.

## Sign up and add your brand

1. Create an account at [postking.app](https://postking.app).
2. Add your brand — paste your website URL and PostKing builds a brand
   profile (voice, audience, offer) from it.

## Generate a landing page

Pick whichever you prefer — all three create the same page.

**Dashboard.** Open **Landing Pages → Create**, describe the page, generate.

**CLI** (`pking`):

```bash
pking login
pking lp generate --slug my-page
```

**MCP / AI assistant.** Connect the PostKing MCP server
(`https://mcp.postking.app/mcp`) to your assistant and ask it to generate a
landing page — it calls `generate_landing_page` for you.

## Edit it

- **Vibe edit** — describe a change in plain words ("make the hero shorter").
- **Manual edit** — change any section's copy, images and links directly.
- **CLI** — `pking lp edit my-page --instructions "..."`.

Images and videos you assign to a section are stored as **slots** on the page;
the API sends them alongside the content (see the
[API reference](04-api-reference.md#slots-and-assets)).

## Add side pages and a blog (optional)

- **Side pages** — extra pages under the same site (`/pricing`,
  `/for-agencies`, comparison pages). Create them from the page editor or
  `pking lp side ...`. They show up in the page's sitemap and render at
  `/<side-page-slug>` in this starter.
- **Blog** — generate articles from **Blog** in the dashboard or
  `pking blogs generate`. They render at `/blog` and `/blog/<article>`.

## Publish

Publish from the editor, or:

```bash
pking lp publish my-page
```

Only published content is served to self-hosted apps. Drafts stay private.

## Find your page's slug

The slug identifies the page — you'll put it in this starter's `.env`.

- In the dashboard URL: `/dashboard/brands/<brandId>/landing-pages?page=<slug>`
- Or: `pking lp list`

Next: [Self-host it →](02-self-host.md)
