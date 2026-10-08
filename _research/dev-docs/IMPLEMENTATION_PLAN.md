# Implementation plan — the real company.os (2026-10-08)

_Supersedes the P0–P2 plan. Driven by `PRODUCT_REQUIREMENTS.md` v2 (REQ IDs), the owner's answers
(Q1 all / Q2 browser / Q3 both / Q4 landing / Q5 execute-and-report), and the rules re-read noted
in `SUPPORTING_NOTES.md` §2026-10-08. Every phase ends: checks green → done-log entry → push._

---

## §1 · Assessment — what exists vs what the requirements demand

| Area | Today (verified) | Gap | Phase |
|---|---|---|---|
| Data layer | Server + SQLite (`services/api`, `packages/company` drizzle, seeds) | REQ-10/13: all user-side; server retires | C |
| Budget | Meters, drawer line, spend stat, DB columns, tests | REQ-32: remove entirely | B |
| First run | App boots straight to Team with seed data | REQ-33/14: landing page + intro wizard | D |
| Employees | Seed agents, fixed roster | REQ-17..22: user-typed, any provider+key, test button, validated hierarchy | D/E |
| Model access | Server-side gateway (`packages/gateway`) | REQ-18/19: client adapters (OpenAI/Anthropic/Gemini/custom) + test | E |
| Work engine | None (demo shows fake activity) | REQ-23..29,35: prompt compiler, assignment grammar, parser, ReAct loops, checkpoints, histories | F |
| Timing | None | REQ-30/31: daily schedule + manual override, auto resume | F |
| Look | Pixel language present; scrollbars visible; footer in-flow; sidebar has no scroll but shows the calm note in prototype; no favicon mark | REQ-1..7 | G |
| Screens | Views read `/api/*`; Comms = list only | Read the store; thread screen with provenance lands with F | C/F |
| Network | OrgTree placeholder | Graph engine port (from PORT_AUDIT) | C (engine code) / G (fit-to-viewport) |
| World | Good; missing pinch/glide/dblclick/reduced-motion/resize-guard (PORT_AUDIT phase 1) | fold in | G |
| Repo | `.data/` scratch, duplicate screenshot homes, server artefacts, demo pipeline | REQ-8/9 | A (+retirements in C/J) |
| Hosting | Pages = demo at root, prototype beside | J: root = real app (static), `/prototype` frozen reference | J |

## §2 · Target architecture (fully client-side)

```
index.html (Pages) ── apps/web (React, pixel skin)
  ├─ data/store.ts        zustand+persist → ONE localStorage key `company-os.save.v1`
  ├─ data/savefile.ts     zod-validated export/import (the one file, REQ-11)
  ├─ data/hierarchy.ts    cycle/self/missing validation (REQ-21)
  ├─ ai/providers.ts      openai SDK · anthropic fetch · @google/genai · custom baseURL
  ├─ ai/prompts.ts        system-prompt compiler from store data (REQ-23)
  ├─ ai/grammar.ts        assignment + choice structures, parser + jsonrepair (REQ-24/25)
  ├─ ai/engine.ts         scheduler + per-employee loops + checkpoints (REQ-25..30)
  ├─ views/…              Team Tasks Inbox→"asks from the company" Comms Network World Settings
  ├─ welcome/Landing.tsx  pixel landing with screenshots + start (REQ-33)
  └─ welcome/Wizard.tsx   company → employees → options (REQ-14)
```

Save-file schema v1 (zod): `{ version:1, exportedAt, company{…qa[]}, employees[{id,name,role,
details,portrait,provider,model,key,managerId|null}], tasks[], threads[], history[], settings{},
schedule{}, engine{} }`. Import validates; bad file → named error, nothing overwritten (REQ-11).
Quota: on `QuotaExceededError` the store warns and offers export (history is kept in memory for
the session and lands in the file).

## §3 · Reuse ledger (researched 2026-10-08; licence gate applies, C-2)

