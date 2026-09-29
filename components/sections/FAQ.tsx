import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { CtaLink, isPlainObject, str } from "./shared";

/** `content.faq` — `questions[]` = `{id,quest,ans}` (`id` is a bare
 * integer, never shown); optional section-level `ctaButton`. */
export function FAQ({ value }: { value: JsonRecord }): ReactNode {
  const questions = Array.isArray(value.questions)
    ? value.questions.filter((q): q is JsonRecord => isPlainObject(q) && typeof q.quest === "string" && typeof q.ans === "string")
    : [];
  if (questions.length === 0) return null;
  const ctaButton = isPlainObject(value.ctaButton) ? value.ctaButton : undefined;

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      <div className="faq-list">
        {questions.map((q, i) => (
          <details key={`${i}-${str(q.id) ?? ""}`}>
            <summary>{String(q.quest)}</summary>
            <p>{String(q.ans)}</p>
          </details>
        ))}
      </div>
      {ctaButton && <CtaLink href={ctaButton.url} label={ctaButton.text} />}
    </>
  );
}
