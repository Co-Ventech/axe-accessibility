# Axe Accessibility

Playwright + [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.2 audits against the [Toolshop](https://practicesoftwaretesting.com) UI.

Agency-ready template: one catalog smoke journey (home + product detail), JSON + HTML reporting, CI workflow with artifact upload.

## Prerequisites

- Node.js 18+
- npm

## Setup

From this folder:

```powershell
npm install
npx playwright install chromium
copy .env.example .env
```

On macOS/Linux use `cp .env.example .env`.

## Run

```powershell
npm test              # full suite, opens HTML report locally
npm run test:headed   # visible browser
npm run test:smoke    # @smoke journey only
npm run test:strict   # fail on serious/critical violations
npm run report        # rebuild HTML from reports/axe-results.json
```

### Fail threshold

`FAIL_ON` controls when tests fail on axe findings (default `none` so the demo site can be audited without blocking CI):

| Value | Behavior |
|---|---|
| `none` | Report all violations; tests pass if scans complete |
| `moderate` | Fail on moderate, serious, or critical |
| `serious` | Fail on serious or critical |
| `critical` | Fail on critical only |

```powershell
$env:FAIL_ON="serious"; npm test
```

### WCAG tags

Scans use axe tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`.

## Journey

1. **Home catalog** — load `/`, run axe against the product grid.
2. **Product detail** — resolve first in-stock product via Toolshop API, scan `/product/{id}`.

## Report

Every run writes machine-readable results and a stakeholder-friendly HTML dashboard (same pattern as axe DevTools / Lighthouse: executive summary first, developer detail below).

| Output | Path |
|---|---|
| Axe JSON | `reports/axe-results.json` |
| HTML dashboard | `reports/accessibility-report.html` |
| Playwright traces (failures) | `test-results/` |

### How stakeholders read it

1. **Verdict banner** — overall outcome for the configured `FAIL_ON` gate.
2. **Fix first** — prioritized list across all pages (critical → minor).
3. **Journey** — per-page status with links to detailed sections.
4. **User impact** — plain-language explanation under each rule (who is affected and why).
5. **WCAG success criteria** — chips such as `SC 1.3.1`, `SC 2.5.8` mapped from axe tags.
6. **Needs manual review** — rules axe could not fully automate (contrast, etc.).

Developers expand each **Element** row for selectors, HTML snippet, and fix instructions. Deque documentation links provide the canonical remediation guidance.

## CI

GitHub Actions runs `npm run test:smoke` on push/PR and uploads `reports/` as the `accessibility-report` artifact.

## Environment

| Variable | Default |
|---|---|
| `UI_BASE_URL` | `https://practicesoftwaretesting.com` |
| `API_BASE_URL` | `https://api.practicesoftwaretesting.com` |
| `HEADLESS` | `true` |
| `FAIL_ON` | `none` |
