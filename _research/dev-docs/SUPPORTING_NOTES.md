# Supporting notes

Merged special notes: rule conflicts and their resolutions, GUI requirements, RTL, tokens,
verification, mobile policy, known limitations.

## 1. Rule conflicts and resolutions (read before UI work)

The four rule documents were written for a different product; the pixel style is locked by the user.
Resolutions (full reasoning in `_research/rules/README.md`):

| Conflict | Resolution |
|---|---|
| `UI Governance Contract` §2.8 radius scale (6→28px) vs the pixel skin's `--radius: 0px` | **Pixel wins.** Invoke the contract's own §1 "documented deviation — do not correct" clause. The stepped corner frames are the brand shape. |
| Contract §2.2 control heights (32px compact) vs demo `--control: 34px` | Demo wins (34px); controls still clear the 24px WCAG floor and expand to 48px on coarse pointers. |
| `DESIGN_SYSTEM.md` §1.5(4) "no native `<dialog>`" | **Native `<dialog>` + `showModal()` is kept.** `GENERAL_GUI_AGENT_RULES.md` §11.2 requires focus containment, inert background and focus return — native dialogs provide all three. Recorded deviation. |
| Contract §2.6 type scale (11→28) vs demo scale (11→28 + pixel face) | Compatible. Demo adds a pixel family for hierarchy only; contract's minimum (12px body) is respected (body 14px). |
| `DESIGN_SYSTEM.md` "glass / chrome transparency is non-negotiable" | That is the other product's identity. Here: solid surfaces, no blur — the demo's look. Recorded deviation. |
| Contract §9 "no decorative colour, semantic only" | Kept. The graph legend assigns colour by **meaning** (status/stage) and always pairs it with a shape + label, never colour alone. |
| Contract §7 motion 120–180ms vs demo `--speed: 130ms` | Same range. Graph interactions use the demo's 130ms and no data animation (contract §7 "never animate data"). |

## 2. GUI requirements in force (condensed)

- **Tokens only.** Every colour, size, radius, shadow, duration resolves to
  `design/tokens/company-os-pixel.css`. No raw hex/pixel literals in component CSS.
- **Four data states** everywhere data appears: loading, empty, error, no-permission — plus the
  demo's `restricted`.
