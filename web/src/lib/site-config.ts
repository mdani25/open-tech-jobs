// Central site configuration: identity, repository, and navigation. These values
// are the single source of truth so headers, footer, SEO, and links stay in sync.

export const SITE = {
  name: "Open Tech Jobs",
  shortName: "Open Tech Jobs",
  description:
    "Auto-updating list of IT and tech job openings with direct apply links, fetched from official company career-board APIs. Chennai, fresher to ~3 years.",
  repo: "https://github.com/mdani25/open-tech-jobs",
  url: "https://mdani25.github.io/open-tech-jobs/",
  owner: "Manikandan S.",
  ownerLocation: "Chennai, Tamil Nadu, India",
  license: "MIT",
  primaryLocation: "Chennai",
} as const;

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name reference, resolved in the header
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Find Jobs", href: "/jobs", icon: "Briefcase" },
  { label: "Companies", href: "/companies", icon: "Building2" },
  { label: "Saved Jobs", href: "/saved", icon: "Bookmark" },
  { label: "Career Resources", href: "/resources", icon: "Compass" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Admin", href: "/admin", icon: "ShieldCheck" },
];
