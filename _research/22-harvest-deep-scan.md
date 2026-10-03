# 22 — Deep harvest scan: what exists, what we take, how we merge it

This merges the first scan (`15-code-harvest-plan.md`) with a second, deeper pass over everything the
product needs, and it answers the standing vision: **do not build what exists; take it, adapt it,
refactor it, restyle it, and connect it to the designed GUI — as one harmonious system.**

Everything below was checked in this session; licences are stated as found (checked 2026-10-03). When a
project's terms are unclear or dual, it is listed as **verify before vendoring** and blocked until then.

Reading order: §22.1 what changed since `15`, §22.2 the one stack, §22.3 the catalogue by layer,
§22.4 licence policy and traps, §22.5 how we merge without a Frankenstein, §22.6 what we must build
ourselves, §22.7 how it all lands on the designed GUI, §22.8 build order.

---

## 22.1 What changed since the first scan (`15`)

| Finding | Consequence for us |
|---|---|
| **tldraw is no longer open source** — custom licence, paid key required for production embedding ("not Open Source by any definition"). Excalidraw stayed MIT. [1][2] | tldraw: **read-only reference, never embed**. Excalidraw (MIT) is the embeddable sketch canvas if we want one. |
| **Daytona's core went closed-source in June 2026** (community fork: Nightona). | Do not depend on Daytona. Sandboxes = **E2B (Apache-2.0)** or **microsandbox (Apache-2.0)**. [3][4] |
| **Zep Community Edition was deprecated in 2025** — only the engine (Graphiti, Apache-2.0) self-hosts. | Memory = our own tables + pgvector, Graphiti only if temporal graph reasoning is needed. [5][6] |
| **Plane is AGPL-3.0**, not MIT. | Plane: UX reference only. Focalboard's licence is reported inconsistently (MIT vs AGPL) — treat as **reference only** until verified. |
| **Mastra is Apache-2.0** and TypeScript-first with built-in memory/RAG/workflows. [7][8] | A real alternative or companion to LangGraph.js for the run engine. |
| **Trigger.dev v4 is Apache-2.0 and self-hostable**; Temporal MIT. Inngest's server is not open. [9][10] | If we outgrow a Postgres job queue, Trigger.dev or Temporal — never Inngest. |
| **Assistant-UI (MIT)** and **Cult UI (MIT)** exist for exactly our chat + agent-approval surfaces. [11][12] | Chat and approval UI are weeks of work saved, restyled with our tokens. |
| **Langfuse core is MIT** and self-hostable; **Arize Phoenix is ELv2** (source-available). [13][14] | Observability = Langfuse (core) + OpenLLMetry (Apache-2.0) on OpenTelemetry. Phoenix: no code. |
| **RTL guidance is now explicit** (logical properties, `dir` in markup, Radix `DirectionProvider`, direction-aware icons). [15][16] | Arabic-first is a *day-one* architectural rule, not a translation pass. |

---

## 22.2 The one stack (the harmony contract)

One stack, one of each layer. If two libraries do the same job, one of them is not in the repo.

