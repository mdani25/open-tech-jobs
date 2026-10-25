"use client";

import * as React from "react";
import { ExternalLink, Search, Compass, BookOpen, Building2, LinkIcon } from "lucide-react";
import { useData } from "@/hooks/use-data";
import { aggregateTracked, ATS_LABEL } from "@/lib/companies";
import { buildSearchUrl, SEARCH_BOARDS, type JobBoard } from "@/lib/search-urls";
import { RESOURCE_GROUPS, DATE_WINDOW_OPTIONS } from "@/lib/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function ResourcesPage() {
  const { config } = useData();

  const keywords = config?.search_keywords ?? [];
  const [keyword, setKeyword] = React.useState(keywords[0] ?? "software engineer");
  React.useEffect(() => {
    if (!keyword && keywords.length) setKeyword(keywords[0]);
  }, [keywords, keyword]);
  const [location, setLocation] = React.useState("Chennai");
  const [experience, setExperience] = React.useState(config?.experience_years ?? 1);
  const [days, setDays] = React.useState<number | "all">(7);

  const tracked = React.useMemo(() => aggregateTracked(config, []), [config]);
  const direct = config?.direct_links ?? [];

  const buildInput = React.useCallback(
    () => ({
      keyword,
      location,
      experienceYears: experience,
      dateWindow: days === "all" ? null : Number(days),
      linkedinLevels: config?.linkedin_levels ?? "1,2,3",
    }),
    [keyword, location, experience, days, config],
  );

  function open(board: JobBoard) {
    window.open(buildSearchUrl(board, buildInput()), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Compass className="h-6 w-6" /> Career Resources
        </h1>
        <p className="text-sm text-muted-foreground">
          Pre-filtered searches for companies the tracker can't read automatically (TCS, Zoho, Infosys, Wipro…),
          plus direct career pages and prep resources. These open in your browser — nothing is scraped.
        </p>
      </div>

      {/* Search link builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Build a search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Keyword</Label>
              <Select value={keyword} onValueChange={setKeyword}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {keywords.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Chennai" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Experience (yrs)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date range</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(v === "all" ? "all" : Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All listings</SelectItem>
                  {DATE_WINDOW_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Last {n} day{n > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEARCH_BOARDS.map((b) => (
              <Button key={b.value} onClick={() => open(b.value)}>
                <ExternalLink className="h-4 w-4" /> Open on {b.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            LinkedIn experience levels use your <code>linkedin_levels</code> setting
            ({config?.linkedin_levels ?? "1,2,3"}). Naukri/Indeed date filters snap to the nearest supported
            value.
          </p>
        </CardContent>
      </Card>

      {/* Company career pages */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5" /> Company career pages
        </h2>
        <p className="text-sm text-muted-foreground">
          Tracked companies are auto-fetched where possible. The rest have manual career pages — open and
          filter for Chennai and 0–3 years.
        </p>

        {tracked.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auto-fetched</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tracked
                .filter((c) => c.careersUrl)
                .map((c) => (
                  <Card key={c.slug} className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <Badge variant="secondary" className="mt-1">
                          {c.ats ? ATS_LABEL[c.ats] : "Tracked"}
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
          </>
        )}

        {direct.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Manual career pages (no public feed)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {direct.map((d) => (
                <Card key={d.url} className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      <Badge variant="muted" className="mt-1">
                        <LinkIcon className="mr-1 h-3 w-3" /> Manual
                      </Badge>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* External resources */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5" /> More resources
        </h2>
        <div className="space-y-2">
          {RESOURCE_GROUPS.map((g) => (
            <Collapsible key={g.title}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/40">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {g.title}
                      <span className="text-xs font-normal text-muted-foreground">{g.links.length} links</span>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <ul className="space-y-1.5">
                      {g.links.map((l) => (
                        <li key={l.url}>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            {l.name}
                            {l.note && <span className="text-xs text-muted-foreground">— {l.note}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </section>
    </div>
  );
}
