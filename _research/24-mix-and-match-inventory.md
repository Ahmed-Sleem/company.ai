# 24 — Mix-and-match inventory: the exact donor files, verified

> **Why this document exists.** The owner's instruction (2026-10-03): *"before starting, search deeply
> and extensively — a lot of GitHub repos have code that can help us; instead of creating this project
> from scratch we can collect, mix and match, adapt, edit and merge code all over, to be faster and more
> accurate."*
>
> Document `22` did this at **library** level ("LiteLLM for the gateway"). This document goes one level
> deeper: **which file**. Every row names a donor, the licence GitHub reports for it, the exact paths
> worth reading, how it enters our product (depend / vendor / port / reference) and what has to change
> before it is ours. Nothing is repeated here that `22` already settled — the stack does not change.

**Run of the scan:** 2026-10-03 · **177 repositories** checked · **152** are both planned for use and
verified permissively licensed · **23** landed in the anomaly list (below) and were re-classified.
Raw evidence: `_research/data/harvest-scan-2026-10-03.json` (and `.md`), reproducible with
`_research/tools/harvest-scan.py`.

Legend — **✅ read** = the file was fetched and read in this pass; **📄 path** = the path is verified to
exist but the file was not read yet; **mode** = how it enters our product (§24.7).

---

## 24.1 What the deep pass changed (the honest headline)

1. **Four "obvious picks" are forbidden** — discovered mechanically, not by memory:
   `origin-space/originui`, `permify/permify`, `zitadel/zitadel` and `RedPlanetHQ/tegon` are **AGPL-3.0**.
   `rakshit087/obsidian-graph-react` — the single most tempting Obsidian-view donor — has **no licence
   file at all** (all rights reserved). All five are now `blocked` in the scan and appear here only as
   reading material.
2. **The network view stays ours.** With that donor excluded, the canvas layer is exactly what `22`
   already decided: xyflow + d3-force + dagre + jsoncanvas (MIT/ISC) plus *our* spacing system. The
   lockdown holds — no change of plan was needed, which is the best possible outcome of a scan.
3. **The decision inbox has real, permissive donors** that `22` did not know about: `sekera-radim/impri`
   and `agentkitai/agentgate` (both MIT). Their semantics are exactly the ones this product needs, and
   they are small enough to port rather than wrap (details in §24.3, "Inbox").
4. **The team/task schema is already written for us** — `paperclipai/paperclip`'s `agents` table
   (Drizzle/PostgreSQL, MIT) is read and confirmed in §24.3. It is the shape our P0 schema should
   follow, with our own names and one addition (per-model records).
5. **The four data states ship as tiny template files** in `shadcnblocks/kibo` (empty / error / skeleton),
   which is precisely the contract's requirement — take the pattern, restyle to tokens.
6. **The gateway question has a definitive answer** with verified licences (§24.5), and a subtlety that
   matters for the owner's chosen hard budget caps: our gateway sits **in the request path**, which is
   what makes hard caps enforceable — the closest donor's budget guard explicitly cannot do this.

---

## 24.2 Method (so any claim here can be re-checked)

| Stage | What it does | Command |
|---|---|---|
| `meta` | GitHub metadata for all 177 candidates: licence (SPDX, with the LICENSE text sniffed when GitHub reports none), stars, last push, archived flag | `GITHUB_TOKEN=… python3 _research/tools/harvest-scan.py meta` |
| `trees` | recursive file tree of every repo, filtered to component-ish paths | `… harvest-scan.py trees` |
| `fetch` | downloads the manifest's files for reading (`_research/tools/harvest-files.json`) — **19 repos, 38 files** | `… harvest-scan.py fetch` |
| `report` | writes the readable tables + the anomaly list | `… harvest-scan.py report` |

Outputs go to `~/harvest/scan/` — **outside the git repo**, as `15-code-harvest-plan.md` requires. A copy
of the summary is committed under `_research/data/` so the numbers in this document are auditable
without re-running anything.

