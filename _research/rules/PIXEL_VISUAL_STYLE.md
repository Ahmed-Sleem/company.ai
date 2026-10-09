# The Pixel Visual Language — the complete style, extracted and general

> **What this file is:** every visual detail of the pixel style used in this project, written so
> it can be applied to ANY other project. It describes only the look — pixels, sizes, colours,
> shadows, borders, type, icons, motion. It deliberately says nothing about screens, layouts,
> menus or where anything sits. Take these numbers and colours as they are; they are the style.
>
> **How it is organised:** measurements → colour → type → shadows & frames → components' visual
> recipes → icons & pixel art → motion → the screen effect → a copy-paste token block at the end.

---

## 1. The core idea of the style

The look is a **quiet terminal/OS pixel skin**: everything is square, every line is a hard
1-pixel hairline, every shadow is a flat offset block (never blurred, except one deep overlay
shadow), and colour is calm and desaturated. It recalls old operating-system controls without
being loud about it.

The rules that make it read as "pixel":

1. **No rounded corners anywhere.** Border radius is `0` on every element — buttons, inputs,
   badges, dots, dialogs, avatars, images, chips. One token, `--radius: 0px`, and it is applied
   to everything explicitly as well, so nothing inherits a curve from a browser default.
2. **All strokes are hairlines.** The normal border is exactly `1px`. Emphasis is `2px`.
   Never 1.5px, never a gradient border.
3. **Shadows are hard offsets with zero blur**: `2px 2px 0 <colour>`. A pressed control becomes
   `1px 1px 0` or an inset shadow. Blur only ever appears in the one elevation shadow (§7.6).
4. **Pixel art renders unsmoothed**: `image-rendering: pixelated` on images,
   `shape-rendering: crispEdges` on icon SVGs. No anti-aliasing on the art.
5. **Colour is desaturated and dark-leaning.** Accents are pastel-on-dark (sage, sky, lilac,
   straw, rose) and deep-on-light. No neon, no pure white or pure black surfaces.
6. **Everything sits on a 4px spacing grid.** Gaps and paddings are 4, 8, 12, 16, 20, 24, 32, 40.

---

## 2. The measurement system (every raw number, named once)

Every measure exists exactly once as a named token; components only use the names.

### 2.1 Stroke weights

| Token | Value | Used for |
|---|---|---|
| `--app-hair` | `1px` | the normal border: cards, inputs, badges, chips, separators |
| `--app-stroke` | `2px` | emphasis borders: dialogs, pressed marks, the focus ring, active bars |
| `--app-notch` | `3px` | the stepped corner frame on panels (§5.2); also the focus outline offset |
| `--app-track` | `1.6px` | graph/edge line weight (sub-pixel is allowed only on diagonal/animated lines) |
| `--app-stripe` | `6px` | the stripe pitch of progress blocks and the scanline pitch of the CRT overlay |

### 2.2 Spacing (the 4px grid)

`--s1: 4px · --s2: 8px · --s3: 12px · --s4: 16px · --s5: 20px · --s6: 24px · --s8: 32px · --s10: 40px`

### 2.3 Controls & sizing

