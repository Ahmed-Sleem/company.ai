# Reading the owner's demo — `design/owner-demo/acme-studio-os.html`

Written 2026-10-06, after the owner uploaded the file with: *"i made gui like another demo, with
some extra features, read it, we can borrow things from it."*

This document is the reading. It says **exactly** what is in the file that is not in the designer's
demo, what is worth borrowing, what cannot be borrowed as-is, and what needs the owner's answer
first. `THINGS_DONE.md` records what has actually been built from it.

## 1. What the file is

The designer's demo, **plus** features the owner added. Verified mechanically, not by eye:

| | designer's demo | owner's demo |
|---|---|---|
| Size | 376,864 chars | 607,024 chars (**+230,160, +61 %**) |
| Functions | 96 | 111 (**15 new**, **0 removed**) |
| Nav items | 6 | **7** — `World Map` is new and sits first |
| Portraits | 65 (identical) | 65 (identical) |
| Sprite art | — | **54 SVG `<symbol>` sprites** (new) |
| Icons | designer's own set | **31 pixel icons** (`PIXEL_ICONS`) |
| Colour palettes | dark + light | dark + light **× 6 palette entries** |
| Raw hex colour literals | 700 | **1,179** |
| Raw px lengths | — | **630** |

**Every screen the two files share is byte-identical, function by function** — `teamView`,
`tasksView`, `inboxView`, `commsView`, `networkView`, `settingsView`, plus `head`, `stat`,
`avatar`, `taskCard`, `openDialog`, `applyPrefs`, `save`, `navigate`. That has two consequences, and
both are useful:

1. **Nothing in the owner's demo contradicts our parity lock.** P1.3 (Inbox), P1.4 (Team) and P1.5
   (Settings) stay exactly as planned; there is no re-work.
2. Anything that differs is *additive* — new systems bolted onto the same product — which is why
   this file is a **borrow source**, and the designer's file stays the **parity source**.

## 2. The 15 new functions

`worldView`, `renderWorldCharacters`, `renderWorldProps_legacy` (dead code in their file — superseded
by the sprite renderer), `renderWorldSidebar`, `initWorldNavigation`, `updateWorldTransform`,
`zoomTo`, `bounds`, `spr` (sprite renderer), `add` / `drag` / `step` / `frame` / `items` / `insp`
(build mode).

Plus new systems that are not functions: `PALETTES` / `PALETTE_KEYS` / `paletteSettings()`,
`applyPalette()`, `validHex`, `WB` (the build system), `SPR` + `MIG` (sprite catalogue and a
sprite-rename migration map), `PIXEL_ICONS`, the CRT `fx` overlay, the `forced-colors` stylesheet
block, and four new preferences (`palette`, `customAccent`, `sidebarCollapsed`, `fx`).

## 3. What is borrowable, ranked

### 3.1 Palettes — **borrowed now** (see §6)

Settings → Appearance gains a **Color palette** control: five entries, each working in dark *and*
light. `sage` ("Original sage") is the design's own colour set and needs no overrides at all; the
other four (`ocean`, `violet`, `amber`, `rose`) each restate the same 13 colour tokens.

*Why first:* it is self-contained, it lands in the Settings step already on the plan (P1.5), it has
no licence question, and it is the feature that most visibly makes the product *yours* rather than
the designer's. **Translation needed:** their values are applied by JavaScript (`setProperty` on
`:root`); ours are declared in the token source and applied by one attribute
(`:root[data-palette=…]`), because this project's rule is that colour lives in tokens, not in code.

