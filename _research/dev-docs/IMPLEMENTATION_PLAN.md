# Implementation plan

> Phase plan, milestones and acceptance criteria. Update the plan before starting a phase; append
> results to `THINGS_DONE.md` after validating.

## Where the project stands

Delivered so far: research (`_research/00`–`17`), the designer's demo (in place, byte-verified), the
extracted design system (`design/tokens/`), the prototype with the network view
(`design/prototype/`), and the four mandatory rule documents (root + mirror).

Not yet started: the product build (React + React Flow + d3-force/PixiJS + shadcn/ui per
`_research/15-code-harvest-plan.md`), harvest of the reusable repos, backend.

## Phases

| Phase | Goal | Acceptance criteria | Status |
|---|---|---|---|
| **D0** | Design system locked | tokens extracted and documented; demo archived byte-identical; rule conflicts resolved in writing | **done** |
| **D1** | Prototype parity | prototype reuses the demo untouched except documented patches; every mutation listed with its review item (E/A number) | **done** |
| **D2** | Network view prototype (spacing + layering pass complete) | Obsidian-style graph in the demo's style: three modes, focus filters, drag/zoom/pan, persisted layout, keyboard + list fallback, token-only styling, all four data states | **done** (static prototype) |
| **P0** | Foundation build | monorepo `apps/web` + `packages/*` per `_research/15`; token pipeline generates CSS variables from `design/tokens/company-os-pixel.json`; `./scripts/verify.sh` green | not started |
| **P1** | Shell + Team + Tasks + Inbox | parity with the prototype on real state; four data states per surface; RTL + themes verified | not started |
| **P2** | Conversations + model routing | thread list, thread, model selector wired to a real router; mentions, replies, voice notes, message states | not started |
| **P3** | Network view in the product | React Flow (≤1,000 nodes) with the same modes/legend/filters; d3-force layout in a worker; positions persisted server-side | not started |
| **P4** | Decision trust surface | policy rule, diff, bulk approve, approval audit trail | not started |
| **P5** | Orchestration + sandbox | agents actually run tasks (LangGraph/MAF/CrewAI + OpenHands/E2B), MCP/A2A, OTel/Langfuse | not started |

## Latest verification (D2)

`node design/prototype/verify.mjs` → 7/7 pass, and every check was observed failing for the right
reason before being trusted. Evidence: `../../_research/18-changes-implemented.md` §3, appended to
`THINGS_DONE.md`. Checkpoint: ``_research/checkpoints/company_ai_phase_d2_network_view.zip``.

## The decision-ready plan

`../19-plan-what-remains.md` is the current full answer: remaining scope, the code we take from which
repository and how it is adapted (depend / vendor / port / reference), phases P0–P5 with acceptance
criteria, and the next five actions. Keep this file as the tracker; that file is the detail.

## Next recommended step

Choose the build wedge (see `_research/11-build-strategy.md` §wedge) and start **P0**: scaffold
`apps/web`, wire the token pipeline from `design/tokens/company-os-pixel.json`, and add
`scripts/verify.sh` with the token/lint/test gates so every later phase inherits the governance
contract's enforcement (§3.4 of `GENERAL_GUI_AGENT_RULES.md`).

## Open decisions (need the user)

1. **Wedge:** organisation-first (Team + Network + Tasks) or cockpit-first (Inbox + Conversations)?
2. **Where the product repo/build lives** — same repo (`apps/`) or a new one that consumes `design/`?
3. **Avatar art:** normalise the 48- and 32-grid portrait sets (see `SUPPORTING_NOTES.md`), or
   commission a single-grid set from the designer?
4. **Backend for the network layout:** persist node positions per user (recommended) or per company?

## P0 status (2026-10-03)

**Built and green.** The workspace runs as one product: `packages/{tokens,contracts,company,gateway}`,
`services/api`, `apps/web`. The GUI is the designer's shell and screens — sidebar, topbar, status bar,
six views, four data states, decision inbox with rule + change + audit, budget meters fed by the
ledger, Arabic RTL, theme cycling — built only from the tokens.

The gate is `bash scripts/verify.sh` (9 steps: types, tokens-in-sync, lint, 51 tests, 9 GUI tests,
5 repository checks, build, 16 browser checks, the designer's 11 checks). Two defects were found by
using the product and are fixed and locked by tests: the budget meters read $0.00 because the seed
never moved money through the ledger, and the GUI could not resolve the shared packages because none
of them declared `exports`.

Next: P1 (the board's real interactions and the approval semantics carried by the inbox), starting
with a re-read of the four rule documents, per the standing instruction.
