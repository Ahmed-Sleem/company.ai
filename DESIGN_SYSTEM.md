# Cyrkil — Design System & Engineering Style Guide

> **Audience:** Any developer working on Cyrkil.
> **Status:** Authoritative reference. Every UI change MUST follow this document. If a primitive is missing, build it BEFORE you reach for inline classes.
> **Last revised:** 2026-06-18

---

## 1. Design philosophy

Cyrkil's visual language is **minimal, calm, IDE-grade**. Inspirations: VS Code 2026, Linear, Notion, Photoshop 2026. We avoid:

- ❌ Gradient buttons, neon accents, marketing-style polish
- ❌ Inconsistent spacing — every gap snaps to the 4-px grid
- ❌ Bespoke one-off components — if it's used twice, it's a primitive
- ❌ Visible scrollbars on dense interior surfaces
- ❌ Hard shadows; we use **glass surfaces** + subtle elevation

We aim for:

- ✅ A pixel-stable interface — no jumps when state changes (loading → loaded, hover, focus)
- ✅ The same component is the same size, the same color, the same hover everywhere
- ✅ Adaptive at every viewport size and every browser zoom level
- ✅ Token-driven theming — switching themes never breaks any component
- ✅ Two visual hierarchies max in any one screen — primary action, secondary action

### 1.1 Form ↔ Function Integrity (core principle)

> **What the user sees and what the code does must be the same thing. No mockup over broken structure. No visual fakery.**

Rules:

1. **If it appears clickable, it IS clickable.** A real button element, not a div with `onClick`.
2. **If two elements appear at the same level, they ARE siblings in the DOM at that level.** No absolutely-positioned overlays pretending to be row siblings.
3. **If a layer appears to be on top of another layer, it IS rendered above it via the layering system (§1.2)** — not faked via tricks.
4. **If something is disabled, it carries `disabled`** — not just greyed-out CSS.
5. **Never use `transform: translate(...)` to move things into "looking right" positions when flex/grid can express it natively.** Translates lie to keyboard nav, screen readers, and the focus order.
6. **Build it pretty in the real DOM.** Don't paint over ugly structure with cosmetic patches.

The user is never fooled. The browser inspector is never confusing.

### 1.2 The Layering Principle (core principle)

> **The GUI is built around layers. Each elevated thing chooses a layer. Things on the same layer have colliders — they cannot overlap. Layers can stack infinitely.**

The canonical scale lives in `packages/ui/src/layers.ts`:

| Layer | Name         | What lives here                                                            |
| ----- | ------------ | -------------------------------------------------------------------------- |
| 0     | `background` | Decorative paint, never interactive. (`.mesh`, body bg.)                   |
| 10    | `canvas`     | Chrome panes that fill the viewport. (Sidebar, main content, chat thread.) |
| 20    | `rail`       | Vertical edge rails overlaid on canvas. (Activity bar.)                    |
| 30    | `header`     | Horizontal headers overlaid on canvas. (Top bar, tab strip.)               |
| 40    | `overlay`    | Dropdowns, popovers, tooltips, inline menus.                               |
| 50    | `dialog`     | Modal dialogs with backdrop. (Settings, palette, switch-chat.)             |
| 60    | `drawer`     | Edge sheets that slide in. (Mobile history drawer.)                        |
| 70    | `toast`      | Transient notifications. (Toaster.)                                        |
| 80    | `system`     | Critical system overlays. (Offline indicator.)                             |
| 90    | `onboarding` | First-launch tours. (Mobile onboarding.)                                   |

Rules:

1. **No element may overlap another element on the same layer.** Layout (flex/grid) provides the colliders — siblings push each other, they don't stack.
2. **Going up a layer is always intentional and traceable.** A new `Z.dialog` mount means there's a dialog. A reader of the code knows immediately what kind of UI is appearing.
3. **No random `z-[200]` or `z-30 relative` half-decisions.** Every elevated element imports from `Z`.
4. **Adaptivity has a floor.** When the viewport shrinks past the point where layers can fit without overlap, the layout collapses into a different mode (e.g., desktop shell → mobile shell at ≤ 768 px). It never lets siblings overlap.
5. **The chrome retains its glass / subtle transparency.** This is a non-negotiable visual identity.

Use it like this:

```tsx
import { Z } from "@cyrkil/ui";

<div style={{ zIndex: Z.dialog }} className="fixed inset-0">
  …
</div>;
```

In CSS:

```css
.toast {
  z-index: var(--z-toast);
}
```

