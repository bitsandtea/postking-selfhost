import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { renderHeader } from "@/components/Data";
import { SiteFooter } from "@/components/Footer";
import { resolveContent } from "@/lib/content";
import { defaultLogoSlot } from "@/lib/default-assets";
import { parseFooterContent } from "@/lib/footer";
import { fetchLandingPage } from "@/lib/postking";
import { resolveSlots } from "@/lib/slots";

export const metadata: Metadata = {};

/**
 * Fetches the ROOT landing page once, here, so every route — including
 * `/blog/*` and `/tools/*`, which never otherwise touch the LP endpoint —
 * gets the same site header and footer. Next dedupes/caches this against
 * the identical fetch `/`/`/[page]` already make (same URL, same
 * `revalidate` window), so this costs nothing extra on those routes.
 *
 * The header always reflects the ROOT page's own `navigation` (never a side
 * page's per-page override): a comparison/spotlight side page's own
 * `content` carries no `navigation` key at all (it's a standalone document
 * — see `types/side-page.ts`), and PostKing's API separately always
 * returns the top-level `navigation` field as the PARENT's nav regardless
 * of which side page was requested, so this is the same nav every route
 * would resolve to anyway — just fetched once instead of per-route.
 * Failures fall back to no header/footer rather than breaking every page.
 */
async function loadChromeProps() {
  try {
    const data = await fetchLandingPage();
    if (!data) return { header: null, footerData: undefined, logo: undefined, siteName: undefined };
    const content = resolveContent(data);
    const slots = resolveSlots(data);
    return {
      header: renderHeader(content, slots, data.name),
      footerData: parseFooterContent(data.content?.footer),
      logo: slots["footer.logoLight"] ?? slots["footer.logoDark"] ?? defaultLogoSlot(),
      siteName: data.name,
    };
  } catch {
    return { header: null, footerData: undefined, logo: undefined, siteName: undefined };
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { header, footerData, logo, siteName } = await loadChromeProps();

  return (
    <html lang="en">
      <body>
        {header}
        {children}
        <SiteFooter data={footerData} logo={logo} siteName={siteName} />
      </body>
    </html>
  );
}
