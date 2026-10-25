// Date / time formatting helpers. The collector stores ISO strings in UTC.
// Posting dates are taken from the company when available (posted_exact=true);
// otherwise the first-seen date is used and surfaced as such.

import { formatDistanceToNowStrict, format, parseISO, isValid } from "date-fns";

export function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** "3 days ago", "2 hours ago". Falls back to the raw date if parsing fails. */
export function relativeAgo(value: string | null | undefined, exact: boolean = true): string {
  const d = parseDateSafe(value);
  if (!d) return "unknown";
  try {
    const s = formatDistanceToNowStrict(d, { addSuffix: true });
    return exact ? s : `${s}*`;
  } catch {
    return "unknown";
  }
}

/** "Oct 19, 2026" */
export function formatDate(value: string | null | undefined): string {
  const d = parseDateSafe(value);
  if (!d) return "—";
  return format(d, "MMM d, yyyy");
}

/** Short ISO date "2026-10-19" used for sorting keys. */
export function isoDay(value: string | null | undefined): string {
  const d = parseDateSafe(value);
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

/** Whole days between a date and now (negative = future). 0 = today. */
export function ageDays(value: string | null | undefined): number | null {
  const d = parseDateSafe(value);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Human label for a date-window size, matching the collector's wording. */
export function windowLabel(n: number): string {
  if (n === 1) return "Last 24 hours";
  if (n === 30 || n === 31) return "Last 30 days (1 month)";
  if (n === 365) return "Last 365 days (1 year)";
  return `Last ${n} days`;
}

export function postedLabel(job: { posted: string; posted_exact: boolean }): string {
  const d = parseDateSafe(job.posted);
  if (!d) return "—";
  const base = format(d, "MMM d, yyyy");
  return job.posted_exact ? base : `${base} (first seen)`;
}
