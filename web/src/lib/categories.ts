// Job category classification. Evidence-based: a job is assigned a category from
// its title and matched skills only. Most specific categories are checked first;
// "Software Development" is a fallback for generic engineer/developer titles,
// then "Other" for anything that doesn't fit.

import type { Job, JobCategory } from "./types";

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  frontend: "Frontend Development",
  backend: "Backend Development",
  fullstack: "Full Stack Development",
  mobile: "Mobile Development",
  "ai-ml": "AI / Machine Learning",
  "data-engineering": "Data Engineering",
  "data-analytics": "Data Analytics",
  "cloud-devops": "Cloud / DevOps",
  cybersecurity: "Cybersecurity",
  "qa-testing": "QA / Testing",
  database: "Database / SQL",
  support: "Technical Support",
  "it-ops": "IT Operations",
  "software-dev": "Software Development",
  other: "Other",
};

export const CATEGORY_ORDER: JobCategory[] = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "ai-ml",
  "data-engineering",
  "data-analytics",
  "cloud-devops",
  "cybersecurity",
  "qa-testing",
  "database",
  "support",
  "it-ops",
  "software-dev",
  "other",
];

interface Rule {
  key: JobCategory;
  test: (t: string, matched: string[]) => boolean;
}

const has = (text: string, re: string) => new RegExp(re, "i").test(text);

const RULES: Rule[] = [
  {
    key: "frontend",
    test: (t) =>
      has(t, "\\b(front[- ]?end|react\\.?(js)?|reactjs|angular|vue|next\\.?js|svelte|ui engineer|css)\\b"),
  },
  {
    key: "backend",
    test: (t) =>
      has(t, "\\b(back[- ]?end|api|node\\.?js|django|flask|fastapi|spring|express|graphql|microservice)\\b"),
  },
  { key: "fullstack", test: (t) => has(t, "full[\\s-]?stack|mern|mean") },
  {
    key: "mobile",
    test: (t) => has(t, "\\b(mobile|android|ios|flutter|react native|swift|kotlin)\\b"),
  },
  {
    key: "ai-ml",
    test: (t, m) =>
      has(t, "\\b(machine learning|\\bml\\b|ai engineer|data scientist|nlp|computer vision|deep learning|llm|generative ai)\\b") ||
      m.some((s) => /(tensorflow|opencv)/.test(s)),
  },
  {
    key: "data-engineering",
    test: (t) => has(t, "\\b(data engineer|etl|data pipeline|big data|spark|airflow|databricks)\\b"),
  },
  {
    key: "data-analytics",
    test: (t) => has(t, "\\b(data analyst|analytics|business intelligence|\\bbi\\b|power bi|tableau)\\b"),
  },
  {
    key: "cloud-devops",
    test: (t) =>
      has(t, "\\b(devops|cloud|aws|azure|gcp|kubernetes|docker|terraform|sre|site reliability|infrastructure)\\b"),
  },
  {
    key: "cybersecurity",
    test: (t) => has(t, "\\b(security engineer|cyber|appsec|pentest|penetration|infosec)\\b"),
  },
  {
    key: "qa-testing",
    test: (t) => has(t, "\\b(qa|test engineer|sdet|automation engineer|quality assurance)\\b"),
  },
  {
    key: "database",
    test: (t) => has(t, "\\b(database engineer|dba|data admin|sql developer)\\b"),
  },
  {
    key: "support",
    test: (t) => has(t, "\\b(support engineer|technical support|application support|technician)\\b"),
  },
  { key: "it-ops", test: (t) => has(t, "\\b(it operations|sysadmin|systems administrator|operations engineer)\\b") },
  {
    key: "software-dev",
    test: (t) =>
      has(t, "\\b(software|engineer|developer|programmer|sde|application engineer|web developer)\\b"),
  },
];

export function classifyJob(job: Job): JobCategory {
  // Classify primarily from the title. The summary is only consulted for the
  // soft "software-dev" fallback and skill-based rules (ai-ml). This prevents
  // a generic summary ("React developer") from mis-classifying Flutter/DevOps jobs.
  const title = job.title || "";
  const summary = job.summary || "";
  const matched = job.matched || [];

  // Pass rules that should check title + summary together (e.g. ai-ml matched skills).
  const fullText = `${title} ${summary}`;

  for (const rule of RULES) {
    // The software-dev fallback uses full text; all other specific rules use title only.
    const text = rule.key === "software-dev" ? fullText : title;
    if (rule.test(text, matched)) return rule.key;
  }
  return "other";
}

export function categoryLabel(key: JobCategory): string {
  return CATEGORY_LABELS[key];
}

export function jobMatchesCategories(job: Job, keys: JobCategory[]): boolean {
  if (keys.length === 0) return true;
  return keys.includes(classifyJob(job));
}
