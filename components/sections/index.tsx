import type { ReactNode } from "react";
import type { ResolvedSlot } from "@/lib/slots";
import { customHtmlIdFrom, type CustomHtmlSection, type JsonRecord } from "@/types/landing-page";
import { CategoryExplorer } from "./CategoryExplorer";
import { ComparisonMatrix } from "./ComparisonMatrix";
import { CTA } from "./CTA";
import { CustomHtml } from "./CustomHtml";
import { FAQ } from "./FAQ";
import { Features } from "./Features";
import { FeaturedOn } from "./FeaturedOn";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Pricing } from "./Pricing";
import { ReplacesStack } from "./ReplacesStack";
import { RoiCalculator } from "./RoiCalculator";
import { isPlainObject } from "./shared";
import { Testimonials } from "./Testimonials";
import { TopBar } from "./TopBar";
import { Videos } from "./Videos";

/**
 * The section dispatcher — mirrors universal-lp's own `Sections.tsx`
 * switch, one small component per section family (see the sibling files in
 * this directory). Keyed by the section's `content` key, and reused
 * verbatim for a `"custom"` side page's `blocks[].type` (Tier-1 block types
 * are literally the same shape as the matching section — see
 * `components/CustomBlocksPage.tsx`).
 *
 * Returns:
 * - `undefined` — no dispatcher entry for this key; the caller falls back
 *   to `Data.tsx`'s generic walk (still needed for the long tail of
 *   less-common/undocumented section types).
 * - `null` — deliberately empty: genuinely live/interactive with no safe
 *   static rendering (`liveVisitorBar`), or a client-only UX overlay
 *   (`exitIntentPopup`).
 * - a `ReactNode` — the section's rendered body.
 */
const HARD_SKIP = new Set(["liveVisitorBar", "exitIntentPopup"]);

export function renderKnownSection(
  key: string,
  value: unknown,
  slots: Record<string, ResolvedSlot>,
  consumed: Set<string>
): ReactNode | undefined {
  if (HARD_SKIP.has(key)) return null;

  // `customHtml:<id>` sectionOrder entries (feature 117): the caller
  // (`Data.tsx`) already resolves `value` to the matching
  // `content.customHtml[id]` entry, since `customHtml:<id>` is never a real
  // `content` key. `CustomHtml` self-hides on a missing/empty entry.
  const customHtmlId = customHtmlIdFrom(key);
  if (customHtmlId !== undefined) {
    return <CustomHtml section={value as CustomHtmlSection | undefined} />;
  }

  if (!isPlainObject(value)) return undefined;

  switch (key) {
    case "hero":
      return <Hero value={value} slots={slots} consumed={consumed} />;
    case "features":
    case "showcase":
      return <Features value={value} slots={slots} consumed={consumed} />;
    case "howItWorks":
      return <HowItWorks value={value} />;
    case "videos":
      return <Videos value={value} />;
    case "testimonials":
    case "testimonialsSection":
      return <Testimonials value={value} />;
    case "pricing":
      return <Pricing value={value} />;
    case "faq":
      return <FAQ value={value} />;
    case "cta":
      return <CTA value={value} />;
    case "categoryExplorer":
      return <CategoryExplorer value={value} slots={slots} consumed={consumed} />;
    case "comparisonMatrix":
      return <ComparisonMatrix value={value} />;
    case "replacesStack":
      return <ReplacesStack value={value} />;
    case "roiCalculator":
      return <RoiCalculator value={value} />;
    case "featuredOn":
      return <FeaturedOn value={value} />;
    case "topBar":
      return <TopBar value={value} />;
    default:
      return undefined;
  }
}

/** Pure data cleanup for a section the dispatcher above doesn't fully own,
 * applied before `Data.tsx`'s generic walk. Currently unused (`cta` moved
 * to a dedicated component), kept as the extension point the task's brief
 * asks for if a future section needs a targeted strip rather than a full
 * dedicated component. */
export function sanitizeSectionValue(_key: string, value: unknown): unknown {
  return value;
}

export type { JsonRecord };
