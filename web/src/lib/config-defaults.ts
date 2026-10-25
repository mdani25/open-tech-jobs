// Default filter state + example search presets. Defaults are derived from the
// tracker's config.json (default_days, max_years_required) at runtime; the static
// fallbacks here keep types concrete before config loads.

import type { FilterState } from "./types";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function defaultFilterState(defaultDays: number = 7, maxYears: number = 3): FilterState {
  return {
    q: "",
    locations: [],
    experience: [],
    maxExperience: maxYears,
    categories: [],
    workMode: [],
    employmentType: [],
    companies: [],
    ats: [],
    skills: [],
    skillMode: "any",
    skillThreshold: 2,
    incTitle: [],
    excTitle: [],
    incDesc: [],
    excDesc: [],
    dateWindow: defaultDays,
    customFrom: null,
    sort: "newest",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  /** Partial filter state merged over the default state when applied. */
  overrides: Partial<FilterState>;
  builtIn?: boolean;
}

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: "chennai-freshers",
    name: "Chennai Freshers",
    description: "Chennai roles, 0–1 yrs, newest first",
    builtIn: true,
    overrides: {
      locations: ["Chennai"],
      experience: ["fresher", "0-1", "internship", "graduate-trainee"],
      sort: "newest",
    },
  },
  {
    id: "react-developer",
    name: "React Developer",
    description: "React / JavaScript roles, skill match",
    builtIn: true,
    overrides: {
      skills: ["React", "JavaScript"],
      skillMode: "any",
      sort: "best-match",
    },
  },
  {
    id: "dotnet-developer",
    name: ".NET Developer",
    description: ".NET / ASP.NET / C# roles",
    builtIn: true,
    overrides: {
      skills: [".NET", "ASP.NET Core", "C#"],
      skillMode: "any",
      sort: "best-match",
    },
  },
  {
    id: "flutter-developer",
    name: "Flutter Developer",
    description: "Flutter / mobile roles",
    builtIn: true,
    overrides: {
      skills: ["Flutter", "Android"],
      skillMode: "any",
      categories: ["mobile"],
      sort: "newest",
    },
  },
  {
    id: "python-developer",
    name: "Python Developer",
    description: "Python / backend roles",
    builtIn: true,
    overrides: {
      skills: ["Python"],
      skillMode: "any",
      categories: ["backend"],
      sort: "newest",
    },
  },
  {
    id: "graduate-engineer-trainee",
    name: "Graduate Engineer Trainee",
    description: "GET / trainee / fresher drives",
    builtIn: true,
    overrides: {
      experience: ["graduate-trainee", "fresher", "internship"],
      sort: "newest",
    },
  },
  {
    id: "ai-engineer",
    name: "AI Engineer",
    description: "AI / ML / data roles",
    builtIn: true,
    overrides: {
      categories: ["ai-ml", "data-engineering"],
      skills: ["AI / ML", "TensorFlow"],
      skillMode: "any",
      sort: "best-match",
    },
  },
  {
    id: "cloud-devops",
    name: "Cloud / DevOps",
    description: "AWS / Azure / Docker / K8s",
    builtIn: true,
    overrides: {
      categories: ["cloud-devops"],
      skills: ["AWS", "Azure", "Docker", "Kubernetes"],
      skillMode: "any",
      sort: "newest",
    },
  },
  {
    id: "qa-automation",
    name: "QA Automation",
    description: "QA / SDET / test automation",
    builtIn: true,
    overrides: {
      categories: ["qa-testing"],
      skills: ["Selenium", "Playwright"],
      skillMode: "any",
      sort: "newest",
    },
  },
  {
    id: "remote-entry-level",
    name: "Remote Entry-Level Jobs",
    description: "Remote, 0–3 yrs",
    builtIn: true,
    overrides: {
      workMode: ["remote"],
      experience: ["0-1", "0-2", "0-3", "fresher", "internship"],
      sort: "newest",
    },
  },
];