The Tailwind `z-50` / `z-[200]` patterns are forbidden in new code. Existing code is being migrated.

### 1.3 Surface taxonomy (no floating modals)

Cyrkil has THREE surface tiers. Every new UI element MUST pick one. There is no fourth option.

| Tier | Pattern | When to use | Examples |
|---|---|---|---|
| **Tab** | Real workspace tab in the tab strip | Anything the user spends more than 5 seconds in | Settings, Profile, File previews (PDF / image / markdown), Editor |
| **Anchored popover** | Small floating box anchored to its trigger | Quick contextual menus and tiny forms (≤ 3 fields) | Tab `+` menu, file Rename, file context menu, conversation context menu, command palette |
| **Inline** | UI changes in place, no new layer | Field validation, dirty indicators, hover affordances, toasts | Tab close X, attach chip remove, dirty dot, toaster, audit row time |

**Forbidden:** floating modal dialogs (centered, dim-the-world). The `<Dialog>` primitive remains in `@cyrkil/ui` ONLY for the command palette (which is a productivity-tier picker, not a workspace) and for the rare blocking confirmation (e.g., delete confirm). NEW UI should never introduce dialogs.

When in doubt: pick `Tab`. Tabs respect the user's workspace; modals interrupt it.

### 1.4 Conditional affordances per file type

The FileToolbar shows the SAME action set for every file. Actions that don't apply to that file type are rendered **disabled** (`aria-disabled`, dimmed), never hidden. The user learns the full vocabulary once; the disabled state communicates "this exists but doesn't apply here".

The applicability matrix is centralized in `apps/web/lib/file-actions.ts` and consumed by the toolbar. Adding a new file type or a new action = edit one table.

### 1.5 Central Control (single source of truth)

> **Every visual, behavioural, or copy decision lives in EXACTLY ONE place. Change it once → it changes everywhere it appears. If two pieces of the UI ever drift out of sync, that's the bug — not a "consistency" miss.**

This is the principle that ties together the token system (§2), the primitives (§3), the layering scale (§1.2), the surface taxonomy (§1.3), and the action matrix (§1.4). It also extends to:

| Decision domain | Single source of truth | Forbidden duplication |
|---|---|---|
| Colours / surfaces | `packages/themes/themes/*.json` (→ CSS vars → Tailwind utilities) | Inline `#hex`, `rgb()`, `bg-white`, `bg-black` |
| Spacing / radii / control sizes / icon sizes / type scale / motion | `apps/web/app/globals.css` `:root` tokens (→ Tailwind utilities) | `pt-3.5`, `gap-1.5`, `h-[420px]`, `text-[12.5px]`, `tracking-[0.06em]`, `leading-[1.7]` |
| Z-index | `packages/ui/src/layers.ts` `Z.*` (mirrored as `--z-*`) | `z-[70]`, `z-[200]`, `z-50`, `z-30 relative` |
| Shadow recipes | `--shadow-elevated`, `--glass-shadow` in `globals.css` (themed in JSON when they need to flip) | `shadow-[0_1px_2px_rgba(0,0,0,0.18)]` |
| Backdrop blur radii | `--blur-thin`, `--blur-glass` tokens | `backdrop-blur-[4px]`, `backdrop-blur-[20px]`, `backdrop-blur-[24px]` |
| Editor / terminal palette | Theme JSON `tokens` + `syntax` blocks, passed to Monaco/xterm **as objects** | Reading CSS vars via `getComputedStyle` during a theme flip (race) |
| Tab visuals | `apps/web/components/shell/tab-strip.tsx` `paneBgFor()` + `<TabHead>` | Per-route or per-pane custom tab chrome |
| File ext badge | `<FileBadge ext={...} />` primitive | Ad-hoc `<span ... font-mono text-2xs>` re-renders of the badge shape |
| Keyboard shortcut hint look | `<Kbd>` primitive | Inline `<span className="font-mono text-2xs text-text-muted tracking-wider">⌘K</span>` |
| Section header look (mini-uppercase) | `<SectionLabel>` primitive | Hand-rolled copies of `text-2xs font-medium uppercase tracking-[0.06em] text-text-muted` |
| Settings / Profile / file previews | One tab kind, mounted by the tab strip | Modal dialogs |
| Rename / context menus / quick prompts | `<Popover>` primitive | Modal Dialog or `window.prompt` |
| Confirmation prompts (delete, sign-out) | `<ConfirmPopover>` anchored to the trigger | `window.confirm`, `window.alert`, native `<dialog>` |
| User-facing copy | `apps/web/lib/i18n/locales/en-US.ts` + `useT()` | String literals scattered through component JSX |
| File-type capability matrix (Run / Preview / Rename …) | `apps/web/lib/file-actions.ts` | Per-file `if (ext === "py") { … }` branches in components |
| Mock terminal command behaviour | `apps/web/stores/sandbox-store.ts` `exec()` | Per-component fake-output strings |

