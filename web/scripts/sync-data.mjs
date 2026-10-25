// Copies the tracker's published data from the repository root into the web
// app's public/ folder so it ships with the static export and is available to
// the browser (browser-side filtering). Run automatically via prebuild/predev.
//
// Source (repo root):  ../jobs.json, ../config.json, ../jds/*.md
// Destination:          ./public/data/
import {
  mkdirSync,
  readdirSync,
  copyFileSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(webRoot, "..");
const dest = resolve(webRoot, "public", "data");

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function copyIfExists(srcRel, destName) {
  const src = resolve(repoRoot, srcRel);
  if (!existsSync(src)) {
    console.warn(`[sync-data] warning: ${srcRel} not found at repo root; skipping.`);
    return 0;
  }
  copyFileSync(src, resolve(dest, destName));
  return 1;
}

ensureDir(dest);
ensureDir(resolve(dest, "jds"));

let copied = 0;
copied += copyIfExists("jobs.json", "jobs.json");
copied += copyIfExists("config.json", "config.json");

// Copy all job-description markdown files (jds/*.md) so job detail pages can
// fetch the full description by jd_file name.
const jdDir = resolve(repoRoot, "jds");
let jdCount = 0;
if (existsSync(jdDir)) {
  const files = readdirSync(jdDir).filter((f) => f.endsWith(".md"));
  for (const f of files) {
    copyFileSync(join(jdDir, f), resolve(dest, "jds", f));
    jdCount++;
  }
}

// A small manifest so the client knows the data "updated" timestamp and counts
// without having to parse jobs.json on every page.
let manifest = { updated: null, count: 0, jdCount, generatedAt: new Date().toISOString() };
try {
  const jobs = JSON.parse(readFileSync(resolve(repoRoot, "jobs.json"), "utf8"));
  manifest = {
    updated: jobs.updated ?? null,
    count: jobs.count ?? (jobs.jobs?.length ?? 0),
    jdCount,
    generatedAt: new Date().toISOString(),
  };
} catch {
  // keep default manifest
}
writeFileSync(resolve(dest, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(
  `[sync-data] copied ${copied} root data file(s) and ${jdCount} JD file(s) -> public/data`,
);
