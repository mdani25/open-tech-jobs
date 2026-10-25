"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark,
  Search,
  Download,
  Trash2,
  ExternalLink,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useSavedJobs } from "@/hooks/use-saved";
import { savedStore } from "@/lib/saved-store";
import type { ApplicationStatus, SavedJob } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";

const STATUS_OPTIONS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  rejected: "Rejected",
};

const STATUS_BADGE: Record<ApplicationStatus, "muted" | "default" | "success" | "warning" | "destructive"> = {
  saved: "muted",
  applied: "default",
  shortlisted: "success",
  interview: "warning",
  rejected: "destructive",
};

export default function SavedPage() {
  const { jobs } = useData();
  const saved = useSavedJobs();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<ApplicationStatus | "all">("all");

  const liveUrls = React.useMemo(() => new Set(jobs.map((j) => j.url)), [jobs]);

  const rows = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return Object.values(saved)
      .filter((s) => (status === "all" ? true : s.status === status))
      .filter((s) =>
        !query ? true : (s.title + " " + s.company + " " + (s.location ?? "")).toLowerCase().includes(query),
      )
      .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  }, [saved, q, status]);

  function exportCsv() {
    const csv = savedStore.exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "open-tech-jobs-saved.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: Object.keys(saved).length };
    for (const s of Object.values(saved)) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [saved]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Saved Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Your saved jobs and applications, stored in this browser only. They do not sync across devices.
          </p>
        </div>
        {Object.keys(saved).length > 0 && (
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {Object.keys(saved).length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-8 w-8" />}
          title="No saved jobs yet"
          description="Save jobs from the search page or a job's detail page. Saved jobs, application status, and notes live here."
          action={
            <Button asChild>
              <Link href="/jobs">
                Browse jobs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search saved jobs…"
                className="pl-9"
                aria-label="Search saved jobs"
              />
            </div>
          </div>

          <Tabs value={status} onValueChange={(v) => setStatus(v as ApplicationStatus | "all")}>
            <TabsList className="flex-wrap">
              {STATUS_OPTIONS.map((o) => (
                <TabsTrigger key={o.value} value={o.value}>
                  {o.label} <span className="ml-1 text-xs text-muted-foreground">{counts[o.value] ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Separator />

          {rows.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-8 w-8" />} title="Nothing here" description="No saved jobs match this filter." />
          ) : (
            <div className="space-y-3">
              {rows.map((s) => (
                <SavedRow key={s.url} s={s} live={liveUrls.has(s.url)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SavedRow({ s, live }: { s: SavedJob; live: boolean }) {
  const id = s.jdFile?.replace(/\.md$/, "");
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              {!live && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> No longer in latest dataset
                </Badge>
              )}
            </div>
            {id ? (
              <Link href={`/jobs/${id}`} className="block font-semibold hover:text-primary">
                {s.title}
              </Link>
            ) : (
              <p className="font-semibold">{s.title}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {s.company} · {s.location || "Location not specified"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Remove" onClick={() => savedStore.remove(s.url)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Apply
            </a>
          </Button>
          {id && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/jobs/${id}`}>View details</Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Saved {formatDate(s.savedAt)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={s.status} onValueChange={(v) => savedStore.setStatus(s.url, v as ApplicationStatus)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["saved", "applied", "shortlisted", "interview", "rejected"] as ApplicationStatus[]).map((st) => (
                  <SelectItem key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Applied date</Label>
            <Input
              type="date"
              className="h-8"
              value={(s.appliedAt ?? "").slice(0, 10)}
              onChange={(e) => savedStore.setAppliedDate(s.url, e.target.value || null)}
            />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs">Notes</Label>
            <NotesField s={s} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotesField({ s }: { s: SavedJob }) {
  const [value, setValue] = React.useState(s.notes ?? "");
  React.useEffect(() => setValue(s.notes ?? ""), [s.notes]);
  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => savedStore.setNotes(s.url, value)}
      placeholder="Private notes…"
      className="min-h-[64px]"
    />
  );
}
