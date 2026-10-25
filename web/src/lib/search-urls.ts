// Builds pre-filtered search URLs for LinkedIn, Naukri, and Indeed — mirroring the
// logic in the Python collector's build_search_md(). These open pre-filtered searches
// in the user's browser; nothing is scraped.

export type JobBoard = "linkedin" | "naukri" | "indeed";

export interface SearchInput {
  keyword: string;
  location: string; // e.g. "Chennai"
  experienceYears: number; // for Naukri experience param
  dateWindow: number | null; // days; null = no date filter
  linkedinLevels?: string; // comma-separated LinkedIn experience level ids, e.g. "1,2,3"
}

function pickNearest(n: number, allowed: number[]): number | null {
  const ok = allowed.filter((a) => a >= n).sort((a, b) => a - b);
  if (ok.length) return ok[0];
  const below = allowed.filter((a) => a <= n).sort((a, b) => b - a);
  return below[0] ?? null;
}

const NAUKRI_JOBAGES = [1, 3, 7, 15, 30];
const INDEED_FROMAGES = [1, 3, 7, 14];

function naukriSlug(kw: string): string {
  return kw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

export function buildSearchUrl(board: JobBoard, input: SearchInput): string {
  const { keyword, location, experienceYears, dateWindow, linkedinLevels } = input;
  const locSlug = location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const locCity = location || "Chennai";

  if (board === "linkedin") {
    const params = new URLSearchParams({
      keywords: keyword,
      location: `${locCity}, Tamil Nadu, India`,
    });
    if (dateWindow !== null) params.set("f_TPR", `r${dateWindow * 86400}`);
    if (linkedinLevels) params.set("f_E", linkedinLevels);
    return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
  }

  if (board === "naukri") {
    const base = `https://www.naukri.com/${naukriSlug(keyword)}-jobs-in-${locSlug}?experience=${experienceYears}`;
    if (dateWindow !== null) {
      const jobAge = pickNearest(dateWindow, NAUKRI_JOBAGES);
      if (jobAge !== null) return `${base}&jobAge=${jobAge}`;
    }
    return base;
  }

  // indeed
  const params = new URLSearchParams({ q: keyword, l: `${locCity}, Tamil Nadu` });
  if (dateWindow !== null) {
    const fromage = pickNearest(dateWindow, INDEED_FROMAGES);
    if (fromage !== null) params.set("fromage", String(fromage));
  }
  return `https://in.indeed.com/jobs?${params.toString()}`;
}

export const SEARCH_BOARDS: { value: JobBoard; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "indeed", label: "Indeed" },
];
