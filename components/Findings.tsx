import { AtAGlance } from "@/components/AtAGlance";
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
    </Section>
  );
}
