/**
 * Local type for `GET {api}/api/tools/{slug}` — a public, no-auth,
 * read-only endpoint (see PostKing's `app/api/tools/[slug]/route.ts`).
 * Field names/shapes must stay in sync with PostKing's `types/tools.ts`
 * (the renderer-relevant slice — layout/layoutConfig/usageCount and the
 * other presentational-only fields from that source are intentionally
 * dropped: this starter renders one plain unbranded form, not the three
 * dashboard-configurable page layouts).
 *
 * `endpointUrl`/`apiKey` are never present here — those stay server-side on
 * PostKing; this renderer only ever calls its own `execute` proxy
 * (`app/api/tools/[slug]/execute/route.ts`), which forwards to
 * `POST {api}/api/tools/{slug}/execute`.
 */

/** The set of input field types a `Tool.inputSchema` entry can declare. */
export const TOOL_INPUT_TYPES = ["text", "number", "email", "url", "select", "textarea"] as const;

export type ToolInputType = (typeof TOOL_INPUT_TYPES)[number];

/** One entry in `Tool.inputSchema` — the form field a visitor fills in. */
export interface ToolInputField {
  key: string;
  label: string;
  type: ToolInputType;
  required?: boolean;
  placeholder?: string;
  /** Only meaningful when `type === "select"`. */
  options?: string[];
}

/** `Tool.handoffMode` — where the visitor ends up after a result arrives. */
export type ToolHandoffMode = "result" | "redirect";

export interface ToolPublicConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isAsync: boolean;
  resultType: string;
  inputSchema: ToolInputField[];
  conversionCopy: string | null;
  ctaHeadline: string | null;
  benefitBullets: unknown;
  sampleOutput: string | null;
  resultTemplate: string | null;
  handoffMode: ToolHandoffMode;
  handoffUrl: string | null;
  /** Where this renderer POSTs form submissions — always `/api/tools/{slug}/execute`. */
  executeUrl: string;
}

/** Error codes the execute proxy returns in `{ ok: false, code }` responses. */
export type ToolExecuteErrorCode = "LIMIT_REACHED" | "UPSTREAM";

/**
 * `POST /api/tools/[slug]/execute` response union (mirrors PostKing's own
 * `app/api/tools/[slug]/execute/route.ts` contract, minus the async
 * `{ runId, pollingUrl }` branch's poll follow-up — this renderer doesn't
 * implement polling, see `components/Tool/ToolRunner.tsx`'s header comment).
 *  - `{ ok: true, result, redirectUrl? }` — sync success.
 *  - `{ ok: false, code: "LIMIT_REACHED", resetsAt }` — daily limit hit (429).
 *  - `{ ok: false, code: "UPSTREAM", message }` — the client's endpoint
 *    returned an error (surfaced as a soft error, 502).
 *  - `{ runId, pollingUrl }` — async tool; not runnable from this renderer.
 */
export type ToolExecuteResponse =
  | { ok: true; result: unknown; redirectUrl?: string }
  | { ok: false; code: "LIMIT_REACHED"; resetsAt: string }
  | { ok: false; code: "UPSTREAM"; message: string }
  | { runId: string; pollingUrl: string };
