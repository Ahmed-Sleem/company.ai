# THINGS_DONE — append-only completed-work log

> Never rewrite an entry. Append after validation. Include: date/time, phase/task, files, behaviour,
> dependencies, validation commands + results, checkpoint path, limitations.

---

## 2026-10-07 — the world becomes a tab in the prototype, and the obsidian learns to move

The owner's direction: *"this is the suitable GUI: /prototype/#team … put the world view as a tab or
option into this one instead of this corrupted one … fix the obsidian also make zoom smooth and so
on, make it refined, search online to make it gentle and elegant in moving."*

**The world is now the prototype's seventh tab** (`#world`), reachable from the sidebar and by
address, beside Network and Settings. Six rooms, sixteen desks, twenty-one props, everyone seated by
department, a desk drawer with one person's day, the four-number stats strip — in the demo's own
tokens, so it re-tints with the palette and reads in dark and light.

- **One implementation, two hosts** (the standing rule: "unified one, multiple to use them freely").
  The shared half — camera maths, the owner's plan, the furniture paths, the seating rule — was
  lifted out of React into `apps/web/src/world/{camera,plan,prop-paths,seat}.ts`, the React view now
  imports it (`WorldView.tsx` lost 49 lines and gained a re-export so its tests keep their import),
  and `scripts/build-world-lib.mjs` bundles it to `design/prototype/world-lib.js` for the plain
  script. The main gate checks the bundle is in sync, so the two cannot drift.
- **The build is patch-based, so the world tab is patches too** (`build-prototype.py` P5/P6): a
  dictionary entry, a NAV entry (appended — the shell indexes NAV[4] and NAV[5], so inserting would
  move Settings), a sidebar button, a `render()` dispatch, plus `world.css` and the two scripts.
  Every patch is exact-match and counted: a demo change fails the build instead of half-applying.

**The obsidian, refined** — researched first (d3-zoom / van Wijk's smooth zoom-and-pan, and what a
map library calls the camera API), then built:

- **One movement model.** Wheel, buttons, room jump, keyboard and fit all move a *target*; the frame
  loop eases the camera toward it, with the easing corrected for the frame that actually elapsed, so
  30 fps and 120 Hz settle in the same time. Gestures (drag, pinch) stay 1:1, and a released drag
  glides and decays instead of stopping dead.
- **The wheel is normalised across devices** (pixel/line/page deltas, trackpad pinch firmer) and
  anchored on the pointer, exactly like the app's world.
- **`prefers-reduced-motion` is honoured**: controls work, nothing glides, gestures stay 1:1.
- **The camera maths is pure and exported** on `__graph.camera`, so "the zoom is smooth" is measured
  rather than asserted: the verifier walks a flick through it (46 frames to settle, limits held,
  30 fps vs 120 Hz within 0.008 s), and the browser probe counts *moving frames* on a real wheel.
