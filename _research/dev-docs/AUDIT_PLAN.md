# The Standing Audit — every part of the product, from the beginning, in phases

Owner, round fourteen (2026-10-12): *"do a full audit plan, to audit each thing in the product,
from beginning, improve anything needs… i think the landing page still needs alot… create the
plan, then we audit everything in phases."* This is that plan. One phase per round; a phase is
not closed until its fixes are committed, pushed, CI-green, and logged in `THINGS_DONE.md`.

## The protocol — every phase runs the same eight passes

1. **Code pass** — read the view/store/lib the phase covers, with its tests; name what is
   missing, stale, or lying.
2. **Visual pass** — real captures: English light + dark, Arabic light + dark, desktop 1440 and
   a 390px phone. Eyeballed, not assumed. Spacing, alignment, clipping, overflow first.
3. **Owner-contract pass** — the standing rules: tokens only (no raw values), logical
   properties, no blue focus/selection slabs, scrollbars hidden but scrollable, forms speak the
   one dialog language, no hard-coded product data, validation in owner words, reduced-motion,
   "never change liked things".
4. **i18n pass** — every string through `t()`, both languages real (not machine-thin), RTL
   structure correct, pixel-font sizes sane in Arabic.
5. **Interaction pass** — keyboard reachability, Enter/Esc behaviour, search-as-typing, drag and
   double-click contracts, phone drawers, composer growth.
6. **Data pass** — the demo showroom stays fresh and writes nothing; the owner's save survives
   reload, export, import; old saves migrate; a blocked storage box never crashes.
7. **Test pass** — new checks observed failing first, then green; smoke grows where the eye
   found a rule.
8. **Docs pass** — `THINGS_DONE.md`, Help window (REQ-58), README/screens if visible,
   `THIRD_PARTY.md` if anything was borrowed.

Findings get an id (`A<phase>-<n>`), a verdict (fix / accept / ask-owner), and land in this file
under the phase until fixed, then in the done-log.

## The phases, in the owner's order of concern

### Phase 1 — the landing page (owner: "still needs a lot")
- Hero: copy hierarchy, the pixel title at every width, the studio scene vs the copy column at
  mid widths, the trust list rhythm, the two doors and their hover/active states.
- Story: section order and rhythm, the six feature cards' scenes at phone width, the
  "see it in the demo" links (behaviour once already inside the demo), the three moves, the four
  deep dives' balance and their check-lists, the privacy promise, FAQ anchors from the nav,
  the final call; sticky nav over content on phone; page `<title>`, meta description, favicon.
- Arabic: hero and section titles in the pixel face, line lengths, scene labels.
- Performance: no layout shift while scenes animate; the page on a slow phone.
- Honesty: facts strip still true after every phase (rooms/tools/doors counts).

### Phase 2 — first run: the wizard and the doors
Draft resumability, per-step validation words, employee add/remove, portrait picker, options
step, edit-mode reopen over a live company, AR/phone, the demo door's freshness contract.

### Phase 3 — the shell: topbar, rail, palette, help, statusbar
Search-as-typing and the palette's matches, rail collapsed/expanded labels, notification bell
semantics, the one Help window's completeness against everything added since (REQ-58),
statusbar numbers vs the store, theme/language flip mid-view.

### Phase 4 — team
Roster cards, the profile dialog, the editor's validation, portrait picker, manager tree
legality (one root, no cycles), model connection test words, the history door.

### Phase 5 — tasks
Board and list parity, drag between stages and its undo, the task dialog as the form standard,
filters and search, the four statistics reading the rows, priorities and dates in AR.

### Phase 6 — inbox
The deck navigation, rule letters vs mail letters, approve/reply, the one-pending-reply lock in
words, attachments expanding, the markdown reader's safety, live arrival/closing.

### Phase 7 — comms
The fixed banner and the list beneath it, search filtering, stamps walking sent→delivered→seen,
the batch scheduler's rhythm, composer growth and Enter/Shift+Enter, thread start, local voice
vs provider voice, phone row layout.

### Phase 8 — network
Physics uniformity, drag/zoom/double-click, the tree's one-root truth, RTL (chrome flips, graph
does not mirror), no freeze on long runs, the rings/force layouts, phone.

### Phase 9 — world map
Walks and bubbles and the clock's work/rest words, zoom smoothness and limits, build mode only
under Build, room jump, desk assign, phone fit, reduced-motion.

### Phase 10 — settings and integrations
Palettes and custom accent contrast notes, schedule editor, session export/import/reset, the
integrations desk: GitHub-only rule words, connect/error states, tool chips, token storage
honesty.

### Phase 11 — engine, prompts, providers
The owner's old ask, re-checked: prompts detailed and complete (identity, report contract, tool
guidance, mail etiquette) in both languages; provider error words; tool loop round limits; the
JSON fallback contract; cost/price display coherence; MCP tools in prompts when connected.

### Phase 12 — persistence and privacy
Save version + migration table, export/import round-trip, the demo key lifecycle, IndexedDB
diary size behaviour, the blocked-storage path on every view, "0 servers" promise vs fetches.

### Phase 13 — i18n/RTL completeness
A string inventory: every literal in JSX must be a key; AR quality read aloud; numerals and
dates locale-correct; RTL of new components (stamps, chips, history rows).

### Phase 14 — accessibility and motion
Focus order through every view, visible-but-not-blue focus, aria labels on icon controls,
reduced-motion coverage of every animation added since the first audit.

### Phase 15 — performance and bundle
Chunk sizes against the warning, startup on a cold phone, the diary windowing at 1k rows,
the demo file's weight, preview server cold start.

### Phase 16 — docs and repo hygiene
README vs product drift (again, automatically this time?), ledger entries, prototype drift
checks, gate coverage of everything above, the captures script as a CI artefact.

## Round fourteen fast pass — what was swept before the plan

- No `TODO/FIXME/XXX` anywhere in product code.
- REQ-55/56/57 marked done in `PRODUCT_REQUIREMENTS.md` with their commits; REQ-58/59 ride
  along as obligations.
- `OWNER_COMMENTS.md` carries rounds twelve, thirteen and fourteen verbatim.
- All fourteen screens re-captured and eyeballed (tasks, world, inbox, settings among them) —
  no clipping, no inert control found; the cheap fixes (banner padding, grid alignment, phone
  overflow) were already shipped in rounds eleven/twelve.
- Gates green at the time of writing: verify 11/11, tests 158/158, smoke 107/107, demo 10/10.

Phase 1 (the landing) runs next round, by this protocol.
