import type { JsonRecord } from "@/types/landing-page";

/**
 * Defensive parsing of `content.footer` — an untyped JSON blob whose shape
 * this file is the only thing that needs to know about (the rest of the app
 * just gets back a small, safe `FooterData`). Every field is optional and
 * malformed/missing shapes silently drop out rather than throwing, since
 * this runs in the root layout on every page.
 */

export interface FooterLink {
  href: string;
  title: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  href: string;
  name: string;
}

export interface FooterContact {
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  responseTime?: string;
}

export interface FooterPreCta {
  title?: string;
  description?: string;
  ctaButton?: { url: string; text: string };
}

export interface FooterData {
  description?: string;
  sections: FooterSection[];
  social: FooterSocialLink[];
  legalLinks: FooterLink[];
  copyright?: string;
  contact?: FooterContact;
  /** A CTA banner shown just above the footer proper (`content.footer.preFooterCta`). */
  preFooterCta?: FooterPreCta;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseLinks(value: unknown): FooterLink[] {
  const links: FooterLink[] = [];
  for (const item of asArray(value) ?? []) {
    const rec = asRecord(item);
    const href = rec ? asString(rec.href) : undefined;
    const title = rec ? (asString(rec.title) ?? href) : undefined;
    if (href && title) links.push({ href, title });
  }
  return links;
}

function parseSections(value: unknown): FooterSection[] {
  const sections: FooterSection[] = [];
  for (const item of asArray(value) ?? []) {
    const rec = asRecord(item);
    if (!rec) continue;
    const title = asString(rec.title);
    const links = parseLinks(rec.links);
    if (title && links.length > 0) sections.push({ title, links });
  }
  return sections;
}

function parseSocial(value: unknown): FooterSocialLink[] {
  const social: FooterSocialLink[] = [];
  for (const item of asArray(value) ?? []) {
    const rec = asRecord(item);
    const href = rec ? asString(rec.href) : undefined;
    // `icon` is an icon-library name ("linkedin"), never a URL — skipped in
    // favor of the human-readable `name` as the link's visible label.
    const name = rec ? asString(rec.name) : undefined;
    if (href && name) social.push({ href, name });
  }
  return social;
}

function parseContact(value: unknown): FooterContact | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const contact: FooterContact = {
    title: asString(rec.title),
    email: asString(rec.email),
    phone: asString(rec.phone),
    address: asString(rec.address),
    responseTime: asString(rec.responseTime),
  };
  return Object.values(contact).some(Boolean) ? contact : undefined;
}

function parseCtaButton(value: unknown): { url: string; text: string } | undefined {
  const rec = asRecord(value);
  const url = rec ? asString(rec.url) : undefined;
  const text = rec ? asString(rec.text) : undefined;
  return url && text ? { url, text } : undefined;
}

function parsePreFooterCta(value: unknown): FooterPreCta | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  const preFooterCta: FooterPreCta = {
    title: asString(rec.title),
    description: asString(rec.description),
    ctaButton: parseCtaButton(rec.ctaButton),
  };
  return preFooterCta.title || preFooterCta.description || preFooterCta.ctaButton ? preFooterCta : undefined;
}

/** Parses `content.footer` into the shape `components/Footer.tsx` renders.
 * Returns `undefined` when `footer` isn't an object at all. */
export function parseFooterContent(footer: unknown): FooterData | undefined {
  const rec = asRecord(footer);
  if (!rec) return undefined;
  const brand = asRecord(rec.brand);
  const legal = asRecord(rec.legal);

  return {
    description: brand ? asString(brand.description) : undefined,
    sections: parseSections(rec.sections),
    social: parseSocial(rec.socialMedia),
    legalLinks: parseLinks(legal?.links),
    copyright: legal ? asString(legal.copyright) : undefined,
    contact: parseContact(rec.contact),
    preFooterCta: parsePreFooterCta(rec.preFooterCta),
  };
}

/** Whether a parsed footer has anything at all worth rendering. */
export function hasFooterContent(data: FooterData | undefined): data is FooterData {
  if (!data) return false;
  return Boolean(
    data.description ||
      data.sections.length > 0 ||
      data.social.length > 0 ||
      data.legalLinks.length > 0 ||
      data.copyright ||
      data.contact ||
      data.preFooterCta
  );
}
