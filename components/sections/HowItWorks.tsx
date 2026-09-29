import type { ReactNode } from "react";
import { absolutizeAssetUrl } from "@/lib/assets";
import type { JsonRecord } from "@/types/landing-page";
import { isPlainObject, isStringArray, str } from "./shared";

/**
 * `content.howItWorks` — `steps[]` each carry the visible copy under
 * `content.{title,desc1,desc2,checklist,image}`; `step`/`navigationDescription`
 * are nav-rail-only labels (a number like "01" and a short duplicate of the
 * title), never shown.
 */
export function HowItWorks({ value }: { value: JsonRecord }): ReactNode {
  const steps = Array.isArray(value.steps) ? value.steps.filter(isPlainObject) : [];
  if (steps.length === 0) return null;

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.description) && <p>{str(value.description)}</p>}
      <ul className="card-grid">
        {steps.map((step, i) => {
          const content = isPlainObject(step.content) ? step.content : {};
          const checklist = isStringArray(content.checklist) ? content.checklist : [];
          const image = str(content.image);
          return (
            <li key={`${i}-${str(step.id) ?? ""}`}>
              {image && <img src={absolutizeAssetUrl(image)} alt={str(content.title) ?? ""} />}
              {str(content.title) && <h3>{str(content.title)}</h3>}
              {str(content.desc1) && <p>{str(content.desc1)}</p>}
              {str(content.desc2) && <p>{str(content.desc2)}</p>}
              {checklist.length > 0 && (
                <ul>
                  {checklist.map((item, ci) => (
                    <li key={`${ci}-${item}`}>{item}</li>
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
