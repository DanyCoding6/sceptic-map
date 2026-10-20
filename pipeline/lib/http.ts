import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import robotsParser from "robots-parser";
import { sha256 } from "./text";

export const USER_AGENT =
  "ScepticMap/0.1 (+https://github.com/DanyCoding6/sceptic-map; independent student research)";

const CACHE_DIR = path.join(process.cwd(), "cache", "http");

// Minimum gap between requests to the same host. Anything not listed gets the default.
const HOST_DELAY_MS: Record<string, number> = {
  "hn.algolia.com": 1000,
  "www.reddit.com": 2000,
  "oauth.reddit.com": 2000,
};
const DEFAULT_DELAY_MS = 2000;

// A source told us to stop (403 or 429). The caller stops that source and reports it.
export class BlockedError extends Error {
  constructor(
    public host: string,
    public status: number,
    public url: string,
  ) {
    super(`${host} returned ${status} for ${url}`);
  }
}

export class RobotsDisallowedError extends Error {
  constructor(public url: string) {
    super(`robots.txt disallows ${url} for our User-Agent`);
  }
}

export interface FetchResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  fetchedAt: string;
  fromCache: boolean;
}

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
  // Robots.txt applies to crawling web pages; token endpoints and public APIs that publish no robots.txt still pass.
  checkRobots?: boolean;
  // Off for requests whose answer must be fresh (e.g. OAuth tokens).
  cache?: boolean;
}

const lastRequestAt = new Map<string, number>();
const blockedHosts = new Map<string, BlockedError>();
const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();

export const stats = { network: 0, cached: 0 };

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${sha256(key)}.json`);
}

async function waitForHost(host: string): Promise<void> {
  const gap = HOST_DELAY_MS[host] ?? DEFAULT_DELAY_MS;
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + gap - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

async function robotsAllows(url: URL): Promise<boolean> {
  const origin = url.origin;
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    const res = await cachedFetch(robotsUrl, { checkRobots: false });
    robotsCache.set(origin, res.status === 200 ? robotsParser(robotsUrl, res.body) : null);
  }
  const robots = robotsCache.get(origin);
  // No robots.txt (404 etc.) means no restrictions.
  return robots ? robots.isAllowed(url.toString(), USER_AGENT) !== false : true;
}

export async function cachedFetch(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const method = opts.method ?? "GET";
  const key = JSON.stringify({ method, url, body: opts.body ?? null });
  const file = cachePath(key);
  const useCache = opts.cache !== false;
  if (useCache && existsSync(file)) {
    stats.cached += 1;
    return { ...(JSON.parse(readFileSync(file, "utf8")) as FetchResult), fromCache: true };
  }

  const parsed = new URL(url);
  const host = parsed.host;
  const blocked = blockedHosts.get(host);
  if (blocked) throw blocked;
  if (opts.checkRobots !== false && !(await robotsAllows(parsed))) {
    throw new RobotsDisallowedError(url);
  }

  for (let attempt = 0; ; attempt++) {
    await waitForHost(host);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        body: opts.body,
        headers: { "User-Agent": USER_AGENT, ...opts.headers },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (attempt < 2) continue;
      throw err;
    }
    stats.network += 1;

    if (res.status === 403 || res.status === 429) {
      const err = new BlockedError(host, res.status, url);
      blockedHosts.set(host, err);
      throw err;
    }
    if (res.status >= 500 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    const result: FetchResult = {
      url: res.url || url,
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body: await res.text(),
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
    // Cache successes and definitive misses (404/410) so reruns never re-request them.
    if (useCache && (res.ok || res.status === 404 || res.status === 410)) {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(file, JSON.stringify(result));
    }
    return result;
  }
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await cachedFetch(url, { ...opts, headers: { Accept: "application/json", ...opts.headers } });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${url}`);
  return JSON.parse(res.body) as T;
}
