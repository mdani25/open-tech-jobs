/**
 * Tests for the localStorage-based saved-jobs and settings storage layer.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getSavedJobs,
  saveJob,
  unsaveJob,
  setJobStatus,
  setJobNotes,
  isSaved,
  appliedCount,
  savedCount,
  exportSavedJobsCsv,
  getSettings,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
} from "@/lib/storage";

// jsdom provides localStorage; reset it between tests via resetSettings + unsave.
beforeEach(() => {
  // Clear saved jobs
  const all = getSavedJobs();
  for (const url of Object.keys(all)) unsaveJob(url);
  resetSettings();
});

const JOB = {
  url: "https://example.com/job/42",
  title: "React Developer",
  company: "Acme",
  location: "Chennai",
  jdFile: "abc123.md",
};

describe("Saved jobs", () => {
  it("starts empty", () => {
    expect(Object.keys(getSavedJobs()).length).toBe(0);
    expect(isSaved(JOB.url)).toBe(false);
  });

  it("saves and marks as saved", () => {
    saveJob(JOB);
    expect(isSaved(JOB.url)).toBe(true);
  });

  it("unsaves correctly", () => {
    saveJob(JOB);
    unsaveJob(JOB.url);
    expect(isSaved(JOB.url)).toBe(false);
  });

  it("does not duplicate on double-save", () => {
    saveJob(JOB);
    saveJob(JOB);
    expect(Object.keys(getSavedJobs()).length).toBe(1);
  });

  it("default status is 'saved'", () => {
    saveJob(JOB);
    expect(getSavedJobs()[JOB.url].status).toBe("saved");
  });

  it("updates status", () => {
    saveJob(JOB);
    setJobStatus(JOB.url, "applied");
    expect(getSavedJobs()[JOB.url].status).toBe("applied");
  });

  it("appliedAt is set when status becomes applied", () => {
    saveJob(JOB);
    setJobStatus(JOB.url, "applied");
    expect(getSavedJobs()[JOB.url].appliedAt).toBeTruthy();
  });

  it("sets notes", () => {
    saveJob(JOB);
    setJobNotes(JOB.url, "Follow up next week");
    expect(getSavedJobs()[JOB.url].notes).toBe("Follow up next week");
  });

  it("savedCount reflects count", () => {
    expect(savedCount()).toBe(0);
    saveJob(JOB);
    expect(savedCount()).toBe(1);
  });

  it("appliedCount increments on applied status", () => {
    saveJob(JOB);
    expect(appliedCount()).toBe(0);
    setJobStatus(JOB.url, "applied");
    expect(appliedCount()).toBe(1);
  });
});

describe("CSV export", () => {
  it("exports header row", () => {
    const csv = exportSavedJobsCsv();
    expect(csv.split("\n")[0]).toContain("Title");
    expect(csv.split("\n")[0]).toContain("URL");
  });

  it("exports saved job data", () => {
    saveJob(JOB);
    const csv = exportSavedJobsCsv();
    expect(csv).toContain("React Developer");
    expect(csv).toContain(JOB.url);
  });

  it("escapes commas in values", () => {
    saveJob({ ...JOB, title: "Engineer, Senior" });
    const csv = exportSavedJobsCsv();
    expect(csv).toContain('"Engineer, Senior"');
  });
});

describe("Settings", () => {
  it("starts with defaults", () => {
    const s = getSettings();
    expect(s.maxExperience).toBe(DEFAULT_SETTINGS.maxExperience);
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it("saves and reloads settings", () => {
    saveSettings({ maxExperience: 5, theme: "light" });
    const s = getSettings();
    expect(s.maxExperience).toBe(5);
    expect(s.theme).toBe("light");
  });

  it("reset restores defaults", () => {
    saveSettings({ maxExperience: 5 });
    resetSettings();
    expect(getSettings().maxExperience).toBe(DEFAULT_SETTINGS.maxExperience);
  });
});
