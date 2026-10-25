"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Briefcase,
  MapPin,
  Globe,
  AlertCircle,
  LinkIcon,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { findCompanyBySlug, ATS_LABEL } from "@/lib/companies";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { defaultFilterState } from "@/lib/config-defaults";
import { filterToParams } from "@/lib/url-state";

export function CompanyDetailClient({ slug }: { slug: string }) {
  const { jobs, config, loading, error, refresh } = useData();

  const info = React.useMemo(() => findCompanyBySlug(config, slug), [config, slug]);
  const companyJobs = React.useMemo(
    () => (info && info.isTracked ? jobs.filter((j) => j.company === info.name) : []),
    [jobs, info],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState icon={<Briefcase className="h-8 w-8" />} title="Company not found" description="This company isn't in the configuration." />
      </div>
    );
  }

  const allJobsLink = info.isTracked
    ? `/jobs?${filterToParams({ ...defaultFilterState(config?.default_days ?? 7, config?.max_years_required ?? 3), companies: [info.name] }).toString()}`
    : null;

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{info.name}</h1>
          {info.ats && <Badge variant="secondary">{ATS_LABEL[info.ats]}</Badge>}
          {info.isTracked ? (
            <Badge variant="default">Auto-fetched</Badge>
          ) : (
            <Badge variant="muted">
              <LinkIcon className="mr-1 h-3 w-3" /> Manual career page
            </Badge>
          )}
        </div>
        {info.id && <p className="font-mono text-xs text-muted-foreground">board id: {info.id}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {info.careersUrl && (
            <Button asChild>
              <a href={info.careersUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open career page
              </a>
            </Button>
          )}
          {info.website && (
            <Button asChild variant="outline">
              <a href={info.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" /> Website
              </a>
            </Button>
          )}
          {allJobsLink && (
            <Button asChild variant="outline">
              <Link href={allJobsLink}>
                <Briefcase className="h-4 w-4" /> View {companyJobs.length} jobs in search
              </Link>
            </Button>
          )}
        </div>
      </header>

      <Separator />

      {info.isTracked ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Open roles {companyJobs.length > 0 && `(${companyJobs.length})`}
            </h2>
          </div>
          {companyJobs.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="No open roles right now"
              description={`The latest run found no Chennai / filter-passing roles for ${info.name}. Open the career page to browse directly, or check the coverage report in the source repo.`}
            />
          ) : (
            <>
              {info.locations.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Locations: {info.locations.join(", ")}</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {companyJobs.map((j) => (
                  <JobCard key={j.url} job={j} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-warning" />
              <div className="space-y-1">
                <p className="font-medium">Not auto-fetched</p>
                <p className="text-sm text-muted-foreground">
                  {info.name} doesn't publish a public job-board API the tracker can read. Use the career page
                  above and filter for Chennai and 0–3 years. For pre-filtered searches across job boards, see{" "}
                  <Link href="/resources" className="text-primary hover:underline">
                    Career Resources
                  </Link>
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
      <Link href="/companies">
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </Link>
    </Button>
  );
}
