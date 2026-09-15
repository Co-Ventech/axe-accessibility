const fs = require('fs');
const path = require('path');
const { groupNodes } = require('./nodeGrouping');

const evidenceRoot = path.join('reports', 'evidence');
const CONTEXT_PADDING = 180;
const MIN_CLIP_WIDTH = 760;
const MIN_CLIP_HEIGHT = 520;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function clearEvidenceDir() {
  if (fs.existsSync(evidenceRoot)) {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
}

function buildContextClip(box, viewport) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  let width = Math.max(box.width + CONTEXT_PADDING * 2, MIN_CLIP_WIDTH);
  let height = Math.max(box.height + CONTEXT_PADDING * 2, MIN_CLIP_HEIGHT);

  width = Math.min(width, viewport.width);
  height = Math.min(height, viewport.height);

  let x = centerX - width / 2;
  let y = centerY - height / 2;

  x = Math.max(0, Math.min(x, viewport.width - width));
  y = Math.max(0, Math.min(y, viewport.height - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

async function highlightElement(locator) {
  await locator.evaluate((element) => {
    element.setAttribute('data-a11y-highlight', element.style.outline || '');
    element.setAttribute('data-a11y-shadow', element.style.boxShadow || '');
    element.setAttribute('data-a11y-offset', element.style.outlineOffset || '');
    element.style.outline = '4px solid #f97316';
    element.style.outlineOffset = '3px';
    element.style.boxShadow = '0 0 0 8px rgba(249, 115, 22, 0.45)';
  });
}

async function unhighlightElement(locator) {
  await locator.evaluate((element) => {
    element.style.outline = element.getAttribute('data-a11y-highlight') || '';
    element.style.outlineOffset = element.getAttribute('data-a11y-offset') || '';
    element.style.boxShadow = element.getAttribute('data-a11y-shadow') || '';
    element.removeAttribute('data-a11y-highlight');
    element.removeAttribute('data-a11y-shadow');
    element.removeAttribute('data-a11y-offset');
  });
}

async function captureContextScreenshot(page, locator, absolutePath) {
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('Viewport size unavailable for context screenshot');
  }

  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element bounding box unavailable');
  }

  const clip = buildContextClip(box, viewport);

  await highlightElement(locator);
  try {
    await page.screenshot({
      path: absolutePath,
      clip,
      animations: 'disabled',
      scale: 'device',
    });
  } finally {
    await unhighlightElement(locator);
  }
}

async function captureNodeScreenshot(page, scanName, ruleId, fileKey, target) {
  const scanSlug = slugify(scanName);
  const selector = target.join(' ');
  const filename = `${ruleId}-${fileKey}.png`;
  const relativePath = path.posix.join('evidence', scanSlug, filename);
  const absolutePath = path.join('reports', relativePath);

  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'attached', timeout: 8_000 });
    await locator.scrollIntoViewIfNeeded({ timeout: 8_000 });
    await page.waitForTimeout(250);
    await captureContextScreenshot(page, locator, absolutePath);
    return {
      screenshot: relativePath,
      captureNote: 'Context capture around the highlighted element (2x resolution).',
    };
  } catch {
    const fallbackName = `${ruleId}-${fileKey}-viewport.png`;
    const fallbackRelative = path.posix.join('evidence', scanSlug, fallbackName);
    const fallbackAbsolute = path.join('reports', fallbackRelative);
    try {
      await page.screenshot({
        path: fallbackAbsolute,
        fullPage: false,
        animations: 'disabled',
        scale: 'device',
      });
      return {
        screenshot: fallbackRelative,
        captureNote: 'Element could not be isolated — viewport capture shown.',
      };
    } catch {
      return { screenshot: null, captureNote: 'Screenshot unavailable for this element.' };
    }
  }
}

async function attachEvidenceToNodes(page, scanName, ruleId, nodes) {
  const groups = groupNodes(nodes);

  for (const group of groups) {
    const representative = group.representative;
    if (!representative?.target?.length) {
      continue;
    }

    const capture = await captureNodeScreenshot(page, scanName, ruleId, group.slug, representative.target);
    const sharedNote =
      group.count > 1
        ? `${capture.captureNote || 'Context capture.'} Representative of ${group.count} similar instance(s).`
        : capture.captureNote;

    for (const node of group.nodes) {
      node.screenshot = capture.screenshot;
      node.captureNote = sharedNote;
      node.groupKey = group.slug;
      node.groupLabel = group.label;
    }
  }
}

async function attachScanEvidence(page, scanName, { violations = [], incompleteRules = [] }) {
  for (const violation of violations) {
    await attachEvidenceToNodes(page, scanName, violation.id, violation.nodes);
  }
  for (const rule of incompleteRules) {
    await attachEvidenceToNodes(page, scanName, rule.id, rule.nodes);
  }
}

module.exports = {
  clearEvidenceDir,
  attachScanEvidence,
};
