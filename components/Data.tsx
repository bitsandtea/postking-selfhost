import { Fragment, type ReactNode } from "react";
import { absolutizeAssetUrl } from "@/lib/assets";
import { renderKnownSection, sanitizeSectionValue } from "@/components/sections";
import { defaultLogoSlot } from "@/lib/default-assets";
import { resolveSlotRef, sectionSlotPrefix, type ResolvedSlot } from "@/lib/slots";
import { customHtmlIdFrom, type CustomHtmlSection, type JsonRecord } from "@/types/landing-page";

/**
 * Generic recursive renderer for a landing page / side page section's JSON.
 * Deliberately does NOT know about any specific PostKing block/section
 * type — it walks whatever shape the API sends and maps common key
 * patterns onto plain semantic HTML, so it survives section types it has
 * never seen. See the task brief: title/heading/name -> heading,
 * description/text/content -> <p>, arrays -> <ul>, href+label -> <a>,
 * image-ish keys -> <img>, remaining scalars -> <dl>, everything else
 * skipped.
 *
 * It also resolves `slotMap`-based media (logos, hero/showcase video,
 * testimonial avatars) — see `lib/slots.ts` — both where content
 * explicitly points at a slot (a `slotKey` field) and, per section, for
 * slots that belong to that section but aren't referenced by any content
 * field at all (`SlotCtx.consumed` tracks which slot keys a section's own
 * content already rendered, so the leftover pass never double-renders one).
 */

const MAX_DEPTH = 8;

const IMAGE_KEY = /(image|logo|avatar|photo|picture|thumbnail|cover|icon)$|^src$/i;
/** Only treat a value as an image when it actually looks like one — `icon`
 * is usually an icon-library name ("Zap"), not a URL. */
