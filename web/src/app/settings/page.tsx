"use client";

import * as React from "react";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Star,
  Copy,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import {
  getSettings,
  saveSettings,
  resetSettings,
  getUserPresets,
  saveUserPreset,
  deleteUserPreset,
  getActivePresetId,
  setActivePresetId,
  type UserSettings,
  type ThemePref,
} from "@/lib/storage";
import { BUILTIN_PRESETS, type Preset, PAGE_SIZE_OPTIONS } from "@/lib/config-defaults";
import { SKILL_CATALOG } from "@/lib/skills";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/categories";
import { useData } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { config } = useData();
  const [settings, setSettings] = React.useState<UserSettings>(() => getSettings());
  const { setTheme } = useTheme();
  const [saved, setSaved] = React.useState(false);

  function patch(p: Partial<UserSettings>) {
    setSettings((s) => ({ ...s, ...p }));
  }

  function persist() {
    saveSettings(settings);
    if (settings.theme) setTheme(settings.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function doReset() {
    const defaults = resetSettings();
    setSettings(defaults);
  }

  const trackedCompanies = (config?.companies ?? []).map((c) => c.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <SettingsIcon className="h-6 w-6" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preferences are stored in your browser (local storage) and apply only to this device.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doReset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={persist}>
            <Save className="h-4 w-4" /> {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="search">
        <TabsList className="flex-wrap">
          <TabsTrigger value="search">Search defaults</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>

        {/* Search defaults */}
        <TabsContent value="search" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Search defaults</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingRow label="Default location">
                  <Input
                    value={settings.defaultLocation ?? ""}
                    onChange={(e) => patch({ defaultLocation: e.target.value || null })}
                    placeholder="Chennai"
                  />
                </SettingRow>
                <SettingRow label="Max experience (years)">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={settings.maxExperience}
                    onChange={(e) => patch({ maxExperience: Number(e.target.value) || 0 })}
                  />
                </SettingRow>
                <SettingRow label="Default date window (days)">
                  <Select
                    value={settings.defaultDateWindow === null ? "all" : String(settings.defaultDateWindow)}
                    onValueChange={(v) => patch({ defaultDateWindow: v === "all" ? null : Number(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All listings</SelectItem>
                      {[1, 2, 3, 7, 14, 30].map((n) => (
                        <SelectItem key={n} value={String(n)}>Last {n} day{n > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Default sort">
                  <Select
                    value={settings.sort}
                    onValueChange={(v) => patch({ sort: v as UserSettings["sort"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "newest", label: "Newest first" },
                        { value: "best-match", label: "Best skill match" },
                        { value: "relevance", label: "Search relevance" },
                        { value: "company-az", label: "Company A–Z" },
                        { value: "lowest-experience", label: "Lowest experience" },
                      ].map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Job categories</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {CATEGORY_ORDER.map((c) => {
                    const checked = settings.categories.includes(c);
                    return (
                      <label key={c} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-accent/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            patch({
                              categories: checked
                                ? settings.categories.filter((x) => x !== c)
                                : [...settings.categories, c],
                            })
                          }
                          className="rounded"
                        />
                        {CATEGORY_LABELS[c]}
                      </label>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <SettingRow label="Skill match mode">
                <Select
                  value={settings.skillMode}
                  onValueChange={(v) => patch({ skillMode: v as UserSettings["skillMode"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Match ANY skill</SelectItem>
                    <SelectItem value="all">Match ALL skills</SelectItem>
                    <SelectItem value="at-least">At least N skills</SelectItem>
                    <SelectItem value="exclude">Exclude skills</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              {settings.skillMode === "at-least" && (
                <SettingRow label="Skill threshold (N)">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.skillThreshold}
                    onChange={(e) => patch({ skillThreshold: Number(e.target.value) || 1 })}
                  />
                </SettingRow>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills */}
        <TabsContent value="skills" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Your skills</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Select the skills to pre-apply to the skill filter when you open the job search.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {SKILL_CATALOG.map((s) => {
                  const checked = settings.skills.includes(s.label);
                  return (
                    <label key={s.label} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-accent/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          patch({
                            skills: checked
                              ? settings.skills.filter((x) => x !== s.label)
                              : [...settings.skills, s.label],
                          })
                        }
                        className="rounded"
                      />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords */}
        <TabsContent value="keywords" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Keyword filters</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                These are applied in the job search automatically when you load the page. They use whole-word
                case-insensitive matching. Include lists use OR logic; exclude lists drop jobs if any keyword
                matches.
              </p>
              <KeywordEditor
                label="Include title keywords (OR — keep job if any keyword appears in title)"
                tags={settings.incTitle}
                onChange={(v) => patch({ incTitle: v })}
              />
              <KeywordEditor
                label="Exclude title keywords (drop job if any keyword appears in title)"
                tags={settings.excTitle}
                onChange={(v) => patch({ excTitle: v })}
              />
              <KeywordEditor
                label="Include description keywords (OR — keep job if any keyword appears in summary)"
                tags={settings.incDesc}
                onChange={(v) => patch({ incDesc: v })}
              />
              <KeywordEditor
                label="Exclude description keywords"
                tags={settings.excDesc}
                onChange={(v) => patch({ excDesc: v })}
              />
              {config && (
                <div className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Config defaults (from your config.json)</p>
                  <p className="mt-1">
                    Include: {config.keywords_include.slice(0, 6).join(", ")}{config.keywords_include.length > 6 ? ` +${config.keywords_include.length - 6} more` : ""}
                  </p>
                  <p className="mt-0.5">
                    Exclude: {config.keywords_exclude.slice(0, 6).join(", ")}{config.keywords_exclude.length > 6 ? ` +${config.keywords_exclude.length - 6} more` : ""}
                  </p>
                  <p className="mt-2">
                    Note: The Python collector applies these at collection time. The UI keyword filters are an
                    additional layer you can customize independently.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7"
                    onClick={() =>
                      patch({
                        incTitle: [...config.keywords_include],
                        excTitle: [...config.keywords_exclude],
                      })
                    }
                  >
                    Copy config defaults into UI filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presets */}
        <TabsContent value="presets" className="space-y-4 mt-4">
          <PresetsTab />
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Display</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Theme">
                <Select
                  value={settings.theme}
                  onValueChange={(v) => {
                    patch({ theme: v as ThemePref });
                    setTheme(v);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Results per page">
                <Select
                  value={String(settings.pageSize)}
                  onValueChange={(v) => patch({ pageSize: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- sub-components ---- */

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function KeywordEditor({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = React.useState("");
  function add() {
    const v = input.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setInput("");
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add keyword and press Enter…"
          className="h-8"
        />
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={add}>
          Add
        </Button>
        {tags.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange([])}>
            Clear
          </Button>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1">
              {t}
              <button onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function PresetsTab() {
  const [userPresets, setUserPresets] = React.useState<Preset[]>(() => getUserPresets());
  const [activeId, setActiveIdState] = React.useState<string | null>(() => getActivePresetId());
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  function refresh() {
    setUserPresets(getUserPresets());
  }

  function createBlank() {
    const name = newName.trim() || "New preset";
    const id = `custom-${Date.now()}`;
    saveUserPreset({ id, name, description: newDesc.trim() || "", overrides: {} });
    setNewName("");
    setNewDesc("");
    refresh();
  }

  function remove(id: string) {
    deleteUserPreset(id);
    if (activeId === id) {
      setActivePresetId(null);
      setActiveIdState(null);
    }
    refresh();
  }

  function setActive(id: string | null) {
    setActivePresetId(id);
    setActiveIdState(id);
  }

  const allPresets = [...BUILTIN_PRESETS, ...userPresets];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Create a preset</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Preset name" />
            <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" />
          </div>
          <p className="text-xs text-muted-foreground">
            After creating, apply the preset from the search page to populate its filter settings.
          </p>
          <Button onClick={createBlank}>
            <Plus className="h-4 w-4" /> Create preset
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {allPresets.map((p) => (
          <Card key={p.id} className={cn("transition-colors", activeId === p.id && "border-primary/60")}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  {p.builtIn && <Badge variant="secondary">Built-in</Badge>}
                  {activeId === p.id && <Badge variant="default">Active</Badge>}
                </div>
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant={activeId === p.id ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Set as default"
                  onClick={() => setActive(activeId === p.id ? null : p.id)}
                >
                  <Star className={cn("h-4 w-4", activeId === p.id && "fill-current")} />
                </Button>
                {!p.builtIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label="Delete preset"
                    onClick={() => remove(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
