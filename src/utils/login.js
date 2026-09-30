const { uiBaseUrl, loginEmail, loginPassword } = require('../config');

function assertCredentials() {
  if (!loginEmail || !loginPassword) {
    throw new Error('Set LOGIN_EMAIL and LOGIN_PASSWORD before running the signed-in scan.');
  }
}

async function login(page) {
  assertCredentials();

  await page.goto(`${uiBaseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email address/i).fill(loginEmail);
  await page.getByLabel(/^password/i).fill(loginPassword);
  const terms = page.getByRole('checkbox');
  if (await terms.count()) {
    await terms.first().check();
  }
  await page.getByRole('button', { name: 'Login' }).click();

  try {
    await page.waitForURL((url) => !/\/login\/?$/.test(url.pathname), { timeout: 30_000 });
  } catch (error) {
    const message = await page.locator('body').innerText().catch(() => '');
    const detail = message.replace(/\s+/g, ' ').trim().slice(0, 240);
    throw new Error(`Sign-in stayed on the login page. ${detail || error.message}`);
  }

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url();
}

module.exports = { login };
