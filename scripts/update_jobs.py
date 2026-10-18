#!/usr/bin/env python3
"""Fetch tech jobs from public job-board APIs (Greenhouse, Lever, Ashby, SmartRecruiters,
Workday, Amazon), filter by location / seniority / required years / title, flag
resume-skill matches, save JDs, build time-window pages, quick-search links, a coverage
report, and send Telegram alerts. Standard library only.

Usage:  python scripts/update_jobs.py                 # normal run
        python scripts/update_jobs.py --days 5,45     # also build custom windows
        python scripts/update_jobs.py --check         # per-company diagnostics
        python scripts/update_jobs.py --test-telegram
"""
import hashlib, json, os, re, time, sys, html, urllib.request, urllib.error
from urllib.parse import quote, quote_plus
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
JOBS_JSON, JOBS_MD, SEARCH_MD = ROOT / "jobs.json", ROOT / "JOBS.md", ROOT / "SEARCH.md"
JD_DIR, WIN_DIR = ROOT / "jds", ROOT / "windows"
NOW = datetime.now(timezone.utc)


# ---------- helpers ----------
def fetch_json(url, body=None, tries=3):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"User-Agent": "Mozilla/5.0 open-tech-jobs/1.0", "Accept": "application/json"}
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    for i in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                raise
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"failed: {url}")


def html_to_text(s):
    s = html.unescape(s or "")
    s = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</h[1-6]>|</ul>|</ol>|</li>", "\n", s)
    s = re.sub(r"(?i)<li[^>]*>", "- ", s)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    lines = [re.sub(r"[ \t\u00a0]+", " ", l).strip() for l in s.split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def parse_dt(v):
    if not v:
        return None
    try:
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v / 1000 if v > 1e11 else v, tz=timezone.utc)
        s = " ".join(str(v).split())
        for fmt in ("%B %d, %Y", "%b %d, %Y"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def rel_posted(text):
    """'Posted 3 Days Ago' / 'Posted Today' -> datetime"""
    t = (text or "").lower()
    if "today" in t:
        return NOW
    if "yesterday" in t:
        return NOW - timedelta(days=1)
    m = re.search(r"(\d+)\+?\s*(hour|day|week|month)", t)
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2)
    return NOW - timedelta(**{unit + "s": n}) if unit != "month" else NOW - timedelta(days=30 * n)


def iso(d):
    return d.astimezone(timezone.utc).isoformat() if d else None


# ---------- fetchers ----------
def greenhouse(c):
    d = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{c['id']}/jobs?content=true")
    return [{"title": j["title"], "location": (j.get("location") or {}).get("name", ""),
             "url": j["absolute_url"], "desc": html_to_text(j.get("content")),
             "posted": iso(parse_dt(j.get("first_published") or j.get("updated_at")))}
            for j in d.get("jobs", [])]


def lever(c):
    d = fetch_json(f"https://api.lever.co/v0/postings/{c['id']}?mode=json")
    out = []
    for j in d:
        parts = [j.get("descriptionPlain", "")]
        for l in j.get("lists") or []:
            parts.append(f"{l.get('text', '')}\n{html_to_text(l.get('content'))}")
        parts.append(j.get("additionalPlain", ""))
        out.append({"title": j["text"], "location": (j.get("categories") or {}).get("location", "") or "",
                    "url": j["hostedUrl"], "desc": "\n\n".join(p for p in parts if p).strip(),
                    "posted": iso(parse_dt(j.get("createdAt")))})
    return out


def ashby(c):
    d = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{c['id']}")
    out = []
    for j in d.get("jobs", []):
        loc = j.get("location", "") or ""
        if j.get("isRemote") and "remote" not in loc.lower():
            loc = (loc + " (Remote)").strip()
        out.append({"title": j["title"], "location": loc, "url": j["jobUrl"],
                    "desc": j.get("descriptionPlain") or html_to_text(j.get("descriptionHtml")),
                    "posted": iso(parse_dt(j.get("publishedAt") or j.get("publishedDate")))})
    return out


def smartrecruiters(c):
    out, offset = [], 0
    while offset < 500:
        d = fetch_json(f"https://api.smartrecruiters.com/v1/companies/{c['id']}/postings?limit=100&offset={offset}")
        items = d.get("content", [])
        for j in items:
            loc = j.get("location") or {}
            out.append({"title": j["name"],
                        "location": ", ".join(x for x in [loc.get("city"), loc.get("country", "").upper()] if x),
                        "url": f"https://jobs.smartrecruiters.com/{c['id']}/{j['id']}", "desc": "",
                        "posted": iso(parse_dt(j.get("releasedDate"))),
                        "detail": ("sr", f"https://api.smartrecruiters.com/v1/companies/{c['id']}/postings/{j['id']}")})
        if len(items) < 100:
            break
        offset += 100
    return out


