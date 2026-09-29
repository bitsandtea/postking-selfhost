/**
 * Pure-logic tests for `lib/toolExecution.ts` — ported from
 * ../universal-lp/components/Tool/toolExecution.test.ts, trimmed to the
 * cases still applicable to this renderer's narrower surface (no
 * preview-mode / poll-redirect / sample-preview helpers here — see
 * `components/Tool/ToolRunner.tsx`'s header comment for what was dropped
 * and why).
 *
 * Run with: node --experimental-strip-types scripts/test-tools.ts
 *
 * Not a vitest/jest suite (this starter has no test runner dependency) —
 * plain `node:assert`, relative `.ts` imports so Node's built-in type
 * stripping can run this file directly with no build step.
 */

import assert from "node:assert/strict";
import { buildPayload, computeFinalUrl } from "../lib/toolExecution.ts";
import type { ToolPublicConfig } from "../types/tool.ts";

let passed = 0;

function test(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

function baseConfig(overrides: Partial<ToolPublicConfig> = {}): ToolPublicConfig {
  return {
    id: "tool_1",
    name: "Test Tool",
    slug: "test-tool",
    description: null,
    isAsync: false,
    resultType: "json",
    inputSchema: [],
    conversionCopy: null,
    ctaHeadline: null,
    benefitBullets: null,
    sampleOutput: null,
    resultTemplate: null,
    handoffMode: "result",
    handoffUrl: null,
    executeUrl: "/api/tools/test-tool/execute",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildPayload — url normalization
// ---------------------------------------------------------------------------

test("buildPayload normalizes a bare host on a url field to an https URL", () => {
  const config = baseConfig({
    inputSchema: [{ key: "website", label: "Website", type: "url" }],
  });
  const payload = buildPayload(config, { website: "postking.app" });
  assert.deepEqual(payload, { website: "https://postking.app" });
});

test("buildPayload leaves an already-schemed URL on a url field unchanged", () => {
  const config = baseConfig({
    inputSchema: [{ key: "website", label: "Website", type: "url" }],
  });
  const payload = buildPayload(config, { website: "https://example.com" });
  assert.deepEqual(payload, { website: "https://example.com" });
});

test("buildPayload does not touch a text field's value", () => {
  const config = baseConfig({
    inputSchema: [{ key: "name", label: "Name", type: "text" }],
  });
  const payload = buildPayload(config, { name: "postking.app" });
  assert.deepEqual(payload, { name: "postking.app" });
});

test("buildPayload coerces a number field's value", () => {
  const config = baseConfig({
    inputSchema: [{ key: "count", label: "Count", type: "number" }],
  });
  const payload = buildPayload(config, { count: "42" });
  assert.deepEqual(payload, { count: 42 });
});

// ---------------------------------------------------------------------------
// computeFinalUrl — handoff/redirect URL safety
// ---------------------------------------------------------------------------

test("computeFinalUrl fills a safe https handoffUrl template with a placeholder in the query", () => {
  const config = baseConfig({ handoffUrl: "https://example.com/thanks?name={{input.name}}" });
  const url = computeFinalUrl(config, {}, { name: "Ada" });
  assert.equal(url, "https://example.com/thanks?name=Ada");
});

test("computeFinalUrl rejects an upstream redirectUrl using the javascript: scheme", () => {
  const config = baseConfig();
  const url = computeFinalUrl(config, {}, {}, "javascript:alert(1)");
  assert.equal(url, null);
});

test("computeFinalUrl rejects a handoffUrl template whose static part forms a dangerous scheme via a placeholder", () => {
  const config = baseConfig({ handoffUrl: "java{{x}}script:alert(1)" });
  const url = computeFinalUrl(config, {}, {});
  assert.equal(url, null);
});

test("computeFinalUrl returns null when neither redirectUrl nor handoffUrl is configured", () => {
  const config = baseConfig({ handoffUrl: null });
  const url = computeFinalUrl(config, {}, {});
  assert.equal(url, null);
});

test("computeFinalUrl passes through a whole-URL handoffUrl placeholder (e.g. {{redirectUrl}})", () => {
  const config = baseConfig({ handoffUrl: "{{redirectUrl}}" });
  const url = computeFinalUrl(config, { redirectUrl: "https://try.postking.app/dashboard" }, {});
  assert.equal(url, "https://try.postking.app/dashboard");
});

console.log(`\n${passed} passed`);
