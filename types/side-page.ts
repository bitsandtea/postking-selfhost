/**
 * Minimal local types for the two side-page types whose `content` is a
 * fixed, standalone document rather than a merge of the root LP's normal
 * sections (`_meta.sidePageType === "comparison" | "spotlight"` — see
 * PostKing's `src/services/side-pages/sidePageRenderer.ts`). Confirmed live
 * against `view_side_page` payloads for real comparison/spotlight pages;
 * every field is optional since a page can omit any section.
 */

export interface SpotlightStep {
  id?: string;
  title?: string;
  body?: string;
  img?: { slotKey?: string };
}

export interface SpotlightBenefit {
  title?: string;
  body?: string;
}

/** `_meta.sidePageType === "spotlight"` — a flat, fixed-schema document
 * (no nested `hero`/`features`/etc.). Field names confirmed live via
 * `marketing-plan-template`. */
export interface SpotlightPageContent {
  kicker?: string;
  h1?: string;
  sub?: string;
  heroImg?: { slotKey?: string };
  mechKicker?: string;
  mechTitle?: string;
  steps?: SpotlightStep[];
  benKicker?: string;
  benTitle?: string;
  benefits?: SpotlightBenefit[];
  statValue?: string;
  statLabel?: string;
  quote?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  ctaFootTitle?: string;
  ctaFootBody?: string;
  /** Button copy with no destination in the payload at all (the real
   * renderer points these at brand-level context this starter doesn't
   * have) — see `components/SpotlightSidePage.tsx`: dropped, never printed
   * per the "no destination, no button" rule. */
  ctaPrimary?: string;
  ctaSecondary?: string;
}

export interface ComparisonOption {
  name: string;
  domain?: string;
  logoUrl?: string;
  category?: string;
  isBrandOwn?: boolean;
}

export interface ComparisonMatrixCellValue {
  text?: string;
  citations?: unknown[];
}

export interface ComparisonMatrixRow {
  pillar?: string;
  dimension: string;
  values: Record<string, ComparisonMatrixCellValue>;
  winner?: string;
  winnerReason?: string;
}

export interface ComparisonVerdictUseCase {
  audience: string;
  winner: string;
  reason: string;
}

export interface ComparisonVerdict {
  winner?: string;
  oneSentence?: string;
  useCaseSplit?: ComparisonVerdictUseCase[];
}

export interface ComparisonScorecardPillar {
  label: string;
  scores: Record<string, number>;
  winner?: string;
  oneLineReason?: string;
}

export interface ComparisonDeepDiveEntry {
  pros?: string[];
  cons?: string[];
  bestFor?: string;
}

export interface ComparisonDecisionRule {
  if: string;
  then: string;
}

export interface ComparisonSwitchingBlock {
  fromOption?: string;
  toOption?: string;
  whatYouGain?: string[];
  whatYouLose?: string[];
  estimatedMigrationTime?: string;
}

export interface ComparisonPriceTier {
  name: string;
  price: string;
  highlights?: string[];
}

export interface ComparisonPriceOption {
  optionName: string;
  start?: string;
  tiers?: ComparisonPriceTier[];
}

export interface ComparisonClaimQuote {
  text: string;
  source?: string;
}

/** `_meta.sidePageType === "comparison"` — field names confirmed live via
 * `postking-vs-hootsuite`. `_agentInstructions`/`audienceTags`/per-item
 * `audienceTags` are internal personalization plumbing (never rendered —
 * see `components/ComparisonSidePage.tsx`). */
export interface ComparisonPageContent {
  comparison?: { options?: ComparisonOption[]; primaryKeyword?: string };
  matrix?: { rows?: ComparisonMatrixRow[] };
  verdict?: ComparisonVerdict;
  scorecard?: { pillars?: ComparisonScorecardPillar[] };
  deepDive?: Record<string, ComparisonDeepDiveEntry>;
  decisionTree?: ComparisonDecisionRule[];
  objectionFAQ?: { questions?: { quest: string; ans: string }[] };
  switchingBlock?: ComparisonSwitchingBlock;
  priceCalculator?: { options?: ComparisonPriceOption[] };
  competitorClaims?: { pros?: string[]; cons?: string[]; quotes?: ComparisonClaimQuote[] };
  primaryKeyword?: string;
}
