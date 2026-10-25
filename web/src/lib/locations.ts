// Location normalization. Options are generated from the real dataset; we never
// hard-code a city list as "available" if no job is actually there.

import type { Job } from "./types";

export interface NormalizedLocation {
  city: string; // best-effort city, e.g. "Chennai"
  raw: string; // original location string
  isRemote: boolean;
  isAnywhere: boolean;
}

const REMOTE_RE = /\bremote\b/i;
const ANYWHERE_RE = /\banywhere\b/i;
const INDIA_RE = /\b(india|ind)\b/i;

/** "Chennai, Tamil Nadu, IND" -> "Chennai". Returns "" if no usable city. */
export function normalizeLocation(raw: string): NormalizedLocation {
  const trimmed = (raw || "").trim();
  const isRemote = REMOTE_RE.test(trimmed);
  const isAnywhere = ANYWHERE_RE.test(trimmed);
  if (isRemote || isAnywhere || trimmed === "") {
    return { city: "", raw: trimmed, isRemote, isAnywhere };
  }
  // Take the first comma-separated segment as the city.
  const first = trimmed.split(",")[0].trim();
  // Workday sometimes emits "N locations (incl. Chennai)" — pull Chennai out.
  const incl = /\(incl\.\s*([^)]+)\)/i.exec(trimmed);
  if (incl) {
    return { city: incl[1].split(",")[0].trim(), raw: trimmed, isRemote, isAnywhere };
  }
  return { city: first, raw: trimmed, isRemote, isAnywhere };
}

/** A stable, human label for the city, plus "Remote" when indicated. */
export function locationLabel(raw: string): string {
  const n = normalizeLocation(raw);
  if (n.isRemote) return "Remote";
  if (n.isAnywhere) return "Anywhere";
  return n.city || (INDIA_RE.test(raw) ? "India" : "Other");
}

export interface LocationOption {
  label: string;
  count: number;
}

/** Build location filter options from the real jobs, sorted by frequency. */
export function buildLocationOptions(jobs: Job[]): LocationOption[] {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    const label = locationLabel(j.location);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function jobMatchesLocation(job: Job, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const label = locationLabel(job.location);
  return selected.includes(label);
}
