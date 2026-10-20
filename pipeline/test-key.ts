import Anthropic from "@anthropic-ai/sdk";
import { addUsage, emptyUsage, formatUsage, getClient, MODELS } from "./lib/anthropic";

async function main() {
  const client = getClient();
  const totals = emptyUsage();
  const response = await client.messages.create({
    model: MODELS.classify,
    max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Reply with exactly one word: ready" }],
  });
  addUsage(totals, response.model, response.usage);
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  console.log(`Model: ${response.model}`);
  console.log(`Reply: ${text}`);
  console.log(formatUsage("Usage", totals));
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Authentication failed: the API key was rejected.");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exit(1);
});
