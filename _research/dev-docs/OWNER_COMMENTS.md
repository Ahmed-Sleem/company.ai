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
- C9 #inbox: each decision like a slide; benefit from the prototype; rethink. → _set below_.
- C10 #comms: like a normal messenger (ChatGPT/Cloud style): the whole team as contacts in the
  side, choose one, text like a messenger; keep the same style. → _set below_.
- C11 #network: the Obsidian-style graph must live here instead of the current page. → _set below_.
- C12 #settings: the prototype's settings are much better — redesign to them, custom colours
  included. → _set below_.
- C13 #world: no page scroll; exactly suitable for the viewport. → _set below_.
- C14 remove the useless hint text ("Drag to move · wheel to zoom · arrows to pan · …"). → _set below_.
- C15 the world build/place needs rethink and improvement; re-read the prototype's world. → _set below_.
- C16 keep the zoom smooth. → keep-list K2.
