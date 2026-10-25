"use client";

import * as React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X, Bookmark, Share2, BookmarkCheck } from "lucide-react";
import { useData } from "@/hooks/use-data";
import { useSavedJobs } from "@/hooks/use-saved";
import { buildCompanyAts, applyFilters } from "@/lib/filter";
import { buildLocationOptions } from "@/lib/locations";
import { EXPERIENCE_BUCKETS } from "@/lib/experience";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/categories";
import { SKILL_CATALOG } from "@/lib/skills";
import type { AtsProvider, FilterState, JobCategory, SortKey } from "@/lib/types";
import { defaultFilterState, PAGE_SIZE_OPTIONS } from "@/lib/config-defaults";
import { filterToParams, paramsToFilter, activeFilterCount } from "@/lib/url-state";
import { windowLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { JobCard, JobCardSkeleton } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Pagination } from "@/components/pagination";
import { FilterChips } from "@/components/filter-chips";
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select";

const WORK_MODES: { value: FilterState["workMode"][number]; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "not-specified", label: "Not specified" },
];

const EMP_TYPES: { value: FilterState["employmentType"][number]; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "graduate-trainee", label: "Graduate / Trainee" },
  { value: "not-specified", label: "Not specified" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "best-match", label: "Best skill match" },
  { value: "relevance", label: "Search relevance" },
  { value: "oldest", label: "Oldest first" },
  { value: "company-az", label: "Company A–Z" },
  { value: "company-za", label: "Company Z–A" },
  { value: "lowest-experience", label: "Lowest experience" },
];

