const AxeBuilder = require('@axe-core/playwright').default;
const { wcagTags, failOn } = require('../config');

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

const FAIL_THRESHOLDS = {
  none: [],
  moderate: ['moderate', 'serious', 'critical'],
  serious: ['serious', 'critical'],
  critical: ['critical'],
};

function summarizeViolations(violations) {
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const violation of violations) {
    byImpact[violation.impact] = (byImpact[violation.impact] || 0) + 1;
  }
  return byImpact;
}

function formatViolationSummary(violations) {
  if (!violations.length) {
    return 'No violations at configured fail threshold.';
  }

  return violations
    .slice()
    .sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact))
    .map((violation) => `${violation.impact}: ${violation.id} — ${violation.help}`)
    .join('\n');
}

async function scanPage(page, { name, url, tags = wcagTags }) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  const summary = summarizeViolations(results.violations);
  const failingImpacts = FAIL_THRESHOLDS[failOn] || FAIL_THRESHOLDS.none;
  const failingViolations = results.violations.filter((violation) => failingImpacts.includes(violation.impact));

  return {
    name,
    url,
    tags,
    timestamp: new Date().toISOString(),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inapplicable: results.inapplicable.length,
    violationCount: results.violations.length,
    summary,
    violations: results.violations,
    failingViolations,
  };
}

function assertScanThreshold(scan) {
  const { expect } = require('@playwright/test');
  expect(
    scan.failingViolations,
    `${scan.name} (${scan.url})\n${formatViolationSummary(scan.failingViolations)}`,
  ).toHaveLength(0);
}

module.exports = {
  scanPage,
  assertScanThreshold,
  summarizeViolations,
  formatViolationSummary,
};
