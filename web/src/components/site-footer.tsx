import Link from "next/link";
import { Github } from "lucide-react";
import { SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container flex flex-col gap-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-foreground">{SITE.name}</span> — auto-updating tech
            jobs with direct apply links. Built around your real{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">jobs.json</code> data.
          </p>
          <p className="text-xs">
            Data source: public company career-board APIs (Greenhouse, Lever, Ashby,
            SmartRecruiters, Workday, Amazon). No scraping. License: {SITE.license}.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs md:items-end">
          <p>
            Browsing & saved-jobs data stays in your browser (local storage). It does not sync across
            devices.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/resources" className="hover:text-foreground">
              Resources
            </Link>
            <Link href="/settings" className="hover:text-foreground">
              Settings
            </Link>
            <a
              href={SITE.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
