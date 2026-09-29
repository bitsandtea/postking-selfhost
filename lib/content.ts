import type { JsonRecord, LandingPageData } from "@/types/landing-page";

/**
 * PostKing's own frontend convention is `content.navigation ?? data.navigation`
 * — the API doesn't always duplicate `navigation` inside `content`. This
 * folds it in once so `renderSections` only ever needs to look at one object.
 */
export function resolveContent(data: LandingPageData): JsonRecord {
  const content: JsonRecord = { ...(data.content ?? {}) };
  if (content.navigation === undefined && data.navigation) {
    content.navigation = data.navigation;
  }
  return content;
}
