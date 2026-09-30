const { test } = require('@playwright/test');
const { uiBaseUrl, wcagTags, failOn } = require('../src/config');
const { scanPage, assertScanThreshold } = require('../src/utils/axeScan');
const { login } = require('../src/utils/login');
const { recordScan } = require('../src/utils/resultsStore');
const { readAxeVersion } = require('../src/utils/reportHelpers');

const resultMeta = () => ({
  generatedAt: new Date().toISOString(),
  failOn,
  tags: wcagTags,
  axeVersion: readAxeVersion(),
});

test.describe('Noah Cares accessibility @smoke', () => {
  test('login page meets configured axe threshold', async ({ page }) => {
    const scan = await scanPage(page, {
      name: 'Login',
      url: `${uiBaseUrl}/login`,
    });
    recordScan(scan, resultMeta());
    assertScanThreshold(scan);
  });

  test('signed-in home meets configured axe threshold', async ({ page }) => {
    const landingUrl = await login(page);
    const scan = await scanPage(page, {
      name: 'Signed-in home',
      url: landingUrl,
    });
    recordScan(scan, resultMeta());
    assertScanThreshold(scan);
  });
});
