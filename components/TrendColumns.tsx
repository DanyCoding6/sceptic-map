import { formatHalf } from "@/lib/format";

// Six tiny columns, one per half-year. Counts are raw (with each half's base in the tooltip),
// and the last half-year is partial, so it is drawn lighter.
export function TrendColumns({ bins, max, partialNote }: { bins: { half: string; count: number; base: number }[]; max: number; partialNote: string }) {
  const w = 6;
  const gap = 2;
  const h = 22;
  const scale = max > 0 ? (h - 2) / max : 0;
  const label = bins.map((b) => `${formatHalf(b.half)}: ${b.count} of ${b.base}`).join("; ");
  return (
    <svg width={bins.length * (w + gap) - gap} height={h} role="img" aria-label={`By half-year: ${label}`} className="shrink-0">
      <line x1="0" x2={bins.length * (w + gap) - gap} y1={h - 0.5} y2={h - 0.5} stroke="var(--line)" strokeWidth="1" />
      {bins.map((b, i) => {
        const bh = b.count > 0 ? Math.max(2, b.count * scale) : 0;
        const partial = i === bins.length - 1;
        return (
          <g key={b.half}>
            <title>{`${formatHalf(b.half)}${partial ? ` (${partialNote})` : ""}: ${b.count} of ${b.base} comments`}</title>
            <rect x={i * (w + gap)} y={0} width={w} height={h} fill="transparent" />
            {bh > 0 && <rect x={i * (w + gap)} y={h - 1 - bh} width={w} height={bh} rx="1.5" fill="var(--accent)" opacity={partial ? 0.45 : 1} />}
          </g>
        );
      })}
    </svg>
  );
}