def workday(c):
    base = f"https://{c['host']}/wday/cxs/{c['tenant']}/{c['site']}"
    search = c.get("search", "Chennai")
    out, offset, total = [], 0, None
    while offset < 400:
        d = fetch_json(base + "/jobs", body={"appliedFacets": {}, "limit": 20, "offset": offset, "searchText": search})
        posts = d.get("jobPostings", [])
        if total is None:
            total = d.get("total", 0)
        for p in posts:
            loc = p.get("locationsText", "") or ""
            if re.match(r"\s*\d+\s+locations?", loc.lower()):
                loc = f"{loc} (incl. {search})"
            out.append({"title": p["title"], "location": loc,
                        "url": f"https://{c['host']}/en-US/{c['site']}{p['externalPath']}", "desc": "",
                        "posted": iso(rel_posted(p.get("postedOn"))),
                        "detail": ("workday", base + p["externalPath"])})
        offset += 20
        if not posts or offset >= (total or 0):
            break
    return out


def amazon(c):
    seen, out = set(), []
    for q in c.get("queries", ["software engineer"]):
        d = fetch_json("https://www.amazon.jobs/en/search.json?base_query=" + quote_plus(q) +
                       "&loc_query=Chennai&country=IND&result_limit=100&sort=recent")
        for j in d.get("jobs", []):
            url = "https://www.amazon.jobs" + j["job_path"]
            if url in seen:
                continue
            seen.add(url)
            desc = "\n\n".join(x for x in [html_to_text(j.get("description")),
                                           "Basic qualifications\n" + html_to_text(j.get("basic_qualifications")),
                                           "Preferred qualifications\n" + html_to_text(j.get("preferred_qualifications"))] if x)
            out.append({"title": j["title"], "location": j.get("normalized_location") or j.get("location", ""),
                        "url": url, "desc": desc, "posted": iso(parse_dt(j.get("posted_date")))})
    return out


def detail_fetch(kind, url):
    d = fetch_json(url)
    if kind == "sr":
        secs = (d.get("jobAd") or {}).get("sections") or {}
        parts = []
        for key in ("jobDescription", "qualifications", "additionalInformation"):
            s = secs.get(key) or {}
            if s.get("text"):
                parts.append(f"{s.get('title', '')}\n{html_to_text(s['text'])}")
        return {"desc": "\n\n".join(parts)}
    info = d.get("jobPostingInfo") or {}
    return {"desc": html_to_text(info.get("jobDescription")), "posted": iso(parse_dt(info.get("startDate")))}


FETCHERS = {"greenhouse": greenhouse, "lever": lever, "ashby": ashby, "smartrecruiters": smartrecruiters,
            "workday": workday, "amazon": amazon}

# ---------- filtering ----------
YEARS = re.compile(r"(\d{1,2})\s*(?:\+|-|–|to)?\s*(?:\d{1,2})?\s*\+?\s*years?", re.I)


def min_years_required(text):
    vals = []
    for sent in re.split(r"[.\n;]", text or ""):
        if "experience" in sent.lower():
            m = YEARS.search(sent)
            if m:
                vals.append(int(m.group(1)))
    return min(vals) if vals else None


def has_word(text, kw):
    return re.search(r"(?<![a-z0-9])" + re.escape(kw) + r"(?![a-z0-9])", text) is not None


def loc_ok(job):
    locs = [l.lower() for l in CONFIG.get("locations", [])]
    return not locs or any(l in job["location"].lower() for l in locs)


def title_ok(job):
    t = job["title"].lower() + " "
    return any(k in t for k in CONFIG["keywords_include"]) and not any(k in t for k in CONFIG["keywords_exclude"])


def matched_skills(job):
    text = (job["title"] + " " + job.get("desc", "")).lower()
    return [s for s in CONFIG.get("resume_skills", []) if has_word(text, s)]


