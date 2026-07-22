#!/bin/sh
# Wraps mocha so the test suite doesn't hard-fail while this staged TypeScript
# migration hasn't converted any package's tests yet (an incremental rollout's
# early layers legitimately match zero spec files). Once real spec files exist,
# this runs mocha exactly as before, and real test failures still fail the build.
set -e

if [ -z "$(find packages -path '*/test/*' -name '*-test.ts' -print -quit 2>/dev/null)" ]; then
  echo "No test files yet (expected during the early layers of the TypeScript migration rollout)."
  exit 0
fi

TS_NODE_PROJECT=tsconfig.test.json TS_NODE_PREFER_TS_EXTS=true \
  mocha --require ts-node/register --require ./test/test-setup.ts \
  "packages/*/test/**/*-test.ts" --recursive --timeout 500
