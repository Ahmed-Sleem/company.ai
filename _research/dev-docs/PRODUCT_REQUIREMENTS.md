# Product requirements — the real company.os

_2026-10-08 · **v2** — every `(open)` from v1 resolved by the owner's answers of the same day
(Q1 all / Q2 browser / Q3 both / Q4 custom: landing page / Q5 execute-and-report). v1 is superseded;
IDs are stable. The plan (`IMPLEMENTATION_PLAN.md`) and the tests refer back to these IDs._

---

## §1 · The product and its look

- REQ-1  The product is the real app wearing the prototype's look exactly (pixel type, hairlines,
  notches, palettes, dark/light, Arabic RTL, screen effect). The prototype stays the frozen design
  reference; look changes land in the app **and** as prototype patches so the two never disagree.
- REQ-2  Pixelated app icon: one pixel SVG mark used as favicon, sidebar brand mark and app icon
  (manifest/PWA sizes generated from the same SVG).
- REQ-3  Scrollbars stay functional but are **visually removed app-wide** (shared rules:
  `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`), matching DESIGN_SYSTEM's own
  "no visible scrollbars on dense interior surfaces".
- REQ-4  The sidebar never scrolls; it contracts and expands at every width (rail toggle kept).
- REQ-5  The "↳ A calm place to run your AI company / No live AI connections" text is removed from
  the sidebar, in the app and in the prototype.
- REQ-6  The footer is **fixed on every page**, de-demo-ified, and absorbs small useful info
  (company name, work-loop state, version) so pages become more minimal.
- REQ-7  No page-level scrolling on any view (`#world`, `#network`, `#comms` named; the rule covers
  all): each view sizes to the viewport; only inner panes scroll (invisibly). The world's inner
  window works fine at every size, phone included.

## §2 · Repo hygiene

- REQ-8  Clean unwanted/bad/trash files and organise fully, under an execute-and-report mandate
  (Q5): the inventory lives in the plan; the report of what went is in the done-log.
- REQ-9  Rule docs stay mandatory and findable; the done-log stays append-only; generated files
  keep their generators and drift checks; one screenshots home.

## §3 · Data ownership — everything on the user's side

- REQ-10 All product data (company, employees, tasks, messages, histories, settings, schedule) is
  stored on the user's side in localStorage (decided in v1: cookies are too small).
- REQ-11 One-file save/load: export **everything** to a single JSON file and load it back with
  validation and a clear error on a bad file. The file is backup, transfer and share.
- REQ-12 No hard-coded company/people/tasks in the product; sample data exists only as a labelled
  test/landing fixture, never as product state.
- REQ-13 **(Q2)** The browser is the engine: model APIs are called from the browser with the user's
  keys; `services/api`, the database, the Dockerfile and `render.yaml` are **retired**. The real
  app becomes a static site hosted on GitHub Pages (free), prototype beside it at `/prototype`.

## §4 · First run — landing, then the intro

- REQ-33 **(Q4)** A brand-new visitor first sees a **landing page** in the same pixel style,
  explaining the product **with screenshots** of it, and one start button.
- REQ-14 The start button opens the intro wizard: (a) the **company** — name, description and
  further details answered as questions; (b) the **employees** in a hierarchy (§5); (c) the
  **options and settings** (appearance, language, work hours, effect/rail defaults).
- REQ-15 Everything the wizard collects is editable later; the wizard is resumable if closed.
- REQ-16 The company profile (name, description, answers) is compiled into the models' system
  prompts (§6) so they understand the company the user described.

## §5 · Employees — general, user-typed, validated hierarchy

- REQ-17 Each employee: user-typed name, role, description/details; a pixel portrait from the
  sprite set; a place in the hierarchy.
- REQ-18 Each employee has their own model connection: provider (OpenAI, Anthropic, Gemini, and a
  custom/OpenAI-compatible endpoint for anything else), model identifier, user-entered API key.