- **Three real defects, all found by measurement, not by reading:**
  1. the frame loop only rescheduled while the *layout* was moving, so a zoom stopped a third of the
     way there — six wheel events produced six frames and a halt;
  2. "Freeze layout" froze the camera with it (it pins the nodes, not the view);
  3. `clampCamera` inverted its own bounds when the plan is smaller than the viewport, pinning the
     studio to the top-left corner, and the strict pan bound fought an anchored zoom near an edge
     (the smoke's own wheel gesture slid 13.7 plan units). Both fixed in the shared camera; the pan
     bound stays tight, the zoom gets a looser one, and a small plan rests centred.
- **The fit may now go below the ladder** (`FIT_MIN_SCALE` = 0.1, hard floor; the ladder is still
  0.5 · 1 · 2 · 3): a 390px phone can only show the 1920×1200 plan at ≈0.17, so "Whole plan" had been
  showing a corner of the studio. The app had the same defect — the world probe measured 4 of 22
  rooms and desks inside the stage at 320px.

**Checks, and what caught what.** The design gate went 11 → **15** (world in both languages and all
five states; seating; the camera's easing/arrival/limits/frame-rate; the wheel's strength, delta
normalisation and anchoring) and the browser probe 7 → **11** (the world across the viewport matrix;
no sideways scroll; moving frames on a real wheel flick; reduced motion). The two new browser checks
failed honestly first — the world at 4/22 inside its stage, and 6 moving frames — and the probe's
own `settled()` helper was wrong in the same way the loop was: it watched the nodes but not the
camera, so it declared "settled" mid-glide and then measured the half-travelled view as clipping.
`scripts/build-world-lib.mjs` also gained the export check that would have caught the first real
bug of this turn (`lib.defaultPlan is not a function` — esbuild drops a missing export with a
warning nobody was reading).

**Validation:** `bash scripts/verify.sh` → **10/10 green** (90 api · 88 web · 15/15 design · 68/68
browser smoke · demo file in sync) · `node design/prototype/probe-browser.mjs` → **11/11**.

**Limitations:** a synthesised pinch is exercised, a real thumb is not; the world tab has no build
mode (the app's has); the plan at phone scale is a *map* (13% — legible as a floor, not as names).

## 2026-10-07 — the live link was serving yesterday's build

- The phone fix was committed, pushed, deployed — and the live link still measured the old layout on
  a phone (`row spread 300px`, heading `458px`, names `null`). Not the CDN: the file Pages publishes,
  `demo/company-os-demo.html`, was still the pre-fix build. Its boot stamp pointed at
  `/assets/index-DkEyv2w9.js`; the current build is `/assets/index-DB87ufb6.js`.
- **Root cause:** that file is generated from `apps/web/dist` and committed, and the Pages workflow
  copied the committed file. The gate has a step for exactly this — "8/10 the standalone demo file
  matches the built app" — and it fails loudly; it simply was not run after the CSS/aria fix, so the
  file was never regenerated. Run before the fix, it said: `demo: out of date — built from
  /assets/index-DkEyv2w9.js … but the build is /assets/index-DB87ufb6.js`.
- **Fixed twice over.** The file is regenerated (`node scripts/build-demo-html.mjs` → 592 KB, in sync),
  and the workflow now **builds it from the same commit** (`npm ci` → build the web app → freeze it
  into one file) instead of copying the repository's copy — a future "forgot to regenerate" can no
  longer reach the live link. Concurrency is now `cancel-in-progress: false`: two pushes seconds apart
  had left the *newer* run cancelled and the older content served.
- **"The obsidian" is live and correct:** `/prototype/#network` → 22 nodes, 27 edges, no console
  errors, identical to the same page served locally. The check that reported `0 nodes` was wrong, not
  the site — the graph mounts on the Network view and that check never navigated to it. Open the view,
  not just the page.
- **Validation:** `bash scripts/verify.sh` → **10/10 steps green** — 90 api tests, 86 web tests,
  11/11 design checks, 68/68 browser checks (including the five phone checks), demo in sync.

## 2026-10-07 — the phone was broken, and "the obsidian" was never in the app

The owner opened the live link on his phone and called it corrupted. It was, and this is what it was:

- **The sidebar was a 372px column of icons on a 390px screen.** The shell's small-screen rule
  (`@media (max-width: 800px)`, step 4) moved the sidebar into its own grid row and flipped its
  direction — but the icon list inside it had always been a column and stayed one, in a box that now
  spanned the full width. Seven icons stacked down the screen and pushed every page's content below
  the fold. **Proof it predates the world view:** that CSS block is byte-identical at `010d6d7`, the
  commit before the world view — `git show 010d6d7:…app.css` vs today. It was never caused by the
  world view; it was simply never opened at phone width, by anybody, until then.
- Fixed in `app.css`: under 800px the sidebar is one horizontal strip (scrollable), labels put away,
  the desktop-only rail toggle hidden, smaller page padding. Plus the world toolbar on one swipeable
  row, a four-across stats strip, and `white-space: nowrap` on its buttons.
- **Second real defect, found while fixing:** nav items had **no accessible name** when their label
  was hidden — collapsed rail and the new phone strip both. `aria-label` + `title` now carry it.
- **Checks, observed failing first** (three of five failed against the old build): the rail is one
  strip (`row spread 300px · rail 372px` → `0px · 51px`), the screen's own heading is on the first
  screenful (479px → 150px), and every icon-only nav item has a name (`["","","",…]` →
  `["Team","Tasks",…]`). Two more checks passed from the start and were **tightened** once they were
  seen passing for the wrong reason: the heading measured the top bar's `h1`, and the names fell back
  to hidden `textContent`. Smoke now **68/68**.
- **"The version that has the obsidian":** the app never had it. The force-directed, Obsidian-style
  company graph is `design/prototype/graph.js` (1312 lines + `graph.css`, guarded by the prototype's
  own 11-check gate) — the **design prototype**, not the product. The app's Network screen ships a
  plain org tree with a note that says so. The engine is adaptable as-is: `buildGraph({agents, tasks,
  threads, operator})` takes exactly what our API serves.
- The prototype is now published beside the demo file, so it can be opened from anywhere:
  `<pages>/prototype/`.

## 2026-10-07 — deployable as one service, and the two free ways to see it live

- **The product is now one service.** `services/api/src/static.ts` serves the built app from the API
  (dependency-free: SPA fallback for addresses only the app knows, `/assets/*` immutable for a year,
  `index.html` never cached, `/api/*` untouched, and a containment check so `..` cannot climb out).
  `server.ts` mounts it when `STATIC_DIR` is set, or when `apps/web/dist` exists — so the same
  command is API-only in development and the whole product when a build is present. No CORS: one
  origin.
- **Deployment wiring, in the repository:** `Dockerfile` (builds the app, runs the API, one port),
  `.dockerignore`, `render.yaml` (Render blueprint: one free web service, Frankfurt, health check on
  `/api/health`, auto-deploy from `main`), and `.github/workflows/demo-pages.yml` (publishes
  `demo/company-os-demo.html` to GitHub Pages on every push; the owner flips Pages to "GitHub
  Actions" once).
- **Tested, observed failing first:** 7 new tests in `services/api/test/static.test.ts` (root is the
  app, unknown address is the app, the API keeps its paths, cache policy, file types, traversal,
  HEAD/POST). Drills: caching `index.html` like an asset → 1 failure as designed; the naive
  `join(base, pathname)` → the traversal test fails as designed (with `normalize` alone it does NOT
  fail — that is why the code keeps both locks and says so). Browser smoke grew to **63 checks**,
  including five that open the API's own port and prove the deployed shape.
- **Verified locally in the deployed shape:** API on one port serving the app + `/api`, world map
  drawing 6 rooms / 16 desks / 21 props with the HUD reading the live API, and a task created through
  the same origin.
- **Live, and verified live:** the demo is published at <https://ahmed-sleem.github.io/company.ai/>
  (Pages enabled, workflow run `37652119168` succeeded on `ddde2b8`). Driven in a real browser from
  the public URL: 7 nav items, the world map drawing 6 rooms / 16 desks / 21 props with the HUD
  reading the frozen rows, no page errors, no requests to anywhere but Pages.
- **README** now has "Put it online (free)" — both paths click by click, what the free plan does
  (15-minute sleep, ~30–60 s wake, re-seeded database), the `docker run` one-liner, and what
  **nip.io** is and is not (DNS only; it cannot host anything; useful only for a machine with its own
  public IP).
- Searched and recorded: Render free (no card, sleeps), Northflank (always-on, card to verify),
  Railway ($1/month credit), Koyeb free tier closed to new users (Feb 2026), Fly.io free allowances
  ended Oct 2024, Hugging Face Docker Spaces now need a paid plan (Static Spaces still free).

## 2026-10-06 — the try-it path, verified on a clean clone

- **`README.md` now answers "how do I run this?"** — three ways, in order: the one-file demo
  (`demo/company-os-demo.html`, no install), the product (`git clone` → `npm install` → the API and
  the web app in two terminals), and the gate. The verified counts and the repository tree were
  stale by several phases; both are current again.
- **The clean-clone path was walked end to end, not assumed:** `git clone` → `npm install` (20 s on a
  warm cache) → API on 8787 (`{"ok":true,…,"company":"Acme Studio"}`, seeded, mock provider, no keys)
  → web on 5173 → and in a real browser: 7 nav items, the World Map with 6 rooms / 16 desks / 21 props,
  the HUD reading the API, Arabic flipping to RTL, and the two owner switches on. No page errors.
- A reminder for whoever works here next: **`node_modules/`, `.data/` and the Playwright browser cache
  are not part of the workspace snapshot.** After a restore, `npm install` and
  `npx playwright install chromium && sudo npx playwright install-deps chromium` are needed before
  anything that runs — and a *git commit* made in a previous turn may not have survived either
  (the files do, the commit does not): check `git log` before assuming work is committed.

### follow-up — the demo file, hardened for where it will actually be opened

- The demo now runs as a **classic script at the end of the body** (the bundle has no module-only
  syntax) and carries a **storage shim**, so it boots in a sandboxed frame where reading
  `localStorage` throws. `apps/web/e2e/demo.mjs` grew to **10 checks**, including creating a task and
  moving it, and a run with storage deliberately blocked.
- A new task in the demo is handed the **offers the real API would give it** — captured per stage at
  build time — so the review→done gate shows the rule's own wording, not a copy of the rule.
- Gate re-run after the change: **10/10 green**, smoke 58/58, demo 10/10. Commit `d6bcc5f`.

## 2026-10-06 — the owner's whole borrow list, and a demo you can open

- **Borrow, all of it.** The 31 pixel icons, the five palettes, the studio plan, the World Map, build
  mode, FX/CRT, the collapsed rail, forced-colors — every ranked item is now in the product. The two
  preferences the owner placed himself — **Screen effect** and **Collapsed sidebar** — live in
  Settings and both start on.
- **Everything borrowed from the owner's demo is now generated, not copied.** `scripts/gen-owner-data.mjs`
  reads their file and writes `apps/web/src/lib/icons.data.ts` (31 icons) and
  `apps/web/src/world/layout.data.ts` (6 rooms · 16 desks · 21 props · 54 sprites · their nav, on the
  record). `--check` fails on drift, the gate runs it, and a test regenerates in memory and compares —
  a lock that could not fail until the generator stopped writing when imported.
- **The demo file.** `scripts/build-demo-html.mjs` freezes the built app, its data and its API into
  `demo/company-os-demo.html` (0.58 MB, opens from `file://`, zero network requests). `apps/web/e2e/demo.mjs`
  drives it in a real browser: 7/7.
- **Four faults the browser found, all fixed, all now locked by a check.** The plan never fitted on
  first paint (the fit effect ran while the view was still a skeleton); the zoom-out button wore a
  close icon; a pointer capture on the viewport swallowed clicks on desks (the drawer never opened);
  and `selected?.id === seat.agent?.id` marked all eight empty desks as chosen (`undefined === undefined`).
- **Gate now 10 steps**: generated files (tokens + the owner's data) · lint · tests · web tests ·
  repo checks · build · **the demo file matches the build** · design gate · browser smoke. Smoke grew
  to **58 checks**.
- **Minimalism audit written, not built** — `_research/dev-docs/MINIMALISM_AUDIT.md`: A1–A4 (shell),
  B1–B5 (Tasks), C1–C5 (World), D1–D4 (Settings), E1–E2 (Inbox), F1–F2 (the bigger merges), plus what
  will not be cut. Measured first: 77 controls across the seven screens.

## 2026-10-03 16:40 — P1.1b: the board is the demo's board, and every move on it was silently failing

- **Task (user):** continue P1 (Tasks parity + honest moves) and push after the step.
- **What was built:** `apps/web/src/views/TasksView.tsx` is now the demo's Tasks screen on real
  state — the four statistics, the search/priority/owner filters, the Board|List switch, the four
  columns with their dot, count and inline empty line, the demo's list table, and the task dialog.
  The dialog's move buttons are drawn **from `offers` on the row** (the server's own answer), so the
  interface still holds no copy of the rule: a refused move renders disabled with the server's reason
  printed beside it, and the write route re-checks through `transitionTask`.
- **Vocabulary:** stages and priorities render from `STAGE_LABELS`/`PRIORITY_LABELS` in
  `@company/contracts`; the new `i18n.ts` strings are product words only, so the design words have
  one source and cannot drift into two.
- **Changed elsewhere:** `DataState` gained optional `title`/`body` (used by the no-matches state),
  `app.css` gained the board/stats/toolbar/badge/table/dialog styles plus a logical
  `.visually-hidden` (tokens and logical properties only — `raw-values` 46 files clean,
  `logical-properties` clean), `BudgetMeter` now formats through `lib/format.ts` (`money`) so money
  is formatted in exactly one place, and `TaskRow` carries `descriptionAr`.
- **Defect found by the new browser check (a real one, and a bad one):** the board rendered
  perfectly and *nothing it did could ever work*. `api.moveTask` sent
  `actor: { kind: 'member', id: 'owner' }` — an invented member id — while `TASK_TRANSITION`
  requires a uuid, so every move returned
  `422 {"error":{"code":"invalid_request","fields":["actor.id"]}}`. The board then printed that as a
  rule refusal, so a broken client looked like a working rule. Fixed at the source:
  - `GET /api/session` now publishes the acting member from the `members` table (the seeded owner),
    and `apps/web/src/lib/api.ts` fetches it once and reuses it for every write. The literal
    `'owner'` is gone, and so is the interface's habit of guessing an identity.
  - `POST /api/decisions/:id/decide` had the same lie in a different place: it fell back to
    `'mem_00000000000000000000'` with the label `'You'` — an id that cannot exist in that database
    (members are uuids). It now falls back to the company's real owner, name included.
- **Second defect found the same way:** `?state=restricted` in the address bar stuck to the app for
  the rest of the session — switching views kept the forced state, so the preview followed you
  around. `App.tsx` now re-reads the state preview on `hashchange`, which is what the demo does.
- **Tests (each observed failing first):**
  - `apps/web/test/tasks.test.tsx` (new, 8 tests): statistics from the rows, reference/owner/progress
    rendered, filters, the no-matches state, the Board↔List switch, the refused move disabled with
    the server's own reason printed, the allowed move posted **with the session's member id** and the
    board re-read afterwards, and the server's refusal shown instead of a generic failure. Mutant:
    removing `disabled={!offer.ok}` dropped exactly the one assertion (observed, then reverted).
  - `services/api/test/api.test.ts`: `/api/session` returns the seeded owner `Vanil`, an invented
    actor id is refused `422` naming `actor.id`, and the real member id moves the task. Both failed
    `404`/`422` before the route existed.
  - `apps/web/e2e/smoke.mjs`: 22 checks (was 16) — the board shows ten cards, the statistics are
    read from the rows (`open = progress + review + backlog`, `open = cards − done`), the list view
    exists, the review gate's disabled button carries the same words the server sent, and a move the
    server allows **lands in the right column**. That last check is what caught the 422.
- **Also fixed:** `Dialog` falls back to the `open` attribute where `showModal` is missing (tests),
  so the dialog content is testable without weakening the real modal in a browser.
- **Validation:** `npx tsc --noEmit` clean; `bash scripts/verify.sh` → **GREEN 9/9**, browser smoke
  **22/22**, root vitest **62**, web vitest **17** (was 9).
- **Limitations:** the board's dialog is the native `<dialog>` (a documented deviation); drag-and-drop
  between columns is not in the demo and not built — moves are the server's offers, honestly shown.

---

## 2026-10-06 02:05 — P1.2 follow-up: the dialog's geometry, and people's names in Arabic

- **Found by looking at the running form (not by a test):** the dialog was pinned to the left edge and
  overflowed the viewport. Tailwind's preflight zeroes every margin — including the `margin: auto`
  a dialog's user-agent style uses to centre itself — and the product's dialog rules had no margin of
  their own. The demo's geometry is now stated, with its values as tokens
  (`--dialog-w: 700px`, `--dialog-gap: 32px`, `--dialog-vgap: 48px`, recorded in
  `company-os-pixel.json` → `components.surfaces.dialog`): centred, `min(700px, 100% - 32px)` wide,
  at most the viewport minus 48px tall, only the body scrolling, the footer on `--side`, and at
  540px and below the inset narrows to eight pixels — all four facts are the demo's own.
- **Second find from the same look:** an Arabic screen showed people's names in English. The demo
  names a person through `name()` → `tr(agent.name)` *everywhere* — cards, dialogs, selects, the
  owners filter. `GET /api/tasks` now carries `nameAr` beside `name` on each task's owner (the roster
  route already did), and the card, the form's Owner select and the All owners filter all read it.
- **Tests:** an Arabic board shows `آريا` and no `Aria` anywhere on the page; the form's Owner select
  lists `['آريا', 'ليو']`. The first of those two was observed failing on the *filter's* `<option>`
  (the last English name left on the page) — which is exactly the kind of leak it was written for.
- **Validation:** `bash scripts/verify.sh` → **GREEN 9/9** · root vitest 70 · web vitest **37** ·
  design gate 11/11 · browser smoke 31/31 · raw-values 50 files clean.

---

## 2026-10-06 01:45 — reading the owner's second demo, and borrowing its colour palettes

- **Task (user):** *"i made gui like another demo, with soem extra features, read it, we can borrow
  things from it"* — read `acme-studio-os (1).html` and take what is worth taking.
- **What was read, and where it is written down:** the file is now kept read-only at
  `design/owner-demo/acme-studio-os.html` (byte-identical to the upload; blob
  `1a450ddc1a722e37501bbe35550fac5fb8c95646`, sha256 `4856c864…`, with `design/owner-demo/SOURCE.md`
  recording its provenance and the one unresolved question — the furniture art has no attribution).
  `_research/dev-docs/OWNER_DEMO_READING.md` is the full comparison: 376,864 → 607,024 chars, 15 new
  functions, **the six shared views byte-identical**, so P1.3/P1.4/P1.5 need no re-work and this
  file can only be *additive*; the borrow list ranked (palettes, pixel icons, the world map, build
  mode, forced-colors/CRT/collapsed rail); the three liabilities (English-only world strings, 1,179
  raw hex literals, unattributed sprite art).
- **What was built from it (first borrowing):** the **colour palette system**. Four presets on top of
  the design source's own colours — ocean, violet, amber, rose, each restating the same 13 colour
  tokens in dark and light. `design/tokens/company-os-palettes.json` is the source (values extracted
  from the owner's `PALETTES`, `custom` deliberately **not** borrowed and recorded in `notBorrowed`
  with a reason); `packages/tokens/src/generate.mjs` validates every preset (all 13 keys, both
  themes, a real chip colour) and emits `:root[data-palette=…]` + `:root[data-theme=light][data-palette=…]`
  blocks **after** the theme blocks, on purpose: equal specificity means the later one wins, and the
  light+palette selector beats both. `lib/theme.ts` gained `readPalette`/`applyPalette`, which set
  one attribute and know no colours; `Settings → Appearance` gained the owner's control, its wording
  ("Color palette", "Choose a palette. All presets work in dark and light mode.") in both languages,
  and `aria-pressed` instead of a colour-only mark. The first palette clears the attribute rather
  than pinning it, because *no attribute* is what the design source's own colours look like — that is
  the state every parity screenshot was taken in.
- **A new measure for the token source:** `--chip:15px` joined `:root` in
  `design/tokens/company-os-pixel.css` (documented beside the dialog geometry), because the raw-value
  check allows no length literal outside the token block.
- **Checks, and the two drift events they caught:**
  - `packages/tokens/test/palettes.test.ts` (12 tests) reads `PALETTES` **out of the owner's demo**
    and compares it with our copy, value by value, the way `parity.test.ts` locks the screens. Real
    drill: setting `amber.light.line` to `#123456` failed naming exactly that token; a dropped preset
    and a preset invented by the demo are both reported. It also measured that every palette clears
    **AA 4.5:1** for the two pairs the UI actually draws (accent on accent-bg, muted on bg) — lowest
    is rose/light at 4.57:1.
  - The existing "no colour that is not in the design source" check **failed on first run** with the
    palettes in — correct behaviour, and the check now names two committed sources instead of one.
  - `apps/web/test/palette.test.tsx` (9 tests): the five names in EN and AR, exactly one pressed,
    choosing really writes the attribute **and** remembers it, the first palette un-pins it, a junk
    stored value falls back to sage, private mode survives, and Appearance stays reachable in the
    error state (it sits outside `DataState` on purpose — a failed fetch must not hide it).
  - Four **browser** checks joined the smoke (31 → 39, all passing): the owner's order and wording,
    a repaint measured against sage **in the same theme** (comparing the two themes with each other
    passed even when dark was broken — a real false pass, found and fixed), survival across a reload,
    the palette answering in **both** themes, and the pressed mark moving back.
  - **Forced colours, measured rather than assumed:** with `forcedColors: active`, the swatch kept
    its colour but the chosen option lost its border colour *and* its shadow, so "chosen" stopped
    looking chosen. Fixed the way the owner's demo does (an outline in the OS's own `Highlight`), and
    the same probe now guards it: swatch `rgb(172, 202, 179)`, pressed outline `solid 2px`, and no
    outline at all when forced colours are off. This is one item off the standing NOT-CHECKED list.
- **Validation:** `bash scripts/verify.sh` → **9/9 green** — tsc clean · root vitest **82** (was 70:
  tokens 11 + palettes 12) · web vitest **46** (was 37: palette 9) · design gate 11/11 · smoke
  **39/39** · raw values 50 files clean · oxlint clean. Screenshots in `.data/shots/`:
  `palette-dark-sage.png`, `palette-dark-ocean.png`, `palette-light-amber.png`, `palette-ar-ocean.png`
  (the light and RTL passes were checked by eye, not only by assertion).
- **Limitations:** the palettes are a preference, not data — nothing is stored in the database and
  nothing syncs between machines yet. The demo's `custom` accent is not borrowed (needs a contrast
  rule and a product decision). The pixel icons, the world map and build mode are read, ranked and
  not yet built; the world map needs two answers from the owner first (see the reading document).

