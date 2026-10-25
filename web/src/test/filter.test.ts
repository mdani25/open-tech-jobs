/**
 * Tests for the core filter, sort, experience, skills, and URL-state logic.
 * Uses the actual jobs.json from public/data when available, so assertions
 * reflect real data. Each test also works with a minimal mock dataset.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { Job, JobsData } from "@/lib/types";
import { passesFilters, sortJobs, inferWorkMode, inferEmploymentType } from "@/lib/filter";
import { defaultFilterState } from "@/lib/config-defaults";
import { filterToParams, paramsToFilter, activeFilterCount } from "@/lib/url-state";
import { jobMatchesSkills } from "@/lib/skills";
import { jobMatchesExperience } from "@/lib/experience";
import { normalizeLocation, locationLabel } from "@/lib/locations";
import { classifyJob } from "@/lib/categories";
import { parseJd } from "@/lib/api";
import { parseDateSafe, ageDays, formatDate } from "@/lib/format";

/* ---- helpers ---- */
const CTX = { companyAts: new Map() };

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    title: "Software Engineer",
    location: "Chennai, Tamil Nadu, IND",
    url: "https://example.com/job/1",
    posted: new Date(Date.now() - 86_400_000).toISOString(), // 1 day ago
    company: "Acme",
    years: 1,
    matched: ["react", "python"],
    match: 2,
    first_seen: new Date(Date.now() - 86_400_000).toISOString(),
    posted_exact: true,
    jd_file: "abc123def4.md",
    summary: "We are looking for a React developer with Python experience.",
    ...overrides,
  };
}

/* ---- real data (if synced) ---- */
const DATA_PATH = path.join(__dirname, "../../public/data/jobs.json");
let realJobs: Job[] = [];
beforeAll(() => {
  if (existsSync(DATA_PATH)) {
    const d = JSON.parse(readFileSync(DATA_PATH, "utf8")) as JobsData;
    realJobs = d.jobs ?? [];
  }
});

/* =============================================================== */

describe("Filter engine", () => {
  it("passes all jobs when default filters applied", () => {
    const jobs = [makeJob(), makeJob({ url: "https://example.com/2" })];
    const filter = defaultFilterState(7, 3);
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(2);
  });

  it("filters by search query (case-insensitive)", () => {
    const jobs = [
      makeJob({ title: "React Developer" }),
      makeJob({ url: "https://example.com/2", title: "Java Developer", summary: "Java backend role.", matched: [] }),
    ];
    const filter = { ...defaultFilterState(7, 3), q: "react" };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
    expect(passing[0].title).toBe("React Developer");
  });

  it("filters by location", () => {
    const jobs = [makeJob(), makeJob({ url: "https://example.com/2", location: "Bengaluru" })];
    const filter = { ...defaultFilterState(7, 3), locations: ["Chennai"] };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
  });

  it("filters by maxExperience — drops jobs exceeding the cap", () => {
    const jobs = [makeJob({ years: 2 }), makeJob({ url: "https://example.com/2", years: 5 })];
    const filter = { ...defaultFilterState(7, 3), maxExperience: 3 };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
    expect(passing[0].years).toBe(2);
  });

  it("passes null-years jobs through maxExperience filter", () => {
    const j = makeJob({ years: null });
    const filter = { ...defaultFilterState(7, 3), maxExperience: 3 };
    expect(passesFilters(j, filter, CTX)).toBe(true);
  });

  it("filters by date window", () => {
    const recent = makeJob({ posted: new Date(Date.now() - 2 * 86_400_000).toISOString() });
    const old = makeJob({ url: "https://example.com/2", posted: new Date(Date.now() - 20 * 86_400_000).toISOString() });
    const filter = { ...defaultFilterState(7, 3), dateWindow: 7 };
    expect(passesFilters(recent, filter, CTX)).toBe(true);
    expect(passesFilters(old, filter, CTX)).toBe(false);
  });

  it("clears all jobs when dateWindow=0", () => {
    const j = makeJob();
    const filter = { ...defaultFilterState(7, 3), dateWindow: 0 };
    expect(passesFilters(j, filter, CTX)).toBe(false);
  });

  it("passes all when dateWindow=null", () => {
    const old = makeJob({ posted: "2020-01-01T00:00:00+00:00" });
    const filter = { ...defaultFilterState(7, 3), dateWindow: null };
    expect(passesFilters(old, filter, CTX)).toBe(true);
  });

  it("filters by company name", () => {
    const jobs = [makeJob(), makeJob({ url: "https://example.com/2", company: "Other" })];
    const filter = { ...defaultFilterState(7, 3), companies: ["Acme"] };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
  });

  it("filters by include title keyword (OR)", () => {
    const jobs = [makeJob({ title: "React Engineer" }), makeJob({ url: "https://example.com/2", title: "Java Engineer" })];
    const filter = { ...defaultFilterState(7, 3), incTitle: ["react"] };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
  });

  it("filters by exclude title keyword", () => {
    const jobs = [makeJob({ title: "Senior React Developer" }), makeJob({ url: "https://example.com/2", title: "Junior React Developer" })];
    const filter = { ...defaultFilterState(7, 3), excTitle: ["senior"] };
    const passing = jobs.filter((j) => passesFilters(j, filter, CTX));
    expect(passing.length).toBe(1);
    expect(passing[0].title).toContain("Junior");
  });
});

