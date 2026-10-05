#!/usr/bin/env bash
# Keep the designer's demo in its organised home: design/designer-demo/ai-company-os.html
#
# Default mode VERIFIES the local copy against the blob sha of the uploaded original — works with
# no network. Pass --force to re-download from the repo (needed if the designer uploads a new file).
#
# Usage:  bash design/designer-demo/install.sh            # verify (offline OK)
#         bash design/designer-demo/install.sh --force    # re-download + verify
# Exit:   0 = verified, 1 = download failed, 2 = differs from the reviewed snapshot.

set -u

REPO='Ahmed-Sleem/company.ai'
BRANCH='main'
REMOTE_NAME='ai-company-os-ready (1).html'
REMOTE_PATH='ai-company-os-ready%20(1).html'
EXPECTED_SHA='7dd2e203d713d0d7d13cf3371e27e28b834f79f0'
EXPECTED_SIZE=383911

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/ai-company-os.html"
FORCE="${1:-}"

verify () {  # $1 = path
  local sha size
  sha="$(git hash-object "$1")"
  size="$(wc -c < "$1" | tr -d ' ')"
  echo "  sha : $sha"
  echo "  size: $size bytes"
  if [ "$sha" = "$EXPECTED_SHA" ]; then echo "✓ matches the reviewed snapshot"; return 0; fi
  echo "⚠ differs from the reviewed snapshot ($EXPECTED_SHA)" >&2
  return 2
}

if [ "$FORCE" != "--force" ] && [ -f "$OUT" ]; then
  echo "→ verifying existing $OUT"
  verify "$OUT" && exit 0
  echo "  (re-run with --force to download again, then update design/tokens/company-os-pixel.*" >&2
  echo "   if the tokens moved, and re-run the review in _research/17-demo-review.md)" >&2
  exit 2
fi

echo "→ downloading $REPO@$BRANCH : $REMOTE_NAME"
TMP="$OUT.download"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "  method: gh api"
  gh api "repos/$REPO/contents/$REMOTE_PATH?ref=$BRANCH" --jq '.content' \
    | tr -d '\n' | base64 -d > "$TMP"
else
  echo "  method: curl (raw.githubusercontent.com)"
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/$REMOTE_PATH" -o "$TMP" || true
fi

if [ ! -s "$TMP" ]; then
  echo "✗ download failed — no network here, or the branch/path changed." >&2
  echo "  The reviewed copy at $OUT is still usable; only use --force when you have network." >&2
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$OUT"
size=$(wc -c < "$OUT" | tr -d ' ')
if [ "$size" -ne "$EXPECTED_SIZE" ]; then
  echo "⚠ size differs from the reviewed snapshot ($EXPECTED_SIZE bytes) — the designer may have" >&2
  echo "  updated the demo. Re-run the review and refresh design/tokens/company-os-pixel.*" >&2
  exit 2
fi
verify "$OUT"
