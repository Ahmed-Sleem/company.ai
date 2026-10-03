# 18 — Changes implemented (the demo + the small fixes + the network view)

Companion to `17-demo-review.md` (which contains the change request). This file records **what was
implemented, where, and with what evidence** — the honest version, including what was not done and
what could not be verified here.

Deliverable: `design/prototype/company-os.html` — the designer's demo, byte-identical in look and
structure, plus the changes below. Rebuildable with `python3 design/prototype/build-prototype.py`;
refreshable/verifiable with `node design/prototype/verify.mjs`.

---

## 1. How the prototype is produced (so the demo stays untouched)

`build-prototype.py` reads `design/designer-demo/ai-company-os.html` and applies four counted
patches:

| Patch | What | Why safe |
|---|---|---|
| P1 | `networkView()` body replaced with a call to `graphView()` (with the original reserved panel kept as the fallback) | span replaced by locating `function networkView(){` … `function settingsView(`; fails loudly if the demo changes |
| P2 | Two stylesheets linked in `<head>` | exact-match on the unique `</head>` |
| P3 | `graph.js` inserted before the demo's app script (located by `const VOICE_NOTE=`) | the demo has two inline scripts; the app one is identified by that marker |
| P4 | A provenance comment after `<html …>` | one match |

Everything else in `company-os.html` is the demo's own bytes. The gate re-generates and compares, so
a hand edit to the prototype is caught.

---

## 2. Item-by-item status

Legend: **Done** = working in the prototype · **Product step** = deliberately not done in a static
single-file demo (recorded in `dev-docs/SUPPORTING_NOTES.md` §7).

| Item (from `17`) | Status | Where | Note |
|---|---|---|---|
| E1 four board stages; AI facts on the card | **Done** | `graph.js` → `addTaskFacts()` | stages untouched: `STAGES=['backlog','progress','review','done']` |
| E2 three columns in the 1190–1650 band | **Done** | `prototype-changes.css` | content-driven `auto-fit` with a floor |
| E3 minimum card width | **Done** | `prototype-changes.css` | `minmax(var(--pg-min-card),1fr)` |
| E4 avatar pixel density normalised | **Done (runtime)** | `graph.js` → `normalizeAvatars()` | 32-grid art mapped onto the 48-grid at 1.5×; the real fix is a re-cut — flagged to the designer |
| E5 avatar as a stable id | Product step | — | AVATARS already carry ids; the agent field still stores an index |
| E6 / A1 i18n resource files | Product step | — | new UI is bilingual (en/ar pairs); the demo's dictionary stays inline |
| E7 `--dim` not used for meaningful text | **Done** | `prototype-changes.css` | new UI uses `--muted` |
| E8 attachment limits in config | Product step | — | documented |
| A2 model / approval / blocked-by / runs | **Done** | `addTaskFacts()` | model read from the employee's real thread; blocked-by from the owner's error state; run count derived from the id and labelled sample |
| A3 reason + what-changes + bulk low-risk approve | **Done** | `addInboxReason()` | reason label derived from the record's own fields (cost, access wording); bulk button only acts on `risk==='low'` |
| A4 network view | **Done** | `graph.js`, `graph.css` | see §4 |
| A5 state seam preserved | **Done** | `graphView()` | honours the demo's `default/loading/empty/error/restricted` switches |
| A6 global “+ New” | **Done** | `addTopbarNew()` | opens the demo's own task/employee/conversation forms |

The enhancement layer is applied after each render by a `MutationObserver` and skips its own edits.
In the product these facts belong in the render functions, not in a post-processing layer; that is
recorded in `dev-docs/SUPPORTING_NOTES.md`.

---

## 3. Verification, and the checks we watched fail

Command: `node design/prototype/verify.mjs` — **11/11 pass** (10 at the time of writing; check 8b was added in §3c).

| Check | Result |
|---|---|
| Prototype is exactly the demo + the four patches | identical to a fresh build (377,510 bytes) |
| `graph.js` parses; the demo's app script parses with the graph interposed | `node --check` |
| Layout converges, stays finite, deterministic | 77 nodes / 82 edges, settled to **0.000 px/tick**; two identical runs end identical; rings layout finite |
| No raw colours or stray lengths in the new CSS/JS | clean (breakpoint literals are the documented platform exception) |
| No physical `left`/`right` in new CSS or markup | clean — logical properties only |
| The demo is still the demo | six views, both themes, RTL rules, native dialogs, storage key, palette hooks |
| The network page renders | English and Arabic strings present, no `undefined` in the markup, `loading/empty/error/restricted` honoured, no-data guard fires |
| **Spacing: nothing overlaps** | force and rings: worst pair clearance +10.0px over 77 nodes, 2 department hulls clear of each other, layout span 967/1698px |
| Tokens and fallbacks in step | 36 CSS geometry tokens matched against their JavaScript fallbacks |

**Observed failures** (a check that was never seen failing proves nothing) — each was produced by
mutating a file, running the gate, and restoring:

