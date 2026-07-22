#!/usr/bin/env node
// nyc writes an empty coverage/lcov.info when nothing matches its "include" glob to
// instrument — true for this very first layer of the migration, where zero .ts files
// exist under packages/*/lib yet. .nycrc.json's "all": true makes nyc report real
// (if 0%) coverage for every file it CAN see once at least one exists, but can't
// conjure files that don't exist at all, so this fallback is still needed here.
// The coveralls package's lcov-parse rejects a genuinely empty string outright,
// failing the "Submit coverage results" CI step. A minimal, syntactically valid
// (if data-less) LCOV record keeps that step working, while leaving real coverage
// output completely untouched once tests actually produce it.
const fs = require('fs');
const path = 'coverage/lcov.info';

if (!fs.existsSync(path) || fs.statSync(path).size === 0) {
  fs.mkdirSync('coverage', { recursive: true });
  fs.writeFileSync(path, 'TN:\nSF:test/run-mocha.sh\nend_of_record\n');
}
