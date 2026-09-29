import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleBodyWithCtas from "@/components/blog/ArticleBodyWithCtas";
import { JsonLdGraph } from "@/components/JsonLd";
import { Avatar } from "@/components/sections/shared";
import { absolutizeAssetUrl } from "@/lib/assets";
import { localSlugFromRelatedPostUrl } from "@/lib/blog-index";
import { formatDate } from "@/lib/dates";
import { stripInlineJsonLd } from "@/lib/html";
import { buildMetadata } from "@/lib/metadata";
import { fetchBlogArticle } from "@/lib/postking";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchBlogArticle(slug);
  if (!data) return buildMetadata({ title: "Not found", canonicalPath: `/blog/${slug}` });

  const { post, siteMetadata } = data;
  return buildMetadata({
    title: siteMetadata?.title || post.title,
    description: siteMetadata?.description || post.description,
    canonicalPath: `/blog/${slug}`,
    ogImage: siteMetadata?.ogImage || (post.image ? absolutizeAssetUrl(post.image) : undefined),
    noindex: siteMetadata?.noindex,
  });
}

export default async function BlogArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const data = await fetchBlogArticle(slug);
  if (!data) notFound();

  const { post, author, blogInfo, breadcrumb, relatedPosts, schemaGraph, conversionPills } = data;

  return (
    <article className="pk-article">
      <JsonLdGraph data={schemaGraph} />

      {breadcrumb && breadcrumb.length > 0 && (
        <nav>
          <ul className="link-list">
            {breadcrumb.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : crumb.label}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {post.image && <img src={absolutizeAssetUrl(post.image)} alt={post.imageAlt || post.title} />}

      <h1>{post.title}</h1>

      <dl>
        <dt>Published</dt>
        <dd>{formatDate(post.publishedAt) || "Unknown"}</dd>
        {author?.name && (
          <>
            <dt>Author</dt>
            <dd className="author">
              <Avatar url={author.avatar} name={author.name} />
              {author.name}
            </dd>
          </>
        )}
        {(post.categoryLabel || post.categoryName) && (
          <>
            <dt>Category</dt>
            <dd>
              {post.categorySlug ? (
                <a href={`/blog/category/${post.categorySlug}`}>{post.categoryLabel || post.categoryName}</a>
              ) : (
                post.categoryLabel || post.categoryName
              )}
            </dd>
          </>
        )}
      </dl>

      {post.imageCaption && <p>{post.imageCaption}</p>}

      <ArticleBodyWithCtas
        postText={stripInlineJsonLd(post.content)}
        promotedSidePage={post.promotedSidePage}
        promotedSidePages={post.promotedSidePages}
        conversionPills={conversionPills}
      />

      {post.tags && post.tags.length > 0 && (
        <ul className="link-list">
          {post.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      {relatedPosts && relatedPosts.length > 0 && (
        <nav>
          <h2>Related posts</h2>
          <ul className="link-list">
            {relatedPosts.map((related) => (
              <li key={related.slug}>
                <a href={`/blog/${localSlugFromRelatedPostUrl(related.slug)}`}>{related.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <a href="/blog">← {blogInfo.title}</a>
    </article>
  );
}