| Layer | Chosen | Licence | Mode | Why this one |
|---|---|---|---|---|
| App shell | React + TypeScript + Vite | MIT | depend | matches everything below; the prototype's logic is already plain JS |
| Styling | Tailwind CSS v4 | MIT | depend | logical utilities (`ms-`, `pe-`, `start-`) give RTL for free |
| Components | **shadcn/ui + Radix** | MIT | vendor (copy-in) | source-owned, so our pixel tokens restyle it completely; Radix `DirectionProvider` fixes dropdowns/popovers in RTL |
| Icons | Lucide | ISC | depend | one direction-aware wrapper for arrows/chevrons |
| Chat surface | **assistant-ui** | MIT | depend | Thread/Message/Composer/ActionBar primitives, streaming, tool-call rendering, approvals |
| Agentic UI extras | **Cult UI patterns** | MIT | port | approval cards, streaming text, expandable composer — adapted into our components |
| Network canvas | **React Flow (xyflow)** | MIT | depend | nodes are our own pixel components; pans/zooms/minimap solved |
| Force layout | **d3-force** | ISC | depend | already proven in our prototype's spacing system |
| Hierarchical layout | **dagre** | MIT | depend | org tree, report chains |
| Canvas interchange | **JSON Canvas** (`jsoncanvas`) | MIT | depend | the Obsidian-compatible format from `14` |
| Sketch/whiteboard (optional) | Excalidraw | MIT | depend | embeddable, no key; **not** tldraw |
| Server data | TanStack Query | MIT | depend | |
| Client state | Zustand | MIT | depend | |
| HTTP API | Hono (Fastify acceptable) | MIT | depend | small, typed, runs anywhere |
| Database | PostgreSQL + **pgvector** | PostgreSQL licence | depend | one database for everything (also our hosting constraint) |
| ORM/migrations | Drizzle | Apache-2.0 | depend | SQL-first, migrations in git |
| Auth | better-auth | MIT | depend | org/RBAC ready for the multi-tenant switch |
| Jobs / durability | **pg-boss** now → DBOS or Trigger.dev when long-running | MIT / Apache-2.0 | depend | one Postgres first; swap behind one interface |
| Agent runtime | **LangGraph.js** | MIT | depend | graph + checkpoints + `interrupt()` — the same shape as our approvals |
| Alt runtime | Mastra | Apache-2.0 | evaluate | batteries included (memory, RAG, workflows); decide at P5 |
| Domain model | paperclip (MIT), edict (MIT) | MIT | port | company/agent/task model, approval gate + task state machine |
| Model routing | **our gateway** with **LiteLLM** engine | MIT | depend | registry, fallbacks, budgets, per-key spend (`20` §20.1) |
| Memory | our tables + pgvector; **Graphiti** later | Apache-2.0 | depend later | temporal graph only if needed; Zep CE is gone |
| Tracing | OpenTelemetry + **Langfuse** (core) | MIT | depend | OTel GenAI conventions; self-hostable, data stays ours |
| Instrumentation | OpenLLMetry | Apache-2.0 | depend | vendor-neutral spans |
| Sandbox | **E2B** (Firecracker) or **microsandbox** (libkrun) | Apache-2.0 | depend | hardware isolation; self-host path documented |
| Protocols | MCP (P0 tools), A2A (P5 external agents) | Apache-2.0 SDKs | depend | `20` §20.2 |
| Voice | Web Speech API now → whisper.cpp later | MIT (verify at harvest) | depend | the demo already has voice notes |
| Tests + shots | Vitest, Playwright, axe-core | MIT / Apache-2.0 / MPL-2.0 | depend | Playwright also captures the README screenshots |

---

## 22.3 The catalogue — by layer, with what we actually take

Each entry: what it is → **what we take** → mode → where it lands in the GUI.

### Foundation
- **shadcn/ui** (MIT) — copy-in components over Radix. *Take:* behaviour + accessibility, then delete
  their look. *Mode:* vendor (source-owned). *Lands:* every screen.
- **better-auth** (MIT) — sessions, orgs, RBAC, providers. *Take:* auth core. *Mode:* depend.
  *Lands:* Settings → Access; company switcher when multi-tenant arrives.
- **Drizzle** (Apache-2.0) — schema + migrations. *Take:* as-is. *Mode:* depend.

### Organisation, tasks, approvals (the product's nouns)
- **paperclip** (MIT) — an AI-company domain model (agents as employees, roles, reporting). *Take:
  the concepts and table shapes*, reimplemented in our schema. *Mode:* port. *Lands:* Team, Tasks.
- **edict** (MIT) — review gate + task state machine. *Take:* the state machine and gate semantics.
  *Mode:* port. *Lands:* Tasks stages (Backlog/In progress/Review/Done), Inbox approvals.
- **Plane** (AGPL-3.0) — the closest UX to our task board. *Take:* screenshots/UX lessons only.
  *Mode:* reference. *Never:* code.
- **vibe-kanban** (MIT) — agent board UX. *Mode:* port patterns.
- **langflow / ChatDev** (MIT) — agent canvas UX. *Mode:* port patterns.

