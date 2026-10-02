# 15 — Code harvest plan: download, reuse, merge into one system

The user's instruction: **do not start from scratch** — download and reuse what exists, edit and merge
it, and organise everything into one unified system. This document is the operational plan for that.

> ⚠️ **Golden rule:** only **MIT / Apache-2.0 / BSD / ISC** code enters the product.
> Everything else is *read-only inspiration*. Harvest scripts clone into **`~/harvest/` (outside the
> repo)** — never into git — so the repository stays clean and small.

## 15.1 Harvest list (verified licences, 2026-10-02)

### Tier 1 — take code from these (permissive)

| Repo | ★ | Licence | Take | Into |
| --- | --- | --- | --- | --- |
| `xyflow/xyflow` (React Flow) | 38,564 | MIT | Canvas engine, viewport, handles, minimap | `packages/canvas` |
| `d3/d3-force` | 2,002 | ISC | Physics simulation (run in worker) | `packages/graph` |
| `pixijs/pixijs` | — | MIT | WebGL renderer for large graphs | `packages/graph` |
| `vasturiano/react-force-graph` | 3,317 | MIT | Ready-made force graph (2D/3D) | `packages/graph` |
| `dagrejs/dagre` | 5,810 | MIT | Hierarchical layout for the org tree | `packages/canvas` |
| `cytoscape/cytoscape.js` | 11,229 | MIT | Graph algorithms (PageRank, clusters), stable layouts | `packages/graph` |
| `obsidianmd/jsoncanvas` | 3,708 | MIT | Board file format + spec implementations | `packages/contracts` |
| `shadcn-ui/ui` | 124,973 | MIT | App shell, lists, forms, dialogs, RTL-ready components | `apps/web` |
| `better-auth/better-auth` | 30,147 | MIT | Auth, sessions, org/RBAC base | `services/api` |
| `paperclipai/paperclip` | 95,837 | MIT | **Domain model**: org chart, roles, reports-to, budgets, approvals, heartbeats, skills, audit; adapters design; API reference | `packages/company` (re-implement) |
| `langchain-ai/langgraph` | 42,585 | MIT | Durable orchestration engine (checkpoints, HITL) | `services/orchestrator` |
| `crewAIInc/crewAI` | 59,271 | MIT | Role/goal/backstory model, hierarchical manager process | `services/orchestrator` |
| `microsoft/agent-framework` | 13,899 | MIT | Enterprise engine + A2A/MCP native | `services/orchestrator` (optional) |
| `langflow-ai/langflow` | 155,441 | MIT | Visual-builder UX reference (canvas, node palette, inspector) | `packages/canvas` (patterns) |
| `Arturski/crew-ai-studio` | 3 | Apache-2.0 | **Studio feature blueprint**: 103 tools, MCP browser, evals, cost tracking, HITL, secrets vault, code export, dry-run | `packages/studio` (port features) |
| `OpenBMB/ChatDev` (+ DevAll) | 34,432 | Apache-2.0 | Zero-code drag-drop canvas patterns (Vue) + replay visualiser | `packages/canvas` (patterns) |
| `All-Hands-AI/OpenHands` | 89,747 | MIT | Sandboxed agent runtime, delegation, web GUI | `services/sandbox` |
| `BloopAI/vibe-kanban` | 28,234 | Apache-2.0 | Kanban + worktree-per-task UX patterns | `apps/web` (patterns) |
| `cft0808/edict` | 16,963 | MIT | Mandatory review gate + 9-state task machine + audit stream | `packages/company` |
| `a2aproject/A2A` | 25,987 | Apache-2.0 | Agent-to-agent delegation protocol | `packages/protocols` |
| `modelcontextprotocol/*` | 90,938 | MIT (spec) | Tool/data connectors (server licences vary) | `packages/protocols` |
| `e2b-dev/E2B` | 14,088 | Apache-2.0 | Code-execution sandboxes | `services/sandbox` |
| `vercel/ai` | 27,079 | ⚠️ "Other" (Apache-2.0 + notices) | Model streaming helpers — **verify terms before shipping** | `services/api` |

### Tier 2 — read-only reference (custom or weak-copyleft licences)

