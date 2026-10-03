# THINGS_DONE — append-only completed-work log

> Never rewrite an entry. Append after validation. Include: date/time, phase/task, files, behaviour,
> dependencies, validation commands + results, checkpoint path, limitations.

---

## 2026-10-03 03:20 — PUBLISHED: the organised tree is on `main` (route 23.2 executed in a session with GitHub access)

- **Task (user):** *"apply this patch to it, merge all to the main, have it in the latest version"* —
  the session patch (`01a0f9f3-… (2).patch`, 59 entries) plus the repository URL, executed in a session
  that **does** have GitHub access.
- **Route:** `23-publish-guide.md` §23.2 (the one-paste publish), steps 1–5 and 8. The token the user
  pasted was used for this session's git/API access only; it is not stored in the repo, not written to
  any file, and should be revoked by the user.
- **What was done:**
  1. Restored **58 text files** from the patch (`_research/tools/restore_from_patch.py`) — every entry
     except the one binary. Where the patch and `main` both carried a file, the patch version won
     (it is the newer, organised one): `12-user-rules-received.md`, `_research/README.md`,
     `harvest/clone-all.sh`, `rules/README.md`.
  2. Deleted the five superseded root files —
     `DESIGN_SYSTEM.md`, `DEVELOPMENT_REQUIREMENTS.md`, `GENERAL_GUI_AGENT_RULES.md`,
     `UI Governance Contract.txt`, `ai-company-os-ready (1).html`. All four rule documents were
     verified **byte-identical** to their new home in `_research/rules/` before deletion, and the HTML
     is byte-identical (md5 `ff4a906345844f796be3d2cbd36df457`) to
     `design/designer-demo/ai-company-os.html`. Nothing was lost.
  3. Also removed the loose session-patch upload from the root
     (`01a0f9f3-… (1).patch`, 1.39 MB) — it was superseded by the newer patch and is not project
     content; the root now holds exactly `README.md`, `LICENSE`, `.gitignore`, `design/`, `_research/`.
  4. Rebuilt the snapshot zip (a patch cannot carry binaries): `_research/snapshots/` — see that
     folder's `README.md` for the current size, file count and sha256, all measured after the rebuild.
- **Validation:** `node design/prototype/verify.mjs` → **10/10** in the working tree, and again
  **10/10** inside a clean extraction of the rebuilt snapshot zip.
- **Published:** branch `publish/organised-tree` → pull request → merged into `main`; GitHub `main`
  now shows the organised tree (the state described in §23.1 as "never published" no longer applies).
- **Limitations:** the rebuilt zip is *not* byte-identical to the pre-publish one (zips embed file
  timestamps), and the two README screenshots are still outstanding — `npx playwright@latest install
  chromium && node design/screenshots/shots.mjs` (guide step 9).

---

## 2026-10-03 03:05 — the patch becomes the transfer route: a no-git restore tool, built and tested

- **Task (user):** the preview link failed with *"Missing Traffic Access Token"*; the zip is still not
  visible on GitHub; they asked what to do with the patch file they downloaded. (The attached patch
  again did **not** arrive in this sandbox — Arena uploads do not land here — so it could not be read;
  the tooling was built and validated against a patch generated locally in the identical format.)
- **Findings:**
  1. **Direct sandbox URLs need Arena's traffic access token**, which only the preview panel injects —
     so "paste the link in a browser" cannot work. That route is dropped.
  2. A **git-style patch carries text files only**; binary files appear as
     `Binary files ... differ`. So a session patch restores every text file (57 of 58 here) and never
     the snapshot zip.
- **Built:**
  - `_research/tools/restore_from_patch.py` (new, stdlib-only Python): parses a patch and writes the
    files — new files, modified files (real hunk application), deletions, renames; reports skipped
    binaries with a reason.
  - `23-publish-guide.md` §23.4b rewritten: what a patch contains, how to check completeness, **Route 1**
    (a copy-paste `restore.py` snippet, no git, no packages), **Route 2** (git: clone → checkout
    bb5c150 → `git apply --stat` → `git apply`), **Route 3** (attach the patch to a new Arena session
    and let it apply, commit, merge, push and continue with P0).