| Token | Value | Meaning |
|---|---|---|
| `--control` | `34px` | standard control height (buttons, inputs, selects) |
| `--touch` | `48px` | minimum tap target on coarse pointers (both axes) |
| `--radius` | `0px` | everything is square |
| `--sh-item` | `40px` | a standard square touch/list cell |
| `--sh-railitem` | `44px` | a large square control cell |
| `--sh-box` | `25px` | small square swatch/box |
| `--sh-initial` | `32px` | the letter-avatar square |
| `--sh-count` | `18px` | the numeric count chip |
| `--sh-unread` | `5px` | the tiny unread dot |
| `--sh-dotgap` | `6px` | gap between a dot and its word |
| `--sh-icon` | `18px` | every icon's box (see §8) |
| `--sh-search` | `218px` | a standard search field width |
| `--sh-topbar` | `66px` (desktop) / `--sh-topbar-m: 58px` (phone) | chrome bar heights |
| `--sh-rail` | `68px` collapsed / `--sh-nav-mid: 188px` mid / `--nav: 210px` expanded | side rail widths |
| `--sh-railpad` | `12px` | rail inner padding |
| `--sh-brandfont` | `17px` | wordmark size |
| `--sh-fine` | `9px` · `--sh-tiny` | `10px` | the two smallest text sizes (labels under wordmarks, timestamps) |
| `--chip` | `15px` | colour-swatch chip in pickers |
| `--dialog-w` | `700px` max, `--dialog-gap: 32px` side inset, `--dialog-vgap: 48px` | overlay scale |
| `--max` | `1440px` | content column ceiling |
| `--avatar` / `-sm` / `-lg` / `-xl` | `48px / 28px / 84px / 110px` | pixel-portrait sizes |
| `--app-grid` | `16px` | the placement grid pitch when a snap-grid is shown |

### 2.4 Elevation shadow (the only blurred shadow in the system)

`--shadow: 0 24px 80px #0007` (dark) · `0 24px 80px #243b252b` (light). Used under floating
overlays only. Everything else uses hard offset shadows (§5).

---

## 3. Colour

Colour is **role-based**: surfaces from darkest to lightest, two line weights, three text
weights, one accent plus a tint and an on-accent, three semantics. A theme or palette swaps
values only — the roles never change.

### 3.1 Dark (the default)

| Role | Hex | Meaning |
|---|---|---|
| `--bg` | `#111514` | app background — near-black with a green cast; never pure black |
| `--side` | `#141817` | chrome (bars, rails, dialog title bars) |
| `--surface` | `#181d1b` | cards, panels |
| `--raised` | `#1d2320` | raised elements: badges, chips, rows |
| `--hover` | `#232c27` | hover fill |
| `--line` | `#303b34` | borders, separators — the visible edge colour |
| `--soft` | `#252e29` | subtle inner borders, hairlines inside cards |
| `--text` | `#e1e7e1` | primary text — off-white, never `#fff` |
| `--muted` | `#a0aea4` | secondary text |
| `--dim` | `#819388` | smallest text (check contrast when reusing) |
| `--accent` | `#accab3` | sage — primary accent |
| `--accent-bg` | `#253c2d` | accent tint background (selected rows, pressed chips) |
| `--on-accent` | `#14271b` | text drawn on the accent |
| `--danger` | `#efaaa3` | errors, destructive — pastel red |
| `--warning` | `#dfc18b` | pending, caution — pastel straw |
| `--blue` | `#a8c4d6` | info — pastel sky |

The surface ladder always runs `bg → side → surface → raised → hover`, each step slightly
lighter; lines run `soft` (inner) → `line` (edges).

### 3.2 Light

| Role | Hex |
|---|---|
| `--bg` | `#f5f6f1` |
| `--side` | `#ecefe8` |
| `--surface` | `#fcfcf8` |
| `--raised` | `#f0f3eb` |
| `--hover` | `#e9eee4` |
| `--line` | `#c5cec1` |
| `--soft` | `#dfe4da` |
| `--text` | `#26372c` |
| `--muted` | `#5a6b5d` |
| `--dim` | `#526455` |
| `--accent` | `#416f4e` |
| `--accent-bg` | `#e2ecdd` |
| `--on-accent` | `#ffffff` |
| `--danger` | `#a6473d` |
| `--warning` | `#84612c` |
| `--blue` | `#3c6a88` |

Note the pattern: dark themes use **pastel accents on deep tinted backgrounds**; light themes
use **deep accents on pale tints**. Text is never pure black (`#26372c`, a green-tinted ink).

### 3.3 The four alternate palettes (same roles, different hue families)

Each palette exists in both themes. The default palette is the sage of §3.1–3.2.

**Ocean (blue family)**

