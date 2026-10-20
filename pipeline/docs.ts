import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../lib/config";
import { Stats, Synthesis } from "../lib/schema";

// Renders README.md, out/memo.md and out/walkthrough-script.md from the data, so every number
// in them is filled by code (the same rule as the site). Usage: npm run docs -- [site URL]
const ROOT = process.cwd();
const site = Synthesis.parse(JSON.parse(readFileSync(path.join(ROOT, "data/site.json"), "utf8")));
const stats = Stats.parse(JSON.parse(readFileSync(path.join(ROOT, "data/stats.json"), "utf8")));
const url = process.argv[2] ?? "(link to follow)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const window = `${month(site.meta.window.from)} to ${month(site.meta.window.to)}`;
const [f1, f2, f3] = site.findings;
const n = site.numbers;
const notCapable = site.objections.find((o) => o.objection === "not_capable_yet")!;

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

Code computes every number; the models only choose and write words, and code checks what they write. Every quote must be an exact substring of its source and links to it; numbers in model-written text are placeholders filled from the data; \`pipeline/verify.ts\` fails the build if a quote isn't verbatim, a number doesn't recompute, a rating has no source, or a banned word appears.

## Rerunning it

1. Node 22, then \`npm ci\`.
2. Put an Anthropic API key in \`.env.local\` as \`ANTHROPIC_API_KEY\`.
3. Run the steps above in order. The vendor page list in \`pipeline/vendor-urls.ts\` has an approval flag that must be true before pages are fetched.

Every HTTP fetch and model response is cached in \`cache/\` (not committed), so reruns cost nothing. The first full run cost $${stats.costUsd.toFixed(2)} in API calls, including runs discarded while tuning (\`data/cost.json\`). Collection uses a descriptive User-Agent, waits between requests and respects robots.txt.

## Methods and limits

- **Source:** ${stats.nCollected.toLocaleString("en-GB")} Hacker News stories and comments, ${window}. Reddit blocked automated access and isn't included.
- **Base:** ${stats.nRelevant} items were relevant; ${stats.nVendorAuthored} written by vendors or founders about their own products were set aside, leaving ${stats.nBase}. Every count is out of those ${stats.nBase}.
- **Labels:** no hand labels. Sonnet re-labelled ${stats.agreement.n} random items on its own: the same stance on ${stats.agreement.stanceAgree} of ${stats.agreement.n} (Cohen's kappa ${stats.agreement.kappa}), objection overlap ${stats.agreement.objectionJaccard} (Jaccard). That is agreement between two models, not accuracy.
- **Review:** ${stats.audits.quotesReviewed} quotes shown by default were re-read in context and ${stats.audits.quotesFailed} were removed or moved; ${stats.audits.ratingsReviewed} rating reasons were checked against their claims and ${stats.audits.ratingsCorrected} corrected. Counts still use the model's labels, so a row can be off by one or two.
- **Biases:** Hacker News skews sceptical, senior and away from buyers: only ${stats.buyerSignal} of ${stats.nBase} comments show a buyer signal.
- **What it can't tell you:** nothing from customer calls, no win/loss data and no hands-on testing of any product. Vendor pages show what a buyer can read, not what sales says. Pages were fetched in October 2026.

Usernames are never stored or shown.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, the Anthropic TypeScript SDK and zod.
`;

const memo = `Sceptic Map: what engineers say about AI incident tools
${url}

I built a tool that reads what engineers say about AI incident tools and maps it against how Investigations is told: a public-data version of "analyse a few hundred Gong calls". From ${stats.nBase} Hacker News comments (${window}), three findings:

1. ${f1.headline} The alternative to beat is the tool they already use.

2. ${f2.headline} Nothing public yet shows responders learning from an investigation.

3. ${f3.headline} Publishing misses alongside hits would persuade them more.

The summer project: run the same pipeline on Gong calls, win/loss interviews and deal Slack channels, and turn it into a weekly "what changed" brief for sales and battle cards that keep themselves current, measured by rep usage, objection handling and time saved on enablement.

Every number is computed by code and every quote is checked against its source. Hacker News skews sceptical; real calls would fix that. Or give me a one-line brief and I'll ship it within two weeks.

Dany
Available from the end of June to the start of October 2027.
${CONFIG.email}
`;

const script = `# Walkthrough script (2 minutes)

Screen recording of the live page. Direct, no hype. About 270 words spoken.

**[0:00–0:20] Top of the page**

"Hi, I'm Dany. I read ${stats.nBase} Hacker News comments about AI incident tools and mapped them against how incident.io tells the Investigations story. The headline: ${n["diy:uses"]} of them already use or recommend a general AI tool for incident work, like Claude or Codex, but only ${n["diy:objection"]} call that a reason not to buy. The alternative to beat is the tool engineers already have."

**[0:20–1:05] Scroll to the map; open "AI can't do this job yet"**

"This is the Sceptic Map: each row is an objection, most common first. The top one, 'AI can't do this job yet', comes up in ${notCapable.count} comments. Here's what engineers say, every quote linked. Here's how incident.io's public pages answer it, with proof: a named customer, a measured figure and a real incident. And here's how PagerDuty, Rootly, Datadog, Resolve.ai and the do-it-yourself route compare.

One thing it surfaced: an earlier incident.io post says Investigations resolves what it can on its own, while the product page says its only change is a pull request you review. A sceptic would want one answer.

Filter to comments that mention general AI tools, and 'I could do this myself' moves to the top."

**[1:05–1:30] Scroll to the battle card**

"If a rep hears this tomorrow: three real objections, how to respond, what to ask next and what to send, built from incident.io's own pages. It's a draft; I'd rewrite it after real calls."

**[1:30–2:00] Scroll to the summer project**

"Which is the summer project. Version one is this, on public data. Version two runs on your Gong calls, win/loss interviews and deal Slack channels, and becomes a weekly brief for sales and battle cards that stay current. Every number here is computed by code. I'd love fifteen minutes to show you how it works, or give me a one-line brief and I'll ship it within two weeks."
`;

writeFileSync(path.join(ROOT, "README.md"), readme);
mkdirSync(path.join(ROOT, "out"), { recursive: true });
writeFileSync(path.join(ROOT, "out", "memo.md"), memo);
writeFileSync(path.join(ROOT, "out", "walkthrough-script.md"), script);
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const spoken = script.split("\n").filter((l) => /^["OF]/.test(l)).join(" ");
console.log(`README.md written. out/memo.md: ${words(memo)} words. out/walkthrough-script.md: about ${words(spoken)} spoken words.`);
