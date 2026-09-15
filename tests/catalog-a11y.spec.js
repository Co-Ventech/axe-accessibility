const { test } = require('@playwright/test');
const { uiBaseUrl, wcagTags, failOn } = require('../src/config');
const { scanPage, assertScanThreshold } = require('../src/utils/axeScan');
const { fetchFirstInStockProductId } = require('../src/utils/catalogApi');
const { writeResults } = require('../src/utils/resultsStore');

test.describe.configure({ mode: 'serial' });

test.describe('Toolshop catalog accessibility @smoke', () => {
  const scans = [];

  test('home catalog meets configured axe threshold', async ({ page }) => {
    const scan = await scanPage(page, {
      name: 'Home catalog',
      url: `${uiBaseUrl}/`,
    });
    scans.push(scan);
    assertScanThreshold(scan);
  });

  test('product detail meets configured axe threshold', async ({ page }) => {
    const productId = await fetchFirstInStockProductId();
    const scan = await scanPage(page, {
      name: 'Product detail',
      url: `${uiBaseUrl}/product/${productId}`,
    });
    scans.push(scan);
    assertScanThreshold(scan);
  });

  test.afterAll(async () => {
    writeResults({
      generatedAt: new Date().toISOString(),
      failOn,
      tags: wcagTags,
      scans,
    });
  });
});
