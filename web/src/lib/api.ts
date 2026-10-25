// Data access layer. The public site is read-only and served statically from
// public/data (synced from the repo root by scripts/sync-data.mjs). All URLs honor
// the configured basePath so the same code works locally and on GitHub Pages.
//
// We never ship secrets here — config.json copied into public/data contains no
// credentials (Telegram tokens live only in GitHub Actions secrets).

import type { AppConfig, Job, JobsData, Manifest } from "./types";
import { dataUrl } from "./utils";

let jobsCache: JobsData | null = null;
let configCache: AppConfig | null = null;
let manifestCache: Manifest | null = null;

export async function fetchJobs(): Promise<JobsData> {
  if (jobsCache) return jobsCache;
  const res = await fetch(dataUrl("/data/jobs.json"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load jobs.json (${res.status})`);
  const data = (await res.json()) as JobsData;
  if (!Array.isArray(data.jobs)) throw new Error("jobs.json has no 'jobs' array");
  jobsCache = data;
  return data;
}

export async function fetchConfig(): Promise<AppConfig> {
  if (configCache) return configCache;
  const res = await fetch(dataUrl("/data/config.json"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load config.json (${res.status})`);
  const data = (await res.json()) as AppConfig;
  configCache = data;
  return data;
}

export async function fetchManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(dataUrl("/data/manifest.json"), { cache: "no-store" });
    if (res.ok) manifestCache = (await res.json()) as Manifest;
    else manifestCache = { updated: null, count: 0, jdCount: 0, generatedAt: "" };
  } catch {
    manifestCache = { updated: null, count: 0, jdCount: 0, generatedAt: "" };
  }
  return manifestCache;
}

/** The job id used in URLs = jd_file without the .md extension (sha1[:10]). */
export function jobIdFromJob(job: Job): string {
  return job.jd_file.replace(/\.md$/, "");
}

/** Find a job by its URL id (jd_file stem). */
export function findJobById(jobs: Job[], id: string): Job | null {
  const target = `${id}.md`;
  return jobs.find((j) => j.jd_file === target) ?? null;
}

export interface ParsedJd {
  title: string;
  meta: Record<string, string>; // e.g. Company, Location, Posted, ...
  body: string; // full description text
  truncated: boolean;
}

/** Parse a JD markdown file (collector format) into metadata + body. */
export function parseJd(markdown: string): ParsedJd {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  let metaStart = -1;
  // Title: first "# " heading
  const titleIdx = lines.findIndex((l) => l.startsWith("# "));
  if (titleIdx >= 0) {
    title = lines[titleIdx].replace(/^#\s+/, "").trim();
    metaStart = titleIdx + 1;
  }
  // Find the first "---" separator (after metadata)
  let sepIdx = lines.findIndex((l, i) => (metaStart < 0 ? i > 0 : i > metaStart) && /^-{3,}\s*$/.test(l.trim()));
  const metaEnd = sepIdx >= 0 ? sepIdx : lines.length;
  const meta: Record<string, string> = {};
  for (let i = (metaStart >= 0 ? metaStart : 0); i < metaEnd; i++) {
    const m = /^\s*-\s*\*\*([^*]+):\*\*\s*(.*)$/.exec(lines[i]);
    if (m) meta[m[1].trim()] = m[2].trim();
  }
  const body =
    sepIdx >= 0
      ? lines
          .slice(sepIdx + 1)
          .join("\n")
          .trim()
      : "";
  const truncated = /\(truncated/.test(body);
  return { title, meta, body, truncated };
}

/** Fetch a JD file by its jd_file name; returns parsed JD or null on failure. */
export async function fetchJobDescription(jdFile: string): Promise<ParsedJd | null> {
  try {
    const res = await fetch(dataUrl(`/data/jds/${jdFile}`), { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    return parseJd(text);
  } catch {
    return null;
  }
}

/** Reset caches (useful if data is re-synced). Exposed for tests/refresh. */
export function resetApiCache(): void {
  jobsCache = null;
  configCache = null;
  manifestCache = null;
}
