"use client";

import { useData } from "@/hooks/use-data";
import { ATS_LABEL } from "@/lib/companies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { AtsProvider } from "@/lib/types";

const ATS_DESC: Record<AtsProvider, string> = {
  greenhouse: "boards-api.greenhouse.io/v1/boards/{id}/jobs — returns full job list with descriptions.",
  lever: "api.lever.co/v0/postings/{id} — list endpoint, descriptions included.",
  ashby: "api.ashbyhq.com/posting-api/job-board/{id} — full board listing.",
  smartrecruiters:
    "api.smartrecruiters.com/v1/companies/{id}/postings — paginated; fetches detail per job for description.",
  workday:
    "myworkdayjobs.com Workday CX API — POST /jobs with searchText. Requires host + tenant + site.",
  amazon: "amazon.jobs/en/search.json — per-query search with loc_query=Chennai.",
};

export default function AdminSourcesPage() {
  const { config, loading } = useData();

  const byAts: Record<string, NonNullable<typeof config>["companies"]> = {};
  for (const c of config?.companies ?? []) {
    if (!byAts[c.ats]) byAts[c.ats] = [];
    byAts[c.ats].push(c);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ATS integrations used by the collector, and manual career-page links that have no public feed.
        </p>
      </div>

      {(Object.entries(ATS_DESC) as [AtsProvider, string][]).map(([ats, desc]) => {
        const companies = byAts[ats] ?? [];
        return (
          <Card key={ats}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {ATS_LABEL[ats]}
                <Badge variant="secondary">{companies.length} companies</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{desc}</p>
              {companies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {companies.map((c) => (
                    <Badge key={c.name} variant="outline">
                      {c.name}
                      {c.id && <span className="ml-1 font-mono text-xs opacity-70">/ {c.id}</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {config?.direct_links && config.direct_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Manual career pages
              <Badge variant="muted" className="ml-2">{config.direct_links.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              No public API — listed in SEARCH.md and the Career Resources page for manual browsing.
            </p>
            <div className="space-y-1.5">
              {config.direct_links.map((d) => (
                <div key={d.url} className="flex items-center justify-between gap-2">
                  <p className="text-sm">{d.name}</p>
                  <Button asChild variant="ghost" size="sm">
                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