const URL_LIKE = /^(\/|https?:|data:image\/)/i;

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m3u8)(\?|#|$)/i;
/** Asset hosts known to serve media without a file extension in the URL
 * (thumbnail CDNs) — checked only once the extension test comes up empty. */
const KNOWN_MEDIA_HOSTS = new Set(["i.ytimg.com", "img.youtube.com"]);

const LINK_KEY = /^(href|url|link|path|ctaHref|buttonHref|targetUrl)$/i;
const LABEL_KEY = /^(label|title|heading|headline|name|text|ctaText|buttonText|ctaButtonText|linkText|anchorText)$/i;
/** Button labels/prefixes (`ctaButtonText`, `ctaButtonPrefix`, `buttonText`)
 * — only meaningful attached to a destination, so the owning link/form
 * renders them and the generic walk never prints them on their own. */
const BUTTON_COPY_KEY = /(button|cta)(text|label|prefix|suffix)$/i;
/** Numbers worth showing (prices, stats); every other number/boolean is config. */
const NUMERIC_COPY_KEY = /(price|amount|cost|stat|count|value|number|percent|total)$/i;
const HEADING_KEY = /^(title|heading|headline|name)$/i;
const TEXT_KEY = /^(description|subtitle|text|content|body|excerpt|summary|copy|tagline)$/i;
const AVATAR_ARRAY_KEY = /^avatars?$/i;
/** Exact-match structural/internal keys — never meaningful as visible copy. */
const SKIP_KEY_EXACT =
  /^(id|_id|key|slug|type|layout|order|index|visible|enabled|hidden|weight|zindex|variant|inputtype|queryparamname|ctavariant|newtab|alt)$/i;
/** Style/theming keys are often compound (`wordColors`, `bgColor`,
 * `iconName`, `cardStyle`) rather than a bare `color`/`style` — matched as a
 * substring so those still get skipped. */
const SKIP_KEY_CONTAINS = /(color|colour|style|theme|classname|iconname|animation|background)/i;
/** Id references and playlist/filter plumbing (`videoIds`, `playlists`,
 * `defaultPlaylistId`) — navigation state for interactive widgets, not copy. */
const SKIP_KEY_PLUMBING = /(ids|playlists?|playlistid|slot|tone|placement|railposition)$/i;

function isSkippableKey(key: string): boolean {
  return SKIP_KEY_EXACT.test(key) || SKIP_KEY_CONTAINS.test(key) || SKIP_KEY_PLUMBING.test(key);
}

/** `footer` is rendered once in `app/layout.tsx` (see `components/Footer.tsx`)
 * from the same `content.footer` data, so every route gets it — the generic
 * per-section walk here never sees it, or it'd render twice. `sidePageIndex`
 * is an internal array PostKing attaches purely to build the footer's auto
 * "Solutions" link column server-side — it's never a rendered section (no
 * universal-lp component reads it), and walking it generically would dump
 * every side page's raw `siteMetadata.title/description/keywords` under no
 * heading at all. `customHtml` (the id -> section map itself, feature 117)
 * is addressed piecemeal via `customHtml:<id>` entries in `sectionOrder`
 * below — walking the raw map here would dump every section's markup as
 * garbled text under one heading instead of rendering each in its own
 * ordered slot. */
const TOP_LEVEL_SKIP = new Set(["sidePages", "footer", "sidePageIndex", "customHtml"]);

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  const trimmed = spaced.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function findKey(obj: JsonRecord, pattern: RegExp): string | undefined {
  return Object.keys(obj).find((key) => pattern.test(key) && typeof obj[key] === "string");
}

function extractImageSrc(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (isPlainObject(value)) {
    const key = findKey(value, /^(url|src)$/i);
    return key ? (value[key] as string) : undefined;
  }
  return undefined;
}

function extractAlt(value: unknown, fallback: string): string {
  if (isPlainObject(value)) {
    const key = findKey(value, /^alt$/i);
    if (key) return (value[key] as string) || fallback;
  }
  return fallback;
}

function orderedKeys(content: JsonRecord, sectionOrder: string[] | undefined): string[] {
  const all = Object.keys(content);
  if (!sectionOrder || sectionOrder.length === 0) return all;
  // A `customHtml:<id>` entry is never itself a `content` key (its HTML
  // lives at `content.customHtml[id]` — see `renderSections` below), so it
  // wouldn't otherwise survive the `all.includes` filter below. Keep it in
  // position anyway; `renderSections` resolves its value separately.
  const known = sectionOrder.filter((key) => all.includes(key) || customHtmlIdFrom(key) !== undefined);
  const rest = all.filter((key) => !known.includes(key));
  return [...known, ...rest];
}

/** A slot-value string that looks like a renderable image/video URL, by
 * extension or by a known media-CDN host — e.g. a YouTube thumbnail
 * (`posterUrl`) that isn't a recognized "image-ish" key name. */
function mediaKindFromUrl(value: string): "IMAGE" | "VIDEO" | undefined {
  if (!URL_LIKE.test(value)) return undefined;
  if (VIDEO_EXT_RE.test(value)) return "VIDEO";
  if (IMAGE_EXT_RE.test(value)) return "IMAGE";
  try {
    const hostname = new URL(value, "https://placeholder.invalid").hostname;
    if (KNOWN_MEDIA_HOSTS.has(hostname)) return "IMAGE";
  } catch {
    /* relative paths without a matching extension aren't treated as media */
  }
  return undefined;
}

/** Renders a resolved slot (or ad hoc media URL) as `<img>`/`<video>`. */
function renderMediaSlot(slot: ResolvedSlot, path: string, alt: string, className?: string): ReactNode {
  const isVideo = slot.type === "VIDEO" || (slot.mimeType?.startsWith("video/") ?? false);
  if (isVideo) {
    return (
      <video key={path} className={className} controls muted playsInline preload="metadata">
        <source src={slot.url} type={slot.mimeType} />
      </video>
    );
  }
  return <img key={path} className={className} src={slot.url} alt={alt || slot.name} />;
}

/** Per-section render state: the flat resolved slot map, and which slot
 * keys this section's content already accounted for (a `slotKey` field, a
 * resolved avatar ref, or a resolved logo) — so the section-level leftover
 * pass only shows slots nothing else already rendered. */
interface SlotCtx {
  slots: Record<string, ResolvedSlot>;
  consumed: Set<string>;
}

function isLinkList(value: unknown[]): boolean {
  return value.length > 0 && value.every((item) => isPlainObject(item) && findKey(item, LINK_KEY) !== undefined);
}

function isFaqList(value: unknown[]): value is JsonRecord[] {
  return (
    value.length > 0 &&
    value.every((item) => isPlainObject(item) && typeof item.quest === "string" && typeof item.ans === "string")
  );
}

function renderNode(value: unknown, keyHint: string, depth: number, path: string, ctx: SlotCtx): ReactNode {
  if (value === null || value === undefined || depth > MAX_DEPTH) return null;
  if (isSkippableKey(keyHint)) return null;

  if (IMAGE_KEY.test(keyHint)) {
    const src = extractImageSrc(value);
    if (src && URL_LIKE.test(src)) {
      return <img key={path} src={absolutizeAssetUrl(src)} alt={extractAlt(value, humanize(keyHint))} />;
    }
    if (/icon$/i.test(keyHint)) return null;
  }

  if (BUTTON_COPY_KEY.test(keyHint)) return null;
  if (typeof value === "string") return renderString(keyHint, value, path);
  if (typeof value === "number" || typeof value === "boolean") return renderScalar(keyHint, value, path);
  if (Array.isArray(value)) return renderArray(value, keyHint, depth, path, ctx);
  if (isPlainObject(value)) return renderObject(value, depth, path, ctx);
  return null;
}

function renderString(key: string, value: string, path: string): ReactNode {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (LINK_KEY.test(key)) return null; // rendered by the owning object below, never standalone

  // A field that isn't a recognized "image-ish" key name but whose value is
  // itself a renderable media URL (e.g. a YouTube `posterUrl`) — the
  // "generic renderer" rule: detect media by value, not just by key.
  const kind = mediaKindFromUrl(trimmed);
  if (kind === "VIDEO") {
    return (
      <video key={path} controls muted playsInline preload="metadata">
        <source src={absolutizeAssetUrl(trimmed)} />
      </video>
    );
  }
  if (kind === "IMAGE") {
    return <img key={path} src={absolutizeAssetUrl(trimmed)} alt={humanize(key)} />;
  }

  if (HEADING_KEY.test(key)) return <h3 key={path}>{trimmed}</h3>;
  if (TEXT_KEY.test(key)) return <p key={path}>{trimmed}</p>;
  // An unrecognized string field: show it only when it reads like copy
  // (has a space, e.g. a badge "STOP JUGGLING 5 TOOLS"). Single tokens are
  // config values ("video", "marquee", "capture") — never shown, and never
  // with a field-name label.
  return /\s/.test(trimmed) ? <p key={path}>{trimmed}</p> : null;
}

function renderScalar(key: string, value: number | boolean, path: string): ReactNode {
  if (typeof value === "number" && NUMERIC_COPY_KEY.test(key)) {
    return <p key={path}>{String(value)}</p>;
  }
  return null;
}

function renderArray(value: unknown[], keyHint: string, depth: number, path: string, ctx: SlotCtx): ReactNode {
  if (value.length === 0) return null;

  if (AVATAR_ARRAY_KEY.test(keyHint) && value.every((item) => typeof item === "string")) {
    const avatars = (value as string[])
      .map((ref, index) => {
        const resolved = resolveSlotRef(ref, ctx.slots);
        if (resolved) {
          ctx.consumed.add(resolved.key);
          return { itemKey: `${path}-${index}`, slot: resolved.slot };
        }
        if (URL_LIKE.test(ref)) {
          return { itemKey: `${path}-${index}`, slot: { url: absolutizeAssetUrl(ref), type: "IMAGE", name: ref } };
        }
        return null;
      })
      .filter((item): item is { itemKey: string; slot: ResolvedSlot } => item !== null);

    if (avatars.length > 0) {
      return (
        <ul className="avatar-row" key={path}>
          {avatars.map(({ itemKey, slot }) => (
            <li key={itemKey}>{renderMediaSlot(slot, itemKey, slot.name)}</li>
          ))}
        </ul>
      );
    }
    // Nothing resolved — these are asset references ("testimonials.fraser"),
    // never visible copy, so render nothing rather than printing them.
    return null;
  }

  if (isFaqList(value)) {
    return (
      <div className="faq-list" key={path}>
        {value.map((item, index) => (
          <details key={`${path}-${index}`}>
            <summary>{String(item.quest)}</summary>
            <p>{String(item.ans)}</p>
          </details>
        ))}
      </div>
    );
  }

  if (value.every(isPrimitive)) {
    return (
      <ul key={path}>
        {value.map((item, index) => (
          <li key={`${path}-${index}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  const rendered = value.map((item, index) => renderNode(item, keyHint, depth + 1, `${path}-${index}`, ctx));
  if (rendered.every((node) => node === null)) return null;

  const className = isLinkList(value) ? "link-list" : "card-grid";
  return (
    <ul className={className} key={path}>
      {value.map((_item, index) => (
        <li key={`${path}-${index}`}>{rendered[index]}</li>
      ))}
    </ul>
  );
}

/** Hero-style split titles: `title: {prefix, suffix}` with the middle word
 * coming from `rotatingWords` (first one wins — no animation here), unless a
 * non-empty `staticTitle` overrides it. Returns the composed heading plus the
 * keys it used so they aren't dumped again as raw fields. */
function composedTitle(value: JsonRecord): { text: string; keys: string[] } | null {
  const staticTitle = typeof value.staticTitle === "string" ? value.staticTitle.trim() : "";
  if (staticTitle) return { text: staticTitle, keys: ["title", "staticTitle", "rotatingWords", "rotatingWordsEnabled"] };
  const title = value.title;
  if (!isPlainObject(title)) return null;
  const prefix = typeof title.prefix === "string" ? title.prefix : "";
  const suffix = typeof title.suffix === "string" ? title.suffix : "";
  if (!prefix && !suffix) return null;
  const words = Array.isArray(value.rotatingWords) ? value.rotatingWords : [];
  const middle = typeof words[0] === "string" ? words[0] : "";
  return {
    text: [prefix, middle, suffix].filter(Boolean).join(" "),
    keys: ["title", "staticTitle", "rotatingWords", "rotatingWordsEnabled"],
  };
}

function renderObject(value: JsonRecord, depth: number, path: string, ctx: SlotCtx): ReactNode {
  const hrefKey = findKey(value, LINK_KEY);
  if (hrefKey) {
    const href = value[hrefKey] as string;
    if (href.trim()) {
      const labelKey = findKey(value, LABEL_KEY);
      const label = labelKey ? (value[labelKey] as string) : href;
      return (
        <a key={path} href={href}>
          {label}
        </a>
      );
    }
  }

  // A capture form (`{submitUrl, buttonText, placeholder, queryParamName}`,
  // e.g. hero `ctaCapture`) — a real GET form rather than raw fields.
  if (typeof value.submitUrl === "string" && value.submitUrl.trim()) {
    const name = typeof value.queryParamName === "string" && value.queryParamName ? value.queryParamName : "q";
    return (
      <form key={path} className="capture-form" action={value.submitUrl} method="get">
        <input
          name={name}
          type={value.inputType === "email" ? "email" : "text"}
          placeholder={typeof value.placeholder === "string" ? value.placeholder : undefined}
          aria-label={typeof value.placeholder === "string" ? value.placeholder : name}
          required
        />
        <button type="submit" className="button">
          {typeof value.buttonText === "string" && value.buttonText ? value.buttonText : "Submit"}
        </button>
        {typeof value.helperText === "string" && value.helperText ? <small>{value.helperText}</small> : null}
      </form>
    );
  }

  // A `slotKey` field points this object's media at a slot directly (e.g.
  // a showcase feature's `slotKey: "showcase.video.1"`) rather than the
  // API inlining a URL.
  const slotKeyValue = typeof value.slotKey === "string" ? value.slotKey : undefined;
  const slotMedia = slotKeyValue ? ctx.slots[slotKeyValue] : undefined;
  if (slotKeyValue && slotMedia) ctx.consumed.add(slotKeyValue);

  // A YouTube-hosted clip (video sections) — link its thumbnail to the
  // video instead of leaving `posterUrl`/`externalId` as raw data fields.
  const platform = typeof value.platform === "string" ? value.platform : undefined;
  const externalId = typeof value.externalId === "string" ? value.externalId : undefined;
  const posterUrl = typeof value.posterUrl === "string" ? value.posterUrl : undefined;
  const isYoutube = platform ? /youtube/i.test(platform) : false;
  const ytThumb =
    isYoutube && externalId && posterUrl ? (
      <a key={`${path}-yt`} className="yt-thumb" href={`https://www.youtube.com/watch?v=${externalId}`}>
        <img
          src={absolutizeAssetUrl(posterUrl)}
          alt={typeof value.title === "string" ? value.title : "Watch on YouTube"}
        />
      </a>
    ) : null;

  const headingKey = findKey(value, HEADING_KEY);
  const textKey = findKey(value, TEXT_KEY);
  const composed = headingKey ? null : composedTitle(value);

  const children: ReactNode[] = [];
  if (slotMedia) {
    const alt = headingKey ? (value[headingKey] as string) : slotMedia.name;
    children.push(<Fragment key={`${path}-slot`}>{renderMediaSlot(slotMedia, `${path}-slot`, alt)}</Fragment>);
  }
  if (ytThumb) children.push(ytThumb);
  if (headingKey) {
    const highlight = typeof value.titleHighlight === "string" ? value.titleHighlight.trim() : "";
    const heading = highlight ? `${value[headingKey] as string} ${highlight}` : (value[headingKey] as string);
    children.push(
      depth === 0 ? (
        <h2 key={`${path}-heading`}>{heading}</h2>
      ) : (
        <h3 key={`${path}-heading`}>{heading}</h3>
      )
    );
  }
  if (composed) {
    children.push(
      depth === 0 ? <h2 key={`${path}-heading`}>{composed.text}</h2> : <h3 key={`${path}-heading`}>{composed.text}</h3>
    );
  }
  if (textKey) {
    children.push(<p key={`${path}-text`}>{value[textKey] as string}</p>);
  }

  for (const key of Object.keys(value)) {
    if (key === headingKey || key === textKey || key === "slotKey") continue;
    if (composed?.keys.includes(key)) continue;
    if (key === "titleHighlight" && headingKey) continue;
    if (ytThumb && (key === "posterUrl" || key === "externalId" || key === "platform" || key === "sourceLabel")) {
      continue;
    }
    const rendered = renderNode(value[key], key, depth + 1, `${path}-${key}`, ctx);
    if (rendered) children.push(<Fragment key={`${path}-${key}-wrap`}>{rendered}</Fragment>);
  }

  if (children.length === 0) return null;
  return <Fragment key={path}>{children}</Fragment>;
}

/** A section's own slots that no content field claimed (via a `slotKey`
 * field, an avatar ref, or the header/footer logo) — e.g.
 * `hero.backgroundVideo`, or `showcase.video.2..5` once `.video.1` was
 * claimed by a showcase feature's `slotKey`. */
function leftoverSectionMedia(ctx: SlotCtx, prefix: string, sectionPathKey: string): ReactNode {
  const items = Object.entries(ctx.slots).filter(
    ([slotKey]) => slotKey.startsWith(`${prefix}.`) && !ctx.consumed.has(slotKey)
  );
  if (items.length === 0) return null;
  return (
    <div className="section-media" key={`${sectionPathKey}-media`}>
      {items.map(([slotKey, slot]) => (
        <Fragment key={slotKey}>{renderMediaSlot(slot, `${sectionPathKey}-${slotKey}`, slot.name)}</Fragment>
      ))}
    </div>
  );
}

/** Resolves the header/footer logo slot, falling back to a small neutral
 * default mark (mirroring universal-lp's own default-asset behavior —
 * "never show nothing where a logo belongs") when neither light nor dark
 * variant resolves. */
function resolveLogo(ctx: SlotCtx, prefix: string): ResolvedSlot {
  ctx.consumed.add(`${prefix}.logoLight`);
  ctx.consumed.add(`${prefix}.logoDark`);
  return ctx.slots[`${prefix}.logoLight`] ?? ctx.slots[`${prefix}.logoDark`] ?? defaultLogoSlot();
}

/** The sticky site header (logo + site name + nav) — always rendered first,
 * regardless of where `navigation` falls in `sectionOrder`/object key order
 * (a content ordering hint that has no opinion on chrome placement, and in
 * practice often doesn't list `navigation` at all, which would otherwise
 * push the header to wherever object-key order happens to leave it). */
function findNavKey(content: JsonRecord): string | undefined {
  if ("navigation" in content) return "navigation";
  if ("nav" in content) return "nav";
  return undefined;
}

/** The sticky site header (logo + site name + nav), built from
 * `content.navigation`/`content.nav`. Exported so callers (the page
 * components) can place it at the very top of the document themselves —
 * ahead of the page's own `<h1>` — rather than wherever `navigation` falls
 * in `sectionOrder`/object key order (a content ordering hint that has no
 * opinion on chrome placement, and in practice often doesn't list
 * `navigation` at all). */
export function renderHeader(
  content: JsonRecord,
  slots: Record<string, ResolvedSlot> = {},
  siteName?: string
): ReactNode {
  const navKey = findNavKey(content);
  if (!navKey) return null;
  const navValue = content[navKey];

  const ctx: SlotCtx = { slots, consumed: new Set<string>() };
  const rendered = navValue !== null && navValue !== undefined ? renderNode(navValue, navKey, 0, navKey, ctx) : null;
  const logo = resolveLogo(ctx, "header");
  if (!rendered && !logo && !siteName) return null;

  return (
    <header className="site-header">
      <div className="site-header-bar">
        {logo && renderMediaSlot(logo, "header-logo", siteName ?? logo.name, "site-logo")}
        {siteName && <span className="site-name">{siteName}</span>}
        <nav>{rendered}</nav>
      </div>
      {leftoverSectionMedia(ctx, "header", "header")}
    </header>
  );
}

/** Renders every top-level entry of a landing page's `content` object
 * EXCEPT `navigation`/`nav` (rendered separately via `renderHeader` — call
 * that first, ahead of this) and `footer` (rendered once, site-wide, in
 * `app/layout.tsx` — see `components/Footer.tsx`), in `sectionOrder`
 * (falling back to object key order), each wrapped in `<section>`. `slots`
 * (see `lib/slots.ts`) resolves logos and any per-section media the content
 * doesn't already reference by URL. */
/** `{count}` in a section's copy (e.g. categoryExplorer "{count} features…")
 * — `totalOverride`, else Σ `pillars[].featureCount`, else the longest
 * item list's length. Mirrors universal-lp's CategoryExplorer. */
function sectionCount(section: JsonRecord): string | undefined {
  if (typeof section.totalOverride === "string" || typeof section.totalOverride === "number") {
    return String(section.totalOverride);
  }
  if (Array.isArray(section.pillars)) {
    const total = section.pillars.reduce<number>((sum, pillar) => {
      if (!isPlainObject(pillar)) return sum;
      if (typeof pillar.featureCount === "number") return sum + pillar.featureCount;
      return sum + (Array.isArray(pillar.features) ? pillar.features.length : 0);
    }, 0);
    return total > 0 ? String(total) : undefined;
  }
  const longest = Object.values(section).reduce<number>(
    (max, v) => (Array.isArray(v) && v.length > max ? v.length : max),
    0
  );
  return longest > 0 ? String(longest) : undefined;
}

/** Fills `{count}` and drops any string still holding an unfilled
 * `{placeholder}` (ROI calculator templates like `{value}`/`{roi}` that only
 * make sense with interactive JS) instead of printing the raw template. */
function interpolate(value: unknown, count: string | undefined): unknown {
  if (typeof value === "string") {
    const filled = count ? value.replaceAll("{count}", count) : value;
    return /\{[a-zA-Z_]+\}/.test(filled) ? "" : filled;
  }
  if (Array.isArray(value)) return value.map((item) => interpolate(item, count));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, count)]));
  }
  return value;
}

export function renderSections(
  content: JsonRecord,
  sectionOrder?: string[],
  slots: Record<string, ResolvedSlot> = {}
): ReactNode {
  const navKey = findNavKey(content);
  const keys = orderedKeys(content, sectionOrder).filter((key) => key !== navKey);

  return (
    <>
      {keys.map((key) => {
        if (TOP_LEVEL_SKIP.has(key)) return null;

        // `customHtml:<id>` entries (feature 117) address `content.customHtml[id]`,
        // never `content[key]` directly — see `orderedKeys` above and
        // `components/sections/CustomHtml.tsx`.
        const customHtmlId = customHtmlIdFrom(key);
        const customHtmlMap = isPlainObject(content.customHtml) ? (content.customHtml as JsonRecord) : undefined;
        const value =
          customHtmlId !== undefined
            ? (customHtmlMap?.[customHtmlId] as CustomHtmlSection | undefined)
            : content[key];
        if (value === null || value === undefined) return null;
        // A stale `customHtml:<id>` (section deleted, id typo'd) or one with
        // empty markup — skip the `<section>` wrapper entirely rather than
        // rendering it empty.
        if (customHtmlId !== undefined && !(value as CustomHtmlSection).html) return null;

        // A dedicated component (`components/sections/**`) for this section
        // type wins over the generic walk below — `undefined` means "no
        // dedicated component, fall back to the generic walk"; `null` means
        // "deliberately empty" (e.g. `liveVisitorBar`, live-only).
        const ctx: SlotCtx = { slots, consumed: new Set<string>() };
        const known = renderKnownSection(key, value, slots, ctx.consumed);
        if (known !== undefined) {
          if (!known) return null;
          const sectionClass =
            customHtmlId !== undefined ? `pk-section-customHtml-${customHtmlId}` : `pk-section-${key}`;
          return (
            <section className={`pk-section ${sectionClass}`} key={key}>
              {known}
              {leftoverSectionMedia(ctx, sectionSlotPrefix(key), key)}
            </section>
          );
        }

        const sanitized = sanitizeSectionValue(key, value);
        const filled = isPlainObject(sanitized) ? interpolate(sanitized, sectionCount(sanitized)) : sanitized;
        const rendered = renderNode(filled, key, 0, key, ctx);
        if (!rendered) return null;
        return (
          <section className={`pk-section pk-section-${key}`} key={key}>
            {rendered}
            {leftoverSectionMedia(ctx, sectionSlotPrefix(key), key)}
          </section>
        );
      })}
    </>
  );
}
