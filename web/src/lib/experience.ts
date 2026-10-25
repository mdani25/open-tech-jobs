// Experience classification.
//
// The collector parses `years` (minimum years required, from sentences mentioning
// "experience") and already drops jobs requiring more than `max_years_required`.
// `years` is null when no experience requirement could be parsed. Per the spec we
// do NOT treat "no experience stated" as fresher-friendly.

import type { Job } from "./types";

export type ExperienceBucket = {
  key: string;
  label: string;
  /** Returns true if a job falls in this bucket. */
  test: (job: Job) => boolean;
};

const has = (title: string, ...words: string[]) =>
  words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(title));

export const EXPERIENCE_BUCKETS: ExperienceBucket[] = [
  { key: "fresher", label: "Fresher (0+ yrs)", test: (j) => j.years === 0 },
  { key: "internship", label: "Internship", test: (j) => has(j.title, "intern") },
  {
    key: "graduate-trainee",
    label: "Graduate trainee",
    test: (j) => has(j.title, "graduate", "trainee", "get", "graduate engineer trainee"),
  },
  { key: "0-1", label: "0–1 years", test: (j) => j.years !== null && j.years <= 1 },
  { key: "0-2", label: "0–2 years", test: (j) => j.years !== null && j.years <= 2 },
  { key: "0-3", label: "0–3 years", test: (j) => j.years !== null && j.years <= 3 },
  { key: "1-3", label: "1–3 years", test: (j) => j.years !== null && j.years >= 1 && j.years <= 3 },
  { key: "3-5", label: "3–5 years", test: (j) => j.years !== null && j.years >= 3 && j.years <= 5 },
  {
    key: "not-specified",
    label: "Experience not specified",
    test: (j) => j.years === null,
  },
];

export function experienceLabel(years: number | null): string {
  if (years === null) return "Experience not specified";
  return `${years}+ yrs (min)`;
}

/** A job matches the selected experience buckets if it falls in ANY of them. */
export function jobMatchesExperience(job: Job, keys: string[]): boolean {
  if (keys.length === 0) return true;
  return EXPERIENCE_BUCKETS.some((b) => keys.includes(b.key) && b.test(job));
}

export interface ExpRangeFilter {
  min: number | null;
  max: number | null;
}

/** Custom min/max: keep jobs with years in [min,max]; null years are kept only when
 * the user explicitly sets min=0 (i.e. including entry-level). */
export function jobMatchesExperienceRange(job: Job, range: ExpRangeFilter): boolean {
  const { min, max } = range;
  if (min === null && max === null) return true;
  if (job.years === null) {
    // Unknown experience: include only when the range starts at 0 (entry-level) and
    // has no upper bound, mirroring "don't infer fresher from missing data".
    return min === 0 && max === null;
  }
  if (min !== null && job.years < min) return false;
  if (max !== null && job.years > max) return false;
  return true;
}