## 2026-10-06 01:30 — P1.2: the task form (create and edit), and three defects it surfaced

- **Task (user):** continue P1 — parity with the prototype on real state, next step the task form.
- **What now exists:** the demo's `taskForm()` as a product surface. The screen head carries the
  **New task** button the designer drew; clicking a card or a list row opens the **Task detail**
  dialog (eyebrow "Task detail", the reference and priority badge, the fields, and a footer of
  Close + the move buttons + **Edit task**); and one `TaskForm` component serves both directions —
  the same six fields, in the demo's order (`title, owner, priority, due, stage, description`), with
  the demo's own two-column `form-grid` inside a dialog and its words: New task / Add task / Save
  changes / Cancel.
- **The rule is still in one place.** A stage chosen in the form is *not* written straight to the
  row: `PATCH /api/tasks/:id` sends it through `transitionTask` — the same function the board's move
  buttons use — so the review gate holds whichever door you come in by. A test proves it: the form
  offering `done` on an unapproved task is refused with `review_gate_needs_decision` and the row
  stays in `review`.
- **The interface no longer needs to know that finishing work requires a record.** `PATCH` and the
  transition route now resolve the approved decision themselves (`approvedDecisionForTask`), so a
  person can complete an approved task without the browser carrying a decision id around.
- **A new task never invents its reference.** `POST /api/tasks` inserts and lets the database's
  sequence produce the value: the browser check created a task and saw `TSK-200`, and
  `tests` refuse a task whose owner is not part of the company (`unknown_owner`, 409).
- **Defects found while building it (each one a real one):**
  1. **`?state=` previews stuck to the app** — reported last step, fixed there.
  2. **A required empty date silently blocked the save.** The demo's date field is `required` *and*
     pre-filled; ours was required and empty, so the browser refused to submit and the button simply
     did nothing. The form now starts a new task with a date two days out (the demo's own distance
     from its today), and a browser check asserts the field arrives filled.
  3. **An Arabic screen would have written Arabic into the English column.** `createTask` was sent
     the typed title as *the* title whatever the language. Now the text goes to the language's column,
     and a new row also stores it in the required title column (the same fallback `tr()`/`localized`
     apply when reading) — while an *edit* touches only the language's column, leaving the other
     alone. Two tests pin both halves.
- **Also fixed:** `Dialog` guards `close()` the way it guards `showModal()` (the test environment has
  neither), and the board loads the roster beside the tasks because the form's Owner select needs
  real agents.
- **Files:** `apps/web/src/components/{TaskForm,Dialog}.tsx`, `views/TasksView.tsx`, `lib/{api,i18n}.ts`,
  `styles/app.css`, `test/{tasks,shell,format,avatars}.test.tsx`, `e2e/smoke.mjs`,
  `services/api/src/app.ts`, `services/api/test/api.test.ts`, `packages/company/src/repo.ts`,
  `packages/contracts/src/task.ts` (`TASK_CREATE` / `TASK_UPDATE`), `packages/company/test/{demo-fixture,parity}.test.ts`.
- **Validation:** `bash scripts/verify.sh` → **GREEN 9/9** · tsc clean · root vitest **70** (was 62) ·
  web vitest **35** (was 29) · design gate 11/11 · browser smoke **31/31** (was 24). Every new check
  observed failing first: six API tests failed `404` with the routes renamed, four web tests failed
  before the form existed, the parity field-list test failed with one field renamed, and the browser
  checks caught the missing `/api/agents` wiring in three older tests.
- **Deviations, stated:** the demo puts Stage/Owner/Due/Progress controls inside the detail dialog
  *and* in the form; the product keeps those fields in the one form (one implementation per concept),
  which is why the detail dialog is a reader with an Edit button rather than a second editor. The
  demo's Checklist and Files sections are not built yet — they belong with the worker phase (P2),
  where a task actually produces files; the schema has nowhere to put them today.
- **Not checked (standing list):** screen-reader announcement order in the new dialog, and the touch
  feel of the form on a real device.

---

## 2026-10-06 00:20 — P1.1b: the Tasks screen is the designer's screen, and one real defect fell out of it

