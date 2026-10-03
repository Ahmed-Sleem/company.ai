# `design/prototype/` — the app prototype (the demo + the small changes + the network view)

Open **`company-os.html`** in a browser. It is the designer's demo, unchanged in look and structure,
with the change request from `../../_research/17-demo-review.md` applied and the reserved Network
page replaced by a working company graph in the same pixel style.

Live preview: `http://<sandbox>:8080/prototype/company-os.html` (the folder is served as-is).

## Files

| File | What it is |
|---|---|
| `company-os.html` | **The prototype.** Generated — do not hand-edit (the gate checks it against a fresh build) |
| `build-prototype.py` | Regenerates it from the demo with four counted, exact-match patches (`--check`, `--out PATH`) |
| `graph.js` | Network view: model, force/rings layout, SVG render, interaction, persistence, keyboard, list mode + the enhancement layer |
| `graph.css` | Its styling — tokens only, logical properties, no data animation |
| `prototype-changes.css` | The change-request items that are pure CSS (one block per item) |
| `verify.mjs` | The gate: `node design/prototype/verify.mjs` (11 checks, no dependencies) |
| `probe-browser.mjs` | The **browser** half: `node design/prototype/probe-browser.mjs` (7 checks — viewport matrix, graph framing/clipping, page overflow, touch targets, contrast, focus). Needs `playwright` |
| `index.html` | The earlier dependency-free scaffold (kept for reference; superseded by `company-os.html`) |

## What the prototype changes (and why)

| # | Item | Status here | Where |
|---|---|---|---|
| E1 | Board keeps its **four** stages; AI facts go on the card | Done — facts added to cards, stages untouched | `graph.js` `addTaskFacts` |
| E2 | 1190–1650px band reads better with three columns | Done — content-driven columns | `prototype-changes.css` |
| E3 | Cards keep a minimum usable width | Done — `minmax()` with a floor | `prototype-changes.css` |
| E4 | Avatar pixel density normalised to one grid | Done at runtime (32-grid art mapped onto the 48-grid); the real fix is a re-cut by the designer | `graph.js` `normalizeAvatars` |
| E5 | Avatar becomes a stable id | Documented contract; the demo still stores an index | `SUPPORTING_NOTES.md` |
| E6/A1 | i18n out of the JS into resource files | Product step (single-file demo); the graph module already resolves its own strings in en/ar | — |
| E7 | `--dim` never used for meaningful text | Done inside the new UI | `prototype-changes.css` |
| E8 | Attachment limits become configuration | Documented | — |
| A2 | Model, approval, blocked-by, runs on a task | Done — real fields where they exist (model from the thread that employee works in), run count derived from the id and labelled as sample data | `graph.js` `addTaskFacts` |
| A3 | Inbox shows the reason, what changes, and bulk-low-risk approve | Done | `graph.js` `addInboxReason` |
| A4 | The network view | Done — see below | `graph.js`, `graph.css` |
| A5 | The state seam is preserved | Done — the Network page honours the demo's `default / loading / empty / error / restricted` preview | `graph.js` `graphView` |
| A6 | One global create action | Done — topbar “+ New” (task / employee / conversation) | `graph.js` `addTopbarNew` |

## The network view

- **Three scopes:** Company (people + conversations), Work (people + tasks), Everything.
- **Two layouts:** Force (free) and Rings (reporting levels). Positions are deterministic on first
  run and then persisted in `localStorage['ai-company-graph-v1']`.
- **Filters:** All · People · Tasks · Conversations · **Needs attention** (errored/paused people,
  review/backlog or critical tasks). Filtering never moves the layout.
- **Focus:** hover highlights a node's neighbourhood; click/tap selects and opens a side panel with
  real fields and a button to open the underlying profile/task/conversation.
- **Shapes carry meaning, not just colour:** people are circles with their pixel portrait and a
  status ring; tasks are squares with a stage mark (border colour *and* a mark); conversations are
  circles with a glyph. A legend names every shape.
