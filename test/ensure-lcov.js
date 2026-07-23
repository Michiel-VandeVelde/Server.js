#!/usr/bin/env node
// nyc writes an empty coverage/lcov.info when no code ran under its instrumentation.
// The coveralls package's lcov-parse rejects a genuinely empty string outright, failing
// the "Submit coverage results" CI step. A minimal, syntactically valid (if data-less)
// LCOV record keeps that step working, while leaving real coverage output completely
// untouched once tests actually run.
//
// This is only legitimate when there is truly no instrumentable source yet (matches
// .nycrc.json's own "include" globs: packages/*/{index,lib/**,bin/**}.{js,ts}) — every
// package in this repo always has real lib/**/*.js source, converted or not, so that
// case shouldn't occur in practice. If matching source DOES exist but lcov.info is still
// empty, that means nyc/ts-node silently failed to instrument it (e.g. a future .nycrc.json
// include-list regression), and papering over that with the same placeholder record would
// hide a real coverage-measurement failure behind a green CI. So that case is a hard error.
//
// (nyc's "all": true config option was considered as an alternative to the placeholder
// itself — it makes nyc report real, if 0%, coverage for every file it CAN see — but it
// broke ambient-module type resolution for ts-node during its own pre-instrumentation walk.
// Not used here.)
const fs = require('fs');
const path = require('path');

const lcovPath = 'coverage/lcov.info';

function hasSourceFile(dir) {
  if (!fs.existsSync(dir))
    return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasSourceFile(full)) return true;
    }
    else if (/\.(js|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
      return true;
  }
  return false;
}

function anySourceExists() {
  if (!fs.existsSync('packages'))
    return false;
  return fs.readdirSync('packages', { withFileTypes: true }).some((pkg) => {
    if (!pkg.isDirectory())
      return false;
    const pkgDir = path.join('packages', pkg.name);
    return ['index.js', 'index.ts'].some((file) => fs.existsSync(path.join(pkgDir, file))) ||
      hasSourceFile(path.join(pkgDir, 'lib')) ||
      hasSourceFile(path.join(pkgDir, 'bin'));
  });
}

const isEmpty = !fs.existsSync(lcovPath) || fs.statSync(lcovPath).size === 0;

if (isEmpty && anySourceExists()) {
  // eslint-disable-next-line no-console -- CLI script reporting a hard failure to stderr
  console.error(
    'coverage/lcov.info is empty, but instrumentable source exists under packages/*/' +
    '{index,lib,bin}. This means nyc/ts-node silently failed to instrument real source ' +
    '(check .nycrc.json\'s "include"/"extension" against tsconfig.json), not that there ' +
    'was nothing to cover.',
  );
  process.exit(1);
}

if (isEmpty) {
  fs.mkdirSync('coverage', { recursive: true });
  fs.writeFileSync(lcovPath, 'TN:\nSF:test/run-mocha.sh\nend_of_record\n');
}
