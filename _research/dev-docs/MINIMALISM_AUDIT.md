# Minimalism audit — what to shrink, what to merge, what should live in Settings

*Written 2026-10-06 for the owner to choose from. **Nothing in this list is built.** Each item has a
number; reply with the numbers you want (or "all of A", "not B4") and that becomes the next batch.
The last verified demo is `demo/company-os-demo.html` — open it, judge what is there now, and read
this list against it.*

## How this was measured

Not from memory: a script drove the built app in the demo file at 1440 × 900, on the defaults the
owner asked for (dark, English, rail collapsed, screen effect on), and counted what is actually on
each screen.

| Screen | Controls on it | Words | What the controls are |
| --- | --- | --- | --- |
| Team | 3 | 50 | 2 of them are the theme and language buttons |
| Tasks | **19** | 63 | 4 stat cards · search · 2 selects · Board/List · 10 cards … |
| Inbox | 9 | 94 | 6 × Approve/Reject · theme · language |
| Conversations | 3 | 20 | theme, language, nothing else yet |
| Network | 3 | 21 | theme, language |
| World Map | **29** | 92 | 6 room chips · whole plan · Build · zoom-out/％/zoom-in · 16 desks |
| Settings | 11 | 63 | 6 palette cards · 2 switches · model rows |
| Shell | 7 + 2 | — | seven nav items, plus theme and language in the top bar |

So: **77 controls across seven screens**, and two screens carry most of them. That is where the
reductions are worth the effort.

---

## A — Shell and chrome (always on screen, so every cut is felt everywhere)

**A1. Move the theme and language buttons out of the top bar, into Settings.**
Now: `dark` and `العربية` sit top-right on every screen — 2 always-visible controls that get used
rarely. Change: they become two rows in Settings, next to the palette and the two owner switches;
the top bar keeps the mark and nothing else. Saving: 2 controls on every screen, and one honest
place where every appearance choice lives. Risk: switching language to judge RTL takes three clicks
instead of one — I would keep a keyboard shortcut (`⌥/`) and say so in Settings.

**A2. One title per screen.**
Now a screen says its name three times: the nav label, an eyebrow (`TASKS / OVERVIEW`), the panel
title (`Tasks`) and then a second headline (`Work, moving forward.`) plus a note. Change: **page
title + one note line**. Saving: one full line per screen and a lot of repetition. Risk: low — but
it touches the designer's markup, so it must be re-checked against the designer demo.

**A3. The status bar becomes part of Settings.**
Now the bottom strip repeats `Acme Studio · Live · company.os 0.1.0-p0` permanently — the company
name is already in Settings, and the version is reference data. Change: show the strip **only when
something is wrong** (offline, API down); the normal facts move to Settings → About. Saving: 28 px
of every screen. Risk: low.

**A4. Collapsed rail keeps its labels on hover.**
Now (rail collapsed by default, as asked) an icon gives no name unless clicked. Change: a hover
tooltip with the item's name, so nobody has to expand the rail to read it. Cost: small. This is the
one item here that *adds* rather than removes — it is what makes the collapsed default comfortable.

## B — Tasks (the busiest screen)

**B1. Delete the four stat cards.**
They repeat the four column headers underneath, with the same numbers: `Open tasks 8` ↔ `backlog 2 /
progress 4 / review 2 / done 2`. Two places, one truth. Change: keep the columns. Saving: 4 boxes,
8 numbers, ~96 px. Risk: none functionally — the counts stay visible where they belong.

**B2. Give the columns one vocabulary** (after B1).
The cards say "Open tasks / In progress / In review / Completed"; the columns say `backlog`,
`progress`, `review`, `done` — machine words. Change: columns take the cards' words. Saving: reading
effort, not pixels. Risk: none (the stage keys stay in the data and the API).

**B3. Put the three filters behind one chip.**
Now search + priority + owner are always on screen (3 controls) on a board where most visits use
none of them. Change: one `Filter` chip that opens the three; active filters show as removable chips.
Saving: 3 controls → 0 when unused. Risk: filtering gets one click slower; worth it.

**B4. Make the cards shorter.**
Now every card carries ref, priority, title, avatar, owner, due date and a full-width progress bar.
Change: the card keeps **ref · title · owner · priority**; the due date and the progress bar move to
the task dialog (where the numbers are already listed). Saving: about 40 % of card height — one more
card per column on a laptop screen. Risk: progress is no longer visible from the board; if that
matters, keep the bar only for `in progress`.

**B5. A density switch, so "smaller" is a choice and not a rewrite.**
Now every card, panel and stat uses one padding and one type size, tuned for a large screen. Change:
`Compact / Comfortable` in Settings, shrinking card padding and the small type by one step without
changing any layout. Saving: roughly a quarter of the board's height on a laptop. Risk: two spacing
scales to keep honest — it must be tokens (it is: every gap and size already comes from a variable),
never per-component overrides.

*(The `Board | List` pair needs nothing — it is already one segmented control.)*

## C — World Map (29 controls, the heaviest screen)

