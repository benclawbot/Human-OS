# Human OS

A deliberately minimal, mobile-first personal recursive self-improvement PWA, inspired by the approved dark, atmospheric Oura design direction. The app helps a single person observe, learn, and improve through a North Star, a daily reflection, one active experiment, an AI coach and a weekly review.

## What's included

- Four-step onboarding: North Star, baseline, bottleneck and first intervention.
- Today: focus, active 7–21-day experiment, reflection and energy check-in.
- Coach: live OpenAI Responses API integration, contextual advice, structured recommendations and user-approved experiment changes. No scripted or invented AI content in production.
- Journey: actual recorded observations, check-in history, average reported energy and weekly reviews, without fictional improvement percentages.
- Privacy: signed HttpOnly cookies, Origin checks, private storage, export and delete data, restrictive browser security headers, server-side secrets and state conflict protection.
- PWA: standalone installation metadata, maskable icons and an offline app shell. Data sync and AI require internet.

## Run locally

Node.js >= 22.5:

```bash
npm install
APP_PASSWORD='a-long-unique-passphrase' \
SESSION_SECRET="$(openssl rand -hex 32)" \
OPENAI_API_KEY='your-openai-platform-api-key' \
npm run dev
```

Open `http://localhost:4173` and enter the configured private passphrase. Without an API key, all non-AI functionality works, but coaching and AI recommendations display a clear configuration message.

## Tests

```bash
npm run check
python tests/browser_check.py
```

The first command runs syntax checks and backend integration tests, including auth, persistent state, conflicts, experiments, reviews and health/assets. The Playwright script exercises the mobile UI with deterministic mock API responses; it does **not** claim a live AI service test. It uses the system Chromium binary.

## Vercel deployment

The `/public` directory contains the PWA and `/api` contains Vercel Functions. Create a **private** Vercel Blob store connected to the project. Set these encrypted environment variables in Vercel:

- `APP_PASSWORD`: unique, strong, 12+ character private passphrase.
- `SESSION_SECRET`: 32+ character cryptographically random secret. Changing this logs out active sessions.
- `OPENAI_API_KEY`: your own OpenAI Platform API key.
- `OPENAI_MODEL`: optional, defaults to `gpt-4.1-mini`.

The Vercel function automatically uses private Blob storage when `VERCEL` is set. Vercel Blob must be connected to the project with its scoped identity/token. **Never create a public Blob store for personal data.** Local dev defaults to SQLite via `DB_PATH`.

After configuring production secrets and storage, deploy/redeploy and verify `/api/health` returns `configured: true` and `storage: private-blob`, then log in and complete onboarding. A successful health response is not proof that Blob writes or live AI are functional; test those explicitly.

## Security and product limitations

This is **single-user software**. All users of the same passphrase share a single data store. This is not multi-tenant auth. Vercel's serverless in-memory rate limiting is best-effort and not distributed; use Vercel's edge firewall or additional access controls for internet-facing production. There is no password recovery or MFA.

The private Blob JSON store uses ETag-based optimistic concurrency. Concurrent edits that race are rejected with 409 rather than silently overwriting data. No automatic backups are provisioned; configure backups or periodic authenticated exports before relying on it for critical records.

AI calls send selected context to OpenAI only on explicit user action, request `store:false`, and require an API key. The model can be wrong. It does not diagnose health conditions or autonomously modify experiments. The app never fabricates capability gains from self-reported check-ins.

Offline mode is **read-only app shell**, not an offline write queue. Reminders, push notifications, cross-user collaboration, scheduled checks, voice features and automated data imports are intentionally not part of this minimal version. Browser storage does not contain server secrets.

## Project layout

```text
public/       Mobile UI, CSS, JS, image assets, PWA
api/          Serverless endpoints
lib/          Auth, data validation, persistence, AI, endpoint handler
server.mjs    Local development server
vercel.json   Deployment and security policy
scripts/      (no build pipeline required)
tests/        API integration + browser UI automation
```

## License and references

Original Human OS implementation and generated illustrative mountain artwork. Oura is a reference for visual style, not an affiliation, API dependency, or copied UI asset.
