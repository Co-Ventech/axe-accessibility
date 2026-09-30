require('dotenv').config();

const uiBaseUrl = (process.env.UI_BASE_URL || 'https://staging.noahcares.com').replace(/\/$/, '');

module.exports = {
  uiBaseUrl,
  loginEmail: process.env.LOGIN_EMAIL || '',
  loginPassword: process.env.LOGIN_PASSWORD || '',
  headless: process.env.HEADLESS !== 'false',
  failOn: (process.env.FAIL_ON || 'serious').toLowerCase(),
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
  timeoutMs: Number(process.env.TIMEOUT || 90_000),
};