### Conversations
- **assistant-ui** (MIT) — chat primitives with streaming, tool calls, attachments, approvals.
  *Take:* the primitives, wired to our gateway; restyle 100% with `company-os-pixel.*`. *Mode:* depend.
- **Cult UI** (MIT) — agentic UI patterns. *Take:* approval card, streaming text, toolbar. *Mode:* port.
- **chat-components (miskibin)** — shadcn-registry chat parts. *Take:* patterns for reasoning/tool-call
  rendering. *Mode:* reference (licence stated in repo; verify before copying).

### Network view (our differentiator)
- **React Flow / xyflow** (MIT) — canvas engine. *Take:* viewport, panning, minimap, node handles.
  *Mode:* depend. Our `graph.js` spacing system (`footprint()`, `pack()`, department separation,
  even rings) becomes `packages/graph-layout` and drives the layout — that part stays **ours**.
- **d3-force** (ISC) + **dagre** (MIT) — physics and hierarchy. *Mode:* depend.
- **jsoncanvas** (MIT) — export/import JSON Canvas (Obsidian interop, `14`). *Mode:* depend.
- **Excalidraw** (MIT) — optional freeform layer. *Mode:* depend (optional). **tldraw: no** (paid).
- **elkjs** (EPL-2.0), **sigma.js** (MIT), **litegraph** (MIT) — reference only.

### Model layer
- **LiteLLM** (MIT) — the gateway engine behind our API. *Take:* provider adapters, fallbacks, spend
  tracking. *Mode:* depend (self-hosted, **image digest pinned** — there was a 2026 supply-chain
  incident on this project). *Lands:* Settings → Models, per-agent cost in Team.
- **OpenRouter** — hosted alternative; observability is logs only. *Mode:* optional provider.
- **Registry schema** — the 12 fields from `20` §20.1. *Mode:* **build ourselves** (nothing off the
  shelf fits).

### Memory / context
- **pgvector** — embeddings inside our Postgres. *Mode:* depend.
- **Graphiti** (Apache-2.0) — temporal knowledge graph. *Mode:* depend later (only if needed).
- **Mem0** (Apache-2.0) / **Letta** (Apache-2.0) — alternatives; Letta is a full runtime, heavy for us.
  *Mode:* reference/evaluate. **Zep CE:** gone (deprecated).

### Observability
- **OpenTelemetry GenAI semantic conventions** (Apache-2.0) — the span/attribute schema. *Mode:* depend.
- **Langfuse core** (MIT) — traces, evals, prompt versions. *Mode:* depend (self-hosted; EE folders are
  commercial — core only). *Lands:* Settings → Traces (admin), and the evidence panel in Inbox.
- **OpenLLMetry** (Apache-2.0) — auto-instrumentation. *Mode:* depend.
- **Arize Phoenix** (ELv2) — *reference only*, no code.

### Execution
- **E2B** (Apache-2.0) — Firecracker microVMs, ~150 ms boot, documented self-host path. *Mode:* depend.
- **microsandbox** (Apache-2.0) — self-hosted libkrun microVMs. *Mode:* depend (alternative).
- **Firecracker / gVisor** — primitives; only if we host our own fleet.
- **Modal, Daytona** — closed / closed-since-2026-06. *Mode:* no.

### Durability
- **pg-boss** (MIT) — Postgres job queue. *Mode:* depend (P0–P2).
- **DBOS** (library, Postgres-native) or **Trigger.dev v4** (Apache-2.0, self-host) — *Mode:* adopt when
  tasks outlive a request by days. **Temporal** (MIT) only if we ever need a worker fleet.
  **Inngest**: not open — do not depend.

---

## 22.4 Licence policy (enforced, not aspirational)

**Allowed to depend/vendor:** MIT, Apache-2.0, ISC, BSD-2/3, 0BSD, CC0, Unlicense, PostgreSQL.
**Allowed with care:** MPL-2.0 / EPL-2.0 — *unmodified, separate files only*; prefer porting the idea.
**Blocked:** AGPL/GPL/SSPL/BSL/fair-code/custom-commercial/no-licence/source-available-with-restrictions.

