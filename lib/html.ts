/**
 * Blog article HTML historically ships its own inline, dateless JSON-LD
 * (baked in at generation time, often pointing at placeholder domains) —
 * universal-lp strips this before rendering so it never conflicts with the
 * authoritative `schemaGraph` served alongside `post.content` (see
 * `components/Blog/blogData.tsx`'s `stripInlineJsonLd`). We do the same:
 * `/api/blog-posts/{slug}` doesn't strip it server-side.
 */
export function stripInlineJsonLd(html: string): string {
  return html.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
}