**C1. Six room chips → one "Jump to room" select.**
Now the HUD carries six full-width buttons (`Executive Wing`, `AI Core & Engineering Lab`,
`Boardroom`, `Design & Product Atelier`, `Operations & Growth`, `Breakroom & Lounge`) plus "Whole
plan". Change: one select listing the rooms + "Whole plan". Saving: 7 controls → 1, and the top row
stops wrapping on a small screen. Risk: the room names are then one click deep; the names still show
inside the plan itself.

**C2. Build mode's three controls → one toggle.**
Now `Build`, `Undo`, `Start again` sit permanently in the HUD. Change: `Build` stays; `Undo` and
`Start again` move into a small `⋯` menu that only exists while Build is on, with the hint text
shown as a one-line status inside the plan. Saving: 2 controls when not building. Risk: low.

**C3. Zoom controls to a corner.** 
Now `−  100%  +` sits in the middle of the top row. Change: a small floating cluster in the plan's
bottom-right corner (where zoom controls belong on maps), keeping `0`/`+`/`−` keys. Saving: 3 items
out of the row that C1 and C2 are also shortening.

**C4. Let the plan go quiet as you zoom out.**
Now every room shows its name *and* its sub-line (`Leadership & Strategy`), and every desk shows
avatar + name + status dot + task count. Change: below 100 % zoom, rooms show the name only and
desks show avatar + status dot; the detail returns as you zoom in. Saving: a lot of visual noise at
the scale the plan is usually read at. Risk: none — it is the same information, revealed by zoom.

**C5. The four-number HUD (Staff · Working now · Active tasks · Monthly spend).**
This is the only place those four numbers live together, so I would **keep it** — but it can become
one line in the panel header instead of a strip across the plan. Your call: keep (recommended) or
move.

## D — Settings

**D1. Palette presets: six cards → one row of swatches.**
Now six full-width labelled cards fill two rows (~150 px). Change: six small swatches in one row,
with the name shown on the selected one and read out to screen readers on all of them; the custom
colour input sits inline at the end. Saving: ~110 px and a much calmer page. Risk: names are one
hover away instead of always visible.

**D2. Order Settings by what people change.**
Now: Company · Models · Color palette · Appearance. Change: **Appearance first** (palette, theme,
language, the two switches — everything A1 adds), then Company, then Models last as reference data.
Saving: no pixels, less scrolling for the common case.

**D3. Say "local · free", not two `$0.00 per 1M tokens`.**
The local model's price row is two zeroes that look like missing data. Change: one phrase.

**D4. One note for the Appearance switches, not one each.**
Now each switch carries its own second line of small text, and the switch's own label already says
what it does. Change: one shared line under the group. Saving: 2 lines of text.

## E — Inbox

**E1. Batch decisions.**
Now each of the three cards carries `Approve` and `Reject` — six buttons for one screen. Change:
checkboxes + one action bar (`Approve 2 · Reject 1`), the way a real inbox works, with single-card
actions still in the card's own dialog. Saving: 6 controls → 2. Risk: bulk approval needs the
undo/confirmation the borrow note already asked for.

**E2. The card shows the ask; the detail goes behind "Details".**
Now every card prints raiser, role, cost, risk and the ask at once. Change: card = **who + what
they want + the two buttons**; the rest opens in the dialog that already exists. Saving: ~half the
card height, three times. Risk: the owner loses at-a-glance context — mitigate by keeping the cost
on the card (it is the thing he caps).

## F — Bigger merges (decide separately; each touches the locked design)

**F1. Merge Network into Team.** Team is a grid of 8 people; Network is a tree of the same 8 people.
Change: Team gains a `Cards | Chart` switch; the Network nav item goes. Saving: one nav item (7 → 6)
and one screen to maintain. Risk: **the designer's demo has six views and the contract test locks
that** — this is a change to the locked shell, so it needs your explicit yes, and the designer file
must stay untouched.

**F2. Plan for Conversations + Inbox to become one "Messages" screen with two tabs.**
Conversations is nearly empty today; when messaging lands, one screen with `Inbox | Threads` is
tidier than two nav items that both mean "things waiting for attention". Not now — a note for when
messaging is built.

## G — What I would not cut (so the list above doesn't read as a purge)

- the four data states on every region (they are the product's honesty);
- RTL and the two themes, and the contrast walking on the custom accent;
- the desk drawer, the keyboard control of the plan, and the visible Build-mode verbs;
- the pixel type and the screen effect — the character is the product; the cuts above are about
  **size and repetition**, not about the look;
- the drift locks (icons/plan against your demo) and the browser checks.

## H — Suggested first batch (all small, no data changes)

**A2 · A3 · B1+B2 · B5 · C1 · C2 · D1 · D4** — eight items, none of which touches the API, the
schema or the four-state contract, and each of which I can lock with one or two new browser checks.
If you would rather see one screen fixed properly first, the honest answer is **C (World Map)**:
it is the heaviest, and C1–C4 together take it from 29 controls to about 14.
