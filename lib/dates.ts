/**
 * A handful of PostKing blog articles carry `updatedAt` as a raw epoch-
 * seconds string (e.g. `"1790548788"`) instead of ISO 8601 — `new
 * Date("1790548788")` is an Invalid Date (JS's Date string parser doesn't
 * treat bare digit strings as epoch time), which crashed `sitemap.ts`
 * (`.toISOString()` throws on an invalid Date) and would otherwise render
 * "Invalid Date" on article listings. Parses defensively: a normal
 * ISO/parseable string first, a bare epoch-seconds string second, `undefined`
 * otherwise (caller omits the field rather than showing garbage).
 */
export function safeDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  if (/^\d+$/.test(value)) {
    const epochMs = value.length > 10 ? Number(value) : Number(value) * 1000;
    const fromEpoch = new Date(epochMs);
    if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch;
  }

  return undefined;
}

export function formatDate(value: string | undefined | null): string | undefined {
  return safeDate(value)?.toLocaleDateString();
}
