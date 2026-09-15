const fs = require('fs');
const path = require('path');
const { readResults } = require('./resultsStore');

const htmlPath = path.join('reports', 'accessibility-report.html');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function impactBadge(impact) {
  return `<span class="badge impact-${escapeHtml(impact)}">${escapeHtml(impact)}</span>`;
}

function renderViolations(violations) {
  if (!violations.length) {
    return '<p class="ok">No violations recorded for this page.</p>';
  }

  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map(
          (node) => `
            <li>
              <code>${escapeHtml(node.target.join(' '))}</code>
              <div>${escapeHtml(node.failureSummary || '')}</div>
            </li>`,
        )
        .join('');

      return `
        <article class="violation">
          <header>
            ${impactBadge(violation.impact)}
            <strong>${escapeHtml(violation.id)}</strong>
            <span>${escapeHtml(violation.help)}</span>
          </header>
          <p>${escapeHtml(violation.description)}</p>
          <p><a href="${escapeHtml(violation.helpUrl)}" target="_blank" rel="noopener">Rule documentation</a></p>
          <ul>${nodes}</ul>
        </article>`;
    })
    .join('');
}

function renderPageSection(scan) {
  const total = scan.violationCount || 0;
  return `
    <section class="page-scan">
      <h2>${escapeHtml(scan.name)}</h2>
      <p class="meta">${escapeHtml(scan.url)} · ${total} violation(s) · ${scan.passes} passes · ${scan.incomplete} incomplete</p>
      <div class="impact-row">
        <span>Critical: ${scan.summary.critical || 0}</span>
        <span>Serious: ${scan.summary.serious || 0}</span>
        <span>Moderate: ${scan.summary.moderate || 0}</span>
        <span>Minor: ${scan.summary.minor || 0}</span>
      </div>
      ${renderViolations(scan.violations)}
    </section>`;
}

function buildHtml(payload) {
  const scans = payload.scans || [];
  const totals = scans.reduce(
    (acc, scan) => {
      acc.violations += scan.violationCount || 0;
      acc.critical += scan.summary.critical || 0;
      acc.serious += scan.summary.serious || 0;
      acc.moderate += scan.summary.moderate || 0;
      acc.minor += scan.summary.minor || 0;
      return acc;
    },
    { violations: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
  );

  const journey = scans.map((scan) => `<li>${escapeHtml(scan.name)}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Toolshop Accessibility Report</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: Segoe UI, system-ui, sans-serif;
      line-height: 1.5;
    }
    body { margin: 0; background: #0f172a; color: #e2e8f0; }
    main { max-width: 1100px; margin: 0 auto; padding: 24px; }
    h1, h2 { margin: 0 0 12px; }
    .hero, .page-scan, .violation { background: #111827; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0; }
    .card { background: #1e293b; border-radius: 10px; padding: 12px; }
    .card strong { display: block; font-size: 1.4rem; }
    .meta { color: #94a3b8; }
    .impact-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.8rem; text-transform: uppercase; }
    .impact-critical { background: #7f1d1d; }
    .impact-serious { background: #9a3412; }
    .impact-moderate { background: #854d0e; }
    .impact-minor { background: #1e3a8a; }
    .ok { color: #86efac; }
    code { word-break: break-word; }
    ul { padding-left: 20px; }
    a { color: #93c5fd; }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Toolshop WCAG 2.2 Accessibility Audit</h1>
      <p class="meta">Generated ${escapeHtml(payload.generatedAt)} · fail threshold: ${escapeHtml(payload.failOn)}</p>
      <p>Tags: ${escapeHtml((payload.tags || []).join(', '))}</p>
      <div class="cards">
        <div class="card"><strong>${scans.length}</strong> pages scanned</div>
        <div class="card"><strong>${totals.violations}</strong> total violations</div>
        <div class="card"><strong>${totals.critical}</strong> critical</div>
        <div class="card"><strong>${totals.serious}</strong> serious</div>
      </div>
      <h2>Journey</h2>
      <ol>${journey}</ol>
    </section>
    ${scans.map(renderPageSection).join('')}
  </main>
</body>
</html>`;
}

function generateReport() {
  const payload = readResults();
  if (!payload) {
    console.warn('No axe results found at reports/axe-results.json');
    return null;
  }

  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, buildHtml(payload));
  return htmlPath;
}

if (require.main === module) {
  const report = generateReport();
  if (report) {
    console.log(`Accessibility report: ${path.resolve(report)}`);
  }
}

module.exports = { generateReport, htmlPath };
