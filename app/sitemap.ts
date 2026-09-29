import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { safeDate } from "@/lib/dates";
import { fetchBlogIndex, fetchLandingPage } from "@/lib/postking";

/** Lists the root LP, every side page from its `sitemap.routes` (skipping
 * blog-type routes — those come from the blog API below), every published
 * blog article, and every blog category hub. Mirrors universal-lp's
 * `app/sitemap.ts`, without the multi-domain/multi-language resolution. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: config.siteUrl, changeFrequency: "weekly", priority: 1.0 },
  ];

  const landingPage = await fetchLandingPage();
  if (landingPage?.sitemap?.routes) {
    for (const route of landingPage.sitemap.routes) {
      if (route.type === "blog" || route.path === "/" || route.path.startsWith("/blog")) continue;
      if (route.path.includes("#")) continue;
      entries.push({
        url: `${config.siteUrl}${route.path}`,
        lastModified: safeDate(route.updatedAt),
        changeFrequency: "weekly",
        priority: route.priority ?? 0.8,
      });
    }
  }

  const blog = await fetchBlogIndex();
  if (blog) {
    entries.push({ url: `${config.siteUrl}/blog`, changeFrequency: "daily", priority: 0.9 });

    for (const article of blog.articles) {
      entries.push({
        url: `${config.siteUrl}/blog/${article.slug}`,
        lastModified: safeDate(article.updatedAt) ?? safeDate(article.publishedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const category of blog.blogInfo.categories ?? []) {
      entries.push({
        url: `${config.siteUrl}/blog/category/${category.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