def run(c):
    st = {"fetched": 0, "location": 0, "title": 0, "final": 0}
    try:
        out = []
        for j in FETCHERS[c["ats"]](c):
            st["fetched"] += 1
            if not loc_ok(j):
                continue
            st["location"] += 1
            if not title_ok(j):
                continue
            st["title"] += 1
            if not j.get("desc") and j.get("detail"):
                try:
                    extra = detail_fetch(*j["detail"])
                    j["desc"] = extra.get("desc", "")
                    j["posted"] = extra.get("posted") or j.get("posted")
                except Exception:
                    j["desc"] = ""
            yrs = min_years_required(j.get("desc"))
            if yrs is not None and yrs > CONFIG.get("max_years_required", 99):
                continue
            j.pop("detail", None)
            j["company"] = c["name"]
            j["years"] = yrs
            j["matched"] = matched_skills(j)
            j["match"] = len(j["matched"])
            st["final"] += 1
            out.append(j)
        return c["name"], out, None, st
    except Exception as e:
        return c["name"], None, str(e)[:150], st


# ---------- age / labels ----------
def age_days(j):
    return (NOW - datetime.fromisoformat(j["posted"])).total_seconds() / 86400


def ago(j):
    d = max(age_days(j), 0)
    s = f"{int(d * 24)}h ago" if d < 1 else f"{int(d)}d ago"
    return s if j.get("posted_exact", True) else s + "*"


def win_label(n):
    return "Last 24 hours" if n == 1 else f"Last {n} days" + (" (1 month)" if n in (30, 31) else " (1 year)" if n == 365 else "")


def win_file(n):
    return f"last-{n}d.md"


def custom_days():
    vals, raw = [], [os.environ.get("CUSTOM_DAYS", "")]
    if "--days" in sys.argv:
        raw.append(sys.argv[sys.argv.index("--days") + 1])
    for r in raw:
        for p in re.split(r"[,\s]+", r or ""):
            if p.isdigit() and 1 <= int(p) <= 365:
                vals.append(int(p))
    return vals


# ---------- JD files ----------
def jd_name(url):
    return hashlib.sha1(url.encode()).hexdigest()[:10] + ".md"


def write_jd(j):
    desc = (j.get("desc") or "").strip()
    cap = CONFIG.get("jd_max_chars", 8000)
    body = desc[:cap] or "_JD not available through the API. Open the Apply link._"
    if desc and len(desc) > cap:
        body += "\n\n_(truncated - see Apply link for the full text)_"
    head = [f"# {j['title']}", "",
            f"- **Company:** {j['company']}", f"- **Location:** {j['location'] or '-'}",
            f"- **Posted:** {j['posted'][:10]}{'' if j.get('posted_exact', True) else ' (date first seen)'}",
            f"- **Experience mentioned:** {str(j['years']) + '+ yrs' if j.get('years') is not None else 'not stated'}",
            f"- **Matches your skills:** {', '.join(j['matched']) or '-'}",
            f"- **Apply:** {j['url']}", "", "---", ""]
    (JD_DIR / j["jd_file"]).write_text("\n".join(head) + body + "\n", encoding="utf-8")


def short(desc, n):
    t = " ".join((desc or "").split())
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + "..."


