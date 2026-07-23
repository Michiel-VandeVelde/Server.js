#!/bin/sh
# Runs both the already-converted (*-test.ts) and not-yet-converted (*-test.js)
# spec files, so this staged migration never silently drops the existing JS
# suite while packages are being converted one at a time. Only skips mocha
# entirely (rather than hard-failing on "no test files found") in the narrow
# window where literally neither pattern matches anything yet.
set -e

if [ -z "$(find packages -path '*/test/*' \( -name '*-test.ts' -o -name '*-test.js' \) -print -quit 2>/dev/null)" ]; then
  echo "No test files yet (expected during the very first layer of the TypeScript migration rollout)."
  exit 0
fi

TS_NODE_PROJECT=tsconfig.test.json TS_NODE_PREFER_TS_EXTS=true \
  mocha --require ts-node/register --require ./test/test-setup.ts \
  "packages/*/test/**/*-test.ts" "packages/*/test/**/*-test.js" --recursive --timeout 500