- **Validation:** the new tool restored **57 files** from a real session patch and the gate printed
  **10/10** in the restored tree; the compact snippet (the same logic) also restored 57 files and
  passed 10/10; applying the patch onto a folder that already contained an older README correctly
  replaced it and still passed 10/10; the rebuilt snapshot zip (58 files, now including the tool,
  545,939 bytes, sha256 `194cfd09…a27e4`) was extracted and passed 10/10.
- **Limitation:** binaries cannot travel in a patch; the snapshot zip must come from GitHub (after
  publishing) or the preview while it is alive.

---

## 2026-10-03 02:52 — download page hardened; the patch-file route documented

- **Task (user):** the download button in the preview does nothing; they obtained a **patch file** from
  Arena and asked how to use it. The uploaded patch did **not** arrive in this sandbox (searched the
  whole filesystem; `/home/user/uploads/` does not exist), so it could not be inspected — the guide
  instead tells the user how to verify and apply it.
- **Root cause of the dead link:** the sandbox **restarts between turns and its public URL changes**
  (was `igor0k4sa4y99fhjoqa3c`, is now `i8rgz1b7a2c2yhpo3zdv9`). Additionally, a preview panel can be a
  sandboxed frame that blocks downloads.
- **Fix — Option 1 in the page:** `design/index.html` now offers (a) the download link with
  `target="_blank"` so it escapes the frame, (b) a **Copy the direct link** button, (c) the absolute URL
  printed as selectable text with a "paste into a new browser tab" instruction, and (d) a
  right-click → *Save link as* hint.
- **Fix — Option 2:** the same zip is committed at `_research/snapshots/company_ai_FULL_2026-10-03.zip`,
  so once `main` is published it downloads from GitHub normally (`Download raw file`) — the environment
  where the user's downloads demonstrably work.
- **Documented:** `23-publish-guide.md` §23.4b — what an Arena patch file is, how to verify it holds the
  work (count `diff --git`, look for known paths), and the exact `git clone → checkout bb5c150 →
  git apply` sequence to rebuild every file locally.
- **Validation:** `/` returns 200 (5,522 bytes), `/dl.zip` returns 200 with `application/zip` and
  540,040 bytes, and the HTTP-downloaded bytes hash-match the committed snapshot
  (`0c05ef35…52a3`); gate still 10/10.
- **Limitation:** the preview URL changes on every sandbox restore; the durable routes are GitHub
  (after publishing) and the patch file the user already holds.

---

## 2026-10-03 02:44 — download fixed for real: public URL **and** a tracked snapshot in the repo

- **Root cause found:** the user could not reach the Arena file viewer, and every previous zip
  disappeared because **git-ignored files are wiped by workspace restores** — `_research/checkpoints/`,
  `design/download/` and the served copies were all ignored, so each restore deleted them. Committed
  (tracked) files survive; ignored ones do not.
- **Fix 1 — a tracked snapshot:** `_research/snapshots/company_ai_FULL_2026-10-03.zip` (540,040 bytes,
  sha256 `0c05ef35d5ea5b9f00ba3375cd94eb049321a936f3ff1380e4deb628c2ee52a3`) is now **committed to the
  repository** with `_research/snapshots/README.md` (folder rules: one zip per milestone, replace the
  previous one). Once this branch is published, the user can download it from GitHub directly by
  clicking the file → *Download raw file* — no Arena panels needed.
- **Fix 2 — a public URL for right now:** the preview server (port 8080) serves
  `design/index.html` (a tokens-only landing page) and `design/dl.zip`; the public address is
  `https://8080-<sandbox-id>.e2b.app/` and `/dl.zip`. The served copies stay git-ignored (they are
  rebuilt on demand); the tracked copy is the durable one.
- **Validation:** the zip was rebuilt excluding delivery helpers and the snapshots folder itself,
  extracted to a clean folder (**57 files**, gate **10/10**); then downloaded back over HTTP and the
  sha256 of the downloaded bytes matched the tracked file exactly; the downloaded copy was extracted
  and the gate run again from inside it — 10/10.
