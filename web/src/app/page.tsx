"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Star,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Compass,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useSavedJobs } from "@/hooks/use-saved";
import { StatCard } from "@/components/stat-card";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/site-config";
import { ageDays, formatDate } from "@/lib/format";
import { defaultFilterState } from "@/lib/config-defaults";
import { filterToParams } from "@/lib/url-state";
import type { FilterState } from "@/lib/types";

const CORE_SKILLS = ["React", "JavaScript", ".NET", "ASP.NET Core", "Python", "Flutter", "SQL"];

function quickLink(overrides: Partial<FilterState>, defaultDays: number, maxYears: number): string {
  const f = { ...defaultFilterState(defaultDays, maxYears), ...overrides };
  const params = filterToParams(f);
  return `/jobs?${params.toString()}`;
}

export default function DashboardPage() {
  const { jobsData, jobs, config, manifest, loading, error, refresh } = useData();
  const saved = useSavedJobs();

  const stats = React.useMemo(() => {
    const defaultDays = config?.default_days ?? 7;
    const maxYears = config?.max_years_required ?? 3;
    const total = jobs.length;
    const recentlyPosted = jobs.filter((j) => {
      const d = ageDays(j.posted);
      return d !== null && d <= defaultDays;
    }).length;
    const newToday = jobs.filter((j) => {
      const d = ageDays(j.first_seen);
      return d !== null && d <= 1;
    }).length;
    const companies = config?.companies?.length ?? 0;
    const skillMatched = jobs.filter((j) => j.match >= 1).length;
    const savedCount = Object.keys(saved).length;
    const appliedCount = Object.values(saved).filter((s) => s.status === "applied" || s.appliedAt).length;
    return { defaultDays, maxYears, total, recentlyPosted, newToday, companies, skillMatched, savedCount, appliedCount };
  }, [jobs, config, saved]);

  const recentJobs = React.useMemo(
    () => [...jobs].sort((a, b) => (b.posted || "").localeCompare(a.posted || "")).slice(0, 6),
    [jobs],
  );

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHero loading={false} updated={jobsData?.updated ?? null} profile={config?.profile} />
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHero loading={loading} updated={jobsData?.updated ?? manifest?.updated ?? null} profile={config?.profile} />

      {/* Stats */}
      <section aria-label="Statistics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Available jobs" value={stats.total} icon={<Briefcase className="h-4 w-4" />} loading={loading} hint="All open roles in the dataset" />
          <StatCard label={`Recently posted (≤${stats.defaultDays}d)`} value={stats.recentlyPosted} icon={<Clock className="h-4 w-4" />} loading={loading} hint="By company posting date" />
          <StatCard label="New (first seen ≤24h)" value={stats.newToday} icon={<Sparkles className="h-4 w-4" />} loading={loading} hint="First seen by the tracker" />
          <StatCard label="Tracked companies" value={stats.companies} icon={<Building2 className="h-4 w-4" />} loading={loading} hint="Configured in config.json" />
          <StatCard label="Skill-matched jobs" value={stats.skillMatched} icon={<Star className="h-4 w-4" />} loading={loading} hint="Match ≥1 resume skill" />
          <StatCard label="Saved jobs" value={stats.savedCount} icon={<Bookmark className="h-4 w-4" />} loading={loading} hint="On this browser" />
          <StatCard label="Applications tracked" value={stats.appliedCount} icon={<CheckCircle2 className="h-4 w-4" />} loading={loading} hint="Local to this browser" />
        </div>
      </section>

      {/* Quick-access filters */}
      <section aria-label="Quick filters">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick filters</h2>
        <div className="flex flex-wrap gap-2">
          <QuickChip href={quickLink({ q: "" }, stats.defaultDays, stats.maxYears)} label="All jobs" />
          <QuickChip href={quickLink({ locations: ["Chennai"] }, stats.defaultDays, stats.maxYears)} label="Chennai jobs" />
          <QuickChip href={quickLink({ experience: ["fresher", "internship", "graduate-trainee"] }, stats.defaultDays, stats.maxYears)} label="Fresher jobs" />
          <QuickChip href={quickLink({ experience: ["0-1", "0-2"] }, stats.defaultDays, stats.maxYears)} label="Entry-level jobs" />
          <QuickChip href={quickLink({ workMode: ["remote"] }, stats.defaultDays, stats.maxYears)} label="Remote jobs" />
          <QuickChip href={quickLink({ dateWindow: 3 }, stats.defaultDays, stats.maxYears)} label="Recently posted" />
          <QuickChip href={quickLink({ skills: CORE_SKILLS, skillMode: "any", sort: "best-match" }, stats.defaultDays, stats.maxYears)} label="Skill-matched jobs" />
        </div>
      </section>

      {/* Recently posted preview */}
      <section aria-label="Recently posted jobs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently posted</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/jobs">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-8 w-8" />} title="No jobs in the dataset yet" description="Run the collector or check the workflow run. Jobs appear here once jobs.json is populated." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentJobs.map((j) => (
              <JobCard key={j.url} job={j} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardHero({ loading, updated, profile }: { loading: boolean; updated: string | null; profile?: string }) {
  return (
    <section className="rounded-lg border border-border bg-gradient-to-b from-card to-background p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Compass className="h-3 w-3" /> {SITE.primaryLocation} · Fresher to ~3 yrs
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tech jobs with direct apply links</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {profile ?? "Auto-updating job listings pulled from official company career-board APIs."}
          </p>
        </div>
        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          <p>Last updated</p>
          <p className="font-medium text-foreground">
            {loading ? "—" : updated ? formatDate(updated) : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
    >
      {label}
    </Link>
  );
}
