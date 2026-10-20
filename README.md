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

Code computes every number; the models only choose and write words, and code checks what they write. Every quote must be an exact substring of its source and links to it; numbers in model-written text are placeholders filled from the data; `pipeline/verify.ts` fails the build if a quote isn't verbatim, a number doesn't recompute, a rating has no source, or a banned word appears.

## Rerunning it

1. Node 22, then `npm ci`.
2. Put an Anthropic API key in `.env.local` as `ANTHROPIC_API_KEY`.
3. Run the steps above in order. The vendor page list in `pipeline/vendor-urls.ts` has an approval flag that must be true before pages are fetched.

Every HTTP fetch and model response is cached in `cache/` (not committed), so reruns cost nothing. The first full run cost $6.83 in API calls, including runs discarded while tuning (`data/cost.json`). Collection uses a descriptive User-Agent, waits between requests and respects robots.txt.

## Methods and limits

- **Source:** 4,022 Hacker News stories and comments, Jan 2024 to Oct 2026. Reddit blocked automated access and isn't included.
- **Base:** 686 items were relevant; 256 written by vendors or founders about their own products were set aside, leaving 430. Every count is out of those 430.
- **Labels:** no hand labels. Sonnet re-labelled 30 random items on its own: the same stance on 27 of 30 (Cohen's kappa 0.85), objection overlap 0.82 (Jaccard). That is agreement between two models, not accuracy.
- **Review:** 36 quotes shown by default were re-read in context and 12 were removed or moved; 72 rating reasons were checked against their claims and 15 corrected. Counts still use the model's labels, so a row can be off by one or two.
- **Biases:** Hacker News skews sceptical, senior and away from buyers: only 8 of 430 comments show a buyer signal.
- **What it can't tell you:** nothing from customer calls, no win/loss data and no hands-on testing of any product. Vendor pages show what a buyer can read, not what sales says. Pages were fetched in October 2026.

Usernames are never stored or shown.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, the Anthropic TypeScript SDK and zod.
