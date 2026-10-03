# 17 — Demo review: “Company OS — Pixel Edition”

**Verdict: suitable — keep it as the base. The style is locked and extracted; the changes below are
edits on top of it, not a redesign.**

| | |
|---|---|
| File | `design/designer-demo/ai-company-os.html` (was `ai-company-os-ready (1).html` in the repo root) |
| Size / shape | 383,911 bytes · 801 lines · one HTML file, everything inline |
| Commit | `aa65c9a` “Add files via upload” |
| Blob SHA-1 | `7dd2e203d713d0d7d13cf3371e27e28b834f79f0` — **recomputed locally, matches the uploaded blob exactly** |
| Title | `Company OS — Pixel Edition` |
| How obtained | The sandbox has no network, so the file was recovered **from the local git object store** (`git cat-file blob aa65c9a:"ai-company-os-ready (1).html"`). It is byte-identical to what GitHub serves. |
| Reviewed | Full source, read directly — every CSS block, every view, every action |

> Note on the review method: an earlier pass read the file through an out-of-sandbox fetch tool in
> 48 chunks. Once the file was recovered locally I re-verified every claim against the real file.
> Two earlier assumptions were **wrong and are corrected here** (see §9 “Verification log”): the
> palette system is not `:nth-child`-based, and the avatar set is 65 portraits, not 49.

---

## 1. Verdict

The demo is a strong, disciplined answer to the brief. It covers every element asked for, it is
genuinely bilingual (EN/AR with real RTL), themeable, keyboard- and screen-reader-aware, and it has
a real visual identity: a calm sage-on-charcoal palette with a pixel/OS skin layered on top.

Four properties make it a safe base:

1. **The skin is a layer, not a rewrite.** The demo says so in its own comment — *“Original palette,
   layout, spacing, data and behavior are unchanged.”* The pixel skin only sets `--radius:0px`,
   swaps fonts, adds hard 2px shadows, stepped corner frames and block meters. Content edits cannot
   break it, and it can be tuned alone.
2. **RTL is structural.** **Zero** `left`/`right`/`margin-left`/`text-align:right` occurrences
   anywhere in the file. Everything uses logical properties (`inset-inline-*`, `border-inline-end`,
   `margin-inline`, `text-align:start`); the mobile drawer mirrors with an explicit `[dir=rtl]`
   transform override. This is the single most important thing to keep.
