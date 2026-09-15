const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generateReport, htmlPath } = require('./htmlReport');
const { clearEvidenceDir } = require('./evidenceCapture');

const args = process.argv.slice(2);
const headed = args.includes('--headed');
const playwrightArgs = args.filter((arg) => arg !== '--headed');

if (headed) {
  process.env.HEADLESS = 'false';
}

clearEvidenceDir();

const playwrightBin = path.join(__dirname, '..', '..', 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [playwrightBin, 'test', ...playwrightArgs], {
  stdio: 'inherit',
  env: process.env,
});

if (fs.existsSync(path.join('reports', 'axe-results.json'))) {
  generateReport();
}

if (fs.existsSync(htmlPath)) {
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'start', '', path.resolve(htmlPath)], { stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    spawnSync('open', [path.resolve(htmlPath)], { stdio: 'ignore' });
  } else {
    spawnSync('xdg-open', [path.resolve(htmlPath)], { stdio: 'ignore' });
  }
}

process.exit(result.status === null ? 1 : result.status);
