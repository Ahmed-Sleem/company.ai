# Third-party code and dependencies

This file is the **licence ledger**. Every third-party piece that enters this repository — as a
dependency, a vendored file, or ported code — is listed here with its licence and the mode it was
brought in under. The CI licence gate (added in phase P0) fails the build when a dependency is not
listed here, when a listed licence changes, or when a blocked licence appears in the lockfile.

**Policy** (from `_research/22-harvest-deep-scan.md` §22.4, unchanged):

| Verdict | Licences | Rule |
|---|---|---|
| Allowed | MIT, Apache-2.0, ISC, BSD-2/3-Clause, 0BSD, CC0, Unlicense, PostgreSQL, OFL | depend / vendor / port freely |
| With care | MPL-2.0, EPL-2.0 | **unmodified, separate files only**; prefer porting the idea |
| Forbidden | AGPL, GPL, LGPL, SSPL, BUSL, Elastic-2.0, fair-code, "open" licences with branding or field-of-use limits, **and anything with no licence file** | never enters the product; reading for ideas only |

Contract notes: MPL-2.0 software used **unmodified** as a dependency (e.g. a test tool) does not
propagate; its files are never edited. No licence file means all rights reserved — a repository without
one is treated as forbidden, however useful it looks.

---

## Status

**No third-party code has entered the product yet.** The design stage produced a prototype whose only
dependencies are the designer's demo (first-party) and `playwright` for verification tooling. The
entries below are the **planned** set, verified on 2026-10-03 by
`_research/tools/harvest-scan.py` (177 repositories scanned, 152 cleanly permissive; evidence in
`_research/data/harvest-scan-2026-10-03.json`). Each becomes binding when it first appears in a
lockfile or a source file — at which point the row gains the commit and the exact path.

### Tooling already in use (development only, never shipped)

| Package | Licence | Use | Shipping? |
|---|---|---|---|
| `playwright` (microsoft/playwright) | Apache-2.0 | browser probe + screenshot gallery | no — devDependency |

### Planned dependencies (added at the phase shown)

| Package / project | Licence | Mode | Phase | What it is for |
|---|---|---|---|---|
| shadcn/ui · Radix Primitives · Base UI | MIT | vendor (copy-in) | P1 | component base, restyled from tokens |
| Kibo UI (`shadcnblocks/kibo`) | MIT | vendor / port | P1 | kanban, gantt, editor primitives; empty/error/skeleton patterns |
| dnd-kit | MIT | depend | P1 | board drag layer (keyboard + touch) |
| TanStack Table · TanStack Virtual | MIT | depend | P1 | tables and long lists |
| Recharts · Tremor | MIT / Apache-2.0 | depend | P1 | cost and usage panels |
| sonner · vaul · cmdk · react-resizable-panels · lucide-react | MIT / ISC | depend | P1 | toasts, drawer, palette, panes, icons |
| Fraunces / IBM Plex Sans Arabic (google/fonts, ibm/plex) | OFL-1.1 | vendor (font files) | P1 | typography, EN + AR |
| better-auth | MIT | depend | P0 | sessions, organisations, RBAC |
| Drizzle ORM | Apache-2.0 | depend | P0 | schema + migrations |
| Hono | MIT | depend | P0 | API framework |
| `pg-boss` | MIT | depend | P0 | Postgres job queue |
| zod · react-hook-form | MIT | depend | P1 | validation + forms |
| i18next (or the message model of next-intl) | MIT | depend | P1 | EN/AR strings |
| assistant-ui | MIT | depend | P2 | chat primitives (streaming, tool calls, approvals) |
| assistant-stream / streamdown (verify package licence at adoption) | MIT | depend | P2 | streaming render |
| react-markdown · shiki | MIT | depend | P2 | message rendering, code highlighting |
| LangGraph.js (+ LangGraph Python) | MIT | depend | P2 | orchestration, checkpointing, human-in-the-loop |
| LiteLLM (self-hosted, image digest pinned) | MIT | depend (service) | P0 | the model gateway: providers, fallbacks, budgets |
| Langfuse core (self-hosted) | MIT | depend (service) | P0 | traces, prompt versions, cost views |
| OpenLLMetry | Apache-2.0 | depend | P0 | OpenTelemetry instrumentation |
| OpenTelemetry GenAI semantic conventions | Apache-2.0 | depend (spec) | P0 | span/attribute names |
| pgvector | PostgreSQL | depend (extension) | P0 | embeddings |
| Graphiti | Apache-2.0 | reference → depend if needed | P3 | temporal knowledge graph |
| xyflow (React Flow) | MIT | depend | P3 | canvas engine |
| d3-force | ISC | depend | P3 | physics |
| dagre | MIT | depend | P3 | hierarchical layout |
| graphology · sigma.js | MIT | depend | P3 | metrics, large-graph rendering |
| `@jsoncanvas` interchange (obsidianmd/jsoncanvas) | MIT | depend | P3 | `.canvas` import/export |
| E2B SDK (or microsandbox) | Apache-2.0 | depend | P5 | sandboxes |
| MCP specification + servers | MIT | implement / depend | P5 | tool connections |
| A2A | Apache-2.0 | implement | P5 | external agent-to-agent |
| AG-UI | MIT | implement | P2 | agent↔frontend event stream |
| axe-core | MPL-2.0 | depend (dev, unmodified) | P0 | accessibility audit in CI |
| Vitest · MSW · Testcontainers · Faker · pixelmatch | MIT / ISC | depend (dev) | P0 | tests, mocks, visual diffing |
| Meilisearch (or Orama) | MIT / Apache-2.0 | depend (service) | P4 | search |
| SeaweedFS | Apache-2.0 | depend (service) | P4 | object storage (MinIO is AGPL — forbidden) |
| react-email · Mailpit | MIT | depend (dev) | P2 | decision emails, mail capture |
| style-dictionary · Tailwind CSS | Apache-2.0 / MIT | depend | P0 | token pipeline |

