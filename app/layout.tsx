import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted from npm so builds never depend on a third-party font fetch.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Absolute URLs for the preview image: SITE_URL if set, else Vercel's production URL, else local.
const siteUrl =
  process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3100");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Sceptic Map: what engineers doubt about AI incident tools",
  description:
    "An independent pitch to incident.io's marketing team: what engineers doubt about AI that investigates outages, and which doubts incident.io and its competitors answer with proof.",
  robots: { index: false, follow: false }, // a pitch for one team, not for search engines (Daniyaal's call)
  openGraph: {
    title: "Sceptic Map: what engineers doubt about AI incident tools",
    description: "An independent pitch to incident.io's marketing team: what engineers doubt about AI that investigates outages, and which doubts anyone answers with proof.",
    siteName: "Sceptic Map",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sceptic Map: what engineers doubt about AI incident tools",
    description: "An independent pitch to incident.io's marketing team: what engineers doubt about AI that investigates outages, and which doubts anyone answers with proof.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