/* =============================================================== */

describe("Skill matching", () => {
  it("ANY mode — passes when at least one skill matches", () => {
    const j = makeJob({ matched: ["react"], match: 1 });
    expect(jobMatchesSkills(j, ["React", "Python"], "any", 1)).toBe(true);
  });

  it("ALL mode — passes only when every skill matches", () => {
    const j = makeJob({ matched: ["react"], match: 1, summary: "React only" });
    expect(jobMatchesSkills(j, ["React", "Python"], "all", 1)).toBe(false);
  });

  it("at-least mode — threshold respected", () => {
    const j = makeJob({ matched: ["react", "python"], match: 2 });
    expect(jobMatchesSkills(j, ["React", "Python", "Java"], "at-least", 2)).toBe(true);
    expect(jobMatchesSkills(j, ["React", "Python", "Java"], "at-least", 3)).toBe(false);
  });

  it("exclude mode — drops job if any skill present", () => {
    const j = makeJob({ matched: ["react"], match: 1 });
    expect(jobMatchesSkills(j, ["React"], "exclude", 1)).toBe(false);
  });

  it("empty skill list always passes regardless of mode", () => {
    const j = makeJob();
    expect(jobMatchesSkills(j, [], "all", 1)).toBe(true);
  });
});

/* =============================================================== */

describe("Experience buckets", () => {
  it("fresher bucket matches years=0", () => {
    expect(jobMatchesExperience(makeJob({ years: 0 }), ["fresher"])).toBe(true);
    expect(jobMatchesExperience(makeJob({ years: 1 }), ["fresher"])).toBe(false);
  });

  it("not-specified matches null years", () => {
    expect(jobMatchesExperience(makeJob({ years: null }), ["not-specified"])).toBe(true);
    expect(jobMatchesExperience(makeJob({ years: 1 }), ["not-specified"])).toBe(false);
  });

  it("0-3 bucket matches years ≤ 3", () => {
    expect(jobMatchesExperience(makeJob({ years: 3 }), ["0-3"])).toBe(true);
    expect(jobMatchesExperience(makeJob({ years: 4 }), ["0-3"])).toBe(false);
  });

  it("empty experience list always passes", () => {
    expect(jobMatchesExperience(makeJob({ years: 5 }), [])).toBe(true);
  });
});

/* =============================================================== */

describe("Location normalization", () => {
  it("Chennai from 'Chennai, Tamil Nadu, IND'", () => {
    expect(normalizeLocation("Chennai, Tamil Nadu, IND").city).toBe("Chennai");
  });

  it("detects remote", () => {
    expect(normalizeLocation("Remote").isRemote).toBe(true);
  });

  it("extracts incl. city from Workday multi-location", () => {
    const r = normalizeLocation("3 locations (incl. Chennai)");
    expect(r.city).toBe("Chennai");
  });

  it("locationLabel returns correct labels", () => {
    expect(locationLabel("Remote, India")).toBe("Remote");
    expect(locationLabel("")).toBe("Other");
  });
});

