import type { ReactNode } from "react";
import type { JsonRecord } from "@/types/landing-page";
import { VideoThumb, isPlainObject, str } from "./shared";

/**
 * `content.videos` — `clips[]` (Shorts) and `videos[]` (long-form) are both
 * real, independent arrays; `config` carries real section copy
 * (`heading`/`eyebrow`/`intro`) alongside pure interactive-rail config
 * (`railPosition`/`shortsTone`/`shortsPlacement`/`defaultPlaylistId`) —
 * only the copy fields are shown. `playlists[]` is rail-navigation
 * plumbing with no standalone copy of its own, skipped entirely.
 */

const ITEM_SKIP = new Set([
  "id",
  "order",
  "platform",
  "viewCount",
  "statsUpdatedAt",
  "sourceLabel",
  "durationSeconds",
  "isPublished",
  "chapters",
  "transcriptUrl",
  "captionsAvailable",
  "userEditedFields",
  "posterUrl",
  "externalId",
]);

function VideoCard({ item }: { item: JsonRecord }): ReactNode {
  const title = str(item.title);
  const description = str(item.description);
  const thumb = <VideoThumb item={item} />;
  if (!title && !description) return null;
  return (
    <li>
      {thumb}
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
    </li>
  );
}

export function Videos({ value }: { value: JsonRecord }): ReactNode {
  const config = isPlainObject(value.config) ? value.config : {};
  const clips = Array.isArray(value.clips)
    ? value.clips.filter((c): c is JsonRecord => isPlainObject(c) && c.isPublished !== false)
    : [];
  const videos = Array.isArray(value.videos)
    ? value.videos.filter((v): v is JsonRecord => isPlainObject(v) && v.isPublished !== false)
    : [];
  const items = [...videos, ...clips].map((item) =>
    Object.fromEntries(Object.entries(item).filter(([k]) => !ITEM_SKIP.has(k)))
  );

  if (items.length === 0 && !str(config.heading)) return null;

  return (
    <>
      {str(config.eyebrow) && <p>{str(config.eyebrow)}</p>}
      {str(config.heading) && <h2>{str(config.heading)}</h2>}
      {str(config.intro) && <p>{str(config.intro)}</p>}
      {items.length > 0 && (
        <ul className="card-grid">
          {items.map((item, i) => (
            <VideoCard item={item} key={`${i}-${str(item.id) ?? ""}`} />
          ))}
        </ul>
      )}
    </>
  );
}
