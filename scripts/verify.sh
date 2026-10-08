#!/usr/bin/env bash
# =============================================================================================
# The gate. Nothing reaches `main` unless this passes from top to bottom.
#
# Run it before every commit:   bash scripts/verify.sh
#
# It runs, in order (each step is independent, so a failure tells you exactly what broke):
#   1. type-check          — the whole workspace, one TypeScript project
#   2. tokens              — the generated token files match the design source (drift fails)
#   3. lint                — oxlint
#   4. tests               — database/gateway/API/contract/token tests
#   5. web tests           — the shell, states, RTL, theme, the world, icons (jsdom, 86)
#   6. repo checks         — raw values, logical properties, build context, licences, docs
#   7. build               — the production web build (this is what gets served)
#   8. demo file           — the standalone demo still matches that build (no browser needed)
#   9. design gate         — the designer's own prototype still passes its 15 checks (the world tab
#                            and the camera's movement included)
#  10. browser smoke       — real Chromium against the real API (68 checks)
#
# The design gate (8) always runs: it needs no browser. Step 9 needs Chromium and prints the
# three commands that install it if it is missing; every other step is required.
# =============================================================================================
set -u
cd "$(dirname "$0")/.."

PASSED=0; FAILED=0; SKIPPED=0
run() { # label, command…
  local label="$1"; shift
  printf '\n\033[1m▸ %s\033[0m\n' "$label"
  if "$@"; then
    PASSED=$((PASSED+1))
  else
    printf '\033[31m✗ %s failed\033[0m\n' "$label"
    FAILED=$((FAILED+1))
  fi
}
has_browser() {
  # Playwright the package, then Chromium the browser. Both, or the smoke test cannot run.
  node -e "require.resolve('playwright')" 2>/dev/null || return 1
  node -e "
    const { chromium } = require('playwright');
    process.exit(chromium.executablePath() && require('node:fs').existsSync(chromium.executablePath()) ? 0 : 1);
  " 2>/dev/null || return 1
  return 0
}
explain_no_browser() {
  printf '\033[33m· skipped: Chromium is not installed. To run every step:\033[0m\n'
  printf '    npm install\n'
  printf '    npx playwright install chromium\n'
  printf '    sudo npx playwright install-deps chromium   # Linux system libraries\n'
}

# ── guard: a running development API starves the tests on a small machine ──────────────────
# Each API process loads its own PostgreSQL (~400 MB). Running one while the gate runs its
# own databases gets the test workers killed, which looks like a mysterious failure.
if node -e "
const net = require('node:net');
const socket = net.connect({ host: '127.0.0.1', port: 8787 });
socket.on('connect', () => { socket.destroy(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; then
  printf '\033[33m· an API is already running on port 8787.\033[0m\n'
  printf '  Stop it before running the gate (Ctrl-C in its window), then run this again.\n'
  printf '  One PostgreSQL at a time: two of them exhaust this machine memory.\n'
  exit 1
fi

run "1/9 type-check (whole workspace)" npx tsc -p tsconfig.json --noEmit
run "2/10 generated files in sync (tokens · the owner's data · the prototype's world code)" bash -c '
  node packages/tokens/src/generate.mjs --check || exit 1
  node scripts/gen-owner-data.mjs --check || exit 1
  node scripts/build-world-lib.mjs --check'
run "3/10 lint" npx oxlint
run "4/10 database, gateway, API and contract tests" npx vitest run
run "5/10 web app tests (shell, states, RTL, world, icons)" npm test -w @company/web --silent
run "6/10 repository checks" bash -c '
  for check in raw-values logical-properties namespace-lock build-context licence-gate no-budget docs; do
    node "scripts/checks/$check.mjs" || exit 1
  done'
run "7/10 production web build" npm run build -w @company/web --silent

# The demo file is the app, its data and its API frozen into one HTML file. It is generated from the
# build above, so "did someone edit the demo by hand?" and "is the build still the thing we shipped?"
# are the same question — and this step answers it without a browser.
run "8/10 the standalone demo file matches the built app" node scripts/build-demo-html.mjs --check

# The design gate needs no browser — it must run on every machine, every time.
run "9/10 design gate (the designer prototype, 11 checks)" node design/prototype/verify.mjs

if has_browser; then
  run "10/10 browser smoke test (real API + real Chromium)" node apps/web/e2e/smoke.mjs
else
  explain_no_browser
  SKIPPED=$((SKIPPED+1))
fi

printf '\n\033[1m── gate summary ──\033[0m\n'
printf 'passed %d · failed %d · skipped %d\n' "$PASSED" "$FAILED" "$SKIPPED"
if [ "$FAILED" -gt 0 ]; then
  printf '\033[31mTHE GATE IS RED — do not commit or push.\033[0m\n'
  exit 1
fi
printf '\033[32mTHE GATE IS GREEN — safe to commit.\033[0m\n'
