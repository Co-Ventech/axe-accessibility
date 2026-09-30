const fs = require('fs');
const path = require('path');

const resultsPath = path.join('reports', 'axe-results.json');

function ensureReportsDir() {
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
}

function writeResults(payload) {
  ensureReportsDir();
  fs.writeFileSync(resultsPath, JSON.stringify(payload, null, 2));
}

function readResults() {
  if (!fs.existsSync(resultsPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

function recordScan(scan, meta) {
  const existing = readResults();
  const scans = (existing?.scans || []).filter((item) => item.name !== scan.name);
  scans.push(scan);
  writeResults({
    ...meta,
    scans,
  });
}

module.exports = {
  resultsPath,
  writeResults,
  readResults,
  recordScan,
};
