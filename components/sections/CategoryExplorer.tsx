import type { ReactNode } from "react";
import type { ResolvedSlot } from "@/lib/slots";
import type { JsonRecord } from "@/types/landing-page";
import { Media, isPlainObject, isStringArray, str } from "./shared";

/**
 * `content.categoryExplorer` — pillars grid. `{count}` in `title` fills
 * from `totalOverride`, else the sum of `pillars[].featureCount` — never a
 * guessed array length; dropped (not printed) when neither is present.
 * `demoSlot`/`demoCaption`/`tone`/`id` are config/production-notes, skipped.
 */
function count(value: JsonRecord, pillars: JsonRecord[]): string | undefined {
  if (typeof value.totalOverride === "string" || typeof value.totalOverride === "number") {
    return String(value.totalOverride);
  }
  const total = pillars.reduce((sum, p) => sum + (typeof p.featureCount === "number" ? p.featureCount : 0), 0);
  return total > 0 ? String(total) : undefined;
}

export function CategoryExplorer({
  value,
  slots,
  consumed,
}: {
  value: JsonRecord;
  slots: Record<string, ResolvedSlot>;
  consumed: Set<string>;
}): ReactNode {
  const pillars = Array.isArray(value.pillars) ? value.pillars.filter(isPlainObject) : [];
  if (pillars.length === 0) return null;
  const total = count(value, pillars);
  const title = str(value.title);
  const filledTitle = title && (total ? title.replaceAll("{count}", total) : title.replace(/\s*\{count\}\s*/g, " ").trim());

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {filledTitle && <h2>{filledTitle}</h2>}
      <ul className="card-grid">
        {pillars.map((pillar, i) => {
          const features = isStringArray(pillar.features) ? pillar.features : [];
          return (
            <li key={`${i}-${str(pillar.id) ?? ""}`}>
              <Media slotKey={pillar.demoSlot} alt={str(pillar.name)} slots={slots} consumed={consumed} />
              {str(pillar.name) && <h3>{str(pillar.name)}</h3>}
              {str(pillar.blurb) && <p>{str(pillar.blurb)}</p>}
              {features.length > 0 && (
                <ul>
                  {features.map((f, fi) => (
                    <li key={`${fi}-${f}`}>{f}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
