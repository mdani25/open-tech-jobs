"use client";

import React from "react";
import { useData } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { windowLabel } from "@/lib/format";

export default function AdminFiltersPage() {
  const { config, loading } = useData();

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader><div className="h-5 w-32 animate-pulse rounded bg-muted" /></CardHeader>
            <CardContent><div className="h-20 animate-pulse rounded bg-muted" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!config) return <p className="text-sm text-muted-foreground">config.json not loaded.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Filters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          These are the live values from your published <code>config.json</code>. Edit the file in the repo
          to change them; the collector applies them at runtime.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">{config.profile}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Row label="Experience years" value={config.experience_years} />
            <Row label="Max required years" value={config.max_years_required} />
            <Row label="Default date window" value={`${config.default_days} days`} />
            <Row label="JD max chars" value={config.jd_max_chars.toLocaleString()} />
            <Row label="Locations" value={config.locations.join(", ") || "Any"} />
            <Row label="LinkedIn levels" value={config.linkedin_levels} />
            <Row label="Max rows/window" value={config.max_rows_per_window} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Date windows</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.windows.map((n) => (
              <Badge key={n} variant="secondary">{windowLabel(n)}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These are the windows for which the collector generates <code>windows/last-Nd.md</code> files.
            Add to the array in config.json or use <code>--days N</code> for a one-off window.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Search keywords (for SEARCH.md / quick links)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.search_keywords.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Title keywords — include (OR)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">A job's title must contain at least one of these (whole-word, case-insensitive).</p>
          <div className="flex flex-wrap gap-1.5">
            {config.keywords_include.map((k) => <Badge key={k} variant="outline">{k}</Badge>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Title keywords — exclude</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">A job is dropped if its title contains any of these.</p>
          <div className="flex flex-wrap gap-1.5">
            {config.keywords_exclude.map((k) => (
              <Badge key={k} variant="destructive">{k}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resume skills (skill matching)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Skills checked against the job title + description. The ⭐ stars in JOBS.md and the{" "}
            <code>matched</code>/<code>match</code> fields in jobs.json come from this list.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {config.resume_skills.map((s) => <Badge key={s} variant="default">{s}</Badge>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