- REQ-19 A **test connection** button per employee: a tiny real request to that provider with that
  key and model, reporting success or the provider's own error, before saving.
- REQ-20 Hierarchy: per employee — no manager (root) or which employee manages them; any shape
  allowed, more than one root allowed with a warning.
- REQ-21 Validation live and on save: no cycles, no self-manager, manager must exist; the UI names
  the offending chain and blocks the save.
- REQ-22 Keys live on the user's side and are sent only to the provider the user chose.
  (Documented deviation from the rules' "no secrets" line — the keys are the *user's own*, on the
  *user's machine*; recorded in SUPPORTING_NOTES.)

## §6 · The work engine — managers assign, employees work, loops until done

- REQ-23 Every model call gets a system prompt compiled from the user's data: company profile, the
  employee's own description, their manager and reports, and the assignment grammar. Generated,
  never hand-written per company.
- REQ-24 The manager assigns work using a **special text structure** specified in its system prompt
  (strict parseable block: fenced JSON array of {to, title, detail, priority}). The app parses the
  output, delivers each message to the addressed employee, and puts the task on that employee's
  task page.
- REQ-25 Employees work in a ReAct-style loop: each step the model chooses one structured option —
  continue working / ask the manager / delegate a sub-task downward (same grammar) / finish and
  report — until it reports done or blocked.
- REQ-26 Reports flow up: the manager accepts / asks for changes / reports failure (upward, or to
  the user at the top). Dynamic work, not a one-shot pipeline.
- REQ-27 The owner can chat with any employee who is not working right now, and can watch every
  loop's trail while it runs.
- REQ-28 All history is kept per employee and per task — every message, choice, assignment, report
  — on the user's side, viewable in the UI, included in the export.
- REQ-29 The engine is resumable: a checkpoint persists after each step; reload or stop resumes from
  the point it ended, never re-running or losing a step.
- REQ-35 **(Q1 consequence)** No caps of any kind ("we do not have something called budget").
  Correctness handling instead: persistently malformed output or a provider error pauses that loop
  and asks the user — that is failure handling, not a budget.

## §7 · Timing

- REQ-30 **(Q3)** Both: a daily schedule (start/stop times, user's timezone) **and** manual
  start-now / stop-now override. Auto-start, auto-stop, auto-resume from checkpoint (REQ-29).
- REQ-31 (decided) The browser cannot run while closed; the schedule means "while the app is open".
  The landing/intro says so plainly.

## §8 · Removals

- REQ-32 **Budget is removed entirely** (Q1 "all"): team meters, drawer line, spend stat, API/DB
  columns and seeds, tests, prototype drawer line — and no caps of any kind (REQ-35). The model
  price table goes too.

## §9 · Conflicts with standing rules — resolutions (owner-approved via Q1–Q5)

- C-1  "Hard caps per agent/task" rule is **retired** by Q1; replaced by REQ-35 failure handling.
- C-2  Copy-paste reuse **and** the licence gate both stand: every reused component is licence-
  checked into THIRD_PARTY.md before landing; only permissive licences (MIT/Apache-2.0/ISC) pass.
- C-3  The premade gateway becomes client-side provider adapters (REQ-18); the approval inbox
  becomes "the top of the hierarchy reports to the user" (REQ-26); cost tracking dies with budget.
- C-4  "Never edit the demo files" stands; prototype patches carry the look changes (REQ-1/5).
- C-5  `render.yaml`/Docker retire with the server (REQ-13); GitHub Pages hosts the real thing.

## §10 · Out of scope for now (unchanged)

- The owner's sprite pack from online — blocked until he names the source (provenance gate).
- Minimalism reductions — only after he picks from the audit list.

## §11 · Definition of done for the document set

1. ✅ v2 requirements (this file) with all opens resolved.
2. Rules re-read note — SUPPORTING_NOTES, §"2026-10-08 rules re-read".
3. Repo assessment — IMPLEMENTATION_PLAN §1.
4. The big plan with reuse URLs + licences — IMPLEMENTATION_PLAN (rewritten).
5. Execution phase by phase, each pushed, each logged.

## §12 · Sixth round (2026-10-10) — the owner's new requirements

- REQ-36 The messenger composer is one calm unit: a fixed-size text box that scrolls inside
  itself, a send button beside it, and nothing else — no hint text, no overlays, no selection
  chrome. Typing is direct, like every modern messenger. (Enter sends, Shift+Enter adds a line —
  the behaviour stays; the explanation on screen goes.)
- REQ-37 Search is typed directly into the topbar — an inline field with its results under it.
  The modal search dialog is removed. ⌘K/Ctrl+K focuses the field instead of opening a dialog.
- REQ-38 The network treats every agency identically: people, tasks and conversations share the
  same movement, the same collision, the same hover-hold, in every filter mode. Interaction:
  drag moves a node (the graph stays alive around it), **double-click inspects**, a single click
  no longer opens the inspector. The accessible list keeps a one-activation path to every
  inspector.
- REQ-39 The company button (save to file / load / start over) is inert while the sidebar is
  contracted — a collapsed rail shows labels on hover, it does not open menus.
- REQ-40 The GUI speaks only real states: working, in review, on break, sleeping, paused,
  blocked. Derived editorialising ("Needs attention", and anything like it) is removed from
  every view — an error is *blocked*, a pause is *paused*, and the words match the live bubbles.
- REQ-41 The landing page is the front door on **every** fresh load — the app never opens over
  it silently. When a studio exists, the landing offers "Open {company}" and one click resumes
  exactly where the owner left off (the save is untouched).
- REQ-42 Structured progress reports: the system prompt hands every model one strict contract —
  each engine cycle the model answers with a single JSON object `{"progress": 0-100,
  "stage": "progress|review|done", "note": "one short line"}` for the task it is working. The
  engine parses it (fenced code tolerated), clamps it, writes progress/stage, and posts the note
  in the task's thread. A malformed answer gets one format-retry; a second failure falls back to
  the local heartbeat for that cycle and, if it persists, pauses the loop and asks (REQ-35).
  Agents without a provider keep the local heartbeat unchanged.

## §13 · Seventh round (2026-10-10, night)

- REQ-43 The landing educates instead of showing screenshots: minimal, clear, to-the-point
  copy with small interactive visuals (a stepper the visitor clicks through), nothing more.
- REQ-44 The search is a command palette (VS Code style): one window, one input; it lists
  commands (go to any view, toggle theme/language/rail, open help…) alongside matching people,
  tasks, threads; full keyboard control (↑↓ Enter Esc), ⌘K opens.
- REQ-45 One form language everywhere: the task dialog's centred, bordered, dark-input style is
  the style for the employee create/edit form and any future form.
- REQ-46 The inbox is a mailbox: compact one-line messages with sender and time, "read more"
  expands, each ask offers either MCQ option buttons or a free-text reply. The model's system
  prompt carries one more contract: when a person needs the owner, it adds
  `"ask": {"question": "...", "options": ["…"]}` to its report; the engine parses it and files
  it as a pending message with those exact options.
- REQ-47 The messenger input grows with the typing (one line → up to three), then scrolls; the
  send control is a round button centred on the input's height.
- REQ-48 A single Help window (Settings + topbar button): expandable sections that hold every
  explanation and shortcut — the graph's pointer language, the world's gestures, the keyboard.

All six shipped the same night (see THINGS_DONE, round seven): gates verify 10/10, smoke
93/93, web tests 107/107.

## §14 · Eighth round (2026-10-11)

Done in the round itself:
- REQ-49 The landing is a COMPLETE page in the same pixel style — hero, what it is, the team,
  the engine, the mailbox, the seven rooms, your data — full sections with pixel scenes, no
  slider, educating the visitor before any click.
- REQ-50 Every company lives on the device: Start lists all created companies (name + date)
  with Open buttons plus "New company"; New company archives the current save and reboots
  into the wizard — the wizard is always reachable. The demo is never listed (demoMode).
- REQ-51 The round's small corrections: no blue selection slab in the palette field; the
  inbox's "waiting for you" strip removed; explicit "Read more" button on every letter; the
  conversation is a centred column with top padding and the composer has no placeholder;
  the world allows NO select/resize/drag outside the Build toggle (and closing Build drops
  every selection). Help window grew three sections (Building the world, Mail vs chat, Your
  companies).

Required, scheduled into phases (MANDATORY — nothing may be dropped):
- REQ-52 One-root hierarchy: the org chart is a tree with exactly ONE root — the root model
  (the owner's second-in-command) at the top; every employee descends from it; cycles and
  second roots are refused by the engine and the forms. (Phase I)
- REQ-53 Standard tool protocol: every capability the app gives a model is a declared tool
  (JSON Schema, one registry): message another employee, send mail to the owner, update task
  progress, raise an ask, and later the integrations. Providers use their native function
  calling (OpenAI tools / Anthropic tool use / Gemini functionDecls) — adapted from the
  Vercel AI SDK (MIT) where it saves code; endpoints without tool support fall back to the
  structured-JSON contract. Prompts list the available tools. (Phase I)
- REQ-54 Mail is for deliverables, chat is for talking: models send outputs (markdown,
  images, files, text) through a send-mail tool — never through the conversation threads.
  The inbox becomes a true mail app between the owner and the models (research the great
  mail UX and copy it): approve, or reply — and the owner cannot reply again until the model
  sends the next version/answer (one pending reply at a time). System prompts teach the
  difference explicitly. (Phase J)
- REQ-55 Integrations for the root manager, all adapted from GitHub (not from scratch):
  Notion and Google Drive first, via MCP (Model Context Protocol — the open standard,
  @modelcontextprotocol/sdk MIT) hosted by the gateway service; candidates from
  modelcontextprotocol/servers and the official SDKs (@notionhq/client MIT,
  googleapis Apache-2.0). Every borrowed repo lands in THIRD_PARTY.md and the README
  credits. (Phase K) — ✅ done 2026-10-11 (`e2621e9`): hand-rolled streamable-HTTP MCP client,
  Notion + Drive REST adapters, GitHub-only rule in the store, tools lent to the registry.
- REQ-56 Messenger upgrades: WhatsApp-style seen stamps (sent → delivered → seen) and
  scheduling — send ten messages and the model sees the first and starts work; the system
  delivers the rest one per model turn. (Phase L) — ✅ done 2026-10-12 (`aedc2a1`): stamps on
  every owner message, queue + one-per-turn scheduler living in the store.
- REQ-57 Per-employee history: a History button on every employee opening a NEW TAB with the
  complete, exact context from the moment they started — every input and output. Stored in
  IndexedDB via Dexie.js (Apache-2.0) for performance at size; viewer adapted/credit-listed.
  (Phase M) — ✅ done 2026-10-12 (`c6db749`): exact transcripts in IndexedDB, windowed
  new-tab viewer, team profile + chat head doors.
- REQ-58 Help-window completeness is an obligation: every phase that adds a capability adds
  its explanation and shortcuts to the Help window in the same commit.
- REQ-59 README credits: the repo's README lists every borrowed piece of code with its
  licence — the project is free and non-commercial, and the credits are part of it.

Research conclusions behind REQ-53..55 (2026-10-11): MCP is the de-facto standard for
connecting agents to tools (Linux-Foundation-governed, ~97M monthly SDK downloads, adopted
by OpenAI/Google/Microsoft); function calling is the model-level mechanism and MCP the
integration-level one — they compose. So: internal app capabilities = declared tools via
native function calling; external services = MCP servers behind the gateway. Dexie.js is
the standard high-performance IndexedDB wrapper for the history store.
