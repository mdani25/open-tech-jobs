"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  Send,
  Activity,
  BarChart2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: ShieldCheck },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/filters", label: "Filters", icon: SlidersHorizontal },
  { href: "/admin/sources", label: "Sources", icon: Database },
  { href: "/admin/telegram", label: "Telegram", icon: Send },
  { href: "/admin/automation", label: "Automation", icon: Activity },
  { href: "/admin/coverage", label: "Coverage", icon: BarChart2 },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col" aria-label="Admin navigation">
      {links.map((l) => {
        const Icon = l.icon;
        const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href + "/"));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent",
              active && "bg-accent text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
