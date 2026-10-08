# Port audit — from the prototype to the real thing

_2026-10-08 · written for the owner after his direction: "I don't want to work on the prototype
URL, I want to move it to the real thing… a lot of things need to move to it, like the sprites…
the world viewer also needs to be complete, like dragging… do a full audit and plan."_

Everything below was verified by reading the code this turn (paths and line numbers are real).
The prototype stays **frozen as the design reference** — no new features go into it; from now on
all work lands in the real app (`apps/web` + `services/api`), and the prototype merely keeps
passing its gates so the design never drifts from what we ship.

---

## 1 · What the real app already has (do not rebuild)

Verified in `apps/web/src`:

- **The pixel design language is already here.** The tokens (`--font`, `--pixel`, 1px hairlines,
  2px pixel shadows, 3px corner notches) were taken from the demo's stylesheet
  (`styles/app.css:13-44`); the CRT scanline overlay exists (`.fx-overlay`, `app.css:556-567`,
  dimmed under `prefers-reduced-motion`); five palettes + a custom accent with contrast
  derivation (`lib/theme.ts`, `lib/accent.ts`); dark/light; Arabic with structural RTL
  (`App.tsx` sets `dir="rtl"`); the four data states + `?state=` preview; the collapsed rail and
  the screen effect, both default on, in Settings (`views/SettingsView.tsx` `SkinSetting`).
- **The sprites are already here.** The pixel portraits are generated verbatim from the
  designer's demo (`lib/avatars.data.ts`, drift-checked by `test/avatars.test.tsx`) and drawn by
  `components/Avatar.tsx`; the furniture is our own pixel paths (`world/art.tsx`,
  `world/prop-paths.ts`). "The spirits" therefore do not need importing — they need *using
  everywhere the demo used them* (see gap 3).
- **Real data screens:** Tasks with create form and stage moves (`TasksView`, 329 lines); the
  decision Inbox with idempotent approve/reject and the audit diff (`InboxView`); Settings with
  the model registry at the ledger's real prices; Team roster with budget meters; Comms as a
  thread list with the last message; World with the plan, the desk drawer, the stats strip and a
  **build mode the prototype doesn't have** (move prop/desk, 16-unit snap, undo, reset).
- **The world camera maths is already one source**: `world/camera.ts` is bundled to the
  prototype (`scripts/build-world-lib.mjs` → `world-lib.js`), so both hosts move identically.

## 2 · The gaps — what the prototype has and the real thing doesn't

### Gap 1 — the graph ("the obsidian") never entered the app
`views/NetworkView.tsx` still draws the P0 placeholder: a static tidy tree (`components/OrgTree`).
The prototype engine (`design/prototype/graph.js`, 1520 lines) has: a force layout **and** a rings
layout; three node kinds (person / task / thread) plus the operator "you"; edges for
reports (with arrows), owns and member; department hulls; filters (everything / people / tasks /
threads / needs-attention); modes (company / work / all); a side list panel; freeze / fit / reset;
the eased camera with inertial drag, anchored wheel and double-click; a per-node detail line;
pixel portraits inside person nodes (`graph.js:569-580` uses the same `AVATARS` library); and its
control state saved across visits. **None of this exists in the app.**

### Gap 2 — the world viewer is not complete
Side-by-side, `world.js` (prototype) vs `WorldView.tsx` (app):

| behaviour                    | prototype | app |
|------------------------------|:---------:|:---:|
| anchored wheel zoom, eased   | ✔ | ✔ |
| drag to pan, 1:1             | ✔ | ✔ |
| **inertial glide on release** (friction 0.92, stops < 0.05 px/frame) | ✔ | ✘ |
| **two-finger pinch zoom** about the midpoint | ✔ | ✘ |
| **double-click zoom** (1.6×, shift reverses) | ✔ | ✘ |
| **`prefers-reduced-motion`** (controls work, nothing glides) | ✔ | ✘ (eases unconditionally) |
| resize re-fit **only while "Whole plan"** is active (never stomps a zoomed view) | ✔ | ✘ (re-fits on every resize, `WorldView.tsx` ResizeObserver) |
| desk drawer, stats, rooms, ladder, keys | ✔ | ✔ |
| build mode (move/undo/reset) | ✘ | ✔ (keep — it is ahead) |

On a phone the missing pinch and glide are exactly what reads as "not complete".

### Gap 3 — shell chrome and sprites-in-context
The prototype's chrome (`company-os.html:715` topbar, `:338` search) has, and the app hasn't:
the **breadcrumb** (company / current view); the **⌘K global search** dialog (employees, tasks,
conversations, pages); the **+New** button (a task dialog reachable from anywhere — the app's
form lives only inside Tasks); the **notification bell** with an unread dot; the **owner card**
at the sidebar foot ("Vanil · Owner") with the calm note. And the sprites: the demo's team cards
carry a pixel portrait and a status word (`employee-top/-bottom`, `company-os.html:725`) while the
app's `TeamView` renders **no `Avatar` at all** — the portraits sit unused there.

