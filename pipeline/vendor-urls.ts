// Vendor messaging pages. Found by web search on 2026-10-19; nothing here is fetched until Dany
// approves the list (then set VENDOR_LIST_APPROVED to true and run `npm run pipeline:collect -- vendors`).
export const VENDOR_LIST_APPROVED = true; // approved by Dany, 19 Oct 2026

export interface VendorPage {
  slug: string;
  vendor: "incident.io" | "PagerDuty" | "Rootly" | "Datadog" | "Resolve.ai" | "DIY";
  group: "product" | "launch" | "proof" | "changelog" | "comparison" | "diy";
  url: string;
  note: string;
}

export const VENDOR_PAGES: VendorPage[] = [
  // incident.io: product and launch
  { slug: "iio-launch", vendor: "incident.io", group: "launch", url: "https://incident.io/blog/introducing-investigations-powered-by-nexus", note: "Investigations launch post, 5 Aug 2026" },
  { slug: "iio-nexus", vendor: "incident.io", group: "product", url: "https://incident.io/nexus", note: "Nexus product page" },
  { slug: "iio-investigations", vendor: "incident.io", group: "product", url: "https://incident.io/investigations", note: "Investigations product page" },
  { slug: "iio-ai-sre", vendor: "incident.io", group: "product", url: "https://incident.io/ai-sre", note: "Older AI SRE page; may now redirect to Investigations" },
  { slug: "iio-building", vendor: "incident.io", group: "proof", url: "https://incident.io/blog/building-investigations-what-it-takes-to-build-an-ai-sre", note: "How they built and tested it (backtesting), ~1 Oct 2026" },
  { slug: "iio-entered-chat", vendor: "incident.io", group: "launch", url: "https://incident.io/blog/introducing-ai-sre", note: "Earlier AI SRE post, now titled 'Investigations has entered the chat'" },
  { slug: "iio-how-it-feels", vendor: "incident.io", group: "proof", url: "https://incident.io/blog/how-it-feels-to-run-an-incident-with-ai-sre", note: "Now titled 'How it feels to run an incident with Investigations'" },
  // incident.io: AI-related changelog entries since June 2026
  { slug: "iio-cl-mac", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/incident-io-for-mac", note: "9 Jun 2026: Mac app, MCP for Claude Code, Codex and Cursor" },
  { slug: "iio-cl-agent-everywhere", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/access-the-agent-from-everywhere", note: "30 Jun 2026: agent in the dashboard" },
  { slug: "iio-cl-workflows", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/more-powerful-workflows", note: "21 Jul 2026: agent actions in workflows" },
  { slug: "iio-cl-ga", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/investigations-now-available-powered-by-nexus", note: "5 Aug 2026: Investigations generally available" },
  { slug: "iio-cl-status-pages", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/a-few-improvements-to-status-pages", note: "~Aug 2026: Coralogix and Splunk as Investigations sources" },
  { slug: "iio-cl-alert-sources", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/easier-alert-source-set-up", note: "2 Sep 2026: agent can page quietly; MCP identity" },
  { slug: "iio-cl-ticket-sync", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/bidirectional-sync-for-incident-tickets", note: "15 Sep 2026: investigation feedback; agent PR fixes" },
  { slug: "iio-cl-2x-faster", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/investigations-are-2x-faster", note: "22 Sep 2026: median investigation time 6.7 to 3 min" },
  { slug: "iio-cl-dark-mode", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/dark-mode", note: "~Oct 2026: agent faster, auto-run, rejects invented citations" },
  { slug: "iio-cl-plugin", vendor: "incident.io", group: "changelog", url: "https://incident.io/changelog/the-incident-io-plugin-our-skills-in-your-agent", note: "~15 Oct 2026: incident.io skills inside coding agents" },
  // incident.io: comparison pages
  { slug: "iio-vs-pagerduty", vendor: "incident.io", group: "comparison", url: "https://incident.io/alternatives/pagerduty", note: "Only /alternatives/ page found" },
  { slug: "iio-vs-rootly", vendor: "incident.io", group: "comparison", url: "https://incident.io/blog/incident-io-vs-rootly", note: "Blog comparison with Rootly" },
  { slug: "iio-vs-resolve", vendor: "incident.io", group: "comparison", url: "https://incident.io/blog/best-resolve-ai-alternatives-2026", note: "Blog comparison with Resolve.ai" },
  { slug: "iio-5-best", vendor: "incident.io", group: "comparison", url: "https://incident.io/blog/5-best-ai-powered-incident-management-platforms-2026", note: "Multi-vendor comparison" },
  // Competitors: main AI investigation / AI SRE page
  { slug: "pagerduty-sre-agent", vendor: "PagerDuty", group: "product", url: "https://www.pagerduty.com/platform/ai-agents/sre/", note: "SRE Agent product page" },
  { slug: "rootly-ai-sre", vendor: "Rootly", group: "product", url: "https://rootly.com/ai-sre", note: "AI SRE product page" },
  { slug: "datadog-bits-investigation", vendor: "Datadog", group: "product", url: "https://www.datadoghq.com/product/ai/bits-investigation/", note: "Bits AI SRE, now titled Bits Investigation" },
  { slug: "resolve-ai-sre", vendor: "Resolve.ai", group: "product", url: "https://resolve.ai/product/ai-sre", note: "AI SRE product page" },
  // DIY: a general coding agent plus MCP servers
  { slug: "diy-magarcia", vendor: "DIY", group: "diy", url: "https://magarcia.io/using-claude-code-agent-teams-for-incident-investigation/", note: "First-hand: Claude Code with Datadog, Sentry and Slack MCP on a real incident, Mar 2026" },
  { slug: "diy-hivebrite", vendor: "DIY", group: "diy", url: "https://engineering.hivebrite.io/blog/building-an-agentic-slackbot-with-claude-code/", note: "Company eng blog: Claude Code with Datadog and Atlassian MCP for incidents, late 2025" },
  { slug: "diy-datadog-mcp", vendor: "DIY", group: "diy", url: "https://www.datadoghq.com/blog/datadog-mcp-server-use-cases/", note: "Datadog's own account of teams using its MCP server from coding agents" },
];
