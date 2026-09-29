/**
 * Minimal local types for the fields this renderer reads out of
 * `GET {api}/api/blog-posts` and `GET {api}/api/blog-posts/{slug}`. See
 * PostKing's `app/api/blog-posts/route.ts` / `[slug]/route.ts` for the
 * authoritative (much larger) shape.
 */

export interface BlogAuthor {
  name: string;
  avatar?: string;
  about?: string;
  url?: string;
  sameAs?: string[];
}

export interface BlogCategorySummary {
  slug: string;
  name: string;
  description?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  intro?: string | null;
  noindex?: boolean;
  count: number;
}

export interface BlogInfo {
  title: string;
  description?: string;
  name?: string;
  mainUrl?: string;
  logoUrl?: string;
  /** Every Category with >=1 visible article in this publication — only
   * present once a publication has enough categories for hub pages to be
   * worthwhile (see PostKing's `summarizeCategories`). */
  categories?: BlogCategorySummary[];
}

export interface BlogArticleSummary {
  id: string;
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  image?: string;
  imageAlt?: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  tags?: string[];
  category?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  featured?: boolean;
  author: BlogAuthor;
}

export interface BlogIndexResponse {
  articles: BlogArticleSummary[];
  blogInfo: BlogInfo;
}

export interface BlogRelatedPost {
  slug: string;
  title: string;
  image?: string | null;
}

export interface BlogBreadcrumbItem {
  label: string;
  href: string | null;
}

/**
 * A single promoted-side-page CTA. `ctaHref` is normally this site's own
 * relative side-page path (`/{slug}`, matching how the starter serves side
 * pages — see README's Routes section), but a customer can also point a CTA
 * at a genuinely external URL via PostKing's CTA tools, so it's rendered
 * as-is — never rewritten. See `lib/blog-cta-anchors.ts`.
 */
export interface PromotedSidePage {
  id: string;
  slug: string;
  name: string;
  ctaHeader?: string;
  ctaText: string;
  ctaHref: string;
  ctaButtonText?: string;
}

/** Where a `PromotedSidePageCta`/`ConversionPill` splices into the article
 * body — "end" is the legacy single-CTA spot (after the whole body),
 * "after_h2" is immediately after the Nth (0-based) top-level `<h2>`
 * section of `post.content`. See `lib/blog-cta-anchors.ts`. */
export type CtaAnchor = { type: "after_h2"; index: number } | { type: "end" };

/** "strong" (default/absent) = full bordered card. "light" = compact
 * editorial callout blending into the article flow. See
 * `components/blog/PromotedSidePageCta.tsx`. */
export type PromotedSidePageCtaStyle = "strong" | "light";

export type PromotedSidePageCta = PromotedSidePage & {
  anchor: CtaAnchor;
  style?: PromotedSidePageCtaStyle;
};

export type ConversionPillPosition = "intro" | "mid" | "cta";
export type ConversionPillTargetType = "side_page" | "tool";

/**
 * A render-link internal-linking pill. `targetUrl` is built server-side via
 * PostKing's `toAbsolute()` against the brand's own configured domain — NOT
 * necessarily this self-hosted site's real domain — so it must be resolved
 * to a local path before use (see `lib/blog-index.ts`'s `localPathFromUrl`,
 * used by `components/blog/ConversionPillCard.tsx`). Unlike `ctaHref`
 * above, `targetType` is always internal ("side_page" | "tool"), so this
 * rewrite is always safe.
 */
export interface ConversionPill {
  targetUrl: string;
  anchorText: string;
  position: ConversionPillPosition;
  targetTitle: string;
  targetType: ConversionPillTargetType;
  /** Section-placement hint for `position: "mid"` — see `CtaAnchor` above. */
  anchor?: CtaAnchor;
}

export interface BlogArticleDetail {
  id: string;
  slug: string;
  title: string;
  description?: string;
  /** Full article body HTML — the customer's own content, rendered via
   * dangerouslySetInnerHTML. */
  content: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  tags?: string[];
  categoryLabel?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  /** Legacy single CTA — mirrors the `end`-anchored entry of
   * `promotedSidePages` (or its last entry) when that list is present.
   * `lib/blog-cta-anchors.ts`'s `resolveArticleCtaPlan` is the only place
   * that should read both fields — never render both directly. */
  promotedSidePage?: PromotedSidePage | null;
  /** 106 Workstream C: an ordered, anchored multi-CTA list. Absent/empty on
   * older cached API responses — renderers must fall back to
   * `promotedSidePage`. */
  promotedSidePages?: PromotedSidePageCta[];
}

export interface BlogArticleSiteMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  ogImage?: string;
}

export interface BlogArticleResponse {
  post: BlogArticleDetail;
  author: BlogAuthor;
  blogInfo: BlogInfo;
  breadcrumb?: BlogBreadcrumbItem[];
  /** The full `{"@context", "@graph": [...]}` JSON-LD document
   * (Organization/WebSite/WebPage/BreadcrumbList/BlogPosting) — rendered
   * verbatim as `<script type="application/ld+json">`. */
  schemaGraph?: { "@context": string; "@graph": unknown[] };
  relatedPosts?: BlogRelatedPost[];
  siteMetadata?: BlogArticleSiteMetadata;
  /** Render-link internal-linking pills — see `ConversionPill` above. Top-level
   * sibling of `post` on the wire, absent/empty on older articles. */
  conversionPills?: ConversionPill[];
}
