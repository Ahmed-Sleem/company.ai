# 23 — How the organised project gets onto GitHub (`main`)

Plain-language guide. Read §23.1 to understand why GitHub still looks wrong — **the fix itself is one
paste into a new session (§23.2)**. §23.3 is the click-by-click browser alternative.

> ⚠️ **Never paste a token into a chat or a file.** A token that has been pasted anywhere is already
> compromised: revoke it (GitHub → Settings → Developer settings → Personal access tokens). A new
> Arena session needs **no** token — GitHub access is part of the session.

---

## 23.1 Why `main` still looks unorganised

There are three copies of this project, and they are not the same thing:

| Copy | What it is | State |
|---|---|---|
| **GitHub `main`** | what you see in the browser | the **old** layout: four rule files and the downloaded HTML sitting at the root |
| **This sandbox's working files** | the organised project: `README.md`, `LICENSE`, `design/`, `_research/` | **complete and current** — but it cannot push from here |
| **Git commits** | history | this sandbox gets re-cloned between turns, so local commits keep being wiped; the *files* survive, the history does not |

So nothing is lost, and nothing is broken — the organised tree simply has never been **published**.
"Publishing" here means one normal thing: put the organised files on `main`. GitHub calls that a
**merge** (or, when done in the browser, merging a **pull request**). It is a copy operation with a
review step — not something dangerous.

Yes: **you should merge.** The only question is who presses the button, because this session cannot.

---

## 23.2 The one-paste publish (recommended)

**Open a new Arena coding session in this repository, paste the block from §23.2b, and that is all.**
The new session has GitHub access, commits the organised tree, merges your uploads, deletes the five
superseded root files, pushes, opens the PR and merges it. Then it reports back.

You do not need to know git, and you do not need to do anything in the GitHub website.

**If anything looks wrong afterwards, nothing is lost:** the previous state is one commit back, and the
checkpoint zip is a complete copy of everything in this workspace.

> Keep this rule: **never paste a token into a chat or into a file.** A new session does not need one —
> GitHub access is part of the session. If a tool ever asks for credentials, it will ask in its own
> secure prompt, never in the conversation.

### 23.2b The block to paste

```text
Publish the organised project that is sitting in the working tree of this workspace.
It was never committed or pushed because the previous session had no network.

1) git add -A && git commit -m "Organised project: rules in _research/rules, design/ (demo, tokens, prototype, gate), research + plan"
2) git fetch origin
3) git merge origin/main -X ours -m "Merge uploads from main; keep the organised tree"
   (if it stops, keep our versions: git checkout --ours . && git add -A && git commit)
4) Delete these superseded files at the repo root, then commit:
   DESIGN_SYSTEM.md, DEVELOPMENT_REQUIREMENTS.md, GENERAL_GUI_AGENT_RULES.md,
   "UI Governance Contract.txt", "ai-company-os-ready (1).html"
   (the rules live in _research/rules/ now; the demo copy is design/designer-demo/ai-company-os.html)
   git add -A && git commit -m "Remove superseded root files"
5) git push -u origin HEAD
6) gh pr create --base main --title "Organised repo: rules, design system, prototype, research, plan" \
     --body "Rules moved to _research/rules/. Adds design/ (designer demo, pixel tokens, prototype + gate) and extends _research/ to 23 docs including the plan (19), the model/agent research (20), the decision log (21), the harvest scan (22). Root becomes README.md, LICENSE, design/, _research/."
7) gh pr merge --squash        (or stop here and leave the PR for me to review)
8) Verify: node design/prototype/verify.mjs must print 10/10, and the repo root must show only
   README.md, LICENSE, design/, _research/ (plus .gitignore).
9) Take the 12 README screenshots: npx playwright@latest install chromium && node design/screenshots/shots.mjs
10) Then start P0: _research/19-plan-what-remains.md §19.4/§19.5, on the stack in _research/22 §22.2.
```

---

## 23.2c Route A, in detail — what the new session's git commands actually do

For the curious; **you do not need this** to publish.

| Step | What it does in plain words |
|---|---|
| `git add -A && git commit` | Saves the organised tree as one new checkpoint in history |
| `git fetch` / `git merge origin/main -X ours` | Brings your GitHub uploads together with it, keeping the organised versions when both sides have a file |
| deleting the five files | Removes the duplicates that the organised tree replaced (they live on in `_research/rules/` and `design/designer-demo/`) |
| `git push` | Uploads the result to GitHub |
| `gh pr create` + `gh pr merge` | Opens and merges the pull request, which is what writes to `main` |

Why it must be a *new* session: this one has its network access cut (its pull request was already
merged or closed), and its `.git` is re-cloned between turns — so it cannot push even though it can
still edit files.

---

## 23.3 Route B — do it yourself in the browser (no git knowledge needed)

You need the zip: open `_research/checkpoints/company_ai_phase_d2_network_view.zip` in the file viewer
and download it, then unzip it on your computer. It contains the whole organised project.

1. **Upload the organised files.**
   In the repository, click **Add file ▾ → Upload files**. Drag in the unzipped `README.md`, the whole
   `design` folder and the whole `_research` folder. GitHub keeps the folder structure.
   - Skip `_research/checkpoints` — it is only a backup and is meant to stay out of git.
   - Hidden files (`.gitignore`) are sometimes skipped by drag-and-drop; §23.3 step 4 covers that.
2. **Make it a pull request instead of committing straight to main.**
   At the bottom of the upload page choose **Create a new branch for this commit and start a pull
   request**, name the branch `organised`, then **Propose changes** → **Create pull request** →
   **Merge pull request** → **Confirm merge**.
