import type { FooterData } from "@/lib/footer";
import { hasFooterContent } from "@/lib/footer";
import type { ResolvedSlot } from "@/lib/slots";
import { CtaLink } from "@/components/sections/shared";

export interface SiteFooterProps {
  data: FooterData | undefined;
  logo?: ResolvedSlot;
  siteName?: string;
}

/**
 * The site-wide footer — rendered once in `app/layout.tsx` from the root
 * landing page's `content.footer`, so it appears on every route (home, side
 * pages, blog index/article/category) without the generic `Data.tsx`
 * renderer ever seeing `footer` (excluded there — see `TOP_LEVEL_SKIP`).
 */
export function SiteFooter({ data, logo, siteName }: SiteFooterProps) {
  if (!hasFooterContent(data) && !logo) return null;

  return (
    <>
      {data?.preFooterCta && (data.preFooterCta.title || data.preFooterCta.description || data.preFooterCta.ctaButton) && (
        <div className="pre-footer-cta">
          {data.preFooterCta.title && <h2>{data.preFooterCta.title}</h2>}
          {data.preFooterCta.description && <p>{data.preFooterCta.description}</p>}
          {data.preFooterCta.ctaButton && (
            <CtaLink href={data.preFooterCta.ctaButton.url} label={data.preFooterCta.ctaButton.text} />
          )}
        </div>
      )}
      <footer className="site-footer">
      <div className="site-footer-inner">
        {(logo || data?.description) && (
          <div className="site-footer-brand">
            {logo && <img className="site-logo" src={logo.url} alt={siteName ?? logo.name} />}
            {data?.description && <p>{data.description}</p>}
          </div>
        )}

        {data?.contact && (data.contact.email || data.contact.phone || data.contact.address) && (
          <div className="site-footer-contact">
            {data.contact.title && <h3>{data.contact.title}</h3>}
            {data.contact.email && <p>{data.contact.email}</p>}
            {data.contact.phone && <p>{data.contact.phone}</p>}
            {data.contact.address && <p>{data.contact.address}</p>}
            {data.contact.responseTime && <p>{data.contact.responseTime}</p>}
          </div>
        )}

        {data && data.sections.length > 0 && (
          <div className="site-footer-columns">
            {data.sections.map((section, sectionIndex) => (
              <div className="site-footer-column" key={`${sectionIndex}-${section.title}`}>
                <h3>{section.title}</h3>
                <ul className="link-list link-list-vertical">
                  {section.links.map((link, linkIndex) => (
                    <li key={`${linkIndex}-${link.href}`}>
                      <a href={link.href}>{link.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data && data.social.length > 0 && (
          <ul className="link-list site-footer-social">
            {data.social.map((social, socialIndex) => (
              <li key={`${socialIndex}-${social.href}`}>
                <a href={social.href}>{social.name}</a>
              </li>
            ))}
          </ul>
        )}

        {data && (data.copyright || data.legalLinks.length > 0) && (
          <div className="site-footer-legal">
            {data.copyright && <span>{data.copyright}</span>}
            {data.legalLinks.length > 0 && (
              <ul className="link-list">
                {data.legalLinks.map((link, legalIndex) => (
                  <li key={`${legalIndex}-${link.href}`}>
                    <a href={link.href}>{link.title}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      </footer>
    </>
  );
}
