@AGENTS.md

# Sceptic Map

An independent student project, made for the incident.io marketing team. A working tool plus a one-page site that (1) collects what engineers say publicly about AI tools for incidents, on-call and root-cause analysis; (2) groups and counts their objections; (3) shows, for each objection, how incident.io's public messaging answers it ("shown with proof" / "said but not shown" / "not yet addressed"), and does the same for PagerDuty, Rootly, Datadog, Resolve.ai and the DIY alternative (a general coding agent with MCP servers). See README.md for how to rerun it.

## Hard rules
1. **Never invent a quote, number, customer or claim.** Every quote shown is an exact substring of its source text (after whitespace normalisation) and links to its source URL. Every number shown comes from `/data` and shows its n and date range. Code computes numbers; models only write words.
2. **No commenter usernames.** Show the quote, platform, date and link only. Quotes are short: one or two sentences.
3. **Respect rate limits and robots.txt.** Use a descriptive User-Agent. If a source blocks us, skip it and log why. Never work around a block.
4. **Clearly an independent project.** It must not look like an official incident.io page: no incident.io logo or brand colours.
5. **The author hasn't used Investigations.** Every statement about a vendor's product comes from its public pages and is linked. Never imply hands-on use.
6. **Tone: plain, specific, British spelling.** Frame gaps in a vendor's messaging constructively: what sceptics need to hear and how it could be shown.
7. **Honesty about the data.** Public Hacker News comments skew sceptical, senior and non-buyer; the site says so in "Methods and limits", along with what it can't tell you. No percentages on a small n.

**Banned words:** "AI-powered", "revolutionary", "game-changing", "leverage", "unlock", "seamless", "cutting-edge", "in today's fast-paced world".

## Stack and conventions
- Next.js 16 (App Router) + TypeScript + Tailwind v4. Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md). The page is prerendered static (`ensureStatic = 'navigation'`). No `output: 'export'`.
- Pipeline: TypeScript in `/pipeline`, run with `tsx` via `npm run` scripts. Outputs are committed JSON in `/data`; the site makes no runtime API calls.
- Models: `claude-haiku-5-5` for per-item classification (batches of ~10, medium effort), then a `claude-sonnet-5-5` pass that re-checks relevance and can only remove items; `claude-sonnet-5-5` also does synthesis, with server-side fallback on. All calls go through `callStructured` in `pipeline/lib/llm.ts` (structured outputs via `zodOutputFormat`; every call metered; retry once on a failed parse, then log and skip).
- Client: always construct via `pipeline/lib/anthropic.ts`, which pins `baseURL`. Key: `ANTHROPIC_API_KEY` in `.env.local`.
- Cache every HTTP fetch and model response in `/cache`, keyed by a sha256 of the request. Log tokens and estimated spend at the end of every run (`data/cost.json`).
- Hand corrections go in `data/overrides.json` (with a note saying why); `npm run pipeline:merge` applies them; `pipeline/verify.ts` runs before every build.
- Gitignored: `/cache`, `.env*`, `/data/raw`, `/out`.
- Build log: every time something goes wrong, add one line to `notes/build-log.md`: what happened, how it was caught, what changed.
