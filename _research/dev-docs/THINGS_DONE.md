# THINGS_DONE — append-only completed-work log

> Never rewrite an entry. Append after validation. Include: date/time, phase/task, files, behaviour,
> dependencies, validation commands + results, checkpoint path, limitations.

---

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
