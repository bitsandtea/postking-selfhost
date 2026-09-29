import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { str } from "./shared";

/**
 * `content.roiCalculator` — fully client-computed: the `FORMULAS` registry
 * keyed by `formulaId` lives only in universal-lp's TS source, never in the
 * payload, and `callout`'s `{roi}` / each `outputs[].label`'s `{value}` are
 * filled by calling those functions against live slider state. There is no
 * sane static fallback — show only the section's own static copy and drop
 * `inputs[]`, `outputs[]`, `headlineOutput`, `callout`, `constants`,
 * `inputsLabel`, `resultLabel` entirely.
 */
export function RoiCalculator({ value }: { value: JsonRecord }): ReactNode {
  const badge = str(value.badge);
  const title = str(value.title);
  const subtitle = str(value.subtitle);
  if (!badge && !title && !subtitle) return null;
  return (
    <>
      {badge && <p>{badge}</p>}
      {title && <h2>{title}</h2>}
      {subtitle && <p>{subtitle}</p>}
    </>
  );
}
