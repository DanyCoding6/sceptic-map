import { Section } from "@/components/Section";
import { CONFIG } from "@/lib/config";

export function About() {
  const links = [
    { label: "Email", href: `mailto:${CONFIG.email}`, text: CONFIG.email },
    { label: "LinkedIn", href: CONFIG.linkedin, text: "linkedin.com/in/daniyaal-anawar" },
    ...(CONFIG.juniorTrader ? [{ label: "JuniorTrader", href: CONFIG.juniorTrader, text: CONFIG.juniorTrader.replace(/^https?:\/\//, "") }] : []),
    { label: "Code", href: CONFIG.github, text: "This project on GitHub" },
  ];
  return (
    <Section id="me" title="About me">
      <p className="text-[17px] leading-relaxed">
        Economics at St John&apos;s College, Cambridge (graduating 2028). Since 2021 I&apos;ve built an education audience of ~100K followers and 50M+ views. I run social media
        for the St John&apos;s May Ball and events for the Cambridge University Trading Society. I build with Claude Code: my latest, JuniorTrader, is a live app that turns
        market news into quizzes and trade calls for people starting out as traders. I&apos;m also President of the Cambridge University Pakistani Society, and I run a free mentoring programme for disadvantaged students applying to Cambridge Economics.
      </p>
      <p className="mt-6 text-lg font-semibold">Available from the end of June to the start of October 2027.</p>
      <ul className="mt-6 space-y-2">
        {links.map((l) => (
          <li key={l.label} className="text-[15px]">
            <span className="inline-block w-28 text-ink-2">{l.label}</span>
            <a href={l.href} className="font-medium text-accent-ink underline" {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {l.text}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
