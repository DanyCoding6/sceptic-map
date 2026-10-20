import { AtAGlance } from "@/components/AtAGlance";
import { Quote } from "@/components/Quote";
import { Section } from "@/components/Section";
import { Sources } from "@/components/Sources";
import { claimById, fixes, site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

// Each finding counts either every post or only those since 2025; its n and window say which.
function scopeLine(scope: "all" | "since_2025") {
  const { window } = site.meta;
  const n = scope === "since_2025" ? site.numbers.base_since_2025 : site.numbers.n_base;
  const from = scope === "since_2025" ? "2025-01-01" : window.from;
  return `n = ${n} posts, Hacker News, ${formatMonth(from)} to ${formatMonth(window.to)}`;
}

// "July 2, 2025" (as printed on the page) -> "2 July 2025"
const britishDate = (d: string) => d.replace(/^(\w+) (\d{1,2}), (\d{4})$/, "$2 $1 $3");

// The first item is shown; later ones open on request, to keep the page short.
function Item({ open, topic, children }: { open: boolean; topic: string; children: React.ReactNode }) {
  if (open) {
    return (
      <>
        <p className="font-medium">{topic}</p>
        {children}
      </>
    );
  }
  return (
    <details className="group">
      <summary className="cursor-pointer list-none font-medium">
        {topic} <span className="text-sm font-normal text-accent-ink group-open:hidden">(show)</span>
      </summary>
      {children}
    </details>
  );
}

function OlderLines() {
  return (
    <div className="mt-14 rounded-lg border border-line p-5 sm:p-6">
      <h3 className="text-lg font-semibold">Two older lines worth updating</h3>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-2">A post from July 2025 promises more than the pages incident.io has written since launch.</p>
      <ul className="mt-5 space-y-6">
        {fixes.items.map((f, i) => {
          const older = claimById.get(f.olderClaimId)!;
          const current = claimById.get(f.currentClaimId)!;
          return (
            <li key={f.topic}>
              <Item open={i === 0} topic={f.topic}>
                <dl className="mt-2 grid gap-3 text-[15px] leading-relaxed sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{britishDate(f.olderDate)}</dt>
                    <dd className="mt-1">
                      &ldquo;{older.quote}&rdquo;{" "}
                      <a href={older.url} className="text-xs text-muted underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
                        source
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{f.currentLabel}</dt>
                    <dd className="mt-1">
                      &ldquo;{current.quote}&rdquo;{" "}
                      <a href={current.url} className="text-xs text-muted underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
                        source
                      </a>
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[15px] leading-relaxed">
                  <span className="font-medium text-accent-ink">Suggestion:</span> {f.suggest}
                </p>
              </Item>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Findings() {
  return (
    <Section id="findings" title="Three findings" intro="Ranked by how useful each is likely to be to a product marketing team.">
      <AtAGlance />
      <ol className="mt-14 space-y-12">
        {site.findings.map((f) => {
          const claims = f.claimIds.map((id) => claimById.get(id)!).filter(Boolean);
          return (
            <li key={f.id}>
              <p className="text-sm font-medium text-accent-ink">Finding {f.rank}</p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight">{f.headline}</h3>
              <p className="mt-2 text-xs text-muted">{scopeLine(f.scope)}</p>
              {f.note && <p className="mt-1 text-xs text-muted">{f.note}</p>}
              <div className="mt-5 space-y-4">
                {/* The lead finding shows one quote per objection; the others show their strongest one. */}
                {(f.rank === 1 ? f.quotes : f.quotes.slice(0, 1)).map((q) => (
                  <Quote key={q.id} {...q} />
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-wash p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">What this means for Investigations&apos; messaging</p>
                <p className="mt-2 text-[15px] leading-relaxed">{f.implication}</p>
                <Sources claims={claims} label="incident.io pages this draws on" />
              </div>
            </li>
          );
        })}
      </ol>
      <OlderLines />
    </Section>
  );
}
