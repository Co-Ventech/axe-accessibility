# Axe Accessibility

Playwright + [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.2 audits against [Noah Cares staging](https://staging.noahcares.com/).

One smoke journey (login page + signed-in home), JSON + HTML reporting, and a CI workflow that uploads the report artifact.

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

Put the staging account in `.env`:

```powershell
LOGIN_EMAIL=you@example.com
LOGIN_PASSWORD="your-password"
```

`.env` is gitignored. Do not commit the password.

## Run

```powershell
npm test              # full suite, opens HTML report locally
npm run test:headed   # visible browser
npm run test:smoke    # @smoke journey only
npm run test:strict   # fail on serious/critical violations
npm run report        # rebuild HTML from reports/axe-results.json
```

### Fail threshold

`FAIL_ON` controls when tests fail on axe findings (default `serious`):

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

1. **Login** — open `/login` and run axe on the signed-out form.
2. **Signed-in home** — sign in with `LOGIN_EMAIL` / `LOGIN_PASSWORD`, then scan the page the app opens next.

## Report

Every run writes machine-readable results and a stakeholder-friendly HTML dashboard (executive summary first, developer detail below).

| Output | Path |
|---|---|
| Axe JSON | `reports/axe-results.json` |
| HTML dashboard | `reports/accessibility-report.html` |
| Element screenshots | `reports/evidence/{page}/{rule}-{index}.png` |
| Playwright traces (failures) | `test-results/` |

Each finding includes a **highlighted screenshot** from the live app (orange outline on the affected element). Repeated UI patterns are **grouped** with one representative screenshot and a collapsible list of all selectors.

Open `reports/accessibility-report.html` with the `reports/evidence/` folder beside it (CI uploads the whole `reports/` directory as one artifact).

## CI

GitHub Actions runs `npm run test:smoke` on push/PR and uploads `reports/` as the `accessibility-report` artifact.

Add repository secrets `LOGIN_EMAIL` and `LOGIN_PASSWORD` so the signed-in scan can authenticate. The workflow does not store the password in the repo.

## Environment

| Variable | Default |
|---|---|
| `UI_BASE_URL` | `https://staging.noahcares.com` |
| `LOGIN_EMAIL` | empty |
| `LOGIN_PASSWORD` | empty |
| `HEADLESS` | `true` |
| `FAIL_ON` | `serious` |
