import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { CtaLink, isPlainObject, str } from "./shared";

/**
 * `content.cta` — badge/title/description + a `features[]` card grid
 * (icon skipped, it's a Lucide name) + `ctaButton`. `countdown` is gated on
 * `countdown.enabled === true` by the real component — the previous
 * generic walk printed `countdown.title` even when disabled, which is the
 * leak this component fixes. `floatingBadge`/`limitedTime` duplicate the
 * section's own badge/CTA copy and need a live timer to mean anything, so
 * neither is ever shown.
 */
export function CTA({ value }: { value: JsonRecord }): ReactNode {
  const features = Array.isArray(value.features) ? value.features.filter(isPlainObject) : [];
  const ctaButton = isPlainObject(value.ctaButton) ? value.ctaButton : undefined;
  const countdown = isPlainObject(value.countdown) ? value.countdown : undefined;
  const countdownTitle = countdown?.enabled === true ? str(countdown.title) : undefined;

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.description) && <p>{str(value.description)}</p>}
      {countdownTitle && <p>{countdownTitle}</p>}
      {features.length > 0 && (
        <ul className="card-grid">
          {features.map((f, i) => (
            <li key={`${i}-${str(f.title) ?? ""}`}>
              {str(f.title) && <h3>{str(f.title)}</h3>}
              {str(f.description) && <p>{str(f.description)}</p>}
            </li>
          ))}
        </ul>
      )}
      {ctaButton && <CtaLink href={ctaButton.url} label={ctaButton.text} />}
    </>
  );
}
