import { str } from "@/components/sections/shared";
import type {
  ComparisonDecisionRule,
  ComparisonDeepDiveEntry,
  ComparisonMatrixRow,
  ComparisonPageContent,
  ComparisonScorecardPillar,
} from "@/types/side-page";

/**
 * `_meta.sidePageType === "comparison"` — a fixed, standalone document (see
 * `types/side-page.ts`), never live-verified against a real payload from
 * this brand's own sitemap (none exist on it), but confirmed field-for-field
 * via `view_side_page` on a real comparison page elsewhere in the account.
 * `_agentInstructions`/`audienceTags` (top-level and per-item) are internal
 * personalization plumbing — id tokens like `"solo-founder"` — never
 * rendered.
 */

function optionNames(content: ComparisonPageContent): string[] {
  const options = content.comparison?.options ?? [];
  if (options.length > 0) return options.map((o) => o.name).filter((n): n is string => !!n);
  // Fall back to whichever competitor names the matrix/scorecard rows carry,
  // for a page whose `comparison.options` is missing but rows still are.
  const fromMatrix = content.matrix?.rows?.[0]?.values ? Object.keys(content.matrix.rows[0].values) : [];
  const fromScorecard = content.scorecard?.pillars?.[0]?.scores ? Object.keys(content.scorecard.pillars[0].scores) : [];
  return fromMatrix.length > 0 ? fromMatrix : fromScorecard;
}

