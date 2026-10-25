"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  ExternalLink,
  Briefcase,
  MapPin,
  ArrowRight,
  LinkIcon,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { aggregateTracked, manualLinks, ATS_LABEL, type CompanyInfo } from "@/lib/companies";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

type SortKey = "jobs" | "name" | "latest";

export default function CompaniesPage() {
  const { jobs, config, loading, error, refresh } = useData();
  const [q, setQ] = React.useState("");
  const [atsFilter, setAtsFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SortKey>("jobs");

  const tracked = React.useMemo(() => aggregateTracked(config, jobs), [config, jobs]);
  const manual = React.useMemo(() => manualLinks(config), [config]);

  const atsProviders = React.useMemo(
    () => [...new Set(tracked.map((c) => c.ats).filter((x): x is NonNullable<typeof x> => !!x))].sort(),
    [tracked],
  );

  const filteredTracked = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = tracked.filter((c) => {
      if (atsFilter !== "all" && c.ats !== atsFilter) return false;
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || (c.ats ?? "").includes(query);
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "latest") return (b.latestPosted ?? "").localeCompare(a.latestPosted ?? "");
      return b.jobCount - a.jobCount || a.name.localeCompare(b.name);
    });
    return list;
  }, [tracked, q, atsFilter, sort]);

  const filteredManual = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return manual.filter((c) => !query || c.name.toLowerCase().includes(query));
  }, [manual, q]);

  if (error) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          {tracked.length} tracked companies are fetched automatically from official career-board APIs.{" "}
          {manual.length} more have only manual career pages (no public feed).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies…"
            className="pl-9"
            aria-label="Search companies"
          />
        </div>
        <Select value={atsFilter} onValueChange={setAtsFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by ATS">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {atsProviders.map((a) => (
              <SelectItem key={a} value={a}>
                {ATS_LABEL[a as keyof typeof ATS_LABEL] ?? a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Sort companies">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jobs">Most jobs</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="latest">Latest opening</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tracked companies */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tracked companies (auto-fetched)</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTracked.length === 0 ? (
          <EmptyState icon={<Building2 className="h-8 w-8" />} title="No companies match" description="Try a different search or provider filter." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTracked.map((c) => (
              <CompanyCard key={c.slug} c={c} />
            ))}
          </div>
        )}
      </section>

      {/* Manual career pages */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Manual career pages (no public feed)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          These companies don't publish a public job-board API. Open the career page and filter for Chennai and
          your skills.
        </p>
        {filteredManual.length === 0 ? (
          <EmptyState icon={<LinkIcon className="h-8 w-8" />} title="No manual links" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredManual.map((c) => (
              <Card key={c.slug} className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <Badge variant="muted" className="mt-1">
                      Manual career page
                    </Badge>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={c.careersUrl} target="_blank" rel="noopener noreferrer">
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CompanyCard({ c }: { c: CompanyInfo }) {
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/companies/${c.slug}`} className="font-semibold leading-tight hover:text-primary">
            {c.name}
          </Link>
          {c.ats && <Badge variant="secondary">{ATS_LABEL[c.ats]}</Badge>}
        </div>
        {c.id && <p className="font-mono text-xs text-muted-foreground">id: {c.id}</p>}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{c.jobCount}</span>
          <span className="text-muted-foreground">open {c.jobCount === 1 ? "role" : "roles"}</span>
        </div>
        {c.locations.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-2">{c.locations.slice(0, 4).join(", ")}</span>
          </div>
        )}
        {c.latestPosted && (
          <p className="text-xs text-muted-foreground">Latest opening: {formatDate(c.latestPosted)}</p>
        )}
      </CardContent>
      <div className="flex items-center gap-2 p-5 pt-0">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/companies/${c.slug}`}>
            View <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        {c.careersUrl && (
          <Button asChild variant="ghost" size="sm">
            <a href={c.careersUrl} target="_blank" rel="noopener noreferrer">
              Careers <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}
