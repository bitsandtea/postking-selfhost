import type { BlogArticleSummary, BlogCategorySummary, BlogInfo } from "@/types/blog";

/**
 * Resolves the category hub for a `/blog/category/{slug}` request —
 * `null` when the slug doesn't match any category with a visible article
 * in this publication (the caller's cue to `notFound()`). Mirrors
 * universal-lp's `lib/blog-index.ts` `resolveCategoryHub`.
 */
export function resolveCategoryHub(
  blogInfo: Pick<BlogInfo, "categories">,
  slug: string
): BlogCategorySummary | null {
  return blogInfo.categories?.find((category) => category.slug === slug) ?? null;
}

/** Filters an article list down to one category. Pure, side-effect-free. */
export function filterArticlesByCategory(
  articles: BlogArticleSummary[],
  categorySlug: string
): BlogArticleSummary[] {
  return articles.filter((article) => article.categorySlug === categorySlug);
}

/**
 * `relatedPosts[].slug` from `/api/blog-posts/{slug}` is already an
 * ABSOLUTE URL (PostKing resolves it against whichever domain it thinks
 * this blog lives on — see `app/api/blog-posts/[slug]/route.ts`'s
 * `relatedPosts` mapping), which may not be this self-hosted site's real
 * domain. Extracts just the last path segment so related-post links stay
 * on THIS site (`/blog/{slug}`) instead of possibly pointing offsite.
 */
export function localSlugFromRelatedPostUrl(value: string): string {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || value;
  } catch {
    return value;
  }
}

/**
 * `conversionPills[].targetUrl` from `/api/blog-posts/{slug}` is built
 * server-side via PostKing's render-link resolver's `toAbsolute()` against
 * the brand's own configured domain (`mainUrl`) — not necessarily this
 * self-hosted site's real domain. `targetType` is always internal
 * ("side_page" | "tool" — see `types/blog.ts`'s `ConversionPill`), i.e. it
 * always points at a path this same renderer also serves (`/{slug}` for a
 * side page, `/tools/{slug}` for a tool), so keeping the FULL pathname
 * (unlike `localSlugFromRelatedPostUrl` above, which keeps only the last
 * segment — `/tools/{slug}` needs both segments) is safe and keeps the link
 * on this site.
 *
 * Unlike this, `PromotedSidePage.ctaHref` is NEVER rewritten this way — a
 * customer can point a CTA at a genuinely external URL via PostKing's CTA
 * tools, so it's rendered as-is (see `components/blog/PromotedSidePageCta.tsx`).
 */
export function localPathFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return value;
  }
}
