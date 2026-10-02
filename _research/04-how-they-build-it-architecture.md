# 04 — How an "AI company" platform is actually built

This is the technical reverse-engineering of the category, so the same model can be implemented.

## 4.1 The canonical data model

Every serious implementation converges on the same six entities:

```
Company (tenant)
 ├─ member  ── human (owner/admin/operator/viewer) OR agent (employee)
 ├─ Agent  ── name, title, role, model, runtime/adapter, instructions(SOUL),
 │            skills[], budget, schedule/trigger, status, memory scope
 ├─ Edge   ── reports_to | delegates_to | reviews | informs | shares_budget_with
 ├─ Goal   ── mission → objective → key_result → project → task   (parent_id chain)
 ├─ Task   ── assignment, thread (messages/files/logs), state machine, approvals
 ├─ Run    ── single heartbeat execution: transcript, tool calls, tokens, cost, outcome
 └─ Ledger ── who approved what, when, why; spend per agent/project; reversibility
```

Key insight from Paperclip: **agents are dormant between heartbeats.** A heartbeat is triggered by a
schedule, mention, assignment or manual invoke; the adapter starts the runtime just long enough to make
progress, then the agent exits. This is what makes 20+ agents affordable.

## 4.2 The state machine (adopt this; it is the industry pattern)

From Edict's documented flow, generalised:

```
Pending → Triage → Plan → [Review Gate] → Assign → Doing → Review → Done
                                  ↑           │                 │
                                  └── rejected ┘                 └→ Escalate / Retry / Rollback
```

Rules that make it reliable:
- **No skipping levels** (permission matrix per role).
- **A mandatory independent review node** before execution (Edict's 门下省 = best-in-class pattern).
- **Bounded retries** (Edict: max 3 review rounds) + timeout escalation + automatic rollback.
- **Everything writes to an append-only activity stream** (thinking, tool calls, state transitions).

## 4.3 Execution engines — pick one, don't invent one

| Engine | Model | When to choose |
| --- | --- | --- |
| **CrewAI** | Agent(role, goal, backstory) + Crew(process=sequential\|hierarchical) | Fastest path to role/hierarchy/delegation semantics; 100+ tools; manager agent built in |
| **LangGraph** | Graph of nodes/edges + typed state | Durability, checkpoints, retries, time-travel, HITL approvals — the production choice |
| **Temporal / queue worker** | Durable workflow | If you want full control over long-running multi-day company work |
| **Direct model calls** | Your own loop | Only for narrow single-agent features |

Recommended: **LangGraph for the orchestrator + CrewAI-style role definitions in your data model**,
with an adapter layer (below) so each agent can run on any runtime.

## 4.4 Adapters: "if it can receive a heartbeat, it's hired"

Paperclip's most copied idea — a thin adapter interface that lets any agent runtime be an employee:

```
interface AgentAdapter {
  start(agent, context) -> Run
  send(message) -> void
  stop() -> void
  capabilities(): { models[], streaming, sandbox, costReporting }
}
```

Real adapters to support: Claude Code, Codex, Cursor, Gemini CLI, OpenCode, OpenClaw, Hermes, Pi,
Grok Build, Kimi Code, **generic HTTP webhook**, **bash script**. Also allow "hosted model" mode
(call the provider API directly) for users who own no agent runtime.

## 4.5 Connections: two layers, don't confuse them

1. **Internal connections (the org graph)** — reporting lines, delegation, escalation, review,
   information flow. Typed edges in your DB; enforced by the permission matrix.
2. **External connections (tools & data)** — use **MCP** (90.9k★ servers repo; 68 connector pages in
   Paperclip's docs) for tools/apps, and **A2A** (25.9k★) for delegating to agents in other systems or
   vendors. Support OAuth per user ("responsible-user identities") so actions are attributable.

Security rules that real deployments adopt: scoped secrets per agent/company, per-action permissions,
sandboxed execution, and human approval for spend/hires/irreversible actions.

## 4.6 Goals: cascade + traceability

- Store goals as a tree with `parent_id` and a metric (`target`, `unit`, `due`).
- Every task carries `goal_id`; the agent prompt receives the goal context (Paperclip does this).
- Dashboard rolls up: goal → % complete, spend, agents involved, blockers.
- **Differentiator:** show the *chain of reasoning* from mission to a specific agent action (audit
  requirement + the answer to the accountability critique).

## 4.7 Cost & safety controls (non-negotiable)

- Budget per company / agent / project; alert thresholds; **hard stop / auto-pause** at 100%.
- Token + tool-call accounting per run; cost attribution to goal and project.
- Loop detection (agents talking to each other forever), max turns per heartbeat, kill switch.
- Approval gates for: hiring, spending above threshold, external actions, irreversible changes.
- Full transcript retention + replay (also a great demo feature — ChatDev proved people love replay).

## 4.8 Skills / training

Skill = versioned instruction package (markdown + optional scripts + tests). Support install from a
marketplace (skills.sh model), per-agent and org-wide scopes, version pinning/restore, and **evals**:
saved test inputs + expected behaviour, run before promoting a skill or a model change.

## 4.9 Recommended stack for a new product

| Layer | Recommendation | Why |
| --- | --- | --- |
| Frontend | React/Next.js + React Flow for the org canvas | Drag-drop node graph, RTL-ready |
| API | Node/TypeScript (or Python FastAPI if team is Python) | Paperclip proves Node+React works for this exact product |
| DB | Postgres (JSONB for agent configs) | Tenancy, budgets, ledgers, durable state |
| Queue/workflow | Temporal or BullMQ + LangGraph checkpoints | Heartbeats and long-running jobs |
| Agent engine | LangGraph (durable) + CrewAI-style role model | Reliability + fast role semantics |
| Tools | MCP client + A2A client | Standards, no lock-in |
| Sandbox | e2b / Daytona / containers | Code execution safety |
| Observability | OpenTelemetry + per-run traces + cost ledger | Governance and trust |
| Auth | OIDC + RBAC (owner/admin/operator/viewer); SSO for enterprise | Mirrors Paperclip's human roles |

## 4.10 What is hard (lessons from failures in the category)

1. Multi-agent chatter is expensive → hierarchical routing must be cheap (manager summaries, not raw
   transcripts).
2. Waterfall pipelines cascade errors → require feedback loops + independent review (MetaGPT w/o
   feedback scored 3.67 vs 3.75 executability, but ChatDev's weak testing hurt quality).
3. Role confusion is real → inception prompts per phase (ChatDev) / SOUL.md per agent (Edict).
4. Memory is the differentiator → per-agent memory + org-wide shared context, versioned.
5. Without evals you cannot swap models or skills safely → build the eval harness on day one.
