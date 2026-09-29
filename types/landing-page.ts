/**
 * Minimal local types for the fields this renderer actually reads out of
 * `GET {api}/api/landing-pages/{slug}[?sidePage=...]`. The real payload has
 * many more fields (translation/versioning metadata, etc.) that this
 * bare-bones renderer never touches — see PostKing's `types/landing-api.ts`
 * (`ApiResponseData`) for the authoritative shape. `assets`/`slotMap` ARE
 * read (see `lib/slots.ts`) to resolve logos, hero/showcase media, and
 * testimonial avatars.
 */

export type JsonRecord = Record<string, unknown>;

/** One entry of the `assets` array — an uploaded media file. */
export interface Asset {
  id: string;
  name: string;
  /** "IMAGE" | "VIDEO" | other asset types this renderer doesn't special-case. */
  type: string;
  fileUrl: string;
  mimeType?: string;
}

export type SlotMapRef = string | string[];

/** `slotMap.main` maps a slot key (e.g. `"header.logoLight"`,
 * `"showcase.video.1"`) to an asset id (or, for a few array-valued slots, a
 * list of ids). Side-page-specific overrides live under other top-level
 * keys, which this starter doesn't read. */
export interface SlotMap {
  main?: Record<string, SlotMapRef>;
  [page: string]: Record<string, SlotMapRef> | undefined;
}

export interface SiteMetadataImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface SiteMetadataOpenGraph {
  title?: string;
  siteName?: string;
  description?: string;
  images?: SiteMetadataImage[];
}

export interface SiteMetadataTwitter {
  title?: string;
  description?: string;
}

export interface SiteMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  keywords?: string;
  openGraph?: SiteMetadataOpenGraph;
  twitter?: SiteMetadataTwitter;
  noindex?: boolean;
  [key: string]: unknown;
}

export interface SitemapRoute {
  path: string;
  slug: string;
  title?: string;
  type: string;
  updatedAt?: string;
  priority?: number;
  inMenu?: boolean;
  menuOrder?: number;
}

export interface LandingPageSitemap {
  routes?: SitemapRoute[];
}

export interface RawHtmlPayload {
  body?: string;
  head?: string;
  [key: string]: unknown;
}

/** One entry of `content.customHtml` — a freeform, author-written HTML
 * section addressed from `sectionOrder` by `customHtml:<id>` (PostKing
 * feature 117; see universal-lp `types/landingPage/models.ts`'s
 * `CustomHtmlSection`). `html` was sanitized by PostKing at WRITE time
 * (`sanitizeBlockHtml`, reject-not-strip) — same trust contract as a
 * `Block` with `type: "html"`. */
export interface CustomHtmlSection {
  name?: string;
  html: string;
}

/** Prefix a `sectionOrder` entry uses to address a `content.customHtml`
 * entry, e.g. `customHtml:promo-banner`. */
export const CUSTOM_HTML_PREFIX = "customHtml:";

/** Extracts the id from a `customHtml:<id>` `sectionOrder` entry, or
 * `undefined` if `key` doesn't have that shape. */
export function customHtmlIdFrom(key: string): string | undefined {
  return key.startsWith(CUSTOM_HTML_PREFIX) ? key.slice(CUSTOM_HTML_PREFIX.length) : undefined;
}

export interface LandingPageMeta {
  sidePageKey?: string;
  sidePageType?: string;
  [key: string]: unknown;
}

/** One entry of a `"custom"` side page's `blocks[]` — see
 * `renderMode: "blocks"` below. Matches PostKing's `Block` type
 * byte-for-byte (`types/blocks.ts`): `type` is either a Tier-1 key that
 * matches a normal section's content shape (rendered via the same
 * `section-hints` dispatch as `content.<type>`), the literal `"html"`
 * (Tier 3 — trusted, pre-sanitized markup in `props.html`), or a Tier-2 key
 * with a matching entry in `blockTemplates` (not rendered by this starter —
 * see `lib/section-hints.ts`). */
export interface Block {
  id: string;
  type: string;
  props: JsonRecord;
}

/** The response shape for both the root landing page and, when `?sidePage=`
 * is set, a side page merged onto its parent. */
export interface LandingPageData {
  id: string | number;
  slug: string;
  name?: string;
  brandId?: string;
  status?: string;
  content?: JsonRecord;
  config?: {
    baseUrl?: string;
    style?: { primaryColor?: string; secondaryColor?: string; themeId?: string };
  } & JsonRecord;
  assets?: Asset[];
  slotMap?: SlotMap;
  sitemap?: LandingPageSitemap;
  navigation?: JsonRecord;
  siteMetadata?: SiteMetadata;
  sectionOrder?: string[];
  /** The API's `alternates` field (sibling-language landing pages, for
   * hreflang) is intentionally NOT modeled here: each translation-group
   * sibling is a separate PostKing `LandingPage` that resolves to its OWN
   * domain (`{slug}.postking.app`, or its own verified custom domain) —
   * never this self-hosted deployment's `SITE_URL` — and this starter has
   * no `/xx/` language routes to serve a same-origin alternate on either.
   * Every alternate the API could send would therefore point off-site, so
   * this starter drops them rather than emit hreflang links it can't serve.
   * See `docs/05-customize.md` → "Known limitations". */
  renderMode?: "sections" | "raw_html" | "blocks" | string;
  rawHtml?: RawHtmlPayload;
  /** `renderMode === "blocks"` only (a `"custom"` side page) — top-level,
   * never nested under `content` (see PostKing's `02-block-contract.md`
   * §1). `blockTemplates` maps `"{type}@{version}"` to a Tier-2 template
   * string; this starter never interpolates those (see `lib/section-hints.ts`). */
  blocks?: Block[];
  blockTemplates?: Record<string, string>;
  /** Present only if/when PostKing starts emitting LP-level JSON-LD — the
   * public LP route emits none of this today, so this is a defensive,
   * data-only pass-through, never assumed to exist. */
  schemaGraph?: { "@context": string; "@graph": unknown[] };
  _meta?: LandingPageMeta;
}
