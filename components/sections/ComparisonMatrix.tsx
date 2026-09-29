import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { isPlainObject, str } from "./shared";

/**
 * `content.comparisonMatrix` — the root-LP numeric grid (distinct from a
 * comparison side-page's own textual `matrix` — see
 * `components/ComparisonSidePage.tsx`). `columns[]`={name,subtitle,
 * highlighted}, `rows[]`={feature,values:number[]} positionally aligned to
 * `columns`. Confirmed `0=none, 1=partial, 2=full`, matching
 * `legend.{none,partial,full}` — rendered as the legend WORD, never the
 * raw digit.
 */
const LEGEND_KEY: Record<number, "full" | "partial" | "none"> = { 2: "full", 1: "partial", 0: "none" };

export function ComparisonMatrix({ value }: { value: JsonRecord }): ReactNode {
  const columns = Array.isArray(value.columns) ? value.columns.filter(isPlainObject) : [];
  const rows = Array.isArray(value.rows) ? value.rows.filter(isPlainObject) : [];
  if (columns.length === 0 || rows.length === 0) return null;
  const legend = isPlainObject(value.legend) ? value.legend : {};

  const wordFor = (mark: number): string => {
    const key = LEGEND_KEY[mark];
    return (key && str(legend[key])) || (mark === 2 ? "Yes" : mark === 1 ? "Partial" : "No");
  };

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.subtitle) && <p>{str(value.subtitle)}</p>}
      <table>
        <thead>
          <tr>
            <th></th>
            {columns.map((col, i) => (
              <th key={`${i}-${str(col.name) ?? ""}`}>
                {str(col.name)}
                {str(col.subtitle) ? ` — ${str(col.subtitle)}` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const values = Array.isArray(row.values) ? row.values : [];
            return (
              <tr key={`${ri}-${str(row.feature) ?? ""}`}>
                <td>{str(row.feature)}</td>
                {columns.map((_col, ci) => {
                  const mark = values[ci];
                  return <td key={ci}>{typeof mark === "number" ? wordFor(mark) : ""}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