### Gap 4 — conversations are only a list
`CommsView` shows title + last message. The product spec (and the MVP rules) wants the **full
thread with per-message provenance, a digest, and a "decisions only" filter**. The database is
ready for it — messages store `parts` and `authorKind` (`packages/company/src/repo.ts:427`) — but
there is no `/api/threads/:id` endpoint and no thread screen.

### Gap 5 — the real thing has no live URL he can use
Pages hosts the *demo/prototype* only; the real app needs the API, which Pages cannot run.
`render.yaml` (free tier, no card) is written and still **not applied** — that is one owner click
(connect the repo on Render). Until then "the real thing" only runs locally.

### Not gaps (checked, present)
RTL structure · themes · palettes · data states · i18n plumbing · a11y (skip link, focus title,
aria labels, the world's screen-reader summary) · the demo's pixel fonts (embedded `@font-face`,
also in the app tokens).

---

## 3 · The plan

Standing rules apply to every phase: tests written first and observed failing; en+ar strings;
RTL + both themes + the five states; the phone matrix (320→1920); `bash scripts/verify.sh`
green; push after each step. One implementation, reused: anything the prototype and the app must
share lives in `apps/web/src` and reaches the prototype through the existing esbuild bridge.

### Phase 0 — put the real app on a live URL *(owner action, parallel to everything)*
Apply `render.yaml` on Render (free). The real app then lives at a URL he can open on his phone,
and every later phase is judged **there**, not on the prototype. Pages stays as the frozen
design reference. I can't click this for him; the repo and file are ready.

### Phase 1 — complete the world viewer *(his explicit ask; my first work)*
1. A new shared `apps/web/src/world/gestures.ts`: the pointer state machine (pan, inertia, pinch,
   double-click, normalised wheel) as pure, testable code; `WorldView` adopts it.
2. `WorldView`: honour `prefers-reduced-motion` (controls work, nothing glides); re-fit on resize
   only while "Whole plan" is active.
3. Export the gestures through `world-lib.js` and rewire `world.js` onto the same controller, so
   both hosts keep identical movement (the prototype's own inertia/pinch become the shared ones).
4. Checks, observed failing first: unit (pinch midpoint maths, inertia decay, reduced-motion
   instant arrival), smoke (double-click, scripted two-pointer pinch, glide frame-count, resize
   keeps a zoomed view), design verify/probe stay green.

### Phase 2 — the graph enters the real Network screen
1. Extract the engine to TypeScript in `apps/web/src/graph/` (simulation, hulls, camera, control
   state, rendering), bridged to the prototype exactly like `world-lib` so the prototype's graph
   becomes a build of the app's code instead of a parallel 1500-line script.
2. `NetworkView` mounts it on **real API data**: agents (+ manager edges), tasks (+ owner edges),
   threads (+ member edges) and the operator node; verify `/api/threads` already returns
   `members`/`model`/`kind` for the graph, extend it if not.
3. The full control surface: modes, filters, list panel, freeze/fit/reset, node detail — with
   en+ar, RTL, states, reduced motion, and the phone matrix.
4. `OrgTree` retires (the promised P3 swap); its tests retire with it.

### Phase 3 — shell parity + sprites in context
1. Topbar: breadcrumb; bell whose unread count is the real pending-decisions count (the shell
   already fetches it — today it only badges the nav item) and jumps to Inbox; ⌘K search dialog
   over agents/tasks/threads/views with keyboard navigation; +New opening the existing
   `TaskForm` in a `Dialog` from any view.
2. Sidebar foot: owner card from `/api/session` + the calm note.
3. Team cards: pixel portrait (`Avatar`), status word, demo's `employee-top/-bottom` composition.

### Phase 4 — conversations with provenance *(the spec item)*
`GET /api/threads/:id` (messages, parts, authorKind, model) + the thread screen: full thread,
per-message provenance chips, digest block, "decisions only" filter.

### Phase 5 — remainder, in the standing order
P1.4 team management (edit/add a person — the demo's `employee-form`), P1.5 settings remainder;
the owner's sprite pack **when he names its source** (licence provenance in `THIRD_PARTY.md`
before reuse — placeholders stay until then); minimalism reductions **only after he picks** from
the audit list. Nothing is removed before that.

---

## 4 · What this plan deliberately does not do

- No new features in the prototype (frozen reference; its 15-check gate and 11-check probe keep
  running as the design's conscience).
- No revert of anything working in the app (build mode, real data, a11y — all stay).
- No legacy `.doc`-style shortcuts: the graph is extracted to typed, tested code, not pasted.
- No sprite pack, no UI reduction, no team editing before their gates (provenance, his choice,
  phase order).

## 5 · Suggested order and first move

Phase 0 is his click; I start with **Phase 1 (complete world viewer)** and then Phase 2 (graph),
because he named the world viewer first and the graph port is the bigger cut. Phases 3–4 follow.
Every phase ends green, pushed, and visible on the real URL once Phase 0 lands.
