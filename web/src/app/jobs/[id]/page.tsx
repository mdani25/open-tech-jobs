import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { JobDetailClient } from "@/components/job-detail-client";
import type { JobsData } from "@/lib/types";
import { SITE } from "@/lib/site-config";

// Build-time read of the synced dataset so we can pre-render every job page and
// bake per-job SEO/OG metadata. (sync-data.mjs copies ../jobs.json -> public/data.)
function readJobs(): JobsData | null {
  const p = path.join(process.cwd(), "public", "data", "jobs.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as JobsData;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  const data = readJobs();
  if (!data?.jobs) return [];
  return data.jobs.map((j) => ({ id: j.jd_file.replace(/\.md$/, "") }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const data = readJobs();
  const job = data?.jobs.find((j) => j.jd_file === `${params.id}.md`);
  if (!job) {
    return { title: "Job not found", description: "This job may no longer be active." };
  }
  const description = `${job.title} at ${job.company} — ${job.location || "location n/a"}.${
    job.summary ? ` ${job.summary.slice(0, 160)}` : ""
  }`;
  return {
    title: `${job.title} · ${job.company}`,
    description,
    openGraph: {
      type: "article",
      title: `${job.title} · ${job.company}`,
      description,
      url: `${SITE.url}jobs/${params.id}/`,
      siteName: SITE.name,
    },
    twitter: { card: "summary", title: `${job.title} · ${job.company}`, description },
  };
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  return <JobDetailClient id={params.id} />;
}
