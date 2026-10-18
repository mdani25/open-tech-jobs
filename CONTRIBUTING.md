# Contributing
1. Fork the repo.
2. Add a company to `config.json` (see README for how to find the `id`).
3. Run `python scripts/update_jobs.py` and confirm your company has no error.
4. Open a PR. Don't commit changes to `JOBS.md` or `jobs.json`; the bot does that.

Want to add a new ATS (Workable, Recruitee, etc.)? Add a fetcher function in `scripts/update_jobs.py` returning `title`, `location`, `url`, and register it in `FETCHERS`.
