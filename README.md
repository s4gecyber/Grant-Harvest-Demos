# Grant Harvest — Demos

Public home of the **Grant Estimator** — the free, no-login lead-magnet tool for the [GrantHarvest](https://grantharvest.ai) platform.

> This repo is intentionally limited to the public estimator tool. GrantHarvest's
> proprietary landing page and platform code live in a separate private repository.

## Contents

| Path | What it is |
|------|------------|
| `estimator/` | **Grant Sizing Tool** — a free, no-login grant estimator. Farmers answer 7 questions and see an estimated funding range across federal + state programs they may qualify for. Standalone: open `estimator/index.html` in a browser. |

## Grant data

The estimator ships with a verified static dataset (`estimator/js/data.js`) covering 22 federal/national grant programs and all 50 states + DC. All program URLs were browser-verified live in **June 2026**.

An optional live-refresh layer (`estimator/api/refresh.js`) is designed to run as a Vercel serverless cron that pulls open agricultural opportunities from the [grants.gov API](https://www.grants.gov/api/api-guide) and caches them; when deployed it overlays the static baseline. On static hosting (e.g. GitHub Pages) it isn't active and the tool falls back silently to the bundled data.

## Running locally

```bash
cd estimator
python -m http.server 8848
# open http://localhost:8848
```

## License / use

Demonstration material for GrantHarvest. Grant program details are summaries for orientation only — always confirm eligibility and award amounts on the official agency program page linked in each result.
