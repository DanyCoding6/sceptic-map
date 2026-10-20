// Links to the vendor pages a sentence rests on (one link per page, titled by the page).
export function Sources({ claims, label = "Sources" }: { claims: { url: string; pageTitle: string }[]; label?: string }) {
  const pages = [...new Map(claims.map((c) => [c.url, c])).values()];
  if (!pages.length) return null;
  return (
    <p className="mt-2 text-xs leading-relaxed text-muted">
      {label}:{" "}
      {pages.map((p, i) => (
        <span key={p.url}>
          {i > 0 && " · "}
          <a href={p.url} className="underline hover:text-accent-ink" target="_blank" rel="noopener noreferrer">
            {p.pageTitle.replace(/\s*\|.*$/, "") || p.url}
          </a>
        </span>
      ))}
    </p>
  );
}
