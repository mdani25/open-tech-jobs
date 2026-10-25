"use client";

import { useData } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { SITE } from "@/lib/site-config";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAutomationPage() {
  const { jobsData, manifest, loading } = useData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Automation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GitHub Actions workflow status derived from the published dataset. For real-time run logs, open the
          Actions tab in the repository.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Workflow summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCell label="Dataset updated" value={loading ? "…" : jobsData?.updated ? formatDate(jobsData.updated) : "—"} />
            <StatCell label="Total jobs" value={loading ? "…" : String(jobsData?.count ?? "—")} />
            <StatCell label="JD files" value={loading ? "…" : String(manifest?.jdCount ?? "—")} />
          </div>
          <p className="text-xs text-muted-foreground">
            The collector runs automatically twice daily (UTC 1:30 and 13:30) and commits only when there are
            changes. You can also trigger it manually from the Actions tab.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={`${SITE.repo}/actions`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Open GitHub Actions
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">update.yml — schedule and inputs</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><Badge variant="secondary">cron</Badge> <code>30 1,13 * * *</code> — runs at 01:30 and 13:30 UTC (07:00 and 19:00 IST).</p>
          <p><Badge variant="secondary">workflow_dispatch</Badge> Manual trigger from the Actions tab. Optional <code>days</code> input (e.g. <code>5</code> or <code>5,45</code>) adds extra date windows for that run only.</p>
          <p>
            <Badge variant="secondary">permissions</Badge> <code>contents: write</code> — the workflow commits
            to <code>JOBS.md</code>, <code>SEARCH.md</code>, <code>jobs.json</code>, <code>jds/</code> and
            <code>windows/</code>. It does not have access to any other secrets or branches.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Run the collector locally</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
{`# Normal run (updates jobs.json, JOBS.md, SEARCH.md, jds/, windows/)
py scripts/update_jobs.py

# Extra date window(s) — adds windows/last-5d.md for this run
py scripts/update_jobs.py --days 5

# Per-company diagnostics (read-only, no files written)
py scripts/update_jobs.py --check

# Telegram test (requires token env vars)
TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… py scripts/update_jobs.py --test-telegram`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            The collector uses Python 3.8+ and the standard library only — no dependencies to install.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