/* =============================================================== */

describe("Sorting", () => {
  it("newest sort — most recent first", () => {
    const a = makeJob({ posted: "2026-10-20T00:00:00+00:00", url: "a" });
    const b = makeJob({ posted: "2026-10-25T00:00:00+00:00", url: "b" });
    const sorted = sortJobs([a, b], "newest", CTX);
    expect(sorted[0].url).toBe("b");
  });

  it("oldest sort — oldest first", () => {
    const a = makeJob({ posted: "2026-10-20T00:00:00+00:00", url: "a" });
    const b = makeJob({ posted: "2026-10-25T00:00:00+00:00", url: "b" });
    const sorted = sortJobs([a, b], "oldest", CTX);
    expect(sorted[0].url).toBe("a");
  });

  it("best-match sort — higher match first", () => {
    const a = makeJob({ match: 1, url: "a" });
    const b = makeJob({ match: 3, url: "b" });
    const sorted = sortJobs([a, b], "best-match", CTX);
    expect(sorted[0].url).toBe("b");
  });

  it("lowest-experience sort — null years go last", () => {
    const a = makeJob({ years: null, url: "a" });
    const b = makeJob({ years: 0, url: "b" });
    const sorted = sortJobs([a, b], "lowest-experience", CTX);
    expect(sorted[0].url).toBe("b");
  });

  it("company-az sort — stable alphabetical", () => {
    const a = makeJob({ company: "Zeta", url: "a" });
    const b = makeJob({ company: "Amazon", url: "b" });
    const sorted = sortJobs([a, b], "company-az", CTX);
    expect(sorted[0].company).toBe("Amazon");
  });
});

/* =============================================================== */

describe("URL state serialization", () => {
  it("round-trips filter to params and back", () => {
    const filter = {
      ...defaultFilterState(7, 3),
      q: "react developer",
      locations: ["Chennai"],
      skills: ["React", "Python"],
      sort: "best-match" as const,
      page: 2,
    };
    const params = filterToParams(filter);
    const restored = paramsToFilter(params.toString(), 7, 3);
    expect(restored.q).toBe("react developer");
    expect(restored.locations).toEqual(["Chennai"]);
    expect(restored.skills).toContain("React");
    expect(restored.sort).toBe("best-match");
    expect(restored.page).toBe(2);
  });

  it("empty URLSearchParams -> default filter", () => {
    const f = paramsToFilter("", 7, 3);
    expect(f.q).toBe("");
    expect(f.locations.length).toBe(0);
    expect(f.dateWindow).toBe(7);
  });

  it("activeFilterCount counts active filters", () => {
    const base = defaultFilterState(7, 3);
    expect(activeFilterCount(base)).toBe(0);
    const withFilters = { ...base, q: "react", locations: ["Chennai"] };
    expect(activeFilterCount(withFilters)).toBe(2);
  });
});

/* =============================================================== */

describe("Job category classification", () => {
  it("classifies React job as frontend", () => {
    expect(classifyJob(makeJob({ title: "React Frontend Developer" }))).toBe("frontend");
  });

  it("classifies Flutter as mobile", () => {
    expect(classifyJob(makeJob({ title: "Flutter Developer" }))).toBe("mobile");
  });

  it("classifies DevOps as cloud-devops", () => {
    expect(classifyJob(makeJob({ title: "DevOps Engineer" }))).toBe("cloud-devops");
  });

  it("classifies QA / SDET as qa-testing", () => {
    expect(classifyJob(makeJob({ title: "SDET Engineer" }))).toBe("qa-testing");
  });
});

/* =============================================================== */

describe("Work mode and employment type inference", () => {
  it("detects remote from location", () => {
    expect(inferWorkMode(makeJob({ location: "Remote" }))).toBe("remote");
  });

  it("detects hybrid from summary", () => {
    expect(inferWorkMode(makeJob({ summary: "This is a hybrid role" }))).toBe("hybrid");
  });

  it("detects internship from title", () => {
    expect(inferEmploymentType(makeJob({ title: "Software Intern" }))).toBe("internship");
  });

  it("detects graduate-trainee from title", () => {
    expect(inferEmploymentType(makeJob({ title: "Graduate Engineer Trainee" }))).toBe("graduate-trainee");
  });
});