Gate (CI, fails the build):
1. `license-checker` (npm) + `pip-licenses` (python) run over the whole dependency tree;
2. a committed `THIRD_PARTY.md` listing every dependency, its licence and its URL;
3. every vendored file tree carries `SOURCE.md` (repo, commit, licence, what we changed);
4. a blocklist file so banned names cannot re-enter through a transitive dependency unnoticed.

**Known traps (as of 2026-10-03):** tldraw (paid production), Plane (AGPL), OpenProject (GPL),
n8n (fair-code), Dify (multi-tenant restriction), open-webui (branding clause), Phoenix (ELv2),
Zep CE (deprecated), Daytona (closed), Modal (closed), Focalboard (licence conflict — verify),
Huly (EPL — port only), Taiga (MPL — port only), `paperclipai/companies` (no licence — ideas only),
elkjs (EPL — reference only).

---

## 22.5 How we merge without a Frankenstein (adaptation recipes)

1. **Restyle layer, not logic.** Every third-party component is wrapped by one of our own components
   (`ui/*`), which is the only place tokens are applied. If a library ships its own theme, delete it.
   Nothing may render a colour, radius or font that is not in `company-os-pixel.*`.
2. **Adapters, not edits.** Where a library must be modified, we wrap it (`<PixelNode>` around React
   Flow's node, `ChatRuntime` around assistant-ui's runtime). If we must fork, it moves to `vendor/`
   with `SOURCE.md` and a one-line diff log.
3. **One shape for messages.** Our message record is A2A-shaped (`20` §20.2) and *both* internal and
   external agent traffic maps into it. assistant-ui renders that shape; nothing else stores a chat.
4. **One shape for work.** Task/agent/run states are ours (ported from edict/paperclip), and every
   library (LangGraph nodes, pg-boss jobs, sandbox sessions) maps into them — not the reverse.
5. **RTL first.** `dir` in the markup, logical properties everywhere, direction-aware icons through one
   wrapper, Radix `DirectionProvider` at the root. A component that breaks RTL is not merged.
6. **Refactor budget.** Each port gets a time-boxed refactor: strip what we do not use, rename to our
   vocabulary, add tests at the seam. If a port is not testable at the seam, it is not a port.
7. **Trace everything from day one.** OTel spans with GenAI attributes on every model call, tool call and
   agent hop; `trace_id` in every log line and in the UI's evidence panel.

---

## 22.6 What we must build ourselves (no shortcut exists)

1. **The organisation network view** — the editable org graph with department hulls and guaranteed
   spacing (our algorithm), attached to real agents and tasks. Nobody sells this.
2. **The model registry + lifecycle watch** — statuses, `deprecation_target`, dependency list per model,
   migration checklist (`20` §20.1).
3. **The decision inbox semantics** — why a recommendation was raised, what it costs, what changes if
   approved (policy diff), and the audit record.
4. **The unified conversation store** with per-message model provenance and `contextId` grouping.
5. **The token pipeline** — `design/tokens/company-os-pixel.json` → CSS variables → Tailwind theme →
   component library, with a check that fails on raw values anywhere.

---

## 22.7 How it lands on the designed GUI (six views + shell)

