"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  SlidersHorizontal,
  Send,
  Activity,
  BarChart2,
  Database,
  ArrowRight,
  Info,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { aggregateTracked } from "@/lib/companies";

const SECTIONS = [
  {
    href: "/admin/companies",
    label: "Companies",
    icon: Building2,
    description: "Add, edit, enable/disable tracked companies. Export configuration.",
  },
  {
    href: "/admin/filters",
    label: "Filters",
    icon: SlidersHorizontal,
    description: "View config.json keyword include/exclude lists and date windows.",
  },
  {
    href: "/admin/sources",
    label: "Sources",
    icon: Database,
    description: "View ATS providers and direct career-page links.",
  },
  {
    href: "/admin/telegram",
    label: "Telegram",
    icon: Send,
    description: "View Telegram alert configuration. Credentials stay in GitHub Secrets.",
  },
  {
    href: "/admin/automation",
    label: "Automation",
    icon: Activity,
    description: "View GitHub Actions workflow schedule and last-run metadata.",
  },
  {
    href: "/admin/coverage",
    label: "Coverage",
    icon: BarChart2,
    description: "Per-company fetch counts from the latest published jobs.json.",
  },
];

export default function AdminPage() {
  const { jobsData, config, manifest, loading } = useData();

  const tracked = React.useMemo(() => aggregateTracked(config, jobsData?.jobs ?? []), [config, jobsData]);
  const activeCount = tracked.filter((c) => c.enabled && c.jobCount > 0).length;
  const failingCount = tracked.filter((c) => c.enabled && c.jobCount === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Admin overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only dashboard built from your published <code>jobs.json</code> and{" "}
          <code>config.json</code>. To commit changes, export config JSON and commit it to the repo.
        </p>
      </div>

      {/* Dataset metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Published dataset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loading ? (
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <Row label="Total jobs" value={jobsData?.count ?? 0} />
              <Row label="Last updated" value={jobsData?.updated ? formatDate(jobsData.updated) : "—"} />
              <Row label="JD files synced" value={manifest?.jdCount ?? "—"} />
              <Row label="Tracked companies" value={config?.companies?.length ?? "—"} />
              <Row label="Companies with jobs" value={activeCount} />
              <Row
                label="Companies with 0 jobs (may need fixing)"
                value={
                  <Badge variant={failingCount > 0 ? "destructive" : "success"}>{failingCount}</Badge>
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Backend notice */}
      <Card className="border-dashed">
        <CardContent className="flex gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No backend configured</p>
            <p>
              Config changes can be exported as JSON from the Companies and Filters pages and committed to
              the repository manually. A secure GitHub App backend can be added later to enable one-click
              commits — see the setup guide in the repo README.
            </p>
            <p>
              Telegram bot token and chat ID must remain in{" "}
              <strong>GitHub Actions secrets</strong>, never in browser code.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="block">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="font-medium">{s.label}</p>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
