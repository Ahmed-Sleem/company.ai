# Owner comments — the permanent ledger

Every comment the owner gives, recorded verbatim in intent, with a status that is only changed
with proof (a gate run, a screenshot, a live check). Nothing here is ever silently dropped:
a comment is either **done** (with evidence), **in progress**, or **tracked-open** (with a
reason and a plan). The plan (IMPLEMENTATION_PLAN.md) continues beside this file; this file
exists so comments can never be forgotten while the plan runs.

How to read it: `ID` · the comment, in the owner's intent · status · evidence.

---

## 2026-10-09 — after the first Phase C publish ("we are on the track")

Meta-comments (govern everything, always active):

- M1 Re-read the rules very carefully; the code must be like the rules. Attached rule files
  must exist in the project folder. → **done**: `_research/rules/` now also holds
  `AGENT_RULES_SANITIZED_ACTIVE.md` and `chunking mechanism.md`; the same-named attached files
  were byte-identical to the ones already in the folder. All seven rule files re-read this turn.
- M2 Document everything, organised, in the project folder, always there. → this file, plus a
  session checklist per the rules (`_research/dev-docs/thinking/`, deleted after the final
  line-by-line comparison).
- M3 Fear of the fix-one-break-one loop: double check, follow the rules, take time on the right
  things, never change something the owner likes, never break a thing while fixing another.
  → enforced by: gate after every chunk (scripts/verify.sh), screenshots before push, and the
  "keep" list below.

The keep-list (things the owner likes — must not regress, checked every push):

- K1 the World Map view ("better"), K2 the smooth wheel/pinch zoom, K3 the pixel skin and the
  CRT effect (both default on), K4 the collapsed rail default, K5 the prototype's shell
  structure (sidebar/topbar/statusbar/drawer as rebuilt 2026-10-09), K6 the demo and the
  prototype, archived at /demo/ and /prototype/, untouched.

Comments (the work list):

- C1 footer fixed. → status: DONE 2026-10-09 — `.app` is `block-size:100dvh; overflow:hidden` and `.main` owns the scroll; Chromium probe: topbar top 0 and statusbar top 760 unchanged after scrolling the content..
- C2 top bar fixed. → status: DONE 2026-10-09 — same mechanism as C1: the chrome cannot move because the page itself never scrolls..
- C3 footer with actually useful dynamic info instead of static text. → DONE 2026-10-09 — the middle span is counted live from the save: "8 people · 8 open tasks · 2 waiting your call", plus "saved HH:MM" once a save has happened..
- C4 remove the last sidebar item (the "V" owner row) — it only opens Settings, redundant. → DONE 2026-10-09 — the owner row is deleted from the JSX and its CSS (`.account/.initial/.ownerrole`) with it; Settings and World Map stay..
- C5 suitable animation everywhere it is needed, centralised so it is reused. → DONE 2026-10-09 — one motion block in app.css: `--anim-fast/--anim-med/--anim-ease`, `rise-in`/`pop-in` keyframes, reused by `.view-anim` (every view change), `dialog[open]`, `.workspace-menu` and the nav/button transitions; `prefers-reduced-motion` disables all of it..
- C6 animation when the search opens. → DONE 2026-10-09 — the search opens through the shared `dialog[open]` pop-in..
- C7 the search text box: no border/outline on focus — a colour change instead. → DONE 2026-10-09 — `input/textarea/select:focus-visible` drops the outline and answers with `--accent` border on `--accent-bg`; icon buttons keep their ring for keyboard users..
- C8 #team must be useful — rethink and redesign. → DONE 2026-10-09 — the roster is a live card per person: portrait, role/department, status badge, who they report to, the open tasks they carry with stages, capabilities; four counted statistics on top and a profile window per person..
- C9 #inbox: each decision like a slide; benefit from the prototype; rethink. → DONE 2026-10-09 — #inbox is a deck: one pending decision per slide (ask, rule, change, raised-by, risk), approve/reject slides it out and the next in, a counter and arrows move through the queue, the prototype’s queue summary sits on top and its Decision history table below. Verified in Chromium: approve advanced 1/2 → next decision; after the last reject the empty state and 2 history rows showed..
- C10 #comms: like a normal messenger (ChatGPT/Cloud style): the whole team as contacts in the
  side, choose one, text like a messenger; keep the same style. → DONE 2026-10-09 — #comms is a messenger: every teammate is a contact in the side rail (portrait, role, status, last line), choosing one opens the one-to-one chat (created on first use), bubbles + AI badge + composer follow the prototype's chat. Messages are written into the save (threads gained `messages`) and survive reload — verified: sent, reloaded, still there.
