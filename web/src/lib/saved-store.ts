// External store for saved jobs / applications backed by localStorage. Uses an
// in-memory cache + listeners so React components stay in sync via
// useSyncExternalStore. Mutations go through here (not storage.ts directly) so
// every component re-renders on change. Cache is a stable reference between
// mutations, satisfying useSyncExternalStore's snapshot contract.

import {
  getSavedJobs,
  saveJob,
  unsaveJob,
  setJobStatus,
  setJobNotes,
  setAppliedDate,
  removeSavedJob,
  exportSavedJobsCsv,
  type ApplicationStatus,
  type SavedJob,
} from "@/lib/storage";

type Listener = () => void;
const listeners = new Set<Listener>();

let cache: Record<string, SavedJob> | null = null;

function snapshot(): Record<string, SavedJob> {
  if (cache === null) cache = getSavedJobs();
  return cache;
}

function notify() {
  cache = getSavedJobs();
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otj-saved-change"));
  }
}

export const savedStore = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: snapshot,
  toggleSave(job: { url: string; title: string; company: string; location: string; jdFile?: string }) {
    if (getSavedJobs()[job.url]) unsaveJob(job.url);
    else saveJob(job);
    notify();
  },
  setStatus(url: string, status: ApplicationStatus) {
    setJobStatus(url, status);
    notify();
  },
  setNotes(url: string, notes: string) {
    setJobNotes(url, notes);
    notify();
  },
  setAppliedDate(url: string, iso: string | null) {
    setAppliedDate(url, iso);
    notify();
  },
  remove(url: string) {
    removeSavedJob(url);
    notify();
  },
  exportCsv(): string {
    return exportSavedJobsCsv();
  },
};
