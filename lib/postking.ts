import { config, siteHost } from "./config";
import type { LandingPageData } from "@/types/landing-page";
import type { BlogArticleResponse, BlogIndexResponse } from "@/types/blog";
import type { ToolPublicConfig } from "@/types/tool";

/** Revalidate every fetch on a 5-minute ISR window — no self-signed-cert
 * hacks, no manual cache-tag plumbing, just plain `fetch`. */
export const REVALIDATE_SECONDS = 300;

async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PostKing API request failed (${response.status}): ${url}`);
  }
  return (await response.json()) as T;
}

/**
 * PostKing's `/api/landing-pages/{slug}` route 403s any request whose
 * resolved Host doesn't match either PostKing's own preview domain
 * ("try.postking.app") or a domain verified as this landing page's custom
 * domain — see `app/api/landing-pages/[slug]/route.ts`'s
 * `isAccessingViaCustomDomain` gate. A server-side fetch from this app
 * naturally presents `POSTKING_API_URL`'s own host, not this site's real
 * host, so we forward `SITE_URL`'s hostname via the route's supported
 * `?host=` override (a single static value from env, not a lookup table —
 * no domain->slug mapping happens here). On PostKing's local dev server this
 * is a no-op (its own localhost bypass already applies); in production it
 * only matters once you've verified `SITE_URL`'s domain against this
 * landing page in the PostKing dashboard — see README.
 */
export function landingPageUrl(sidePage?: string): string {
  const url = new URL(`${config.apiUrl}/api/landing-pages/${config.brandSlug}`);
  url.searchParams.set("host", siteHost);
  if (sidePage) url.searchParams.set("sidePage", sidePage);
  return url.toString();
}

export function fetchLandingPage(sidePage?: string): Promise<LandingPageData | null> {
  return getJson<LandingPageData>(landingPageUrl(sidePage));
}

export function landingPageLlmsTxtUrl(): string {
  return `${config.apiUrl}/api/landing-pages/${config.brandSlug}/llms.txt`;
}

export async function fetchLandingPageLlmsTxt(): Promise<string | null> {
  const response = await fetch(landingPageLlmsTxtUrl(), {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) return null;
  return response.text();
}

/**
 * `/api/blog-posts` resolves the brand from the landing-page slug (`?slug=`),
 * its highest-priority signal — the same slug the LP routes use, so no
 * separate brand id is needed. It also picks the publication matching the
 * LP's language.
 */
export function blogIndexUrl(): string {
  const url = new URL(`${config.apiUrl}/api/blog-posts`);
  url.searchParams.set("slug", config.brandSlug);
  return url.toString();
}

export function fetchBlogIndex(): Promise<BlogIndexResponse | null> {
  return getJson<BlogIndexResponse>(blogIndexUrl());
}

export function blogArticleUrl(slug: string): string {
  const url = new URL(`${config.apiUrl}/api/blog-posts/${encodeURIComponent(slug)}`);
  url.searchParams.set("slug", config.brandSlug);
  return url.toString();
}

export function fetchBlogArticle(slug: string): Promise<BlogArticleResponse | null> {
  return getJson<BlogArticleResponse>(blogArticleUrl(slug));
}

/** `/api/tools/{slug}` is public/no-auth and keyed on slug alone — no brand
 * or host context needed. Read-only display, never the interactive
 * `execute` form — see types/tool.ts. */
export function toolUrl(slug: string): string {
  return `${config.apiUrl}/api/tools/${encodeURIComponent(slug)}`;
}

export async function fetchTool(slug: string): Promise<ToolPublicConfig | null> {
  const response = await fetch(toolUrl(slug), { next: { revalidate: REVALIDATE_SECONDS } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`PostKing API request failed (${response.status}): ${toolUrl(slug)}`);
  }
  return (await response.json()) as ToolPublicConfig;
}

/**
 * PostKing generates one OG image per landing page at
 * `{api}/api/uploads/og-images/{slug}.png`, always keyed by the ROOT
 * landing page's own slug (side pages share it — see
 * `buildLandingPageResponse`'s `buildOgImageUrl(host, landingPage.slug)`
 * call, which always passes the parent's slug). We build this ourselves
 * rather than trust `siteMetadata.openGraph.images[0].url` from the API,
 * which is derived from whatever `?host=` we sent it and would otherwise
 * point at a `/og-images/...` path on THIS site (which doesn't exist here).
 */
export function landingPageOgImageUrl(): string {
  return `${config.apiUrl}/api/uploads/og-images/${config.brandSlug}.png`;
}
