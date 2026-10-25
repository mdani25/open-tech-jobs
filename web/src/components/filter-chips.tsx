"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXPERIENCE_BUCKETS, type ExperienceBucket } from "@/lib/experience";
import { CATEGORY_LABELS } from "@/lib/categories";
import { windowLabel } from "@/lib/format";
import type { EmploymentType, FilterState, JobCategory, WorkMode } from "@/lib/types";

const WM_LABEL: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  "not-specified": "Work mode n/a",
};
const ET_LABEL: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  internship: "Internship",
  contract: "Contract",
  temporary: "Temporary",
  "graduate-trainee": "Graduate/Trainee",
  "not-specified": "Employment n/a",
};

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

interface FilterChipsProps {
  filter: FilterState;
  onPatch: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

export function FilterChips({ filter, onPatch, onClear, className }: FilterChipsProps) {
  const expLabel = (k: string) => EXPERIENCE_BUCKETS.find((b: ExperienceBucket) => b.key === k)?.label ?? k;

  const chips: Chip[] = [];
  if (filter.q.trim()) chips.push({ key: "q", label: `“${filter.q.trim()}”`, remove: () => onPatch({ q: "" }) });
  for (const v of filter.locations) chips.push({ key: `loc:${v}`, label: v, remove: () => onPatch({ locations: filter.locations.filter((x) => x !== v) }) });
  for (const v of filter.experience) chips.push({ key: `exp:${v}`, label: expLabel(v), remove: () => onPatch({ experience: filter.experience.filter((x) => x !== v) }) });
  if (filter.maxExperience !== null && filter.maxExperience !== 3) chips.push({ key: "maxexp", label: `Max ${filter.maxExperience} yrs`, remove: () => onPatch({ maxExperience: 3 }) });
  for (const v of filter.categories) chips.push({ key: `cat:${v}`, label: CATEGORY_LABELS[v as JobCategory] ?? v, remove: () => onPatch({ categories: filter.categories.filter((x) => x !== v) as JobCategory[] }) });
  for (const v of filter.workMode) chips.push({ key: `wm:${v}`, label: WM_LABEL[v as WorkMode] ?? v, remove: () => onPatch({ workMode: filter.workMode.filter((x) => x !== v) as WorkMode[] }) });
  for (const v of filter.employmentType) chips.push({ key: `et:${v}`, label: ET_LABEL[v as EmploymentType] ?? v, remove: () => onPatch({ employmentType: filter.employmentType.filter((x) => x !== v) as EmploymentType[] }) });
  for (const v of filter.companies) chips.push({ key: `co:${v}`, label: v, remove: () => onPatch({ companies: filter.companies.filter((x) => x !== v) }) });
  for (const v of filter.ats) chips.push({ key: `ats:${v}`, label: v, remove: () => onPatch({ ats: filter.ats.filter((x) => x !== v) as FilterState["ats"] }) });
  for (const v of filter.skills) chips.push({ key: `sk:${v}`, label: v, remove: () => onPatch({ skills: filter.skills.filter((x) => x !== v) }) });
  for (const v of filter.incTitle) chips.push({ key: `it:${v}`, label: `+title:${v}`, remove: () => onPatch({ incTitle: filter.incTitle.filter((x) => x !== v) }) });
  for (const v of filter.excTitle) chips.push({ key: `xt:${v}`, label: `-title:${v}`, remove: () => onPatch({ excTitle: filter.excTitle.filter((x) => x !== v) }) });
  for (const v of filter.incDesc) chips.push({ key: `id:${v}`, label: `+desc:${v}`, remove: () => onPatch({ incDesc: filter.incDesc.filter((x) => x !== v) }) });
  for (const v of filter.excDesc) chips.push({ key: `xd:${v}`, label: `-desc:${v}`, remove: () => onPatch({ excDesc: filter.excDesc.filter((x) => x !== v) }) });
  if (filter.dateWindow !== null && filter.dateWindow !== 7) chips.push({ key: "dw", label: windowLabel(filter.dateWindow), remove: () => onPatch({ dateWindow: 7 }) });
  if (filter.customFrom) chips.push({ key: "from", label: `Since ${filter.customFrom}`, remove: () => onPatch({ customFrom: null }) });

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((c) => (
        <Badge key={c.key} variant="outline" className="gap-1 py-1 pr-1">
          <span className="max-w-[16ch] truncate">{c.label}</span>
          <button
            type="button"
            aria-label={`Remove ${c.label}`}
            onClick={c.remove}
            className="rounded-sm p-0.5 hover:bg-foreground/10"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
}