- C11 #network: the Obsidian-style graph must live here instead of the current page. → DONE 2026-10-09 — #network is the Obsidian-style graph, ported from the prototype’s graph.js as `lib/graph.ts` (same build, same force maths, same constants): 22 nodes / 21 edges from the save, settles and stays still, pointer-anchored wheel zoom, drag to pan or to move a node, hover dims everything the node does not touch, Fit frames the whole graph, and a list mode is the accessible equivalent. Chromium: settled=true, zoom 2.19x, hover hi=3, 0 errors..
- C12 #settings: the prototype's settings are much better — redesign to them, custom colours
  included. → DONE 2026-10-09 — #settings rebuilt on the prototype's layout: Appearance (theme samples dark/light/system, the palette grid incl. custom accent, language select that really flips the app, the two toggles), Company profile form writing to the save (footer updates live), Session (export / import / reset), and the aside with the philosophy panel and the keyboard shortcuts. The palette stays reachable behind data states, as its test demands (87/87).
- C13 #world: no page scroll; exactly suitable for the viewport. → DONE 2026-10-09 — #world now fits the viewport exactly: `.main[data-view=world]` is a flex column and the stage takes what is left. Chromium: desktop scrollHeight 694 = clientHeight 694, body overflow 0; phone 748 = 748..
- C14 remove the useless hint text ("Drag to move · wheel to zoom · arrows to pan · …"). → DONE 2026-10-09 — the hint line is deleted (JSX, CSS and the i18n key with it); grep for worldHint/world-hint is empty..
- C15 the world build/place needs rethink and improvement; re-read the prototype's world. → DONE 2026-10-09 — build/place reworked after re-reading the prototype (its world.js is draw+gestures; build is ours): a furniture palette from the owner’s own sprite sheet (one chip per drawable shape), click the floor to place, snapped to the 16-unit grid, grid lines visible while building, Escape cancels; and the floor plan now lives in the save (store.worldPlan) so edits persist — verified: placed a plant, reloaded, still there. The camera re-fits when the build bar changes the stage height..
- C16 keep the zoom smooth. → keep-list K2. KEPT 2026-10-09 — the world camera is untouched (target + eased frame loop, pointer-anchored wheel); smoke's zoom checks pass: wheel 43% → 63%, the point under the pointer moved 0.67 plan units. The new graph uses the same easing approach.

## Tracked follow-ups (found while doing C1–C16, not forgotten)

- F1 — the prototype's inbox has an "Ask a question" action on a decision. The app's decision
  schema has no `question` status (contracts: pending/approved/rejected/expired), so the slide
  deck ships without it rather than faking a status. Needs a schema decision before it is built.
- F2 — the prototype's graph has department hulls and a rings layout on top of the force layout.
  The port ships the force layout (the Obsidian look the owner asked for); hulls/rings can follow
  on top of the same engine if wanted.
- F3 — the prototype's settings has a "Demo states" inspector. The app has its own `?state=`
  mechanism and tests for the four states, so the inspector was not duplicated into the product.

## 2026-10-09 (later) — push discipline + the style extraction

- M4 Push every step directly, immediately: the sandbox can reset and nothing may be lost.
  → standing rule from now on: commit + push right after each working step, no batching.
- C17 Write an md file like the rule files holding every visual detail of the current project's
  pixel style, fully general (not tied to this system), no layout/structure — only the visuals:
  pixels, sizes, colours, shadows, everything. → DONE 2026-10-09 —
  `_research/rules/PIXEL_VISUAL_STYLE.md`: 13 sections covering the measurement system (every
  named raw value), the full colour system (dark, light, 4 palettes × both themes, custom-accent
  mechanics), typography, the shadow/frame language (incl. the stepped-corner recipe), component
  visual recipes, icon and portrait pixel rules, motion tokens and keyframes, the CRT overlay,
  accessibility, and a copy-paste token block. Pushed as 897b45f.

## 2026-10-09 (evening) — second round of comments

- C18 #comms and #network must fit the viewport, page not scrollable (like the world fix).
  **DONE 2026-10-09** — commit `8fda913`: the fit chain covers world/comms/network; verified
  page scrollHeight == clientHeight on all three, zero page overflow at 1280×800.
- C19 #world: remove the staff/working/tasks stats; all controls collapse into one menu that
  opens/closes, giving the space to the viewer itself; rooms become customisable/buildable.
  **DONE 2026-10-09** — commit `f8ff746`: stats strip gone, one floating menu carries every
  control, rooms are buildable (drag a rectangle, resize handle, rename, theme, delete, undo),
  everything persists in the save; browser-verified a new "Sound Booth" room end to end.
