import type { ReactNode } from "react";
import type { ResolvedSlot } from "@/lib/slots";
import type { JsonRecord } from "@/types/landing-page";
import { Media, isPlainObject, str } from "./shared";

/**
 * `content.features` and `content.showcase` share one shape: `{badge,
 * title, subtitle, description, features:[{icon,title,description}]}`.
 * `showcase` items additionally carry `id`/`slotKey`/`bgColor`/
 * `highlightColor` — all skip/config except `slotKey`, which resolves to a
 * feature's demo image/video. `icon` is a Lucide icon name, never text.
 */
export function Features({
  value,
  slots,
  consumed,
}: {
  value: JsonRecord;
  slots: Record<string, ResolvedSlot>;
  consumed: Set<string>;
}): ReactNode {
  const items = Array.isArray(value.features) ? value.features.filter(isPlainObject) : [];

  return (
    <>
      {str(value.badge) && <p>{str(value.badge)}</p>}
      {str(value.title) && <h2>{str(value.title)}</h2>}
      {str(value.subtitle) && <p>{str(value.subtitle)}</p>}
      {str(value.description) && <p>{str(value.description)}</p>}
      {items.length > 0 && (
        <ul className="card-grid">
          {items.map((item, i) => (
            <li key={str(item.id) ?? i}>
              <Media slotKey={item.slotKey} alt={str(item.title)} slots={slots} consumed={consumed} />
              {str(item.title) && <h3>{str(item.title)}</h3>}
              {str(item.description) && <p>{str(item.description)}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
