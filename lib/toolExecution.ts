/**
 * Pure (non-JSX) helpers for `components/Tool/ToolRunner.tsx`: parsing the
 * `ToolExecuteResponse` union coming back from `POST /api/tools/{slug}/execute`,
 * building the submission payload, and computing the handoff URL. No React
 * here, so it's trivially unit-testable and directly runnable by
 * `scripts/test-tools.ts` via `node --experimental-strip-types` — hence the
 * relative (alias-free) imports below rather than the `@/...` paths the rest
 * of this app uses.
 *
 * Ported from ../universal-lp/components/Tool/toolExecution.ts, trimmed to
 * what a single-layout, no-polling, no-preview renderer needs: the preview
 * short-circuit, poll-redirect extraction, and "example output" sample
 * preview are dropped as out of scope for this bare-bones starter (see
 * ToolRunner.tsx's header comment).
 */

import { isSafeFinalUrl } from "./handoffUrlSafety.ts";
import { fillTemplateString } from "./resultTemplate.ts";
import type { ToolExecuteResponse, ToolPublicConfig } from "../types/tool.ts";
import { normalizeUrl } from "./normalizeUrl.ts";

export type ToolPageState = "form" | "submitting" | "result" | "limited" | "error";

/** Best-effort `res.json()` — a non-JSON or empty body resolves to `null`. */
export async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Narrows an arbitrary JSON body into the `ToolExecuteResponse` union.
 * Returns `null` when the shape doesn't match any known branch — callers
 * fall back to a generic error message (covers 404/400/network-shaped
 * bodies, which are not part of the union).
 */
export function parseExecuteResponse(json: unknown): ToolExecuteResponse | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;

  if (typeof j.pollingUrl === "string" && typeof j.runId === "string") {
    return { runId: j.runId, pollingUrl: j.pollingUrl };
  }
  if (j.ok === true) {
    return {
      ok: true,
      result: j.result,
      ...(typeof j.redirectUrl === "string" ? { redirectUrl: j.redirectUrl } : {}),
    };
  }
  if (j.ok === false && j.code === "LIMIT_REACHED" && typeof j.resetsAt === "string") {
    return { ok: false, code: "LIMIT_REACHED", resetsAt: j.resetsAt };
  }
  if (j.ok === false && j.code === "UPSTREAM" && typeof j.message === "string") {
    return { ok: false, code: "UPSTREAM", message: j.message };
  }
  return null;
}

/** Pulls a human-readable message out of a non-union error body (422/404/etc). */
export function extractErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (Array.isArray(j.errors) && j.errors.length > 0) {
    return j.errors.filter((e): e is string => typeof e === "string").join(" ");
  }
  if (typeof j.message === "string") return j.message;
  if (typeof j.error === "string") return j.error;
  return null;
}

/** Coerces form values into the JSON body the execute proxy validates. */
export function buildPayload(
  config: Pick<ToolPublicConfig, "inputSchema">,
  values: Record<string, string>
): Record<string, string | number> {
  const payload: Record<string, string | number> = {};
  for (const field of config.inputSchema) {
    const raw = values[field.key] ?? "";
    payload[field.key] =
      field.type === "number" ? Number(raw) : field.type === "url" ? normalizeUrl(raw) : raw;
  }
  return payload;
}

/**
 * `redirectUrl` (from the upstream JSON) wins when present; otherwise the
 * tool's own `handoffUrl` template is filled from the result + inputs.
 * `null` when neither exists — callers hide the Continue button / skip the
 * redirect. Both branches are validated with `isSafeFinalUrl` before being
 * returned: `redirectUrl` is untrusted (it comes straight from the client's
 * own backend JSON), and the filled `handoffUrl` is defense-in-depth against
 * a bad template.
 */
export function computeFinalUrl(
  config: Pick<ToolPublicConfig, "handoffUrl">,
  result: unknown,
  input: Record<string, unknown>,
  redirectUrl?: string
): string | null {
  if (redirectUrl) {
    return isSafeFinalUrl(redirectUrl) ? redirectUrl : null;
  }
  if (!config.handoffUrl) return null;
  const filled = fillTemplateString(config.handoffUrl, { response: result, input });
  return isSafeFinalUrl(filled) ? filled : null;
}

export function formatResetsAt(resetsAt: string): string {
  const date = new Date(resetsAt);
  return Number.isNaN(date.getTime()) ? resetsAt : date.toLocaleString();
}