#### Rules

1. **If a value or behaviour appears in two places, refactor BEFORE shipping.** The third occurrence isn't allowed.
2. **No `getComputedStyle`-derived theming.** If a non-DOM consumer (Monaco, xterm, canvas, an SVG generator) needs token values, it receives the theme object as a prop / hook return, never reads it back from the document. CSS variables are the channel for CSS-aware consumers ONLY.
3. **No duplicated dialog / popup / tab patterns.** New "small floating thing" → `<Popover>`. New "full workspace surface" → tab kind in `shell-store.ts` + dispatcher case in `app/app/page.tsx`. No ad-hoc Radix Dialog mounts in feature files.
4. **No native browser modals.** `window.confirm`, `window.alert`, `window.prompt`, `<dialog>` are forbidden in `apps/web/**`. ESLint enforces.
5. **No inline component look-alikes.** If a `<button>` / `<div role="button">` / raw `<input>` carries layout classes that recreate the look of an existing primitive (IconButton, RowAction, Button, Search, Kbd, FileBadge…), use the primitive — extend it if the variant doesn't exist yet.
6. **No magic numbers in component files.** Every length, colour, blur, shadow, z-index, font-weight must come from a token. Arbitrary-value Tailwind brackets (`-[12px]`, `-[#fff]`, `-[1.7]`) are a code smell and trigger review.
7. **One mock, many call sites.** When a feature needs fake data or fake behaviour, it lives in the store that owns it. Components consume it; they don't recreate it.

#### Why this matters

- **The user can change a theme value once and see it everywhere instantly.** That's the contract.
- **The next developer can grep `Z.dialog` and find every dialog.** They can grep `<FileBadge` and find every file badge. They can edit `file-actions.ts` and update every toolbar.
- **Visual drift is detectable.** Two screens show subtly different shades of grey → a token is being bypassed somewhere → ESLint catches it (or PR review does).
- **Refactors are local.** Renaming the "Activity log" sidebar context = edit one i18n key. Changing the Send button colour = edit one variant in `button.tsx`. Nothing else moves.

#### Anti-examples (real instances of central-control violations found in audit)

- `defineCyrkilThemes(monaco)` reading `getComputedStyle(document.documentElement).getPropertyValue('--pane')` instead of receiving `theme.tokens.pane` directly → race condition, Monaco crash on theme flip.
- `readThemePalette()` in `terminal-impl.tsx` reading `--canvas` while the editor reads `--pane` → terminal and editor diverge.
- Five copies of the mini-uppercase section header pattern (`sidebar-chat`, `sidebar-files`, `command-palette`, `settings-dialog`, `profile/page`) — no `<SectionLabel>` primitive.
- File ext badge `<span ... font-mono text-2xs font-semibold>` inlined in `sidebar-files.tsx`.
- `window.confirm("Delete? …")` called from three places (sidebar-chat, sidebar-audit, file-toolbar) — three slightly-different copy strings, all raw English, none in i18n.
- `--shadow-elevated: 0 6px 20px rgba(0,0,0,0.18)` defined in `globals.css` with a hardcoded rgba that doesn't flip for light theme.
- `useT()` defined and exported but consumed 0 times — 100 % of user-facing copy is hardcoded.
- Mobile tab bar uses `style={{ transform: "translateY(28px)" }}` to nudge the active-tab underline into place — bypasses grid/flex.
- PreviewPane mounts Back / Forward / Open-in-tab `<IconButton>`s with no `onClick` — fake controls.

These are the patterns Central Control exists to prevent.

---

## 2. The token system (single source of truth)

### 2.1 Color tokens

All color values live in **JSON theme files** under `packages/themes/themes/`. NEVER inline a hex code, `rgb()`, or `hsl()` outside those JSON files. The ESLint rule `no-restricted-syntax` enforces this in `apps/web/**`.

Theme tokens (defined per theme):