- **Limitation:** the preview server dies when the sandbox restores; it is restarted on request. The
  tracked snapshot under `_research/snapshots/` is the artefact that survives.

---

## 2026-10-03 02:36 — the zip is now downloadable through the live preview

- **Task (user):** *"I don't see any opened view to download it — put it somewhere I can get it, or make
  the previewer serve it."*
- **What was built:** `design/index.html` — a small delivery page (tokens only, both themes, RTL line)
  that the preview root now opens, with a primary **Download the full project (.zip)** button plus links
  to the prototype, the designer's demo, the archive and the tokens. The zip is served from
  `design/download/company_ai_FULL_2026-10-03.zip` with `ZIP-INFO.txt` (size, sha256, how to verify).
- **Validation:** the zip was rebuilt into `design/download/` (539,386 bytes, sha256
  `97ff1b07…e3e75d`), extracted to a clean folder and the gate run from inside — **10/10**; the file was
  then **downloaded back over HTTP and its sha256 matched the served file exactly**; the preview root
  returns the new page (200, 4749 bytes) and the zip returns 200 with 539,386 bytes.
- **Repo hygiene:** `design/download/` and `design/index.html` are added to `.gitignore` — delivery
  helpers, not project content (the repo's convention is that snapshots stay out of git). Gate re-run
  after adding them: still 10/10.
- **Checkpoint:** the zip itself is the checkpoint (previous `_research/checkpoints/` copies were wiped
  by a workspace restore, which is why the delivery now lives where the preview can serve it).

---

## 2026-10-03 02:28 — full-repository zip produced and verified

- **Task (user):** *"give me a zip file with the full repo now after all the edits"* (worried that work
  is not pushed, and that the GitHub website still shows the old layout).
- **File:** `_research/checkpoints/company_ai_FULL_2026-10-03.zip` — 538,899 bytes, 57 files,
  sha256 `e0b5cec84d3b39560276ef07eb2a011b10068b8740d90d3005c977d7f25fdb18`.
  Contains the complete organised repo: `README.md`, `LICENSE`, `.gitignore`, all of `design/`
  (designer demo, tokens, prototype + gate + graph, screenshots kit, archive) and all of `_research/`
  (00–23, dev-docs, rules, data, harvest). `.git` and the checkpoint folder itself are excluded.
- **Validation:** the zip was extracted to a clean directory and **the gate was run from inside the
  extraction — 10/10 checks passed**; the designer demo is byte-identical (383,911 bytes,
  md5 `ff4a906345844f796be3d2cbd36df457`); a token scan inside the extraction is clean.
- **Limitations:** the zip is a copy, not a publish — `main` still has to be updated by a session with
  GitHub access (`23-publish-guide.md` §23.2 for the one-paste route, §23.3 for the browser route).

---

## 2026-10-03 02:10 — publish guide reduced to one paste; token refused a second time

- **Task (user):** *"use my PAT to fix that, merge all to main"* — a token was pasted again.
- **Action:** the token was **refused and not used, not stored, not echoed** (two independent reasons:
  the sandbox has no outbound network at all, and remote GitHub operations are disabled for this
  session because its pull request was already merged/closed). The refusal and both reasons were
  explained to the user, together with a revoke instruction.
- **Improvement made instead of the requested action:** `23-publish-guide.md` was rewritten so Route A
  is now a **single paste into a new Arena session** (§23.2 + §23.2b), with the browser route kept as
  §23.3 for anyone who prefers it. The guide now states explicitly that no token is needed.
- **Checkpoint:** both zips in `_research/checkpoints/` refreshed (537,903 bytes each).
- **Limitation:** publishing still cannot happen in this session; it needs a session with GitHub access.

---

## 2026-10-03 01:35 — deep harvest scan, publish guide, screenshots kit

- **Task (user):** (a) *"I still see main not organized — should I merge? how from the GitHub GUI, or can
  you merge?"*; (b) the vision: deep search merged with the first research, reuse/adapt/refactor existing
  repositories, one harmonious system connected to the GUI; (c) no hosting for now (Railway or own VPS
  later; the code must be deploy-ready); (d) screenshots of the GUI saved in the repo for the README.
- **Files:**
  - `_research/22-harvest-deep-scan.md` — ten new searches merged with `15`: what changed since the
    first scan (tldraw now paid, Daytona closed-source since 2026-06, Zep CE deprecated, Plane AGPL,
    Mastra Apache-2.0, Trigger.dev v4 Apache-2.0, assistant-ui + Cult UI MIT, Langfuse MIT core vs
    Phoenix ELv2, E2B + microsandbox Apache-2.0), the **one-stack table**, the catalogue by layer with
    depend/vendor/port/reference and the GUI surface each piece feeds, the enforced licence policy and
    trap list, the anti-Frankenstein adaptation rules, what we build ourselves, and the P0–P5 order.
  - `_research/23-publish-guide.md` — plain-language publish guide: why `main` looks old (three copies:
    GitHub, the sandbox's files, wiped commits), **Route A** (a new session — exact paste text, the five
    superseded root files to delete, PR + merge commands) and **Route B** (click-by-click in the
    browser, the `.gitignore` text, the post-merge checklist).
  - `design/screenshots/` — `README.md` (fixed 12-shot list, manual method) and `shots.mjs` (Playwright
    capture; defensive, prints what it saved and what it skipped). **Images not taken: no browser here.**
  - `_research/21` (hosting answered, screenshots recorded), `19` (next actions extended, publish guide
    referenced), `_research/README.md`, root `README.md`, `design/README.md` (screenshots row; gate
    count corrected 7 → 10), `_research/harvest/clone-all.sh` (v2 repo list appended).
- **Security:** the token pasted earlier in chat is not used, stored or echoed (a repository-wide scan for the GitHub token
  prefix → clean; the full string is absent from every file); the publish guide repeats the revoke instruction.
- **Checkpoint:** `_research/checkpoints/company_ai_phase_d2_network_view.zip` (refreshed).
- **Limitations:** the deep scan is desk research (comparisons + licence pages, checked 2026-10-03);
  licences are re-verified at clone time by the CI gate. Screenshots need a browser; publishing needs a
  networked session.

---

## 2026-10-03 00:23 — D0: design system locked, rules received

- **Task:** move the newly uploaded rule files to their place, read them, adopt them.
- **Files:** `GENERAL_GUI_AGENT_RULES.md`, `UI Governance Contract.txt`, `DESIGN_SYSTEM.md`,
  `DEVELOPMENT_REQUIREMENTS.md` (repo root = canonical; copies in `_research/rules/`);
  `_research/rules/README.md` (rewritten: placement, classification, conflict resolutions).
- **Behaviour changed:** none in the product. Governance changed: UI work is now bound by the four
  documents; the pixel style is the project theme, with the documented deviations.
- **Dependencies:** none (files recovered from the uploaded commit `4380202`; no network needed).
- **Validation:** files byte-identical to the upload (`git show 4380202:<path>` → compare);
  headings and rules read in full.
- **Checkpoint:** ``_research/checkpoints/company_ai_phase_d0_docs.zip`` (outside the repo).
- **Limitations:** `DESIGN_SYSTEM.md` was read through its headings, structure and quoted sections;
  its remaining prose is product-specific and is superseded where it conflicts (recorded in
  `_research/rules/README.md`).

---

## 2026-10-03 00:25 — D4: development documentation set

- **Task:** satisfy `DEVELOPMENT_REQUIREMENTS.md` §3 inside the project's single removable folder.
- **Files:** `README.md` (root, new); `_research/dev-docs/README.md`, `IMPLEMENTATION_PLAN.md`,
  `PROJECT_MAP.md`, `SUPPORTING_NOTES.md`, `THINGS_DONE.md` (this file); `_research/README.md`
  index updated.
- **Behaviour changed:** none.
- **Validation:** every path referenced from the root README exists; plan phases carry acceptance
  criteria; conflicts recorded with resolutions.
- **Checkpoint:** as above.
- **Limitations:** the docs describe a pre-build repository; the product phases (P0–P5) are planned,
  not started.

---

## 2026-10-03 00:29 — D1/D2: prototype = demo + change request + the network view

- **Task:** "do the small changes, add the graph of Obsidian but in the same pixel style, under the
  same rules and the same GUI structure".
- **Files (new):** `design/prototype/company-os.html` (generated), `build-prototype.py`, `graph.js`,
  `graph.css`, `prototype-changes.css`, `verify.mjs`, `README.md`;
  `_research/18-changes-implemented.md`.
- **Behaviour changed:** the Network page (previously a reserved placeholder) is now a working
  company graph — three scopes, Force/Rings layouts, five filters, drag/zoom/pan/fit, a selection
  panel that opens the real profile/task/conversation, persisted positions, keyboard control and a
  list-view equivalent. Task cards carry model/approval/blocked/runs facts; the inbox shows the
  reason and what changes plus a bulk low-risk approve; the topbar gained a global “+ New”.
  Layout fixes: content-driven board/roster columns with a minimum card width; avatar art on one
  logical grid at runtime.
- **Dependencies:** none added — no framework, no build tool, no network. Node and Python 3 only.
- **Validation commands and results:**
  - `python3 design/prototype/build-prototype.py` → 8/8 patch checks pass; 377,510 bytes.
  - `node design/prototype/verify.mjs` → **7/7 pass** (build identity, both scripts parse, layout
    settles to 0.000 px/tick over 77 nodes / 82 edges and is deterministic, token scan clean, RTL
    scan clean, demo integrity intact).
  - Observed-failure runs (raw colour, syntax error, hand-edited prototype, physical property) →
    each produced the expected FAIL, then the files were restored (evidence table in `_research/18`
    §3).
  - `curl` over the preview server: `prototype/company-os.html` → 200, 384,559 bytes served
    (recursive listing excluded the rest of `design/`).
- **Checkpoint:** ``_research/checkpoints/company_ai_phase_d2_network_view.zip``.
- **Limitations / open items:**
  1. **No browser in this environment** — visual rendering, contrast, focus order, gestures,
     screen-reader order and 200% zoom are *not* verified. This is the main open item.
  2. The runtime avatar normalisation is a stopgap for a designer re-cut of the 16 portraits.
  3. The enhancement layer applies AI facts after render; the product renders them directly.
  4. i18n resource files, avatar-id migration and attachment configuration remain product steps.
  5. The product build (P0+) has not started; the wedge decision is still open.

---

## 2026-10-03 00:34 — D2 follow-up: view-level check + two defects found by it

- **Task:** extend the gate so the page itself is covered, not only the engine.
- **Files:** `design/prototype/verify.mjs` (check 7 added), `design/prototype/graph.js`,
  `design/prototype/company-os.html` (regenerated).
- **Defects the new check found and that are now fixed:**
  1. `graphView` was replaced by an empty stub outside a browser, which made the whole view
     untestable headlessly (it is now always the real function; `queueInit()` stays browser-guarded);
  2. the side panel was only filled after initialisation, so the column rendered empty on first
     paint (the panel markup is now part of the shell render, via `sideHTML()`/`sideBody()`).
- **Validation:** `node design/prototype/verify.mjs` → **8/8 pass**; the new check was also observed
  failing when the panel copy was removed from the shell (evidence: `_research/18` §3).
- **Checkpoint:** ``_research/checkpoints/company_ai_phase_d2_network_view.zip`` (refreshed).
- **Limitations:** unchanged (no browser in this environment).

---

## 2026-10-03 00:35 — handover state

- Nothing is pushed: this session has no remote access (its pull request was merged, and the sandbox
  has no network). Everything is committed locally on `arena/01a0f9f3-company-ai`.
- The four rule files live in `_research/rules/` (the root copies were removed at the user's
  instruction); they also still exist in the uploaded commit `4380202` on `main`.
- Next action for a session with push access: push the branch/PR, then remove the leftover
  `ai-company-os-ready (1).html` from the repo root (the demo now lives at
  `design/designer-demo/ai-company-os.html`).
