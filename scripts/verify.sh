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
#   4. tests               — 48 database/gateway/API/contract/token tests
#   5. web tests           — the shell, the four data states, RTL, theme (jsdom)
#   6. repo checks         — raw values, logical properties, build context, licences, docs
#   7. build               — the production web build (this is what gets served)
#   8. browser smoke       — real Chromium against the real API (15 checks)
#   9. design gate         — the designer's own prototype still passes its 11 checks
#
# Steps that need Playwright (8, 9) are skipped with a clear note if Chromium is not installed;
# every other step is required.
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
skip_if_no_browser() {
  if node -e "require.resolve('playwright')" 2>/dev/null && [ -d "$HOME/.cache/ms-playwright" ]; then
    return 0
  fi
  printf '\033[33m· skipped: Playwright/Chromium are not installed (see README: dev setup)\033[0m\n'
  SKIPPED=$((SKIPPED+1))
  return 1
}

run "1/9 type-check (whole workspace)" npx tsc -p tsconfig.json --noEmit
run "2/9 tokens in sync with the design source" node packages/tokens/src/generate.mjs --check
run "3/9 lint" npx oxlint
run "4/9 database, gateway, API and contract tests" npx vitest run
run "5/9 web app tests (shell, states, RTL)" npm test -w @company/web --silent
run "6/9 repository checks" bash -c '
  for check in raw-values logical-properties build-context licence-gate docs; do
    node "scripts/checks/$check.mjs" || exit 1
  done'
run "7/9 production web build" npm run build -w @company/web --silent

if skip_if_no_browser; then
  run "8/9 browser smoke test (real API + real Chromium)" node apps/web/e2e/smoke.mjs
  run "9/9 design gate (the designer prototype, 11 checks)" node design/prototype/verify.mjs
fi

printf '\n\033[1m── gate summary ──\033[0m\n'
printf 'passed %d · failed %d · skipped %d\n' "$PASSED" "$FAILED" "$SKIPPED"
if [ "$FAILED" -gt 0 ]; then
  printf '\033[31mTHE GATE IS RED — do not commit or push.\033[0m\n'
  exit 1
fi
printf '\033[32mTHE GATE IS GREEN — safe to commit.\033[0m\n'