function Matrix({ rows, names }: { rows: ComparisonMatrixRow[]; names: string[] }) {
  if (rows.length === 0 || names.length === 0) return null;
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          {names.map((name, ni) => (
            <th key={`${ni}-${name}`}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${i}-${row.dimension ?? ""}`}>
            <td>{row.dimension}</td>
            {names.map((name, ni) => (
              <td key={`${ni}-${name}`}>{str(row.values?.[name]?.text) ?? ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Scorecard({ pillars, names }: { pillars: ComparisonScorecardPillar[]; names: string[] }) {
  if (pillars.length === 0 || names.length === 0) return null;
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          {names.map((name, ni) => (
            <th key={`${ni}-${name}`}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pillars.map((pillar, i) => (
          <tr key={`${i}-${pillar.label ?? ""}`}>
            <td>{pillar.label}</td>
            {names.map((name, ni) => (
              <td key={`${ni}-${name}`}>{typeof pillar.scores?.[name] === "number" ? pillar.scores[name] : ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DeepDive({ deepDive }: { deepDive: Record<string, ComparisonDeepDiveEntry> }) {
  const entries = Object.entries(deepDive).filter(([, v]) => v && (v.pros?.length || v.cons?.length || v.bestFor));
  if (entries.length === 0) return null;
  return (
    <ul className="card-grid">
      {entries.map(([name, entry], ei) => (
        <li key={`${ei}-${name}`}>
          <h3>{name}</h3>
          {entry.bestFor && <p>{entry.bestFor}</p>}
          {entry.pros && entry.pros.length > 0 && (
            <ul>
              {entry.pros.map((p, pi) => (
                <li key={`${pi}-${p}`}>{p}</li>
              ))}
            </ul>
          )}
          {entry.cons && entry.cons.length > 0 && (
            <ul>
              {entry.cons.map((c, ci) => (
                <li key={`${ci}-${c}`}>{c}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function DecisionTree({ rules }: { rules: ComparisonDecisionRule[] }) {
  if (rules.length === 0) return null;
  return (
    <ul>
      {rules.map((rule, i) => (
        <li key={i}>
          {rule.if} → {rule.then}
        </li>
      ))}
    </ul>
  );
}

export function ComparisonSidePage({ content }: { content: ComparisonPageContent }) {
  const names = optionNames(content);
  const matrixRows = content.matrix?.rows ?? [];
  const scorecardPillars = content.scorecard?.pillars ?? [];
  const questions = content.objectionFAQ?.questions ?? [];
  const switching = content.switchingBlock;
  const priceOptions = content.priceCalculator?.options ?? [];
  const claims = content.competitorClaims;

  return (
    <div className="pk-container">
      {(content.verdict?.winner || content.verdict?.oneSentence) && (
        <section className="pk-section pk-section-hero">
          {content.verdict?.winner && <h1>{content.verdict.winner} wins</h1>}
          {content.verdict?.oneSentence && <p>{content.verdict.oneSentence}</p>}
          {content.verdict?.useCaseSplit && content.verdict.useCaseSplit.length > 0 && (
            <ul className="card-grid">
              {content.verdict.useCaseSplit.map((u, i) => (
                <li key={i}>
                  <h3>{u.audience}</h3>
                  <p>
                    {u.winner} — {u.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {scorecardPillars.length > 0 && (
        <section className="pk-section">
          <h2>Scorecard</h2>
          <Scorecard pillars={scorecardPillars} names={names} />
        </section>
      )}

      {matrixRows.length > 0 && (
        <section className="pk-section">
          <h2>Head to head</h2>
          <Matrix rows={matrixRows} names={names} />
        </section>
      )}

      {content.deepDive && (
        <section className="pk-section">
          <h2>The details</h2>
          <DeepDive deepDive={content.deepDive} />
        </section>
      )}

      {content.decisionTree && content.decisionTree.length > 0 && (
        <section className="pk-section">
          <h2>Which one should you pick</h2>
          <DecisionTree rules={content.decisionTree} />
        </section>
      )}

      {switching && (switching.whatYouGain?.length || switching.whatYouLose?.length) && (
        <section className="pk-section">
          <h2>
            Switching from {switching.fromOption} to {switching.toOption}
          </h2>
          {switching.whatYouGain && switching.whatYouGain.length > 0 && (
            <ul>
              {switching.whatYouGain.map((g, gi) => (
                <li key={`${gi}-${g}`}>{g}</li>
              ))}
            </ul>
          )}
          {switching.whatYouLose && switching.whatYouLose.length > 0 && (
            <ul>
              {switching.whatYouLose.map((l, li) => (
                <li key={`${li}-${l}`}>{l}</li>
              ))}
            </ul>
          )}
          {switching.estimatedMigrationTime && <p>{switching.estimatedMigrationTime}</p>}
        </section>
      )}

      {priceOptions.length > 0 && (
        <section className="pk-section">
          <h2>Pricing</h2>
          <ul className="card-grid">
            {priceOptions.map((option, i) => (
              <li key={`${i}-${option.optionName ?? ""}`}>
                <h3>{option.optionName}</h3>
                {option.start && <p>{option.start}</p>}
                {option.tiers?.map((tier, ti) => (
                  <div key={`${ti}-${tier.name ?? ""}`}>
                    <p>
                      {tier.name} — {tier.price}
                    </p>
                    {tier.highlights && tier.highlights.length > 0 && (
                      <ul>
                        {tier.highlights.map((h, hi) => (
                          <li key={`${hi}-${h}`}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {claims && (claims.pros?.length || claims.cons?.length) && (
        <section className="pk-section">
          <h2>What users say</h2>
          {claims.pros && claims.pros.length > 0 && (
            <ul>
              {claims.pros.map((p, pi) => (
                <li key={`${pi}-${p}`}>{p}</li>
              ))}
            </ul>
          )}
          {claims.cons && claims.cons.length > 0 && (
            <ul>
              {claims.cons.map((c, ci) => (
                <li key={`${ci}-${c}`}>{c}</li>
              ))}
            </ul>
          )}
          {claims.quotes && claims.quotes.length > 0 && (
            <ul className="card-grid">
              {claims.quotes.map((q, i) => (
                <li key={i}>
                  <p>&ldquo;{q.text}&rdquo;</p>
                  {q.source && <p>{q.source}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {questions.length > 0 && (
        <section className="pk-section">
          <h2>Questions</h2>
          <div className="faq-list">
            {questions.map((q, i) => (
              <details key={i}>
                <summary>{q.quest}</summary>
                <p>{q.ans}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
