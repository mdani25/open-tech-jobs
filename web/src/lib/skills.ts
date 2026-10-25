// Skill catalog and matching.
//
// The collector precomputes `job.matched` against `resume_skills` — these are the
// evidence-backed "matches your skills" stars and the official match score. For the
// skill FILTER we additionally search the skill token in the job's title and summary
// (the text available in jobs.json without loading every JD). We never inflate the
// match score; skill filtering is a separate text-based signal.

import type { Job, SkillMode } from "./types";

export interface SkillDef {
  label: string; // display name
  tokens: string[]; // lowercase match tokens (whole-word)
}

// Merges the spec's suggested skill list with the tracker's resume_skills.
export const SKILL_CATALOG: SkillDef[] = [
  { label: "React", tokens: ["react", "reactjs", "react.js"] },
  { label: "React Native", tokens: ["react native", "reactnative"] },
  { label: "JavaScript", tokens: ["javascript", "js"] },
  { label: "TypeScript", tokens: ["typescript", "ts"] },
  { label: "Python", tokens: ["python"] },
  { label: "Java", tokens: ["java"] },
  { label: "C#", tokens: ["c#", "c sharp", "csharp"] },
  { label: ".NET", tokens: [".net", "dotnet", "asp.net", "asp net"] },
  { label: "ASP.NET Core", tokens: ["asp.net core", "asp net core"] },
  { label: "Flutter", tokens: ["flutter", "dart"] },
  { label: "Android", tokens: ["android", "kotlin"] },
  { label: "Full Stack", tokens: ["full stack", "full-stack", "fullstack", "mern", "mean"] },
  { label: "SQL", tokens: ["sql"] },
  { label: "SQL Server", tokens: ["sql server", "sqlserver", "t-sql", "tsql"] },
  { label: "MySQL", tokens: ["mysql"] },
  { label: "MongoDB", tokens: ["mongo", "mongodb"] },
  { label: "PostgreSQL", tokens: ["postgres", "postgresql"] },
  { label: "REST APIs", tokens: ["rest api", "rest apis", "restful", "api"] },
  { label: "Entity Framework", tokens: ["entity framework", "ef core"] },
  { label: "TensorFlow", tokens: ["tensorflow"] },
  { label: "OpenCV", tokens: ["opencv"] },
  { label: "AI / ML", tokens: ["machine learning", " ml ", "ml/", "ai engineer", "artificial intelligence"] },
  { label: "Generative AI", tokens: ["generative ai", "llm", "gpt", "large language model"] },
  { label: "AWS", tokens: ["aws", "amazon web services"] },
  { label: "Azure", tokens: ["azure"] },
  { label: "Docker", tokens: ["docker", "container"] },
  { label: "Kubernetes", tokens: ["kubernetes", "k8s"] },
  { label: "Git", tokens: ["git", "github"] },
  { label: "Selenium", tokens: ["selenium"] },
  { label: "Playwright", tokens: ["playwright"] },
];

export function allSkillLabels(): string[] {
  return SKILL_CATALOG.map((s) => s.label);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word, case-insensitive test for any of a skill's tokens within text. */
function textHasSkill(text: string, tokens: string[]): boolean {
  return tokens.some((tok) => {
    const re = new RegExp(`(?<![a-z0-9])${escapeRe(tok)}(?![a-z0-9])`, "i");
    return re.test(text);
  });
}

/** Searchable text for a job used by skill matching (title + summary + matched). */
export function jobSkillText(job: Job): string {
  return `${job.title} ${job.summary || ""} ${(job.matched || []).join(" ")}`.toLowerCase();
}

/** Whether a single skill label is present for a job (matched or in title/summary). */
export function jobHasSkill(job: Job, label: string): boolean {
  const def = SKILL_CATALOG.find((s) => s.label === label);
  if (!def) return false;
  // matched[] is the collector's evidence-backed list
  const matchedLower = (job.matched || []).map((m) => m.toLowerCase());
  if (def.tokens.some((t) => matchedLower.some((m) => m.includes(t) || t.includes(m)))) return true;
  return textHasSkill(jobSkillText(job), def.tokens);
}

/** Count how many of the selected skills a job satisfies. */
export function jobSkillCount(job: Job, labels: string[]): number {
  return labels.filter((l) => jobHasSkill(job, l)).length;
}

export function jobMatchesSkills(
  job: Job,
  labels: string[],
  mode: SkillMode,
  threshold: number,
): boolean {
  if (labels.length === 0) return true;
  const count = jobSkillCount(job, labels);
  switch (mode) {
    case "any":
      return count >= 1;
    case "all":
      return count === labels.length;
    case "at-least":
      return count >= Math.max(1, threshold);
    case "exclude":
      return count === 0;
    default:
      return true;
  }
}