| Role | Dark | Light |
|---|---|---|
| bg | `#11151b` | `#f3f6fa` |
| side | `#151a22` | `#e9eef5` |
| surface | `#191f28` | `#fbfcfe` |
| raised | `#202833` | `#edf2f8` |
| hover | `#283342` | `#e3ebf5` |
| line | `#364557` | `#c2ccda` |
| soft | `#293340` | `#dae2ed` |
| text | `#e1e7ef` | `#27374c` |
| muted | `#a6b3c3` | `#56697f` |
| dim | `#899bb0` | `#50637a` |
| accent | `#a9c8ec` | `#386292` |
| accent-bg | `#263a52` | `#dfebf9` |
| on-accent | `#152538` | `#ffffff` |

**Violet (lilac family)**

| Role | Dark | Light |
|---|---|---|
| bg | `#16131b` | `#f7f4fa` |
| side | `#1b1721` | `#efeaf4` |
| surface | `#201c27` | `#fdfbff` |
| raised | `#282330` | `#f1ebf8` |
| hover | `#322b3e` | `#eae1f3` |
| line | `#463c53` | `#cfc3dc` |
| soft | `#322b3d` | `#e5daed` |
| text | `#e9e2ef` | `#392c47` |
| muted | `#b7abc5` | `#6c597f` |
| dim | `#a092b0` | `#665375` |
| accent | `#c5b6e8` | `#735091` |
| accent-bg | `#3b2d50` | `#ede2f6` |
| on-accent | `#291b3e` | `#ffffff` |

**Amber (straw family)**

| Role | Dark | Light |
|---|---|---|
| bg | `#191610` | `#faf7ef` |
| side | `#1e1a14` | `#f1ece0` |
| surface | `#242018` | `#fffdf6` |
| raised | `#2c261c` | `#f5efdf` |
| hover | `#352e23` | `#eee5d0` |
| line | `#4b4030` | `#d5c8ac` |
| soft | `#362e22` | `#e8dec8` |
| text | `#eee7d9` | `#413523` |
| muted | `#c0b29a` | `#766346` |
| dim | `#a79980` | `#705d40` |
| accent | `#dfc18b` | `#7c571e` |
| accent-bg | `#463820` | `#f0e3c7` |
| on-accent | `#302210` | `#ffffff` |

**Rose (pink family)**

| Role | Dark | Light |
|---|---|---|
| bg | `#1a1316` | `#fbf4f6` |
| side | `#20171b` | `#f3e9ed` |
| surface | `#271c21` | `#fffafd` |
| raised | `#302329` | `#f7ebf0` |
| hover | `#3b2a31` | `#efdfe6` |
| line | `#503a44` | `#d9c1cb` |
| soft | `#3a2931` | `#ecd9e1` |
| text | `#f0e1e6` | `#492e3a` |
| muted | `#c4aab3` | `#805b6b` |
| dim | `#b0939e` | `#795364` |
| accent | `#e3b0bd` | `#984e6a` |
| accent-bg | `#4a2c38` | `#f5dfe7` |
| on-accent | `#371d28` | `#ffffff` |

### 3.4 How themes and palettes combine

- Theme is an attribute on the root element (`data-theme="light"`); palette is another
  (`data-palette="ocean|violet|amber|rose"`). Absent attributes = dark + default palette.
- Theme blocks and palette blocks have equal specificity — **the palette block is written
  later so it wins** for the tokens they share; the light+palette combination gets its own
  more-specific block (`[data-theme=light][data-palette=…]`).
- A **custom accent** is possible: a picked hex is run through a contrast walk (nudge the
  colour until it is readable on the five surfaces: bg, side, surface, raised, hover), then
  three tokens are written inline: `--accent`, `--accent-bg` (a tint derived from it),
  `--on-accent`. Nothing else changes.
- A scrim behind overlays is `#00000088` (half-black, both themes).

