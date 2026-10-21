# Sceptic Map

An independent student project, made for the incident.io marketing team. It collects what engineers say in public about AI tools for incidents, on-call and root-cause analysis, groups and counts their objections, and maps each objection against how vendors' public pages answer it: shown with proof, said but not shown, or not yet addressed. It covers incident.io's Investigations, PagerDuty, Rootly, Datadog, Resolve.ai and the do-it-yourself route (a general coding agent with MCP servers). It's a public-data prototype of analysing sales calls for objections. The site is one static page: https://sceptic-map.vercel.app

## How it works

| Step | Script | Output |
|---|---|---|
| Collect Hacker News items and vendor pages | `npm run pipeline:collect` | `data/raw/` (not committed) |
| Classify relevance, stance, objections (Claude Haiku), then a relevance check that can only remove (Claude Sonnet) | `npm run pipeline:classify` | `data/classified.json`, `data/labels_sample.csv` |
| Measure label agreement on a sample | `npm run pipeline:agreement` | `data/agreement.json` |
| Pick quotes, extract vendor claims, rate coverage, draft findings (Claude Sonnet) | `npm run pipeline:synthesise` | `data/synthesis.json` |
| Apply hand corrections from `data/overrides.json` | `npm run pipeline:merge` | `data/site.json`, `data/stats.json` |
| Check everything the page shows | `npm run pipeline:verify` (also runs before every build) | pass or fail |
| Build the site | `npm run build` | static page |

Models label the posts and write the sentences; code counts the labels, fills in every number and checks what the models write. Every quote must be an exact substring of its source and links to it; numbers in written text are placeholders filled from the data by one function (`lib/numbers.ts`); `pipeline/verify.ts` fails the build if a quote isn't verbatim, any number doesn't recompute, a phrase such as "only" or "none" stops being true, a rating has no source, or a banned word appears. Vendor claims are checked word for word against the fetched pages only where those pages exist: they aren't committed (`data/raw` is gitignored), so a fresh clone's build skips that one check until `npm run pipeline:collect` has run.

Built by Daniyaal with Claude Code: Daniyaal wrote the brief and made the calls; Claude Code wrote the code, ran the pipeline and did most of the checking. `notes/build-log.md` records every mistake and how it was caught.

## Rerunning it

1. Node 22, then `npm ci`.
2. Put an Anthropic API key in `.env.local` as `ANTHROPIC_API_KEY`.
3. Run the steps above in order. The vendor page list in `pipeline/vendor-urls.ts` has an approval flag that must be true before pages are fetched.

Every HTTP fetch and model response is cached in `cache/` (not committed), so reruns cost nothing. The first full run cost $6.83 in API calls, including runs discarded while tuning (`data/cost.json`). Collection uses a descriptive User-Agent, waits between requests and respects robots.txt.

## Methods and limits

- **Source:** 4,022 Hacker News stories and comments, Jan 2024 to Oct 2026. Reddit blocked automated access and isn't included.
- **Base:** 686 items were relevant; 256 written by vendors or founders about their own products were set aside, leaving 430 posts (321 comments, 109 stories). Every count is out of those 430.
- **Labels:** no human labels. A larger Claude model read 40 random posts in full, blind to the pipeline's labels: 33 clearly on topic, 1 off topic, 6 borderline, with 3 of the on-topic posts by people promoting their own tool; on the 33 on topic, the same stance on 26 (kappa 0.7) and an objection overlap of 0.71 where either named one (14 posts). Sonnet re-labelling 30 items gave an overlap of 0.61 on 14. That is agreement between models, not accuracy.
- **Vendor pages:** 21 of incident.io's, one AI SRE product page for each competitor and 3 for the do-it-yourself route, so competitor ratings describe that page only.
- **Review:** 36 quotes shown by default were re-read in context and 12 removed or moved; 72 rating reasons were checked and 15 corrected; a second review after launch changed 7 ratings and reworded 35 reasons. Corrections live in `data/overrides.json`, each with a note. Counts still use the model's labels.
- **Biases:** Hacker News skews sceptical, senior and away from buyers: only 8 of 430 posts show a buyer signal.
- **What it can't tell you:** nothing from customer calls, no win/loss data and no hands-on testing of any product. Vendor pages show what a buyer can read, not what sales says. Pages were fetched in October 2026.

Usernames are never stored or shown.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, the Anthropic TypeScript SDK and zod.
