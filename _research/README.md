# `_research/` — Temporary research & rules folder

> **Everything in this folder is pre-deployment material. Deleting `_research/` must never break the product.**
> Nothing outside this folder may depend on files inside it.

## What lives here

| Path | Purpose | Removable before deployment? |
| --- | --- | --- |
| `README.md` | This index | Yes |
| `00-executive-summary.md` | The direct answer: is the idea available, how, and who is best | Yes |
| `01-is-the-idea-available.md` | Availability verdict + feature-by-feature availability map | Yes |
| `02-competitor-matrix.md` | Verified comparison matrix (stars, licenses, dates, capabilities) | Yes |
| `03-deep-profiles.md` | Deep profiles of every relevant player | Yes |
| `04-how-they-build-it-architecture.md` | Technical architecture patterns: org charts, goals, connections, protocols | Yes |
| `05-market-and-demand.md` | Market size, funding, adoption data, MENA/Arabic angle, risks | Yes |
| `06-gap-analysis-and-recommendation.md` | What is missing in the market + recommended differentiation & MVP scope | Yes |
| `07-sources.md` | Every source used, with date checked | Yes |
| `08-gui-inventory.md` | **Do they have GUIs?** What kind, who, and the unclaimed GUI | Yes |
| `09-reuse-and-licensing-map.md` | **What to reuse** (licences, traps, fork-vs-build decisions) | Yes |
| `10-feature-brainstorm.md` | **45+ features we can add**, grouped, with novelty/impact/effort + top-12 shortlist | Yes |
| `11-build-strategy.md` | Reference architecture, phase plan, make-vs-reuse, metrics, wedge decision | Yes |
| `12-user-rules-received.md` | ⚠️ Status of the user's 5 rule documents (content not yet received) | Yes |
| `14-obsidian-graph-and-canvas.md` | **How Obsidian does it** (d3-force + PixiJS, JSON Canvas) + library shortlist + our mapping | Yes |
| `15-code-harvest-plan.md` | **Reuse plan**: what to download, licences, merge workflow, target monorepo layout | Yes |
| `harvest/clone-all.sh` | Script that clones every reusable repo **outside** the git repo | Yes |
| `designer-brief.md` | **The hand-off file for the designer** — elements only, no structure, reserved network area | Yes |
| `data/github-snapshot-2026-10-02.json` | Raw GitHub API evidence (reproducible) | Yes |
| `data/competitors.csv` | Same data, spreadsheet-friendly | Yes |
| `rules/` | **User-supplied mandatory rules** (agent rules, coding rules, design rules) — mirrors of canonical root files | Root canonical files stay; mirrors archive with this folder |

## Rules

The user's attached rules file(s) did **not** arrive in the first session (workspace had no attachments).
When re-attached they must be stored in `rules/`. See `rules/README.md` for the expected layout
(`AGENTS.md`, `CODING_RULES.md`, `DESIGN_RULES.md`, etc.) and the split between **mandatory** rules
(never edited without explicit user approval) and **editable** rules (agent may propose changes).

## Removing this folder before deployment

```bash
rm -rf _research/          # research + rules, one shot
```

Keep a copy outside the repo (or in a private knowledge base) — do not lose the rules.

## How to re-verify

```bash
python3 - <<'PY'          # re-run the GitHub evidence snapshot
# see the script embedded in _research/07-sources.md
PY
```

Last updated: **2026-10-02** (Africa/Cairo).
