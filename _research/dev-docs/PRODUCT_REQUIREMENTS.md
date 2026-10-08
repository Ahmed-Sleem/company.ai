# Product requirements — the real company.os

_2026-10-08 · v1 (draft for the owner's review) · written from his message of the same day,
one requirement per ID, nothing dropped. Status: **questions open** (§12). After his answers this
doc is refined to v2, then the rules are re-read, the repo re-assessed, and the full plan written._

How to read this: `REQ-<n>` is stable — the plan, the tests and the done-log will refer back to
these IDs. `(open)` marks a point the owner must decide (§12); `(decided)` marks a decision taken
here with the reason written down, which stands unless he objects.

---

## §1 · The product and its look

- REQ-1  The product is the real app, wearing the prototype's look exactly: pixel type, hairlines,
  notches, palettes, dark/light, Arabic RTL, the screen effect. The prototype stays the frozen
  design reference; where a requirement below changes the look (scrollbars, footer, sidebar text),
  the change lands in the app **and** as a prototype patch so the two never disagree.
- REQ-2  Pixelated app icon: draw a pixel SVG mark; use it as the favicon, the sidebar brand mark
  and the app icon (PWA/manifest sizes generated from the one SVG).
- REQ-3  Scrollbars: keep every scrollable region scrollable but **visually remove all scrollbars**
  app-wide (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }` on the shared rules,
  not per-view hacks).
- REQ-4  The sidebar ("menu bar") is **not scrollable** — it must fit its content in the viewport;
  and it **contracts and expands** (the rail toggle, kept and made to work at every width).
- REQ-5  Remove the text "↳ A calm place to run your AI company. / No live AI connections" from the
  sidebar, in the app and in the prototype.
- REQ-6  The footer is **fixed in place on every page**, de-demo-ified: no demo wording; it carries
  the useful small info (company name, state of the work loop, version) so pages can drop that
  info and become more minimal.
- REQ-7  Pages fit the viewport — no page-level scrolling on `#world`, `#network`, `#comms`
  (and by the same rule, every view): the view sizes itself to the window; only inner panes scroll
  (invisibly, per REQ-3). The world's inner window is improved to work fine at every size, phone
  included.

## §2 · Repo hygiene

- REQ-8  Clean the repository of unwanted/bad/trash files and organise it fully. An inventory with
  keep / move / delete per path is part of the plan (§13 of the plan doc); nothing is deleted
  silently — the inventory is committed and his approval is taken for the delete list (open Q5).
- REQ-9  Anything kept stays reachable: the four rule docs remain mandatory and findable; the
  done-log stays append-only; generated files keep their generators and drift checks.

## §3 · Data ownership — everything on the user's side

- REQ-10 All product data (company, employees, tasks, messages, histories, settings, schedule) is
  stored **on the user's side**. `(decided)` localStorage, not cookies: cookies cap at ~4 KB and
  are sent with every request; histories of model runs will be megabytes. localStorage (~5–10 MB)
  plus the file export (REQ-11) removes the ceiling in practice.
- REQ-11 One-file save/load: export **everything** to a single JSON file (download), and load it
  back (file picker), validated on import with a clear error on a bad file. This is the backup,
  the transfer between machines, and the "share my company" mechanism.
- REQ-12 No hard-coded company, people or tasks: what today is seed data becomes the *demo company*
  at most (open Q4); the product starts from the user's own input (§4).
- REQ-13 `(open Q2)` If all data is user-side, the browser is also the engine that talks to the
  model APIs with the user's keys — which makes the current server + database redundant. The
  decision (retire `services/api` + DB entirely, or keep an optional server) is the biggest fork in
  the plan and is asked in §12.

## §4 · First run — the intro (onboarding)

- REQ-14 A new visitor is greeted by an intro wizard before any shell: it collects, in order —
  (a) the **company**: name, description and further details answered as questions;
  (b) the **employees**, created in a hierarchy (§5); (c) the **options and settings** (appearance,
  language, work hours §7, effect/rail defaults).
- REQ-15 Everything the wizard collects is editable later from Settings/Team — the intro is the
  first edit, not a one-way door. The wizard itself is resumable if closed halfway.
- REQ-16 The company's name, description and answered questions are **given to the models as
  context**: they are compiled into the system prompts (§6), so the models understand the company
  the user described.

## §5 · Employees — general, user-typed, validated hierarchy

- REQ-17 Each employee: name, role, description/details (user-typed, free text — no hard-coded
  roster), a pixel portrait chosen from the sprite set, and a place in the hierarchy.
- REQ-18 Each employee has **their own model connection**: a provider (any available model API —
  OpenAI, Anthropic, Gemini, … and a custom/OpenAI-compatible endpoint for the rest), a model
  identifier, and an API key entered by the user. Two employees may share a model or differ.
- REQ-19 A **test connection** button per employee: makes a tiny real request to that provider with
  that key and model and reports success/failure with the provider's own error, before saving.
- REQ-20 Hierarchy: the user chooses per employee — no manager (a root) or which employee is their
  manager; any shape of hierarchy is allowed (more than one root included, with a warning).
- REQ-21 Validation, enforced live in the UI and on save: no cycles (an employee may not report,
  directly or transitively, to themselves), no self-manager, manager must exist; when a problem
  exists the UI **tells the user what it is** (names the chain) and blocks the save.
- REQ-22 Keys are stored on the user's side (REQ-10) and are never sent anywhere except to the
  provider the user chose (and, if Q2 keeps a server, never there).

## §6 · The work engine — managers assign, employees work, loops until done

- REQ-23 Every model call receives a system prompt compiled by our system from the user's data:
  the company profile (REQ-16), the employee's own description, their manager and reports, and the
  task-assignment grammar below. The prompts are generated, never hand-written per company.
- REQ-24 The manager reads the company and its employees and assigns work using a **special text
  structure** we specify in its system prompt (a strict, parseable block — e.g. a fenced JSON
  array of {to, title, detail, priority}). The app parses the manager's output, extracts each
  assignment, and delivers it: the message goes to the addressed employee, and the task appears on
  that employee's task page.
- REQ-25 Employees, with their full context, then **work in an agent loop** (ReAct-style): each
  step the model chooses one of the structured options — continue working / ask the manager
  something / delegate a sub-task to a report (same grammar as REQ-24, downward only) / finish and
  report. The loop runs until the employee reports done or blocked.
- REQ-26 Reports flow back up: the manager receives the work and chooses — accept / ask for
  changes / report failure (to its own manager, or to the user at the top). Dynamic work, not a
  one-shot pipeline.
- REQ-27 The owner can **chat with any employee who is not working right now** (a free conversation
  with that employee's model and context), and can see every loop's trail while it runs.
- REQ-28 **All history** is kept, per employee and per task: every model message, tool-less
  reasoning step, assignment and report — on the user's side (REQ-10), viewable in the UI
  (the conversations/task screens), included in the export (REQ-11).
- REQ-29 The engine is resumable: every loop persists its checkpoint after each step, so a reload
  or a stop resumes **from the point it ended**, never re-running or losing a step.

## §7 · Timing

- REQ-30 The user chooses when the company **starts work and when it stops** (open Q3: a daily
  schedule, a manual start/stop, or both). Auto-start at the chosen time, auto-stop at the chosen
  time, auto-resume from checkpoint (REQ-29).
- REQ-31 `(decided, consequence of Q2 if browser-engine)` a browser cannot run while the tab is
  closed; the schedule therefore means "while the app is open". If the owner wants 24/7 unattended
  work, that is the server option in Q2 — the two answers must be taken together.

## §8 · Removals

- REQ-32 **Budget is removed — "we do not have something called budget in this product."** Known
  touch-points to strip: the team cards' budget meters, the world drawer's budget line, the world
  stats' monthly spend, the API/DB `budget` columns and seeds, the tests around them, and the
  prototype drawer's budget line (patch). *(open Q1: what happens to the safety caps and the model
  price table.)*

## §9 · Conflicts with standing rules — resolutions proposed

- C-1  Standing rule "hard caps per agent and per task" vs REQ-32. Proposed: the *money budget UI*
  dies; token/step **safety caps** on the agent loops stay, as loop limits (max steps per run, max
  concurrent loops) — they are engine safety, not "budget". (open Q1.)
- C-2  Standing rule "harvest with CI licence gate + THIRD_PARTY.md, blocked-licence list" vs
  "copy-paste reusable code from the internet". Proposed: reuse is encouraged **and** every reused
  component is licence-checked into THIRD_PARTY.md before it lands; GPL/AGPL/unlicenced stay
  blocked; MIT/Apache/BSL-with-check pass. The plan will cite URLs + licences.
- C-3  The MVP P0–P2 roadmap (approval inbox, cost tracking, provider gateway) vs the new
  user-keyed, user-side product. Proposed: the inbox becomes "the manager asks the user" (approval
  of failures/changes at the top of the hierarchy); the premade gateway becomes the client-side
  provider adapters (REQ-18); cost tracking dies with budget unless Q1 says otherwise.
- C-4  "Never edit the demo files" stands; prototype patches (build-prototype.py) are ours and
  carry the look changes (REQ-1, REQ-5).

## §10 · Out of scope for now (standing, unchanged)

- The owner's sprite pack from online — blocked until he names the source and provenance is
  checked; our pixel art is the placeholder.
- Minimalism reductions — only after he picks from the audit list.
- Render/`render.yaml` — its fate follows Q2 (if the server retires, the yaml retires with it and
  GitHub Pages becomes the host of the real thing, which it can now be: a fully client-side app).

## §11 · What "done" looks like for this document set

1. v2 of this doc with every `(open)` resolved and his sign-off.
2. A rules re-read note (what changed since the rules were written).
3. A repo assessment (what exists vs the requirements, gap by gap).
4. The big plan: phases, per-phase file lists, reuse URLs + licences, test plans, and the repo
   reorganisation map — committed and pushed.
5. Then execution, phase by phase, each pushed.

---

## §12 · Questions for the owner (asked via the question UI alongside this doc)

- Q1 — Budget removal scope (UI only / everything including caps / keep the price table).
- Q2 — Engine location: fully browser-side (server + DB retired, Pages hosts the real thing,
  work runs while the app is open) vs keep a small server (24/7 work possible, needs free hosting).
- Q3 — Schedule shape: daily work hours / manual start-stop / both.
- Q4 — New visitor: straight into the intro, or intro plus an optional "explore the demo company".
- Q5 — Repo cleanup mandate: delete-list approved by him first, or execute and report.