- **Task (user):** continue P1 — parity with the prototype on real state. This step is the Tasks surface.
- **What the board now is:** the demo's own layout, on the database's own rows — the screen head
  ("Work, moving forward." / "The next step is always in view." / eyebrow "Tasks / Overview"), the four
  statistics (open tasks, in progress, in review, completed) counted from the rows rather than written
  in, the toolbar (search, priority filter, owner filter, Board|List), the four columns with their dot,
  their **vocabulary key** and their count, the inline "No tasks here" line in an empty column, the
  list table (Task/Owner/Stage/Priority/Due date/Progress), the "Nothing matches" state for a filter
  with no results, and a task dialog reached by clicking a card or a list row.
- **The move buttons are the server's answer, not the interface's opinion.** Each card's dialog renders
  exactly the transitions `GET /api/tasks` offered for that row; a refused transition is drawn
  **disabled and carries the server's own reason** ("Waiting for the approval that lets this finish."),
  and the write goes through `POST /api/tasks/:id/transition`, which re-checks the rule. The interface
  holds no copy of the transition table, which is the point: one rule, one place.
- **Vocabulary, from the design source and no other place:** stage and priority *phrases* come from
  `STAGE_LABELS` / `PRIORITY_LABELS` in `@company/contracts`; the board's column heads and the badges
  print the *vocabulary key* (`backlog`, `progress`, `review`, `done`, `medium`, `high`), because that
  is what the demo prints (`${t(s)}` with no dictionary entry falls back to the key). Both readings
  come from the demo, and they are now stated in one comment where they are used.
- **The designer's portraits are in the product.** The demo draws every person as pixel art from a
  65-portrait library; `scripts/gen-demo-avatars.mjs` extracts it verbatim into
  `apps/web/src/lib/avatars.data.ts` (generated file, never hand-edited), `components/Avatar.tsx`
  renders it exactly as the demo does — `PORTRAITS[index]`, falling back to the first portrait, hidden
  from assistive technology because the name sits beside it — and every task card shows its owner's
  face. `data-avatar` carries the index into the DOM so a check can see it.
- **Formatting is the demo's, including its two locales on purpose:** dates `en-GB`/`ar-EG` with
  `{day:'numeric', month:'short', timeZone:'UTC'}` → `5 Oct`, `٥ أكتوبر`; money and numbers `en-US`/
  `ar-EG` → `$12.50`, `1,250`. The year is not shown, and the UTC pin is what stops a 23:30 timestamp
  from reading as the next day.
- **The defect this step found — and it was a bad one:** the board looked perfect and *nothing on it
  could ever move*. `lib/api.ts` sent `actor: { kind: 'member', id: 'owner' }`; `TASK_TRANSITION` wants
  a uuid, so every transition answered `422 {"fields":["actor.id"]}` and the board showed that as if
  the *rule* had refused. Fixed at the source: `GET /api/session` publishes the acting member from the
  `members` table, the client fetches it once and reuses it for every write, and
  `POST /api/decisions/:id/decide` no longer falls back to the invented `mem_00000000000000000000`
  either. Two API tests now hold that door shut (the invented id is refused, the published one moves
  the task).
