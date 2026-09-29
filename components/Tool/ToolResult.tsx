/**
 * The result screen for `handoffMode: "result"`. `html` is the already
 * write-time-sanitized + render-time-escaped output of `renderToolTemplate`
 * (`lib/resultTemplate.ts`) — null when the tool has no `resultTemplate`, in
 * which case `ResultFallback` renders a plain fallback keyed on `resultType`.
 * This component never re-sanitizes — sanitization/escaping happens in
 * `renderToolTemplate` before this ever receives `html`.
 *
 * No `"use client"` directive: it's a plain function of its props (no hooks,
 * no browser APIs) and is only ever rendered from inside
 * `components/Tool/ToolRunner.tsx`'s client boundary — see that file's
 * header comment for why it's the only "use client" file this starter adds.
 */
function ResultFallback({ result, resultType }: { result: unknown; resultType: string }) {
  if (result === null || result === undefined) return null;

  if (resultType === "url" && typeof result === "string") {
    return (
      <a href={result} target="_blank" rel="noopener noreferrer">
        {result}
      </a>
    );
  }
  if (typeof result === "string") {
    return <p>{result}</p>;
  }
  return <pre>{JSON.stringify(result, null, 2)}</pre>;
}

export function ToolResult({
  html,
  result,
  resultType,
  continueUrl,
  onReset,
}: {
  html: string | null;
  result: unknown;
  resultType: string;
  continueUrl: string | null;
  onReset: () => void;
}) {
  return (
    <div className="tool-result">
      <p>
        <strong>Your result</strong>
      </p>
      {html !== null ? (
        // eslint-disable-next-line react/no-danger -- `html` is the escaped, href-scrubbed
        // output of renderToolTemplate (lib/resultTemplate.ts), same trust level as the
        // existing raw_html page render in components/RawHtmlPage.tsx.
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <ResultFallback result={result} resultType={resultType} />
      )}
      <div className="tool-result-actions">
        {continueUrl && (
          <a className="button" href={continueUrl}>
            Continue
          </a>
        )}
        <button type="button" className="button" onClick={onReset}>
          Run again
        </button>
      </div>
    </div>
  );
}