| Mutation | Gate said |
|---|---|
| `color:var(--text)` → `color:#ff00ff` in `graph.css` | `FAIL tokens … raw colour #ff00ff` |
| appended `function broken( {` to `graph.js` | `FAIL syntax: graph.js parses` |
| hand-edited `company-os.html` (removed the patch marker) | `FAIL build … differs from a fresh build` |
| added `.g-bad{margin-left:var(--s2)}` | `FAIL rtl … physical properties found: margin-left` |
| removed the side-panel copy from `graphShell()` | `FAIL view … missing: Nothing selected` |
| packing pass off + label reserves zeroed | `FAIL spacing … rings: department hulls overlap by 788.8x552.1px` |
| department separation disabled | `FAIL spacing … force: 41 overlapping node/label pairs (worst clearance -25.48px)` |
| `fitPad` fallback changed to 40 (token says 28) | `FAIL tokens: every CSS geometry token … --g-fit-pad=28 vs fitPad=40` |

**Not verified here (no browser or device in this environment):** rendering and contrast in both
themes, focus order, pointer gestures, screen-reader announcement order, 200% zoom and 320×568
behaviour, and the Arabic shaping of the new panel. The gate prints this list itself so the gap
cannot be mistaken for a pass.

---

## 3b. The overlap and spacing pass (this round)

Asked for: *no overlapping, space between things, nothing over anything.*

| Where it could overlap | What now prevents it |
|---|---|
| node on node | collision uses each node's **footprint** (radius + the band its label needs), not just its radius |
| label on node / node on label | same footprint rule, plus a **packing pass** (pure separation, no springs) that runs the moment the simulation settles — the visible layout is guaranteed clean, not merely likely |
| label on label | labels are shortened to the band (full text stays in the hover title and the side panel) |
| department on department | departments pull their own people together and push other departments away, by the same footprint maths plus a clear gap |
| tasks/people piling up | starting positions are spread evenly (equal arcs), not by hash chance |
| **chrome over the graph** | the legend moved into the stage's flow *below* the canvas and zoom/fit moved into the toolbar — there is no absolutely-positioned element over the graph |
| rings exploding | reporting depth is walked iteratively with a visited set and clamped, so a cycle in edited org data can no longer send a node to a distant ring (found by the new spacing check: depths of 22) |

The gate grew two checks for this: **spacing** (no node/label/hull overlap in both layouts, asserted
numerically) and **token agreement** (every CSS geometry token equals its JavaScript fallback, so the
one-definition-per-value rule cannot drift). Both were observed failing before being trusted.

## 3c. The browser pass (2026-10-03) — the NOT-CHECKED list, now checked

The three items the gate printed as *"not verified here"* were executed on a machine with a browser
(this session has network and npm; the sessions that built the prototype did not). Everything below
was **measured**, fixed where broken, and re-measured. The demo's bytes are untouched throughout;
every fix is in `graph.js`, `graph.css` or `prototype-changes.css`.

**Tooling added:** `design/prototype/probe-browser.mjs` — 7 checks in a real engine: the viewport
matrix 320×568 → 1920×1080, graph framing and clipping in both flows, page-level horizontal overflow,
the 44px touch floor under `pointer: coarse`, WCAG contrast computed from the **live** themed tokens
(24 pairs × dark/light), and focus rings on the first six tab stops. It prints its own NOT CHECKED
list, like the gate.

### Defects found and fixed

| # | Measured defect | Root cause | Fix | Evidence |
|---|---|---|---|---|
| **F1** | **20 of 22 nodes crossed the stage edge at every viewport** when there was no saved view | `fitView()` existed but was only wired to the Fit button, double-click and the F key — never to first paint, so the graph rendered at world scale | `NEEDS_FIT` (no saved view) fits on the first frame **and** again when the simulation settles; `VIEW_RESTORED` protects a restored view; `USER_ADJUSTED` stops re-fitting once the user pans/zooms; scope and layout switches re-frame | probe: 0 clipped at 6 viewports, content fills 76–87% of its constraining axis |
| **F1b** | The **rings** layout still overflowed the stage after F1 | `fitView()` framed nodes only — the department hulls and their labels were not in the fit box — and `--g-zoom-min:.45` clamped the fit before it could frame them | `fitView()` now includes `drawnHullBoxes()`; `--g-zoom-min` `.45 → .25` (CSS + JS fallback, checked in step by the gate) | probe: "department hulls stay inside the stage" passes in both layouts at 6 viewports |
| **F2** | A node was drawn **16px inside** another department's hull **label band** — the department name was painted over | hull geometry was computed in three places (render, gate, nothing in the engine), and the label band was never reserved | one definition (`boxForList`/`hullBoxes`/`drawnHullBoxes`) shared by renderer, packing and gate; `clearLabelBands()` keeps foreign nodes out of the band and runs **inside** the packing loop so separation and clearance hold together | new gate check **8b**, observed failing first (16.0px intrusion, node `x:th1` on `Go to market`) then passing (0px, 2 bands, both layouts) |
| **F3** | **24px of horizontal page overflow at 320×568** | two graph toolbars cannot share a 320px row and the skin keeps `.segmented` rigid (`flex-shrink:0`, `white-space:nowrap`) | `prototype-changes.css`: below 540px the graph toolbars wrap, their children may shrink, and the flex spacer is dropped | probe: no horizontal scrollbar at any of the 6 viewports |
| **F4** | **20 controls narrower than 44px** on a coarse pointer (20×48 nav, 34×48 search/language, 36×48 segmented, 58×30 `.btn.small`, 35px tree rows) | the skin raises `min-height` to 48px on coarse pointers but not `min-width`, and `.btn.small` keeps a fixed 30px height | change item **T1** in `prototype-changes.css` — measured offenders raised to 48px in **both** axes, `@media(pointer:coarse)` only, so desktop is untouched | probe: "all controls meet the 44px floor at 390px" |

