import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { CompanyDetailClient } from "@/components/company-detail-client";
import type { AppConfig } from "@/lib/types";
import { SITE } from "@/lib/site-config";

function readConfig(): AppConfig | null {
  const p = path.join(process.cwd(), "public", "data", "config.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as AppConfig;
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function generateStaticParams() {
  const config = readConfig();
  if (!config) return [];
  const tracked = (config.companies ?? []).map((c) => ({ slug: slugify(c.name) }));
  const manual = (config.direct_links ?? []).map((d) => ({ slug: slugify(d.name) }));
  // Dedupe by slug (in case a name collides).
  const seen = new Set<string>();
  return [...tracked, ...manual].filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const config = readConfig();
  const all = [
    ...(config?.companies ?? []).map((c) => ({ name: c.name, slug: slugify(c.name) })),
    ...(config?.direct_links ?? []).map((d) => ({ name: d.name, slug: slugify(d.name) })),
  ];
  const match = all.find((c) => c.slug === params.slug);
  return {
    title: match ? `${match.name} jobs` : "Company",
    description: match
      ? `Open roles and career page for ${match.name}.`
      : "Company career page.",
    openGraph: { title: match ? `${match.name} — Open Tech Jobs` : SITE.name, url: `${SITE.url}companies/${params.slug}/` },
  };
}

export default function CompanyDetailPage({ params }: { params: { slug: string } }) {
  return <CompanyDetailClient slug={params.slug} />;
}
