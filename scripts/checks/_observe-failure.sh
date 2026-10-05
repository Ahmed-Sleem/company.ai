#!/usr/bin/env bash
# Proves each check can fail. Creates a deliberate violation, runs the check expecting
# exit 1, removes the violation, and expects the check to pass. Run once after adding a check.
set -u
cd "$(dirname "$0")/../.."

pass=0; fail=0
probe() { # name, file, content, check
  local name="$1" file="$2" content="$3" check="$4"
  mkdir -p "$(dirname "$file")"
  # a probe must be able to fail a real document without damaging it
  if [ -e "$file" ]; then cp -a "$file" "$file.probe-backup"; fi
  printf '%s' "$content" > "$file"
  if node "$check" >/dev/null 2>&1; then
    echo "PROBLEM: $name did NOT fail on a bad input"; fail=$((fail+1))
  else
    echo "ok: $name failed as expected"; pass=$((pass+1))
  fi
  if [ -e "$file.probe-backup" ]; then mv -f "$file.probe-backup" "$file"; else rm -f "$file"; fi
  if node "$check" >/dev/null 2>&1; then
    echo "ok: $name passes on clean input"; pass=$((pass+1))
  else
    echo "PROBLEM: $name still fails after the bad input was removed"; fail=$((fail+1))
  fi
}

probe "raw-values" "apps/web/src/styles/_probe.css" ".x{color:#ff00ff}" "scripts/checks/raw-values.mjs"
probe "logical-properties" "apps/web/src/styles/_probe.css" ".x{margin-left:8px}" "scripts/checks/logical-properties.mjs"
probe "namespace-lock" "apps/web/src/_probe.ts" "const kind = id.split('_')[0];" "scripts/checks/namespace-lock.mjs"
probe "build-context" "apps/web/src/_probe.ts" "import x from '../../design/prototype/company-os.html';" "scripts/checks/build-context.mjs"
probe "licence-gate" "node_modules/_probe-agpl/package.json" '{"name":"_probe-agpl","version":"1.0.0","license":"AGPL-3.0"}' "scripts/checks/licence-gate.mjs"
probe "docs" "_research/dev-docs/THINGS_DONE.md" "no headings at all" "scripts/checks/docs.mjs"
echo
echo "$pass checks behaved correctly, $fail wrong"
exit $((fail > 0))