### 3.5 Semantic tone table (one mapping, used everywhere)

Tones map state → role colour, so a state never looks different in two places:

- success/done/active/working → `--accent`
- pending/warning/paused → `--warning`
- error/danger/critical/high priority → `--danger`
- info/neutral-highlight → `--blue`
- inactive/backlog/idle → `--dim` (with `--soft` borders)

---

## 4. Typography

Three faces, strict roles:

1. **Pixel display face** — `Pixelify Sans` (variable, weights 400–700, SIL OFL), fallback
   `ui-monospace, monospace`. Used **only for short labels, never paragraphs**: headings,
   the wordmark, buttons, navigation labels, big numbers, card names. Always weight `500`,
   letter-spacing `0`.
2. **Monospace UI face** — `ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono',
   monospace`. All body text, inputs, tables, metadata.
3. **Body/right-to-left face** — `Arial, Tahoma, sans-serif`. Arabic and long-form body copy
   (the pixel face has no Arabic glyphs — RTL keeps the readable face everywhere).

### 4.1 The size scale

`--xs: 11px · --sm: 12px · --base: 13px · --body: 14px · --lg: 16px · --title: 28px`

plus the fixed micro sizes `10px` (timestamps, task refs) and `9px` (the wordmark's sub-line,
with `letter-spacing: 1.6px`).

Pixel-face sizes where it is used: buttons/nav `13px` (small buttons `12px`), wordmark `17px`,
card names `16px`, thread names `15px`, h2 `18px`, section headings `16px`, dialog titles
`23px`.

### 4.2 Letter-spacing

- Tight mono headings: `-0.7px`
- Eyebrows (the small uppercase line above titles): `+1.4px`, `text-transform: uppercase`,
  size `11px`, colour `--dim`
- The pixel face itself: `0` — never tracked out.

### 4.3 Numeric display

Big numbers (statistics, percentages) use the pixel face at `28px`, `line-height: 1`.

---

## 5. Shadows, borders, frames — the depth language

Depth is **flat and offset**, like old OS chrome. There are exactly five shadow shapes:

### 5.1 Control shadow (buttons, solid chips)

```
box-shadow: 2px 2px 0 var(--line);          /* resting */
```
Hover on a primary: `background: var(--accent); box-shadow: 3px 3px 0 var(--line);`
Press: `transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--line);`
(or, without movement: `box-shadow: inset 1px 1px 0 var(--line);`)
Ghost/borderless variants have no resting shadow; hover gives an **inset edge bar**:
`box-shadow: inset 2px 0 0 var(--line);`

### 5.2 Panel frame — the signature "stepped corner" look

A panel is: `background: var(--surface)` (or `--raised`), `box-shadow: 2px 2px 0 var(--soft)`,
its own border transparent, plus a **pseudo-element frame with notched corners**. The notch is
3px; the frame is drawn as a 1px line whose corners are cut in steps:

```css
.panel { position: relative; box-shadow: 2px 2px 0 var(--soft); border-color: transparent; }
.panel:after {
  content: ''; position: absolute; inset: -1px; pointer-events: none;
  border: 1px solid var(--line);
  clip-path: polygon(
    3px 0, calc(100% - 3px) 0,          /* top edge, corners cut */
    calc(100% - 3px) 3px, 100% 3px,     /* right top step */
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%, 3px 100%,    /* bottom edge */
    3px calc(100% - 3px), 0 calc(100% - 3px),
    0 3px, 3px 3px                      /* left top step */
  );
}
.panel:before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(var(--line), var(--line)) top left     / 3px 3px no-repeat,
    linear-gradient(var(--line), var(--line)) top right    / 3px 3px no-repeat,
    linear-gradient(var(--line), var(--line)) bottom left  / 3px 3px no-repeat,
    linear-gradient(var(--line), var(--line)) bottom right / 3px 3px no-repeat;
}
```

