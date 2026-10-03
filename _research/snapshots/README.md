# `snapshots` — ready-to-download copies of the whole project

This folder exists for one practical reason: **the workspace sandbox wipes ignored files between
sessions**, so a copy that is not committed disappears. Files here are **tracked on purpose** so they
survive and so they travel with the repository.

| File | What it is |
|---|---|
| `company_ai_FULL_2026-10-03.zip` | The complete project as of 2026-10-03: `README.md`, `LICENSE`, `.gitignore`, all of `design/` (demo, tokens, prototype, gate, browser probe, **the 12 gallery screenshots**), all of `_research/` (documents 00–23, rules, dev-docs, data, harvest, tools). Verified by extracting it to a clean folder and running `node design/prototype/verify.mjs` → 11/11. |

## How to use it

1. Download the zip from here (GitHub: click the file → **Download raw file**).
2. Unzip it anywhere: it opens as **one folder** (`company_ai_FULL_2026-10-03/`) — that folder is the
   whole project.
3. To update `main` on GitHub, follow `23-publish-guide.md` (§23.2 = one paste into a new Arena
   session; §23.3 = clicks in the GitHub website).

## Rules for this folder

- **One zip per published milestone.** Name them `company_ai_<milestone>_<date>.zip`.
- After adding a new snapshot, delete the previous one so the repository does not grow without bound.
- The zip never contains `.git`, `node_modules`, the checkpoints folder, or **this folder** itself
  (so the numbers below stay exactly true — nothing in the zip can invalidate them).
- A snapshot is **not** a substitute for committing the real files — it is a convenience copy.

---

**Current file:** `company_ai_FULL_2026-10-03.zip` — **71 files**, **2,873,322 bytes** (2873322 bytes exactly), sha256 `c0d5f31b4fe2569041e97e4ea458811d8aa11d7d44611cae5539b1d2c9dda13c`.

**How to check it yourself:**

```bash
unzip company_ai_FULL_2026-10-03.zip -d /tmp/check
cd /tmp/check/company_ai_FULL_2026-10-03
node design/prototype/verify.mjs        # must print 10/10
shasum -a 256 ../../company_ai_FULL_2026-10-03.zip   # must match the sha256 above
```

**Rebuilt on 2026-10-03 during the publish to `main`**, because a git-style patch carries text files
only and the previous zip could not travel in one. Rebuild it the same way at each milestone:

```bash
# from the repository root, with a clean tree
python3 - <<'PY'
import os, zipfile
root, out = '.', '/tmp/company_ai_FULL.zip'
skip_dir = os.path.normpath('_research/snapshots')
skip_rel = {'.git'}
names = []
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if os.path.join(dp, d) != skip_dir and d not in skip_rel]
    for f in fn:
        names.append(os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/'))
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(names):
        z.write(rel, 'company_ai_FULL_2026-10-03/' + rel)
print(len(names), 'files ->', out)
PY
```