export default function JobsPage() {
  const { jobs, config, loading, error, refresh } = useData();
  const saved = useSavedJobs();

  const defaultDays = config?.default_days ?? 7;
  const maxYears = config?.max_years_required ?? 3;

  const [filter, setFilter] = React.useState<FilterState>(() =>
    typeof window !== "undefined"
      ? paramsToFilter(window.location.search, defaultDays, maxYears)
      : defaultFilterState(defaultDays, maxYears),
  );

  // Sync filter -> URL (shareable, back/forward friendly)
  React.useEffect(() => {
    const params = filterToParams(filter);
    const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filter]);

  // React to back/forward navigation
  React.useEffect(() => {
    const onPop = () => setFilter(paramsToFilter(window.location.search, defaultDays, maxYears));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultDays, maxYears]);

  const ctx = React.useMemo(() => ({ companyAts: buildCompanyAts(config) }), [config]);

  // Build facet option lists from the real dataset
  const options = React.useMemo(() => {
    const locOptions: MultiSelectOption[] = buildLocationOptions(jobs).map((l) => ({
      value: l.label,
      label: l.label,
      count: l.count,
    }));
    const companyCounts = new Map<string, number>();
    for (const j of jobs) companyCounts.set(j.company, (companyCounts.get(j.company) ?? 0) + 1);
    const companyOptions: MultiSelectOption[] = [...companyCounts.entries()]
      .map(([label, count]) => ({ value: label, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const atsSet = new Set<AtsProvider>();
    for (const j of jobs) {
      const ats = ctx.companyAts.get(j.company);
      if (ats) atsSet.add(ats);
    }
    const atsOptions: MultiSelectOption[] = [...atsSet].sort().map((a) => ({ value: a, label: a }));
    const skillCounts = new Map<string, number>();
    for (const j of jobs) {
      for (const s of SKILL_CATALOG) {
        const text = `${j.title} ${j.summary || ""} ${(j.matched || []).join(" ")}`.toLowerCase();
        const hit = s.tokens.some((t) =>
          new RegExp(`(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i").test(text),
        );
        if (hit) skillCounts.set(s.label, (skillCounts.get(s.label) ?? 0) + 1);
      }
    }
    const skillOptions: MultiSelectOption[] = SKILL_CATALOG.map((s) => ({
      value: s.label,
      label: s.label,
      count: skillCounts.get(s.label) ?? 0,
    }));
    return { locOptions, companyOptions, atsOptions, skillOptions };
  }, [jobs, ctx]);

  const result = React.useMemo(() => {
    if (loading || error) return { results: [] as typeof jobs, total: 0 };
    return applyFilters(jobs, filter, ctx);
  }, [jobs, filter, ctx, loading, error]);

  const paged = React.useMemo(() => {
    const start = (filter.page - 1) * filter.pageSize;
    return result.results.slice(start, start + filter.pageSize);
  }, [result, filter.page, filter.pageSize]);

  const patch = React.useCallback((p: Partial<FilterState>) => setFilter((f) => ({ ...f, ...p, page: 1 })), []);
  const setPage = React.useCallback((p: number) => {
    setFilter((f) => ({ ...f, page: p }));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const clearAll = React.useCallback(
    () => setFilter(defaultFilterState(defaultDays, maxYears)),
    [defaultDays, maxYears],
  );

  const activeCount = activeFilterCount(filter);
  const savedCount = Object.keys(saved).length;

  const filtersBody = (
    <JobFiltersBody
      filter={filter}
      onPatch={patch}
      options={options}
      defaultDays={defaultDays}
      maxYears={maxYears}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Find Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Live roles from {config?.companies?.length ?? "—"} tracked company boards. Filtering runs in your
          browser; nothing is sent to a server.
        </p>
      </div>

      {/* Search + sort + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Search title, company, location, skills…"
            className="pl-9"
            aria-label="Search jobs"
          />
          {filter.q && (
            <button
              onClick={() => patch({ q: "" })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter.sort} onValueChange={(v) => patch({ sort: v as SortKey })}>
            <SelectTrigger className="w-[180px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mobile filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeCount > 0 && <Badge variant="default" className="ml-1">{activeCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">{filtersBody}</div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button asChild variant="ghost" size="icon" aria-label="Saved jobs">
            <Link href="/saved" className="relative">
              <Bookmark className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {savedCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Desktop filters */}
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
            {filtersBody}
          </div>
        </aside>

        {/* Results */}
        <section className="space-y-4">
          <FilterChips filter={filter} onPatch={patch} onClear={clearAll} />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${result.total} job${result.total === 1 ? "" : "s"}`}
              {activeCount > 0 && <span> · {activeCount} filter{activeCount === 1 ? "" : "s"} active</span>}
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Per page</span>
              <Select value={String(filter.pageSize)} onValueChange={(v) => patch({ pageSize: Number(v) })}>
                <SelectTrigger className="h-8 w-[80px]" aria-label="Page size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ShareButton filter={filter} />
            </div>
          </div>

          <Separator />

          {error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <EmptyState
              icon={<BookmarkCheck className="h-8 w-8" />}
              title="No jobs match these filters"
              description="Try widening your search — clear a filter, expand the experience range, or remove a keyword."
              action={<Button variant="outline" onClick={clearAll}>Clear all filters</Button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {paged.map((j) => (
                <JobCard key={j.url} job={j} />
              ))}
            </div>
          )}

          {!loading && !error && result.total > 0 && (
            <Pagination
              page={filter.page}
              pageSize={filter.pageSize}
              total={result.total}
              onPageChange={setPage}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ShareButton({ filter }: { filter: FilterState }) {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    if (typeof window === "undefined") return;
    const params = filterToParams(filter);
    const url = `${window.location.origin}${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Copy shareable link" onClick={copy}>
      <Share2 className="h-4 w-4" />
    </Button>
  );
}

interface FiltersBodyProps {
  filter: FilterState;
  onPatch: (p: Partial<FilterState>) => void;
  options: {
    locOptions: MultiSelectOption[];
    companyOptions: MultiSelectOption[];
    atsOptions: MultiSelectOption[];
    skillOptions: MultiSelectOption[];
  };
  defaultDays: number;
  maxYears: number;
}

function JobFiltersBody({ filter, onPatch, options, defaultDays, maxYears }: FiltersBodyProps) {
  const [advanced, setAdvanced] = React.useState(false);
  const [kw, setKw] = React.useState({ it: "", xt: "", id: "", xd: "" });

  function addKw(field: keyof typeof kw) {
    const v = kw[field].trim();
    if (!v) return;
    const map: Record<keyof typeof kw, keyof FilterState> = {
      it: "incTitle",
      xt: "excTitle",
      id: "incDesc",
      xd: "excDesc",
    };
    const fk = map[field];
    const arr = filter[fk] as string[];
    if (!arr.includes(v)) onPatch({ [fk]: [...arr, v] } as Partial<FilterState>);
    setKw((s) => ({ ...s, [field]: "" }));
  }

  const dateWindows = [1, 2, 3, 7, 14, 30, 60, 365];

  return (
    <div className="space-y-5">
      <FilterGroup label="Location">
        <MultiSelect
          options={options.locOptions}
          selected={filter.locations}
          onChange={(v) => onPatch({ locations: v })}
          placeholder="Location"
        />
      </FilterGroup>

      <FilterGroup label="Experience">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {EXPERIENCE_BUCKETS.map((b) => (
              <CheckboxRow
                key={b.key}
                checked={filter.experience.includes(b.key)}
                label={b.label}
                onChange={() =>
                  onPatch({
                    experience: filter.experience.includes(b.key)
                      ? filter.experience.filter((x) => x !== b.key)
                      : [...filter.experience, b.key],
                  })
                }
              />
            ))}
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Max experience (yrs)</span>
              <span className="font-medium text-foreground">
                {filter.maxExperience === null ? "Any" : filter.maxExperience}
              </span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[filter.maxExperience ?? 0]}
              onValueChange={(v) => onPatch({ maxExperience: v[0] })}
              className="mt-2"
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup label="Job category">
        <div className="grid grid-cols-1 gap-1.5">
          {CATEGORY_ORDER.map((c) => (
            <CheckboxRow
              key={c}
              checked={filter.categories.includes(c)}
              label={CATEGORY_LABELS[c]}
              onChange={() =>
                onPatch({
                  categories: filter.categories.includes(c)
                    ? filter.categories.filter((x) => x !== c)
                    : [...filter.categories, c],
                } as Partial<FilterState>)
              }
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Work mode">
        <div className="grid grid-cols-2 gap-1.5">
          {WORK_MODES.map((w) => (
            <CheckboxRow
              key={w.value}
              checked={filter.workMode.includes(w.value)}
              label={w.label}
              onChange={() =>
                onPatch({
                  workMode: filter.workMode.includes(w.value)
                    ? filter.workMode.filter((x) => x !== w.value)
                    : [...filter.workMode, w.value],
                } as Partial<FilterState>)
              }
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Employment type">
        <div className="grid grid-cols-1 gap-1.5">
          {EMP_TYPES.map((e) => (
            <CheckboxRow
              key={e.value}
              checked={filter.employmentType.includes(e.value)}
              label={e.label}
              onChange={() =>
                onPatch({
                  employmentType: filter.employmentType.includes(e.value)
                    ? filter.employmentType.filter((x) => x !== e.value)
                    : [...filter.employmentType, e.value],
                } as Partial<FilterState>)
              }
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Company">
        <MultiSelect
          options={options.companyOptions}
          selected={filter.companies}
          onChange={(v) => onPatch({ companies: v })}
          placeholder="Company"
          searchPlaceholder="Search companies…"
        />
      </FilterGroup>

      <FilterGroup label="ATS provider">
        <MultiSelect
          options={options.atsOptions}
          selected={filter.ats}
          onChange={(v) => onPatch({ ats: v as FilterState["ats"] })}
          placeholder="ATS provider"
        />
      </FilterGroup>

      <FilterGroup label="Skills">
        <MultiSelect
          options={options.skillOptions}
          selected={filter.skills}
          onChange={(v) => onPatch({ skills: v })}
          placeholder="Skills"
          searchPlaceholder="Search skills…"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Select value={filter.skillMode} onValueChange={(v) => onPatch({ skillMode: v as FilterState["skillMode"] })}>
            <SelectTrigger className="h-8" aria-label="Skill match mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Match ANY</SelectItem>
              <SelectItem value="all">Match ALL</SelectItem>
              <SelectItem value="at-least">At least N</SelectItem>
              <SelectItem value="exclude">Exclude</SelectItem>
            </SelectContent>
          </Select>
          {filter.skillMode === "at-least" && (
            <Select
              value={String(filter.skillThreshold)}
              onValueChange={(v) => onPatch({ skillThreshold: Number(v) })}
            >
              <SelectTrigger className="h-8" aria-label="Skill threshold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    ≥ {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Skill filtering searches title + summary + matched skills.
        </p>
      </FilterGroup>

      <FilterGroup label="Posting date">
        <Select
          value={filter.customFrom ? "custom" : filter.dateWindow === null ? "all" : String(filter.dateWindow)}
          onValueChange={(v) => {
            if (v === "all") onPatch({ dateWindow: null, customFrom: null });
            else if (v === "custom") onPatch({ dateWindow: null, customFrom: filter.customFrom ?? new Date().toISOString().slice(0, 10) });
            else onPatch({ dateWindow: Number(v), customFrom: null });
          }}
        >
          <SelectTrigger aria-label="Date window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All available listings</SelectItem>
            {dateWindows.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {windowLabel(n)}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom since-date…</SelectItem>
          </SelectContent>
        </Select>
        {filter.customFrom && (
          <Input
            type="date"
            value={filter.customFrom}
            onChange={(e) => onPatch({ customFrom: e.target.value || null })}
            className="mt-2"
            aria-label="Custom date since"
          />
        )}
      </FilterGroup>

      <Collapsible open={advanced} onOpenChange={setAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            Advanced keywords
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <KeywordInput
            label="Include title (OR)"
            value={kw.it}
            onChange={(v) => setKw((s) => ({ ...s, it: v }))}
            onAdd={() => addKw("it")}
            tags={filter.incTitle}
            onRemove={(v) => onPatch({ incTitle: filter.incTitle.filter((x) => x !== v) })}
          />
          <KeywordInput
            label="Exclude title"
            value={kw.xt}
            onChange={(v) => setKw((s) => ({ ...s, xt: v }))}
            onAdd={() => addKw("xt")}
            tags={filter.excTitle}
            onRemove={(v) => onPatch({ excTitle: filter.excTitle.filter((x) => x !== v) })}
          />
          <KeywordInput
            label="Include description (OR)"
            value={kw.id}
            onChange={(v) => setKw((s) => ({ ...s, id: v }))}
            onAdd={() => addKw("id")}
            tags={filter.incDesc}
            onRemove={(v) => onPatch({ incDesc: filter.incDesc.filter((x) => x !== v) })}
          />
          <KeywordInput
            label="Exclude description"
            value={kw.xd}
            onChange={(v) => setKw((s) => ({ ...s, xd: v }))}
            onAdd={() => addKw("xd")}
            tags={filter.excDesc}
            onRemove={(v) => onPatch({ excDesc: filter.excDesc.filter((x) => x !== v) })}
          />
          <p className="text-xs text-muted-foreground">
            Description keywords match the 300-char summary. Full-text search runs on the job detail page.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-accent/50">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="truncate">{label}</span>
    </label>
  );
}

function KeywordInput({
  label,
  value,
  onChange,
  onAdd,
  tags,
  onRemove,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  tags: string[];
  onRemove: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          placeholder="Add keyword…"
          className="h-8"
        />
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAdd}>
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1">
              {t}
              <button onClick={() => onRemove(t)} aria-label={`Remove ${t}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
