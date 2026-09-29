import { renderKnownSection } from "@/components/sections";
import type { ResolvedSlot } from "@/lib/slots";
import type { Block, JsonRecord } from "@/types/landing-page";

/**
 * `renderMode === "blocks"` (`_meta.sidePageType === "custom"`) — the page
 * body is `data.blocks[]` (top-level, never `content.blocks` — see
 * `types/landing-page.ts`'s `Block`). Three tiers (PostKing's
 * `02-block-contract.md` §1):
 *
 * - **Tier 1** — `block.type` is one of the normal section keys
 *   (`pricing`/`faq`/`hero`/…) and `block.props` is that section's exact
 *   content shape (confirmed live: a real `"pricing"` custom block is
 *   byte-for-byte the same shape as `content.pricing`) — reuses
 *   `components/sections`' own dispatch, zero new code.
 * - **Tier 3** — `block.type === "html"`; `block.props.html` is
 *   pre-sanitized server-side at write time (reject-not-strip) and rendered
 *   verbatim, same trust level as a blog article body.
 * - **Tier 2** — anything else, with a template string in
 *   `data.blockTemplates["{type}@{version}"]`. That template syntax is a
 *   bespoke micro-templating engine that lives only in universal-lp's own
 *   TS source — reproducing it here risks exactly the field-name/id leaks
 *   this task exists to eliminate, so Tier 2 blocks are skipped (a
 *   documented gap, not a silent drop of visible copy: no brand on this
 *   test account has one seeded).
 */
export function CustomBlocksPage({ blocks, slots }: { blocks: Block[] | undefined; slots: Record<string, ResolvedSlot> }) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return null;

  return (
    <div className="pk-container">
      {list.map((block) => {
        if (block.type === "html") {
          const html = typeof block.props?.html === "string" ? block.props.html : "";
          if (!html) return null;
          return (
            // eslint-disable-next-line react/no-danger -- pre-sanitized at write time, same trust as a blog body
            <div className="pk-raw-html" key={block.id} dangerouslySetInnerHTML={{ __html: html }} />
          );
        }

        const rendered = renderKnownSection(block.type, block.props as JsonRecord, slots, new Set<string>());
        if (!rendered) return null;
        return (
          <section className={`pk-section pk-section-${block.type}`} key={block.id}>
            {rendered}
          </section>
        );
      })}
    </div>
  );
}
