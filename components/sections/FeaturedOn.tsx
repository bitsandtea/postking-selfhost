import type { ReactNode } from "react";
import { absolutizeAssetUrl } from "@/lib/assets";
import type { JsonRecord } from "@/types/landing-page";
import { isPlainObject, str } from "./shared";

/**
 * `content.featuredOn` — universal-lp hardcodes a logo/embed per `type`
 * (producthunt/peerlist/forbes/techcrunch/indiehackers/custom); a
 * dependency-free static fallback shows a plain text-or-logo link, never
 * the raw `type` token or a `*PostId`.
 */
const LABEL: Record<string, string> = {
  producthunt: "Product Hunt",
  peerlist: "Peerlist",
  indiehackers: "Indie Hackers",
  forbes: "Forbes",
  techcrunch: "TechCrunch",
};

export function FeaturedOn({ value }: { value: JsonRecord }): ReactNode {
  const items = Array.isArray(value.items) ? value.items.filter(isPlainObject) : [];
  if (items.length === 0) return null;

  return (
    <>
      {str(value.heading) && <h2>{str(value.heading)}</h2>}
      <ul className="link-list">
        {items.map((item, i) => {
          const type = str(item.type) ?? "custom";
          const href = str(item.url);
          const altText = str(item.altText);
          const label = altText ?? LABEL[type] ?? "Featured";
          const imageUrl = type === "custom" ? str(item.imageUrl) : undefined;
          if (!href && !imageUrl) return null;
          const body = imageUrl ? <img src={absolutizeAssetUrl(imageUrl)} alt={label} /> : label;
          return <li key={`${i}-${href ?? ""}`}>{href ? <a href={href}>{body}</a> : body}</li>;
        })}
      </ul>
    </>
  );
}
