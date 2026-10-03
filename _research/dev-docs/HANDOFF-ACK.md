# Handoff accepted — what I read, what I found, what I fixed, what I need

**Date:** 2026-10-03 · **Repo:** `github.com/Ahmed-Sleem/company.ai` · **`main` is now at** `fe2bfaa`
(merge of PR #3) · **Written by:** the developer taking over from the previous one.

---

## 1. What I studied (so nothing is taken on trust)

I downloaded the repo fresh and read the whole thing, not the summary of it:

| Read | Notes |
|---|---|
| `_research/rules/` — all four documents | `UI Governance Contract.txt` (six laws, tokens, four data states, window system, a11y floor, wording rules, §18.2 "observe each new check failing"), `GENERAL_GUI_AGENT_RULES.md` (completion gate, verification duties, prohibited shortcuts, dependency discipline), `DEVELOPMENT_REQUIREMENTS.md` (clarify → plan → implement → validate → **log** → checkpoint), `DESIGN_SYSTEM.md` (structure mandatory, values superseded by the pixel tokens) |
| `design/` — README, tokens, prototype, gate, build script | the design contract, how the prototype is generated, what the gate checks and what it refuses to claim |
| `_research/` 00–23 + `dev-docs/` | feasibility, competitors, market, architecture, GUI inventory, reuse/licensing, features, strategy, the Obsidian study, harvest plans, demo review, implementation record, **the plan**, model/agent lifecycle, the decision log, the deep harvest scan, the publish guide |
| The code itself | `graph.js` (1219 lines: layout engine, packing, render, interaction, persistence), `graph.css`, `prototype-changes.css`, `build-prototype.py`, `verify.mjs`, `shots.mjs`, the demo's own shell/nav/theme/language wiring |

**The vision as I understand it:** one GUI where a human runs a company of AI employees and people —
task board and decision inbox, org tree, conversations with a visible model selector, and an
Obsidian-like network view of the whole company — bilingual EN/AR as a first-class layout, in the
designer's locked pixel style, built by **taking what exists and adapting it**, never from scratch.

**Where the project actually stands:** the design stage is finished and locked (demo byte-verified,
tokens extracted, prototype with the network view, rules classified, gate green). **No product code
exists yet.** The next phase is P0: monorepo, token pipeline, the gate script, the model registry +
gateway, and deploy-ready containers. Nothing is hosted, by your decision — deploy-ready only.

---

## 2. The rules I will work under (my working contract)

These are not aspirations; each one has a way of being checked.

1. **Tokens only.** Every colour, size, radius, shadow, duration resolves to
   `design/tokens/company-os-pixel.*`. Raw values fail the gate. A missing value becomes a token — not
   a one-off.
2. **The demo is untouchable.** `design/designer-demo/ai-company-os.html` stays byte-identical
   (blob `7dd2e203…`, verified again today). `design/prototype/company-os.html` is **generated** by
   `build-prototype.py` — never hand-edited; the gate compares it against a fresh build.
3. **RTL is structural.** Logical properties only (`margin-inline`, `inset-inline-*`,
   `text-align:start`); a physical `left`/`right` fails the gate. Everything is reviewed in Arabic.
4. **Four data states everywhere** data appears: loading, empty, error, no-permission (plus the
   demo's `restricted`).
5. **Never push without a green gate.** `node design/prototype/verify.mjs` (11 checks, no
   dependencies) + `node design/prototype/probe-browser.mjs` (7 checks, needs a browser).
6. **Every new check must be observed failing first** — before it is trusted.
7. **One definition per value, component and behaviour.** If two places need the same geometry or
   string, it moves into one function and both read it. This is also what the gate's token-agreement
   check enforces.
8. **Nothing overlaps, nothing floats over the canvas.** The network view's guarantees (footprint =
   radius + label band, packing at settle, department separation, hull labels clear of nodes) survive
   every refactor — and are now measured, not assumed.
9. **`_research/` stays deletable.** No product code may import from it.
10. **No secrets in the repo or in chat.** I used the token you pasted only for this session's
    git/API calls; it is not stored in any file, and the local clone's remote was reset to the plain
    URL afterwards. (It is still in this transcript — revoke it when convenient.)
11. **The four rule documents change only with your explicit approval.**
12. **Log everything.** Every round ends with an entry in `_research/dev-docs/THINGS_DONE.md`:
    date, files, behaviour, validation commands and results, limitations. Append-only.

**Documented deviations I inherited and keep** (recorded in `_research/rules/README.md`): radius `0`
instead of the contract's radius scale · 34px controls instead of 32px · native `<dialog>` +
`showModal()` kept · solid surfaces, no glass/blur · 130ms motion.

---

## 3. What I verified myself today — and the four defects I found

The previous developer was honest about the one gap he could not close: **no browser in his
environment**. This session has network and npm, so items 2 and 3 of the first-week list could be
done for real. I built the thing that was missing — a **browser probe** — and it immediately found
four defects that reading the code had not.

| # | What the browser measured | Fix |
|---|---|---|
| **F1** | With no saved view, the graph rendered at world scale: **20 of 22 nodes clipped** at every viewport (320 → 1920). `fitView()` existed but was wired only to the Fit button, double-click and the F key. | Fit on the first frame and again when the layout settles; re-frame on scope/layout switch and on resize; never override a restored view or a view the user framed themselves. |
| **F1b** | The **Rings** layout still overflowed the stage. The fit ignored the department hulls, and `--g-zoom-min:.45` clamped the fit before it could frame them. | `fitView()` now frames the hull boxes too; the zoom floor moved to `.25` (CSS token + JS fallback, still checked in step by the gate). |
| **F2** | A node was drawn **16px inside** a department's label band — the department name was painted over. | One shared box definition (`boxForList`/`hullBoxes`/`drawnHullBoxes`) used by the renderer, the packing pass and the gate; `clearLabelBands()` runs **inside** the packing loop. New gate check **8b**, observed failing first (16.0px, node `x:th1` on `Go to market`), then passing. |
| **F3** | **24px of horizontal page overflow at 320×568** from the two graph toolbars. | Below 540px the graph toolbars wrap, their rigid segmented groups may shrink, and the flex spacer is dropped. |
| **F4** | **20 controls narrower than 44px** on a coarse pointer (20×48 nav, 34×48 search/language, 36×48 segmented, 58×30 small buttons, 35px tree rows). | Change item **T1**: measured offenders raised to 48px in both axes, `@media(pointer:coarse)` only — desktop rendering is untouched. |

**What was already correct, now confirmed by measurement:** contrast (24 live token pairs × both
themes pass WCAG AA; worst is `--muted` on `--bg` at 5.23:1) and focus (every one of the first six
tab stops draws a visible ring). No token values needed changing.

**The 12-shot README gallery is in the repo** (`design/screenshots/`). The capture script had to be
repaired first: it guessed selectors, so five shots were skipped and two theme/language pairs came
out byte-identical because the app never actually changed state. It now drives the app's real
controls (`[data-nav]`, `[data-action=theme]`, `[data-action=language]`, `[data-g=layout]`), asserts
the state really changed, and waits for the layout engine to stop moving before shooting.

**Where the evidence lives:** `_research/18-changes-implemented.md` §3c (defect table + method),
`_research/dev-docs/THINGS_DONE.md` (the round's log), `design/prototype/README.md` (the fix table).

**Still honestly unverified:** screen-reader announcement order (needs a real screen reader), gesture
*feel* on a physical device, `forced-colors` rendering, browser zoom at 200%, long-session storage
growth. Both tools print their own NOT CHECKED lists so none of this can be mistaken for a pass.

---

## 4. The stack and the order of work (already decided — I am not re-opening it)

**One stack, one library per layer:** React + TypeScript + Vite · Tailwind v4 · shadcn/ui + Radix
(vendored, restyled 100% from our tokens) · assistant-ui (chat) · React Flow + d3-force + dagre +
JSON Canvas (canvas) · Hono + PostgreSQL + pgvector + Drizzle · better-auth · pg-boss · LangGraph.js
(orchestration) · **our own gateway with LiteLLM behind it** · OpenTelemetry + Langfuse · E2B or
microsandbox. Licence gate in CI from P0; blocked: AGPL/GPL/SSPL/BSL/fair-code/no-licence/paid
(tldraw, Plane, n8n, Dify, open-webui, Phoenix, Zep CE, Daytona, Modal …).

**Phases:** P0 foundation (monorepo, token pipeline, `scripts/verify.sh`, registry + gateway, deploy
ready) → P1 shell + Team/Tasks/Inbox → **P2 conversations + routing** (MVP ends here) → P3 network
view on the real stack → P4 decision trust + model lifecycle → P5 orchestration + sandbox + A2A.

**What we build ourselves because nothing off the shelf fits:** the organisation network view, the
model registry + lifecycle watch, the decision-inbox semantics (rule + diff + audit), the unified
conversation store with per-message model provenance, and the token pipeline.

---

## 5. What I need from you before the build goes deep

The plan lists these as open, with recommendations attached so they are cheap to answer. My
recommendations, for the record:

| # | Question | My recommendation |
|---|---|---|
| **C3** | Which model providers at P0? | OpenAI + Anthropic + **one cheap lane** (an open model via the gateway) — the registry and fallback chain only get honest with two very different providers plus one cheap one |
| **C4** | Who owns evals? | A small **golden set per agent type** that runs in CI whenever a model version changes |
| **C5** | Budget enforcement? | **Hard caps per agent and per task** in the gateway, with the demo's budget meter as the UI (report-only invites the classic fallback cost explosion) |
| **D1** | How visible are agent-to-agent chats? | Full thread with per-message provenance **plus a digest** and a "decisions only" filter |
| **D2** | Internal vs external agent comms? | Internal now through our orchestrator; **A2A endpoint at P5** with signed cards and per-peer tokens |
| **E1/E2** | Context + memory? | Budget + anchored compaction at **75%** + external memory (Postgres + pgvector) written when facts happen + masked tool output + pre-compaction snapshots |
| **E3** | Cost transparency? | Per employee, per task, per conversation, and "cost of delay" next to decisions — as the demo already shows |
| **F1–F6** | Designer details | Board stages stay `Backlog / In progress / Review / Done`; **no pixel numerals inside Arabic**; re-cut the 16 avatars at 48×48; keep six palettes + custom; prototype may open on Network if you prefer the wow-screen first; keep 2 MB attachments |

Nothing here blocks **P0**, which is scaffolding, tokens, the gate script, the schema and the deploy
files. I can start it immediately and fold your answers in as they arrive — the only piece P0 cannot
finish without you is which provider keys exist, and those are only needed at the gateway's first
live call.

---

## 6. My first move, unless you say otherwise

**Start P0** on the stack above, in this order, each step gated before the next:

1. Monorepo scaffold (`apps/web`, `packages/{ui,graph,company,contracts}`, `services/{api,orchestrator}`)
   with TypeScript strict + Vitest + ESLint + Prettier.
2. **The token pipeline**: `design/tokens/company-os-pixel.json` → CSS variables → Tailwind theme,
   plus a check that fails on any raw value — the same rule the prototype gate enforces, now across
   the real app.
3. `scripts/verify.sh` = format, lint, types, unit tests, token check, build, **licence gate** — the
   single command every later phase inherits (contract §16).
4. Drizzle schema + migrations (company, member/agent, edge, goal, task, run, ledger, decision,
   thread, message, model registry) — single-company first, every table carries `company_id`.
5. The **registry + gateway** skeleton: our thin API in front of LiteLLM (image digest pinned), run
   records with resolved model + cost + trace id, budget caps and fallback-rate alerts.
6. `docker-compose.yml` + Dockerfiles (app, PostgreSQL + pgvector, LiteLLM, Langfuse) and env
   examples — deploy-ready, nothing deployed.

Then P1 ports the prototype's screens, with `design/prototype/company-os.html` open beside them as
the visual reference, screen by screen, tokens only.

---

*Canonical location: this file (`_research/dev-docs/HANDOFF-ACK.md`). A copy of it is also handed to the owner as a session deliverable. Written by the successor developer on 2026-10-03, after reading the whole repository end to end.*
