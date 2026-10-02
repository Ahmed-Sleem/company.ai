# 11 — Build strategy: how to reuse everything and still be better

## 11.1 One-paragraph strategy

Build a **no-code, Arabic-first AI-company builder** whose primary surface is an **editable org graph**,
whose engine is **existing open source** (LangGraph / CrewAI / Microsoft Agent Framework), whose domain
model is **inspired by Paperclip (MIT)**, whose studio features are **inspired by ChatDev 2.0 +
Crew AI Studio (Apache-2.0)**, and whose tools/connections ride on **MCP + A2A**. We compete on
*organisation design, simulation, governance and localisation* — never on re-inventing orchestration.

## 11.2 Reference architecture

```
┌─────────────────────────── Frontend (Next.js + React Flow) ───────────────────────────┐
│ Org canvas (A1) · Goal tree (B1) · Decision inbox (C3) · Replay (C8) · Heatmap (H1)    │
│ RTL/Arabic (H4) · command palette · mobile PWA (H3)                                    │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ REST + WebSocket/SSE
┌──────────────────────────────────────┴─────────────────────────────────────────────────┐
│ Company Domain Service (TypeScript)                                                    │
│ tenants · agents · org edges · goals · projects · tasks · budgets · approvals · ledger  │
│ org versioning (A4) · policy compiler (E5) · cost firewall (E2) · audit (E7)            │
│ Postgres (JSONB) + pgvector (company brain F1)                                         │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴─────────────────────────────────────────────────┐
│ Orchestration (Python): LangGraph (MIT)  ─ or ─  CrewAI (MIT)  ─ or ─  MAF (MIT)        │
│ heartbeats (C1) · state machine + review gate (E3) · retries/timeouts (C7) · HITL       │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴─────────────────────────────────────────────────┐
│ Adapter layer: hosted models · Claude Code · Codex · Cursor · Gemini CLI · OpenClaw ·   │
│ HTTP/webhook · bash.  Sandbox: OpenHands (MIT) / e2b / Docker.                          │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴─────────────────────────────────────────────────┐
│ Tools: MCP servers · A2A federation (G3) · WhatsApp/Slack/Drive/Stripe connectors       │
│ Observability: OpenTelemetry + traces + cost ledger (Langfuse/Arize Phoenix)            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 11.3 Reuse-first build order (each phase ships something usable)

| Phase | Ship | Reuse | New code | Weeks (2–3 devs) |
| --- | --- | --- | --- | --- |
| **P0 — Skeleton** | Auth, tenancy, company CRUD, agent CRUD, heartbeats, one hosted-model adapter, budgets | LangGraph, Postgres, Better Auth, React Flow | Domain service, adapter interface | 3 |
| **P1 — The canvas** | Org graph with typed edges, goal tree, task board, run transcripts, cost per run | React Flow, Paperclip model (MIT), Vibe Kanban patterns (Apache-2.0) | Canvas UX, edge semantics, traceability (B2) | 4 |
| **P2 — Trust** | Approval queue (C3), policy editor (E5), review gate (E3), kill switch, rollback | Edict state machine (MIT), LangGraph checkpoints | Policy compiler, ledger, undo | 4 |
| **P3 — Localisation & wedge** | Arabic RTL, WhatsApp control plane, 3 vertical templates, daily digest | MCP connectors, MT models | RTL UI, template format, WhatsApp bot | 4 |
| **P4 — Simulation & marketplace** | Strategy simulator (B3), template marketplace (A3), skill evals (D6) | Monte-Carlo libs, existing eval harnesses | Simulator, marketplace | 6 |
| **P5 — Scale** | Adapters (Claude Code/Codex/Cursor/OpenClaw), enterprise SSO/RBAC, compliance export (E7) | Paperclip adapter patterns (MIT), Keycloak | Enterprise tier | 8 |

**MVP = P0–P2 (≈11 weeks with 2–3 devs)** — a usable product where a user builds an org, gives it a
goal, watches governed work happen, and can audit/undo everything.

## 11.4 Make-or-reuse decisions (explicit)

| Capability | Decision | Rationale |
| --- | --- | --- |
| Org canvas | **Build** (React Flow) | This is the moat; can't be outsourced |
| Domain model | **Build, modelled on Paperclip (MIT)** | Our differentiator layer |
| Execution engine | **Reuse** (LangGraph or CrewAI) | Solved problem; MIT |
| Agent runtimes | **Reuse via adapters** | Paperclip proved it; avoids lock-in |
| Tools/data | **Reuse MCP** | Standard, huge ecosystem |
| Agent federation | **Reuse A2A** | Enables the marketplace of companies (G3) |
| Sandbox | **Reuse** (OpenHands/e2b/Docker) | Security is not our business |
| Observability/evals | **Reuse** (OTel + Langfuse/Phoenix) | Don't reinvent |
| Company brain | **Build thin** (pgvector + permissioned graph) | Quality lever worth owning |
| Simulation | **Build** | Nobody has it; pure differentiation |
| Arabic/RTL/WhatsApp | **Build** | Whitespace + distribution |

## 11.5 Risks & mitigations specific to this strategy

| Risk | Mitigation |
| --- | --- |
| Upstream engine churn (LangGraph/CrewAI API changes) | Thin adapter around the engine; contract tests; the domain model is engine-agnostic |
| Copying licence-encumbered UI (Dify/Flowise/LobeHub) | Hard CI licence gate; only MIT/Apache-2.0/BSD dependencies |
| Paperclip ships a cloud UI first | Our wedge is org-canvas + simulation + Arabic + no-code; move fast on P1–P3 |
| Token economics kill margins | BYO-key default, model routing (D7), heartbeats not loops, cost firewall (E2) |
| Trust/HBR accountability critique | Sell the ledger, approvals and reversibility (E-series) as headline features |
| Enterprise sales cycle | Land SMEs/agencies with the no-code wedge; enterprise tier at P5 with compliance export |

## 11.6 Success metrics

- **Activation:** % of signups who get a company with ≥3 agents and ≥1 goal in the first session.
- **Time-to-value:** first useful agent output < 30 min; first approved deliverable < 24 h.
- **Governance:** 100% of runs carry goal + cost + approver; 0 unapproved external actions.
- **Trust:** % of actions rolled back; % of clients who enable auto-approval thresholds.
- **Growth:** templates cloned per week; marketplace creators; referral from public company pages (G5).
- **Regional:** Arabic-language sessions, WhatsApp approvals per week, regional vertical retention.

## 11.7 Open question for the user (decision needed)

Which **wedge** do we ship first? All three are viable; the choice changes P3:

1. **MENA SME wedge** — Arabic-first, WhatsApp, e-commerce/real-estate/clinic verticals (highest whitespace).
2. **Agency wedge** — white-label multi-client AI companies for marketing/software agencies (highest ARPU).
3. **Solo-founder wedge** — a direct Tycoon AI competitor with better org control (largest market, most crowded).
