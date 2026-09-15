const { readResults } = require('../src/utils/resultsStore');
const { groupNodes } = require('../src/utils/nodeGrouping');
const { countIncompleteNodes } = require('../src/utils/reportHelpers');

const payload = readResults();
if (!payload) {
  console.error('No reports/axe-results.json found. Run npm test first.');
  process.exit(1);
}

let exitCode = 0;

console.log('Accessibility report audit\n');

for (const scan of payload.scans || []) {
  console.log(`== ${scan.name} ==`);
  console.log(`URL: ${scan.url}`);
  console.log(`Confirmed violations: ${scan.violationCount || 0}`);
  console.log(`Unverified items: ${countIncompleteNodes(scan)}`);

  for (const violation of scan.violations || []) {
    const groups = groupNodes(violation.nodes);
    console.log(`  [CONFIRMED] ${violation.id} (${violation.impact}) — ${violation.nodes.length} element(s), ${groups.length} pattern(s)`);
    console.log(`    ${violation.help}`);
  }

  for (const rule of scan.incompleteRules || []) {
    const groups = groupNodes(rule.nodes);
    console.log(`  [UNVERIFIED] ${rule.id} — ${rule.nodes.length} element(s), ${groups.length} pattern(s)`);
    console.log(`    Reason: axe could not fully evaluate — manual review required`);
    for (const group of groups) {
      console.log(`    · ${group.label}: ${group.count} instance(s)`);
    }
  }

  console.log('');
}

const totalConfirmed = (payload.scans || []).reduce((sum, scan) => sum + (scan.violationCount || 0), 0);
const totalUnverified = (payload.scans || []).reduce((sum, scan) => sum + countIncompleteNodes(scan), 0);

console.log('Summary');
console.log(`  Confirmed violations (safe to treat as real findings): ${totalConfirmed}`);
console.log(`  Unverified items (NOT confirmed failures): ${totalUnverified}`);

if (totalConfirmed === 0 && totalUnverified > 0) {
  console.log('\nNote: Only unverified items found — report must not label these as violations.');
}

process.exit(exitCode);
