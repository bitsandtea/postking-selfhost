import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/sections/shared";
import { absolutizeAssetUrl } from "@/lib/assets";
import { formatDate } from "@/lib/dates";
import { buildMetadata } from "@/lib/metadata";
import { fetchBlogIndex } from "@/lib/postking";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchBlogIndex();
  if (!data) return buildMetadata({ title: "Blog", canonicalPath: "/blog" });
  return buildMetadata({
    title: data.blogInfo.title,
    description: data.blogInfo.description,
    canonicalPath: "/blog",
  });
}

export default async function BlogIndexPage() {
  const data = await fetchBlogIndex();
  if (!data) notFound();

  const { articles, blogInfo } = data;

  return (
    <div className="pk-container">
      <h1>{blogInfo.title}</h1>
      {blogInfo.description && <p>{blogInfo.description}</p>}

      {blogInfo.categories && blogInfo.categories.length > 0 && (
        <nav>
          <ul className="link-list">
            {blogInfo.categories.map((category) => (
              <li key={category.slug}>
                <a href={`/blog/category/${category.slug}`}>
                  {category.name} ({category.count})
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {articles.length === 0 ? (
        <p>No posts yet.</p>
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