The `:after` draws the hairline frame with its corners stepped; the `:before` stamps four 3×3px
solid corner squares. Together they read as a pixelated window frame. Content is never clipped
by it — it is decoration laid over the panel.

### 5.3 Dialog / window shadow (double offset)

```
border: 2px solid var(--line);
box-shadow: 4px 4px 0 var(--bg), 6px 6px 0 var(--line);
```
Two stacked hard offsets — the first in the page-background colour, the second in the line
colour — a classic two-step window drop. The title bar inside is `--side` with a `2px`
bottom border.

### 5.4 Small floaters (toasts, popovers)

`box-shadow: 3px 3px 0 var(--line);`

### 5.5 Avatars & marks

Pixel portraits and logo marks carry `box-shadow: 2px 2px 0 var(--soft)` (avatars) or
`border-width: 2px; box-shadow: 2px 2px 0 var(--soft)` (the wordmark box).

### 5.6 The one soft shadow

Floating overlays may use the blurred elevation shadow `0 24px 80px #0007`. Nothing smaller
than an overlay ever uses blur.

### 5.7 Focus

```
outline: 2px solid var(--accent); outline-offset: 3px;
```
on every focusable control. Text inputs answer focus with **colour instead of a ring**:
`border-color: var(--accent); background: var(--accent-bg);` and no outline.

### 5.8 Active/selected marks

The selected item in a vertical list is marked by an inset accent bar, not a background change:
`box-shadow: inset 3px 0 0 var(--accent);` (mirrored to `-3px` in RTL). Hover on such items is
the thinner `inset 2px 0 0 var(--line)`.

---

## 6. Component visual recipes (shape only — no placement)

### 6.1 Button

- height `34px`, padding inline `12–16px`, radius `0`
- body font, `13px`; pixel face if it is a label-style button
- default: `background: var(--raised); border: 1px solid var(--line); color: var(--text);
  box-shadow: 2px 2px 0 var(--line);`
- primary: `background: var(--accent); color: var(--on-accent);` hover grows the shadow to
  `3px 3px 0`; active presses in (§5.1)
- danger/outline variants: text+border in `--danger`, no fill
- ghost: transparent, `1px` border `--soft`, no shadow; hover gets the inset bar
- icon-only buttons: a `34px` square, icon centred, ghost styling

### 6.2 Input / select / textarea

- height `34px` (textarea grows), `background: var(--bg)`, `border: 1px solid var(--line)`,
  `color: var(--text)`, radius `0`, monospace `13px`
- placeholder `--dim`; focus = accent border + `--accent-bg` fill (§5.7)
- select arrow: a pixel chevron icon (filled path), never the native chrome

### 6.3 Badge / chip / tag

- inline-block, padding-inline `8px`, `border: 1px solid var(--line)`, `font-size: 12px`,
  `color: var(--muted)`, radius `0`
- tone variants only recolour text+border: accent/warning/danger use their role colour;
  dim uses `--dim` text with `--soft` border
- the count chip (on icons): `18px` wide box, pixel face, accent-on-accent-bg

### 6.4 Status dot

An `8px` **square** (never a circle): accent = active, dim = idle, warning = paused,
danger = error. A tiny `5px` square serves as the unread mark.

### 6.5 Progress meter

A track of `--soft`, filled with **discrete blocks**, not a smooth bar:

```css
background: repeating-linear-gradient(90deg,
  var(--accent) 0, var(--accent) 6px,
  transparent 6px, transparent 8px);
```
6px block, 2px gap (8px pitch). Over-limit meters switch the fill to `--danger` with the same
striping. Small "wave" bars (audio-style decorations) are `3px` wide blocks.

### 6.6 Keyboard key chip (`kbd`)

`border: 1px solid var(--line); background: var(--raised); font: 11px mono; color: var(--muted);
padding-inline: 8px;` — square.

### 6.7 Letter avatar (initial square)

A `32px` square, `background: var(--raised)`, `1px` border `--line`, centred letter in
`--muted`, mono face.

