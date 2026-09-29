import type { Metadata } from "next";
import { config } from "./config";
import type { SiteMetadata } from "@/types/landing-page";

/** Joins `SITE_URL` with a path, collapsing the double slash a bare "/"
 * path would otherwise produce. */
export function absoluteSiteUrl(path: string): string {
  if (path === "/" || path === "") return config.siteUrl;
  return `${config.siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

export interface BuildMetadataOptions {
  title?: string;
  description?: string;
  canonicalPath: string;
  ogImage?: string;
  ogSiteName?: string;
  noindex?: boolean;
}

const FALLBACK_TITLE = "Untitled";
const FALLBACK_DESCRIPTION = "";

/** One shared builder so every page's `generateMetadata` (root LP, side
 * page, blog index/category/article) produces the same shape: title,
 * description, canonical, openGraph, twitter, robots. */
export function buildMetadata(options: BuildMetadataOptions): Metadata {
  const title = options.title || FALLBACK_TITLE;
  const description = options.description || FALLBACK_DESCRIPTION;
  const canonical = absoluteSiteUrl(options.canonicalPath);

  return {
    title,
    description,
    alternates: { canonical },
    ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: options.ogSiteName,
      ...(options.ogImage ? { images: [{ url: options.ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(options.ogImage ? { images: [options.ogImage] } : {}),
    },
  };
}

/** Pulls title/description off a landing-page/side-page `siteMetadata`
 * blob, falling back to the page's own name. */
export function titleAndDescriptionFrom(
  siteMetadata: SiteMetadata | undefined,
  fallbackTitle: string
): { title: string; description: string } {
  return {
    title: siteMetadata?.title || fallbackTitle,
    description: siteMetadata?.description || "",
  };
}