| Token                          | Use                                                                 |
| ------------------------------ | ------------------------------------------------------------------- |
| `canvas`                       | App background. Lowest surface.                                     |
| `canvas-2`                     | Slightly elevated canvas (terminal background, code blocks).        |
| `pane`                         | Primary surface for content panels (sidebar interior, chat thread). |
| `pane-2`                       | Secondary surface (cards, composer interior, dialog body).          |
| `pane-3`                       | Tertiary / recessed surface (input wells, recessed strips).         |
| `glass-1`                      | Translucent surface, top-most (top bar, activity bar).              |
| `glass-2`                      | Translucent surface, middle (sidebar, dropdowns).                   |
| `glass-3`                      | Translucent surface, deepest (dialogs, popovers).                   |
| `glass-edge` / `glass-edge-2`  | Hairline highlights on glass surfaces.                              |
| `glass-shadow`                 | Composite shadow for glass surfaces.                                |
| `border`                       | Default hairline border.                                            |
| `border-strong`                | Emphasized hairline (dialogs, primary controls).                    |
| `border-soft`                  | Muted hairline (interior dividers).                                 |
| `text`                         | Primary text.                                                       |
| `text-2`                       | Secondary text.                                                     |
| `text-3`                       | Tertiary text.                                                      |
| `text-muted`                   | Disabled / placeholder text.                                        |
| `accent`                       | Brand accent. Same family as `text` (low chroma).                   |
| `accent-soft`                  | Background tint for accent states (selected, focused).              |
| `ok` / `warn` / `err` / `info` | Status colors. Use only for status, never decoration.               |
| `tint-active`                  | Hover/selected backgrounds (very subtle).                           |
| `tint-hover`                   | Hover background (between transparent and active).                  |
| `mesh-1` / `mesh-2`            | Background gradient blobs.                                          |

### 2.2 Spacing scale (4-px grid)

In `globals.css`:

```css
--s-1: 4px;
--s-2: 8px;
--s-3: 12px;
--s-4: 16px;
--s-5: 20px;
--s-6: 24px;
--s-8: 32px;
--s-10: 40px;
--s-12: 48px;
```

Use Tailwind's `p-1` (4px), `p-2` (8px), etc. NEVER `pt-3.5`, `gap-1.5`, etc.

### 2.3 Radius scale

```css
--r-xs: 6px; /* chips, inline buttons */
--r-sm: 8px; /* rows, search boxes, default buttons */
--r-md: 10px; /* cards, dropdowns */
--r-lg: 14px; /* dialogs */
--r-xl: 18px; /* (reserved, currently unused) */
```

Tailwind utilities: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full` (avatars + dots only).

### 2.4 Control heights

```css
--ctl-xs: 24px; /* rows, dense inline controls */
--ctl-sm: 28px; /* compact buttons, search bars */
--ctl-md: 32px; /* default buttons, sidebar primary action */
--ctl-lg: 40px; /* auth screens, primary CTAs */
--tap-min: 44px; /* mobile minimum tap target */
```

### 2.5 Icon sizes

```css
--icon-xs: 12px; /* row actions, dense inline */
--icon-sm: 14px; /* default IconButton */
--icon-md: 16px; /* toolbar, top bar */
--icon-lg: 20px; /* mobile, prominent CTAs */
```

Lucide icons render at `1em` by default — set with `className="size-3"` (12px) / `size-3.5` (14px) / `size-4` (16px) / `size-5` (20px).

### 2.6 Typography scale

```css
--text-2xs: 10px; /* metadata, micro-labels */
--text-xs: 11px; /* compact labels, Kbd */
--text-sm: 12.5px; /* body in dense surfaces (sidebar rows, dialog labels) */
--text-md: 13.5px; /* body in main content */
--text-lg: 15px; /* dialog headings, primary labels */
--text-xl: 17px; /* page titles */
--text-2xl: 19px; /* wordmark (Inter @ wght:800) */
```

Mapped to Tailwind via `@theme inline` in `globals.css`. Use `text-2xs`, `text-xs`, `text-sm`, etc. NEVER `text-[12.5px]`.

### 2.7 Motion

```css
--t-fast: 150ms; /* state changes (hover, focus) */
--t-mid: 220ms; /* layout shifts, dropdowns */
--t-slow: 320ms; /* sidebar collapse, theme transitions */

--ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
--ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
```

All transitions use these easings. `transition-all duration-150 ease-out` is the default.

Honor `prefers-reduced-motion` AND the user-controlled `[data-reduce-motion]` flag (set by `<ApplyPrefs />`).

### 2.8 Z-index scale

```
z-0    background mesh
z-10   sidebar, panes
z-20   activity bar
z-30   tab strip, top bar
z-50   dialog overlay + content
z-70   mobile drawer
z-90   offline indicator
z-200  toaster
```

NEVER use z-index values outside this scale.

---

## 3. Primitives (the only components you should use)

Located in `packages/ui/src/primitives/`. Importable from `@cyrkil/ui`.

### 3.1 `<Button>` — three sizes, four variants

```tsx
<Button size="sm" variant="primary" onClick={…}>Save</Button>
```

| Prop                     | Values                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `size`                   | `sm` (28px) · `md` (32px, default) · `lg` (40px)                                                                             |
| `variant`                | `primary` (filled, high emphasis) · `secondary` (bordered) · `ghost` (no chrome) · `danger` (err color) · `link` (text only) |
| `leftIcon` / `rightIcon` | Lucide icon, rendered at size matching the button                                                                            |

Never override size/variant via `className`. Add a new variant if needed.

### 3.2 `<IconButton>` — three sizes

```tsx
<IconButton aria-label="…" size="sm">
  <X />
</IconButton>
```

| Size | Button | Icon         |
| ---- | ------ | ------------ |
| `xs` | 24×24  | 12           |
| `sm` | 28×28  | 14 (default) |
| `md` | 32×32  | 16           |

`aria-label` is required.

### 3.3 `<Input>` & `<Field>`

```tsx
<Field label="Email" error={errors.email?.message}>
  {(id) => <Input id={id} type="email" {...register("email")} />}
</Field>
```

`<Input>` is 32 px tall by default, themed border via `--border`.

### 3.4 `<Search>` — universal search box

```tsx
<Search
  value={query}
  onChange={setQuery}
  placeholder="Search conversations"
  size="sm" // xs | sm | md
  showClear // shows X when value is non-empty
  autoFocus
/>
```

Single component. Used in: sidebar-chat, sidebar-files, command palette, file picker. Internally:

- 28 px tall when `size="sm"` (default), 24 px when `xs`, 32 px when `md`
- No border. `bg-tint-active` background.
- Clear button is a `<RowAction icon={<X/>}>` — same as elsewhere
- Focus ring is the global `:focus-visible` style (handled at the input level)

### 3.5 `<RowAction>` — inline action button on a row

```tsx
<RowAction icon={<X />} label="Delete conversation" onClick={…} variant="danger" />
```

Standard size: 16×16 button, 10 px icon. Used everywhere we need a small inline action: delete row, dismiss toast, close drawer, clear search.

| Prop      | Values                              |
| --------- | ----------------------------------- |
| `variant` | `default` · `danger` (err on hover) |

### 3.6 `<Panel>` — scrollable container with hidden scrollbar

```tsx
<Panel scrollable hideScrollbar>
  {children}
</Panel>
```

| Prop            | Use                                       |
| --------------- | ----------------------------------------- |
| `scrollable`    | adds `overflow-auto`                      |
| `hideScrollbar` | adds the `scrollbar-hidden` utility class |
| `padded`        | adds default content padding (`p-2`)      |

Replaces ad-hoc `<div className="overflow-y-auto …">`. Used in sidebars, chat thread, composer textarea wrapper.

### 3.7 `<SidePanel>` — universal sidebar context panel

```tsx
<SidePanel
  title="Conversations"
  primaryAction={{
    label: "New chat",
    icon: <Plus />,
    shortcut: "⌘N",
    onClick: createChat,
  }}
  search={{ value, onChange, placeholder: "Search conversations" }}
  actions={[<IconButton ... />, <IconButton ... />]}
  footer={…}
>
  {/* list items */}
</SidePanel>
```

Structure:

```
┌────────────────────────────┐
│ TITLE      [actions...]   │  ← header row (28 px)
├────────────────────────────┤
│ [+ Primary action  ⌘N]    │  ← primary action button (full width, 28 px)
├────────────────────────────┤
│ [🔍 Search]               │  ← Search box (28 px)
├────────────────────────────┤
│                            │
│  children (scrollable)     │  ← Panel scrollable + hidden scrollbar
│                            │
├────────────────────────────┤
│ footer (optional)          │
└────────────────────────────┘
```

Used by sidebar-chat AND sidebar-files. Both render with identical chrome — only the inside differs.

### 3.8 `<Dialog>` + `<DialogContent>`

```tsx
<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent heading="Settings" footer={…} widthClass="w-[min(620px,94vw)]">
    …
  </DialogContent>