- **Window system:** one dialog implementation (the demo's `openDialog`), actions in the footer,
  `dvh`-capped, focus trapped and returned.
- **Wording:** no `coming soon` / `tbd` / `todo` / internal identifiers in the UI. The demo's copy
  already complies.
- **Accessibility floor:** ≥24×24 targets (48 on coarse pointers), visible 2px focus ring, icon-only
  controls named, headings hierarchical, live regions for async, never colour alone.
- **Verification duties:** test normal, extreme and failure conditions; log evidence; never claim
  completion without it (see §5 below).

## 3. RTL

Structural, not translated: logical properties only (`inset-inline-*`, `margin-inline`, `border-inline-end`,
`text-align:start`); zero `left`/`right` in the demo; the mobile drawer mirrors explicitly; direction-
implying icons mirror, non-directional ones do not. New UI (the graph) follows the same rules and is
checked in both directions.

## 4. Tokens

Source of truth: `design/tokens/company-os-pixel.{css,json}`. Dark and light are the same variable
names with different values; semantic meaning is fixed
(working/sent/done → accent · error/failed/critical → danger · paused/high/approval → warning).
**Additions must reuse these meanings rather than introduce hues.**

Deviation to remember: `--dim` (#819388 dark) is for non-essential labels only — never for text that
carries meaning (review item E7).

## 5. Verification of the current prototype (evidence)

Command: `node design/prototype/verify.mjs` — **11/11 pass** (run 2026-10-03). The browser half is
`node design/prototype/probe-browser.mjs` — **7/7** (viewport matrix, framing/clipping, overflow,
touch targets, live-token contrast, focus rings); four defects it found are fixed and recorded in
`_research/18-changes-implemented.md` §3c.

| Check | Result |
|---|---|
| Prototype is byte-identical to a fresh build from the demo | 377,510 B, identical |
| `graph.js` and the demo's app script parse | `node --check` |
| Layout converges, stays finite, deterministic | 77 nodes / 82 edges → settled to 0.000 px/tick; rings finite |
| No raw colours or stray lengths in new CSS/JS | clean (media-query breakpoints are the documented platform exception) |
| No physical `left`/`right` in new CSS or markup | clean — logical properties only |
| Demo integrity (views, themes, RTL, dialogs, storage) | intact |
| Network page renders (en + ar, five states, no-data guard) | markup clean, no `undefined` |
| **No node / label / hull overlap** (force and rings) | worst clearance +10.0px, hulls clear, span ≤1698px |
| CSS geometry tokens match their JS fallbacks | 36/36 in step |
| Served over HTTP | `company-os.html` 200 / 384,559 B; `graph.js` 200; `graph.css` 200 |

Each check was also **observed failing** (raw colour, syntax error, hand-edited prototype, physical
property) and then restored — the evidence table is in `_research/18-changes-implemented.md` §3.

**Verified in a real browser on 2026-10-03** (both themes, EN + AR, 320×568 → 1920×1080, framing in
both graph layouts, page overflow, 44px touch floor, live-token contrast, focus rings) — see §3c of
`18-changes-implemented.md`.
**Still not verified:** screen-reader announcement order (needs a real screen reader), gesture *feel*
on a physical device, `forced-colors` rendering, and long-session storage growth. Both tools print
their own NOT CHECKED lists so the remaining gap cannot be mistaken for a pass.

### Checkpoint

``_research/checkpoints/company_ai_phase_d2_network_view.zip`` — full project snapshot (the repo minus `.git`),
plus `company_ai_phase_d0_docs.zip` for the documentation/rules phase. Checkpoints live **outside**
the repository per `DEVELOPMENT_REQUIREMENTS.md` §6 and are never committed.

## 6. Mobile policy (template, to confirm)

Desktop-first (the demo's layout is a desktop shell). On mobile: navigation becomes a drawer;
the task board collapses to one column; the **network view falls back to its list mode** (canvas
gestures are a poor fit on touch and the list gives a real accessible path). Documented per
`DEVELOPMENT_REQUIREMENTS.md` §6.

## 7. Known limitations and open items

1. **No browser was available** in the environment that produced the prototype: rendering,
   focus order, contrast and gesture behaviour are verified by reading code and by headless
   simulation, not by eye. Must be checked in a real browser before the next decision.
2. **Avatar art normalisation** is done at runtime (32-grid art scaled 1.5× onto the 48-grid);
   the proper fix is a re-cut of those 16 portraits at 48×48 — ask the designer.
3. **i18n** is still an inline dictionary (review item E6/A1); the product must move it to resource
   files. The graph module already resolves its own strings through pairs (en/ar).
4. **Simulated values** (run counts, policy labels in the prototype) are derived from sample data and
   are labelled as sample data in the UI. The product must not carry them as real state.
5. **`--dim` contrast** at 11px is borderline in dark mode; raised to `--muted` wherever the text
   carries meaning. Measured 2026-10-03: the worst live token pair is `--muted` on `--bg` at **5.23:1**
   (AA for body text); `--dim` is only used for non-essential labels, as designed.

## 8. P0 decisions taken while building (recorded so they are not re-litigated)

1. **Chrome values are named tokens, not literals.** The pixel treatment needs 1px hairlines, 2px
   pixel borders/shadows and 3px corner notches. They live in `apps/web/src/styles/app.css` as
   `--app-hair`, `--app-stroke`, `--app-notch` (plus `--app-track`, `--app-stripe`,
   `--app-roster-min`, `--app-tree-h`), exactly the way the prototype declares `--pg-hair` in its own
   token block. The raw-value check strips the `:root{…}` block, comments and `@media` conditions —
   the same stripping the design gate uses — so breakpoints stay literal (a platform constraint,
   custom properties cannot appear in a media query) and nothing else may.
2. **One module-resolution mechanism.** Every workspace package declares `exports` to its TypeScript
   source (`@company/tokens` also exposes `./tokens.css`, `./theme.css`, `./tokens`). `tsconfig.json`
   has no `paths` and no `baseUrl` (TypeScript 7 removed the latter). Do not reintroduce `paths`:
   a package that is not resolvable as a library is a broken package, not a configuration problem.
3. **Tests get a process per file.** PGlite is real PostgreSQL in WASM and three suites in one
   process exhaust a 2 GB machine (`vitest` → "Worker forks emitted error"). `vitest.config.ts`
   therefore uses `pool: 'forks'`, `fileParallelism: false`, `maxWorkers: 1`; a test that needs its
   own seeded database gets its own file (see `packages/company/test/money.test.ts`).
4. **A test must not depend on another test's spending.** Assertions about seeded money were moved
   to a file with its own database after the budget tests inflated the shared one
   ("expected 1500 to be 1250").
5. **The browser smoke test runs on its own ports (API 8790, preview 4174) and clears its database
   first.** A shared port once made the smoke test silently talk to a dev server (it passed partly,
   then failed), and a reused database once made it pass only on the first run. A smoke test that
   talks to a server it did not start is not a smoke test.
6. **Only one API at a time on the small machine.** Each API process loads PostgreSQL (~400 MB);
   stop the development API before running the gate. The e2e prints this hint when a server dies.
7. **Licence policy at the dependency level.** Runtime dependencies must be permissive and named in
   `THIRD_PARTY.md`; MPL/EPL packages are allowed unmodified as build tooling but must be named
   (`lightningcss` is the current one, pulled in by Vite/Tailwind); AGPL/GPL/LGPL/SSPL/BUSL/Elastic/
   fair-code/no-licence fail the gate outright. Platform-specific binaries inherit their base
   package's entry (`lightningcss-linux-x64-*`).
8. **The seed writes money the product's way.** It calls `recordRun` (the same function the gateway
   uses) instead of writing the cached counter, so ledger, counter, meter and audit trail cannot
   disagree. If a future seed needs spend, do it this way.
9. **Org-tree geometry waits for P3.** `apps/web/src/components/OrgTree.tsx` uses plain numbers for
   its SVG layout; the P3 engine (footprint, packing, hulls) replaces the layout function only, and
   the token/fallback pairing rule then applies to it the way the design gate applies it to the
   prototype graph (37 pairs in step today).