- C20 #settings: remove the "[ company.ai ] Designed to stay focused…" panel and the keyboard
  shortcuts panel (the whole aside).
  **DONE 2026-10-09** — commit `3c14f39`: the aside, its strings and its CSS are deleted; the
  settings screen is a single column of the real controls.
- C21 #network: a controls window to choose which graph to see (tasks, people, …); clicking a
  node opens its details with options to control that task/employee; the graph is dynamic,
  always gently moving, smooth like Obsidian.
  **DONE 2026-10-09** — commit `16e4d6c`: the graph window picks Everything / People / Tasks /
  Conversations; a node click opens its window — a task moves stage (only legal transitions) and
  priority, a person's status changes, a conversation jumps to #comms; the layout never fully
  settles (alpha floor 0.012) so it breathes like Obsidian's, pauses under the cursor, and
  freezes entirely with reduced-motion. Verified: drift observed between frames, stage move and
  status change persisted, 0 page errors.
- C22 #comms: the Teammates list scrolls by itself (not the whole page); the chat interface —
  details and the text box — redesigned to be more pleasing.
  **DONE 2026-10-09** — commit `de1147c`: the rail and the log each own their scroll (page does
  not move); consecutive messages from one sender group under a single name line, the header
  gets a pixel name and status dot, and the composer is a calmer raised strip with a two-row
  box and an Enter/Shift+Enter hint.
- C23 #team: people must be editable (change their info), exactly per the main plan and the
  requirements (REQ-17: user-typed name, role, details; pixel portrait; place in the hierarchy).
  **DONE 2026-10-09** — commits `346c7cf` + `a9fb00e`: one editor window adds a teammate and
  edits an existing one — typed name/role (en+ar), details, a portrait picked from the 66-sprite
  set, and "reports to" placing them in the hierarchy; validation speaks to the user; the save
  numbers new people `p-new-N`. Verified: empty name refused, Nour added + survived reload,
  Aria edited to "Aria Zahra"; 3 new smoke checks (74/74), gate 10/10.
- C24 Complete the next phase in the plan → Phase D: landing page + intro wizard
  (REQ-33/14/15/16), resumable, everything editable later.

## 2026-10-09 (late evening) — third round of comments

- C25 #world: the controls window needs a redesign, and it overlaps the people inspector —
  move it to the left side.
  **DONE 2026-10-09** — commit `806af71`: the controls now float at the leading edge (left in
  LTR), rebuilt as headed blocks — plan/rooms, zoom with its live scale read-out, build,
  palette + room editor — with a header row and close button; the person drawer stays on the
  end side and no longer collides (rects measured, no overlap).
- C26 #network: the graph is perfect, but the inspector and controls are corrupted — some
  icons are very big; audit them. The same inspector must be shared with the world view.
  **DONE 2026-10-09** — commit `806af71`: the audit found `.graph-stage svg {100%}` catching
  every icon inside the floating windows (the rule meant for the canvas alone); it now targets
  only the canvas, `icon-btn`/`iconbtn` unified, and every measured icon is 18px. A new
  `AgentInspector` component is THE person window in both the world drawer and the network.
- C27 #team: the "Add a teammate" button needs space under it so it does not stick to
  other things.
  **DONE 2026-10-09** — commit `806af71`: 20px of measured air under the button.
- C28 everywhere: reduce the titles' space (e.g. "The whole studio at once." + its line)
  to give more space to the pages.
  **DONE 2026-10-09** — commit `806af71`: the page head is one compact band now (59px tall,
  measured) — smaller title, tight eyebrow, one-line description — the page gets the rest.
## 2026-10-10 — Phase E done

- Phase E (REQ-18/19): every teammate has their own model connection in the editor — provider
  (OpenAI / Anthropic / Gemini / custom OpenAI-compatible), model id, key, base URL for custom —
  and a Test button making a tiny real request to the provider, surfacing its own error words
  ("invalid x-api-key" observed live). Keys live only in the visitor's save. Save schema v3.

- C24 stands: on opening, there is no landing page or intro yet, and the data is the
  hard-coded demo — not the owner's own, not from scratch. → Phase D next.
  **DONE 2026-10-09** — commit `34395b3`: a visitor with no save meets the landing page
  (pixel style, three screenshots of the real product, one start button + a demo door). The
  wizard collects the owner's company (name/description/answers), employees (full REQ-17
  fields) and options; the draft lives in the save so a closed tab resumes; finishing starts
  FROM SCRATCH — zero demo tasks/threads. Old saves migrate straight in (version 2). Settings
  now edits the whole company profile. Note: compiling the profile into model prompts (REQ-16)
  rides with the engine in Phase F.