</Dialog>
```

Always uses `<RadixDialog.Portal>` under the hood. Glass background (`bg-glass-3 backdrop-blur-[24px]`).

### 3.9 `<DropdownMenu>` family

Wrappers around Radix DropdownMenu. Always portal-mounted. Themed identically to Dialog.

### 3.10 `<Tooltip>`

```tsx
<Tooltip label="Conversation options" side="right">
  <button …>
</Tooltip>
```

`<TooltipProvider>` is mounted **once** at the app root layout. No nesting.

### 3.11 `<Switch>`, `<Kbd>`, `<ScrollArea>`, `<Toaster>` — keep as-is.

---

## 4. Layout rules (bulletproof at any zoom)

### 4.1 The height chain

Every parent in a flex/grid height chain MUST have `min-h-0` AND either `overflow-hidden` (containers) or `overflow-auto` (scrollers). Without this, CSS's default `min-height: auto` lets children push past the container.

**Template for any full-height layout:**

```tsx
<div className="h-screen overflow-hidden grid" style={{ gridTemplateRows: "auto 1fr" }}>
  <header />
  <div className="min-h-0 overflow-hidden grid" style={{ gridTemplateColumns: "auto 1fr" }}>
    <aside className="min-h-0 overflow-hidden flex flex-col">
      <Panel scrollable hideScrollbar className="flex-1 min-h-0">{…}</Panel>
      <footer />
    </aside>
    <main className="min-h-0 min-w-0 overflow-hidden flex flex-col">
      {/* tab strip, then scrollable pane */}
    </main>
  </div>
</div>
```

### 4.2 Scrollers

ONLY ONE element in the chain has `overflow-auto`. Everything above it has `overflow-hidden` (or no overflow at all).

### 4.3 Composer / footer pinning

Use `flex-none` + `flex-col`. NEVER `position: sticky` for in-flow footers — sticky relies on the scroll container being the immediate parent, which is fragile when layout changes.

### 4.4 Mobile

Same rules. Add `paddingBottom: env(safe-area-inset-bottom)` to bottom-pinned bars on iOS.

---

## 5. Theming rules

### 5.1 No raw colors in components

Enforced by ESLint. Every color comes from a token. If you need a new color, add it to **every** theme JSON first.

### 5.2 Theme switching MUST be smooth

No flash, no relayout. The bootstrap script in `<head>` writes CSS vars BEFORE React mounts. The provider keeps state in sync.

### 5.3 OS-following theme is opt-in OR default-when-first-visit

Default mode is `"system"` — first-time visitors get their OS preference. Users can lock to `"dark"` or `"light"` in Settings.

### 5.4 Reset theme

Settings → Appearance → "Reset theme to system default" clears `cyrkil.theme.mode` and `cyrkil.theme.id` from localStorage. Useful when the user's preference is stale.

### 5.5 Monaco editor

Custom theme `cyrkil-dark` / `cyrkil-light` defined via `monaco.editor.defineTheme(...)`. Background, foreground, selection all wired from Cyrkil tokens. Re-applied on appearance change.

---

## 6. Accessibility

### 6.1 Focus rings

Visible via `:focus-visible` on every interactive non-input element. Inputs use container `focus-within:` styling instead.

### 6.2 ARIA

- Every IconButton has `aria-label`
- Every Dialog has `aria-modal="true"` (Radix provides this) and an accessible heading
- Every status region uses `role="status"` or `role="alert"` + `aria-live`
- Every form input is wrapped in `<Field label="…">` (associates label with input)

### 6.3 Keyboard

- ⌘K / Ctrl+K opens command palette
- ⌘B / Ctrl+B toggles sidebar
- ⌘N / Ctrl+N new chat
- ⌘W / Ctrl+W close tab
- ⌘, / Ctrl+, opens settings (Appearance tab)
- ⌘\\ / Ctrl+\\ toggles theme
- Enter / Space activates focused buttons/options
- Esc closes dialogs / popovers / search
- Tab / Shift+Tab cycles focus
- ↑ / ↓ navigates lists (command palette, dropdowns)

### 6.4 Reduced motion

Honor `prefers-reduced-motion` AND `[data-reduce-motion="true"]` on `<html>` (set by ApplyPrefs from Settings → Appearance).

### 6.5 Color contrast

Every text-on-background combination must pass WCAG AA (4.5:1 for body, 3:1 for large text). Use the High Contrast theme as the canonical test target.

### 6.6 Touch targets

Minimum 44×44 px on mobile (`var(--tap-min)`). Mobile bottom-tab bar uses `min-h-[56px]`. Top-bar buttons use `min-h-[44px] min-w-[44px]`.

---

## 7. Component composition rules

### 7.1 NEVER reach for inline classes when a primitive exists

**Wrong:**

```tsx
<button className="inline-flex items-center justify-center size-6 rounded-xs text-text-2 hover:text-text hover:bg-tint-hover">
  <X className="size-2.5" />
