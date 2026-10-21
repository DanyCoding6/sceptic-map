import { Quote } from "@/components/Quote";
import { Section } from "@/components/Section";
import { Sources } from "@/components/Sources";
import { claimById, site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

// Each finding counts either every post or only those since 2025; its n and window say which.
function scopeLine(scope: "all" | "since_2025") {
  const { window } = site.meta;
  const n = scope === "since_2025" ? site.numbers.base_since_2025 : site.numbers.n_base;
  const from = scope === "since_2025" ? "2025-01-01" : window.from;
  return `n = ${n} posts, Hacker News, ${formatMonth(from)} to ${formatMonth(window.to)}`;
}

export function Findings() {
  return (
    <Section
      id="findings"
      title="What it means for Investigations"
      intro="Three things the map shows, most useful first."
    >
      <ol className="space-y-16">
        {site.findings.map((f) => {
          const claims = f.claimIds.map((id) => claimById.get(id)!).filter(Boolean);
          return (
            <li key={f.id}>
              <p className="text-sm font-medium text-accent-ink">Finding {f.rank}</p>
              <h3 className="mt-2 text-2xl font-semibold leading-snug tracking-tight">{f.title ?? f.headline}</h3>
              {f.explain && <p className="mt-4 text-[17px] leading-relaxed">{f.explain}</p>}
              <div className="mt-5">
                <Quote {...f.quotes[0]} />
              </div>
              {f.fix && (
                <div className="mt-5 rounded-lg bg-wash p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">What could close the gap</p>
                  <p className="mt-2 text-[17px] leading-relaxed">{f.fix}</p>
                </div>
              )}
              <details className="group mt-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-accent-ink">
                  <span className="group-open:hidden">The detail: what incident.io&apos;s pages say now, and how it was counted</span>
                  <span className="hidden group-open:inline">Hide the detail</span>
                </summary>
                <div className="mt-4 space-y-4">
                  <p className="text-[15px] leading-relaxed">{f.implication}</p>
                  <Sources claims={claims} label="incident.io pages this draws on" />
                  {f.quotes.slice(1, f.rank === 1 ? 2 : 1).map((q) => (
                    <Quote key={q.id} {...q} />
                  ))}
                  <p className="text-xs leading-relaxed text-muted">
                    {scopeLine(f.scope)}.{f.note ? ` ${f.note}` : ""}
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
