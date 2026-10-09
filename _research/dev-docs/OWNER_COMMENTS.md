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