</button>
```

**Right:**

```tsx
<RowAction icon={<X />} label="Dismiss" onClick={…} />
```

### 7.2 If you need a variant a primitive doesn't have, ADD it to the primitive

Don't ship a one-off in a feature file. Add the variant to `<Button>` (or wherever), document it here, then use it.

### 7.3 Layout primitives belong in the feature file

`<SidePanel>`, `<Dialog>` etc. are reusable. But a specific arrangement of `<SidePanel>` filled with `<ConversationRow>`s belongs in `sidebar-chat.tsx`. Don't over-abstract.

### 7.4 No prop drilling for theme

Use `useTheme()` from `@cyrkil/ui`. Don't pass `appearance` through props.

### 7.5 Stores: per-key selectors only

Zustand:

```ts
// Wrong:
const { foo, bar } = useShellStore();

// Right:
const foo = useShellStore((s) => s.foo);
const bar = useShellStore((s) => s.bar);
```

Whole-store selectors break React 19's `useSyncExternalStore` snapshot caching.

---

## 8. File / folder conventions

```
apps/web/
├── app/                ← Next.js App Router (routes, layouts, pages)
├── components/
│   ├── auth/           ← auth-flow specific (AuthCard, PasskeyPrompt)
│   ├── chat/           ← chat surface (ChatView, Composer, Message, Markdown, CodeBlock)
│   ├── files/          ← file-related surfaces (FilePreviewDialog)
│   ├── mobile/         ← mobile shell + drawer + tour
│   ├── sandbox/        ← desktop dev tools (Editor, Terminal, Preview)
│   ├── shell/          ← desktop app shell (TopBar, Sidebar, ActivityBar, TabStrip, …)
│   └── system/         ← cross-cutting infra (ErrorBoundary, OfflineIndicator, Skeleton)
├── stores/             ← zustand stores
├── lib/                ← pure utilities, i18n bundle, schemas, theme bootstrap
├── hooks/              ← reusable React hooks
└── tests/              ← vitest tests

