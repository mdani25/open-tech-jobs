"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Star,
  Bookmark,
  ExternalLink,
  Clock,
  Briefcase,
} from "lucide-react";
import type { Job } from "@/lib/types";
import { cn, jobId, slugify } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { classifyJob, categoryLabel } from "@/lib/categories";
import { inferWorkMode, inferEmploymentType } from "@/lib/filter";
import { experienceLabel } from "@/lib/experience";
import { relativeAgo } from "@/lib/format";
import { useIsSaved } from "@/hooks/use-saved";
import { savedStore } from "@/lib/saved-store";

const WORK_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  "not-specified": "Work mode not specified",
};

const EMP_LABEL: Record<string, string> = {
  internship: "Internship",
  "graduate-trainee": "Graduate / Trainee",
  contract: "Contract",
  "part-time": "Part-time",
  temporary: "Temporary",
  "full-time": "Full-time",
  "not-specified": "Employment not specified",
};

interface JobCardProps {
  job: Job;
  showSummary?: boolean;
}

export function JobCard({ job, showSummary = true }: JobCardProps) {
  const saved = useIsSaved(job.url);
  const category = React.useMemo(() => classifyJob(job), [job]);
  const workMode = React.useMemo(() => inferWorkMode(job), [job]);
  const employment = React.useMemo(() => inferEmploymentType(job), [job]);
  const id = jobId(job);

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/companies/${slugify(job.company)}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" />
              {job.company}
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={saved ? "Remove from saved" : "Save job"}
            aria-pressed={saved}
            onClick={() =>
              savedStore.toggleSave({
                url: job.url,
                title: job.title,
                company: job.company,
                location: job.location,
                jdFile: job.jd_file,
              })
            }
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
          </Button>
        </div>
        <Link href={`/jobs/${id}`} className="block">
          <h3 className="text-base font-semibold leading-snug tracking-tight hover:text-primary">
            {job.title}
          </h3>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location || "Location not specified"}
          </span>
          <span className="inline-flex items-center gap-1" title={job.posted_exact ? "Company posting date" : "Date first seen by the tracker"}>
            <Clock className="h-3.5 w-3.5" />
            {relativeAgo(job.posted, job.posted_exact)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{categoryLabel(category)}</Badge>
          <Badge variant="secondary">{experienceLabel(job.years)}</Badge>
          <Badge variant="muted">{WORK_MODE_LABEL[workMode]}</Badge>
          {employment !== "not-specified" && <Badge variant="muted">{EMP_LABEL[employment]}</Badge>}
          {job.match > 0 && (
            <Badge variant="default" className="gap-1">
              <Star className="h-3 w-3 fill-current" /> {job.match} skill{job.match > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {job.matched && job.matched.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {job.matched.slice(0, 6).map((s) => (
              <span
                key={s}
                className="rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success"
                title="Matched your resume skills (evidence-backed)"
              >
                {s}
              </span>
            ))}
            {job.matched.length > 6 && (
              <span className="px-1 py-0.5 text-xs text-muted-foreground">
                +{job.matched.length - 6} more
              </span>
            )}
          </div>
        )}

        {showSummary && job.summary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{job.summary}</p>
        )}
      </CardContent>

      <CardFooter className="mt-auto items-center justify-between gap-2 pt-0">
        <Button asChild variant="outline" size="sm">
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> Apply
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/jobs/${id}`}>
            <Briefcase className="h-4 w-4" /> View details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function JobCardSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2 pb-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </CardContent>
      <CardFooter className="justify-between pt-0">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}
