# What to borrow from your demo — the discussion

Written 2026-10-06, in answer to *"read my new demo then lets discuss what to borrow to our
current gui"*.

The reading itself is in `OWNER_DEMO_READING.md` (what the file contains, what differs from the
designer's demo, what its three liabilities are). **This** document is the decision list: for each
thing in your demo, what it would mean inside the GUI we have today, what it costs, and what I
recommend.

One fact makes all of this simple: **the six screens your demo and the designer's demo share are
byte-identical.** So nothing here replaces anything we have built — every item below is *added*
to the current GUI.

---

## 1. The list, cheapest first

| # | From your demo | What it becomes in our GUI | Cost | My recommendation |
|---|---|---|---|---|
| 1 | **Pixel icons** — 31 paths (`PIXEL_ICONS`, `icon()`) | One `Icon` component + a generated data file; the nav, buttons and stat heads that the demo draws icons on finally get theirs. It also closes a real parity gap: the designer's demo draws an icon on every nav item, we draw none | **Small** — one step | **Do it first.** The world's HUD and drawer use icons everywhere, so this pays for itself twice |
| 2 | **Colour palettes** (`PALETTES`, `applyPalette`) | *Already done and pushed* (`0f62ad9`): five presets, Settings → Appearance, both themes, both languages | done | — |
| 3 | **Custom accent** (the `custom` entry) | A colour input beside the presets. Your version walks the accent's lightness until small text passes contrast — I'd keep that idea and make the rule explicit and tested | **Small/medium** | **Yes — falls into P1 Settings**, with a contrast check that can fail |
| 4 | **World Map** (`worldView` + 14 other functions) | A new screen: the studio floor, pan/zoom, room jumps, a desk per agent, click-to-inspect, the HUD numbers | **Large** — 3–5 steps | **Yes, and adapted from your code**, not rebuilt — see §2 |
| 5 | **Build mode** (`WB`, `add/drag/step/frame/items/insp`) | Editing that floor: drag rooms/furniture onto the plan, 16px snap, select, delete, undo, saved | **Large** — after the world exists | **Yes, right after the world** — but it raises the "who may edit?" question in §4 |
| 6 | **CRT overlay + FX toggle** | A tasteful pixel-skin decoration behind a preference | **Small** | Later (skin step). Low value, low cost — your call |
| 7 | **Collapsible sidebar** (`sidebarCollapsed`) | A remembered rail on desktop; the designer's demo has a mobile drawer instead, so this is an addition, not parity | **Small** | Later (skin step) |
| 8 | **Forced-colors handling** | Already borrowed into the palette work, measured in Chromium, and one item off our standing *not-checked* list | done | Extend to the world when it lands |
| 9 | **The 54 furniture/prop sprites** | The artwork the world (and build mode) draws | — | **Blocked until you send the source** — §3 |

---

## 2. The World Map: adapting your code, not rebuilding it

Your instruction — *"use the current code, borrow it, adapt it to be faster, benefit from the high
quality code"* — is exactly the plan. The port keeps **your algorithms** and changes only what has
to change to be a product instead of a demo.

### What stays yours, as-is

- The room layout model: rooms, desks, props, `TH`, `GRAIN = 2`, `SNAP = 16`, 1920 × 1200 plan.
- The camera math: `bounds`, `zoomTo`, `updateWorldTransform`, the `.5 / 1 / 2 / 3` ladder, the
  "Center" reset, WASD pan, pointer drag, click-a-desk-to-inspect.
- The interaction idea itself: a plan you can walk around in, a drawer that tells you who someone
  is and what they are carrying, and a HUD of Staff / Working Now / Active Tasks / Monthly Spend.

### What changes to become product code

| In your demo | Here | Why |
|---|---|---|
| One big `<script>` building DOM with template strings | A module at `apps/web/src/world/` — the geometry and camera as **pure functions with tests**, the React view on top | Our shell is React; pure functions are what let me test zoom/pan/snap without a browser |
| Data read from `SEED` | Data from the API: the same agents, tasks, decisions and budgets every other screen uses | The plan must not be a picture of the past |
| Layout in `localStorage` (`acme.world.layout.v1`) | Layout in the database, per company | It is company data, not a browser preference — and it has to survive a different machine |
| Colours and sizes written inline (1,179 hex literals, 630 px lengths) | The tokens we already have; the palette work means the plan re-tints with the five palettes for free | Law 1, and it is also what makes the plan themeable |
| English strings only | Both languages from the start, RTL-verified | Standing requirement |
| `innerHTML` re-render of every sprite | `<use href="#sp-…">` reused, off-screen props skipped, transform-only updates | Speed |

### The speed items you asked for

You named smooth wheel-zoom specifically. Concretely, the fixes I have in mind:

1. **Wheel zoom becomes eased, not stepped.** Today a wheel tick jumps the scale; instead the wheel
   moves a *target* and a `requestAnimationFrame` loop eases the current scale toward it
   (exponential smoothing), so a flick of the wheel feels like one continuous motion.
2. **Zoom anchors on the cursor**, not the centre — the point under the pointer stays put, which is
   what makes zooming feel controlled rather than disorienting.
3. **`deltaMode` normalised** (line/page/mouse vs pixel wheels all move the same amount) and the
   wheel listener made `passive` with an explicit `preventDefault` only on the plan surface, so the
   page never fights the browser.
4. **Transform-only rendering**: one `translate3d(...) scale(...)` on a single layer with
   `will-change: transform`, so panning never triggers layout; nothing is re-parented or re-measured.
5. **Layout reads are batched and cached** (plan bounds computed once, not per frame), and pointer
   moves coalesce into one frame via `requestAnimationFrame` plus pointer capture.
6. **`touch-action: none`** on the plan so touch drags don't scroll the page, and the shortcuts
   (arrows pan, `+`/`−` zoom, `Home` centres) work from the keyboard.

Each of these is measurable, so each gets a check rather than a claim: the zoom smoothing and
cursor-anchoring are both assertable in the browser, and the frame cost is observable.

### Two decisions inside the port I need from you

- **A seventh nav item, or replace Network?** Your demo adds `World Map` as a seventh item and
  keeps `Network`. Our nav has six, and the shell, the four data states, the screenshot set and the
  docs all follow that list. Adding a seventh is a product decision, so: **add it** (my
  recommendation — it is your headline feature and Network is a different idea), or fold the world
  into the existing Network view?
- **RTL**: a floor plan should not mirror like a list does — walking "right" in the plan is the
  same room whether you read Arabic or English. So the *plan* keeps its orientation and only the
  chrome (HUD, drawer, sidebar) flips. Say the word if you want the plan mirrored too.

---

## 3. The artwork — the one thing I cannot decide for you

You said: *"i get them from online… they was free."* Free is where the risk lives: "free" packs are
sometimes CC0 (usable anywhere) and sometimes "free for personal use" (not usable in a product).
Our repo has a licence gate for exactly this, and I will not bend it — a licence problem found after
launch is the kind of thing that never goes away cheaply.

**What to send me:** the pack's name, or the page you downloaded it from (a link is perfect).

Then I check it against the gate, add the row to `THIRD_PARTY.md`, and your sprites go in as they are.

**Meanwhile the world is not blocked:** I will build it with the plans and furniture as
token-built placeholder shapes (tinted plates, simple desks, plants as code) and swap your sprites in
the moment the licence is confirmed. The world's logic does not depend on which art draws it — the
swap is a one-line lookup.

---

## 4. The other question I need answered: who may edit the floor?

Build mode is the most original thing in your demo — it turns the office from a picture into *the
team's own office*. In a product it needs one rule before I write it: **who is allowed to move the
furniture?**

- **Only the owner** (one person, everyone else sees the result) — simplest, safest, my
  recommendation for the first cut.
- **Any human member** — collaborative, needs conflict handling ("Amir moved this desk while you
  were dragging it").
- **A versioned history** like decisions have (proposed → approved), reusing the inbox you already
  have — the most "company OS" answer, and the most work.

---

## 5. The order I recommend, for you to change

| Step | What | Size |
|---|---|---|
| 1 | **Pixel icons** — one step, unlocks the world's HUD | small |
| 2 | **World Map** — your code, ported and made faster (3–5 steps: geometry + camera → render + interaction → HUD + drawer → languages, RTL, persistence → polish and perf checks) | large |
| 3 | **Inbox, Team, Settings** — the P1 screens that were already planned; they are byte-identical between the two demos, so nothing about the world changes them. Settings gains the custom accent | 3 steps |
| 4 | **Build mode** — on top of the world, with the editing rule from §4 | large |
| 5 | **Skin step** — CRT/FX toggle, collapsible rail | small |

If you would rather have the world *after* the P1 screens, say so and I will swap steps 2 and 3 —
your "now" is noted, which is why I put it first.

---

## What I need back from you

1. **The order** — mine as written, or the world last?
2. **A seventh nav item** for the World Map — yes or no?
3. **The art pack's name or link.**
4. **Who may edit the floor** in build mode.

Answer any subset and I start on the rest; every answer I get, I work to immediately and push.
