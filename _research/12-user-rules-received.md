# 12 — The user's rule documents (RECEIVED 2026-10-03)

**Status: RESOLVED — the rules arrived on 2026-10-03** (repo upload commit `4380202`).
They now live in one place: `_research/rules/` — see `rules/README.md` for the classification
(mandatory vs project-adaptable) and for how each rule combines with the locked pixel style.
The root of the repository holds no rule files.

---

_Original tracking note, kept for history:_

**Status: BLOCKED — the five attached files never arrived in the sandbox.**

Declared attachments (second message, 2026-10-02):

1. `AGENT_RULES_SANITIZED_ACTIVE (1).md`
2. `chunking mechanism.md`
3. `UI Governance Contract.txt`
4. `agent general task brainstoring.md`
5. `GITHUB_PROJECT_UPLOAD_LAW.md`

Verification performed: searched `/home/user/uploads/` (does not exist), the entire filesystem for those
filenames, and the whole workspace for any file not created by the agent — nothing found. Only the repo
and `_research/` exist.

> ⚠️ **Until these files are received, any classification of MANDATORY vs EDITABLE rules is a guess and
> must not be treated as the user's actual rules.**

## What will happen when the content arrives

1. Read all five documents in full.
2. Split rules into **MANDATORY** (never edited, escalate conflicts) / **EDITABLE** (propose diff, apply
   after approval) / **TBD** (treat as mandatory) — see `rules/README.md` for the protocol.
3. Place canonical copies at the **repository root** where tooling auto-discovers them
   (e.g. `/AGENTS.md`) and mirror them into `_research/rules/` (user decision, 2026-10-02).
4. Note that the filenames hint at content that has **direct consequences for this project**:

| File (from its name) | Expected impact on the build |
| --- | --- |
| `AGENT_RULES_SANITIZED_ACTIVE` | Behaviour rules for AI agents working on this repo — affects every coding session |
| `chunking mechanism` | Likely task/message chunking rules — affects orchestration, heartbeats and context packing |
| `UI Governance Contract` | Contract for UI behaviour/consistency — directly governs the org-canvas frontend |
| `agent general task brainstoring` | Brainstorming/task-generation rules — affects how we plan features |
| `GITHUB_PROJECT_UPLOAD_LAW` | Rules for uploading/publishing work to GitHub — affects commits, branches, releases, secrets |

## How to deliver the content

Any of these works:
- **Re-attach** the files in the next message, or
- **Paste the text** directly in chat (even partial — paste the most important one first), or
- **Upload to the repo** yourself and tell the agent to pull them.

Once received, this file will be replaced by an index of the actual rule set.
