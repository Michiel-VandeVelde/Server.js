#!/bin/sh
# Runs the coverage-instrumented test suite, then makes sure a valid (if
# data-less) lcov.info exists for the coverage-submission step. Deliberately
# does NOT use `set -e` / a single `;`-chained exit-code capture: both the test
# run and the lcov-repair step's own exit codes are checked explicitly, so a
# crash in either one fails the build instead of being silently discarded by
# whichever command happens to run last.
nyc --reporter=lcov npm run mocha
test_code=$?

node ./test/ensure-lcov.js
lcov_code=$?

if [ "$test_code" -ne 0 ]; then
  exit "$test_code"
fi
exit "$lcov_code"
