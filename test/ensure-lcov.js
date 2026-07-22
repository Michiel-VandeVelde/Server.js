#!/usr/bin/env node
// nyc writes an empty coverage/lcov.info when no code ran under its instrumentation
// (e.g. this staged migration's early layers, which legitimately have zero test files
// yet — see run-mocha.sh). The coveralls package's lcov-parse rejects a genuinely empty
// string outright, failing the "Submit coverage results" CI step. A minimal, syntactically
// valid (if data-less) LCOV record keeps that step working during the early layers, while
// leaving real coverage output completely untouched once tests actually run.
const fs = require('fs');
const path = 'coverage/lcov.info';

if (!fs.existsSync(path) || fs.statSync(path).size === 0) {
  fs.mkdirSync('coverage', { recursive: true });
  fs.writeFileSync(path, 'TN:\nSF:test/run-mocha.sh\nend_of_record\n');
}