*Left out deliberately:* their `custom` entry — an arbitrary accent hex with a contrast-corrected
`on-accent` computed by `mixHex` stepping. It is a nice idea and it needs a real contrast rule
(the owner's version walks the hue until small text passes), a colour input, and a decision about
whether a user may put an off-brand colour in a product that ships a locked design vocabulary.
Recorded as **follow-up**, not built.

### 3.2 Pixel icons — **next, cheap**

The owner replaced the icon set with 31 pixel icons drawn as 18×18 SVG paths
(`icon()` → `<svg class="icon pixel-icon" viewBox="0 0 18 18"><path d="…">`). This also closes a
genuine parity gap: the designer's demo draws an icon next to every nav item and in many buttons,
and **our build draws none at all**. Borrowing: extract the 31 paths into a generated module (the
same pattern as the portraits — `scripts/gen-*.mjs` + a drift test against the demo file), add one
`Icon` component, use it in the shell nav and the buttons that have an icon in the demos.

### 3.3 The World Map — **a phase of its own, needs two answers first**

The headline feature: a 1,920 × 1,200 pannable, zoomable plan of the studio, in DOM (divs, SVG
sprites, a CSS transform — *not* a `<canvas>`, which is good news: it keeps text selectable,
keyboard reachable and screen-reader usable).

What it contains, as built by the owner:

- **Seven room jumps** — HQ View, Exec, AI Lab, Design, Ops, Boardroom, Breakroom — each room themed
  and sized on the plan (`TH`, `GRAIN = 2`, `SNAP = 16`).
- **Pan and zoom** — drag with pointer events, `WASD` keys, wheel, `+`/`−`, a zoom preset ladder
  (`.5 · 1 · 2 · 3`), and a "Center" reset (`bounds`, `zoomTo`, `updateWorldTransform`, `cam`).
- **Every agent at a desk** — a portrait, a status dot, a nametag, and a bubble counting their open
  tasks, placed on a desk slot from the room layout.
- **Click a desk → an inspect drawer** — name, role, department, status, budget, skills, that
  person's tasks with progress meters, and two actions (`Profile`, `Message`).
- **A HUD** — top: company, room jumps, search, department filter, zoom, Build, FX, New Task.
  Bottom: **Staff · Working Now · Active Tasks · Monthly Spend**, plus the interaction hints.
- **Search and filter inside the world** — matching staff stay lit, the rest dim.

**Two answers needed before building it:**

1. **Is `World Map` a seventh view, or does it replace `Network`?** The owner's file adds it as a
   seventh item; our `VIEW_IDS` contract has six, and the shell, the four data states, the
   screenshot set and the docs all follow that list. Adding a view is a product decision, not a
   Saturday-afternoon decision.
2. **Where does the furniture artwork come from?** See §4.

**Cost:** it needs a real data model (`rooms`, `desks`, `props` with positions, sizes, themes and a
layout version), a persistence story (their layout lives in `localStorage`, key
`acme.world.layout.v1`) once it is a *product* rather than a demo, RTL handling (a plan does not
mirror like a list does — the camera and the room coordinates need a rule), Arabic strings for
everything, and keyboard access to a space that is inherently spatial. That is a phase, not a step.

### 3.4 Build mode — after the world exists

An editing surface over the world: a palette of rooms/desks/furniture, drag-and-drop onto the plan
with a ghost following the pointer, 16-pixel snapping, click-to-select and inspect, delete,
an undo history, and the layout persisted. It is the most original thing in the file — it turns the
office plan from a picture into *the person's own office*.

It only makes sense once §3.3 exists, and it raises the same licence question about the sprite art.
Recommended as **P3+**, and it is a strong candidate for the product's wedge/differentiator.

### 3.5 Small, safe borrowings

- **`forced-colors` support** — their stylesheet has `@media(forced-colors:active){…}`
  keeping borders and highlights visible. This is on our standing *not checked* list, and it is
  checkable: Playwright can emulate forced colours, so it can be borrowed **and verified**.
- **CRT overlay toggle** (`fx`) — a tasteful pixel-skin decoration behind a preference. Fits the skin
  work in P1.5; small.
- **`sidebarCollapsed`** — a collapsible rail, remembered. Small; note the designer's demo has a
  mobile drawer instead, so this would be an *addition*.

## 4. What cannot be borrowed as-is (and why)

|Item|Problem|What we do|
|---|---|---|
|1,179 raw hex literals, 630 raw px lengths|Our first law is tokens only; the checks in the gate fail on these|Borrow **behaviour, geometry and wording**; express colour and size in our tokens|
|Furniture/prop artwork (54 `<symbol>` sprites)|**No attribution and no licence note in the file.** The names (`sp-desk-modesty-panel`, `sp-counter-reception-curved`, `sp-chair-meeting`) resemble Kenney's *Furniture Kit* (which is CC0), but resemblance is not provenance|**Blocked until the owner says where the art came from.** Then: a row in `THIRD_PARTY.md` + the licence gate. Nothing of it enters the product before that|
|World map strings (`World Map`, `Click Desk to Inspect`, room names, HUD labels, drawer copy)|**English only** — no dictionary entries in their file, so `t()` falls back to the key|Any borrowing ships bilingual from the start (EN + AR) and is RTL-verified, per the standing requirement|
|`custom` accent colour|Arbitrary hex + computed contrast|Follow-up; needs a contrast rule and a product decision, not a copy|

## 5. What the reading changes about the current plan

**Nothing in P1.** P1.3 Inbox, P1.4 Team and P1.5 Settings keep their existing acceptance criteria,
because the owner's file is byte-identical to the designer's on those screens. Two things are added
to P1.5 in the same breath: the **palette control** (borrowed now) and the **icon set** (§3.2), both
landing in Settings and the shell respectively.

The parts of Phase 2 upward that this suggests, for the owner to confirm:

- **A world/build phase** (§3.3 + §3.4) — the natural home is after the worker phase, when agents
  actually *do* things, because a workshop is interesting when the people in it are working: status
  dots, task bubbles and the inspect drawer all have real data behind them at that point.
- **A small "skin" step** (§3.5) — forced-colors, the CRT toggle and the collapsed rail, each with a
  check that can fail.

## 6. Borrow log

|Date|Borrowed|Where it landed|Checked by|
|---|---|---|---|
|2026-10-06|Colour palette system (four presets + the design's own), applied by `[data-palette]` from the token source|`design/tokens/company-os-palettes.json`, `packages/tokens/src/generate.mjs`, `apps/web/src/lib/theme.ts`, Settings → Appearance|`palettes.test.ts` (parity against this file + AA contrast), `palette.test.tsx`, 6 browser checks|
|2026-10-06|The forced-colors handling: free the swatch from the system colours, and mark the chosen option with an outline in the OS's `Highlight`|`apps/web/src/styles/app.css`|2 browser checks with `forcedColors: active`|

Add a row here each time something is taken from the owner's demo, so what came from where is never
a guess. The same discipline as `THIRD_PARTY.md`, for the owner's own work.
