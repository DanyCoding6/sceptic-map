import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/data";
import { formatMonth } from "@/lib/format";

// The link preview (LinkedIn, Slack, X): finding #1, generated at build time from the data.
export const alt = "Sceptic Map: what engineers say about AI incident tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fonts load at module level (as in the Next docs), so the image is generated once at build time.
const fontDir = join(process.cwd(), "node_modules/@fontsource/inter/files");
const regular = await readFile(join(fontDir, "inter-latin-400-normal.woff"));
const semibold = await readFile(join(fontDir, "inter-latin-600-normal.woff"));

export default async function Image() {
  const top = site.findings[0];
  const { nBase, window } = site.meta;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "64px 72px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#6b6a65" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#00897b" }} />
          Sceptic Map · an independent pitch
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 600, lineHeight: 1.18, color: "#111110", letterSpacing: -1 }}>{top.short ?? top.headline}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 24, color: "#4b4a46" }}>
          <div style={{ display: "flex" }}>
            {nBase} Hacker News comments, {formatMonth(window.from)} to {formatMonth(window.to)}
          </div>
          <div style={{ display: "flex", color: "#0f766e", fontWeight: 600 }}>Made for the incident.io marketing team</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
