// Company aggregation. Tracked companies come from config.companies (auto-fetched
// via ATS APIs); manual career-page resources come from config.direct_links. We
// keep the two clearly separate and derive official career-page URLs from board IDs.

import type { AppConfig, AtsProvider, CompanyConfig, DirectLink, Job } from "./types";
import { locationLabel } from "./locations";

export interface CompanyInfo {
  name: string;
  slug: string;
  ats?: AtsProvider;
  id?: string;
  isTracked: boolean;
  enabled: boolean;
  jobCount: number;
  locations: string[];
  latestPosted?: string; // ISO of newest job
  careersUrl?: string;
  website?: string;
  logoUrl?: string;
  search?: string; // workday location preference
}

/** Derive an official public career-page URL from the board id / provider. */
export function careersUrlFor(c: CompanyConfig): string | undefined {
  switch (c.ats) {
    case "greenhouse":
      return c.id ? `https://boards.greenhouse.io/${c.id}` : undefined;
    case "lever":
      return c.id ? `https://jobs.lever.co/${c.id}` : undefined;
    case "ashby":
      return c.id ? `https://jobs.ashbyhq.com/${c.id}` : undefined;
    case "smartrecruiters":
      return c.id ? `https://jobs.smartrecruiters.com/${c.id}` : undefined;
    case "workday":
      return c.host && c.site ? `https://${c.host}/en-US/${c.site}` : undefined;
    case "amazon":
      return "https://www.amazon.jobs";
    default:
      return undefined;
  }
}

export function slug(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function aggregateTracked(config: AppConfig | null | undefined, jobs: Job[]): CompanyInfo[] {
  if (!config) return [];
  return config.companies.map((c) => {
    const cj = jobs.filter((j) => j.company === c.name);
    const locSet = new Set<string>();
    let latest: Job | undefined;
    for (const j of cj) {
      locSet.add(locationLabel(j.location));
      if (!latest || (j.posted || "") > (latest.posted || "")) latest = j;
    }
    return {
      name: c.name,
      slug: slug(c.name),
      ats: c.ats,
      id: c.id,
      isTracked: true,
      enabled: c.enabled ?? true,
      jobCount: cj.length,
      locations: [...locSet],
      latestPosted: latest?.posted,
      careersUrl: c.careersUrl || careersUrlFor(c),
      website: c.website,
      logoUrl: c.logoUrl,
      search: c.search,
    };
  });
}

export function manualLinks(config: AppConfig | null | undefined): CompanyInfo[] {
  if (!config) return [];
  return config.direct_links.map((d: DirectLink) => ({
    name: d.name,
    slug: slug(d.name),
    isTracked: false,
    enabled: true,
    jobCount: 0,
    locations: [],
    careersUrl: d.url,
  }));
}

export function findCompanyBySlug(config: AppConfig | null | undefined, s: string): CompanyInfo | null {
  if (!config) return null;
  const all = [...aggregateTracked(config, []), ...manualLinks(config)];
  return all.find((c) => c.slug === s) ?? null;
}

export const ATS_LABEL: Record<AtsProvider, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workday: "Workday",
  amazon: "Amazon Jobs",
};
