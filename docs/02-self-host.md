# 2. Self-host it

## Switch the page to Self-hosted

In [PostKing](https://postking.app), open your landing page and click
**Distribution**. Choose **Self-hosted**.

Or from the CLI:

```bash
pking lp set-distribution my-page self_hosted
```

This tells PostKing your own app renders the page. It also allows requests
from `localhost`, so you can test before you have a domain.

## Configure

This repo is one example of a self-hosted renderer — use it as-is, change it,
or build your own on the same [public API](04-api-reference.md).

```bash
git clone https://github.com/bitsandtea/postking-selfhost.git
cd postking-selfhost
cp .env.example .env
pnpm install
```

Fill in `.env`:

| Variable | Value |
|---|---|
| `POSTKING_API_URL` | `https://try.postking.app` |
| `POSTKING_BRAND_SLUG` | your page's slug ([how to find it](01-create-a-page.md#find-your-pages-slug)) |
| `SITE_URL` | where this app runs — `http://localhost:3000` for now |

One variable per line, no quotes needed.

## Test on localhost

```bash
pnpm dev
```

Open `http://localhost:3000`. You should see your landing page, side pages at
`/<slug>`, and your blog at `/blog`.

Nothing showing? Check that:

- the page is **published** — drafts are never served;
- distribution is **Self-hosted**;
- `POSTKING_BRAND_SLUG` matches the slug exactly.

Next: [Go live on your domain →](03-production-domain.md)
