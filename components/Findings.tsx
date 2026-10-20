import { Quote } from "@/components/Quote";
import { Section } from "@/components/Section";
import { Sources } from "@/components/Sources";
import { claimById, site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

export function Findings() {
  const { window } = site.meta;
  return (
    <Section
      id="findings"
      title="Three findings"
      intro="Ranked by how useful I think each is to a product marketing team. Every number comes from the data, and every quote links to its source."
    >
      <ol className="space-y-12">
        {site.findings.map((f) => {
          const claims = f.claimIds.map((id) => claimById.get(id)!).filter(Boolean);
          return (
            <li key={f.id}>
              <p className="text-sm font-medium text-accent-ink">Finding {f.rank}</p>
              <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight">{f.headline}</h3>
              <p className="mt-2 text-xs text-muted">
                n = {f.n} comments, Hacker News, {formatMonth(window.from)} to {formatMonth(window.to)}
              </p>
              <div className="mt-5 space-y-4">
                {f.quotes.map((q) => (
                  <Quote key={q.id} {...q} />
                ))}
              </div>
              <div className="mt-6 rounded-lg bg-wash p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">What this means for how Investigations is told</p>
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