# ---------- Telegram ----------
def tg_send(text):
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        return False
    data = json.dumps({"chat_id": chat, "text": text[:4000], "parse_mode": "HTML",
                       "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=30).read()
        return True
    except Exception as e:
        print(f"  ! telegram error: {e}", file=sys.stderr)
        return False


def tg_job_message(j):
    e = html.escape
    repo = os.environ.get("GITHUB_REPOSITORY")
    jd_link = f' | <a href="https://github.com/{repo}/blob/main/jds/{j["jd_file"]}">Full JD</a>' if repo else ""
    stars = "⭐" * min(max(j["match"] // 2, 1), 3)
    lines = [f"{stars} <b>{e(j['title'])}</b>",
             f"🏢 {e(j['company'])}  📍 {e(j['location'] or '-')}  🕒 {ago(j)}"]
    if j["matched"]:
        lines.append("🧩 " + e(", ".join(j["matched"][:8])))
    lines.append("🎓 " + (f"{j['years']}+ yrs mentioned" if j.get("years") is not None else "experience not stated"))
    if j.get("desc"):
        lines += ["", e(short(j["desc"], CONFIG.get("telegram", {}).get("jd_chars", 900)))]
    lines += ["", f'🔗 <a href="{e(j["url"])}">Apply</a>{jd_link}']
    return "\n".join(lines)


def send_alerts(new_jobs, first_run):
    cfg = CONFIG.get("telegram", {})
    if not os.environ.get("TELEGRAM_BOT_TOKEN"):
        print("telegram: no token set, skipping")
        return
    ms = cfg.get("min_match", 2)
    if first_run:
        tg_send(f"✅ Job tracker is live. Initial load: {len(new_jobs)} jobs "
                f"({sum(1 for j in new_jobs if j['match'] >= ms)} strong matches). "
                "Alerts for new jobs start from the next run.")
        return
    hits = [j for j in new_jobs if j["match"] >= ms and age_days(j) <= cfg.get("max_age_days", 3)]
    hits.sort(key=lambda j: j["match"], reverse=True)
    cap = cfg.get("max_per_run", 25)
    for j in hits[:cap]:
        tg_send(tg_job_message(j))
        time.sleep(1)
    if len(hits) > cap:
        tg_send(f"...and {len(hits) - cap} more new matches. See JOBS.md.")
    print(f"telegram: sent {min(len(hits), cap)} alerts")


# ---------- markdown ----------
def esc(s):
    return (s or "").replace("|", "/").replace("\n", " ").strip()


def table(rows, jd_prefix):
    lines = ["| Match | Company | Role | Location | Posted | Apply | JD |", "|---|---|---|---|---|---|---|"]
    for j in rows:
        m = j.get("match", 0)
        star = "⭐" * min(m // 2, 3) if m >= 2 else ""
        lines.append(f"| {star} | {esc(j['company'])} | {esc(j['title'])} | {esc(j['location']) or '-'} "
                     f"| {ago(j)} | [Apply]({j['url']}) | [JD]({jd_prefix}jds/{j['jd_file']}) |")
    return "\n".join(lines)


NOTE = "_* = posting date not provided by the company, so this is the date the tracker first saw the job._"


def pick(n, allowed):
    ok = [a for a in sorted(allowed) if a >= n]
    return ok[0] if ok else None


def build_search_md(windows):
    exp = CONFIG.get("experience_years", 1)
    lv = quote(CONFIG.get("linkedin_levels", "1,2,3"), safe="")
    L = ["# Quick search links (Chennai, entry-level)", "",
         "These open pre-filtered searches on big job sites in your browser (nothing is scraped). "
         "Use them for companies the tracker can't read, such as TCS, Zoho, Infosys and Wipro.", ""]
    for n in windows:
        L += [f"## {win_label(n)}", "", "| Keyword | LinkedIn | Naukri | Indeed |", "|---|---|---|---|"]
        for k in CONFIG.get("search_keywords", []):
            li = (f"https://www.linkedin.com/jobs/search/?keywords={quote(k)}&location=Chennai%2C%20Tamil%20Nadu%2C%20India"
                  f"&f_TPR=r{n * 86400}&f_E={lv}")
            na = f"https://www.naukri.com/{re.sub(r'[^a-z0-9]+', '-', k.lower()).strip('-')}-jobs-in-chennai?experience={exp}"
            if pick(n, [1, 3, 7, 15, 30]):
                na += f"&jobAge={pick(n, [1, 3, 7, 15, 30])}"
            ind = f"https://in.indeed.com/jobs?q={quote_plus(k)}&l=Chennai%2C+Tamil+Nadu"
            if pick(n, [1, 3, 7, 14]):
                ind += f"&fromage={pick(n, [1, 3, 7, 14])}"
            L.append(f"| {k} | [LinkedIn]({li}) | [Naukri]({na}) | [Indeed]({ind}) |")
        L.append("")
    L += ["## Company career pages (no public feed)", "",
          "Search these for **Chennai** and your skills:", ""]
    L += [f"- [{d['name']}]({d['url']})" for d in CONFIG.get("direct_links", [])]
    SEARCH_MD.write_text("\n".join(L) + "\n", encoding="utf-8")


def main():
    JD_DIR.mkdir(exist_ok=True)
    WIN_DIR.mkdir(exist_ok=True)
    old = {}
    if JOBS_JSON.exists():
        for j in json.loads(JOBS_JSON.read_text(encoding="utf-8")).get("jobs", []):
            old[j["url"]] = j

    with ThreadPoolExecutor(6) as ex:
        results = list(ex.map(run, CONFIG["companies"]))

    current, failed, new_jobs, stats = {}, [], [], []
    for name, jobs, err, st in results:
        stats.append((name, st, err))
        if err:
            failed.append((name, err))
            for u, j in old.items():  # keep previous data if a fetch fails
                if j["company"] == name:
                    j.setdefault("posted", j["first_seen"])
                    current[u] = j
            continue
        for j in jobs:
            prev = old.get(j["url"])
            j["first_seen"] = prev["first_seen"] if prev else NOW.isoformat()
            j["posted_exact"] = bool(j.get("posted"))
            if not j["posted_exact"]:
                j["posted"] = j["first_seen"]
            j["jd_file"] = jd_name(j["url"])
            write_jd(j)
            if not prev:
                new_jobs.append(dict(j))
            j["summary"] = short(j.get("desc"), 300)
            j.pop("desc", None)
            current[j["url"]] = j

    keep = {j["jd_file"] for j in current.values()}
    for f in JD_DIR.glob("*.md"):
        if f.name not in keep:
            f.unlink()

    jobs = sorted(current.values(), key=lambda j: (j["posted"][:10], j.get("match", 0)), reverse=True)
    JOBS_JSON.write_text(json.dumps({"updated": NOW.isoformat(), "count": len(jobs), "jobs": jobs},
                                    indent=1, ensure_ascii=False), encoding="utf-8")

    cap = CONFIG.get("max_rows_per_window", 500)
    windows = sorted(set(CONFIG.get("windows", [1, 7, 30]) + custom_days()))
    wanted_files = set()
    for n in windows:
        rows = [j for j in jobs if age_days(j) <= n]
        wanted_files.add(win_file(n))
        (WIN_DIR / win_file(n)).write_text(
            f"# {win_label(n)} - {len(rows)} jobs\n\n[Back to JOBS.md](../JOBS.md)\n\n"
            + (table(rows[:cap], "../") if rows else "_No jobs in this window._") + f"\n\n{NOTE}\n", encoding="utf-8")
    for f in WIN_DIR.glob("last-*d.md"):
        if f.name not in wanted_files:
            f.unlink()
    build_search_md(windows)

    dd = CONFIG.get("default_days", 7)
    main_rows = [j for j in jobs if age_days(j) <= dd]
    index = " | ".join(f"[{win_label(n)}](windows/{win_file(n)}) ({sum(1 for j in jobs if age_days(j) <= n)})" for n in windows)
    ok_cos = len(CONFIG["companies"]) - len(failed)
    md = ["# Chennai Tech Jobs (Fresher to ~3 yrs)\n",
          f"_Last updated: {NOW.strftime('%Y-%m-%d %H:%M UTC')} - {len(jobs)} open roles from {ok_cos} working company "
          "boards. ⭐ = matches your resume skills. Click **JD** for the job description._\n",
          "**Not on this list?** TCS, Zoho, Infosys, Wipro etc. have no public feed. Use the "
          "[quick search links and career pages](SEARCH.md).\n",
          f"**Other time windows:** {index}\n",
          f"## {win_label(dd)} ({len(main_rows)})\n",
          table(main_rows[:cap], "") if main_rows else
          "_No matching jobs. Open the **Coverage report** below to see where jobs were filtered out._",
          f"\n{NOTE}\n",
          "<details><summary>Coverage report (why jobs were included or dropped)</summary>\n",
          "| Company | Status | Fetched | In Chennai | Passed title/seniority | Final |", "|---|---|---|---|---|---|"]
    for name, st, err in stats:
        md.append(f"| {esc(name)} | {'FAILED: ' + esc(err) if err else 'OK'} | {st['fetched']} | {st['location']} "
                  f"| {st['title']} | {st['final']} |")
    md.append("\n</details>")
    JOBS_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"{len(jobs)} jobs, {len(new_jobs)} new, {len(failed)} failed, windows={windows}")
    for n, e in failed:
        print(f"  ! {n}: {e}", file=sys.stderr)

    try:
        send_alerts(new_jobs, first_run=not old)
    except Exception as e:
        print(f"  ! alert error: {e}", file=sys.stderr)


def check():
    with ThreadPoolExecutor(6) as ex:
        for name, _, err, st in ex.map(run, CONFIG["companies"]):
            if err:
                print(f"FAIL  {name:<26} {err}")
            else:
                print(f"OK    {name:<26} fetched={st['fetched']:<5} chennai={st['location']:<4} "
                      f"title_ok={st['title']:<4} final={st['final']}")


if __name__ == "__main__":
    if "--check" in sys.argv:
        check()
    elif "--test-telegram" in sys.argv:
        print("sent" if tg_send("✅ Test message from your job tracker.") else "failed (check token / chat id)")
    else:
        main()
