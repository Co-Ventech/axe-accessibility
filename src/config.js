require('dotenv').config();

const uiBaseUrl = (process.env.UI_BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/$/, '');
const apiBaseUrl = (process.env.API_BASE_URL || 'https://api.practicesoftwaretesting.com').replace(/\/$/, '');

module.exports = {
  uiBaseUrl,
  apiBaseUrl,
  headless: process.env.HEADLESS !== 'false',
  failOn: (process.env.FAIL_ON || 'none').toLowerCase(),
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
  timeoutMs: Number(process.env.TIMEOUT || 60_000),
};
