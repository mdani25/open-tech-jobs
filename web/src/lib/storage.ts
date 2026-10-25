// Browser storage abstraction for saved jobs, application tracking, saved-search
// presets, and user settings. Uses localStorage with an in-memory fallback (private
// mode / SSR). The Store interface is designed so an account-backed backend can be
// dropped in later without touching call sites.
//
// IMPORTANT: data is local to THIS browser only; it does not sync across devices.

import type { FilterState } from "./types";
import { BUILTIN_PRESETS, type Preset } from "./config-defaults";

const VERSION = 1;
const K = {
  saved: `otj_saved_v${VERSION}`,
  presets: `otj_presets_v${VERSION}`,
  settings: `otj_settings_v${VERSION}`,
  activePreset: `otj_active_preset_v${VERSION}`,
};

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "shortlisted"
  | "rejected"
  | "interview";

export interface SavedJob {
  url: string; // matches Job.url (stable id)
  title: string;
  company: string;
  location: string;
  jdFile?: string; // "<sha1[:10]>.md" so detail links work even if the job leaves the dataset
  savedAt: string; // ISO
  status: ApplicationStatus;
  appliedAt?: string | null; // ISO
  notes?: string;
}

export type ThemePref = "light" | "dark" | "system";

export interface UserSettings {
  defaultLocation: string | null;
  maxExperience: number;
  experienceBuckets: string[];
  defaultDateWindow: number | null;
  categories: string[];
  workMode: string[];
  employmentType: string[];
  skills: string[];
  skillMode: FilterState["skillMode"];
  skillThreshold: number;
  incTitle: string[];
  excTitle: string[];
  incDesc: string[];
  excDesc: string[];
  companies: string[];
  ats: string[];
  sort: FilterState["sort"];
  pageSize: number;
  theme: ThemePref;
  activePresetId: string | null;
}

export const DEFAULT_SETTINGS: UserSettings = {
  defaultLocation: null,
  maxExperience: 3,
  experienceBuckets: [],
  defaultDateWindow: 7,
  categories: [],
  workMode: [],
  employmentType: [],
  skills: [],
  skillMode: "any",
  skillThreshold: 2,
  incTitle: [],
  excTitle: [],
  incDesc: [],
  excDesc: [],
  companies: [],
  ats: [],
  sort: "newest",
  pageSize: 25,
  theme: "system",
  activePresetId: null,
};

interface Store {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function memoryStore(): Store {
  const mem = new Map<string, string>();
  return {
    get: (k) => mem.get(k) ?? null,
    set: (k, v) => void mem.set(k, v),
    remove: (k) => void mem.delete(k),
  };
}

function realStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    const test = "__otj_test__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return {
      get: (k) => window.localStorage.getItem(k),
      set: (k, v) => window.localStorage.setItem(k, v),
      remove: (k) => window.localStorage.removeItem(k),
    };
  } catch {
    return null;
  }
}

let store: Store | null = null;
function getStore(): Store {
  if (!store) store = realStore() ?? memoryStore();
  return store;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = getStore().get(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    getStore().set(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

// ---------- Saved jobs / applications ----------

export function getSavedJobs(): Record<string, SavedJob> {
  return readJSON<Record<string, SavedJob>>(K.saved, {});
}

export function getSavedJob(url: string): SavedJob | null {
  return getSavedJobs()[url] ?? null;
}

export function isSaved(url: string): boolean {
  return !!getSavedJobs()[url];
}

export function saveJob(job: {
  url: string;
  title: string;
  company: string;
  location: string;
  jdFile?: string;
}): SavedJob {
  const all = getSavedJobs();
  const existing = all[job.url];
  const next: SavedJob = existing ?? {
    url: job.url,
    title: job.title,
    company: job.company,
    location: job.location,
    jdFile: job.jdFile,
    savedAt: new Date().toISOString(),
    status: "saved",
  };
  all[job.url] = next;
  writeJSON(K.saved, all);
  return next;
}

export function unsaveJob(url: string): void {
  const all = getSavedJobs();
  delete all[url];
  writeJSON(K.saved, all);
}

export function setJobStatus(url: string, status: ApplicationStatus): void {
  const all = getSavedJobs();
  const j = all[url];
  if (!j) return;
  j.status = status;
  if (status === "applied" && !j.appliedAt) j.appliedAt = new Date().toISOString();
  writeJSON(K.saved, all);
}

export function setJobNotes(url: string, notes: string): void {
  const all = getSavedJobs();
  const j = all[url];
  if (!j) return;
  j.notes = notes;
  writeJSON(K.saved, all);
}

export function setAppliedDate(url: string, iso: string | null): void {
  const all = getSavedJobs();
  const j = all[url];
  if (!j) return;
  j.appliedAt = iso;
  writeJSON(K.saved, all);
}

export function removeSavedJob(url: string): void {
  unsaveJob(url);
}

export function savedCount(): number {
  return Object.keys(getSavedJobs()).length;
}

export function appliedCount(): number {
  return Object.values(getSavedJobs()).filter((j) => j.status === "applied" || j.appliedAt).length;
}

/** Export saved jobs to a CSV string (returns the CSV text). */
export function exportSavedJobsCsv(): string {
  const rows = Object.values(getSavedJobs());
  const header = ["Title", "Company", "Location", "Status", "SavedAt", "AppliedAt", "Notes", "URL"];
  const esc = (v: string | undefined | null) => {
    const s = (v ?? "").replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.title, r.company, r.location, r.status, r.savedAt, r.appliedAt ?? "", r.notes ?? "", r.url]
        .map(esc)
        .join(","),
    );
  }
  return lines.join("\n");
}

// ---------- Presets ----------

export function getUserPresets(): Preset[] {
  return readJSON<Preset[]>(K.presets, []);
}

export function getAllPresets(): Preset[] {
  return [...BUILTIN_PRESETS, ...getUserPresets()];
}

export function saveUserPreset(preset: Preset): void {
  const all = getUserPresets().filter((p) => p.id !== preset.id);
  all.push(preset);
  writeJSON(K.presets, all);
}

export function deleteUserPreset(id: string): void {
  writeJSON(
    K.presets,
    getUserPresets().filter((p) => p.id !== id),
  );
}

export function getActivePresetId(): string | null {
  return readJSON<string | null>(K.activePreset, null);
}

export function setActivePresetId(id: string | null): void {
  writeJSON(K.activePreset, id);
}

// ---------- Settings ----------

export function getSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS, ...readJSON<Partial<UserSettings>>(K.settings, {}) };
}

export function saveSettings(patch: Partial<UserSettings>): UserSettings {
  const next = { ...getSettings(), ...patch };
  writeJSON(K.settings, next);
  return next;
}

export function resetSettings(): UserSettings {
  writeJSON(K.settings, DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