packages/
├── ui/                 ← every reusable primitive (Button, IconButton, Search, …)
├── tokens/             ← TS exports of design tokens (for tests)
├── themes/             ← JSON theme files + loader
├── platform/           ← capability detection (isDesktop, isMobile, …)
└── eslint-config/      ← shared ESLint config
```

### 8.1 Naming

- Components: `PascalCase.tsx` (e.g. `SidebarChat.tsx`)
- Hooks: `use-something.ts` → exports `useSomething`
- Stores: `something-store.ts` → exports `useSomethingStore`
- Utilities: `kebab-case.ts`
- Tests: `<name>.test.ts` or `<name>.test.tsx`

### 8.2 Imports

- Internal app: `@/components/...`, `@/stores/...`, `@/lib/...`
- Workspace packages: `@cyrkil/ui`, `@cyrkil/themes`, `@cyrkil/platform`, `@cyrkil/tokens`
- External: bare name (`react`, `zustand`, `next`)

---

## 9. Performance budgets (enforced in CI)

- `/app` first-load JS ≤ **250 KB gzipped** (currently 168 KB)
- `/auth/*` first-load JS ≤ **250 KB gzipped** (currently 168 KB)
- Monaco & xterm dynamic-imported only — NEVER in initial bundles. Enforced by `scripts/check-bundle-budget.mjs`.

---

## 10. Public-safe naming

Per the locked architecture, NEVER expose these internal names in user-visible copy:

| Internal                          | Public label                                      |
| --------------------------------- | ------------------------------------------------- |
| n8n / webhook                     | "AI agent"                                        |
| AuthKit / OAuth provider          | "Secure account"                                  |
| gVisor / Docker / sandbox runtime | "Temporary sandbox" / "Desktop development tools" |
| PostgreSQL / metadata DB          | (never shown)                                     |
| iptables / network rules          | (never shown)                                     |
| Tauri / Capacitor                 | "Desktop app" / "Mobile app"                      |

Enforced by ESLint rule `no-internal-labels` in `packages/eslint-config/`.

---

## 11. Quick reference: "What should I use?"

| You want to…                                                            | Use                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A button                                                                | `<Button size="md" variant="primary">…</Button>`                                                                                |
| An icon-only button                                                     | `<IconButton aria-label="…" size="sm"><X/></IconButton>`                                                                        |
| An inline X / ⋯ on a row                                                | `<RowAction icon={<X/>} label="…" onClick={…} />`                                                                               |
| A search box                                                            | `<Search value={…} onChange={…} placeholder="…" showClear />`                                                                   |
| A sidebar panel with header + primary action + search + scrollable body | `<SidePanel title="…" primaryAction={…} search={…}>…</SidePanel>`                                                               |
| A scrollable container without scrollbar                                | `<Panel scrollable hideScrollbar>…</Panel>`                                                                                     |
| A modal dialog                                                          | `<Dialog><DialogContent heading="…">…</DialogContent></Dialog>`                                                                 |
| A dropdown menu                                                         | `<DropdownMenu><DropdownMenuTrigger asChild>…</DropdownMenuTrigger><DropdownMenuContent>…</DropdownMenuContent></DropdownMenu>` |
| A toast                                                                 | `useToaster().toast("Saved", "success")`                                                                                        |
| A keyboard shortcut chip                                                | `<Kbd>⌘K</Kbd>`                                                                                                                 |
| A tooltip on a button                                                   | `<Tooltip label="…"><IconButton …/></Tooltip>`                                                                                  |
| A loading skeleton                                                      | `<Skeleton h={10} />` or `<SkeletonChatMessage />`                                                                              |

If your need isn't on this list, **don't ship inline classes** — propose a new primitive, get it reviewed, then build it once.

---

## 12. When in doubt

1. **Compare to `design_history/cyrkil_preview_v10.html`** — that's the locked visual reference.
2. **Compare to VS Code** — it's the spiritual model for chrome density and behavior.
3. **Ask before guessing.** Cyrkil prefers correct over fast.

---

## Appendix A — Forbidden patterns

- ❌ Inline color literals (`#fff`, `rgb()`, `hsl()`) outside `packages/themes/themes/*.json` and `apps/web/lib/seed-preview.ts` (the iframe srcdoc, which has its own eslint-disable).
- ❌ Whole-store zustand selectors (`const { x, y } = useStore()`).
- ❌ `position: sticky` for in-flow chat footers.
- ❌ `scrollbar-width: auto` on dense interior surfaces.
- ❌ Hardcoded `text-[12.5px]`, `h-7`, etc. when a token exists.
- ❌ Nested `<TooltipProvider>` (one at the root only).
- ❌ Browser-native dialog elements (`<dialog>` HTML). Use Radix.
- ❌ Internal product names in user-visible strings.
- ❌ One-off primitive variants in feature files. Extend the primitive instead.
- ❌ **Tailwind `z-50`, `z-[200]`, etc.** — every elevated element uses `Z.*` from `@cyrkil/ui/layers` (§1.2).
- ❌ **`position: absolute`** for elements that _appear_ to be inline siblings — use real grid/flex columns (§1.1, principle #2).
- ❌ **`transform: translate(...)`** for visual positioning when the layout can express it natively (§1.1, principle #5).
- ❌ **Mocked appearance** that doesn't match the real DOM structure (§1.1).
- ❌ **`window.confirm` / `window.alert` / `window.prompt` / native `<dialog>`** — use `<ConfirmPopover>` or `<Popover>` (§1.3, §1.5).
- ❌ **`getComputedStyle(...)` to read theme values from non-DOM consumers** (Monaco, xterm, canvas, etc.) — receive the theme object directly (§1.5 rule #2).
- ❌ **Fake controls** — every `<button>` / `<IconButton>` / `<a>` MUST have a real handler (§1.1, principle #1).
- ❌ **Inline copies of primitive look-alikes** — section labels, file badges, Kbd hints, etc. live as primitives (§1.5).

## Appendix B — Recommended patterns

- ✅ Use the **dynamic-import + skeleton** pattern for any pane that loads >50 KB lazily.
- ✅ Use the **`min-h-0` + `overflow-hidden`** chain for any full-height layout.
- ✅ Use `useT()` from `@/lib/i18n/use-t` for ALL user-facing strings (en-US only at launch, but the indirection is required for the future).
- ✅ Use `useCanShowDevTools()` from `@cyrkil/platform` to gate desktop-only features.
- ✅ Use `<ErrorBoundary>` around any tree that could throw (already at app root).
