// The core filter + sort engine. Everything here is derived from the real job
// fields; we never fabricate attributes. Work mode and employment type are
// inferred from listing text and labelled as such in the UI.

import type {
  AppConfig,
  AtsProvider,
  EmploymentType,
  FilterState,
  Job,
  SortKey,
  WorkMode,
} from "./types";
import { jobMatchesExperience, jobMatchesExperienceRange } from "./experience";
import { jobMatchesLocation } from "./locations";
import { jobMatchesCategories, classifyJob } from "./categories";
import { jobMatchesSkills, jobSkillText } from "./skills";
import { ageDays } from "./format";

export interface FilterContext {
  companyAts: Map<string, AtsProvider>;
}

export function buildCompanyAts(config: AppConfig | null | undefined): Map<string, AtsProvider> {
  const map = new Map<string, AtsProvider>();
  if (!config) return map;
  for (const c of config.companies) {
    map.set(c.name, c.ats);
  }
  return map;
}

export function inferWorkMode(job: Job): WorkMode {
  const text = `${job.location || ""} ${job.summary || ""}`;
  if (/\bremote\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if ((job.location || "").trim() === "") return "not-specified";
  return "onsite"; // a specific city office, no remote/hybrid signal -> on-site
}

export function inferEmploymentType(job: Job): EmploymentType {
  const t = job.title || "";
  if (/\bintern(ship)?\b/i.test(t)) return "internship";
  if (/\bpart[- ]?time\b/i.test(t)) return "part-time";
  if (/\bcontract(or)?\b/i.test(t)) return "contract";
  if (/\btemp(orary)?\b/i.test(t)) return "temporary";
  if (/\b(graduate|trainee)\b/i.test(t)) return "graduate-trainee";
  return "not-specified"; // we do not assume full-time without evidence
}

function wholeWord(text: string, kw: string): boolean {
  const re = new RegExp(
    `(?<![a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
    "i",
  );
  return re.test(text);
}

/** Search across title, company, location, matched skills, summary, category label, ATS. */
function jobMatchesQuery(job: Job, ats: AtsProvider | undefined, q: string): boolean {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = [
    job.title,
    job.company,
    job.location,
    (job.matched || []).join(" "),
    job.summary || "",
    classifyJob(job),
    ats ?? "",
  ]
    .join(" ")
    .toLowerCase();
  // AND across terms (every term must appear) for a focused result set.
  return terms.every((t) => hay.includes(t));
}

function withinDateWindow(job: Job, filter: FilterState): boolean {
  if (filter.customFrom) {
    return (job.posted || "") >= filter.customFrom;
  }
  if (filter.dateWindow === null) return true;
  const d = ageDays(job.posted);
  return d !== null && d <= filter.dateWindow;
}

export function passesFilters(job: Job, filter: FilterState, ctx: FilterContext): boolean {
  const ats = ctx.companyAts.get(job.company);
  if (!jobMatchesQuery(job, ats, filter.q)) return false;
  if (!jobMatchesLocation(job, filter.locations)) return false;
  if (filter.maxExperience !== null) {
    // global cap mirrors the collector's max_years_required (null years pass through)
    if (job.years !== null && job.years > filter.maxExperience) return false;
  }
  if (!jobMatchesExperience(job, filter.experience)) return false;
  if (!jobMatchesCategories(job, filter.categories)) return false;
  if (filter.workMode.length > 0 && !filter.workMode.includes(inferWorkMode(job))) return false;
  if (filter.employmentType.length > 0 && !filter.employmentType.includes(inferEmploymentType(job)))
    return false;
  if (filter.companies.length > 0 && !filter.companies.includes(job.company)) return false;
  if (filter.ats.length > 0 && (!ats || !filter.ats.includes(ats))) return false;
  if (!jobMatchesSkills(job, filter.skills, filter.skillMode, filter.skillThreshold)) return false;

  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.summary || "").toLowerCase();
  if (filter.incTitle.length > 0 && !filter.incTitle.some((k) => wholeWord(titleLower, k.toLowerCase())))
    return false;
  if (filter.excTitle.length > 0 && filter.excTitle.some((k) => wholeWord(titleLower, k.toLowerCase())))
    return false;
  if (filter.incDesc.length > 0 && !filter.incDesc.some((k) => wholeWord(descLower, k.toLowerCase())))
    return false;
  if (filter.excDesc.length > 0 && filter.excDesc.some((k) => wholeWord(descLower, k.toLowerCase())))
    return false;

  if (!withinDateWindow(job, filter)) return false;
  return true;
}

export function filterJobs(jobs: Job[], filter: FilterState, ctx: FilterContext): Job[] {
  return jobs.filter((j) => passesFilters(j, filter, ctx));
}

function relevanceScore(job: Job, ats: AtsProvider | undefined, q: string): number {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const summary = (job.summary || "").toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (title.includes(t)) score += 5;
    if (company.includes(t)) score += 3;
    if (summary.includes(t)) score += 1;
  }
  score += job.match; // resume-skill match is a relevance signal
  return score;
}

const tiebreak = (a: Job, b: Job) =>
  (b.posted || "").localeCompare(a.posted || "") || (b.url || "").localeCompare(a.url || "");

export function sortJobs(
  jobs: Job[],
  sort: SortKey,
  ctx: FilterContext,
  q: string = "",
): Job[] {
  const arr = [...jobs];
  switch (sort) {
    case "newest":
      arr.sort((a, b) => (b.posted || "").localeCompare(a.posted || "") || (b.url || "").localeCompare(a.url || ""));
      break;
    case "oldest":
      arr.sort((a, b) => (a.posted || "").localeCompare(b.posted || "") || (a.url || "").localeCompare(b.url || ""));
      break;
    case "best-match":
      arr.sort(
        (a, b) =>
          b.match - a.match ||
          (b.posted || "").localeCompare(a.posted || "") ||
          (b.url || "").localeCompare(a.url || ""),
      );
      break;
    case "company-az":
      arr.sort(
        (a, b) =>
          (a.company || "").localeCompare(b.company || "") ||
          (b.posted || "").localeCompare(a.posted || "") ||
          (b.url || "").localeCompare(a.url || ""),
      );
      break;
    case "company-za":
      arr.sort(
        (a, b) =>
          (b.company || "").localeCompare(a.company || "") ||
          (b.posted || "").localeCompare(a.posted || "") ||
          (b.url || "").localeCompare(a.url || ""),
      );
      break;
    case "lowest-experience":
      arr.sort((a, b) => {
        // null years last
        if (a.years === null && b.years === null) return tiebreak(a, b);
        if (a.years === null) return 1;
        if (b.years === null) return -1;
        return a.years - b.years || tiebreak(a, b);
      });
      break;
    case "relevance":
      arr.sort((a, b) => {
        const sa = relevanceScore(a, ctx.companyAts.get(a.company), q);
        const sb = relevanceScore(b, ctx.companyAts.get(b.company), q);
        return sb - sa || tiebreak(a, b);
      });
      break;
  }
  return arr;
}

export function applyFilters(
  jobs: Job[],
  filter: FilterState,
  ctx: FilterContext,
): { results: Job[]; total: number } {
  const filtered = filterJobs(jobs, filter, ctx);
  const sorted = sortJobs(filtered, filter.sort, ctx, filter.q);
  return { results: sorted, total: filtered.length };
}

export interface FacetCounts {
  locations: Record<string, number>;
  companies: Record<string, number>;
  ats: Record<string, number>;
  experience: Record<string, number>;
  categories: Record<string, number>;
  workMode: Record<string, number>;
  employmentType: Record<string, number>;
}

/** Counts per facet over a (already partially filtered) set. Used to show counts
 * next to each option. Counts are "within the current result set". */
export function computeFacets(jobs: Job[], ctx: FilterContext): FacetCounts {
  const f: FacetCounts = {
    locations: {},
    companies: {},
    ats: {},
    experience: {},
    categories: {},
    workMode: {},
    employmentType: {},
  };
  for (const j of jobs) {
    const loc = j.location ? (j.location.split(",")[0].trim() || "Other") : "Other";
    f.locations[loc] = (f.locations[loc] ?? 0) + 1;
    f.companies[j.company] = (f.companies[j.company] ?? 0) + 1;
    const ats = ctx.companyAts.get(j.company);
    if (ats) f.ats[ats] = (f.ats[ats] ?? 0) + 1;
    f.categories[classifyJob(j)] = (f.categories[classifyJob(j)] ?? 0) + 1;
    f.workMode[inferWorkMode(j)] = (f.workMode[inferWorkMode(j)] ?? 0) + 1;
    f.employmentType[inferEmploymentType(j)] = (f.employmentType[inferEmploymentType(j)] ?? 0) + 1;
  }
  return f;
}

export function jobSkillMatchCount(job: Job): number {
  return job.match;
}

export { jobSkillText };
