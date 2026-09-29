import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/metadata";
import { fetchTool } from "@/lib/postking";
import { ToolRunner } from "@/components/Tool/ToolRunner";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await fetchTool(slug);
  if (!tool) return buildMetadata({ title: "Not found", canonicalPath: `/tools/${slug}` });
  return buildMetadata({
    title: tool.name,
    description: tool.description || undefined,
    canonicalPath: `/tools/${slug}`,
  });
}

/**
 * Displays a PostKing Tool's own copy, plus a runnable input form
 * (`components/Tool/ToolRunner.tsx`) that POSTs to this site's own
 * `/api/tools/{slug}/execute` proxy. See types/tool.ts.
 */
export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = await fetchTool(slug);
  if (!tool) notFound();

  const bullets = Array.isArray(tool.benefitBullets)
    ? tool.benefitBullets.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <div className="pk-container">
      <h1>{tool.ctaHeadline || tool.name}</h1>
      {tool.description && <p>{tool.description}</p>}
      {tool.conversionCopy && <p>{tool.conversionCopy}</p>}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {tool.sampleOutput && (
        <dl>
          <dt>Sample output</dt>
          <dd>{tool.sampleOutput}</dd>
        </dl>
      )}
      <ToolRunner config={tool} />
    </div>
  );
}
