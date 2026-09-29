import type { ReactNode } from "react";
import { resolveSlotRef } from "@/lib/slots";
import type { ResolvedSlot } from "@/lib/slots";
import type { JsonRecord } from "@/types/landing-page";
import { Avatar, CtaLink, isPlainObject, str } from "./shared";

/**
 * `content.hero` — every variant (`type`: video/image/capture/split, plus
 * `rotatingWords`) shares the same field names; `type`/`layout`/`ctaVariant`
 * only pick which of these fields are populated, so one component covers
 * all of them. Confirmed against a real payload — see `lib/section-hints.tsx`
 * history / the task's research notes.
 */

function heroHeading(hero: JsonRecord): string | undefined {
  const staticTitle = str(hero.staticTitle);
  if (staticTitle) return staticTitle;
  const title = hero.title;
  if (typeof title === "string") return str(title);
  if (!isPlainObject(title)) return undefined;
  const prefix = str(title.prefix) ?? "";
  const suffix = str(title.suffix) ?? "";
  const words = Array.isArray(hero.rotatingWords) ? hero.rotatingWords : [];
  const middle = typeof words[0] === "string" ? words[0] : "";
  return [prefix, middle, suffix].filter(Boolean).join(" ") || undefined;
}

function CaptureForm({ capture }: { capture: JsonRecord }): ReactNode {
  const submitUrl = str(capture.submitUrl);
  if (!submitUrl) return null;
  const name = str(capture.queryParamName) ?? "q";
  return (
    <form className="capture-form" action={submitUrl} method="get">
      <input
        name={name}
        type={capture.inputType === "email" ? "email" : "text"}
        placeholder={str(capture.placeholder)}
        aria-label={str(capture.placeholder) ?? name}
        required
      />
      <button type="submit" className="button">
        {str(capture.buttonText) ?? "Submit"}
      </button>
      {str(capture.helperText) && <small>{str(capture.helperText)}</small>}
    </form>
  );
}

function LovedBy({
  lovedBy,
  slots,
  consumed,
}: {
  lovedBy: JsonRecord;
  slots: Record<string, ResolvedSlot>;
  consumed: Set<string>;
}): ReactNode {
  const refs = Array.isArray(lovedBy.avatars) ? lovedBy.avatars.filter((r): r is string => typeof r === "string") : [];
  const text = str(lovedBy.text);
  if (refs.length === 0 && !text) return null;
  return (
    <div className="loved-by">
      {refs.length > 0 && (
        <ul className="avatar-row">
          {refs.map((ref, i) => {
            const resolved = resolveSlotRef(ref, slots);
            if (resolved) consumed.add(resolved.key);
            // No resolved asset (a broken/missing slot id, common in local
            // dev): fall back to the ref's own name fragment for initials
            // ("testimonials.fraser" -> "fraser" -> "F") rather than a bare
            // "?" — never the raw ref string itself as visible text.
            const fallbackName = resolved ? undefined : ref.replace(/^testimonials\./i, "");
            return (
              <li key={i}>
                <Avatar url={resolved?.slot.url} name={resolved?.slot.name ?? fallbackName} />
              </li>
            );
          })}
        </ul>
      )}
      {text && <p>{text}</p>}
    </div>
  );
}

function TestimonialCards({ items }: { items: unknown[] }): ReactNode {
  const cards = items.filter(isPlainObject);
  if (cards.length === 0) return null;
  return (
    <ul className="card-grid">
      {cards.map((t, i) => (
        <li key={`${i}-${str(t.name) ?? ""}`}>
          {str(t.quote) && <p>&ldquo;{str(t.quote)}&rdquo;</p>}
          {(str(t.name) || str(t.role)) && (
            <p>
              {str(t.name)}
              {str(t.role) ? ` — ${str(t.role)}` : ""}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Hero({
  value,
  slots,
  consumed,
}: {
  value: JsonRecord;
  slots: Record<string, ResolvedSlot>;
  consumed: Set<string>;
}): ReactNode {
  const heading = heroHeading(value);
  const description = str(value.description);
  const capture = isPlainObject(value.ctaCapture) ? value.ctaCapture : undefined;
  const primaryHref = isPlainObject(value.ctaButton) ? value.ctaButton.url : value.ctaButtonUrl;
  const secondaryHref = value.ctaSecondaryButtonUrl;
  const lovedBy = isPlainObject(value.lovedBy) ? value.lovedBy : undefined;
  const testimonials = Array.isArray(value.testimonials) ? value.testimonials : [];

  return (
    <>
      {heading && <h1>{heading}</h1>}
      {description && <p>{description}</p>}
      {capture ? (
        <CaptureForm capture={capture} />
      ) : (
        <>
          <CtaLink href={primaryHref} label={value.ctaButtonText} />
          <CtaLink href={secondaryHref} label={value.ctaSecondaryButtonText} />
        </>
      )}
      {lovedBy && <LovedBy lovedBy={lovedBy} slots={slots} consumed={consumed} />}
      {testimonials.length > 0 && <TestimonialCards items={testimonials} />}
    </>
  );
}
