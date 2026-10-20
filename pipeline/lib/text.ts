import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// Collapse every run of whitespace to one space. Used for dedupe hashes and the quote check.
export function normaliseWhitespace(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function textHash(text: string): string {
  return sha256(normaliseWhitespace(text).toLowerCase());
}

// A quote passes only if it appears verbatim in the source once whitespace is normalised.
export function isVerbatim(quote: string, source: string): boolean {
  const q = normaliseWhitespace(quote);
  return q.length > 0 && normaliseWhitespace(source).includes(q);
}

// HN and Reddit comment HTML: keep paragraph and line breaks, drop tags, decode entities.
export function fragmentToText(html: string): string {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  $("br").replaceWith("\n");
  $("p, pre, li").each((_, el) => {
    $(el).prepend("\n\n");
  });
  return $("#root")
    .text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// A full web page: drop chrome (nav, footer, scripts, forms), keep readable text with block breaks.
export function pageToText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  // React streaming pages ship content in <div hidden id="S:n"> blocks that the browser swaps
  // into <template id="B:n"> placeholders. Do the same swap, or the page reads as a loading spinner.
  $('div[hidden][id^="S:"]').each((_, el) => {
    const n = $(el).attr("id")!.slice(2);
    const placeholder = $(`template[id="B:${n}"]`);
    if (placeholder.length) {
      placeholder.parent().find("[role='status']").remove();
      placeholder.replaceWith($(el).contents());
      $(el).remove();
    }
  });
  $("script, style, noscript, svg, iframe, nav, footer, header, form, button, template, [aria-hidden='true']").remove();
  const root = $("main").length ? $("main").first() : $("body");
  root.find("br").replaceWith("\n");
  root.find("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, div, section, article").each((_, el) => {
    $(el).prepend("\n");
    $(el).append("\n");
  });
  const text = root
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
  return { title, text };
}