### 6.8 Switch / checkbox

Native checkbox kept (for state announcement), `16px` box, `accent-color: var(--accent)`,
square. It sits beside a two-line label (title `--text`, note `--muted` small).

### 6.9 Scrollbars

Hidden everywhere: `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`.
Scrolling still works; nothing shows a bar.

---

## 7. Icons

- Every icon lives in an **18×18 viewBox** and is drawn as **one filled path** —
  no strokes: `stroke: none; fill: currentColor; shape-rendering: crispEdges;`.
- The paths are pixel-snapped: every segment is axis-aligned rectangles on whole units
  (`M4 2h7v1h-7z` style — 1-unit-tall horizontal runs). That is what makes them read as pixel
  art at small sizes.
- Icons inherit the text colour (`currentColor`) and sit at `18px` in a flex row with a `6px`
  gap before their word.
- An icon next to a word is `aria-hidden`; an icon alone carries its own accessible label.
- To draw a new one: work on an 18×18 grid, keep strokes 1–2 units thick, align to whole
  pixels, close the path, and test at 18px in both themes.

## 8. Pixel portraits (people/character art)

- Drawn on a **48×48 grid** (or 32×32 for the smaller set — the two densities are normalised so
  both read the same at display size).
- Displayed with `image-rendering: pixelated` so enlargement keeps hard squares.
- Display sizes: `28 / 48 / 84 / 110px`; always square, radius `0`, with the
  `2px 2px 0 var(--soft)` offset shadow.

## 9. Motion

Motion is **quiet**: colour and border transitions plus two small entrances. No glows, no
brightness jumps, no travel beyond a few pixels.

- Hover/selection transitions: `background-color, border-color, color` over `100–130ms`.
- Entrance animations use two shared keyframes and three shared tokens:

```css
--anim-fast: 120ms;  --anim-med: 220ms;  --anim-ease: cubic-bezier(0.2, 0.9, 0.3, 1);

@keyframes rise-in { from { opacity: 0; transform: translateY(4px); }
                     to   { opacity: 1; transform: none; } }
@keyframes pop-in  { from { opacity: 0; transform: scale(0.985) translateY(4px); }
                     to   { opacity: 1; transform: none; } }
```
  - content/view changes → `rise-in` at `--anim-med`
  - dialogs, menus, pickers → `pop-in` (`--anim-med` for windows, `--anim-fast` for menus)
  - list items exiting → the same 120–180ms with a short slide out (4px, or a scale to 0.985)
- Camera-style movement (zoom/pan in canvases or graphs) eases a *target*: the view walks
  toward the target each frame with factor ≈ 0.18 — never jumps.
- **Reduced motion**: when `prefers-reduced-motion: reduce`, every transition and animation is
  switched off (`0.001ms !important` / `animation: none`). The style is defined so nothing
  depends on motion to be understood.

## 10. The screen effect (CRT overlay)

One fixed, pointer-transparent layer over everything, `z-index` above content but below dialogs:

```css
.fx-overlay {
  position: fixed; inset: 0; pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg,
      var(--soft) 0 1px, transparent 1px 6px),             /* 1px scanline every 6px */
    radial-gradient(120% 100% at 50% 0%, transparent 55%, var(--bg) 100%); /* vignette */
  mix-blend-mode: overlay;
  opacity: 0.5;   /* 0.45 when motion is allowed */
}
```

It is a toggle (default on). The scanline uses the theme's own `--soft`, so it re-tints with
every palette automatically.

## 11. Accessibility as part of the style (not optional extras)

- Focus ring `2px accent, offset 3px` on every control (§5.7); fields use the colour-focus.
- Touch: on coarse pointers every control grows to `min-height/min-width: 48px`.
- Forced colours: panels fall back to `1px solid CanvasText`, icons to `fill: CanvasText` —
  the shapes must survive with the palette removed.
