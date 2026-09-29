import { absolutizeAssetUrl } from "./assets";
import type { Asset, LandingPageData, SlotMap } from "@/types/landing-page";

/** A slot resolved against `assets` — everything a renderer needs to show
 * the right media element. */
export interface ResolvedSlot {
  url: string;
  mimeType?: string;
  /** The asset's own `type` (`IMAGE`/`VIDEO`/...) — drives `<img>` vs
   * `<video>` in `components/Data.tsx`. */
  type: string;
  name: string;
}

/**
 * Where a content section's key differs from the slot-key prefix universal-lp
 * uses for it: `feature.*` belongs to the plural `features` section, and the
 * site header's `header.*` slots live under the `navigation` content key —
 * there's no standalone `header` section in `content`.
 */
const SECTION_SLOT_PREFIX: Record<string, string> = {
  features: "feature",
  testimonials: "testimonial",
  navigation: "header",
};

export function sectionSlotPrefix(sectionKey: string): string {
  return SECTION_SLOT_PREFIX[sectionKey] ?? sectionKey;
}

/**
 * Resolves `slotMap.main` (asset-id references) against `assets` (the asset
 * records) into one flat `slotKey -> ResolvedSlot` map. Array-valued slots
 * (logo carousels etc.) resolve to their first id — this starter renders one
 * image per slot, never a carousel.
 */
export function resolveSlots(
  data: Pick<LandingPageData, "assets" | "slotMap">
): Record<string, ResolvedSlot> {
  const main = (data.slotMap as SlotMap | undefined)?.main ?? {};
  const assets: Asset[] = data.assets ?? [];
  const resolved: Record<string, ResolvedSlot> = {};

  for (const [slotKey, ref] of Object.entries(main)) {
    const id = Array.isArray(ref) ? ref[0] : ref;
    const asset = assets.find((candidate) => candidate.id === id);
    if (!asset?.fileUrl) continue;
    resolved[slotKey] = {
      url: absolutizeAssetUrl(asset.fileUrl),
      mimeType: asset.mimeType,
      type: asset.type,
      name: asset.name,
    };
  }

  return resolved;
}

/**
 * Resolves a loose asset reference to a slot, beyond a literal slot-map key
 * match. `hero.lovedBy.avatars` ships entries like `"testimonials.fraser"` —
 * a first-name fragment that doesn't match any slotMap key directly but is
 * clearly meant to point at a `hero.testimonialAvatar.<name>` entry (the key
 * PostKing's own name-normalization produces from a testimonial's display
 * name — see universal-lp `lib/assets/testimonials.ts`).
 */
export function resolveSlotRef(
  ref: string,
  slots: Record<string, ResolvedSlot>
): { key: string; slot: ResolvedSlot } | undefined {
  const direct = slots[ref];
  if (direct) return { key: ref, slot: direct };

  const match = /^testimonials\.(.+)$/i.exec(ref);
  if (!match) return undefined;

  const needle = (match[1] ?? "").toLowerCase();
  const prefix = "hero.testimonialAvatar.";
  const key = Object.keys(slots).find(
    (candidate) => candidate.startsWith(prefix) && candidate.slice(prefix.length).startsWith(needle)
  );
  if (!key) return undefined;
  const slot = slots[key];
  return slot ? { key, slot } : undefined;
}