**Licence verdicts are mechanical**: the GitHub SPDX identifier is trusted when it is a recognised
identifier; `NOASSERTION`/absent triggers a fetch of the LICENSE text and a keyword classification.
Two bugs were found and fixed by doing this for real: a sniffer ordering issue that misread MPL-2.0 as
GPL (MPL's own text cites the GPL), and five guessed owner names that do not exist — the scan resolves
names against the API rather than trusting the research notes.

---

## 24.3 The product board — by screen, with the exact donors

### Shell, sidebar, states (every screen inherits these)

| Need | Donor (licence) | Exact files / package | Mode | What we change |
|---|---|---|---|---|
| Components under every screen | `shadcn-ui/ui` (MIT) ✅ stack already | copy-in components | vendor | Restyle 100% from `company-os-pixel.*`; the demo's look wins |
| The four data states | `shadcnblocks/kibo` (MIT) ✅ read — `packages/patterns/empty/standard/empty-standard-1.tsx`, `…/alert/error/alert-error-1.tsx`, `…/skeleton/list/skeleton-list-1.tsx` | port | Keep the tiny composition (`Empty/EmptyHeader/EmptyMedia/EmptyTitle`, `Alert` with `border-destructive/80`), swap colours to tokens, add the 4th state (no-permission) Kibo does not ship |
| Loading that never blocks | `shadcn-ui/ui` skeleton + `magicuidesign/magicui` (MIT) 📄 | port | Reduce motion under `prefers-reduced-motion` (the demo's 130ms rule) |
| Toasts | `emilkowalski/sonner` (MIT) 📄 | depend | Tokens + RTL (`dir` aware) |
| Drawer (mobile shell) | `emilkowalski/vaul` (MIT) 📄 | depend | Logical properties only |
| Command palette | `pacocoursey/cmdk` (MIT) 📄 | depend | Arabic labels + RTL layout |
| Three-pane shell | `bvaughn/react-resizable-panels` (MIT) 📄 | depend | Persisted sizes; RTL-aware handle |
| Agentic UI patterns (approval card, streaming text) | `nolly-studio/cult-ui` (MIT) 📄 | port | We already have the approval card in the demo; take interaction details only |

### Team (org tree, people, agents)

| Need | Donor (licence) | Exact evidence | Mode | What we change |
|---|---|---|---|---|
| **Agent/employee table shape** | `paperclipai/paperclip` (MIT) ✅ read — `packages/db/src/schema/agents.ts` | port | Fields proved in the file: `reportsTo` (self-reference), `role`, `title`, `status` default `idle`, `capabilities`, `adapterType`, `adapterConfig` jsonb, `runtimeConfig` jsonb, **`budgetMonthlyCents`**, **`spentMonthlyCents`**, `pauseReason`/`pausedAt`, `errorReason`, `permissions` jsonb, `lastHeartbeatAt`, plus `unique(company_id, id)` and status/reportsTo indexes. We adopt this shape, rename to our nouns, add `model_id` + per-run records |
| Org tree rendering | `daniel-hauser/react-organizational-chart` (MIT) 📄 · `bkrem/react-d3-tree` (MIT) 📄 · `bumbeishvili/org-chart` (MIT) 📄 | depend / port | The demo's tree is already designed; use the library for layout only, keep our node component |
| Roles → structure | `rolebase` (concept, from the July 2026 comparison — repo not resolvable under the named owner, so **no code**) | reference | Role→accountability→chart idea only |
| Employee **definitions as content** | `markfulton/ai-employees` (MIT) ✅ read — root `AGENTS.md`, `employees/chief-of-staff/AGENTS.md`, `employees/sales-employee/work-profile.json` | port (content) | Their discipline is worth copying verbatim in spirit: `CONTRACT.md` laws, `ROLE.md`, **`SCHEDULE.md` as the single home for every clock time and budget**, `routines/<id>/SKILL.md`, a guard script that stops double-runs, `RELEASES.md` (a channel is released or it is not), and the rule *"it never invents a number; every figure carries the file or screen it was read from and the date"*. `work-profile.json` gives us a machine schema: `{objective, standup, reviewer, routines:{kind, expected_when, acceptance, fallback, recovery}}` |
| Team spend display | demo already has it; data from `LibreChat` (below) + our ledger | build | — |

### Tasks (board, stages, review gate)

| Need | Donor (licence) | Exact evidence | Mode | What we change |
|---|---|---|---|---|
| **Accessible board** | `janhesters/shadcn-kanban-board` (MIT) ✅ read — `registry/new-york/ui/kanban.tsx` | port | It ships what our contract demands: `announcements` per event, `aria-live={ariaLiveType}` with `aria-atomic`, `screenReaderInstructions`, a live region with `useId`. Port the announcement layer onto the board we design |
| Second board implementation | `Georgegriff/react-dnd-kit-tailwind-shadcn-ui` (MIT) 📄 | reference | Compare dnd-kit wiring; keep one, not two |
| Board component | `shadcnblocks/kibo` (MIT) ✅ read — `packages/kanban/index.tsx` | port | Composable primitives; restyle |
| Board from a real product | `usekaneo/kaneo` (MIT, ★9.3k) ✅ read — `apps/web/src/components/kanban-board/index.tsx` | reference | Column/board state handling, cache-version pattern |
| Agent-run-per-card UX | `BloopAI/vibe-kanban` (Apache-2.0) 📄 | reference | RUN/RUNNING/DIFF habits; our stages stay as designed |
| Closest overall UX (do **not** copy) | `makeplane/plane` (**AGPL**) · `RedPlanetHQ/tegon` (**AGPL**) | reference | Screenshots and lessons only |
| Drag layer | `clauderic/dnd-kit` (MIT) 📄 | depend | Keyboard + touch sensors on |

### Inbox (decisions, approvals, audit) — the product's soul

| Need | Donor (licence) | Exact evidence | Mode | What we change |
|---|---|---|---|---|
| **Decision commit semantics** | `sekera-radim/impri` (MIT) ✅ read — `server/src/interactive-decision.ts` | port | `commitInteractiveDecision()` returns `ok` / `already_decided` / `concurrent`, is project-scoped, idempotent, and handles the race where two approvers click at once via a UNIQUE constraint. It also separates `decisions.decided_by` (machine id, e.g. `tg:12345`) from `audit_log.actor` (human label) — exactly the audit discipline this product needs |
| **Policy precedence** | `agentkitai/agentgate` (MIT) ✅ read — `packages/server/src/lib/request-decision.ts` | port | Pure, unit-testable precedence: **budget overage → eval gate → dynamic override(deny/require approval) → static policy → pending**. This is our Review-Gate rule engine, in ~60 lines |
| **Budget/spend guard** | `agentkitai/agentgate` (MIT) ✅ read — `lib/agent-budget.ts`, `lib/agent-spend.ts` | reference | Their guard is explicitly *soft, cache-stale (30s), fails open* because the tool is **not in the completion path**. Ours will be in-path (§24.5), so hard caps are enforceable — their file documents exactly the trap we avoid |
| Decision dialog UX | `sekera-radim/impri` (MIT) ✅ read — `ui/src/components/DecisionDialog.vue`, `ui/src/composables/useKeyboardNav.ts` | reference | Keyboard nav is tested in their repo; ours is React + dnd patterns |
| Notification fan-out | `novuhq/novu` (MIT — verified from LICENSE text) 📄 | depend (later) | Decision-ready notifications across channels; not P0 |
| Policy as code (if we outgrow a table) | `openfga/openfga` (Apache-2.0) 📄 · `casbin/casbin` (Apache-2.0) 📄 · `open-policy-agent/opa` (Apache-2.0) 📄 | reference | Only if company-scoped rules multiply |

### Conversations (chat, model provenance, cost per message)

| Need | Donor (licence) | Exact evidence | Mode | What we change |
|---|---|---|---|---|
| Chat primitives | `assistant-ui/assistant-ui` (MIT) ✅ read tool-approval file | depend | Its `ToolCallMessagePart["approval"]` (with `approved`) and `projectAdkToolApprovals` are the shape our message parts use; restyle completely |
| Multi-provider chat product | `danny-avila/LibreChat` (MIT, ★42k) ✅ read `spendTokens.ts`, `MessagesViewContext.tsx`, `agents-types.ts` | reference | Message-context separation and agent typing; not a fork target |
| **Spend record fields** | same repo ✅ read — `packages/data-schemas/src/methods/spendTokens.ts` | port | The ledger writes `tokenType: 'prompt' \| 'completion'`, `model`, and uses a per-model price map (`endpointTokenConfig`) — our `run` rows carry the same |
| Streaming markdown | `vercel/streamdown` (planned MIT; path not found at the guessed location — **verify before use**) · `remarkjs/react-markdown` (MIT) · `shikijs/shiki` (MIT) ✅ | depend | Code blocks in messages, tokens for colours |
| Agent chat with a graph backend | `langchain-ai/agent-chat-ui` (MIT) 📄 | reference | Minimal client over LangGraph; closest to our data flow |
| Resumable streams | LibreChat pattern (reference) | port (idea) | If a socket drops mid-answer the user must not lose the message |

### Network (the differentiator — no donor for the layout itself)

| Need | Donor (licence) | Evidence | Mode | What we change |
|---|---|---|---|---|
| Canvas engine | `xyflow/xyflow` (MIT) ✅ read `system/src/utils/graph.ts`, `react/src/components/A11yDescriptions/index.tsx` | depend | Their fit/transform utilities confirm our own fitView math; their accessibility description component is the pattern for our canvas description (`role=application`, described-by) |
| Physics | `d3/d3-force` (ISC) ✅ read `src/simulation.js` | depend | Real parameters verified: `alpha=1 → alphaMin=0.001`, `velocityDecay=0.6`, `forces: Map`, `dispatch("tick","end")`. Our settle detection can key off the same `end` event rather than polling |
| Hierarchy layout | `dagrejs/dagre` (MIT) ✅ | depend | Tree-shaped scopes |
| Graph metrics | `graphology/graphology` (MIT) 📄 + `jacomyal/sigma.js` (MIT) 📄 | depend | Centrality/communities for "who is overloaded", plus a WebGL path for very large companies |
| Format interop | `obsidianmd/jsoncanvas` (MIT) — spec text not at the guessed path; package is what we depend on | depend | Import/export `.canvas` (doc `14`) |
| Our spacing guarantees | **ours** — `packages/graph-layout` (from the prototype's `footprint()`/`pack()`/hulls) | build | No donor exists; this is the moat |
| Reference only | `excalidraw/excalidraw` (MIT) 📄 · `antvis/G6`/`X6` (MIT) 📄 · `jagenjo/litegraph.js` (MIT) 📄 · `tldraw` (**blocked**) | reference | Interaction ideas; tldraw code is forbidden |

### Settings → Models, spend, traces, access

| Need | Donor (licence) | Evidence | Mode | What we change |
|---|---|---|---|---|
| Gateway engine | **LiteLLM** (MIT) — see §24.5 | depend | Image digest pinned (supply-chain incident in 2026) |
| Model catalogue + selector | LibreChat `/models` endpoints, presets (MIT) 📄 | port (idea) | Ours must show per-agent pinning, cost/1k, deprecation — the 12 registry fields from doc `20` §20.1 |
| Cost dashboards | `tremorlabs/tremor` (Apache-2.0/MIT per repo) 📄 blocks · `Helicone/helicone` (Apache-2.0) 📄 | depend / reference | Tremor for the panels; Helicone's per-property attribution model as our query shape |
| Metering (if billing ever arrives) | `openmeterio/openmeter` (Apache-2.0) 📄 | reference | Only if per-seat billing lands |
| Traces | `langfuse/langfuse` (MIT core) 📄 · `traceloop/openllmetry` (Apache-2.0) 📄 · `comet-ml/opik` (Apache-2.0) 📄 | depend | Langfuse core only (EE folders excluded) |
| Access / roles | `better-auth/better-auth` (MIT) ✅ read — `plugins/organization/access/statement.ts` | depend | Verified statements: `organization`, `member`, `invitation`, `team`, `ac` with `adminAc`/`ownerAc`/`memberAc` — extend with `decision:approve`, `agent:hire`, `budget:set` |
| Secrets with approvals | `Infisical/infisical` (MIT) 📄 | reference | The approval-gated flow we mirror for budget changes |

---

## 24.4 The engine room — orchestration, memory, execution, durability

| Need | Donor (licence) | Evidence | Mode | What we change |
|---|---|---|---|---|
| **Human-in-the-loop** | `langchain-ai/langgraphjs` (MIT) ✅ read `libs/langgraph-core/src/interrupt.ts` | depend | Verified semantics: `interrupt(value, { responseSchema })` pauses a node; the graph resumes with `Command({ resume })`; multiple interrupts run sequentially; a Zod schema both describes and **validates** the resume value; it propagates by throwing `GraphInterrupt` (never wrap in try/catch). This is our Review Gate: the proposal is the interrupt value, the human's answer is the resume value |
| Orchestration (Python lane) | `langchain-ai/langgraph` (MIT) 📄 | depend | Same semantics on the Python side |
| Alternative engine | `mastra-ai/mastra` (Apache-2.0 per repo) 📄 — `packages/core/src/workflows/workflow.ts` is 211 KB | reference | Cross-check only; one engine, not two |
| Enterprise agent patterns | `microsoft/agent-framework` (MIT code, CC-BY docs) 📄 · `OpenAI/openai-agents-js` (MIT) 📄 · `microsoft/autogen` (MIT code, CC-BY docs) 📄 | reference | Handoff/guardrail shapes |
| Durability (P0–P2) | `timgit/pg-boss` (MIT) 📄 | depend | Simplest Postgres queue; no new service |
| Durability (later) | `dbos-inc/dbos-transact-ts` (MIT) 📄 · `triggerdotdev/trigger.dev` (Apache-2.0) 📄 | reference | When tasks outlive requests by days |
| Vector memory | `pgvector/pgvector` (PostgreSQL licence) 📄 | depend | Embeddings inside our database |
| Temporal knowledge | `getzep/graphiti` (Apache-2.0) ✅ read `search_config_recipes.py` | reference | Its "recipes" are named search strategies (e.g. recent facts vs broad recall) — a good vocabulary for our context assembler |
| Memory pipeline | `mem0ai/mem0` (Apache-2.0) 📄 · `letta-ai/letta` (Apache-2.0) 📄 | reference | Heavier than we need at P0 |
| Sandboxes | `e2b-dev/E2B` (Apache-2.0) ✅ read `packages/js-sdk/src/sandbox/index.ts` | depend | Self-host path; microsandbox as the alternative |
| Notifications in dev | `axllent/mailpit` (MIT) 📄 | depend | Capture decision emails in tests |
| Product analytics | `PostHog/posthog` (MIT core) 📄 · `umami-software/umami` (MIT) 📄 | reference | PostHog EE folders excluded |

---

## 24.5 The gateway — answered with evidence

The owner said: *"there are pre-made gateways we can use directly that handle this well."* Correct, and
this is the one place where the deep scan changes a decision's **detail** without changing the stack:

| Gateway | Licence (verified) | Strength | Cost | Verdict |
|---|---|---|---|---|
| **LiteLLM** | **MIT** | 100+ providers, spend tracking, virtual keys, budgets — and it is **in the request path** | Python overhead; self-hosted | **Primary.** Confirmed by reading `litellm/proxy/auth/budget_throttle.py`: over-budget keys are **hard-blocked by default**; throttling is opt-in. That is exactly the owner's chosen cap policy |
| Bifrost (Maxim) | Apache-2.0 | Go, ~µs overhead, MCP governance included | Younger project | **Watch.** If gateway latency ever matters, this is the swap — same OpenAI-compatible surface |
| Helicone | Apache-2.0 | Best-in-class logs/cost attribution per property | Maintenance mode since 2026-03 | **Reference for our cost queries**, not the router |
| Portkey gateway | MIT core | Guardrails, PII redaction, caching | Managed-first; self-host is enterprise | Optional provider, not our core |
| OpenRouter | hosted, not open | 400+ models, zero infra | 5.5% credit fee; logs only | Fallback for models we cannot get directly |

**The subtlety that matters:** the donor closest to our decision inbox (`agentkitai/agentgate`) documents
that its budget guard is soft and fails open *because it is not in the completion path*. Our architecture
puts the gateway in the path, so the owner's hard caps (C5) are genuinely enforceable: the run never
reaches the provider when the cap is hit, and a **decision** is raised instead of a silent failure.
That behaviour becomes a gate check in P0 (a run over cap must produce a decision record, not an error).

---

## 24.6 What still has no donor — we build these

1. **The organisation network view's layout and guarantees** — footprint, packing, department hulls,
   label bands, fit rules. (`xyflow` gives canvas mechanics; the guarantees are ours.)
2. **The decision semantics of this product** — the four-part decision record (rule + diff + audit +
   outcome) with the demo's Inbox states. `impri`/`agentgate` give the mechanics; the meaning is ours.
3. **The model registry** — pinning, deprecation watch, fallback chains, per-agent assignment
   (12 fields, doc `20` §20.1).
4. **The unified conversation store** with per-message model provenance across human↔agent and
   agent↔agent threads.
5. **The token pipeline** from `company-os-pixel.json` to CSS/Tailwind/TS + the raw-value ban.
6. **The company-scoped schema** — paperclip's table shapes, our nouns, plus runs/decisions/ledger.

---

## 24.7 Merge discipline (how a donor file becomes ours)

Extends `22` §22.5; the rule is one donor per component, adapted — never two components glued.

1. **Pick once.** The table above names the donor for each need. A second donor is only a *reference*.
2. **Bring it in as text, not as a dependency**, unless the mode column says *depend*. Vendored code is
   ours to restyle, and its licence text goes to `THIRD_PARTY.md` with the commit it came from.
3. **Restyle from tokens.** No donor colour or size survives: every value maps to a
   `company-os-pixel.*` token. If a value has no token, the token is added first (owner-approved).
4. **RTL pass.** Logical properties only; every ported component is inspected in Arabic before merge.
5. **Four states.** Anything that fetches data must render loading / empty / error / no-permission.
6. **A11y pass.** Keyboard path + announcements (the kanban donor's announcement layer is the model).
7. **Observed-failure rule.** A new behaviour ships with a check that was seen failing first (§18.2).
8. **Log it.** One line in `18-changes-implemented.md` per component: donor, commit, files, what changed.

---

## 24.8 Licence ledger and the anomaly list

Verified-permissive donors in this document: shadcn/ui, kibo, magicui, cult-ui, sonner, vaul, cmdk,
react-resizable-panels, assistant-ui, LibreChat, streamdown, react-markdown, shiki, dnd-kit,
shadcn-kanban-board, kaneo, vibe-kanban, xyflow, d3-force, dagre, graphology, sigma.js, jsoncanvas,
excalidraw (reference), G6/X6 (reference), litegraph (reference), paperclip, react-organizational-chart,
react-d3-tree, d3-org-chart, ai-employees, impri, agentgate, novu (MIT from LICENSE text), better-auth,
openfga, casbin, opa, langgraph/langgraphjs, mastra, agent-framework, openai-agents-js, autogen (MIT
code), pg-boss, dbos, trigger.dev, pgvector (PostgreSQL), graphiti, mem0, letta, E2B, microsandbox,
langfuse (core), openllmetry, opik, PostHog (core), umami, tremor, style-dictionary, tokens-studio,
tailwind, postcss, i18next, next-intl, playwright, vitest, pixelmatch, testcontainers, msw, storybook,
faker, meilisearch, orama, seaweedfs, react-email, mailpit, fumadocs/nextra/starlight, expo, tauri,
react-native, MCP, A2A, AG-UI.

**Anomalies that changed a plan (all blocked from code use):**

| Repo | Reality | Was planned as |
|---|---|---|
| `origin-space/originui` | AGPL-3.0 | take → **blocked** |
| `permify/permify` | AGPL-3.0 | take → **blocked** |
| `zitadel/zitadel` | AGPL-3.0 | take → **blocked** |
| `RedPlanetHQ/tegon` | AGPL-3.0 | take → **blocked** (reference) |
| `rakshit087/obsidian-graph-react` | no licence file | take → **blocked** |
| `makeplane/plane` · `minio/minio` · `plausible/analytics` | AGPL-3.0 | blocked (unchanged) |
| `typesense/typesense` | GPL-3.0 | blocked (unchanged) |
| `TypeCellOS/BlockNote` · `dequelabs/axe-core` · `hcengineering/platform` | MPL-2.0 / EPL-2.0 | weak-copyleft: unmodified separate files only; axe-core as an npm dev-dependency is fine |
| `daytonaio/daytona` · `paperclipai/companies` | no licence file | blocked (unchanged) |
| `open-webui` · `n8n` · `tldraw` | custom/restrictive | blocked (unchanged) |
| `formatjs/formatjs` | no root licence (Bazel monorepo, 2026 restructure) | reference — use the `intl-messageformat` package instead |
| `weaviate/weaviate` | mixed BSD-3 + Weaviate licence | reference — prefer pgvector/qdrant |
| `google/fonts` | OFL per family (`ofl/<family>/OFL.txt`) | take, per family — Plex Sans Arabic, Noto, Cairo |
| `microsoft/autogen` | MIT for code (`LICENSE-CODE`), CC-BY-4.0 for docs | take the code only |
| `pgvector/pgvector` | PostgreSQL licence text | take |

`THIRD_PARTY.md` at the repository root now carries the ledger of what we actually bring in; the CI
licence gate (P0) fails the build on anything not listed there.

---

## 24.9 Reproducing this

```bash
# the scan (network + a GitHub token; nothing is written into the repo tree)
GITHUB_TOKEN=… python3 _research/tools/harvest-scan.py meta
GITHUB_TOKEN=… python3 _research/tools/harvest-scan.py trees
GITHUB_TOKEN=… python3 _research/tools/harvest-scan.py fetch     # ~45 files for reading
python3 _research/tools/harvest-scan.py report
# the donors themselves, side by side outside the repo (reading material, never committed)
bash _research/harvest/clone-all.sh ~/harvest
```

---

## 24.10 What this changes in the plan (doc `19` §19.4) — the delta

| Phase | Before this scan | Now |
|---|---|---|
| P0 | schema from doc `20` §20.1 + paperclip *concepts* | schema follows the **verified** paperclip `agents` shape; add `THIRD_PARTY.md` + licence gate; budget-cap behaviour becomes a gate check |
| P0 | gateway = "LiteLLM behind our API" | confirmed with the hard-block default read in the source; Bifrost noted as the latency swap |
| P1 | board "dnd-kit + shadcn" | board takes **kibo** primitives + the **kanban a11y announcement layer**; four-state templates from kibo patterns |
| P1 | inbox "rules + diff + audit" | precedented by **agentgate**'s pure precedence function + **impri**'s idempotent commit and audit split |
| P2 | conversations with provenance | message parts follow **assistant-ui**'s approval model; ledger rows follow **LibreChat**'s `spendTokens` fields |
| P1–P2 | agent roles unspecified | roles seeded from **ai-employees** discipline (SCHEDULE.md single-source-of-truth, receipts, no invented numbers) |
| P3 | network view on xyflow | unchanged — and now **proven** to be the only path, since the tempting donor has no licence |

Nothing here moves the stack, the phases or the design. It makes each step **cheaper and better-sourced**.

---

## 24.11 Still unscanned (the next deep pass, when it matters)

- **File-level pass on the remaining shortlist** — ~25 repos have verified trees but unread files
  (`xyflow` example apps, `tremor` panels, `kaneo` server routes, `vibe-kanban` run UI, `graphology`
  metrics, `style-dictionary` transforms, `ag-ui` event types).
- **MCP connector implementations** (`modelcontextprotocol/servers`, MIT) — the first 8 connectors
  (files, HTTP, git, shell, SQL, search, browser, mail) will be harvested when P5 wiring starts.
- **Arabic-first UI evaluation** — no donor found yet that ships a genuinely RTL-native dashboard;
  our own demo remains the reference. Worth a dedicated scan before P1 styling.
- Quarterly re-scan of the orchestrator index
  (`Agent-Analytics/awesome-multi-agent-orchestrators`) — the field moves monthly.