## 2026-10-10 — fourth round of comments

- C29 #world: the close button of the person inspector (drawer) does not work.
  **DONE 2026-10-10** — commit `d5fef70`: the drawer lived inside the panning viewport, whose
  pointer capture ate its buttons; it is now a sibling of the viewport. Close verified live.
- C30 #world: when build expands, the menu must not grow very long — the viewport is fixed;
  the menu should expand in pages.
  **DONE 2026-10-10** — commit `d5fef70`: the menu is paged — View / Build tabs plus a constant
  camera strip (fit, scale, zoom). Measured heights: 394px view, 416px build; never taller.
- C31 #world: new rooms must be resizable.
  **DONE 2026-10-10** — commit `d5fef70`: rooms are selectable in every mode (a still press
  chooses them; panning keeps the floor), and the resize handle shows on a chosen room as well
  as in build mode. Verified: a brand-new room grew 130×87 → 268×174 and persisted.
- C32 everywhere: world, graph and the rest must all be viewers and controls of the same
  general thing — add a person/task/room and every view must show it.
  **VERIFIED 2026-10-10** (commit `28b5085`): one save, every view a viewer of it — a person
  typed in Team appeared on a world desk, as a graph node and in the comms rail; a task added
  once showed on the board, the desk and the graph. No fork needed; the probe proved it.
- C33 the owner still has not SEEN the landing page (his save predates it) — he is on board,
  but give him a door to it.
  **DONE 2026-10-10** — commit `28b5085`: Settings → "Open the intro again". The wizard
  reopens OVER the current company in edit mode — prefilled, ids kept, nothing wiped (verified:
  10 tasks / 3 threads before and after).
- Continue the next phase (Phase E: per-employee providers, REQ-18/19).
  **DONE 2026-10-10** — see Phase E entry below.

## 2026-10-10 (later) — fifth round of comments

- C34 #network: the canvas shows a blue "selected" border — remove it.
  **DONE 2026-10-10** — commit `362d13a`: focus ring dropped; the pin window is the selection.
- C35 inspectors (network + world): the card lacks contrast with what is underneath — improve.
  **DONE 2026-10-10** — surfaces lifted off the canvas (`--app-surface-raise`), border + shadow.
- C36 sidebar: move World Map directly under Network.
  **DONE 2026-10-10** — order is now team · tasks · inbox · comms · network · world · settings.
- C37 remove the "World Map / Overview / title / subtitle" head block; instead improve the
  topbar: drop "Acme Studio/", emphasise the view name (World Map, …).
  **DONE 2026-10-10** — head blocks are screen-reader only; the topbar shows just the view name
  in the display face; the company lives in the sidebar brand, so no prefix anywhere.
- C38 remove the [a] logo from the top menu.
  **DONE 2026-10-10** — brandmark gone from sidebar, landing, and wizard.
- C39 #world: the grid must be infinite, not only inside the floor rectangle.
  **DONE 2026-10-10** — the dotted plane follows the camera everywhere; the pan is free
  (camera field 4000px, Fit is the way home; camera tests updated to the new contract).
- C40 a LIVE toggle in world + network: bubbles over people (working on what, thinking,
  sleeping > 2h), agents walk to deliver to their counterpart and back; a circular clock with
  work/off hours in two colours and the current position.
  **DONE 2026-10-10** — seat bubbles (task / review / thinking / idle / sleeping after hours),
  studio clock (work vs off arcs + live hand), walker delivers done work to the manager's desk;
  the network shows the same statuses as node sub-labels. Everything honours reduced-motion.
- C41 #network: nodes must collide, never overlap; always in motion, never freeze.
  **DONE 2026-10-10** — hover now pins only the hovered node while it is held; the rest keep
  drifting; collision keeps every pair apart at every scale.
- C42 furniture/world audit: gamify properly, room-type behaviours, mandatory rest room, no
  gaps in the logic — ASK THE OWNER with recommendations, he chooses.
  **WAITING ON OWNER** — design questions sent 10 October 2026 (room set, energy, rest rule,
  walks). Nothing is built until the answers are in.
- C43 commits must read like a professional team's history — full detail per commit.
  **DONE 2026-10-10** — from `362d13a` on, every commit carries a detailed body: what changed,
  why, per-comment references, and the gate results.
- Continue the next phase (Phase F — the engine).
  **DONE 2026-10-10** — commit `362d13a`: work hours in prefs, the work loop
  (progress → review → done with thread announcements), provider-or-local replies in Comms,
  compiled system prompts (REQ-16/26/28/35). Gates green: verify 10/10, smoke 83/83, tests 87/87.
