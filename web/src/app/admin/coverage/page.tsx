"use client";

import React from "react";
import { useData } from "@/hooks/use-data";
import { aggregateTracked } from "@/lib/companies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";

export default function AdminCoveragePage() {
  const { jobs, config, jobsData, loading } = useData();

  const rows = React.useMemo(() => aggregateTracked(config, jobs), [config, jobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Coverage report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per-company job counts from the latest published <code>jobs.json</code> (
          {loading ? "…" : jobsData?.updated ? formatDate(jobsData.updated) : "unknown"}). This is not a
          live re-run — it reflects the last committed collector output.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          For real fetch/filter/pass counts, run{" "}
          <code>py scripts/update_jobs.py --check</code> locally.
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2 text-right">Jobs in dataset</th>
                <th className="px-4 py-2">Latest posting</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                rows.map((c) => (
                  <tr key={c.name} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.ats ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.id ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold">{c.jobCount}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {c.latestPosted ? formatDate(c.latestPosted) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {c.jobCount > 0 ? (
                        <Badge variant="success">OK</Badge>
                      ) : c.enabled ? (
                        <Badge variant="warning">0 jobs</Badge>
                      ) : (
                        <Badge variant="muted">Disabled</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p><Badge variant="success">OK</Badge> — the last run found at least one job for this company.</p>
          <p><Badge variant="warning">0 jobs</Badge> — enabled but no jobs in the dataset. This could mean: wrong board ID, no Chennai / filter-passing jobs, or a temporary API error. Run <code>--check</code> to diagnose.</p>
          <p><Badge variant="muted">Disabled</Badge> — company is in config.json but marked disabled; it is skipped by the collector.</p>
          <Separator />
          <p>Companies that failed during the last run keep their previous jobs in the dataset (the collector falls back to old data on error). A zero count here means no jobs ever passed the location + title filters.</p>
        </CardContent>
      </Card>
    </div>
  );
}
