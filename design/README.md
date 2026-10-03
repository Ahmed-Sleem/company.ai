# `design/` — UI scaffolding + the locked design system

> **The designer's demo is in place** at `designer-demo/ai-company-os.html` (uploaded as
> `ai-company-os-ready (1).html`, commit `aa65c9a`; blob sha verified byte-identical — the root copy
> is gone; the demo lives here and nowhere else).
> It is judged suitable as the base and **its style is locked**. The tokens extracted from it live in
> `tokens/` and are the style source of truth; the scaffold in `prototype/` is only a
> structural/behavioural placeholder and must be re-skinned from `tokens/`.

## Contents

| Path | What it is |
| --- | --- |
| `tokens/company-os-pixel.css` | **The design system** — tokens + pixel skin extracted verbatim from the demo, documented |
| `tokens/company-os-pixel.json` | Same values, machine-readable (for Tailwind/theme generation) |
| `prototype/company-os.html` | **The prototype** — the demo + the change request + the working network view (generated; open this one) |
| `prototype/graph.js` `.css`, `prototype-changes.css`, `build-prototype.py`, `verify.mjs` | The network view, the changes, the rebuild script and the verification gate (11 checks) |
| `prototype/probe-browser.mjs` | The browser half of verification: 7 checks in a real engine (viewports, framing, overflow, touch, contrast, focus) |
| `screenshots/` | **README gallery** — the 12 captures are **in place** (taken 2026-10-03 from the prototype itself, dark + light, EN + AR, desktop + mobile), with `shots.mjs` (one-command re-capture) and `README.md` |
| `archive/gui-scaffold.html` | The first dependency-free scaffold, kept for reference only — superseded by `prototype/company-os.html` |
| `designer-demo/ai-company-os.html` | **The designer's demo** (renamed, no `" (1)"`), byte-identical to the upload — the visual reference; never edit | 
| `designer-demo/SOURCE.md` + `install.sh` | Provenance, blob sha, and an offline verify / re-download helper |

Review and change request: `../_research/17-demo-review.md`.
What was implemented, and its verification: `../_research/18-changes-implemented.md` +
`prototype/README.md`.

Run the gate: `node design/prototype/verify.mjs` (11 checks, no dependencies).
Run the browser probe: `node design/prototype/probe-browser.mjs` (7 checks; needs Playwright).

## What the designer's demo contains (verified — full inventory in `../_research/17-demo-review.md`)

Six routes (`team · tasks · inbox · comms · network · settings`), a 4-stage task board with decision
inbox, conversations with a visible model selector and voice notes, a reserved network page, and a
complete state system (`default / loading / empty / error / restricted`). 65 pixel portraits.
EN/AR with structural RTL, dark/light/system, six palettes + a contrast-checked custom accent.

## What the scaffold demonstrates

- **Navigation + app shell** — company switcher, main nav, global search, notifications, account, budget meter
- **Company** — KPI strip, employee cards (avatar, title, live status, current activity, budget, trust level), nested reporting hierarchy, "add employee"
- **Task board** — 5 columns, task cards (owner, priority, due, progress), task detail drawer
- **Inbox** — decision cards showing *recommendation · confidence · cost · cost of delay* + approve/reject/ask/reassign
- **Chats** — conversation list, thread with files/images/links/voice notes, **model selector**, @mentions, message states
- **Network** — the **reserved** area (deliberately empty, per the brief)
- **Settings** — element-coverage checklist against the brief + UI state chips
- **Dark + light**, **English (LTR) + Arabic (RTL)** toggles, mobile-usable layout

Open it: `design/prototype/company-os.html` (or the live preview server on port 8080).

## The merge protocol (how the designer's style replaces the scaffold's)

0. **Done:** the designer's values are extracted into `tokens/company-os-pixel.css|json`. Point the
   product's theme at those files; the scaffold is now the thing that gets re-skinned, not the demo.
1. **Tokens first.** Every colour, radius, spacing, shadow, duration and font in the scaffold is a CSS
   variable under `:root` / `[data-theme="light"]`. Map the designer's demo values onto **those names**.
   Do not rename tokens; do not hard-code values inside components.
2. **Semantic colours are locked by meaning, not by hue.** `--ok` (healthy), `--run` (working),
   `--warn` (paused/budget), `--err` (failed), `--appr` (needs your decision), `--idle`. The designer may
   change the *hue* of each; the *meaning* must stay consistent everywhere.
3. **States are part of the style.** Empty / loading / error / success must be specified for every list
   and panel — they are in `Settings → UI states` in the scaffold as a reminder.
4. **RTL is structural.** Layout must mirror via logical CSS properties (`inset-inline-start`,
   `margin-inline`, `border-inline-end`) — never left/right. The scaffold already does this; keep it.
5. **Layout is not locked.** Section order, panel widths and view structure are still open — the
   designer may restructure freely as long as the elements from `designer-brief.md` are all present.
6. **The network area stays reserved.** No design decisions there yet (see
   `../_research/14-obsidian-graph-and-canvas.md` for the research that will inform it later).

## What to send back for the next iteration

- ~~The demo HTML plus the token table~~ **received** — tokens extracted to `tokens/`.
- Open questions for the designer (from `../_research/17-demo-review.md` §9): confirm the four board
  column names; whether the pixel face may be used for numbers in Arabic; and avatar-art quality on
  screen.
- Notes on anything in the scaffold that conflicts with the style direction.
- Confirmation of which elements are still missing from the brief.

## Tech note

The production UI will be built with **React Flow** (canvas), **d3-force + PixiJS** (the network view),
**shadcn/ui** (components) and design tokens compiled to CSS variables — so anything expressed as tokens
in the designer's demo transfers directly. See `../_research/15-code-harvest-plan.md`.