### Ported code (adapted into our source; provenance recorded per file)

| Source | Licence | What was ported | Where it lands |
|---|---|---|---|
| `paperclipai/paperclip` — `packages/db/src/schema/agents.ts` | MIT | column shape of the agent/employee table (self-referencing `reportsTo`, monthly budget/spend in cents, status, capabilities, permissions, heartbeat) | `packages/company` schema (P0) |
| `agentkitai/agentgate` — `lib/request-decision.ts` | MIT | decision precedence: budget → eval → override → policy → pending, as a pure function | decision engine (P1) |
| `sekera-radim/impri` — `server/src/interactive-decision.ts` | MIT | idempotent decision commit with `already_decided` / `concurrent` outcomes and machine-id vs human-label audit split | decision engine (P1) |
| `janhesters/shadcn-kanban-board` — `registry/new-york/ui/kanban.tsx` | MIT | announcement layer for screen readers (aria-live region, per-event announcements) | task board (P1) |
| `danny-avila/LibreChat` — `packages/data-schemas/src/methods/spendTokens.ts` | MIT | ledger row fields (`tokenType`, model, per-model price map) | runs/ledger (P0) |
| `markfulton/ai-employees` | MIT | the role-file discipline and `work-profile.json` schema (objective, routines with acceptance/fallback/recovery) | agent definitions (P1) |

### Forbidden — recorded so nobody re-suggests them

`makeplane/plane` · `minio/minio` · `plausible/analytics` · `origin-space/originui` · `permify/permify` ·
`zitadel/zitadel` · `RedPlanetHQ/tegon` (AGPL) — `typesense/typesense` (GPL) — `tldraw` (own licence) ·
`open-webui` (branding restrictions) · `n8n` (fair-code) · `daytonaio/daytona`,
`rakshit087/obsidian-graph-react`, `paperclipai/companies` (no licence file) · Arize Phoenix (ELv2) ·
Inngest, Modal (closed).

---

*Maintenance: append, never rewrite. Each row gains its commit hash and file path when the code
actually lands. The CI gate is the enforcement; this file is the record.*