3. **Delete the five superseded files at the root.** For each one: open it, click the **⋯ / trash**
   icon, and commit the deletion:
   `DESIGN_SYSTEM.md` · `DEVELOPMENT_REQUIREMENTS.md` · `GENERAL_GUI_AGENT_RULES.md` ·
   `UI Governance Contract.txt` · `ai-company-os-ready (1).html`.
   (They are not lost: the first four are in `_research/rules/`, the last one is
   `design/designer-demo/ai-company-os.html`.)
4. **Add `.gitignore` if it did not upload.** **Add file → Create new file**, name it `.gitignore`,
   paste:

   ```text
   # build/run artifacts (the product phases will add more)
   node_modules/
   dist/
   build/
   coverage/
   *.log
   .DS_Store
   # generated checkpoints live in the workspace but never in git:
   _research/checkpoints/
   ```

   Commit directly to `main`.
5. **Check the result.** The repository root should show exactly: `README.md`, `LICENSE`, `design/`,
   `_research/` (plus `.gitignore`). Inside `_research/rules/` you should see the four rule documents.
   Open `design/prototype/company-os.html` on GitHub and press **Raw**/**Blob** to confirm it is there.
6. Optionally delete the `organised` branch afterwards (Branches → trash icon).

---

## 23.4b The patch file — your backup, and how to turn it back into files

Arena produces a **patch file** for a session: a plain-text diff of every file the session created or
changed. It is the one download that has demonstrably worked, so treat it as the backup of record.

**What it contains.** Every **text** file (all markdown, HTML, JS, CSS, Python, JSON, the rule
documents) — 57 of the 58 entries in this project. **What it cannot contain:** *binary* files. A diff
stores text; for a binary git writes only `Binary files ... differ`, so the snapshot zip from
`_research/snapshots/` is the one file that must be fetched separately. Nothing else is lost.

**Is it complete?** Open it in a text editor and search for `diff --git`. Around fifty-eight hits means
the whole session is inside. Search for `design/prototype/graph.js` and
`_research/22-harvest-deep-scan.md` to be sure.

---

### Route 1 — no git, no tools: one small script you type yourself

Save the patch anywhere, then put the following in a file named `restore.py` next to it and run
`python3 restore.py your-patch-file.txt` (any Python 3 will do; no packages needed):

```python
import re, sys, os
txt = open(sys.argv[1], encoding='utf-8', errors='replace').read().splitlines()
out, buf, text, files = None, [], False, 0
def flush():
    global files
    if out and text:
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
        open(out, 'w', encoding='utf-8', newline='').write('\n'.join(buf) + ('\n' if buf else ''))
        files += 1
for line in txt:
    if line.startswith('diff --git '):
        flush(); out, buf, text = None, [], False
        m = re.match(r'diff --git a/(.*) b/(.*)$', line)
        if m: out = m.group(2)
    elif out is not None and line.startswith('+++ '):
        p = line[4:].strip()
        text = p != '/dev/null'
        if text: out = p[2:]
    elif out is not None and text and line.startswith('+') and not line.startswith('+++'):
        buf.append(line[1:])
flush()
print('restored', files, 'text files')
```

It writes every text file into the current folder, keeping the same structure. Verified: run on a real
session patch it restored **57 files** and `node design/prototype/verify.mjs` inside the result printed
**10/10 checks passed**.

The full version — which also *applies* a patch onto an existing checkout, deletes removed files and
reports what it skipped — is in the repository at `_research/tools/restore_from_patch.py`:

```bash
python3 _research/tools/restore_from_patch.py your-patch-file.txt restored
```

### Route 2 — with git (three commands)

```bash
git clone https://github.com/Ahmed-Sleem/company.ai company-ai
cd company-ai && git checkout bb5c150
git apply --stat /path/to/your-patch.txt     # preview the file list, writes nothing
git apply        /path/to/your-patch.txt     # writes the files
git status
```

If one file conflicts, apply the rest and copy that one by hand:
`git apply --exclude=<path> your-patch.txt`.

### Route 3 — let it publish itself (best for getting onto GitHub)

Open a **new Arena coding session** in this repository and paste this, attaching the patch file to the
message:

```text
I have attached the Arena patch file for the previous session (all the work of the design stage).

1) Apply it: python3 _research/tools/restore_from_patch.py <attached>.patch.txt restored
   (or: git clone the repo, git checkout bb5c150, git apply <attached>.patch.txt)
2) Move the restored content into the repository (git add -A), commit it.
3) Merge origin/main keeping the organised tree (git merge origin/main -X ours).
4) Delete the superseded root files: DESIGN_SYSTEM.md, DEVELOPMENT_REQUIREMENTS.md,
   GENERAL_GUI_AGENT_RULES.md, "UI Governance Contract.txt", "ai-company-os-ready (1).html".
5) Push, open a pull request to main, and merge it.
6) Verify: node design/prototype/verify.mjs -> 10/10; repo root shows only README.md, LICENSE,
   design/, _research/.
7) Then continue with P0: _research/19-plan-what-remains.md §19.4/§19.5, stack in _research/22 §22.2.
```

That session does everything in one go: nothing to install, nothing to download by hand.

---

## 23.4 After the merge — what good looks like

| Check | Expected |
|---|---|
| Root listing | `README.md`, `LICENSE`, `design/`, `_research/`, `.gitignore` |
| `_research/rules/` | the four rule documents + `README.md` |
| `design/` | `designer-demo/`, `tokens/`, `prototype/`, `archive/`, `README.md` |
| Gate | `node design/prototype/verify.mjs` → **10/10 checks passed** |
| Demo integrity | `design/designer-demo/ai-company-os.html` unchanged (383,911 bytes) |

If something looks wrong after merging, nothing is irreversible: the previous version is one commit
back, and the checkpoint zip is a full copy.
