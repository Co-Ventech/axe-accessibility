const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

const FAIL_THRESHOLDS = {
  none: [],
  moderate: ['moderate', 'serious', 'critical'],
  serious: ['serious', 'critical'],
  critical: ['critical'],
};

const IMPACT_GUIDANCE = {
  critical: 'Blocks access for some users — fix immediately.',
  serious: 'Major barrier for assistive technology or keyboard users — high priority.',
  moderate: 'Noticeable friction — schedule in the next sprint.',
  minor: 'Best-practice gap — low priority polish.',
};

const RULE_USER_IMPACT = {
  list: 'Screen readers may announce list structure incorrectly, making filters harder to understand.',
  'target-size': 'Touch and motor-impaired users may miss or mis-tap small links and controls.',
  'color-contrast': 'Low vision users may not be able to read text or distinguish controls.',
  label: 'Form fields may be unusable for screen reader or voice-control users.',
  'link-name': 'Links may be announced without meaningful context.',
};

function getFailImpacts(failOn) {
  return FAIL_THRESHOLDS[failOn] || FAIL_THRESHOLDS.none;
}

function countIncompleteNodes(scan) {
  return (scan.incompleteRules || []).reduce((total, rule) => total + (rule.nodes?.length || 0), 0);
}

function getPageStatus(scan, failOn) {
  const failImpacts = getFailImpacts(failOn);
  const blocking = (scan.violations || []).filter((v) => failImpacts.includes(v.impact));
  const confirmedCount = scan.violationCount || 0;
  const unverifiedCount = countIncompleteNodes(scan);

  if (blocking.length > 0) {
    return {
      code: 'fail',
      label: 'Fails gate',
      detail: `${blocking.length} confirmed violation(s) at or above ${failOn} threshold`,
    };
  }

  const detailParts = [];
  if (confirmedCount > 0) {
    detailParts.push(`${confirmedCount} confirmed violation(s)`);
  }
  if (unverifiedCount > 0) {
    detailParts.push(`${unverifiedCount} unverified item(s) needing manual review`);
  }

  if (detailParts.length > 0) {
    return {
      code: 'review',
      label: 'Review findings',
      detail: `${detailParts.join(' · ')} — unverified items are not confirmed failures`,
    };
  }

  return { code: 'pass', label: 'Pass', detail: 'No issues detected at scanned scope' };
}

function getOverallStatus(scans, failOn) {
  const statuses = scans.map((scan) => getPageStatus(scan, failOn));
  if (statuses.some((status) => status.code === 'fail')) {
    return { code: 'fail', label: 'Would fail CI gate', className: 'status-fail' };
  }
  if (statuses.some((status) => status.code === 'review')) {
    return { code: 'review', label: 'Scan complete — review findings', className: 'status-review' };
  }
  return { code: 'pass', label: 'All pages passed', className: 'status-pass' };
}

function formatWcagCriteria(tags = []) {
  return tags
    .map((tag) => {
      const match = tag.match(/^wcag(\d{3,4})$/);
      if (!match) {
        return null;
      }
      const digits = match[1];
      if (digits.length === 3) {
        return `SC ${digits[0]}.${digits[1]}.${digits[2]}`;
      }
      return `SC ${digits[0]}.${digits[1]}.${digits.slice(2)}`;
    })
    .filter(Boolean);
}

function sortViolations(violations) {
  return violations.slice().sort((a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact));
}

function userImpactForRule(violation) {
  return RULE_USER_IMPACT[violation.id] || IMPACT_GUIDANCE[violation.impact] || 'May affect users of assistive technology.';
}

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function readAxeVersion() {
  try {
    return require('axe-core/package.json').version;
  } catch {
    try {
      return require('@axe-core/playwright/package.json').version;
    } catch {
      return 'unknown';
    }
  }
}

function axeReviewReason(node) {
  const checks = [...(node.any || []), ...(node.all || []), ...(node.none || [])];
  const message = checks.map((check) => check.message).find(Boolean);
  if (message) {
    return `Automated check incomplete: ${message}. Verify manually — not a confirmed failure.`;
  }
  return 'Automated check incomplete. Verify manually — not a confirmed failure.';
}

module.exports = {
  IMPACT_ORDER,
  IMPACT_GUIDANCE,
  FAIL_THRESHOLDS,
  getFailImpacts,
  getPageStatus,
  getOverallStatus,
  formatWcagCriteria,
  sortViolations,
  userImpactForRule,
  formatTimestamp,
  readAxeVersion,
  countIncompleteNodes,
  axeReviewReason,
};
