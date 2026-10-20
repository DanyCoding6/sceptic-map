export function Section({ id, title, intro, children, wide = false }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-16 sm:py-20" aria-labelledby={`${id}-title`}>
      <div className={`mx-auto px-4 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {intro && <div className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-2">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