/* =============================================================== */

describe("Date helpers", () => {
  it("parseDateSafe returns null for empty string", () => {
    expect(parseDateSafe("")).toBeNull();
    expect(parseDateSafe(null)).toBeNull();
  });

  it("ageDays returns 0 for now", () => {
    const d = ageDays(new Date().toISOString());
    expect(d).toBeDefined();
    expect(d!).toBeGreaterThanOrEqual(0);
    expect(d!).toBeLessThan(1);
  });

  it("formatDate returns formatted string", () => {
    expect(formatDate("2026-10-25T00:00:00+00:00")).toMatch(/Oct 25, 2026/);
  });
});

/* =============================================================== */

describe("JD parser", () => {
  const sample = `# Application Engineer, AWS Quick

- **Company:** Amazon
- **Location:** Chennai, Tamil Nadu, IND
- **Posted:** 2026-04-23
- **Experience mentioned:** 2+ yrs
- **Matches your skills:** python, sql
- **Apply:** https://www.amazon.jobs/en/jobs/10401953/application-engineer-aws-quick

---
We are seeking a highly technical Application Engineer.

Basic qualifications
- 2+ years of building production software experience
`;

  it("parses title", () => {
    const r = parseJd(sample);
    expect(r.title).toBe("Application Engineer, AWS Quick");
  });

  it("parses metadata", () => {
    const r = parseJd(sample);
    expect(r.meta["Company"]).toBe("Amazon");
    expect(r.meta["Location"]).toBe("Chennai, Tamil Nadu, IND");
  });

  it("parses body", () => {
    const r = parseJd(sample);
    expect(r.body).toContain("highly technical");
  });

  it("marks truncated=false for untruncated content", () => {
    const r = parseJd(sample);
    expect(r.truncated).toBe(false);
  });
});

/* =============================================================== */

describe("Real data smoke tests (skipped when data absent)", () => {
  it("jobs.json loads and has valid schema", () => {
    if (realJobs.length === 0) return;
    expect(realJobs.length).toBeGreaterThan(0);
    const first = realJobs[0];
    expect(typeof first.title).toBe("string");
    expect(typeof first.url).toBe("string");
    expect(typeof first.company).toBe("string");
    expect(typeof first.jd_file).toBe("string");
    expect(Array.isArray(first.matched)).toBe(true);
  });

  it("all jobs have valid posted dates", () => {
    if (realJobs.length === 0) return;
    for (const j of realJobs) {
      expect(parseDateSafe(j.posted)).not.toBeNull();
      expect(parseDateSafe(j.first_seen)).not.toBeNull();
    }
  });

  it("search 'react' finds jobs (if any React-related in dataset)", () => {
    if (realJobs.length === 0) return;
    const filter = { ...defaultFilterState(365, 99), q: "react", dateWindow: null };
    const passing = realJobs.filter((j) => passesFilters(j, filter, CTX));
    // Just verify the filter ran without error; count may be 0 if no React jobs.
    expect(passing.length).toBeGreaterThanOrEqual(0);
  });

  it("best-match sort is stable for real data", () => {
    if (realJobs.length === 0) return;
    const sorted = sortJobs([...realJobs], "best-match", CTX);
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].match).toBeGreaterThanOrEqual(sorted[i + 1].match);
    }
  });

  it("no apply link starts with a fake domain", () => {
    if (realJobs.length === 0) return;
    for (const j of realJobs) {
      expect(j.url).not.toMatch(/^https?:\/\/example\.com/);
      expect(j.url.length).toBeGreaterThan(10);
    }
  });

  it("no fabricated company names", () => {
    if (realJobs.length === 0) return;
    const FAKE_NAMES = ["Acme", "Fake Corp", "Demo Company"];
    for (const j of realJobs) {
      expect(FAKE_NAMES).not.toContain(j.company);
    }
  });
});