### What the pass confirmed as already correct

- **Contrast:** 24 live token pairs across both themes meet WCAG AA (worst: `--muted` on `--bg`
  5.23:1 in dark). No token edits were needed.
- **Focus:** every one of the first six tab stops draws a visible ring (skip link → company switcher →
  nav items …).
- **Screenshots:** the 12-shot gallery is now in `design/screenshots/`. The capture script had to be
  fixed first — it guessed selectors, so five shots were skipped and two theme/language pairs were
  byte-identical because the app never actually changed state. It now drives the real controls and
  waits for the engine to settle; 12/12 captured, all variants distinct.

### Still not verified (and why)

Screen-reader announcement order (needs a real screen reader), gesture *feel* on a physical device,
`forced-colors` rendering, and long-session storage growth. All four are printed by the tools
themselves. Nothing here claims otherwise.

---

## 4. The network view (A4) — behaviour as built

- **Scopes:** Company (people + conversations) · Work (people + tasks) · Everything.
- **Layouts:** Force and Rings (ring = reporting depth: operator 0, direct reports 1, …).
- **Filters:** All · People · Tasks · Conversations · Needs attention. Filtering never re-runs the
  layout, so nothing jumps.
- **Positions:** deterministic seed from a hash of each id; then simulated until it settles;
  then saved in `localStorage['ai-company-graph-v1']` (positions, zoom/pan, mode, filter, view).
  “Reset layout” is the only thing that discards them — the Obsidian lesson from `14`.
- **Interaction:** drag a node · drag the background to pan · wheel or ± to zoom · double-click or
  **F** to fit · **R** to restart · hover highlights a neighbourhood · click selects.
- **Accessibility:** canvas is focusable with an aria-labelled description; arrows move the
  selection; Enter opens; a live region announces the selection; **List view** carries the same
  nodes, actions and states for non-visual use; shapes + labels + legend mean colour is never the
  only signal; `prefers-reduced-motion` and `forced-colors` handled; 48px targets on coarse pointers.
- **Data honesty:** model comes from the employee's actual conversation; stage/status/priority/
  budget are the demo's own fields; the run count and the reason label are derived from sample data
  and labelled as sample in the UI.
- **Performance:** paints only while settling or interacting; stops when the layout settles, when
  the tab is hidden, or when the view is left.

---

## 5. Rules compliance (the four documents)

- **Contract six laws:** no raw values (gate-enforced) · dense/compact · consistent with the demo ·
  touch expands (48px on coarse) · RTL first-class (logical properties, gate-enforced) · composed
  from the demo's own blocks (`.panel`, `.badge`, `.segmented`, `.btn`, the dialog system).
- **Four data states:** the network page honours the demo's five-state preview; loading/empty/error/
  restricted all reachable from Settings → Demo states.
- **Window system:** no new windows were hand-rolled; “+ New” uses the demo's single dialog path.
- **Wording:** no banned strings; nothing claims to be real state that is not (`Local changes only`,
  “sample” labels preserved).
- **Watching/list:** no data animation; no infinite motion; reduced-motion honoured.
- **Development requirements:** plan, map, append-only done log and supporting notes written under
  `dev-docs/`; validation command documented; checkpoint created (see `THINGS_DONE.md`).

**Documented deviations** (recorded in `_research/rules/README.md` and `SUPPORTING_NOTES.md` §1):
radius 0 instead of the contract's radius scale · 34px controls · native `<dialog>` kept (the
accessibility rules require its focus containment) · no glass/blur · semantic colour extended with
shape + label in the graph.

---

## 6. What is deliberately still open

1. Real-browser verification of the prototype (the one gap that matters most).
2. The 16 portraits re-cut at 48×48 by the designer (runtime normalisation is a stopgap).
3. i18n resource files, avatar-id migration, attachment config — product steps.
4. The enhancement layer becoming real render code in the product.
5. The build wedge decision (`IMPLEMENTATION_PLAN.md`, open decisions) before P0 starts.
