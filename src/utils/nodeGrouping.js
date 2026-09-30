const crypto = require('crypto');

const PATTERN_LABELS = [
  { match: /rating-d\.active.*co2-letter|co2-letter.*rating-d\.active/, label: 'Active CO2 rating badge' },
  { match: /co2-rating-scale.*co2-letter/, label: 'CO2 rating badge letters' },
  { match: /^select$/, label: 'Sort dropdown' },
  { match: /\.container.*span/, label: 'Footer text' },
  { match: /target-size|href="#".*large/, label: 'Small touch target link' },
  { match: /> ul$/, label: 'Invalid list structure' },
  { match: /aria-prohibited-attr/, label: 'Prohibited ARIA attribute' },
  { match: /aria-valid-attr-value/, label: 'Invalid ARIA attribute value' },
];

function normalizePattern(target = []) {
  return target
    .join(' ')
    .replace(/:nth-child\(\d+\)/g, ':nth-child(N)')
    .replace(/\[_ngcontent-ng-c\d+\]/g, '[_ngcontent-*]');
}

function patternSlug(pattern) {
  const hash = crypto.createHash('sha1').update(pattern).digest('hex').slice(0, 6);
  const readable = pattern
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  return `${readable}-${hash}`;
}

function labelForPattern(pattern) {
  for (const entry of PATTERN_LABELS) {
    if (entry.match.test(pattern)) {
      return entry.label;
    }
  }

  const simplified = pattern
    .replace(/\[_ngcontent-\*\]/g, '')
    .replace(/:nth-child\(N\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return simplified || 'Affected element';
}

function extractCardIndices(nodes) {
  const indices = new Set();
  for (const node of nodes) {
    const selector = node.target.join(' ');
    const match = selector.match(/\.card:nth-child\((\d+)\)/);
    if (match) {
      indices.add(Number(match[1]));
    }
  }
  return indices;
}

function groupNodes(nodes = []) {
  const groups = new Map();

  for (const node of nodes) {
    const pattern = normalizePattern(node.target);
    if (!groups.has(pattern)) {
      groups.set(pattern, { pattern, label: labelForPattern(pattern), nodes: [] });
    }
    groups.get(pattern).nodes.push(node);
  }

  return Array.from(groups.values())
    .map((group) => {
      const cardIndices = extractCardIndices(group.nodes);
      return {
        ...group,
        slug: patternSlug(group.pattern),
        count: group.nodes.length,
        cardCount: cardIndices.size || null,
        representative: group.nodes[0],
      };
    })
    .sort((a, b) => b.count - a.count);
}

function formatGroupSummary(group) {
  const parts = [`${group.count} instance(s)`];
  if (group.cardCount && group.cardCount > 1) {
    parts.push(`across ${group.cardCount} repeated regions`);
  }
  return parts.join(' · ');
}

module.exports = {
  groupNodes,
  normalizePattern,
  formatGroupSummary,
  patternSlug,
};
