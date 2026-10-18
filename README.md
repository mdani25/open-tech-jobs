# Open Tech Jobs

A free, open-source, auto-updating list of IT and tech job openings with **direct apply links**.
A GitHub Action pulls openings twice a day from official company career-board APIs
(Greenhouse, Lever, Ashby, SmartRecruiters) and rewrites [`JOBS.md`](JOBS.md) and `jobs.json`.

- **Browse jobs:** [JOBS.md](JOBS.md) (Chennai, fresher to ~3 yrs, newest first; ⭐ = matches your resume skills)
- **Chennai career pages (no API):** [CHENNAI.md](CHENNAI.md)
- **More resources (job boards, GitHub lists, interview prep):** [RESOURCES.md](RESOURCES.md)
- **Add a company:** edit [`config.json`](config.json) and open a PR (see [CONTRIBUTING.md](CONTRIBUTING.md))

## Set it up in 5 minutes
1. Create a new GitHub repo and upload these files (or fork).
2. Go to **Settings > Actions > General > Workflow permissions** and choose **Read and write permissions**.
3. Go to the **Actions** tab, pick **Update job listings**, and click **Run workflow**.
4. Open `JOBS.md`. It refreshes automatically after that. Click **Watch > Custom > Releases/Commits** if you want notifications.

## Run locally
```bash
python scripts/update_jobs.py   # Python 3.8+, no dependencies
```

## Customize
Everything is in `config.json`:
- `locations`: only keep jobs whose location contains one of these words (empty list = all locations)
- `keywords_include` / `keywords_exclude`: filter by job title
- `companies`: `{ "name": "...", "ats": "greenhouse|lever|ashby|smartrecruiters", "id": "..." }`

## Find a company's `id`
Open the company's careers page and look at the job URL:
| URL looks like | ats | id |
|---|---|---|
| `boards.greenhouse.io/<id>/jobs/...` or `job-boards.greenhouse.io/<id>` | greenhouse | `<id>` |
| `jobs.lever.co/<id>/...` | lever | `<id>` |
| `jobs.ashbyhq.com/<id>/...` | ashby | `<id>` |
| `jobs.smartrecruiters.com/<id>/...` | smartrecruiters | `<id>` |

Companies with a wrong id are skipped and listed at the bottom of `JOBS.md`, so fix or remove them.

## Limits
Only companies on those four systems are covered. Workday, SuccessFactors and custom portals (many large Indian IT firms) have no public API, so use the links in [RESOURCES.md](RESOURCES.md) for those.

License: MIT

## Job descriptions (JD)
Every job in `JOBS.md` has a **JD** link that opens its full description in the `jds/` folder (cleaned text, experience required, and which of your skills it matches). The JDs are also searchable on GitHub.

## Telegram alerts
You get a message for every **new** job that matches at least `telegram.min_match` of your skills (default 2). Each message has the title, company, location, matched skills, experience mentioned, a JD excerpt, an **Apply** link and a **Full JD** link.

1. In Telegram, open **@BotFather**, send `/newbot` and copy the **bot token**.
2. Open a chat with your new bot and send it any message (such as "hi").
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the number in `"chat":{"id": ...}`. This is your **chat id**.
4. In your GitHub repo, go to **Settings > Secrets and variables > Actions > New repository secret** and add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
5. Run the workflow once. The first run sends a single "tracker is live" message, then real alerts follow on later runs.

Test locally: `TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... python scripts/update_jobs.py --test-telegram`

Tune it in `config.json` under `telegram`: `min_match`, `max_per_run` and `jd_chars`.

## Check that your company ids work
```bash
python scripts/update_jobs.py --check
```
Prints `OK` or `FAIL` for every company with its total jobs and how many are in Chennai. Remove or fix any `FAIL` line in `config.json`.

## Customize the days
**1. Time windows in `JOBS.md`** - edit `sections` in `config.json`. Example for 1, 3, 14 and 60 days:
```json
"sections": [
  {"title": "Today", "days": 1},
  {"title": "Last 3 days", "days": 3},
  {"title": "Last 2 weeks", "days": 14},
  {"title": "Last 2 months", "days": 60}
]
```
Jobs older than the last window go under "Older openings" (set `"show_older": false` to hide them). Set `"drop_after_days": 45` to remove jobs completely once they are 45 days old.
Note: age counts from the day the tracker **first saw** the job, not the date the company posted it, since most career APIs don't give a reliable posting date.

**2. Days of the week it runs** - edit `run_weekdays`, e.g. `["Mon", "Tue", "Wed", "Thu", "Fri"]` for weekdays only. A manual **Run workflow** click always runs. `timezone_offset_hours` (5.5 = IST) decides what "today" means.

**3. How often it runs** - edit the `cron` line in `.github/workflows/update.yml` (cron uses UTC; IST = UTC + 5:30):
| You want | cron |
|---|---|
| Once a day, 8:00 AM IST | `30 2 * * *` |
| Twice a day, 7 AM and 7 PM IST | `30 1,13 * * *` |
| Every 6 hours | `0 */6 * * *` |
| Weekdays only, 9:00 AM IST | `30 3 * * 1-5` |

## Choose how many days of jobs to see
Jobs are filtered by **posting date** (taken from the company's job board when it provides one; otherwise the date the tracker first saw the job, marked with `*`).

- **Ready-made windows:** `JOBS.md` links to `windows/last-1d.md`, `last-2d.md`, `last-3d.md`, `last-7d.md`, `last-14d.md` and `last-30d.md` (1 month).
- **Pick your own list:** edit `"windows": [1, 2, 3, 7, 14, 30]` in `config.json`, e.g. `[1, 5, 10, 21, 45]`.
- **Change what `JOBS.md` shows:** set `"default_days": 7` to any number.
- **One-off window:** in the **Actions** tab click **Run workflow** and type days (e.g. `5` or `5,45`), or run `python scripts/update_jobs.py --days 5`. The page appears at `windows/last-5d.md`. Add it to `windows` in `config.json` to keep it.
- **Telegram freshness:** `telegram.max_age_days` (default 3) means you are only alerted about jobs posted in the last 3 days, even if the tracker found them just now.

## MNCs: Amazon, Walmart, Dell... and TCS, Zoho
- **Fetched automatically:** Amazon (amazon.jobs), plus Workday-based Walmart Global Tech, Dell, Standard Chartered and Salesforce. Add more Workday companies in `config.json` with `host`, `tenant` and `site` (copy them from the company's `...myworkdayjobs.com/<site>` URL).
- **Cannot be fetched:** TCS, Zoho, Infosys, Wipro, HCLTech, Cognizant and similar companies publish no public job feed. `SEARCH.md` gives pre-filtered LinkedIn / Naukri / Indeed links (Chennai, entry level, and your chosen number of days) and links to each company's career page.

## "Why is my list empty?"
Open the **Coverage report** at the bottom of `JOBS.md`, or run `python scripts/update_jobs.py --check`. For each company it shows how many jobs were fetched, how many are in Chennai, how many passed the title/seniority filter and how many remain. Zero fetched means a wrong id. Zero in Chennai means that company has no Chennai jobs. Zero after title means your filters are strict.