3. **The palette system is already correct.** Presets live in a `PALETTES` object applied as
   `data-palette` + inline custom properties, per theme; a custom accent is **contrast-checked
   automatically** and reported back (“Adjusted for contrast: #…”). No brittle CSS tricks.
4. **Failure states are designed, not forgotten.** Every data screen can be forced into
   `default / loading / empty / error / restricted` from Settings, and the “Reserved space” panel
   says outright *“No graph is included in this demo.”*

So: keep the style, keep the structure, and change only what is listed in §5.

---

## 2. What the demo actually contains (verified inventory)

**Routes (6):** `team` · `tasks` · `inbox` · `comms` · `network` · `settings` — exactly the six
`*View()` render functions, reachable from the sidebar.

**Shell:** fixed 210px sidebar (collapsible to a 68px icon rail on desktop, with hover tooltips),
66px topbar (breadcrumb, global search, notifications, theme, language, account), a status strip,
native `<dialog>` layer, toast, `role=status` announcer, hidden file input, and a mobile drawer with
scrim below 800px.

**Team** — 4-stat strip; employee roster as a 3-up grid or a dense list (230/1fr/170 columns);
reporting hierarchy; departments; employee profile dialog with tabs (Details / Tasks /
Conversations), monthly budget as `spent / budget`, skills, current focus, pause/resume, edit,
change-avatar, assign task, open conversation; add-employee and add-department forms.

**Tasks** — Board with tabs and a layout switch; **4 fixed stages** `backlog → progress → review →
done`; cards with owner, priority, due, progress meter; task dialog with stage/owner/priority
selects, checklist, files (with a 2 MB upload limit and image type validation), comments and
activity; task form; filters, search, owner filter.

**Inbox** — decision cards with recommendation, confidence, cost and cost-of-delay, plus
approve / reject / ask-a-question / open-request; decision history; notifications dialog; activity
log. `decide()` removes the request, records history, can flip an employee out of `error` back to
`working`, and auto-creates a DM thread when you ask a question (`ensureDM`).

**Conversations** — 240px thread list + chat main; 1:1 and group threads with people and AI;
**visible model selector** (`#model-picker`); composer with attachments (file / image / voice note
with waveform), reply preview, @mention menu, draft persistence; message states
`sending → sent`, plus `failed` with retry and needs-approval styling; voice playback with play/pause
and aria labels; image preview dialog; sample file preview.

**Network** — a single `.reserved` panel: mark `[ · ]`, “Reserved space / Visual network”, and the
line *“This area is reserved for the company network. Its visual design will be explored separately
with the team.”* It is a route with a placeholder — exactly what the brief asked for, nothing more.

**Settings** — Appearance (theme dark/light/system, palette presets + custom accent with contrast
adjustment, sidebar mode), Language, Company profile, Session (export JSON, reset demo), Demo states
(per-screen state preview).

**Assets baked in:** Pixelify Sans WOFF2 (SIL OFL 1.1) as a data URI; **65 pixel-portrait SVG paths
— 49 traced from `Characters.jpeg` on a 48×48 grid and 16 from `1-bit characters 32x32 px.jpeg` on a
32×32 grid**; one voice-note `audio/mpeg` data URI; an inline SVG sample image (`launchImage()`).

**Accessibility & i18n contract (all verified in the file):** bilingual skip link; native
`showModal()` dialogs with `aria-labelledby` and focus restored to the triggering element; live
regions; `aria-current` / `aria-selected` / `aria-pressed`; a 2px accent focus ring with 3px offset;
48px touch targets under `(pointer:coarse)`; hover effects gated behind `(hover:hover)`;
`prefers-reduced-motion` disables all transitions; `forced-colors` fallbacks; `bdi`/`dir=auto` for
mixed content; `Intl.NumberFormat` money that switches to `ar-EG` for Arabic.

**Persistence:** one key, `ai-company-calm-v2` → `{theme, lang, palette, customAccent,
sidebarCollapsed}`, with validation of every stored value on load.

---

## 3. Fidelity against the brief

| Brief group | Status | Notes |
|---|---|---|
| Company / Team — list, hierarchy, departments, full profile, add employee | **Complete** | all four statuses styled (working / idle / paused / error) |
| Tasks & Inbox — board, card, detail, inbox, filters, notifications | **Complete** | the inbox is richer than asked: recommendation, confidence, cost, cost-of-delay |
| Conversations — list, thread, **model selector**, mentions, states, voice notes | **Complete** | model picker is in the composer; failed-send + retry included |
| Reserved network area | **Complete, correctly reserved** | entry point only; the copy says no graph is included |
| App-wide — nav, search, settings, dark+light, AR RTL + EN LTR, mobile, empty/loading/error, keyboard, contrast | **Complete** | loading/empty/error/restricted are first-class and previewable |

Nothing from the brief is missing. The demo adds four things the brief did not ask for — draft
persistence, attachment previews, demo-state previews and export/reset — all useful and all inside
the brief’s spirit.

---

## 4. Style specification — extracted, do not change

Machine-readable: `design/tokens/company-os-pixel.css` and `.json`. Essentials:

- **Dark (default):** bg `#111514` · side `#141817` · surface `#181d1b` · raised `#1d2320` · hover
  `#232c27` · line `#303b34` · soft `#252e29` · text `#e1e7e1` · muted `#a0aea4` · dim `#819388` ·
  accent `#accab3` · accent-bg `#253c2d` · on-accent `#14271b` · danger `#efaaa3` · warning `#dfc18b`
  · blue `#a8c4d6` · shadow `0 24px 80px #0007`.
- **Light:** bg `#f5f6f1` · side `#ecefe8` · surface `#fcfcf8` · raised `#f0f3eb` · hover `#e9eee4` ·
  line `#c5cec1` · soft `#dfe4da` · text `#26372c` · muted `#5a6b5d` · dim `#526455` · accent
  `#416f4e` · accent-bg `#e2ecdd` · on-accent `#fff` · danger `#a6473d` · warning `#84612c` · blue
  `#3c6a88` · shadow `0 24px 80px #243b252b`.
- **Colour means something.** working / sent / done → accent · error / failed / critical → danger ·
  paused / high / approval → warning. Additions reuse these meanings; no new hues.
- **Type:** Pixelify Sans for hierarchy only (h1, h2, brand, stat values, nav items, buttons, tabs,
  employee/thread names, column heads, theme options); mono stack for UI text and numbers; Arial /
  Tahoma for body and **always for Arabic** — the pixel face is suppressed under `lang=ar`, which is
  the right call. Scale 11 / 12 / 13 / 14 / 16 / 28.
- **Shape:** base `--radius:6px`, forced to `0px` by the skin; squared controls; 3px stepped corner
  frames on panels (a decorative `::after`/`::before` frame that never clips content); hard
  `2px 2px 0` shadows, inset when pressed, `3px 3px 0` on primary hover; dialogs get a 2px border
  plus a `4px/6px` double offset shadow.
- **Motion:** 130ms base, chrome transitions at 100ms on colour/border only; **no movement** in the
  skin (pressed = inset shadow); reduced-motion kills everything.
- **Space & size:** 4/8/12/16/20/24/32/40; control 34px; touch 48px; nav 210px (rail 68px, 188px
  between 800–1190px); topbar 66px; content max 1440px.
- **Breakpoints and behaviour:** ≥1650 roster 4-up · ≤1190 nav 188px, roster and board 2-up, chat
  200px, settings 1 column · ≤800 drawer + scrim · ≤540 roster and board 1-up, stats 2-up.

This is coherent, opinionated and shippable. Treat it as the design contract.

---

## 5. Change request — KEEP / EDIT / ADD / REMOVE

### KEEP as-is (the style reference — no changes)
Every colour value and the palette-preset + contrast-adjustment system; the pixel typeface and its
placement rules; stepped panel frames; hard shadows; squared controls; block meters; waveform bars;
motion timings; focus rings; theme/sidebar/language controls; the RTL implementation; the
dialog/toast/live-region layer; the loading/empty/error/restricted state system; all five real pages
plus the reserved Network page and its copy.

### EDIT — small, correctness and polish only (the style never moves)

| # | Where | Change | Why |
|---|---|---|---|
| E1 | Board | Keep **exactly the four stages** `Backlog → In progress → Review → Done`; put “Assigned”, model and run state on the **card**, never as a fifth column | The flow is already right for an AI org; the extra AI information belongs on the card, and a fixed four-stage board is what makes the board readable |
| E2 | Board at 1190–1650px | Two columns produce very wide cards in that band; use three (or cap card width) | Pure layout polish; the collapse rules themselves are correct |
| E3 | Roster/board cards | Add a minimum card width (≈220px) so a narrow desktop never squeezes four-up cards | The grids are `minmax(0,1fr)`, which can shrink below usability before the next breakpoint |
| E4 | Avatar set | The 49 portraits come from a 48×48 grid and the 16 others from a 32×32 grid — at the same rendered size their pixels differ in scale. Normalise to one logical grid (or render the 32-grid art at half size) | Keeps the pixel language consistent; otherwise two avatars side by side look like two different games |
| E5 | Avatar binding | Store the avatar as a stable **id**, and make “avatar” an image contract | Lets real uploaded photos live beside the pixel set without touching layout — the 65 traced portraits are the asset most likely to date |
| E6 | i18n strings | 183 `t('…')` calls plus a single inline dictionary literal; move the strings out of the JS into a resource file, keeping the bilingual pair convention | Translating Arabic must not mean editing code (this is also A1 below) |
| E7 | `--dim` at 11px | Keep `--dim` for non-essential labels only; never for text that carries meaning | `#819388` on `#111514` is borderline at 11px; the light value is safe |
| E8 | Attachment rules | Keep the 2 MB limit and image-type validation, but move both into configuration | Demo-appropriate now, policy-appropriate later |

### ADD — with existing tokens and primitives only

| # | Add | Detail | Why |
|---|---|---|---|
| A1 | Real i18n resource files | Same pair convention (`['en','ar']`), loaded from files instead of an inline dictionary | See E6 |
| A2 | AI fields on the task | `model`, `approval state`, `blocked-by`, `runs / retries`, and a run log on the task detail | The brief asked for owner human/AI; an AI org must also say *which* model and *may I intervene* |
| A3 | Decision-inbox depth | The **policy rule** that triggered the request, a what-changed/diff block, and bulk “approve all in this category” | The inbox is the trust surface; cost and confidence are already there — the rule is what a human actually checks |
| A4 | The network view (when built) | Force-directed graph in the demo’s tokens: employees as square pixel avatars, reporting lines solid, task links dashed; hover highlights, click opens the existing profile panel; **positions persist** | Obsidian’s own lesson (`_research/14`): a force layout that reshuffles on reopen destroys trust. Reuse `.panel`, `.badge`, `.avatar`, `.dot` |
| A5 | Carry the state seam forward | Keep the per-screen `default/loading/empty/error/restricted` override as a first-class product seam | It powers Storybook, tests and demos with zero redesign |
| A6 | Global create action (low priority) | One “+ New” in the topbar (task / employee / thread) | Each page already has its own create buttons; this is only a convenience |

### REMOVE / do not carry into the product
- **The single-file structure** — right for a design review, wrong for the product (no bundling, no
  tests, no i18n tooling, no linting).
- **Inline data URIs** for the font, the avatar paths and the audio — move to real asset files (the
  font is OFL, so embedding is fine legally; it is a build-time problem, not a licence problem).
- **The demo’s simulation semantics** — `setTimeout` flipping `sending → sent`, and messages that
  are only “saved locally”. The demo is honest about it (“No backend. No real approvals, spending,
  or messages.”), which is good; just make sure nothing in the product pretends to be real state.
- **Sample data as anything but fixtures** — the seed objects are excellent fixtures; label them as
  such and keep them out of the domain layer.

---

## 6. Structural flags (the things a static demo always gets away with)

1. **The network area is a route, not a region** — it is a nav item with a reserved panel. That is
   consistent with the brief (“a place and an entry”) and I would keep the nav entry, but its data
   should come from the company/task graph, not a new model of its own.
2. **RTL is clean** — no hard-coded directions anywhere; the drawer mirrors explicitly; logical
   properties throughout. Nothing to rework later.
3. **i18n is embedded** — the only structural debt in the demo (E6/A1). Everything else is
   convention-driven already.
4. **Data model maps to the plan** — agents (status, spend/budget, manager, skills), tasks (stage,
   owner, priority, checklist, files), decisions (recommendation, confidence, cost, cost-of-delay),
   threads (kind, members, model, messages with status) — all fit the domain model in
   `_research/15`. No conflict, and nothing structural was smuggled into a brief that deliberately
   had none.
5. **Behaviour is one delegated action registry** (`ACTIONS`) — a clean seam that maps directly onto
   a real action layer in the app.

---

## 7. Buildability (vs `_research/15`)

The demo forces **no** dependency: it is vanilla HTML/CSS/JS, the tokens are plain CSS variables and
the icons are inline SVG paths, so everything transfers to React Flow + d3-force/PixiJS + shadcn/ui
without rework. Notes:

- Native `<dialog>` + the focus-restore pattern maps to either a shadcn Dialog or native `<dialog>`
  in the product — no preference is forced, keep native.
- The avatar paths can ship as a sprite/component; the font and audio become files.
- The palette presets become CSS-variable swaps in both themes; keep the automatic contrast check.
- Licences: Pixelify Sans SIL OFL 1.1 (embedding and modification allowed); the portraits are the
  project’s own assets (derived from the designer’s sheets); no third-party UI dependency arises
  from the design.

---

## 8. Where the file lives now

```
design/
  designer-demo/
    ai-company-os.html     ← the demo, renamed (no " (1)"), blob sha verified against the upload
    SOURCE.md              ← origin, commit, blob sha, verification
    install.sh             ← re-fetch + verify + wire-up helper (for a session with network)
  tokens/
    company-os-pixel.css   ← tokens + pixel skin, documented (style source of truth)
    company-os-pixel.json  ← machine-readable, same values
  prototype/
    index.html             ← our clickable scaffold (to be re-skinned from tokens/)
  README.md                ← merge protocol, updated
```

The original still exists on `main` as `ai-company-os-ready (1).html`; removing it from the root is a
one-line commit for whoever has push access. **The demo file itself must not be edited** — the style
contract is the tokens, and keeping the demo byte-identical is what makes the style auditable.

---

## 9. Verification log (why some earlier claims changed)

| Claim | Status | Evidence |
|---|---|---|
| Palette presets are brittle `:nth-child` CSS | **Wrong — corrected** | Real mechanism: a `PALETTES` object applied via `data-palette` + inline custom properties per theme, with automatic contrast adjustment and a “Restore original colors” action |
| 65 avatars vs 49 | **Both are right** | 65 entries; 49 on a 48-grid, 16 on a 32-grid |
| Board has 5 columns with unknown names | **Wrong — corrected** | `STAGES=['backlog','progress','review','done']` — four stages, collapsing 2-up at ≤1190 and 1-up at ≤540 |
| No way to open the mobile drawer | **Wrong — corrected** | `.mobile-nav` button exists, shown below 800px; drawer focuses the first nav item and syncs accessibility state |
| Two `decide()` code paths | **Wrong — corrected** | Exactly one `decide(id, verdict, question)`, called from the action registry |
| `scale()` used anywhere | **Not present** | 0 occurrences — no hidden auto-scaling |
| Hard-coded LTR positions | **Not present** | 0 matches for `left` / `right` / `text-align:left|right` |
| Unverified (browser-only) | **Open** | avatar art quality on screen; pixel font legibility at 11–13px |

---

## 10. Open questions for the designer

1. The four stage names — lock `Backlog / In progress / Review / Done`, or rename for an AI org?
2. May the pixel face be used for **numerals** inside Arabic text, or should Arabic keep plain digits?
3. Avatar pixel density: normalise the 48- and 32-grid sets, or keep them as two deliberate sets?
4. How many palette presets should ship beyond the six present + custom?
5. Is 2 MB the intended attachment limit?

---

## 11. The three changes that matter most

**(1)** The style is locked and now lives in `design/tokens/`, so edits cannot drift it. **(2)** The
board keeps its four stages; the AI facts (model, approval, blocked-by, runs) move onto the card.
**(3)** The decision inbox gets the **policy rule that triggered it** — that is where a human decides
whether to trust the machine.
