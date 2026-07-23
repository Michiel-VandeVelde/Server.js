#!/bin/bash
# Usage: scripts/add-converted-package-ignores.sh pkg1 pkg2 ...
#
# Appends compiled-output ignore patterns for the given (now-TypeScript) packages
# to the "Compiled TypeScript output" section of .gitignore, and their bin/*
# entry-point shims to .eslintignore. Run this from the repo root once a
# package's lib/index/bin sources have been converted to .ts, as part of that
# migration-layer PR — it is what turns the promise in .gitignore's "Added
# per-package as each one converts" comment into an actual, reviewable diff.
#
# Idempotent, but NOT additive: each call rewrites the whole generated block
# from scratch, so always pass the FULL cumulative list of converted packages
# (every package converted so far, not just the ones new to this layer) —
# passing only the new ones will silently drop previous packages' patterns.
set -e

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 pkg1 pkg2 ..." >&2
  exit 1
fi

MARKER="scripts/add-converted-package-ignores.sh once that package actually converts."

PATTERNS=""
for pkg in "$@"; do
  PATTERNS="$PATTERNS
packages/$pkg/lib/**/*.js
packages/$pkg/index.js
packages/$pkg/bin/*.js"
done
# bin/ entry-point shims (extensionless, no compiled sibling to un-ignore) stay runnable
for pkg in "$@"; do
  case "$pkg" in
    server) PATTERNS="$PATTERNS
!packages/server/bin/ldf-server
!packages/server/bin/ldf-server-migrate-config-3x" ;;
    feature-summary) PATTERNS="$PATTERNS
!packages/feature-summary/bin/generate-summary" ;;
  esac
done

node -e "
const fs = require('fs');
const marker = process.argv[1];
const patterns = process.argv[2];
let content = fs.readFileSync('.gitignore', 'utf8');
const markerIdx = content.indexOf(marker);
if (markerIdx === -1) { console.error('marker not found in .gitignore'); process.exit(1); }
const afterMarker = markerIdx + marker.length;
const rest = content.slice(afterMarker);
const nextBlank = rest.indexOf('\n\n');
const before = content.slice(0, afterMarker);
const after = nextBlank === -1 ? '' : rest.slice(nextBlank);
fs.writeFileSync('.gitignore', before + '\n' + patterns.trim() + '\n' + after.replace(/^\n+/, '\n'));
" "$MARKER" "$PATTERNS"

echo "Updated .gitignore for: $*"
echo "Note: .eslintignore's repo-wide *.d.ts / *.js.map patterns already cover these"
echo "packages too (see .eslintignore's own comment) — only compiled *.js needed adding here."
