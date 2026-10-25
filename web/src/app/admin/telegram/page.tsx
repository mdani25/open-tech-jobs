"use client";

import { useData } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function AdminTelegramPage() {
  const { config, loading } = useData();
  const tg = config?.telegram;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Telegram configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view of your Telegram alert settings from config.json.
        </p>
      </div>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Credentials never shown here</p>
            <p className="text-muted-foreground">
              <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_CHAT_ID</code> are stored only in
              GitHub Actions secrets (<code>Settings → Secrets and variables → Actions</code>) and are never
              accessible to the browser or this page.
            </p>
            <p className="text-muted-foreground mt-1">
              To test Telegram alerts, run:
              <code className="ml-1 rounded bg-muted px-1">
                TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… py scripts/update_jobs.py --test-telegram
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="h-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ) : tg ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Alert thresholds (from config.json)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCell label="Minimum skill matches" value={tg.min_match} />
              <StatCell label="Max alerts per run" value={tg.max_per_run} />
              <StatCell label="JD excerpt chars" value={tg.jd_chars} />
              <StatCell label="Max job age (days)" value={tg.max_age_days} />
            </div>
            <p className="text-xs text-muted-foreground">
              Alerts fire only for <em>new</em> jobs (not seen on the previous run) that have{" "}
              <strong>≥{tg.min_match} skill matches</strong> and were posted within{" "}
              <strong>{tg.max_age_days} days</strong>.
            </p>
            <p className="text-xs text-muted-foreground">
              The Telegram excerpt is the first {tg.jd_chars} characters of the description — separate from
              the website's full JD display ({config?.jd_max_chars?.toLocaleString()} chars).
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No telegram config found in config.json.</p>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
