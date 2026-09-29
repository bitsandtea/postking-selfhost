import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderSections } from "@/components/Data";
import { JsonLdGraph } from "@/components/JsonLd";
import { RawHtmlPage } from "@/components/RawHtmlPage";
import { resolveContent } from "@/lib/content";
import { buildMetadata, titleAndDescriptionFrom } from "@/lib/metadata";
import { fetchLandingPage, landingPageOgImageUrl } from "@/lib/postking";
import { resolveSlots } from "@/lib/slots";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchLandingPage();
  if (!data) return buildMetadata({ title: "Not found", canonicalPath: "/" });

  const { title, description } = titleAndDescriptionFrom(data.siteMetadata, data.name || "Home");
  return buildMetadata({
    title,
    description,
    canonicalPath: "/",
    ogImage: landingPageOgImageUrl(),
    ogSiteName: data.siteMetadata?.openGraph?.siteName || data.name,
    noindex: data.siteMetadata?.noindex,
  });
}

export default async function HomePage() {
  const data = await fetchLandingPage();
  if (!data) notFound();

  if (data.renderMode === "raw_html") {
    return (
      <>
        <JsonLdGraph data={data.schemaGraph} />
        <RawHtmlPage rawHtml={data.rawHtml} />
      </>
    );
  }

  const content = resolveContent(data);
  const slots = resolveSlots(data);
  const { title } = titleAndDescriptionFrom(data.siteMetadata, data.name || "Home");

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
