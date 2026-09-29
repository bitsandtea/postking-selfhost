import type { ReactNode } from "react";
import { absolutizeAssetUrl } from "@/lib/assets";
import type { ResolvedSlot } from "@/lib/slots";
import type { JsonRecord } from "@/types/landing-page";

/** Shared primitives for every `components/sections/*` family component —
 * kept here rather than duplicated per file, per the "small files" rule. */

export function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** A CTA link — dropped entirely when there's no destination (the "no
 * href, no button" rule): button copy alone is never printed. */
export function CtaLink({ href, label }: { href?: unknown; label?: unknown }): ReactNode {
  const url = str(href);
  if (!url) return null;
  return (
    <a className="button" href={url}>
      {str(label) || url}
    </a>
  );
}

/** Resolves a `{slotKey}` ref against the page's slot map, falling back to
 * a literal media URL, then to nothing (never a broken `<img>`). Marks the
 * resolved key in `consumed` (when passed) so `Data.tsx`'s "leftover
 * section media" pass never shows the same slot a second time. */
export function Media({
  url,
  alt,
  slotKey,
  slots,
  className,
  consumed,
}: {
  url?: unknown;
  alt?: string;
  slotKey?: unknown;
  slots: Record<string, ResolvedSlot>;
  className?: string;
  consumed?: Set<string>;
}): ReactNode {
  const key = str(slotKey);
  const slot = key ? slots[key] : undefined;
  if (slot) {
    consumed?.add(key as string);
    if (slot.type === "VIDEO" || slot.mimeType?.startsWith("video/")) {
      return (
        <video className={className} controls muted playsInline preload="metadata">
          <source src={slot.url} type={slot.mimeType} />
        </video>
      );
    }
    return <img className={className} src={slot.url} alt={alt || slot.name} />;
  }
  const src = str(url);
  if (!src) return null;
  return <img className={className} src={absolutizeAssetUrl(src)} alt={alt || ""} />;
}

/** A YouTube-hosted clip/video card thumbnail, linked to the real video. */
export function VideoThumb({ item }: { item: JsonRecord }): ReactNode {
  const platform = str(item.platform);
  const externalId = str(item.externalId);
  const posterUrl = str(item.posterUrl);
  const title = str(item.title);
  if (!(platform && /youtube/i.test(platform) && externalId && posterUrl)) return null;
  return (
    <a className="yt-thumb" href={`https://www.youtube.com/watch?v=${externalId}`}>
      <img src={absolutizeAssetUrl(posterUrl)} alt={title || "Watch on YouTube"} />
    </a>
  );
}

/** First letters of up to two words — the neutral fallback avatar when a
 * testimonial/author has no resolvable image at all. */
export function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return chars.join("") || "?";
}

/** A small round avatar: the resolved image when there is one, otherwise a
 * neutral initials circle — never a broken `<img>`. */
export function Avatar({
  url,
  name,
  className = "avatar",
}: {
  url?: unknown;
  name?: string;
  className?: string;
}): ReactNode {
  const src = str(url);
  if (src) {
    return <img className={className} src={absolutizeAssetUrl(src)} alt={name || ""} />;
  }
  return (
    <span className={`${className} avatar-fallback`} aria-hidden={name ? undefined : true}>
      {initials(name)}
    </span>
  );
}
