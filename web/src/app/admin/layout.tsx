import type { Metadata } from "next";
import { AdminNav } from "@/components/admin-nav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
        <strong>Admin area.</strong> Changes to companies and configuration export as JSON for you to commit
        manually. No credentials are stored in the browser; backend integration is optional and not required
        for job browsing.
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
