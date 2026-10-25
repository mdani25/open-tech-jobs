// Types model the real published data from the Python collector
// (see scripts/update_jobs.py). Do not invent fields the collector doesn't emit.

export interface Job {
  title: string;
  location: string;
  url: string; // unique id + direct apply link
  posted: string; // ISO date: company posting date when posted_exact, else first_seen
  company: string;
  years: number | null; // parsed minimum years required (nullable = not stated)
  matched: string[]; // resume skills the collector found (evidence-backed)
  match: number; // count of matched resume skills
  first_seen: string; // ISO date the tracker first saw the job
  posted_exact: boolean; // true = real company date; false = first-seen (shown with *)
  jd_file: string; // "<sha1[:10]>.md" -> file in jds/ and public/data/jds/
  summary: string; // 300-char excerpt (full text lives in the JD file)
}

export interface JobsData {
  updated: string;
  count: number;
  jobs: Job[];
}

export interface Manifest {
  updated: string | null;
  count: number;
  jdCount: number;
  generatedAt: string;
}

export type AtsProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "workday"
  | "amazon";

export interface CompanyConfig {
  name: string;
  ats: AtsProvider;
  id?: string; // greenhouse / lever / ashby / smartrecruiters / amazon
  queries?: string[]; // amazon
  host?: string; // workday
  tenant?: string; // workday
  site?: string; // workday
  search?: string; // workday location preference
  // Optional admin-managed extras (preserved if present, ignored by the Python collector)
  website?: string;
  careersUrl?: string;
  logoUrl?: string;
  enabled?: boolean;
  notes?: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

export interface DirectLink {
  name: string;
  url: string;
}

export interface TelegramConfig {
  min_match: number;
  max_per_run: number;
  jd_chars: number;
  max_age_days: number;
}

export interface AppConfig {
  profile: string;
  locations: string[];
  max_years_required: number;
  keywords_include: string[];
  keywords_exclude: string[];
  resume_skills: string[];
  jd_max_chars: number;
  telegram: TelegramConfig;
  windows: number[];
  default_days: number;
  max_rows_per_window: number;
  experience_years: number;
  linkedin_levels: string;
  search_keywords: string[];
  companies: CompanyConfig[];
  direct_links: DirectLink[];
}

export type JobCategory =
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "ai-ml"
  | "data-engineering"
  | "data-analytics"
  | "cloud-devops"
  | "cybersecurity"
  | "qa-testing"
  | "database"
  | "support"
  | "it-ops"
  | "software-dev"
  | "other";

export type WorkMode = "remote" | "hybrid" | "onsite" | "not-specified";
export type EmploymentType =
  | "full-time"
  | "part-time"
  | "internship"
  | "contract"
  | "temporary"
  | "graduate-trainee"
  | "not-specified";

export type SortKey =
  | "newest"
  | "oldest"
  | "best-match"
  | "company-az"
  | "company-za"
  | "lowest-experience"
  | "relevance";

export type SkillMode = "any" | "all" | "at-least" | "exclude";

export interface FilterState {
  q: string;
  locations: string[]; // normalized city labels
  experience: string[]; // experience bucket keys
  maxExperience: number | null; // global cap (years)
  categories: JobCategory[];
  workMode: WorkMode[]; // empty = any
  employmentType: EmploymentType[];
  companies: string[]; // company names
  ats: AtsProvider[];
  skills: string[];
  skillMode: SkillMode;
  skillThreshold: number;
  incTitle: string[]; // include job-title keywords (OR)
  excTitle: string[]; // exclude job-title keywords (any present drops)
  incDesc: string[]; // include description keywords (OR, matches summary)
  excDesc: string[]; // exclude description keywords (any present drops)
  dateWindow: number | null; // days; null = all
  customFrom: string | null; // ISO date for custom window start (inclusive)
  sort: SortKey;
  page: number;
  pageSize: number;
}
