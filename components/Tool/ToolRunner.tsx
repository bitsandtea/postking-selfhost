"use client";

import { useState, type FormEvent } from "react";
import {
  buildPayload,
  computeFinalUrl,
  extractErrorMessage,
  formatResetsAt,
  parseExecuteResponse,
  safeJson,
  type ToolPageState,
} from "@/lib/toolExecution";
import { renderToolTemplate } from "@/lib/resultTemplate";
import type { ToolPublicConfig } from "@/types/tool";
import { ToolField } from "./ToolField";
import { ToolResult } from "./ToolResult";

/**
 * The interactive input form + submit/result state machine for a published
 * Tool. This is the ONLY client-JS boundary this starter adds — `ToolResult`
 * (rendered below) is a plain function of props with no hooks, so it needs
 * no boundary of its own; `lib/toolExecution.ts` and `lib/resultTemplate.ts`
 * are pure helpers imported by this file.
 *
 * Deliberately narrower than universal-lp's `useToolRun` +
 * `components/Tool/{ToolPage,layouts/*}.tsx`, which this is ported from:
 *  - No async/polling support (`isAsync`/`pollingUrl`) — the one published
 *    tool found for the test brand (`seo-dashboard`) is sync, and adding a
 *    poll proxy + timer loop for a case that can't be exercised here isn't
 *    worth the risk. An async tool shows a plain error instead of hanging.
 *  - No preview mode (`?preview=true`) — this renderer only ever serves the
 *    live published tool.
 *  - No three-layout system (`layout`/`layoutConfig`) — one plain unbranded
 *    form, per this starter's whole design brief.
 *  - Field validation relies on native HTML5 `required`/`type` attributes
 *    instead of a parallel client-side `validate()` — one less state slice,
 *    same visitor-facing guarantee (the server route validates again anyway).
 */

export function ToolRunner({ config }: { config: ToolPublicConfig }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.inputSchema.map((field) => [field.key, ""]))
  );
  const [state, setState] = useState<ToolPageState>("form");
  const [result, setResult] = useState<unknown>(null);
  const [resultHtml, setResultHtml] = useState<string | null>(null);
  const [continueUrl, setContinueUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetsAt, setResetsAt] = useState<string | null>(null);

  function applyResult(resultValue: unknown, input: Record<string, unknown>, redirectUrl?: string) {
    const finalUrl = computeFinalUrl(config, resultValue, input, redirectUrl);

    if (config.handoffMode === "redirect") {
      if (finalUrl) {
        window.location.assign(finalUrl);
        return;
      }
      setErrorMsg("We couldn't send you to the next step. Please try again.");
      setState("error");
      return;
    }

    setResult(resultValue);
    setContinueUrl(finalUrl);
    setResultHtml(
      config.resultTemplate
        ? renderToolTemplate(config.resultTemplate, { response: resultValue, input }).html
        : null
    );
    setState("result");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (config.isAsync) {
      setErrorMsg("This tool runs asynchronously, which this renderer doesn't support yet.");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMsg("");
    const payload = buildPayload(config, values);

    try {
      const res = await fetch(`/api/tools/${config.slug}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      const parsed = parseExecuteResponse(json);

      if (!res.ok) {
        if (parsed && "code" in parsed) {
          if (parsed.code === "LIMIT_REACHED") {
            setResetsAt(parsed.resetsAt);
            setState("limited");
          } else {
            setErrorMsg(parsed.message);
            setState("error");
          }
          return;
        }
        setErrorMsg(extractErrorMessage(json) ?? "The tool returned an error. Please try again.");
        setState("error");
        return;
      }

      if (!parsed) {
        setErrorMsg("Invalid response from the tool.");
        setState("error");
        return;
      }
      if ("pollingUrl" in parsed) {
        setErrorMsg("This tool runs asynchronously, which this renderer doesn't support yet.");
        setState("error");
        return;
      }
      if (parsed.ok) {
        applyResult(parsed.result, payload, parsed.redirectUrl);
        return;
      }
      // Shouldn't happen per the upstream contract (a 200 never carries
      // `ok: false`), but keeps this branch exhaustive/type-safe.
      setErrorMsg(parsed.code === "UPSTREAM" ? parsed.message : "The tool returned an error. Please try again.");
      setState("error");
    } catch {
      setErrorMsg("Could not reach the tool endpoint. Please try again.");
      setState("error");
    }
  }

  function handleReset() {
    setState("form");
    setResult(null);
    setResultHtml(null);
    setContinueUrl(null);
    setErrorMsg("");
  }

  if (state === "result") {
    return (
      <ToolResult
        html={resultHtml}
        result={result}
        resultType={config.resultType}
        continueUrl={continueUrl}
        onReset={handleReset}
      />
    );
  }

  return (
    <div>
      {state === "limited" && (
        <p role="alert">
          You&rsquo;ve reached today&rsquo;s usage limit.
          {resetsAt ? ` Try again after ${formatResetsAt(resetsAt)}.` : ""}
        </p>
      )}
      {state === "error" && <p role="alert">{errorMsg}</p>}
      <form className="tool-form" onSubmit={handleSubmit}>
        {config.inputSchema.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key}>
              {field.label}
              {field.required && " *"}
            </label>
            <ToolField
              field={field}
              value={values[field.key] ?? ""}
              onChange={(val) => setValues((prev) => ({ ...prev, [field.key]: val }))}
            />
          </div>
        ))}
        <button type="submit" className="button" disabled={state === "submitting"}>
          {state === "submitting" ? "Running…" : "Run"}
        </button>
      </form>
    </div>
  );
}
