/** Renders a `<script type="application/ld+json">` for a PostKing
 * `schemaGraph` payload exactly as the API sent it. `schemaGraph` is already
 * the full `{"@context": "...", "@graph": [...]}` document (see PostKing's
 * `lib/schema/graph.ts` `buildGraph`) — never reshaped, never re-wrapped. */
export function JsonLdGraph({ data }: { data: unknown }) {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  // Escape `<` so a `</script>` inside any string value (AI-generated titles,
  // FAQ answers, breadcrumb labels) can never break out of the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger -- this is PostKing's own structured data, not user HTML
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
