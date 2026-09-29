/**
 * Mirrors universal-lp's `lib/defaultAssets.ts` concept (a fallback asset
 * shown when a slot doesn't resolve — in local dev many `slotMap` entries
 * point at asset ids that don't exist, so this isn't a rare edge case) at a
 * scale that fits an unbranded, dependency-free starter: universal-lp ships
 * dozens of branded placeholder videos/images (its own purple wordmark,
 * stock hero footage); copying those in would violate this starter's own
 * "no brand colours, no borrowed branding" rule. Instead: one small neutral
 * logo mark for the header/footer logo slot, and initials-in-a-circle
 * (`components/Avatar.tsx`) for a missing testimonial/author avatar. Every
 * other unresolved slot (hero background video, showcase clips, etc.)
 * simply renders nothing — never a broken `<img>`/`<video>` tag.
 */
import type { ResolvedSlot } from "./slots";

export const DEFAULT_LOGO_URL = "/defaults/logo.svg";

/** A `ResolvedSlot`-shaped fallback for the header/footer logo — used only
 * when NEITHER `<prefix>.logoLight` nor `<prefix>.logoDark` resolves (a
 * genuinely unset logo, or — in local dev — a `slotMap` entry pointing at
 * an asset id that no longer exists). */
export function defaultLogoSlot(): ResolvedSlot {
  return { url: DEFAULT_LOGO_URL, type: "IMAGE", name: "Logo" };
}
