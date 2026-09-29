import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { CtaLink, isPlainObject, str } from "./shared";

/**
 * `content.topBar` — one slot shared by two variants: `type:
 * "announcement"` (real, static: `data.text`+optional `data.linkUrl`/
 * `linkText`) and `type: "liveVisitorBar"` (an animated counter — `data.
 * minCount`/`maxCount` are a display range for client-side JS, never a
 * real count, so it's dropped, same as the standalone `liveVisitorBar`
 * content key). `enabled: false` renders nothing either way.
 */
export function TopBar({ value }: { value: JsonRecord }): ReactNode {
  if (value.enabled === false) return null;
  if (str(value.type) === "liveVisitorBar") return null;
  const data = isPlainObject(value.data) ? value.data : undefined;
  const text = str(data?.text);
  if (!text) return null;
  return (
    <p>
      {text} <CtaLink href={data?.linkUrl} label={data?.linkText} />
    </p>
  );
}
