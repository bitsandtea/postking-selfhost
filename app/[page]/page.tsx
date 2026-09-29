import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderSections } from "@/components/Data";
import { ComparisonSidePage } from "@/components/ComparisonSidePage";
import { CustomBlocksPage } from "@/components/CustomBlocksPage";
import { JsonLdGraph } from "@/components/JsonLd";
import { RawHtmlPage } from "@/components/RawHtmlPage";
import { SpotlightSidePage } from "@/components/SpotlightSidePage";
import { TextSidePage } from "@/components/TextSidePage";
import { resolveContent } from "@/lib/content";
import { buildMetadata, titleAndDescriptionFrom } from "@/lib/metadata";
import { fetchLandingPage, landingPageOgImageUrl } from "@/lib/postking";
import { isValidSidePageSlug } from "@/lib/security";
import { resolveSlots } from "@/lib/slots";
import type { ComparisonPageContent, SpotlightPageContent } from "@/types/side-page";

interface SidePageParams {
  page: string;
}

interface SidePageProps {
  params: Promise<SidePageParams>;
}

export async function generateMetadata({ params }: SidePageProps): Promise<Metadata> {
  const { page } = await params;
  if (!isValidSidePageSlug(page)) notFound();
  const data = await fetchLandingPage(page);
  if (!data) return buildMetadata({ title: "Not found", canonicalPath: `/${page}` });

  const { title, description } = titleAndDescriptionFrom(data.siteMetadata, data.name || page);
  return buildMetadata({
    title,
    description,
    canonicalPath: `/${page}`,
    ogImage: landingPageOgImageUrl(),
    ogSiteName: data.siteMetadata?.openGraph?.siteName || data.name,
    noindex: data.siteMetadata?.noindex,
  });
}

/**
 * A side page's rendering fully forks on `_meta.sidePageType` (confirmed
 * live via `view_side_page` across real `"landing"`/`"text"`/
 * `"comparison"`/`"spotlight"`/`"custom"` pages — see `types/side-page.ts`
 * and `components/{Text,Comparison,Spotlight,CustomBlocks}*.tsx`):
 * `"landing"` (default, most side pages) shares the exact same section walk
 * as the root LP; every other type is a standalone document with its own
 * fixed shape, entirely unlike `content.hero`/`content.pricing`/etc. The
 * site header/footer are NOT re-derived here for any of these — they come
 * from the ROOT LP fetch in `app/layout.tsx`, which already resolves to the
 * same `navigation`/`footer` PostKing's API returns for every side page
 * under this LP.
 */
export default async function SidePage({ params }: SidePageProps) {
  const { page } = await params;
  if (!isValidSidePageSlug(page)) notFound();
  const data = await fetchLandingPage(page);
  if (!data) notFound();

  const slots = resolveSlots(data);
  const sidePageType = data._meta?.sidePageType;

  if (data.renderMode === "raw_html") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <RawHtmlPage rawHtml={data.rawHtml} />
      </>
    );
  }

  if (data.renderMode === "blocks" || sidePageType === "custom") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <CustomBlocksPage blocks={data.blocks} slots={slots} />
      </>
    );
  }

  if (sidePageType === "text") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <TextSidePage content={data.content ?? {}} />
      </>
    );
  }

  if (sidePageType === "comparison") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <ComparisonSidePage content={(data.content ?? {}) as ComparisonPageContent} />
      </>
    );
  }

  if (sidePageType === "spotlight") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <SpotlightSidePage content={(data.content ?? {}) as SpotlightPageContent} slots={slots} />
      </>
    );
  }

  const content = resolveContent(data);
  const { title } = titleAndDescriptionFrom(data.siteMetadata, data.name || page);

  return (
    <>
      <JsonLdGraph data={data.schemaGraph} />
      <div className="pk-container">
        <h1>{title}</h1>
      </div>
      {renderSections(content, data.sectionOrder, slots)}
    </>
  );
}