| GUI surface | Powered by | What we adapt |
|---|---|---|
| **Shell** (topbar, sidebar, company switcher, "+ New") | shadcn + Radix, our tokens | vendored components restyled; global action from the demo |
| **Team** | dagre (tree), our node cards, paperclip model | org tree, member cards, budgets, avatar sets (designer's art) |
| **Tasks** | edict state machine, pg-boss | four stages, drag board, run history per task |
| **Inbox** | LangGraph `interrupt()`, Cult UI approval card, edict gate | approval cards, diff view, bulk approve, audit trail |
| **Conversations** | assistant-ui + our gateway + conversation store | threads, model selector (from registry), provenance badge, voice notes, A2A later |
| **Network** | React Flow + d3-force + dagre + `packages/graph-layout` (ours) + JSON Canvas | the graph, filters, rings, export/import |
| **Settings** | better-auth, LiteLLM admin, Langfuse links | providers/keys, budgets, retention, appearance, tenancy |

---

## 22.8 Build order (aligned with `19` §19.4)

**P0** — repo scaffold + token pipeline + `scripts/verify.sh` (incl. licence gate) + Drizzle schema +
better-auth + **gateway/registry (LiteLLM behind our API)** + OTel/Langfuse wiring.
**P1** — shell, Team, Tasks, Inbox on the real stack (shadcn restyle, dagre tree, edict states, pg-boss).
**P2** — Conversations (assistant-ui + our gateway + conversation store + context manager) and cost
visibility.
**P3** — Network: port `graph.js` to `packages/graph-layout`, render with React Flow, JSON Canvas I/O.
**P4** — lifecycle watch, eval runs in CI, retention/export.
**P5** — orchestration (LangGraph.js + sandbox) and the A2A endpoint.

First clones (in `harvest/clone-all.sh` v2): xyflow, d3-force, dagre, jsoncanvas, shadcn-ui, radix-ui,
assistant-ui, cult-ui, better-auth, drizzle-orm, hono, pg-boss, langgraph (js), mastra, litellm,
opentelemetry + langfuse, openllmetry, graphiti, e2b, microsandbox, a2a-sdk, modelcontextprotocol,
paperclip, edict, vibe-kanban, langflow, chatdev, excalidraw.

---

## References

1. tldraw vs Excalidraw licensing (tldraw source-available, paid production). https://instapods.com/apps/excalidraw/vs/tldraw/
2. Excalidraw alternatives/analysis (MIT vs custom licence). https://codepic.cc/blog/excalidraw-vs-tldraw
3. Daytona vs E2B (isolation technology, self-host reality). https://northflank.com/blog/daytona-vs-e2b-ai-code-execution-sandboxes
4. Sandbox market: E2B Apache-2.0 self-host; Daytona core private since 2026-06; microsandbox. https://bex.co/blog/2026/09/14/ai-agent-sandbox-market-e2b-modal-daytona · https://dev.to/aiagentengineering/how-to-sandbox-ai-agents-in-2026-firecracker-gvisor-runtimes-isolation-strategies-14pk
5. Memory layers compared (Mem0, Zep/Graphiti, Letta, Cognee, licences and self-host status). https://thegenios.com/blog/open-source-memory-layers-2026/
6. Self-hosted memory systems (Zep CE deprecated; Graphiti Apache-2.0). https://hindsight.vectorize.io/blog/2026/08/11/open-source-agent-memory-systems
7. Mastra licence/build (Apache-2.0, TypeScript-first). https://starterpick.com/guides/best-ai-agent-framework-starter-kits-2026
8. TypeScript agent frameworks (AI SDK Apache-2.0, Mastra Apache-2.0, LangGraph.js MIT). https://fast.io/resources/best-ai-agent-frameworks-for-typescript-2026/
9. Durable execution engines (Temporal MIT, Trigger.dev Apache-2.0, Inngest server not open). https://labhub.hopto.org/blog/culture/2026-05-14-durable-execution-engines-2026-temporal-restate-inngest-trigger-dev-dbos-deep-dive-2026?lang=en
10. Durable workflows compared. https://upstash.com/blog/durable-workflow-engines-compared-every-major-option-in-2026
11. assistant-ui (MIT chat primitives). https://ai-tldr.dev/tools/assistant-ui/
12. Cult UI (MIT agentic patterns). https://www.shadcndeck.com/blog/shadcn-component-libraries
13. LLM observability tools and licences (Langfuse MIT core, Phoenix ELv2, OpenLLMetry Apache-2.0). https://openobserve.ai/blog/llm-observability-tools/
14. Langfuse self-hosting and OTel. https://langfuse.com/resources/engineering/langfuse-vs-datadog
15. RTL best practices: logical properties, Tailwind utilities, Radix DirectionProvider. https://skills.lc/alMubarmij/Arabic-Coding-Skills/almubarmij-arabic-coding-skills-arabic-rtl-best-practices-skill-md · https://dev.to/omerrkosar/beyond-translation-mastering-rtl-layouts-with-i18next-and-radix-ui-3159
16. RTL design rules (dir in markup, what flips and what does not). https://www.conveythis.com/blog/7-pro-strategies-for-rtl-design
