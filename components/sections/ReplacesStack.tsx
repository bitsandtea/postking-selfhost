import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { CtaLink, isPlainObject, isStringArray, str } from "./shared";

/** `content.replacesStack` — "what you juggle now" vs. the one-tool
 * replacement. */
export function ReplacesStack({ value }: { value: JsonRecord }): ReactNode {
  const current = isPlainObject(value.current) ? value.current : undefined;
  const replacement = isPlainObject(value.replacement) ? value.replacement : undefined;
  if (!current && !replacement) return null;
  const tools = current && Array.isArray(current.tools) ? current.tools.filter(isPlainObject) : [];
  const capabilities = replacement && isStringArray(replacement.capabilities) ? replacement.capabilities : [];

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.subtitle) && <p>{str(value.subtitle)}</p>}
      {current && (
        <div>
          {str(current.label) && <h3>{str(current.label)}</h3>}
          <ul>
            {tools.map((tool, i) => (
              <li key={`${i}-${str(tool.name) ?? ""}`}>
                {[str(tool.name), str(tool.price), str(tool.category) ? `(${str(tool.category)})` : undefined]
                  .filter(Boolean)
                  .join(" — ")}
              </li>
            ))}
          </ul>
          {str(current.summary) && <p>{str(current.summary)}</p>}
          {str(current.totalLabel) && <p>{str(current.totalLabel)}</p>}
        </div>
      )}
      {replacement && (
        <div>
          {str(replacement.name) && <h3>{str(replacement.name)}</h3>}
          {(str(replacement.currency) || typeof replacement.price === "number") && (
            <p>
              {str(replacement.currency) ?? ""}
              {typeof replacement.price === "number" ? replacement.price : ""}
              {str(replacement.period) ?? ""}
            </p>
          )}
          {capabilities.length > 0 && (
            <ul>
              {capabilities.map((c, ci) => (
                <li key={`${ci}-${c}`}>{c}</li>
              ))}
            </ul>
          )}
          {str(replacement.summary) && <p>{str(replacement.summary)}</p>}
          {isPlainObject(replacement.cta) && <CtaLink href={replacement.cta.url} label={replacement.cta.text} />}
        </div>
      )}
    </>
  );
}
