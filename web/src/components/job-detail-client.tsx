"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  Star,
  Bookmark,
  Briefcase,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useSavedJobs } from "@/hooks/use-saved";
import { savedStore } from "@/lib/saved-store";
import type { ApplicationStatus } from "@/lib/storage";
import { fetchJobDescription, findJobById } from "@/lib/api";
import { classifyJob, categoryLabel } from "@/lib/categories";
import { inferWorkMode, inferEmploymentType } from "@/lib/filter";
import { experienceLabel } from "@/lib/experience";
import { formatDate, postedLabel, relativeAgo } from "@/lib/format";
import { SKILL_CATALOG } from "@/lib/skills";
import { slugify } from "@/lib/utils";
import type { Job } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { JobCardSkeleton } from "@/components/job-card";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
];

const WORK_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  "not-specified": "Not specified",
};

export function JobDetailClient({ id }: { id: string }) {
  const { jobs, config, loading, error, refresh } = useData();
  const saved = useSavedJobs();

  const job = React.useMemo(() => findJobById(jobs, id), [jobs, id]);
  const savedRec = job ? saved[job.url] : null;

  const [jd, setJd] = React.useState<{ body: string; truncated: boolean; meta: Record<string, string> } | null>(null);
  const [jdLoading, setJdLoading] = React.useState(false);
  const [jdError, setJdError] = React.useState(false);
  const [notes, setNotes] = React.useState(savedRec?.notes ?? "");

  React.useEffect(() => {
    if (!job) return;
    setJdLoading(true);
    setJdError(false);
    fetchJobDescription(job.jd_file)
      .then((r) => {
        if (r) setJd({ body: r.body, truncated: r.truncated, meta: r.meta });
        else setJdError(true);
      })
      .finally(() => setJdLoading(false));
  }, [job]);

  React.useEffect(() => setNotes(savedRec?.notes ?? ""), [savedRec?.notes]);

  const detectedSkills = React.useMemo(() => {
    if (!job) return [];
    const text = `${job.title} ${job.summary || ""} ${jd?.body || ""}`.toLowerCase();
    const found = new Set<string>();
    for (const s of SKILL_CATALOG) {
      const hit = s.tokens.some((t) =>
        new RegExp(`(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i").test(text),
      );
      if (hit) found.add(s.label);
    }
    const matchedLower = (job.matched || []).map((m) => m.toLowerCase());
    // Distinguish evidence-backed resume matches from skills detected in the text.
    return [...found].filter((label) => {
      const def = SKILL_CATALOG.find((s) => s.label === label)!;
      return !def.tokens.some((t) => matchedLower.some((m) => m.includes(t) || t.includes(m)));
    });
  }, [job, jd]);

  const similar = React.useMemo(() => {
    if (!job) return [] as Job[];
    const cat = classifyJob(job);
    const sameCompany = jobs.filter((j) => j.url !== job.url && j.company === job.company);
    const sameCategory = jobs.filter((j) => j.url !== job.url && j.company !== job.company && classifyJob(j) === cat);
    return [...sameCompany, ...sameCategory].slice(0, 4);
  }, [jobs, job]);

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <JobCardSkeleton />
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

  // Job not in current dataset — show archive view if the JD file still loads.
  if (!job) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="This job may no longer be active"
          description="It's not in the latest published dataset. If a cached description is available it's shown below."
        />
        <ArchiveJd id={id} />
      </div>
    );
  }

  const category = classifyJob(job);
  const workMode = inferWorkMode(job);
  const employment = inferEmploymentType(job);

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <article className="space-y-6">
          <header className="space-y-3">
            <div>
              <Link
                href={`/companies/${slugify(job.company)}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" /> {job.company}
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {job.location || "Location not specified"}
              </span>
              <span className="inline-flex items-center gap-1" title={job.posted_exact ? "Company posting date" : "Date first seen"}>
                <Clock className="h-4 w-4" /> {postedLabel(job)} · {relativeAgo(job.posted, job.posted_exact)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{categoryLabel(category)}</Badge>
              <Badge variant="secondary">{experienceLabel(job.years)}</Badge>
              <Badge variant="muted">{WORK_MODE_LABEL[workMode]}</Badge>
              {employment !== "not-specified" && <Badge variant="muted">{employment}</Badge>}
              {job.match > 0 && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3 fill-current" /> {job.match} skill match
                </Badge>
              )}
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Job description
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              {jdLoading ? (
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : jdError ? (
                <p className="text-sm text-muted-foreground">
                  The full description isn't available through the API. Open the Apply link to view it on the
                  company site.
                </p>
              ) : jd && jd.body ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {jd.body}
                  </ReactMarkdown>
                  {jd.truncated && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      (Description truncated — see the Apply link for the full text.)
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No description available.</p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Matched your resume skills (evidence-backed)</p>
                {job.matched && job.matched.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {job.matched.map((s) => (
                      <Badge key={s} variant="success">
                        <Star className="mr-1 h-3 w-3 fill-current" /> {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No direct resume-skill matches.</p>
                )}
              </div>
              {detectedSkills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Also detected in the description</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detectedSkills.map((s) => (
                      <Badge key={s} variant="muted">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </article>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <Button asChild className="w-full">
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Apply on company site
                </a>
              </Button>

              <Separator />

              <div className="space-y-1 text-sm">
                <Row label="Company" value={<Link className="hover:underline" href={`/companies/${slugify(job.company)}`}>{job.company}</Link>} />
                <Row label="Location" value={job.location || "—"} />
                <Row label="Posted" value={postedLabel(job)} />
                <Row label="Experience" value={experienceLabel(job.years)} />
                <Row label="Work mode" value={WORK_MODE_LABEL[workMode]} />
                {employment !== "not-specified" && <Row label="Type" value={employment} />}
                <Row label="Category" value={categoryLabel(category)} />
                <Row label="First seen" value={formatDate(job.first_seen)} />
              </div>
            </CardContent>
          </Card>

          {/* Application tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Track this job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedRec ? (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={savedRec.status}
                      onValueChange={(v) => savedStore.setStatus(job.url, v as ApplicationStatus)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Label htmlFor="applied">Applied date</Label>
                    <Input
                      id="applied"
                      type="date"
                      value={(savedRec.appliedAt ?? "").slice(0, 10)}
                      onChange={(e) => savedStore.setAppliedDate(job.url, e.target.value || null)}
                    />

                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => savedStore.setNotes(job.url, notes)}
                      placeholder="Your private notes about this role…"
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => savedStore.remove(job.url)}
                  >
                    Remove from saved
                  </Button>
                </>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() =>
                  savedStore.toggleSave({
                    url: job.url,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    jdFile: job.jd_file,
                  })
                }>
                  <Bookmark className="h-4 w-4" /> Save job
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Saved jobs and notes stay in this browser (local storage) and do not sync across devices.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Similar jobs */}
      {similar.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Similar jobs</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">
                More jobs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {similar.map((j) => (
              <SimilarJobMini key={j.url} job={j} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
      <Link href="/jobs">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
    </Button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SimilarJobMini({ job }: { job: Job }) {
  const id = job.jd_file.replace(/\.md$/, "");
  return (
    <Link href={`/jobs/${id}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{job.company}</p>
          <p className="mt-0.5 line-clamp-1 font-medium">{job.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.location || "—"} · {relativeAgo(job.posted, job.posted_exact)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ArchiveJd({ id }: { id: string }) {
  const [jd, setJd] = React.useState<{ body: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetchJobDescription(`${id}.md`)
      .then((r) => setJd(r && r.body ? { body: r.body } : null))
      .finally(() => setLoading(false));
  }, [id]);
  if (loading) return <JobCardSkeleton />;
  if (!jd) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cached description</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {jd.body}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}
