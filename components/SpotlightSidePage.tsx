import type { ResolvedSlot } from "@/lib/slots";
import { Avatar, Media, str } from "@/components/sections/shared";
import type { SpotlightPageContent } from "@/types/side-page";

/**
 * `_meta.sidePageType === "spotlight"` — a flat, fixed-schema document (no
 * nested `hero`/`features`/etc. — see `types/side-page.ts`). `ctaPrimary`/
 * `ctaSecondary` carry no destination anywhere in the payload (the real
 * renderer points them at brand-level context this starter doesn't have),
 * so per the "no href, no button" rule they're dropped rather than printed
 * as label-only text.
 */
export function SpotlightSidePage({
  content,
  slots,
}: {
  content: SpotlightPageContent;
  slots: Record<string, ResolvedSlot>;
}) {
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const benefits = Array.isArray(content.benefits) ? content.benefits : [];

  return (
    <div className="pk-container">
      <section className="pk-section pk-section-hero">
        {str(content.kicker) && <p>{str(content.kicker)}</p>}
        {str(content.h1) && <h1>{str(content.h1)}</h1>}
        {str(content.sub) && <p>{str(content.sub)}</p>}
        <Media slotKey={content.heroImg?.slotKey} alt={str(content.h1)} slots={slots} />
      </section>

      {steps.length > 0 && (
        <section className="pk-section">
          {str(content.mechKicker) && <p>{str(content.mechKicker)}</p>}
          {str(content.mechTitle) && <h2>{str(content.mechTitle)}</h2>}
          <ul className="card-grid">
            {steps.map((step, i) => (
              <li key={`${i}-${step.id ?? ""}`}>
                <Media slotKey={step.img?.slotKey} alt={str(step.title)} slots={slots} />
                {str(step.title) && <h3>{str(step.title)}</h3>}
                {str(step.body) && <p>{str(step.body)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {benefits.length > 0 && (
        <section className="pk-section">
          {str(content.benKicker) && <p>{str(content.benKicker)}</p>}
          {str(content.benTitle) && <h2>{str(content.benTitle)}</h2>}
          <ul className="card-grid">
            {benefits.map((b, i) => (
              <li key={`${i}-${b.title ?? ""}`}>
                {str(b.title) && <h3>{str(b.title)}</h3>}
                {str(b.body) && <p>{str(b.body)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(str(content.quote) || str(content.statValue)) && (
        <section className="pk-section">
          {str(content.statValue) && (
            <p>
              <strong>{str(content.statValue)}</strong> {str(content.statLabel)}
            </p>
          )}
          {str(content.quote) && (
            <blockquote>
              <p>&ldquo;{str(content.quote)}&rdquo;</p>
              <footer className="author">
                <Avatar name={str(content.quoteAuthor)} />
                {[str(content.quoteAuthor), str(content.quoteRole)].filter(Boolean).join(" — ")}
              </footer>
            </blockquote>
          )}
        </section>
      )}

      {(str(content.ctaFootTitle) || str(content.ctaFootBody)) && (
        <section className="pk-section">
          {str(content.ctaFootTitle) && <h2>{str(content.ctaFootTitle)}</h2>}
          {str(content.ctaFootBody) && <p>{str(content.ctaFootBody)}</p>}
          {/* `ctaPrimary`/`ctaSecondary` carry no destination anywhere in
              this payload shape — dropped per the "no href, no button" rule
              rather than printed as label-only text. */}
        </section>
      )}
    </div>
  );
}
