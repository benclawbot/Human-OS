# Human OS visual and interaction QA

Source target: approved dark Oura-inspired four-screen visual mockup (`a_high_fidelity_dark_themed_mobile_app_ui_mockup.png`).

Implementation capture: `screenshot-today.png`, 393 CSS px phone viewport after 4-step onboarding. Combined visual inspection: `design-comparison.png`.

## Findings and fixes

- P1 — Initial Today screen pushed the primary reflection action below the mobile navigation viewport. **Fixed** by reducing hero and card vertical footprint and recaptured.
- P1 — App click handler ignored default-type buttons in settings and contextual prompts. **Fixed** and retested with Playwright.
- P1 — AI recommendation ID depended on `crypto.randomUUID` in a non-secure mock-browser context. **Fixed** with a non-security-sensitive ID fallback.
- P1 — After logging out from Coach and logging in again, the previous tab was restored rather than Today. **Fixed** and retested.
- P2 — Mock source concept includes illustrated progress percentage. **Intentionally replaced** with actual experiment day/time labels, since there is no measured capability growth until observations exist.
- P3 — Source shows native device chrome (status bar/home indicator), which an installable PWA does not draw; host OS owns that chrome.
- P3 — Mockup labels and hypothetical content differ from user-entered real North Star and experiment data; this is intentional.

## Verified scope

- Mobile UI flow tested in Chromium at 393×852 using a mocked API for deterministic interaction testing.
- Server API independently integration-tested with real HTTP, signed authentication, SQLite state persistence and 409 conflict handling.
- Review/Coach API calls were mocked in browser tests; **live OpenAI calls require actual Platform credentials and have not been independently verified**.
- Private Vercel Blob persistence and the public Vercel domain require post-deployment smoke tests; do not claim production verification until those pass.

**final result: passed locally for core UI/functionality and dark-design fidelity, pending external service smoke tests.**
