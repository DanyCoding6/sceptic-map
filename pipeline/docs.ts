import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Stats, Synthesis } from "../lib/schema";

// Renders README.md from the data, so every number in it is filled by code (the same rule as
// the site). Usage: npm run docs -- [site URL]
const ROOT = process.cwd();
const site = Synthesis.parse(JSON.parse(readFileSync(path.join(ROOT, "data/site.json"), "utf8")));
const stats = Stats.parse(JSON.parse(readFileSync(path.join(ROOT, "data/stats.json"), "utf8")));
const url = process.argv[2] ?? "(link to follow)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const window = `${month(site.meta.window.from)} to ${month(site.meta.window.to)}`;
const a = stats.agreement;
const readme = `# Sceptic Map

An independent student project, made for the incident.io marketing team. It collects what engineers say in public about AI tools for incidents, on-call and root-cause analysis, groups and counts their objections, and maps each objection against how vendors' public pages answer it: shown with proof, said but not shown, or not yet addressed. It covers incident.io's Investigations, PagerDuty, Rootly, Datadog, Resolve.ai and the do-it-yourself route (a general coding agent with MCP servers). It's a public-data prototype of analysing sales calls for objections. The site is one static page: ${url}

## How it works

| Step | Script | Output |
|---|---|---|
| Collect Hacker News items and vendor pages | \`npm run pipeline:collect\` | \`data/raw/\` (not committed) |
| Classify relevance, stance, objections (Claude Haiku), then a relevance check that can only remove (Claude Sonnet) | \`npm run pipeline:classify\` | \`data/classified.json\`, \`data/labels_sample.csv\` |
| Measure label agreement on a sample | \`npm run pipeline:agreement\` | \`data/agreement.json\` |
| Pick quotes, extract vendor claims, rate coverage, draft findings (Claude Sonnet) | \`npm run pipeline:synthesise\` | \`data/synthesis.json\` |
| Apply hand corrections from \`data/overrides.json\` | \`npm run pipeline:merge\` | \`data/site.json\`, \`data/stats.json\` |
| Check everything the page shows | \`npm run pipeline:verify\` (also runs before every build) | pass or fail |
| Build the site | \`npm run build\` | static page |

Code computes every number; the models only choose and write words, and code checks what they write. Every quote must be an exact substring of its source and links to it; numbers in written text are placeholders filled from the data by one function (\`lib/numbers.ts\`); \`pipeline/verify.ts\` fails the build if a quote isn't verbatim, any number doesn't recompute, a phrase such as "only" or "none" stops being true, a rating has no source, or a banned word appears.

Built by Dany with Claude Code: Dany wrote the brief and made the calls; Claude Code wrote the code, ran the pipeline and did most of the checking. \`notes/build-log.md\` records every mistake and how it was caught.

## Rerunning it

1. Node 22, then \`npm ci\`.
2. Put an Anthropic API key in \`.env.local\` as \`ANTHROPIC_API_KEY\`.
3. Run the steps above in order. The vendor page list in \`pipeline/vendor-urls.ts\` has an approval flag that must be true before pages are fetched.

Every HTTP fetch and model response is cached in \`cache/\` (not committed), so reruns cost nothing. The first full run cost $${stats.costUsd.toFixed(2)} in API calls, including runs discarded while tuning (\`data/cost.json\`). Collection uses a descriptive User-Agent, waits between requests and respects robots.txt.

## Methods and limits

- **Source:** ${stats.nCollected.toLocaleString("en-GB")} Hacker News stories and comments, ${window}. Reddit blocked automated access and isn't included.
- **Base:** ${stats.nRelevant} items were relevant; ${stats.nVendorAuthored} written by vendors or founders about their own products were set aside, leaving ${stats.nBase} posts (${stats.nComments} comments, ${stats.nStories} stories). Every count is out of those ${stats.nBase}.
- **Labels:** no hand labels yet. Sonnet re-labelled ${a.n} random items on its own: the same stance on ${a.stanceAgree} of ${a.n} (Cohen's kappa ${a.kappa}). Where either model named an objection (${a.objectionLabelled} items), the overlap was ${a.objectionJaccard} (Jaccard), identical on ${a.objectionExact}. That is agreement between two models, not accuracy.
- **Vendor pages:** ${stats.pagesByVendor["incident.io"]} of incident.io's, one AI SRE product page for each competitor and ${stats.pagesByVendor.DIY} for the do-it-yourself route, so competitor ratings describe that page only.
- **Review:** ${stats.audits.quotesReviewed} quotes shown by default were re-read in context and ${stats.audits.quotesFailed} removed or moved; ${stats.audits.ratingsReviewed} rating reasons were checked and ${stats.audits.ratingsCorrected} corrected; a second review after launch changed ${stats.audits.postLaunchRatingsChanged} ratings and reworded ${stats.audits.postLaunchReasonsReworded} reasons. Corrections live in \`data/overrides.json\`, each with a note. Counts still use the model's labels.
- **Biases:** Hacker News skews sceptical, senior and away from buyers: only ${stats.buyerSignal} of ${stats.nBase} posts show a buyer signal.
- **What it can't tell you:** nothing from customer calls, no win/loss data and no hands-on testing of any product. Vendor pages show what a buyer can read, not what sales says. Pages were fetched in October 2026.

Usernames are never stored or shown.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, the Anthropic TypeScript SDK and zod.
`;

writeFileSync(path.join(ROOT, "README.md"), readme);
console.log("README.md written.");