- The dimmest text (`--dim`) is for 11–12px metadata only; check contrast before reuse.
- Status is never carried by colour alone: every coloured badge also carries its word.

---

## 12. Copy-paste token block

```css
:root {
  color-scheme: dark;

  /* surfaces */
  --bg:#111514; --side:#141817; --surface:#181d1b; --raised:#1d2320; --hover:#232c27;
  /* lines */
  --line:#303b34; --soft:#252e29;
  /* text */
  --text:#e1e7e1; --muted:#a0aea4; --dim:#819388;
  /* accent + semantics */
  --accent:#accab3; --accent-bg:#253c2d; --on-accent:#14271b;
  --danger:#efaaa3; --warning:#dfc18b; --blue:#a8c4d6;
  /* elevation (the only blurred shadow) */
  --shadow:0 24px 80px #0007;
  /* type */
  --pixel:'Pixelify Sans',ui-monospace,monospace;
  --font:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace;
  --sans:Arial,Tahoma,sans-serif;
  --xs:11px; --sm:12px; --base:13px; --body:14px; --lg:16px; --title:28px;
  --track-tight:-0.7px; --track-eyebrow:1.4px;
  /* space (4px grid) */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px; --s8:32px; --s10:40px;
  /* strokes & pixels */
  --app-hair:1px; --app-stroke:2px; --app-notch:3px; --app-track:1.6px; --app-stripe:6px;
  /* shape & control */
  --radius:0px; --control:34px; --touch:48px;
  /* pixel art */
  --sh-icon:18px; --avatar:48px; --avatar-sm:28px; --avatar-lg:84px; --avatar-xl:110px;
  /* motion */
  --anim-fast:120ms; --anim-med:220ms; --anim-ease:cubic-bezier(0.2,0.9,0.3,1);
  /* focus */
  --ring:2px solid var(--accent);
}

:root[data-theme=light] {
  color-scheme: light;
  --bg:#f5f6f1; --side:#ecefe8; --surface:#fcfcf8; --raised:#f0f3eb; --hover:#e9eee4;
  --line:#c5cec1; --soft:#dfe4da;
  --text:#26372c; --muted:#5a6b5d; --dim:#526455;
  --accent:#416f4e; --accent-bg:#e2ecdd; --on-accent:#fff;
  --danger:#a6473d; --warning:#84612c; --blue:#3c6a88;
  --shadow:0 24px 80px #243b252b;
}

/* The pixel skin on top of any palette: */
* { border-radius: 0; }
.icon { stroke:none; fill:currentColor; shape-rendering:crispEdges; }
img.pixel-art { image-rendering: pixelated; }
```

(Alternate palettes: add one `:root[data-palette=…]` block per hue family from §3.3, written
after the theme blocks so they win; light+palette pairs get their own combined selector.)

---

## 13. The short version (the style in ten lines)

1. Square everything; radius 0.
2. Hairline 1px borders (`--line` edges, `--soft` inner); emphasis 2px.
3. Hard offset shadows only: resting `2px 2px 0`, hover `3px 3px 0`, pressed `1px 1px 0` or
   inset; windows get the double `4px/6px`; blur only for big overlays.
4. Panels wear the 3px stepped-corner frame with 3×3 corner squares.
5. Desaturated role colours: 5-step surface ladder, pastel accent on dark / deep accent on
   light; never pure black or white.
6. Pixel face for labels (weight 500, never tracked), mono for UI, Arial/Tahoma for body & RTL.
7. Sizes 11/12/13/14/16/28 on a 4px spacing grid; controls 34px tall, touch 48px.
8. Icons: one filled path on an 18×18 grid, crispEdges; portraits pixelated on 48×48.
9. Motion: 100–130ms colour hovers; 120/220ms rise-in & pop-in with `cubic-bezier(.2,.9,.3,1)`;
   everything off under reduced motion.
10. Optional CRT overlay: 1px scanline per 6px, overlay blend, opacity ≈ 0.5, soft vignette.
