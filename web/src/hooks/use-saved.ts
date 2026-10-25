"use client";

import { useSyncExternalStore } from "react";
import { savedStore } from "@/lib/saved-store";
import type { SavedJob } from "@/lib/storage";

export function useSavedJobs(): Record<string, SavedJob> {
  return useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getSnapshot);
}

export function useIsSaved(url: string): boolean {
  const saved = useSavedJobs();
  return !!saved[url];
}
