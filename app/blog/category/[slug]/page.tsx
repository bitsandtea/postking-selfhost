import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/sections/shared";
import { absolutizeAssetUrl } from "@/lib/assets";
import { filterArticlesByCategory, resolveCategoryHub } from "@/lib/blog-index";
import { formatDate } from "@/lib/dates";
import { buildMetadata } from "@/lib/metadata";
import { fetchBlogIndex } from "@/lib/postking";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchBlogIndex();
  const category = data ? resolveCategoryHub(data.blogInfo, slug) : null;
  if (!category) return buildMetadata({ title: "Not found", canonicalPath: `/blog/category/${slug}` });

  return buildMetadata({
    title: category.seoTitle || category.name,
    description: category.metaDescription || category.description || undefined,
    canonicalPath: `/blog/category/${slug}`,
    noindex: category.noindex,
  });
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const data = await fetchBlogIndex();
  const category = data ? resolveCategoryHub(data.blogInfo, slug) : null;
  if (!data || !category) notFound();

  const articles = filterArticlesByCategory(data.articles, slug);

  return (
    <div className="pk-container">
      <a href="/blog">← All posts</a>
      <h1>{category.name}</h1>
      {category.intro && <p>{category.intro}</p>}
      {!category.intro && category.description && <p>{category.description}</p>}

      {articles.length === 0 ? (
        <p>No posts in this category yet.</p>
      ) : (
        <ul className="card-grid">
          {articles.map((article) => (
            <li key={article.id}>
              {article.image && (
                <img src={absolutizeAssetUrl(article.image)} alt={article.imageAlt || article.title} />
              )}
              <a href={`/blog/${article.slug}`}>{article.title}</a>
              {(article.excerpt || article.description) && <p>{article.excerpt || article.description}</p>}
              <dl>
                <dt>Published</dt>
                <dd>{formatDate(article.publishedAt) || "Unknown"}</dd>
                {article.author?.name && (
                  <>
                    <dt>Author</dt>
                    <dd className="author">
                      <Avatar url={article.author.avatar} name={article.author.name} />
                      {article.author.name}
                    </dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