| Repo | Licence | Use it for | Do NOT |
| --- | --- | --- | --- |
| `langgenius/dify` | ⚠️ custom (multi-tenant/white-label restrictions) | UX reference for workflow UI | copy code into a hosted product |
| `flowiseai/Flowise` | ⚠️ custom (Apache + Commons-Clause style) | node palette ideas | copy code / rebrand |
| `open-webui/open-webui` | ⚠️ custom (branding clause) | chat UI ideas | ship the code |
| `lobehq/lobehub` | ⚠️ custom | multi-agent chat UX | ship the code |
| `langfuse/langfuse` | ⚠️ "Other" (open-core) | observability ideas | assume MIT |
| `Arize-ai/phoenix` | ⚠️ "Other" | eval/trace ideas | assume MIT |
| `stravu/crystal` | MIT | parallel-session UX | — (deprecated anyway) |
| `kieler/elkjs` | ⚠️ EPL | layered layout ideas | modify & ship without legal check |
| `Pane`, `Markus` | ⚠️ AGPL-3.0 | concepts only | any code reuse |
| `n8n` | ⚠️ Sustainable Use | inspiration | any reuse |

### Tier 3 — content, not code

| Repo | Licence | Note |
| --- | --- | --- |
| `paperclipai/companies` | ❌ **no licence file** → all rights reserved | Template *ideas* only (GStack, Agency Agents, Game Studio…). Do not copy text/structure. |
| `skills.sh` registry | varies per skill | Check each skill licence before bundling |

## 15.2 Target monorepo layout (where harvested code lands)

```
company.ai/
├── apps/
│   └── web/                 # Next.js app: org canvas, board, chats, graph (React Flow + Pixi)
├── packages/
│   ├── canvas/              # React Flow wrappers, layouts (dagre), node/edge types
│   ├── graph/               # d3-force worker + Pixi renderer (Obsidian-style network)
│   ├── company/             # domain model: agents, edges, goals, budgets, approvals, ledger
│   ├── contracts/           # JSON Canvas, JSON schemas, API types
│   ├── protocols/           # MCP + A2A clients
│   └── studio/              # tools catalog, evals, cost tracking, secrets vault (from Crew AI Studio)
├── services/
│   ├── api/                 # REST/WS, auth, tenancy
│   ├── orchestrator/        # LangGraph/CrewAI execution, heartbeats
│   └── sandbox/             # OpenHands/e2b/Docker runners
├── vendor/                  # third-party code kept VERBATIM + its LICENSE + SOURCE.md (commit SHA)
└── THIRD_PARTY_LICENSES.md
```

## 15.3 Merge workflow (repeatable)

1. **Clone outside the repo** — `~/harvest/<repo>` (script in `harvest/clone-all.sh`).
2. **Record provenance** — commit SHA + licence + upstream URL → `vendor/SOURCE.md` and
   `THIRD_PARTY_LICENSES.md`.
3. **Choose one of three integration modes:**
   - **Depend** (preferred): use the published package (`reactflow`, `d3-force`, `dagre`, `langgraph`, …).
   - **Vendor**: copy the needed module verbatim into `vendor/`, never edit it; wrap it in our own code.
   - **Port**: re-implement the *pattern* in our codebase (used for Paperclip's domain model, DevAll's
     canvas, Crew AI Studio's features) — no copied lines, but cite the inspiration.
4. **License gate in CI** — fail the build if a dependency is not MIT/Apache-2.0/BSD/ISC.
5. **Attribution page** — visible "built on open source" list (good faith + marketing).

## 15.4 What we take from each key project (one line each)

- **Paperclip (MIT)** → the *company domain model*: agents as employees, reports-to, heartbeats, budgets
  with auto-pause, approvals, skills, audit. We re-implement it and add the canvas + goals + Arabic.
- **ChatDev 2.0 / DevAll (Apache-2.0)** → proof and patterns for a **zero-code drag-drop canvas** with
  YAML/Python export.
- **Crew AI Studio (Apache-2.0)** → the **studio feature checklist** (tools catalog, MCP browser, evals,
  schedules, cost tracking, HITL, dry-run, secrets vault) — port the features, not the fragile code.
- **LangGraph / CrewAI (MIT)** → the **engine**; we do not write our own orchestrator.
- **OpenHands / e2b (MIT / Apache-2.0)** → the **execution sandbox**.
- **React Flow + d3-force + PixiJS (MIT/ISC)** → the **visual system** (org canvas + Obsidian-style
  network).
- **JSON Canvas (MIT)** → **file format** for boards/export, so users are never locked in.
- **Edict (MIT)** → the **mandatory review gate** before execution.
- **MCP + A2A** → **connections** (tools) and **delegation** (across companies).

## 15.5 Anti-goals

- ❌ No vendored code from Dify/Flowise/n8n/LobeHub/open-webui/AGPL projects.
- ❌ No copying of `paperclipai/companies` content (unlicensed).
- ❌ No editing inside `vendor/` — wrap instead.
- ❌ No storing harvested repos inside the git repo (size + licence risk).
- ❌ No "framework of frameworks": exactly **one** orchestration engine in production, chosen by config.
