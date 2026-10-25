"use client";

import React from "react";
import {
  Plus,
  Download,
  Upload,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useData } from "@/hooks/use-data";
import { careersUrlFor, ATS_LABEL } from "@/lib/companies";
import type { AppConfig, AtsProvider, CompanyConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

// Suggested companies for onboarding (not verified IDs — shown separately).
const SUGGESTED_COMPANIES: Array<{ name: string; ats: AtsProvider; id?: string; note?: string }> = [
  { name: "Zoho", ats: "lever", id: "zoho", note: "Verify ID on careers page" },
  { name: "BrowserStack", ats: "lever", id: "browserstack" },
  { name: "Atlassian", ats: "greenhouse", id: "atlassian" },
  { name: "Chargebee", ats: "lever", id: "chargebee", note: "Verify ID" },
  { name: "Snowflake", ats: "greenhouse", id: "snowflake" },
  { name: "MongoDB", ats: "greenhouse", id: "mongodb" },
  { name: "Elastic", ats: "greenhouse", id: "elastic" },
  { name: "GitLab", ats: "greenhouse", id: "gitlab" },
  { name: "DigitalOcean", ats: "greenhouse", id: "digitalocean" },
  { name: "Anthropic", ats: "greenhouse", id: "anthropic" },
  { name: "Cisco", ats: "smartrecruiters", id: "cisco" },
  { name: "PayPal", ats: "workday", note: "Uses Eightfold/custom portal — verify first" },
  { name: "IBM", ats: "greenhouse", note: "Board ID may vary by region — verify first" },
  { name: "Adobe", ats: "greenhouse", id: "adobe" },
  { name: "NVIDIA", ats: "greenhouse", id: "nvidia" },
];

// localStorage key for pending edits (not committed to repo).
const EDITS_KEY = "otj_admin_companies_edits_v1";

interface PendingEdits {
  added: CompanyConfig[];
  disabled: string[]; // company names
  removed: string[];
}

function loadEdits(): PendingEdits {
  try {
    const raw = localStorage.getItem(EDITS_KEY);
    if (!raw) return { added: [], disabled: [], removed: [] };
    return JSON.parse(raw) as PendingEdits;
  } catch {
    return { added: [], disabled: [], removed: [] };
  }
}

function saveEdits(e: PendingEdits) {
  try {
    localStorage.setItem(EDITS_KEY, JSON.stringify(e));
  } catch {}
}

const EMPTY_COMPANY: CompanyConfig = {
  name: "",
  ats: "greenhouse",
  id: "",
  enabled: true,
};

export default function AdminCompaniesPage() {
  const { config, jobs } = useData();
  const [q, setQ] = React.useState("");
  const [edits, setEdits] = React.useState<PendingEdits>(loadEdits);
  const [showAdd, setShowAdd] = React.useState(false);
  const [editing, setEditing] = React.useState<CompanyConfig | null>(null);
  const [showSuggested, setShowSuggested] = React.useState(false);
  const [removeConfirm, setRemoveConfirm] = React.useState<string | null>(null);
  const [importText, setImportText] = React.useState("");
  const [importError, setImportError] = React.useState("");
  const [showImport, setShowImport] = React.useState(false);

  const patchEdits = React.useCallback((p: Partial<PendingEdits>) => {
    setEdits((e) => {
      const next = { ...e, ...p };
      saveEdits(next);
      return next;
    });
  }, []);

  // Effective company list = config + added, minus removed.
  const allCompanies: CompanyConfig[] = React.useMemo(() => {
    const base = config?.companies ?? [];
    const removed = new Set(edits.removed);
    const disabled = new Set(edits.disabled);
    const result = base
      .filter((c) => !removed.has(c.name))
      .map((c) => ({ ...c, enabled: !disabled.has(c.name) && (c.enabled ?? true) }));
    for (const a of edits.added) {
      if (!result.find((c) => c.name === a.name)) result.push({ ...a, enabled: a.enabled ?? true });
    }
    return result;
  }, [config, edits]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allCompanies;
    return allCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.ats ?? "").includes(query) ||
        (c.id ?? "").includes(query),
    );
  }, [allCompanies, q]);

  const jobCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) m.set(j.company, (m.get(j.company) ?? 0) + 1);
    return m;
  }, [jobs]);

  function toggleEnabled(name: string, current: boolean) {
    if (current) {
      patchEdits({ disabled: [...new Set([...edits.disabled, name])] });
    } else {
      patchEdits({ disabled: edits.disabled.filter((x) => x !== name) });
    }
  }

  function confirmRemove(name: string) {
    setRemoveConfirm(name);
  }

  function doRemove() {
    if (!removeConfirm) return;
    patchEdits({
      removed: [...new Set([...edits.removed, removeConfirm])],
      added: edits.added.filter((c) => c.name !== removeConfirm),
      disabled: edits.disabled.filter((x) => x !== removeConfirm),
    });
    setRemoveConfirm(null);
  }

  function saveCompany(c: CompanyConfig) {
    patchEdits({
      added: [...edits.added.filter((x) => x.name !== c.name), c],
    });
    setShowAdd(false);
    setEditing(null);
  }

  function exportConfig() {
    if (!config) return;
    const out: AppConfig = { ...config, companies: allCompanies };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson() {
    setImportError("");
    try {
      const parsed = JSON.parse(importText);
      const arr: CompanyConfig[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.companies)
        ? parsed.companies
        : null;
      if (!arr) {
        setImportError("Expected an array of companies or an object with a 'companies' array.");
        return;
      }
      // Validate: each entry must have name + ats
      for (const c of arr) {
        if (typeof c.name !== "string" || !c.name || typeof c.ats !== "string") {
          setImportError(`Invalid entry — missing 'name' or 'ats': ${JSON.stringify(c).slice(0, 80)}`);
          return;
        }
      }
      const dupes = arr.filter((c) => allCompanies.find((x) => x.name === c.name)).map((c) => c.name);
      if (dupes.length) {
        setImportError(`Duplicate names (already configured): ${dupes.join(", ")}. Remove or rename them first.`);
        return;
      }
      patchEdits({ added: [...edits.added, ...arr.filter((c) => !edits.added.find((x) => x.name === c.name))] });
      setImportText("");
      setShowImport(false);
    } catch {
      setImportError("Invalid JSON. Paste a companies array or full config.json.");
    }
  }

  const hasPending = edits.added.length > 0 || edits.disabled.length > 0 || edits.removed.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Company management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Changes are saved locally and exported as a new <code>config.json</code> for you to commit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPending && (
            <Button onClick={exportConfig}>
              <Download className="h-4 w-4" /> Export config.json
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => { setEditing({ ...EMPTY_COMPANY }); setShowAdd(true); }}>
            <Plus className="h-4 w-4" /> Add company
          </Button>
        </div>
      </div>

      {hasPending && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-3 text-sm">
            <p className="font-medium text-warning">Pending changes</p>
            <p className="text-muted-foreground mt-0.5">
              {edits.added.length > 0 && `${edits.added.length} added. `}
              {edits.disabled.length > 0 && `${edits.disabled.length} disabled. `}
              {edits.removed.length > 0 && `${edits.removed.length} removed. `}
              Export config.json and commit it to apply.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => { patchEdits({ added: [], disabled: [], removed: [] }); }}
            >
              Discard all pending changes
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No companies match" />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CompanyRow
              key={c.name}
              c={c}
              jobCount={jobCounts.get(c.name) ?? 0}
              isPending={edits.added.some((a) => a.name === c.name)}
              onEdit={() => { setEditing({ ...c }); setShowAdd(true); }}
              onToggle={() => toggleEnabled(c.name, c.enabled ?? true)}
              onRemove={() => confirmRemove(c.name)}
            />
          ))}
        </div>
      )}

      {/* Suggested companies */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowSuggested((s) => !s)}>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Suggested companies to onboard ({SUGGESTED_COMPANIES.length})</span>
            {showSuggested ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showSuggested && (
          <CardContent className="space-y-2 pt-0">
            <p className="text-xs text-muted-foreground">
              These board IDs are best-effort suggestions. Use{" "}
              <code>python scripts/update_jobs.py --check</code> to verify each one before enabling. Only
              add when you've confirmed the integration works.
            </p>
            <div className="space-y-1.5">
              {SUGGESTED_COMPANIES.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    {s.id && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{s.ats}/{s.id}</span>}
                    {s.note && <span className="ml-1.5 text-xs text-warning"> ⚠ {s.note}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={allCompanies.some((c) => c.name === s.name)}
                    onClick={() => {
                      setEditing({ name: s.name, ats: s.ats, id: s.id, enabled: false });
                      setShowAdd(true);
                    }}
                  >
                    {allCompanies.some((c) => c.name === s.name) ? "Already added" : "Add (verify first)"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Add/edit dialog */}
      <CompanyFormDialog
        open={showAdd}
        initial={editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSave={saveCompany}
      />

      {/* Remove confirmation */}
      <Dialog open={!!removeConfirm} onOpenChange={(o) => !o && setRemoveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeConfirm}?</DialogTitle>
            <DialogDescription>
              This removes the company from the configuration export. It does NOT modify the live{" "}
              <code>config.json</code> until you export and commit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={(o) => { if (!o) { setShowImport(false); setImportError(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import companies</DialogTitle>
            <DialogDescription>
              Paste a JSON array of company objects, or a full config.json. Each entry needs at least{" "}
              <code>name</code> and <code>ats</code>.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-48">
            <textarea
              className="h-full w-full rounded border border-input bg-background p-2 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[{ "name": "Acme", "ats": "greenhouse", "id": "acme" }]'
            />
          </ScrollArea>
          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={importJson}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyRow({
  c,
  jobCount,
  isPending,
  onEdit,
  onToggle,
  onRemove,
}: {
  c: CompanyConfig;
  jobCount: number;
  isPending: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const enabled = c.enabled ?? true;
  const careersUrl = c.careersUrl ?? careersUrlFor(c);
  return (
    <Card className={cn("transition-colors", !enabled && "opacity-60")}>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{c.name}</span>
            <Badge variant="secondary">{c.ats ? ATS_LABEL[c.ats] : c.ats}</Badge>
            {c.id && <span className="font-mono text-xs text-muted-foreground">id: {c.id}</span>}
            {isPending && <Badge variant="warning">Pending</Badge>}
            {!enabled && <Badge variant="muted">Disabled</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {jobCount} job{jobCount === 1 ? "" : "s"} in dataset
            {c.search ? ` · search: ${c.search}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {careersUrl && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Open career page">
              <a href={careersUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={enabled ? "Disable" : "Enable"}
            onClick={onToggle}
          >
            {enabled ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            aria-label="Remove"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CompanyFormDialogProps {
  open: boolean;
  initial: CompanyConfig | null;
  onClose: () => void;
  onSave: (c: CompanyConfig) => void;
}

function CompanyFormDialog({ open, initial, onClose, onSave }: CompanyFormDialogProps) {
  const [form, setForm] = React.useState<CompanyConfig>(initial ?? { ...EMPTY_COMPANY });
  React.useEffect(() => { if (initial) setForm({ ...initial }); }, [initial]);

  const patch = (p: Partial<CompanyConfig>) => setForm((f) => ({ ...f, ...p }));

  const ATS_OPTIONS: AtsProvider[] = ["greenhouse", "lever", "ashby", "smartrecruiters", "workday", "amazon"];

  function submit() {
    if (!form.name.trim()) return;
    if (!form.ats) return;
    onSave({ ...form, name: form.name.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.name ? `Edit ${initial.name}` : "Add company"}</DialogTitle>
          <DialogDescription>
            Use <code>python scripts/update_jobs.py --check</code> to validate a new company before enabling it.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-1">
            <FormRow label="Company name *">
              <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Acme Corp" />
            </FormRow>
            <FormRow label="ATS provider *">
              <Select value={form.ats ?? "greenhouse"} onValueChange={(v) => patch({ ats: v as AtsProvider, id: "", host: "", tenant: "", site: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATS_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{ATS_LABEL[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            {(form.ats === "greenhouse" || form.ats === "lever" || form.ats === "ashby" || form.ats === "smartrecruiters") && (
              <FormRow label="Board ID *">
                <Input value={form.id ?? ""} onChange={(e) => patch({ id: e.target.value })} placeholder="e.g. razorpay" />
                <p className="text-xs text-muted-foreground mt-1">
                  From the career-page URL: boards.greenhouse.io/<strong>id</strong>, jobs.lever.co/<strong>id</strong>, etc.
                </p>
              </FormRow>
            )}

            {form.ats === "amazon" && (
              <FormRow label="Search queries (one per line)">
                <textarea
                  className="w-full rounded border border-input bg-background p-2 text-sm"
                  rows={4}
                  value={(form.queries ?? []).join("\n")}
                  onChange={(e) => patch({ queries: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })}
                  placeholder={"software engineer\nfull stack\ngraduate"}
                />
              </FormRow>
            )}

            {form.ats === "workday" && (
              <>
                <FormRow label="Workday host *">
                  <Input value={form.host ?? ""} onChange={(e) => patch({ host: e.target.value })} placeholder="company.wd5.myworkdayjobs.com" />
                </FormRow>
                <FormRow label="Workday tenant *">
                  <Input value={form.tenant ?? ""} onChange={(e) => patch({ tenant: e.target.value })} placeholder="company" />
                </FormRow>
                <FormRow label="Workday site *">
                  <Input value={form.site ?? ""} onChange={(e) => patch({ site: e.target.value })} placeholder="External_Career_Site" />
                </FormRow>
                <FormRow label="Location search">
                  <Input value={form.search ?? ""} onChange={(e) => patch({ search: e.target.value })} placeholder="Chennai" />
                </FormRow>
              </>
            )}

            <Separator />

            <FormRow label="Website (optional)">
              <Input value={form.website ?? ""} onChange={(e) => patch({ website: e.target.value })} placeholder="https://company.com" />
            </FormRow>
            <FormRow label="Careers page URL (optional override)">
              <Input value={form.careersUrl ?? ""} onChange={(e) => patch({ careersUrl: e.target.value })} placeholder="Auto-derived from ATS if left blank" />
            </FormRow>
            <FormRow label="Logo URL (optional)">
              <Input value={form.logoUrl ?? ""} onChange={(e) => patch({ logoUrl: e.target.value })} placeholder="https://…" />
            </FormRow>
            <FormRow label="Notes (optional)">
              <Input value={form.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} />
            </FormRow>

            <div className="flex items-center gap-2">
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled ?? true}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="enabled">Enabled (include in next collector run)</Label>
            </div>

            {!(form.ats === "amazon" || form.ats === "workday") && (
              <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning" />
                Always verify the board ID with{" "}
                <code>python scripts/update_jobs.py --check</code> before enabling. An incorrect ID will show
                FAIL in the coverage report.
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name.trim() || !form.ats}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