- **Departments** appear as soft hulls with a label (Company scope).
- **Nothing overlaps.** Each node's *footprint* is its radius plus the band its label needs, and two
  nodes may never sit closer than the sum of their footprints; departments keep clear of each other
  by the same rule. A packing pass runs the moment the simulation settles, so the layout you see is
  guaranteed free of node-on-node, label-on-node and hull-on-hull collisions. Labels are shortened
  to fit their band (full text in the hover title and the side panel).
- **Nothing floats over the canvas.** The legend is a strip in the stage's flow, under the graph, and
  zoom/fit live in the toolbar row above it — there is no absolutely-positioned chrome over the
  graph at all.
- **Keyboard:** arrows move the selection, Enter opens, Esc clears, F fits, R restarts the layout,
  +/− zoom. **List view** is the accessible equivalent of the canvas (same data, same actions).
- **Motion:** the simulation settles and stops; nothing animates after that. `prefers-reduced-motion`
  and `forced-colors` are honoured.
- **Honesty:** the layout is local to the browser, labelled as such in the panel; approval/budget
  wording comes from the sample records, and derived values are labelled “sample”.

## Rebuild and verify

```bash
python3 design/prototype/build-prototype.py            # regenerate company-os.html from the demo
python3 design/prototype/build-prototype.py --check    # validate the patches without writing
node    design/prototype/verify.mjs                    # the gate (see below)
```

`verify.mjs` checks: the prototype is byte-identical to a fresh build from the demo · both scripts
parse · the layout engine converges, stays finite and is deterministic over a 77-node company ·
no raw colours or stray lengths in the new CSS · no physical `left`/`right` anywhere new · the demo's
six views, themes, RTL, dialogs and storage key are intact · the network page renders in English and
Arabic and honours all five data states · **no node, label band or department hull overlap** in either
layout · **no node drawn over a department hull label** · every CSS geometry token matches its
JavaScript fallback. Every check was observed failing for the right reason — see
`../../_research/18-changes-implemented.md` §3 and §3c.

`probe-browser.mjs` is the other half, and it needs a browser (Playwright). It measures what the gate
cannot: the viewport matrix 320×568 → 1920×1080, whether the graph is framed inside its stage in both
flows, page-level horizontal overflow, the 44px touch floor under `pointer: coarse`, WCAG contrast
computed from the **live** themed tokens (24 pairs, both themes), and that the first tab stops draw a
visible focus ring. Two of the defects fixed in §3c were found by this probe and by nothing else.

## What the browser pass changed (2026-10-03)

The gate's own NOT CHECKED list was the standing honesty gap. Running the browser pass closed it and
found four real defects, all in this folder (the demo's bytes are untouched):

| # | Defect (measured) | Fix |
|---|---|---|
| F1 | With no saved view the graph rendered at world scale and the stage clipped **20 of 22 nodes** at every tested viewport | fit once the layout settles when there is no saved view, and again on resize until the user frames it themselves; a scope or layout switch re-frames too (`NEEDS_FIT` / `USER_ADJUSTED` in `graph.js`, `fitView()` now includes the hull boxes) |
| F2 | A node was drawn **16px inside** a department hull label band (the label was painted over) | one shared box definition (`hullBoxes`/`boxForList`) + a `clearLabelBands()` keep-out inside the packing loop; gate check 8b, observed failing first |
| F3 | **24px of horizontal page overflow at 320×568** — the two graph toolbars cannot share a row and the skin keeps segmented groups rigid | `prototype-changes.css` narrow-width block: toolbars wrap, groups may shrink, the spacer is dropped below 540px |
| F4 | 20 controls were **narrower than 44px** on a coarse pointer (20×48, 34×48, 58×30 …) | change item **T1** in `prototype-changes.css`: the measured offenders are raised to the contract's 48px in both axes. Fine pointers are untouched |

## When this becomes the product

`company-os.html` is a prototype, not the application: state lives in one demo object, the graph is
plain SVG/JS, and the enhancement layer re-applies itself after each render. The product builds the
same surfaces with the real component kit (P1–P3 in `../dev-docs/IMPLEMENTATION_PLAN.md`); the
tokens, the review items and the graph behaviour are the parts that carry over.
