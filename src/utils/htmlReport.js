const fs = require('fs');
const path = require('path');
const { readResults } = require('./resultsStore');
const {
  IMPACT_GUIDANCE,
  getOverallStatus,
  getPageStatus,
  formatWcagCriteria,
  sortViolations,
  userImpactForRule,
  formatTimestamp,
  readAxeVersion,
  countIncompleteNodes,
  axeReviewReason,
} = require('./reportHelpers');
const { groupNodes, formatGroupSummary } = require('./nodeGrouping');

const htmlPath = path.join('reports', 'accessibility-report.html');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function impactBadge(impact) {
  return `<span class="badge impact-${escapeHtml(impact)}">${escapeHtml(impact)}</span>`;
}

function reviewBadge() {
  return '<span class="badge impact-review">Manual review</span>';
}

function statusBadge(status) {
  return `<span class="status-pill status-${escapeHtml(status.code)}">${escapeHtml(status.label)}</span>`;
}

function formatMultiline(text) {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

function renderWcagChips(tags) {
  const criteria = formatWcagCriteria(tags);
  if (!criteria.length) {
    return '';
  }
  return `<div class="chip-row">${criteria.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`;
}

function renderEvidence(node) {
  if (!node.screenshot) {
    return node.captureNote ? `<p class="meta">${escapeHtml(node.captureNote)}</p>` : '';
  }

  return `
    <figure class="evidence">
      <img src="${escapeHtml(node.screenshot)}" alt="Screenshot of affected element in the live application" loading="lazy" />
      <figcaption>${escapeHtml(node.captureNote || 'Context capture with highlighted element from the live application.')}</figcaption>
    </figure>`;
}

function defaultFixText(manualReview) {
  return manualReview
    ? 'Confirm this element manually — automated checks could not determine pass or fail.'
    : 'See rule documentation for remediation steps.';
}

function renderGroupedNodes(nodes, { manualReview = false } = {}) {
  const groups = groupNodes(nodes);
  if (!groups.length) {
    return '';
  }

  return groups
    .map(
      (group, index) => {
        const representative = group.representative;
        const fixText = manualReview ? axeReviewReason(representative) : representative.failureSummary || defaultFixText(false);

        return `
        <details class="element-group" ${index === 0 ? 'open' : ''}>
          <summary>
            <strong>${escapeHtml(group.label)}</strong>
            <span class="meta"> — ${escapeHtml(formatGroupSummary(group))}</span>
          </summary>
          ${renderEvidence(representative)}
          <p class="fix">${formatMultiline(fixText)}</p>
          <p class="element-html"><strong>Example selector:</strong> <code>${escapeHtml(representative.target.join(' '))}</code></p>
          ${
            group.count > 1
              ? `
          <details class="instance-list">
            <summary>All ${group.count} selectors</summary>
            <ol>${group.nodes.map((node) => `<li><code>${escapeHtml(node.target.join(' '))}</code></li>`).join('')}</ol>
          </details>`
              : ''
          }
        </details>`;
      },
    )
    .join('');
}

function renderViolation(violation) {
  const elementCount = violation.nodes.length;
  const patternCount = groupNodes(violation.nodes).length;
  return `
    <article class="violation impact-${escapeHtml(violation.impact)}">
      <header class="violation-header">
        <div class="violation-title">
          ${impactBadge(violation.impact)}
          <h3>${escapeHtml(violation.help)}</h3>
        </div>
        <p class="rule-id">Rule: <code>${escapeHtml(violation.id)}</code> · ${elementCount} element(s) · ${patternCount} pattern(s)</p>
      </header>
      ${renderWcagChips(violation.tags)}
      <p class="user-impact"><strong>User impact:</strong> ${escapeHtml(userImpactForRule(violation))}</p>
      <p>${escapeHtml(violation.description)}</p>
      <p><a href="${escapeHtml(violation.helpUrl)}" target="_blank" rel="noopener">Deque rule documentation ↗</a></p>
      <div class="elements">${renderGroupedNodes(violation.nodes)}</div>
    </article>`;
}

function renderIncompleteRules(rules) {
  if (!rules.length) {
    return '';
  }

  const items = rules
    .map((rule) => {
      const patterns = groupNodes(rule.nodes);
      return `
        <article class="incomplete-rule">
          <header>
            ${reviewBadge()}
            <strong>${escapeHtml(rule.help || rule.id)}</strong>
          </header>
          ${renderWcagChips(rule.tags)}
          <p>${escapeHtml(rule.description || 'Automated checks could not fully evaluate this rule.')}</p>
          <p class="meta">${rule.nodes.length} unverified element(s) in ${patterns.length} pattern(s) — not confirmed failures. Representative screenshots below.</p>
          <div class="elements">${renderGroupedNodes(rule.nodes, { manualReview: true })}</div>
        </article>`;
    })
    .join('');

  return `
    <section class="manual-review">
      <h3>Unverified — needs manual review (${rules.length} rule(s))</h3>
      <p class="meta">These items were flagged by axe but could not be confirmed automatically. They are not counted as violations until a human verifies them.</p>
      ${items}
    </section>`;
}

function renderPageSection(scan, failOn) {
  const status = getPageStatus(scan, failOn);
  const sectionId = slugify(scan.name);
  const violations = sortViolations(scan.violations || []);
  const incompleteRules = scan.incompleteRules || [];

  return `
    <section class="page-scan" id="${sectionId}">
      <div class="page-header">
        <div>
          <h2>${escapeHtml(scan.name)}</h2>
          <p class="meta"><a href="${escapeHtml(scan.url)}" target="_blank" rel="noopener">${escapeHtml(scan.url)}</a></p>
        </div>
        ${statusBadge(status)}
      </div>
      <p class="status-detail">${escapeHtml(status.detail)}</p>
      <div class="stats-row">
        <span class="stat"><strong>${scan.violationCount || 0}</strong> confirmed violations</span>
        <span class="stat"><strong>${countIncompleteNodes(scan)}</strong> unverified items</span>
        <span class="stat"><strong>${scan.passes || 0}</strong> rules passed</span>
        <span class="stat"><strong>${scan.inapplicable || 0}</strong> not applicable</span>
      </div>
      <p class="meta">Confirmed violation severity (automated only):</p>
      <div class="impact-row">
        <span class="impact-chip critical">Critical: ${scan.summary.critical || 0}</span>
        <span class="impact-chip serious">Serious: ${scan.summary.serious || 0}</span>
        <span class="impact-chip moderate">Moderate: ${scan.summary.moderate || 0}</span>
        <span class="impact-chip minor">Minor: ${scan.summary.minor || 0}</span>
      </div>
      ${
        violations.length
          ? `<h3>Confirmed violations (${violations.length})</h3><p class="meta">Automated failures reported by axe-core — these are not manual-review guesses.</p><div class="violations">${violations.map(renderViolation).join('')}</div>`
          : '<p class="ok">No confirmed automated violations on this page.</p>'
      }
      ${renderIncompleteRules(incompleteRules)}
    </section>`;
}

function renderPriorityList(scans) {
  const items = [];

  for (const scan of scans) {
    for (const violation of sortViolations(scan.violations || [])) {
      items.push({ scan, violation });
    }
  }

  if (!items.length) {
    return '<p class="ok">No violations to prioritize.</p>';
  }

  items.sort(
    (a, b) =>
      ['critical', 'serious', 'moderate', 'minor'].indexOf(a.violation.impact) -
      ['critical', 'serious', 'moderate', 'minor'].indexOf(b.violation.impact),
  );

  return `<ol class="priority-list">${items
    .map(
      ({ scan, violation }) => `
        <li>
          ${impactBadge(violation.impact)}
          <strong>${escapeHtml(scan.name)}</strong> —
          ${escapeHtml(violation.help)}
          <span class="meta">(${violation.nodes.length} element(s) · ${escapeHtml(violation.id)})</span>
        </li>`,
    )
    .join('')}</ol>`;
}

function renderJourney(scans, failOn) {
  return `<ol class="journey">${scans
    .map((scan) => {
      const status = getPageStatus(scan, failOn);
      const sectionId = slugify(scan.name);
      return `
        <li class="journey-step status-${status.code}">
          <a href="#${sectionId}">
            <span class="step-name">${escapeHtml(scan.name)}</span>
            ${statusBadge(status)}
            <span class="step-meta">${scan.violationCount || 0} confirmed · ${countIncompleteNodes(scan)} unverified</span>
          </a>
        </li>`;
    })
    .join('')}</ol>`;
}

function buildHtml(payload) {
  const scans = payload.scans || [];
  const failOn = payload.failOn || 'none';
  const overall = getOverallStatus(scans, failOn);
  const axeVersion = payload.axeVersion || readAxeVersion();

  const totals = scans.reduce(
    (acc, scan) => {
      acc.violations += scan.violationCount || 0;
      acc.critical += scan.summary.critical || 0;
      acc.serious += scan.summary.serious || 0;
      acc.moderate += scan.summary.moderate || 0;
      acc.minor += scan.summary.minor || 0;
      acc.unverified += countIncompleteNodes(scan);
      return acc;
    },
    { violations: 0, critical: 0, serious: 0, moderate: 0, minor: 0, unverified: 0 },
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Accessibility Report — Noah Cares</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: Segoe UI, system-ui, sans-serif;
      line-height: 1.5;
      --bg: #0b1220;
      --panel: #111827;
      --border: #334155;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --pass: #166534;
      --review: #854d0e;
      --fail: #991b1b;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    h1, h2, h3 { margin: 0 0 8px; line-height: 1.25; }
    a { color: #93c5fd; }
    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 18px; }
    .meta { color: var(--muted); margin: 0; }
    .verdict { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
    .verdict-banner { font-size: 1.35rem; font-weight: 700; padding: 10px 14px; border-radius: 10px; }
    .status-pass .verdict-banner, .status-pill.status-pass { background: var(--pass); color: #ecfdf5; }
    .status-review .verdict-banner, .status-pill.status-review { background: var(--review); color: #fffbeb; }
    .status-fail .verdict-banner, .status-pill.status-fail { background: var(--fail); color: #fef2f2; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 16px 0; }
    .card { background: #1e293b; border-radius: 10px; padding: 12px; }
    .card strong { display: block; font-size: 1.5rem; }
    .legend { display: grid; gap: 8px; margin-top: 12px; }
    .legend-item { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: start; }
    .badge, .status-pill, .chip { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .impact-critical, .impact-chip.critical { background: #7f1d1d; }
    .impact-serious, .impact-chip.serious { background: #9a3412; }
    .impact-moderate, .impact-chip.moderate { background: #854d0e; }
    .impact-minor, .impact-chip.minor { background: #1e3a8a; }
    .impact-review { background: #334155; color: #e2e8f0; text-transform: none; }
    .impact-row, .stats-row, .chip-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
    .stat, .impact-chip { background: #1e293b; border-radius: 8px; padding: 6px 10px; }
    .chip { background: #172554; color: #bfdbfe; font-weight: 600; text-transform: none; }
    .journey { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .journey-step a { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 12px; border-radius: 10px; background: #1e293b; text-decoration: none; color: inherit; border: 1px solid transparent; }
    .journey-step a:hover { border-color: #475569; }
    .step-meta { grid-column: 1 / -1; color: var(--muted); font-size: 0.9rem; }
    .page-header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .status-detail { margin: 8px 0 0; color: var(--muted); }
    .violation, .incomplete-rule { border: 1px solid var(--border); border-left-width: 4px; border-radius: 10px; padding: 14px; margin-top: 12px; background: #0f172a; }
    .violation.impact-critical { border-left-color: #ef4444; }
    .violation.impact-serious { border-left-color: #f97316; }
    .violation.impact-moderate { border-left-color: #eab308; }
    .violation.impact-minor { border-left-color: #3b82f6; }
    .violation-header h3 { font-size: 1rem; margin: 8px 0 0; font-weight: 600; }
    .violation-title { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .rule-id, .user-impact { margin: 8px 0; }
    .user-impact { color: #fde68a; }
    .element-detail { margin-top: 8px; background: #111827; border-radius: 8px; padding: 8px 10px; }
    .element-group, .element-detail { margin-top: 10px; background: #0f172a; border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
    .element-group summary, .element-detail summary, .instance-list summary { cursor: pointer; }
    .instance-list { margin-top: 10px; }
    .instance-list ol { margin: 8px 0 0; padding-left: 20px; }
    .evidence { margin: 12px 0; }
    .evidence img { display: block; width: auto; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: 10px; background: #fff; }
    .evidence figcaption { margin-top: 6px; color: var(--muted); font-size: 0.88rem; }
    .fix, .element-html { margin: 8px 0 0; color: var(--muted); font-size: 0.92rem; }
    .ok { color: #86efac; }
    .priority-list { padding-left: 20px; }
    .priority-list li { margin-bottom: 10px; }
    .footer { font-size: 0.9rem; color: var(--muted); }
    code { word-break: break-word; font-size: 0.88em; }
    details > summary { list-style: disclosure-closed; }
  </style>
</head>
<body>
  <main>
    <section class="panel verdict ${overall.className}">
      <div>
        <p class="meta">Automated accessibility audit · axe-core ${escapeHtml(axeVersion)} · WCAG 2.2 tag set</p>
        <div class="verdict-banner">${escapeHtml(overall.label)}</div>
        <p class="meta" style="margin-top:10px;">Generated ${escapeHtml(formatTimestamp(payload.generatedAt))} · CI fail threshold: <strong>${escapeHtml(failOn)}</strong></p>
      </div>
      <div class="cards">
        <div class="card"><strong>${scans.length}</strong> pages scanned</div>
        <div class="card"><strong>${totals.violations}</strong> confirmed violations</div>
        <div class="card"><strong>${totals.unverified}</strong> unverified items</div>
        <div class="card"><strong>${totals.serious + totals.critical}</strong> confirmed high priority</div>
      </div>
    </section>

    <section class="panel">
      <h2>Impact severity</h2>
      <div class="legend">
        ${Object.entries(IMPACT_GUIDANCE)
          .map(
            ([impact, text]) => `
              <div class="legend-item">
                ${impactBadge(impact)}
                <span>${escapeHtml(text)}</span>
              </div>`,
          )
          .join('')}
      </div>
    </section>

    <section class="panel">
      <h2>Journey</h2>
      <p class="meta">Standards checked: ${escapeHtml((payload.tags || []).join(', '))}</p>
      ${renderJourney(scans, failOn)}
    </section>

    <section class="panel">
      <h2>Fix first — confirmed violations only</h2>
      ${renderPriorityList(scans)}
    </section>

    ${scans.map((scan) => renderPageSection(scan, failOn)).join('')}

    <section class="panel footer">
      <p><strong>Disclaimer:</strong> This report covers automated checks only (axe-core via Playwright). It does not certify WCAG conformance. Keyboard-only flows, screen reader journeys, and content quality still need exploratory testing.</p>
      <p>Source JSON: <code>reports/axe-results.json</code></p>
    </section>
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