| Reuse | Licence (npm-verified) | Role | Source |
|---|---|---|---|
| `openai` 7.30.0 | Apache-2.0 | OpenAI + **any OpenAI-compatible** endpoint (`baseURL`) with `dangerouslyAllowBrowser` | https://www.npmjs.com/package/openai |
| `@google/genai` 2.28.0 | Apache-2.0 | Gemini adapter, browser-supported init | https://www.npmjs.com/package/@google/genai |
| Anthropic = **raw fetch**, not the SDK (SDK pulls Node-only modules into browser bundles) | our code, pattern from upstream | `anthropic-dangerous-direct-browser-access: true` | https://github.com/anthropics/anthropic-sdk-typescript/pull/504 , https://dev.to/ferhatatagun/building-a-streaming-claude-client-in-the-browser-without-the-sdk-5f80 |
| `jsonrepair` 3.15.0 | ISC | repairs model JSON (strips fences, quotes, commas) before zod | https://www.npmjs.com/package/jsonrepair |
| `zustand` 5.0.15 | MIT | store + persist middleware | https://github.com/pmndrs/zustand |
| `zod` (already in repo) | MIT | save-file + grammar validation | — |
| In-repo reuse | — | world camera/plan/art, graph engine (extract per PORT_AUDIT), pixel portraits, i18n, tokens | — |
| Considered, rejected | — | MCP (not needed); AutoGen/LangGraph (server-bound, heavy); `@anthropic-ai/sdk` (Node-only imports) | sources above |

Every new dependency is added to `THIRD_PARTY.md` **before** its phase lands; the CI licence gate
fails on unlisted packages.

## §4 · Phases

### Phase A — organise & clean (mandate: execute-and-report)
Delete `.data/`; merge `_research/screenshots/*` into `design/screenshots/` (one home); everything
else stays until its retirement phase. Update PROJECT_MAP. Log the report.

### Phase B — budget dies (REQ-32)
Remove: `BudgetMeter` component + uses (TeamView), drawer budget line + monthly-spend stat
(WorldView + `world.js` prototype patch + world-lib re-build), i18n keys, tests touching budget.
Observed-failing-first: a check asserting the words/meters are gone.

### Phase C — the store replaces the server (REQ-10/11/12/13)
1. `data/store.ts` + `savefile.ts` + `hierarchy.ts` (units: roundtrip, bad-file errors, cycle
   naming). 2. Views rewired to the store; `lib/api.ts` deleted; DataState remapped (hydrate/
   empty/import-error). 3. Retire `services/`, `packages/gateway`, `packages/company` DB bits
   (schemas become zod in `data/`), drizzle deps, `Dockerfile`, `.dockerignore`, `render.yaml`.
   4. Smoke reworked: static build + a seeded save in localStorage. 5. verify.sh restructured.

### Phase D — landing + intro (REQ-33/14/15/16)
Landing (pixel style, screenshots captured from a fixture-loaded build, start button) → wizard
steps company (name/description/questionnaire + custom Q&A rows) → employees (full editor incl.
provider/key/test/manager with live cycle validation) → options. Resumable (draft in the save
key). Settings gains the same editors afterwards.

### Phase E — providers (REQ-18/19)
`ai/providers.ts` per §3; test-connection = a real 16-token call; errors shown verbatim; model id
free text with suggestions. THIRD_PARTY entries land here.

### Phase F — the engine (REQ-23..30,35)
prompts compiler; grammar + parser (+jsonrepair, one format-retry, then pause-and-ask per REQ-35);
per-employee loops; delegation downward only; reports upward; user-approval at the top (replaces
the inbox: "asks from the company"); histories view (task trail + thread provenance: provider +
model per message); chat-with-idle; schedule + manual override; checkpoints + resume (unit-tested
with a deterministic fake provider; observed failing first).

### Phase G — the look completes (REQ-1..7 + PORT_AUDIT world/graph work)
Hidden scrollbars app-wide; fixed de-demo footer absorbing company/loop-state/version; views fit
the viewport (world/network/comms; inner panes scroll invisibly); sidebar never scrolls; pixel
icon = favicon + brand + manifest; calm note removed (app + prototype patch); prototype patches
for the same cosmetics; world pinch/glide/dblclick/reduced-motion/resize-guard; graph engine
extracted to the app and mounted on store data; OrgTree retires.

### Phase H — licences & gates
THIRD_PARTY.md complete for the new deps; CI gate extended; npm audit clean.

### Phase J — publish & close
Pages workflow: root = the real app; `/prototype` untouched; `demo/` + its builder retired (the
product supersedes them — reported, per mandate); root README rewritten (one page: what this is,
how to run, where each doc lives); final completion-gate pass per GENERAL_GUI_AGENT_RULES §20;
rolling checkpoint zip + git tag; final report to the owner.

