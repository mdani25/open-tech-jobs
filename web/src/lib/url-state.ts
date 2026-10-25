// Shareable URL <-> FilterState serialization. Only non-default / set fields are
// written to the query string so links stay clean; parsing merges onto defaults.
// All values are URL-encoded; arrays are joined with "," (no dataset value uses
// a literal comma).

import type { FilterState } from "./types";
import { defaultFilterState } from "./config-defaults";

type Params = Record<string, string | undefined>;

function setArr(p: Params, key: string, arr: string[]) {
  if (arr.length) p[key] = arr.map(encodeURIComponent).join(",");
}
function setVal(p: Params, key: string, val: string | number | null, omit?: string | number | null) {
  if (val !== null && val !== undefined && val !== omit) p[key] = String(val);
}

export function filterToParams(filter: FilterState): URLSearchParams {
  const p: Params = {};
  const d = defaultFilterState(filter.dateWindow ?? 7, filter.maxExperience ?? 3);
  if (filter.q) p.q = filter.q;
  setArr(p, "loc", filter.locations);
  setArr(p, "exp", filter.experience);
  setVal(p, "maxexp", filter.maxExperience, d.maxExperience);
  setArr(p, "cat", filter.categories);
  setArr(p, "wm", filter.workMode);
  setArr(p, "et", filter.employmentType);
  setArr(p, "co", filter.companies);
  setArr(p, "ats", filter.ats);
  setArr(p, "sk", filter.skills);
  setVal(p, "sm", filter.skillMode, d.skillMode);
  setVal(p, "skt", filter.skillThreshold, d.skillThreshold);
  setArr(p, "it", filter.incTitle);
  setArr(p, "xt", filter.excTitle);
  setArr(p, "id", filter.incDesc);
  setArr(p, "xd", filter.excDesc);
  setVal(p, "dw", filter.dateWindow, d.dateWindow);
  setVal(p, "from", filter.customFrom);
  setVal(p, "sort", filter.sort, d.sort);
  setVal(p, "p", filter.page, 1);
  setVal(p, "ps", filter.pageSize, d.pageSize);

  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  return sp;
}

function parseArr(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => decodeURIComponent(s).trim())
    .filter(Boolean);
}

function num(raw: string | undefined | null, fallback: number | null): number | null {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function paramsToFilter(
  search: string | URLSearchParams,
  defaultDays: number = 7,
  maxYears: number = 3,
): FilterState {
  const sp = typeof search === "string" ? new URLSearchParams(search) : search;
  const base = defaultFilterState(defaultDays, maxYears);
  return {
    ...base,
    q: sp.get("q") ?? "",
    locations: parseArr(sp.get("loc")),
    experience: parseArr(sp.get("exp")),
    maxExperience: num(sp.get("maxexp"), base.maxExperience),
    categories: parseArr(sp.get("cat")) as FilterState["categories"],
    workMode: parseArr(sp.get("wm")) as FilterState["workMode"],
    employmentType: parseArr(sp.get("et")) as FilterState["employmentType"],
    companies: parseArr(sp.get("co")),
    ats: parseArr(sp.get("ats")) as FilterState["ats"],
    skills: parseArr(sp.get("sk")),
    skillMode: (sp.get("sm") as FilterState["skillMode"]) || base.skillMode,
    skillThreshold: num(sp.get("skt"), base.skillThreshold) as number,
    incTitle: parseArr(sp.get("it")),
    excTitle: parseArr(sp.get("xt")),
    incDesc: parseArr(sp.get("id")),
    excDesc: parseArr(sp.get("xd")),
    dateWindow: num(sp.get("dw"), base.dateWindow),
    customFrom: sp.get("from") ?? null,
    sort: (sp.get("sort") as FilterState["sort"]) || base.sort,
    page: Math.max(1, num(sp.get("p"), 1) as number),
    pageSize: num(sp.get("ps"), base.pageSize) as number,
  };
}

/** Count of "active" filters (non-default fields, excluding pagination/sort). */
export function activeFilterCount(filter: FilterState): number {
  let n = 0;
  if (filter.q.trim()) n++;
  n += filter.locations.length;
  n += filter.experience.length;
  if (filter.maxExperience !== null && filter.maxExperience !== 3) n++;
  n += filter.categories.length;
  n += filter.workMode.length;
  n += filter.employmentType.length;
  n += filter.companies.length;
  n += filter.ats.length;
  n += filter.skills.length;
  n += filter.incTitle.length;
  n += filter.excTitle.length;
  n += filter.incDesc.length;
  n += filter.excDesc.length;
  if (filter.dateWindow !== null && filter.dateWindow !== 7) n++;
  if (filter.customFrom) n++;
  return n;
}
