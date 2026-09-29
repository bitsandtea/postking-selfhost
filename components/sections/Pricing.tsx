import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { CtaLink, isPlainObject, isStringArray, str } from "./shared";

/**
 * `content.pricing` (and a `"pricing"`-typed custom block, same shape) —
 * tier cards: name, price+period, feature list, CTA. Two CTA-url shapes
 * exist in the wild: a plain `ctaUrl`, or a custom-block variant's
 * `urls.{monthly,annual}`. `meta` (a single string) is an alternate to
 * `metaItems[]` for a plan with no bullet list (e.g. a "Done For You" tier).
 */

function planCtaHref(plan: JsonRecord): string | undefined {
  if (str(plan.ctaUrl)) return str(plan.ctaUrl);
  const urls = isPlainObject(plan.urls) ? plan.urls : undefined;
  return str(urls?.monthly) ?? str(urls?.annual) ?? str(plan.annualUrl);
}

function planPriceLabel(plan: JsonRecord, currency: string): string | undefined {
  if (typeof plan.price !== "number") return undefined;
  return `${currency}${plan.price}${str(plan.period) ?? ""}`;
}

function PricingPlan({ plan, currency }: { plan: JsonRecord; currency: string }): ReactNode {
  const name = str(plan.name);
  if (!name) return null;
  const features = Array.isArray(plan.features)
    ? plan.features
        .map((f) => (isPlainObject(f) ? str(f.text) : typeof f === "string" ? f : undefined))
        .filter((t): t is string => !!t)
    : [];
  const metaItems = isStringArray(plan.metaItems) ? plan.metaItems : typeof plan.meta === "string" ? [plan.meta] : [];
  const outputs = Array.isArray(plan.outputs)
    ? plan.outputs
        .map((o) => (isPlainObject(o) ? [str(o.value), str(o.unit), str(o.label)].filter(Boolean).join(" ") : undefined))
        .filter((t): t is string => !!t)
    : [];

  return (
    <li>
      <h3>{name}</h3>
      {planPriceLabel(plan, currency) && <p>{planPriceLabel(plan, currency)}</p>}
      {str(plan.description) && <p>{str(plan.description)}</p>}
      {outputs.length > 0 && (
        <ul>
          {outputs.map((o, oi) => (
            <li key={`${oi}-${o}`}>{o}</li>
          ))}
        </ul>
      )}
      {features.length > 0 && (
        <ul>
          {features.map((f, fi) => (
            <li key={`${fi}-${f}`}>{f}</li>
          ))}
        </ul>
      )}
      {metaItems.length > 0 && (
        <ul>
          {metaItems.map((m, mi) => (
            <li key={`${mi}-${m}`}>{m}</li>
          ))}
        </ul>
      )}
      {str(plan.billingNote) && <p>{str(plan.billingNote)}</p>}
      {str(plan.valueProp) && <p>{str(plan.valueProp)}</p>}
      <CtaLink href={planCtaHref(plan)} label={plan.cta} />
    </li>
  );
}

export function Pricing({ value }: { value: JsonRecord }): ReactNode {
  const plans = Array.isArray(value.plans) ? value.plans.filter(isPlainObject) : [];
  if (plans.length === 0) return null;
  const currency = str(value.currency) ?? "$";
  const footer = isPlainObject(value.footer) ? value.footer : undefined;

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.description) && <p>{str(value.description)}</p>}
      <ul className="card-grid">
        {plans.map((plan, index) => (
          <PricingPlan plan={plan} currency={currency} key={`${index}-${str(plan.id) ?? ""}`} />
        ))}
      </ul>
      {str(footer?.contact) && <p>{str(footer?.contact)}</p>}
      {str(footer?.disclaimer) && <p>{str(footer?.disclaimer)}</p>}
    </>
  );
}