## §5 · Gates (every phase)

`bash scripts/verify.sh` restructured to: web units · tsc · oxlint · design gate (prototype,
15 checks) · browser smoke (static build, phone matrix incl. 320/390/768/1280/1920, RTL, both
themes) · docs check · licence gate · world-lib sync. New checks are run and **observed failing**
before their fix lands (standing rule).

## §6 · Risks & mitigations

- localStorage quota vs "all history" → in-memory + export warning (documented, §2).
- Provider CORS/policy change → three independent adapters; custom endpoint always available.
- Model ignores the grammar → jsonrepair + one retry + pause-and-ask (REQ-35), never a silent cap.
- Keys in the export file → warning banner on export/import (REQ-22 note).
- Bundle size (two provider SDKs) → dynamic-import each adapter; landing stays light.
- Pages base path → vite `base: './'` verified in the smoke against the built files.

## §7 · Plan audit — 2026-10-08 (research pass, owner's instruction)

Every risky assumption in §2–§6 was checked online or against the repo before execution:

1. **zustand persist** — `version` + `migrate` give save-file schema evolution; `createJSONStorage`
   abstracts the backend ([zustand.site/en/docs/persist](https://zustand.site/en/docs/persist/),
   [deepwiki/pmndrs/zustand 3.1](https://deepwiki.com/pmndrs/zustand/3.1-persist-middleware)).
   Plan stands; the save key is the export payload (REQ-11).
2. **Background tabs** — Chrome intensively throttles timers (~1/min after ~5 min hidden), workers
   included ([getintechs.com](https://www.getintechs.com/blog/inactive-tab-throttling),
   [pontistechnology.com](https://pontistechnology.com/learn-why-setinterval-javascript-breaks-when-throttled/)).
   Corrected design: the scheduler tick evaluates **timestamps** (Date.now vs schedule) instead of
   trusting the interval cadence, and employee loops are **fetch-driven chains** (each step starts
   when the previous model call resolves), so hidden tabs slow the *tick*, not the step hand-off;
   `visibilitychange` writes a checkpoint on hide. REQ-31 wording stays honest: work runs while the
   app is open.
3. **Storage quota** — localStorage is 5 MB per origin everywhere; IndexedDB is hundreds of MB
   ([docs.bswen.com browser-storage-quotas](https://docs.bswen.com/blog/2026-04-07-browser-storage-quotas-eviction/)).
   Plan stands: localStorage now, `QuotaExceededError` → warn + offer the export file; an IndexedDB
   migration is a documented later option, not a gap.
4. **Icons** — SVG favicon alone is not enough (Safari/iOS, legacy): ship SVG + PNG 16/32/180 +
   manifest 192/512 ([iconmaker.studio favicon best practices 2025](https://iconmaker.studio/blog/favicon-best-practices-2025)).
   Corrected design: PNGs generated by a **dependency-free encoder** (node `zlib`, pixel map → PNG
   chunks) in `scripts/gen-icons.mjs`, so the pixel mark stays one source of truth; no new licence.
5. **openai SDK in Vite** — browser mode is documented (`dangerouslyAllowBrowser`); the
   "process is not defined" class of failure belongs to Node-importing libs, which is exactly why
   Anthropic uses raw fetch here. Mitigation if the openai bundle misbehaves in phase E: its
   adapter falls back to the same raw-fetch shape as the Anthropic one (one interface, two impls).
6. **Repo facts** — the licence gate (`scripts/checks/licence-gate.mjs`) already fails on unlisted
   deps, so the reuse ledger is enforced, not aspirational; `verify.sh` step numbers were off-by-one
   in its own comments (cosmetic, fixed when C restructures it); `vite.config` has no `base` yet —
   phase J sets `base: './'` and the smoke proves the built files run from a static host.

Phase B (budget dies) executed the same day: `BudgetMeter` deleted; team roster, world drawer and
world stats are money-free in the app and the prototype; string table cleaned (en+ar); a new
`scripts/checks/no-budget.mjs` guards the surface (in `verify.sh`); both new checks were observed
failing (16 hits; the roster test red) before the removals turned them green. Gate 10/10 after.

## §8 · Re-audit 2026-10-08 (b) — corrections and the code-source map

Corrections found by re-auditing against the repo and the owner's new directions:

1. **Demos are archived, never deleted.** Phase J no longer "retires demo/"; it moves
   `demo/` → `archive/demo/` and `design/owner-demo/` → `archive/owner-demo/`, updating every
   reference (build-demo-html.mjs, the workflow, e2e/demo.mjs, gen-owner-data.mjs, seed.ts, the
   parity/owner-data/avatars tests, SOURCE.md paths). `design/designer-demo/` stays where it is:
   it is an *active* parity source read by generators and tests at build time, and the rules lock
   it read-only. Until J, the root Pages URL keeps serving the demo, so the owner always has a
   live link.
2. `verify.sh`'s own step-number comments are off by one (says 1/9 then 2/10…) — fixed when Phase C
   restructures the gate.
3. Landing screenshots come from a fixture-loaded **static** build (Playwright against
   `vite preview` + a seeded save), not from the old API-served app.
4. Neither demo contains a drag-and-drop editor (verified by grep: the designer demo's only
   `pointerdown` is its dialog scrim; the owner demo has none). The "borrow" the owner means is the
   one already in place: the plan geometry, desk positions and sprite catalogue are generated from
   his demo (`apps/web/src/world/layout.data.ts`, drift-checked), and the drag/drop mechanics are
   our build mode — which Phase K extends.

Code-source & adaptation map (what to take from where, and how to adapt it):

| Phase | Take from | Adapt into | How |
|---|---|---|---|
| C | `packages/contracts/src/*.ts` (zod shapes) | `apps/web/src/data/schema.ts` | drop server brands + budget; keep ids/stages/statuses; add provider/key/managerId |
| C | `packages/company/src/seed.ts` + `scripts/gen-owner-data.mjs` | `design/data/demo-company.save.json` fixture | one-shot generation, then hand-owned labelled fixture (tests + landing) |
| C | `apps/web/e2e/smoke.mjs` API bootstrap | `addInitScript` seeding localStorage with the fixture | same assertions, static host |
| D | `SettingsView` palette/skin controls + `Dialog`/`TaskForm` patterns | wizard steps | reuse components; wizard = new composition |
| E | `openai` npm, `@google/genai`, Anthropic fetch pattern (§3 URLs) | `ai/providers.ts` | one interface; per-provider chat/test; custom baseURL via openai SDK |
| F | — (new) | prompts/grammar/engine | grammar spec below; jsonrepair for tolerance |
| G | `design/prototype/world.js` pointer handlers | `apps/web/src/world/gestures.ts` | React-ify; share via world-lib back to the prototype |
| G | `design/prototype/graph.js` | `apps/web/src/graph/*` | extract sim/camera/controls to TS; esbuild bridge like world-lib |
| G | `company-os.html:715` topbar + `:761` globalSearch | React shell components | real store data instead of demo `data` |
| K | existing build mode (`WorldView`) + sprite catalogue (`layout.data.ts`) | extended builder | see §9 |

## §9 · Phase K — world builder & sprite customisation (PLANNED ONLY, owner 2026-10-08)

Scope (nothing built yet): the builder grows from "move what exists" to a real editor —
add any furniture from the sprite catalogue (the nine-shape catalogue generated from his demo),
drag & drop to place (pointer events, touch included — `touch-action: none` already there),
move, select, delete, undo, reset (all exist today); choose a pixel portrait per employee from the
portrait library (REQ-17); the edited plan and the portraits persist in the save (store), not in
component state as now; every addition snaps to the owner's 16-unit grid; validation keeps props
inside their room and desks inside the plan. New checks observed failing first: a browser test
that drags a new sprite from the catalogue onto the floor on a touch viewport, and a unit test
that a saved plan round-trips through the export file. This phase starts after G, never before.

## §10 · Live URLs (owner asked where to watch)

- `https://ahmed-sleem.github.io/company.ai/` — today: the frozen one-file app (seed data).
  After Phase J: **the real product**, fully user-side. Free forever (his GitHub Pages).
- `https://ahmed-sleem.github.io/company.ai/prototype/` — the frozen design reference
  (`#world`, `#network`).
No new account needed anywhere: the repo already lives on his GitHub and Pages is wired.
