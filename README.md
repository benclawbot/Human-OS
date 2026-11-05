# Human OS

A quiet, mobile-first personal recursive-improvement PWA. **No AI service, no account, no backend, no telemetry.** Designed with the approved dark, mountain-at-dawn wellness visual direction.

## Main experience

- **Today** — one North Star, one active experiment, one meaningful focus, a 2-minute daily check-in.
- **Experiment** — one active 7–28 day experiment with a hypothesis, action, primary measure, and decision rule. Start a new 14-day template, archive the previous experiment, or customize the active one.
- **Journey** — real check-in counts and energy averages (no invented scores), past notes and history, and a structured weekly review with an explicit improvement-of-the-improvement-process question.
- **Onboarding** — North Star → baseline → bottleneck → first intervention (four short answers).
- **Privacy and backup** — IndexedDB on the current device with JSON export/import, including best-effort import of prior Human OS exports (old AI messages and suggestions are discarded).
- **PWA** — installable assets and offline app shell with local read/write access. Requires serving from HTTPS or localhost for installation and service worker.

## Quick start

Node.js 20+:

```sh
npm run dev
```

Open `http://localhost:4173`.

Or build static files for any HTTPS static host (including Sites when available):

```sh
npm run build
# Publish the contents of dist/
```

No environment variables or external APIs are required. The project is deliberately dependency-free.

## Tests

```sh
npm run check
python tests/browser_test.py
```

- `npm run check` validates JavaScript syntax, runs eight data-model tests, and verifies the static build.
- `tests/browser_test.py` is an optional Playwright end-to-end test covering onboarding, reflection, reload, experiment switching, review, export/import, and offline launch. It needs a system Chromium browser, the Python `playwright` package, and permission to load localhost; some remote sandboxes block browser navigation entirely.

## Privacy model

Your data never leaves the browser unless you manually export it or upload a backup elsewhere. It is **not encrypted at rest** by Human OS, and anybody with access to your device/browser profile might read it. The data is not synchronized between devices. Clearing site data, using private browsing, or switching hosting origins loses access to saved data unless you have an export. Keep periodic backups.

Previous server-hosted V3 data is **not** automatically transferred to this version. Export V3 data before switching and import its JSON backup in Settings after onboarding, when practical. A legacy export's AI conversation and model suggestions are intentionally omitted.

## Development architecture

```text
index.html, styles.css, app.js    Mobile interface
assets/, icons/                   Visual assets
manifest.webmanifest, sw.js       Installable and offline PWA
storage.mjs                       Browser IndexedDB persistence
data.mjs                          Domain data and validation
scripts/serve.mjs                 No-dependency local development server
scripts/build.mjs                 Copies app to dist/ for static deployment
tests/                            Automated domain and browser tests
```

This is a single-device personal app, not a multi-user or cloud-synced service. AI recommendations, AI coaching, cloud login, API secrets and private server storage were intentionally removed in V4.