- **A second defect, found the same way:** `?state=restricted` stuck to the app after switching views.
  `App.tsx` now re-reads the state preview on `hashchange` (the demo's behaviour) and moves focus to
  the new screen's `#page-title`, which is also how the demo announces a screen change.
- **Files:** `apps/web/src/views/TasksView.tsx`, `components/{ScreenHead,Avatar,TaskCard,Dialog,DataState}.tsx`,
  `lib/{api,format,i18n,avatars.data}.ts`, `styles/app.css`, `e2e/smoke.mjs`, `services/api/src/app.ts`,
  `packages/company/src/repo.ts`, `design/tokens/company-os-pixel.{css,json}` (portrait sizes and the
  two tracking tokens the head needs), regenerated `packages/tokens/generated/*`.
- **Validation:** `bash scripts/verify.sh` → **GREEN 9/9** · tsc clean · root vitest **62** · web vitest
  **29** (was 9) · design gate 11/11 · browser smoke **24/24** · raw-values 49 files clean ·
  logical-properties clean · namespace-lock clean. Every new check was watched failing first: the move
  buttons with `disabled` removed dropped exactly its assertion; the portrait data with one byte
  removed dropped its checksum test; the portrait *and* the vocabulary selectors in the browser check
  failed against the old build before the fix landed.
- **Still open for this surface (P1.2):** the "New task" button, and the demo's task dialog as an
  *editor* (Stage select, Owner select, Due date, Progress, Checklist, Files) rather than a reader.
- **Honest limitations:** the dialog is a native `<dialog>`; the list's Owner column shows names only
  (the demo shows the portrait too, which needs the API to carry avatars on the list rows).

---

## 2026-10-03 15:20 — P1 starts: the designer's company is now the company in the database (step P1.1a)

- **Task (user):** "start first phase … make sure everything is suitable to work together and work
  with the GUI" — P1's acceptance criteria are parity with the prototype **on real state**.
- **Rule recheck before the phase (standing instruction):** both rule documents read again
  (`DEVELOPMENT_REQUIREMENTS.md` §1–§9 headings, `GENERAL_GUI_AGENT_RULES.md` §5 and §6 in full).
  The operative constraints taken into this phase: one implementation per concept and per rule;
  every action has defined idle/pending/success/empty/error states; tokens only; no second copy of
  a rule in the interface.
- **What was wrong:** the product showed a simplified company — three employees, five tasks, a
  hand-written rule for who could move where, and a display reference produced by slicing a UUID.
  The designer's demo carries eight employees, ten tasks, three decisions, two languages, a
  department, a focus line, a portrait, a risk level and a money impact.
- **Schema (migration `0001`, hand-finished):** `agents` gained `name_ar`, `role_ar`, `department`,
  `focus`, `focus_ar`, `avatar`; `tasks` gained `short_ref`, `title_ar`, `description`,
  `description_ar`; `decisions` gained `short_ref`, `title_ar`, `risk`, `cost_cents`.
  Drizzle generated plain `NOT NULL` columns, which cannot apply to a table that already has rows;
  the committed migration adds them nullable, backfills with a real value, then makes them required.
- **Display refs are database-generated values.** `TSK-142` / `DEC-31` come from a Postgres sequence
  through a column default (starting above the designer's own numbers). No code slices, decodes or
  invents an identifier — enforced by a new check, below.
- **New check — the namespace lock (`scripts/checks/namespace-lock.mjs`).** Fails the gate when
  product code decodes a prefix out of an id, builds an id from the clock/random/a counter, or
  truncates an id for display. It reported three places on its first run: two real (the task card
  sliced a UUID as a fallback ref; the same line guessed a ref) and one false positive (truncating an
  error body — the rule was narrowed, because a check that cries wolf is a check nobody reads).
  Added to the gate's step 6 and to `_observe-failure.sh` (12/12 probe behaviours correct).
- **Parity is enforced, not claimed.** `packages/company/test/parity.test.ts` reads
  `design/designer-demo/ai-company-os.html` and compares every employee (name, Arabic name, role,
  Arabic role, department, status, portrait, focus line, Arabic focus line, budget, skills, manager),
  every task (ref, both titles, owner, stage, priority, progress, due date, description) and every
  decision (ref, both titles, raiser, risk, cost, both asks) — plus the operator's name. Observed
  failing first: one seeded budget changed to 3100 gave
  *"AssertionError: Leo budget: expected 3100 to be 3000"*, then reverted green.
  The money test now takes its expected amounts from that same file instead of typed numbers.
- **Interface wins from the data:** Arabic screens show Arabic names, roles, focus lines, task
  titles, descriptions and decision asks (they showed English); the roster shows departments; the
  inbox shows the decision reference, its risk badge and its cost; one money formatter and one date
  formatter now serve the whole app (the meter had its own pair).
- **Validation:** `bash scripts/verify.sh` → **passed 9 · failed 0 · skipped 0** — 60 tests
  (was 51: +6 parity, +3 contract offers), 9 GUI tests, 6 repository checks, the production build,
  16 browser checks, the designer's 11 checks.
- **Limitation / next:** the board is still the plain four columns; the demo's stats row, filters,
  board/list switch, task dialog and the move controls are the next step (P1.1b). The offers the
  server will accept are already returned by `GET /api/tasks` and tested in contracts.

---

## 2026-10-03 14:05 — three defects found by looking at the running product (seed money, shell grid, thread order)

- **How they were found:** opening the app in a browser and reading the screen, not reviewing code.
  Each is now fixed and locked by a check that fails without the fix.
- **1 — the meters read $0.00 of $40.00.** (Already logged above; repeated here with its siblings
  because they were found the same way.) The seed wrote `spent_monthly_cents` directly instead of
  moving money through the ledger, which is what `budgetState` reads. The seed now records six runs
  through `recordRun` ($12.50 / $8.20 / $18.90) plus one failed run for Zara's error state;
  `packages/company/test/money.test.ts` (own file, own database) locks it, and the browser smoke
  test asserts the rendered meter reads `$12.50`.
- **2 — the top bar was stretched into a 540px empty band.** The shell's grid declared columns but no
  rows, so the sidebar's full height — not the top bar's content — decided the first row's height.
  Fixed with explicit rows (`auto 1fr auto`) and `grid-row: 1 / 3` on the sidebar; the mobile
  breakpoint re-places all four items. Evidence: `_research/screenshots/p0-*.png` (before/after).
- **3 — "the last message in a thread" was a coin flip.** The seeded messages shared one timestamp
  and the query had no tiebreak, so Postgres could return either as "last". The seed gives the two
  messages distinct times, and both `listThreads` queries order by `id` as the tiebreaker.
- **Also:** `scripts/verify.sh` now refuses to start while an API holds port 8787, with the reason
  printed in plain words — two PostgreSQL instances exhaust this machine's memory and the failure it
  causes looks like an unrelated test crash. The e2e already runs on its own ports (8790/4174).
- **Validation:** `bash scripts/verify.sh` → **passed 9 · failed 0 · skipped 0** (51 tests, 9 GUI
  tests, 16 browser checks, the designer's 11). Live app: six views, meters $12.50/$8.20/$18.90,
  no console errors, top bar 66px — the token `--control + --s8`.
- **Note on the machine:** the development API must be stopped while the gate runs. The guard makes
  this explicit instead of leaving a mysterious worker crash.
- **Commit:** `4bb8a8c` (local; no push — the session has no repository credentials).

---

## 2026-10-03 13:35 — P0 built end to end: the workspace runs as one product, the GUI is real, and the gate is green

- **Task (user):** "start first phase … make sure everything is suitable to work together and work
  with the GUI, always test check manually and create tests for each thing, note unified one,
  multiple to use them freely, recheck the rules before each phase."
- **Delivered (all local, one commit):**
  - `packages/tokens` — the design tokens as a package (generator, generated CSS/TS, and
    `@company/tokens/tokens.css` for the app to import).
  - `packages/contracts` — the shared shapes and vocabularies (views, stages, transitions,
    decision precedence, model pricing/cost), ids as **UUIDs branded per type**.
  - `packages/company` — schema (13 tables), the Postgres/PGlite client, the repository of rules
    (review gate, budget from the **ledger**, decisions, threads), and the demo seed.
  - `packages/gateway` — the premade-gateway client (LiteLLM/Ollama/vLLM compatible) with a mock
    adapter, model registry, fallback chain, and the block-and-raise-a-decision path.
  - `services/api` — the HTTP surface (company, agents, calls, tasks, decisions, models, views,
    threads), error vocabulary (`409` rule violations, `422` invalid input, `500` generic).
  - `apps/web` — the GUI: the shell (sidebar/topbar/statusbar), six views, the four data states as
    one component, budget meters bound to the ledger, the decision inbox with rule + change + audit,
    the decision controls, RTL/Arabic, theme cycling — tokens only, logical properties only.
- **Two real defects were found by using it, not by reading it:**
  1. the Team meters read **$0.00 of $40.00** — the seed had written the cached
     `spent_monthly_cents` counter and never moved money through the ledger, which is what the
     budget check reads. Fix: the seed now records spend through the product's own `recordRun`
     path (six runs: $12.50 / $8.20 / $18.90) plus the one failed run that explains Zara's error
     state. New `packages/company/test/money.test.ts` (3 tests, own database) locks it; observed
     failing first (mutated seed → "expected 750 to be 1250").
  2. the dev server was **broken**: `@company/*` packages had no `exports`, so Vite could not
     resolve them (the failure was real, not a warning). Fix: every package now declares
     `exports` (source-shipping monorepo, no build step) and `tsconfig.json`'s `paths` map was
     removed — **one** resolution mechanism for types and runtime.
- **Gate (`scripts/verify.sh`, 9 steps, green):** type-check · tokens in sync · oxlint (0 errors) ·
  **51** database/API/gateway/contract/token tests · **9** web tests (jsdom) · 5 repository checks ·
  production build · **16** browser checks against the real API · the designer's **11** checks.
  Every new check was observed failing first (`scripts/checks/_observe-failure.sh`: 10/10
  behaviours correct).
- **The five repository checks (each fails on a planted violation):** no raw colours/lengths
  (same stripping rules as the design gate: token block, comments and `@media` conditions),
  logical properties only in CSS, no import escapes an app directory, the licence gate
  (158 dependency licences; AGPL/GPL/LGPL/SSPL/BUSL/Elastic/fair-code/unlicensed fail; MPL/EPL must
  be named in `THIRD_PARTY.md` — `lightningcss` recorded), and the docs check (required documents
  present, done-log still append-only).
- **Design fidelity:** the shell reuses the demo's own vocabulary and measures (`--nav`, `--control`,
  `--touch`, `--s1…--s10`, `--radius`, the pixel chrome as named tokens `--app-hair/-stroke/-notch`),
  the pixel skin is asserted in a browser (radius 0), and Arabic switches the document to RTL and
  drops the pixel face — all checked in `apps/web/e2e/smoke.mjs`, not asserted by eye.
- **Validation commands:** `bash scripts/verify.sh` → **passed 9 · failed 0 · skipped 0**;
  live browser probe of the running app: six views, no console errors, meters reading $12.50/$8.20/$18.90.
- **Limitations / honest gaps:** only one API can run on this machine at a time (each one loads
  PostgreSQL, ~400 MB) — the e2e therefore uses its own ports (8790/4174) and clears its database
  first; the org tree's SVG geometry is still plain numbers until the P3 layout engine replaces the
  layout function; the 21 remaining lint *warnings* are style suggestions, listed but not fatal.

---

## 2026-10-03 13:05 — the deep mix-and-match sweep: 177 repositories licence-verified, donor files read, four plans corrected

- **Task (user answer, 2026-10-03):** before P0 — *"search deeply and extensively… a lot of GitHub repos have ready-made code; instead of creating this project from scratch we can collect, mix and match, adapt, edit and merge code all over, to be faster and more accurate"*. Also answered C3 (OpenAI + Anthropic + one cheap open lane *and* "there are pre-made gateways we can use directly") and C5 (hard caps), D1 (full thread + digest + decisions-only filter).
- **Deliverable:** `_research/24-mix-and-match-inventory.md` — the file-level plan: **which file from which repo**, per screen (Team, Tasks, Inbox, Conversations, Network, Settings) and per layer (gateway, orchestration, memory, sandbox, durability, i18n, testing), with mode (depend / vendor / port / reference) and what must change before it is ours.
- **Tooling (new, reproducible):** `_research/tools/harvest-scan.py` (stages `meta` / `trees` / `fetch` / `report`) + `_research/tools/harvest-files.json` (19 repos, 38 donor files). Raw evidence committed at `_research/data/harvest-scan-2026-10-03.json|md` and `…-licence-anomalies…md`; the per-repo file trees stay outside the repo in `~/harvest/scan/`.
- **Scan result:** **177 repositories** checked; **152** are both planned for use and permissively licensed; **23** licence anomalies found and re-classified. Fixed two real bugs in the checker while doing it (MPL-2.0 text was misread as GPL because MPL cites the GPL; five guessed owner names resolved via the API instead of trusting the notes).
- **Four "obvious picks" turned out to be forbidden — discovered mechanically:** `origin-space/originui`, `permify/permify`, `zitadel/zitadel`, `RedPlanetHQ/tegon` are **AGPL**, and `rakshit087/obsidian-graph-react` has **no licence file**. All re-classified to `blocked`. Consequence: the Network view stays exactly as doc `22` planned (xyflow + d3-force + dagre + jsoncanvas + our own spacing system) — the deliberate lockdown held under pressure, which is the best possible result of a scan.
- **New, permissive donors found and read (files fetched, not just linked):**
  - `sekera-radim/impri` (MIT) `server/src/interactive-decision.ts` — idempotent decision commit returning `ok` / `already_decided` / `concurrent`, plus the `decided_by` (machine id) vs `audit_log.actor` (human label) split → our Inbox audit discipline.
  - `agentkitai/agentgate` (MIT) `lib/request-decision.ts` — pure, unit-testable decision precedence (budget → eval → override → policy → pending) → our Review-Gate rules. Its `agent-budget.ts` documents that its guard is **soft and fails open because it is not in the completion path** — ours is, so the owner's hard caps are genuinely enforceable.
  - `paperclipai/paperclip` (MIT) `packages/db/src/schema/agents.ts` — the verified column shape for the agent/employee table (self-referencing `reportsTo`, monthly budget/spend in cents, status, capabilities, permissions, heartbeat, indexes) → our P0 schema.
  - `janhesters/shadcn-kanban-board` (MIT) `registry/new-york/ui/kanban.tsx` — the screen-reader announcement layer (aria-live region, per-event announcements) our board must carry.
  - `danny-avila/LibreChat` (MIT) `packages/data-schemas/src/methods/spendTokens.ts` — ledger fields (`tokenType` prompt/completion, model, per-model price map).
  - `markfulton/ai-employees` (MIT) — eight employee definitions as plain text, incl. the discipline: `SCHEDULE.md` is the single home for every clock time and budget, and *"it never invents a number; every figure carries the file or screen it was read from and the date"*.
  - `langchain-ai/langgraphjs` (MIT) `interrupt.ts` — verified HITL semantics (`interrupt(value, {responseSchema})` + `Command({resume})`, Zod-validated resume) — our Review Gate.
  - `shadcnblocks/kibo` (MIT) — the four data states ship as tiny pattern files (empty/error/skeleton).
  - `d3/d3-force`, `xyflow`, `better-auth` (org statements verified), `graphiti`, `E2B`, `dagre`, `kaneo`, `ag-ui` — files fetched and read.
- **Gateway answer (C3's second half):** LiteLLM (MIT) stays primary — its `budget_throttle.py` shows over-budget keys are **hard-blocked by default** (throttling is opt-in), matching the owner's C5 choice. Bifrost (Apache-2.0, Go) recorded as the latency swap; Helicone (Apache-2.0) and Portkey (MIT core) as references; OpenRouter as a hosted fallback.
- **New root file:** `THIRD_PARTY.md` — the licence ledger (policy table + planned dependencies per phase + ported-code provenance + the forbidden list). The P0 CI licence gate will enforce it. Also added `__pycache__/` + `*.pyc` to `.gitignore` for the new Python tooling, and restored `design/designer-demo/install.sh`'s executable bit (a stray mode change from an earlier copy, not a content change).
- **Plan delta (no stack change):** P0 schema follows the verified paperclip shape; P1 board takes kibo primitives + the a11y announcement layer; P1 inbox takes the two approval donors' semantics; P2 message parts follow assistant-ui's approval model and ledger rows follow LibreChat's fields; P1 agent roles seeded from the ai-employees discipline. Phases, design and stack unchanged.
- **Validation:** `node design/prototype/verify.mjs` → **11/11** (unchanged, run after the edits); the scan itself is reproducible with the four commands in §24.9 of the document; the committed evidence JSON carries the scan timestamp and all 177 verdicts.
- **Still unscanned (named in §24.11):** file-level pass on ~25 further repos (xyflow examples, tremor panels, kaneo server routes, vibe-kanban run UI, graphology metrics, style-dictionary transforms, ag-ui events), the MCP connector set (P5), and a dedicated Arabic-first UI scan.

---

## 2026-10-03 05:30 — PUBLISHED: the browser-verified prototype and the 12-shot gallery are on `main` (PR #3 merged) + the study report is written

- **Task (user):** continue the same instruction — the browser pass and the gallery must end up in `main`, latest version, and the study/comprehension report is owed to the owner.
- **Route:** branch `publish/browser-verified-prototype` → commit `8046123` → **PR #3** → merge commit **`fe2bfaab`** on `main` (route 23.2 style; the temp token was used for this session's git/API only — not in any file — and the local clone's remote was reset to the plain URL afterwards). Remote branch deleted after merge; local `main` fast-forwarded and clean.
- **Verified on the remote itself:** `main` tip `fe2bfaab`, **73 files**, **12/12 screenshots present**, `design/prototype/probe-browser.mjs` present.
- **Snapshot zip rebuilt for this milestone:** `_research/snapshots/company_ai_FULL_2026-10-03.zip` — **71 files, 2,873,322 bytes, sha256 `c0d5f31b4fe2569041e97e4ea458811d8aa11d7d44611cae5539b1d2c9dda13c`** (grown from 58 files because the 12 screenshots and the browser probe are now included; `.git` and `node_modules` excluded). Verified by extracting to a clean folder: 71 files, 12 screenshots, `node design/prototype/verify.mjs` → **11/11**.
- **Study / handover report — `_research/dev-docs/HANDOFF-ACK.md`** (a copy is handed to the owner as the session deliverable): what was read (all four rule documents, the design tree, `_research/` 00–23, the code), the vision in my words, the twelve-point working contract I will hold to (tokens only, untouchable demo, structural RTL, four data states, green gate before every push, observe each new check failing first, one definition per value, nothing overlaps, `_research/` deletable, no secrets, rules change only with explicit approval, append-only logging), the inherited deviations, today's four defects with their evidence and the honest NOT-CHECKED list, the locked stack and phase order, and the recommendations on the open questions C3–F6 — plus the exact P0 sequence I will start on.
- **Still owed to the owner (needs their input):** answers to C3–C5, D1–D5, E1–E3, F1–F6 (recommendations are in the report; none of it blocks P0).
- **Validation after the merge:** `node design/prototype/verify.mjs` → 11/11 · `python3 design/prototype/build-prototype.py --check` → all ok · designer demo blob `7dd2e203…` unchanged.

---

## 2026-10-03 04:40 — the browser pass is done: 4 defects found and fixed, the 12 gallery shots are in the repo, gate 11/11 + probe 7/7

- **Task (user):** *"apply this patch, merge all to main … now download the full updated repo, read it, read the rules (they are mandatory), study what we are doing, because you will work on it"* — the handoff's first-week list, items 2 and 3.
- **Environment note (matters):** this session **has network and npm**, unlike the sessions that produced the prototype. That is why the three items the handoff listed as *owed* (screenshots, browser verification, and their evidence) could finally be executed here.
- **Read (all of it):** the four mandatory rule documents in `_research/rules/`, `design/README.md`, `design/prototype/*`, the tokens, and `_research/` 00–23 including the dev-docs set. The study notes are in `HANDOFF-ACK.md` beside this repository.
- **1. Screenshots (handoff item 2) — DONE.** `design/screenshots/` now holds all **12** PNGs, captured by `shots.mjs` from the live prototype (dark + light, EN + AR, desktop + mobile). The script was **fixed first**: it previously guessed selectors (`getByRole('button', {name:'Team'})`, `[data-layout=…]`), so 5 shots were skipped and two pairs came out byte-identical because theme/language never actually changed. It now drives the app's real controls (`[data-nav=]`, `[data-action=theme]`, `[data-action=language]`, `[data-g=layout]`), asserts the app really changed state, and **waits for the layout engine to stop moving** before capturing. Evidence: 12/12 saved, every theme/language pair now differs.
- **2. Browser verification (handoff item 3) — DONE.** New `design/prototype/probe-browser.mjs` (Playwright): viewport matrix 320×568 → 1920×1080, graph framing/clipping in both layouts, page overflow, the 44px touch floor under `pointer: coarse`, WCAG contrast computed from the **live** tokens (24 pairs × 2 themes), and focus rings. **7/7** after the fixes below.
- **3. Four defects found — all fixed** (details and the shared definitions in `18-changes-implemented.md` §3c):
  - **F1** with no saved view the graph rendered at world scale: **20 of 22 nodes clipped at every viewport**. Fixed with fit-on-first-paint + re-frame on scope/layout switch and resize (`NEEDS_FIT` / `VIEW_RESTORED` / `USER_ADJUSTED`), and `fitView()` now frames the hull boxes as well as the nodes (the rings layout had been overflowing the stage at every size).
  - **F2** a node sat **16px inside** a department hull label band. Fixed with one shared box definition (`hullBoxes`/`boxForList`) plus `clearLabelBands()` **inside** the packing loop; new gate check 8b, **observed failing first** (16.0px intrusion) and passing after.
  - **F3** **24px of horizontal overflow at 320×568** from the two graph toolbars. Fixed in `prototype-changes.css` (wrap + allow the rigid segmented groups to shrink below 540px).
  - **F4** **20 controls narrower than 44px** on a coarse pointer (20×48, 34×48, 58×30 …). Fixed as change item **T1** in `prototype-changes.css`, coarse pointers only — desktop rendering is untouched.
- **4. The zoom floor moved** with the framing fix: `--g-zoom-min` `.45 → .25` (CSS token + JS fallback, still checked in step by the gate). At `.45` the rings layout could not be framed at all at 1440×900 — the clamp was the thing clipping it.
- **Validation:** `node design/prototype/verify.mjs` → **11/11** (was 10; the new check is 8b). `node design/prototype/probe-browser.mjs` → **7/7**. `python3 design/prototype/build-prototype.py --check` → all 8 build checks ok. Designer demo still byte-identical (blob `7dd2e203…`, md5 `ff4a9063…`). F1/F2/F3/F4 were each reproduced before the fix and re-measured after.
- **Docs updated in the same change:** `design/prototype/README.md` (new "what the browser pass changed" table, 11 checks, the probe), `design/README.md`, `design/screenshots/README.md` (status: taken, and the honest note about the selector bug), `design/prototype/verify.mjs` header, root `README.md` (gallery), `18-changes-implemented.md`, `SUPPORTING_NOTES.md`, `_research/snapshots/`.
- **Still not verified (unchanged):** screen-reader announcement order (needs a real screen reader), gesture *feel* on a device, `forced-colors` rendering, and long-session storage behaviour. Listed by both tools so they cannot be mistaken for passes.
- **Limitation:** `probe-browser.mjs` requires Playwright, so it is not part of the dependency-free gate; CI runs `verify.mjs` always and the probe when a browser is available (`scripts/verify.sh` will wrap both in P0).

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

## 2026-10-08 — world tab + obsidian motion shipped; port audit written

- Prototype gained the World tab (`#world`) and the gentle camera (commits `6d4ea66`, `d538b92`,
  pushed; Pages verified live: world 6 rooms/21 props/16 desks/8 seated at 49 % desktop and
  22/22 inside the frame at phone size; graph wheel flick 46 moving frames).
- Owner direction received: stop working on the prototype URL; move everything into the real app.
- Full audit + phased plan written: `_research/dev-docs/PORT_AUDIT.md`. Gaps: graph not in the app
  (Network is still the OrgTree placeholder), world viewer missing inertia/pinch/double-click/
  reduced-motion/resize-guard, shell chrome (breadcrumb, ⌘K search, +New, bell, owner card), team
  cards without portraits, comms without the full-thread/provenance screen, no live URL for the
  real app (render.yaml still not applied by the owner).

## 2026-10-08 — requirements v2 + rules re-read + big plan; Phase A cleanup executed

- Owner answered Q1–Q5: budget and caps removed entirely; the browser is the engine (server, DB,
  Docker, render.yaml retire; Pages hosts the real app); schedule = daily hours + manual override;
  first run = pixel landing page with screenshots then the intro wizard; cleanup = execute-and-report.
- `PRODUCT_REQUIREMENTS.md` refined to v2 (REQ-1…REQ-38, all opens resolved).
- Rules re-read (all four): logged in `SUPPORTING_NOTES.md` with three documented deviations
  (rolling checkpoint zip + git tag instead of an archive pile; the user's own keys on the user's
  own machine; native dialog stands). The "hard caps" rule is retired by owner decision.
- `IMPLEMENTATION_PLAN.md` rewritten: assessment table, target architecture, reuse ledger with
  licence-verified sources (openai Apache-2.0, @google/genai Apache-2.0, jsonrepair ISC,
  zustand MIT, Anthropic browser-fetch pattern), phases A–J, gates, risks.
- Phase A executed (execute-and-report mandate): deleted `.data/` (scratch, untracked); merged
  `_research/screenshots/` (6 p0-*.png) into `design/screenshots/` — one screenshots home (20
  files); nothing else removed yet (server artefacts retire with Phase C, demo pipeline with
  Phase J, both reported again then).

## 2026-10-08 — plan audit + Phase B: budget dies

- Plan audit (§7 of IMPLEMENTATION_PLAN.md): zustand persist versioning confirmed; engine corrected
  to timestamp ticks + fetch-driven loops (background-tab throttling); quota strategy confirmed;
  icon set corrected to SVG + dependency-free PNG generation; openai-SDK fallback noted; licence
  gate confirmed enforcing the reuse ledger.
- Phase B executed, tests-first: `scripts/checks/no-budget.mjs` (16 hits at first) and the REQ-32
  roster test both observed failing, then: BudgetMeter component deleted; TeamView, WorldView
  (drawer line + monthly-spend stat), i18n (en+ar) and the prototype world tab cleaned; verify.mjs
  and smoke.mjs expectations updated to the three-stat HUD.
- Gate after: 10/10 green — 90 api · 87 web · 15/15 design · 68/68 smoke.

## 2026-10-08 — re-audit (b): corrections, code-source map, builder phase planned; URLs answered

- Re-audit corrections: demos are archived, never deleted (archive/ lands in J with full reference
  updates; designer-demo stays as the active parity source); verify.sh numbering fixed in C;
  landing screenshots from a fixture-loaded static build; neither demo has a drag editor — the
  borrow is the generated plan/sprite catalogue plus our build mode.
- Code-source & adaptation map written for phases C–K (exact source path → target → method).
- Phase K planned only (owner: do not start): catalogue-driven furniture adding, drag & drop incl.
  touch, portrait picker, plan persisted in the save; tests named before building.
- Live URLs answered: root Pages = frozen app today, real product after J; /prototype = reference.

## 2026-10-09 — Phase C: the app goes client-only; the root URL becomes the real product

- Owner direction: he watches only `https://ahmed-sleem.github.io/company.ai/` — the root must be
  the real app from now on, organised like the prototype; the demo is left as it is (it moves to
  `/demo/`, archived not deleted); the product is **company.ai**, not company.os.
- The engine moved into the browser (REQ-13): `apps/web/src/data/store.ts` (zustand persist,
  save key `company.ai.save.v1`, version 1) holds the whole product state, seeded on first run
  from `apps/web/src/data/demo.json` (the labelled demo company, no budget anywhere).
- `apps/web/src/lib/api.ts` is now a façade over that store — same method names, same row shapes,
  same error shape — so no view changed shape. Movement rules are the *shared* ones: the façade
  delegates to `offeredTransitions()`/`TRANSITION_REASONS` in `@company/contracts`, the same
  table the retired server used; the form's stage edit goes through the same gate as the buttons.
- New shell chrome (the prototype's organisation): workspace menu with export save / import save /
  start over; ⌘K search dialog over views, people, tasks and threads; bell with pending-decision
  count; breadcrumb; owner card without the calm note; `company.ai 0.2.0` status bar; pixel
  favicon (`apps/web/public/icon.svg`); scrollbars hidden but scrollable (REQ-4); every screen
  scrolls inside `.pagebody` under a fixed chrome (REQ-18/19).
- zustand added (MIT) — licence gate ran before install; THIRD_PARTY.md lists it as a shipped
  runtime dependency.
- Tests converted, not deleted: shell/tasks tests now seed the save instead of stubbing `fetch`
  (web suite 87/87); the smoke test drives the static build with no server at all and reads the
  save out of localStorage (66/66; the two former one-port API checks are replaced by three
  static-hosting checks).
- `vite.config.ts`: `base: './'` (the same dist works at the Pages root, a subfolder, or a disk);
  dev/preview proxies retired with the API.
- `build-demo-html.mjs` simplified to a pure freezer: no API capture, no fetch stub — the bundle
  carries its own data now; storage shim kept for sandboxed frames.
- Pages workflow rewritten: root = the built app; `/demo/` = the frozen demo; `/prototype/`
  unchanged (designer's prototype + graph + world, read-only, guarded).
- Prototype patched through `build-prototype.py` only (never by hand): P7 renames the brand
  company.os → company.ai (sidebar, settings eyebrow, title, description); P8 removes the
  sidebar's calm-place note. Regenerated; design gate 15/15.
- Gate: 10/10 green — 90 api (still in the repo until Phase C's server retirement lands) ·
  87 web · 15/15 design · 66/66 smoke.

## 2026-10-09 — shell rebuilt on the prototype's exact structure (owner: "re-read the prototype")

- Owner verdict on the first Phase C publish: the world view is better, but the page structure
  was not the demo's — "use the demo as base and do the improvements over it".
- Re-read `design/prototype/company-os.html` line by line (shell(), topbar, navButton, the demo
  stylesheet, the pixel skin, the collapsed-rail and phone media blocks) and rebuilt the real
  app's shell to the prototype's DOM and measures:
  · sidebar = brand row ([a] + company.ai + HUMAN × ARTIFICIAL, phone close button) → the
    workspace button (company initial box + name + chevron; it now also carries the one-file
    save menu: export / import / start over) → WORKSPACE navlabel + nav items with counts →
    sidebar-bottom with Settings, World Map and the owner account row;
  · topbar = rail toggle + hamburger (phone) + breadcrumb left; the 218px "Search anything… ⌘K"
    trigger, theme icon, language and the bell in `.top-actions` right;
  · `.app` column with padded centred `.main` and the three-span statusbar
    (company · Live / all-data-in-this-browser / company.ai 0.2.0);
  · phone = the prototype's drawer (off-screen sidebar + scrim), not the old strip.
- Every raw measure the prototype uses is declared once as an `--sh-*` token (the raw-value law
  still applies to the real app), pixel skin and collapsed-rail blocks ported, desktop-only.
- Three of my own leftovers caused visible corruption and were root-caused and deleted: the old
  `.shell` grid phone media block, the un-gated collapsed-rail rules (leaked into the phone
  drawer), and the missing global `.icon` size (the search magnifier drew ~150px).
- Screenshots: design/screenshots/shell-{desktop,expanded,phone}-2026-10-09.png now match the
  prototype's rail, drawer and topbar. Gate 10/10 green (87 web · 68/68 smoke with the drawer
  tests).

## 2026-10-09 — Owner comments C1–C8: fixed chrome, live footer, one motion system, living roster

- **C1/C2** — the app column owns the viewport (`.app` = `block-size:100dvh; overflow:hidden`);
  only `.main` scrolls, so the topbar and statusbar cannot move. Verified in Chromium: topbar
  top 0px and statusbar top 760px before and after scrolling the content.
- **C3** — the statusbar's middle span is counted live from the save: people · open tasks ·
  decisions waiting your call, plus the last-saved time once a save exists.
- **C4** — the "V" owner row is gone from the sidebar JSX and its CSS (`.account/.initial/
  .ownerrole`) with it; Settings and World Map stay in `.sidebar-bottom`.
- **C5/C6** — motion lives in one section of app.css: `--anim-fast/--anim-med/--anim-ease`,
  `rise-in` and `pop-in`, reused by `.view-anim` (keyed on the view), `dialog[open]`,
  `.workspace-menu` and the nav/button transitions; `prefers-reduced-motion` turns it all off.
  The search opens through that same `dialog[open]` rule.
- **C7** — `input/textarea/select:focus-visible` drops the outline and answers with an `--accent`
  border on `--accent-bg`; icon buttons keep their ring for keyboard users.
- **C8** — #team is a living roster read from the save: portrait, role/department, status badge,
  who they report to, the open tasks they carry with stages, capabilities, four counted
  statistics on top, and a profile window per person.
- Validation: `bash scripts/verify.sh` → 10/10 green; web tests 87/87; smoke 68/68;
  screenshots design/screenshots/team-2026-10-09.png and team-profile-2026-10-09.png.

## 2026-10-09 — Owner comments C9–C16: slide inbox, messenger, force graph, settings, world fit

- **C9** — #inbox is a deck of slides: one pending decision at a time (ask, rule, change,
  raised-by, risk), approve/reject slides it out and the next slides in, counter + arrows,
  queue summary on top, the prototype's decision-history table below.
- **C10** — #comms is a messenger: the whole team as contacts in the side rail, one-to-one
  chats created on first use, bubbles + AI badge + composer per the prototype; threads gained
  `messages` in the save and `startThread/addMessage` in the store; a sent message survives
  a reload.
- **C11** — #network is the Obsidian-style graph, ported from the prototype's graph.js into
  `apps/web/src/lib/graph.ts` (same build, force maths and constants): settles, pointer-anchored
  wheel zoom, drag to pan/move nodes, hover isolates a node's neighbourhood, Fit, list mode as
  the accessible equivalent.
- **C12** — #settings rebuilt on the prototype's layout: theme samples, palette grid + custom
  accent, language select (flips the whole app), company profile form → save, session
  export/import/reset (logic extracted to `lib/savefile.ts`, shared with the workspace menu),
  shortcuts aside; the palette stays reachable behind data states.
- **C13/C14** — #world fits the viewport exactly (flex stage; desktop 694=694, phone 748=748,
  body overflow 0) and the useless hint line is gone (JSX + CSS + i18n key).
- **C15** — build/place improved after re-reading the prototype: furniture palette from the
  owner's sprite sheet, click-to-place snapped to the 16-unit grid with the grid shown while
  building, Escape cancels; the floor plan now persists in the save (`store.worldPlan`); the
  camera re-fits when the build bar resizes the stage.
- **C16** — the world's smooth camera untouched; smoke: wheel 43% → 63%, pointer point held.
- Smoke's `settled()` now waits on the canvas's `data-moving` instead of assuming a gesture
  always moves the camera (a Fit on a fitted plan can never "move"); the old assumption hung.
- Validation: `bash scripts/verify.sh` → 10/10 green; web 87/87; smoke 68/68; namespace lock
  clean (ids numbered from the data, never clock/random). Screenshots:
  design/screenshots/{inbox-slide,comms-messenger,network-graph,settings,world-fit,team}-2026-10-09.png.

## 2026-10-09 — C21/C22/C23 (second-round comments)

- C21 #network (`16e4d6c`): graph chooser window (everything/people/tasks/conversations);
  node windows with real controls — legal task-stage transitions, priority, person status,
  jump to the conversation; the layout keeps an alpha floor so it always gently drifts,
  pauses under the cursor, and honours reduced-motion.
- C22 #comms (`de1147c`): rail and log own their scroll; messages from the same sender group;
  pixel name + status dot in the head; raised composer with a two-row box and send hint.
- C23 #team (`346c7cf`, fix `a9fb00e`): teammates are typed in and edited — name, role,
  details, pixel portrait from the sprite set, reports-to placement; store gained `addAgent`
  (`p-new-N` ids); validation errors are user-facing; smoke 74/74, gate 10/10.

## 2026-10-09 — C25-C28 + C24 (third-round comments)

- C25 (`806af71`): world controls redesigned on the left side, headed blocks, close button,
  zoom row with live scale; no longer overlaps the person drawer.
- C26 (`806af71`): icon audit — the stage's full-size svg rule was stretching the windows'
  icons; now 18px everywhere. One shared `AgentInspector` for the world drawer and network.
- C27/C28 (`806af71`): air under Add-a-teammate; page heads compacted to a 59px band.
- C24 (`34395b3`): Phase D — landing page (pixel style, real screenshots, one start button,
  demo door) + intro wizard (company, employees, options), resumable through the save,
  finishes into a from-scratch company; store save schema v2 with migration; Settings edits
  the full company profile. REQ-16 prompt compilation rides with the Phase F engine.

## 2026-10-10 — C29-C33 + Phase E (fourth round)

- C29 (`d5fef70`): world drawer moved out of the pan surface; its close button works.
- C30 (`d5fef70`): world menu paged (View/Build tabs + constant camera strip), bounded height.
- C31 (`d5fef70`): rooms selectable + resizable in every mode; new rooms verified growing.
- C32 (`28b5085`): probe-verified — one save, every view a viewer of it.
- C33 (`28b5085`): Settings door back to the landing; wizard edit mode preserves all work.
- Phase E: per-employee model connection (provider/model/key/custom base URL) + real
  test-connection button reporting the provider's own error; save schema v3.
- 10 October 2026 — owner round five (C34–C41) + engine phase F: infinite studio grid, live seats
  (status bubbles, studio clock, delivery walker), network never freezes (pin-on-hover, always
  drifting, collision), no [a] brandmark, no page head blocks (screen-reader only) with the view
  name in the topbar, World Map under Network, lifted inspector surfaces; work hours in prefs,
  the work loop (progress → review → done + thread announcements), provider or local replies in
  Comms, compiled system prompts. Gates green: verify 10/10, smoke 83/83, web tests 87/87.
  Commit `362d13a`.
- 10 October 2026 — C42, the owner's world rule, shipped exactly as he chose it: working → desk,
  free during work hours → break room, talking pair → meeting room; walks only to deliver, to
  break, back to work, to a meeting. No energy, no forced rest. `world/placement.ts` is a pure
  function (5 unit tests), presence chips + dimmed away-desks + walking on every real move,
  theme-based room lookup with a desk fallback so no floor can dead-end. Smoke gained an
  adaptive break-room check. Gates green: verify 10/10, smoke 84/84, web tests 92/92.
- 10 October 2026 (evening) — sixth round (REQ-36..42) shipped: direct composer + inline topbar
  search, unified network interaction (drag / double-click / hover-pin) with the frozen-after-
  filter-switch sim bug fixed, company menu inert in the contracted rail, GUI vocabulary cleaned
  to real states (OrgTree deleted), landing as the true front door with one-click resume, and
  structured model progress reports (contract in the prompt, strict parser, retry, heartbeat
  fallback). Gates green: verify 10/10, smoke 90/90 (5 new checks), web tests 101/101.
- 10 October 2026 (night) — Phase G completed: the gesture layer is now shared pure code
  (`world/gestures.ts`) — inertial glide (0.92 friction, 0.05 stop), two-finger pinch about the
  opening midpoint, double-click zoom 1.6× (Shift reverses), reduced motion arrives instantly,
  and the resize guard re-fits only while "Whole plan" is the framing. REQ-2 done too: the pixel
  mark is rasterised by a dependency-free PNG encoder (scripts/gen-icons.mjs, --check in the
  gate) into favicon sizes, the apple touch icon and the manifest, all linked from index.html.
  OrgTree already retired with round six. Gates green: verify 10/10 (icon sync added), smoke
  92/92, web tests 105/105. The prototype's world.js now calls the SAME shared gestures (doubleClickZoom,
  pinchCamera, glideStep, distanceBetween, midpoint — exported through world-lib), so both
  hosts move identically; the design gate (15) and its browser probe (11) are green on the
  rewired prototype.
- 10 October 2026 (night, round seven) — seventh round (REQ-43..48) shipped, plus the three
  bugs the owner hit. Fixes: the world's fling (the glide inherited the drag's TOTAL length as
  release velocity — now one frame of travel), the network node drag (the hover pin fought the
  hand each frame — the hand now outranks the pin while held), and the studio clock redrawn
  with wrap-safe arc maths + shift-boundary ticks; the "Turn on Build…" hint text is gone.
  REQ-43: the landing teaches in three interactive steps (Found it / Hire the team / Watch it
  work) with small animated pixel scenes — screenshots deleted. REQ-44: the command palette —
  ⌘K, commands first then people/tasks/threads, ↑↓ Enter Esc, in the task-dialog language.
  REQ-45: the employee form joined the task dialog's form-grid — one form language. REQ-46:
  the inbox is a mailbox (compact lines, read-more, MCQ options or free reply that posts back
  into the asker's thread) and PROGRESS_CONTRACT grew the optional "ask" field, parsed
  strictly and filed via raiseAsk. REQ-47: the messenger grows one→three lines then scrolls,
  round send centred. REQ-48: one Help window (topbar '?', Settings row, palette command) with
  four expandable sections holding every explanation and shortcut. Gates green: verify 10/10,
  smoke 93/93, web tests 107/107.
- 11 October 2026 — Phase H completed: licences and gates. THIRD_PARTY.md superseded its
  design-era status with the shipped reality (runtime: react/react-dom/zustand/zod/hono/
  drizzle-orm/pglite/pg/tsx; dev set incl. the MPL note; first-party and adapted-idea record —
  gestures are our own maths, icons generated from the owner's demo, PNG encoder original).
  npm audit became verify step 11 (high/critical block, moderates named, offline skips
  honestly); today clean with 4 named moderates in the drizzle-kit dev chain. CI
  (.github/workflows/ci.yml) runs the same eleven-step gate on every push and PR — first run
  caught a real portability bug (e2e scripts hard-coded /home/user paths; now derived from
  import.meta.url) and, once fixed, went green in the cloud. The demo driver was revived too
  (it predated the landing door; 10/10 again), and the README grew the Credits & licences
  section (REQ-59). Gates: verify 11/11 green local AND in CI, smoke 93/93, demo file 10/10.
- 11 October 2026 — Phase I completed: the agent core. REQ-53: lib/tools.ts is now the ONE
  registry — update_progress, message_employee, ask_owner, each declared once (name,
  when-to-use sentence, JSON schema) and compiled into all three wire formats from that single
  list (OpenAI tools / Anthropic input_schema / Gemini functionDeclarations); the three
  answers parse back into one ToolCall shape. lib/toolrun.ts executes calls against the studio
  and answers the model in words — progress goes through the engine's own writer, messages
  land in threads (opening one when needed), letters file into the mailbox, and every mistake
  (bad stage, unknown name, missing options) is explained back to the model instead of being
  swallowed. The engine cycle became a tool loop (up to three rounds) with the original JSON
  contract kept as the fallback for platforms without tools; prompts v2 (compileSystemPrompt)
  now teach the company, the identity, the colleague roster, the tools with when-to-use
  guidance, and the mail/chat discipline — written once, in the repo, tested. REQ-52: the
  one-root tree is enforced where the data lives — the store refuses a second root and cycles,
  the demo obeys its own rule (Marcus reports to Aria), the team editor says both refusals in
  the owner's language, and a new hire defaults to the existing root. A reset mid-phase had
  rolled the tree onto the remote lineage, dropping an unpushed local prompt rewrite; prompt v2
  was rewritten from scratch on the true main and is better for it (the colleague roster helps
  message_employee aim). Gates: verify 11/11 local, web tests 131/131, smoke 93/93, demo file
  10/10, company-os-demo.html rebuilt.
- 11 October 2026 — Round ten: the landing became a FULL PRODUCT page (owner: "like the top
  products — GPT, Claude — complete, with structure"). Sticky product bar with the page's own
  map; two-column hero whose right half is the studio drawn in pixels (rail, desks, AI
  hexagon, live bubbles, ticking clock); an honest facts strip (4 model doors · 7 rooms ·
  4 tools · 0 servers — nothing invented); six-card feature grid; the three moves; four
  alternating deep dives; the privacy promise; a six-question FAQ in native details; the final
  call; bilingual throughout; every scene CSS, reduced-motion respected; the doors keep their
  names and the smoke suite gained the shape check — red first, then green (94/94). The
  raw-values gate taught the page token discipline (--land-*). Shipped as a32b84b.
- 11 October 2026 — Phase J completed: the mail app (REQ-54). send_mail joined the registry —
  subject, markdown body, up to three text/md attachments — so deliverables travel the same
  standard protocol as everything else; the inbox renders them like mail: a safe markdown
  reader (React nodes only), attachments that expand in place, accept or reply as the two
  moves. Mail got its rhythm: the one-open-letter lock (letters only — rule approvals never
  lock) refuses a second open letter in words; an answered letter stays open but locked,
  "awaiting {name}", until the employee's next word in their thread closes it; and the inbox
  is live — letters appear and close without reloads. Tests 139/139, gate 11/11, demo 10/10.
- 11 October 2026 — Round eleven: the showroom contract and the living landing. (1) The chat
  page's teammates column got a fixed search at its top that filters by name or role in the
  current language, with a plain no-match line — the owner's liked column style, untouched.
  (2) The demo is now a SHOWROOM: every entry is pristine (choose/reset clear the throwaway
  key), a demo session never writes the visitor's save — it scribbles on company.ai.demo.v1,
  which hydration never reads, so reload greets a fresh visitor with no resume door while the
  visitor's own companies persist exactly as before; the wizard's finish/reopen hands the pen
  back to the real save. (3) The world clock carries a work/rest text state. (4) The landing's
  inert sections now act: every feature card, deep dive and door offers "see it in the demo",
  which enters the fresh demo and drops the visitor in the room the section describes; and the
  spacing audit fixed what needed it — the stacked-panel rhythm no longer shifts grid cards,
  icon+label buttons sit on one line, and the phone view lost its 4px overflow and clipped
  title (tokenised). Tests 142/142, smoke 101/101, gate 11/11, demo 10/10; npm audit forced a
  patched esbuild via root overrides (drizzle-kit's dead esm-loader chain), db:generate
  verified.
