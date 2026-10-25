"use client";

import * as React from "react";
import { fetchJobs, fetchConfig, fetchManifest } from "@/lib/api";
import type { AppConfig, JobsData, Job, Manifest } from "@/lib/types";

interface DataState {
  jobsData: JobsData | null;
  jobs: Job[];
  config: AppConfig | null;
  manifest: Manifest | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Module-level promise cache so multiple components share one fetch per mount cycle.
let promise: Promise<[JobsData, AppConfig | null, Manifest]> | null = null;

function loadData(): Promise<[JobsData, AppConfig | null, Manifest]> {
  if (promise) return promise;
  const p = (async (): Promise<[JobsData, AppConfig | null, Manifest]> => {
    const [jobsR, configR, manifestR] = await Promise.allSettled([
      fetchJobs(),
      fetchConfig(),
      fetchManifest(),
    ]);
    if (jobsR.status !== "fulfilled") throw new Error("Could not load jobs data");
    const jobs = jobsR.value;
    const config = configR.status === "fulfilled" ? configR.value : null;
    const manifest: Manifest =
      manifestR.status === "fulfilled"
        ? manifestR.value
        : { updated: null, count: 0, jdCount: 0, generatedAt: "" };
    return [jobs, config, manifest];
  })();
  // Dedupe guard: clear once settled so the next mount refetches fresh data.
  promise = p.finally(() => {
    promise = null;
  });
  return p;
}

export function useData(): DataState {
  const [state, setState] = React.useState<Omit<DataState, "refresh">>({
    jobsData: null,
    jobs: [],
    config: null,
    manifest: null,
    loading: true,
    error: null,
  });

  const load = React.useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    loadData()
      .then(([jobsData, config, manifest]) =>
        setState({ jobsData, jobs: jobsData.jobs, config, manifest, loading: false, error: null }),
      )
      .catch((err: unknown) =>
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : "Unknown error" })),
      );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
