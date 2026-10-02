# 09 — Reuse map & licensing (what to take, what to avoid)

Goal: build the new system **on top of existing work**, without legal or technical traps.
Rule of thumb: **only MIT / Apache-2.0 / BSD code goes into the product.** Everything else is
inspiration or an optional self-hosted integration.

## 9.1 The layer cake — and where each existing project plugs in

```
┌──────────────────────────────────────────────────────────────────────┐
│  OUR PRODUCT (the moat)                                              │
│  Org-graph canvas · goal tree · simulation · governance ledger ·     │
│  Arabic-first UX · template marketplace · vertical packs             │
├──────────────────────────────────────────────────────────────────────┤
│  COMPANY DOMAIN SERVICE                                              │
│  tenant · agents · org edges · goals · budgets · approvals · ledger   │
│  → modelled on Paperclip (MIT) concepts, written by us                │
├──────────────────────────────────────────────────────────────────────┤
│  ORCHESTRATION ENGINE                                                │
│  LangGraph (MIT, durable) or CrewAI (MIT, roles) or MAF (MIT)         │
├──────────────────────────────────────────────────────────────────────┤
│  ADAPTER LAYER (heartbeats)                                          │
│  Claude Code · Codex · Cursor · Gemini CLI · OpenClaw · HTTP · hosted │
├──────────────────────────────────────────────────────────────────────┤
│  TOOLS & SANDBOX                                                     │
│  MCP (spec MIT) · A2A (Apache-2.0) · OpenHands (MIT) · browser-use    │
└──────────────────────────────────────────────────────────────────────┘
```

## 9.2 Reuse table

| Need | Take from | License | How | Risk / notes |
| --- | --- | --- | --- | --- |
| Company/org domain model (agents, roles, reporting lines, budgets, approvals, heartbeats, skills, audit) | **Paperclip** | **MIT** | Fork or re-implement the model; read `docs.paperclip.ing` API reference (30 pages) | MIT allows commercial use with attribution; upstream moves fast — copy the model, don't sync code |
| Durable orchestration (checkpoints, retries, HITL, time-travel) | **LangGraph** | **MIT** | Embed as the execution engine | Requires Python service; mature |
| Role/hierarchy semantics (`role/goal/backstory`, manager agent) | **CrewAI** | **MIT** | Use for the role model or as an alternative engine | Hierarchical chatter is token-hungry |
| Enterprise-grade orchestration (A2A/MCP native, .NET+Python) | **Microsoft Agent Framework** | **MIT** | Optional second engine for enterprise tier | Newer (13.9k★) but Microsoft-backed |
| **Zero-code drag-drop canvas UX** (infinite canvas, loops, nesting, YAML export, Python SDK) | **ChatDev 2.0 "DevAll"** | **Apache-2.0** | Study/port canvas patterns; optionally embed | Vue 3 + FastAPI; workflow semantics, not org |
| **Studio feature blueprint** (103 tools, MCP browser, KB, batch runs, cron, evals, cost tracking, HITL, code export, secrets vault, replay, dry-run) | **Arturski/crew-ai-studio** | **Apache-2.0** | Port features wholesale — it is small (3★) but complete | Verify code quality; it is a reference, not a dependency |
| Visual graph libraries | **React Flow** / `@xyflow/react` | **MIT** | Direct dependency | Industry standard for node editors |
| Task board + parallel agents GUI | **Vibe Kanban** | **Apache-2.0** | Optional component for the "work" screen | Community-maintained since Apr 2026 |
| Full agent platform + sandbox + delegation | **OpenHands** | **MIT** | Use as a runtime/sandbox or borrow architecture | 89.7k★, active, TypeScript |
| Browser/computer-use agent | **browser-use** | **MIT** | Optional skill for agents | 116.9k★ |
| Coding-agent workforce UI patterns | Crystal (MIT), Nimbalyst (MIT), Pane (AGPL ⚠️), Conductor (closed) | mixed | Study UX only | Do not copy AGPL/closed code |
| Tools & data access | **MCP** (spec MIT; servers repo NOASSERTION — check per server) | MIT spec | Direct | Server licences vary per repo |
| Agent-to-agent delegation | **A2A** | **Apache-2.0** | Direct | Also enables cross-company federation |
| Veto/review state machine + audit stream | **Edict** | **MIT** | Copy the state machine + mandatory review gate concept | Chinese-first docs; OpenClaw-coupled code |
| Agent workforce runtime + CLI | **PraisonAI** | **MIT** | Optional reference | "24/7 AI workforce" framing overlaps ours |
| Evaluation & observability | **Langfuse** (check licence) / **Arize Phoenix** (Apache-2.0) / OpenTelemetry | check | Direct | Needed for evals + cost ledger |
| RAG / company brain | LangChain/LlamaIndex (MIT) or your own pgvector | MIT | Direct | Prefer owning it |
| Sandboxes | e2b (Apache-2.0 SDK), Daytona, Docker/Firecracker | permissive | Direct | Paperclip already abstracts these |
| Auth + multi-tenancy | Better Auth (MIT) / Keycloak (Apache-2.0) / Supabase (Apache-2.0) | permissive | Direct | Need RBAC + SSO for enterprise |
| Arabic NLP | Frontier models + Arabic prompts; optional Jais 2 (check licence) | varies | Via adapter | Regional moat |
| Payments | Stripe + Paymob/Tap (Egypt/MENA) | — | Direct | Local billing matters |
| Company templates | **paperclipai/companies** (899★) | check repo licence | Convert to our template format | Content licensing to verify |

## 9.3 ⚠️ Licence traps — do NOT put these in the product

| Project | Licence reality | Why it's a trap |
| --- | --- | --- |
| **Dify** | "NOASSERTION" = custom Dify Open Source License | Historically **forbids multi-tenant SaaS** and removing branding without a commercial licence — fatal for a hosted product |
| **Flowise** | Custom (Apache-2.0 + Commons-Clause-style restrictions) | Commercial resale/white-label restrictions |
| **LobeHub** | NOASSERTION (Apache-2.0 + additional terms) | Verify before any embedding |
| **Pane** | **AGPL-3.0** | Network copyleft: exposes your whole server-side code if modified and offered over a network |
| **Markus** (agent company runtime) | **AGPL-3.0** | Same |
| **AutoGen repo** | CC-BY-4.0 (per GitHub metadata) | Content licence on a code repo is unusual; prefer **Microsoft Agent Framework** (MIT) |
| **n8n** | Sustainable Use License | Not OSI-approved; restricts commercial use |
| **Swarms** | Apache-2.0 code, but token/commercial controversy | Reputational + token risk |

**Mitigation policy:** maintain a `THIRD_PARTY_LICENSES.md`, run a licence scan in CI
(`pip-licenses`, `license-checker`, `FOSSA`), and require every dependency to be MIT/Apache-2.0/BSD.
For MIT/Apache forks: keep the copyright notice + NOTICE file and document changes.

## 9.4 Fork-or-build decision

| Option | Verdict | Reasoning |
| --- | --- | --- |
| **Fork Paperclip for the whole product** | ❌ Not recommended as the SaaS core | 6,200+ open issues, heavy self-host surface, fast-moving upstream; you would fight the roadmap |
| **Re-implement Paperclip's domain model (MIT) + own the canvas/UX** | ✅ **Recommended** | Legal, focused, and the domain model is well-documented |
| **Embed LangGraph as engine** | ✅ Recommended | Durable, MIT, production-proven |
| **Reuse ChatDev 2.0 canvas patterns + Crew AI Studio features** | ✅ Recommended | Apache-2.0 reference for exactly the studio we need |
| **Fork Paperclip for an enterprise self-host tier (later)** | 🟡 Optional | MIT permits it; useful for customers who demand on-prem |
| **Wrap Paperclip as managed hosting** | 🟡 Quick revenue test only | No moat; PaperclipCloud already does it |

## 9.5 Compliance notes to design for from day one

- **EU AI Act / ISO 42001** style evidence: action logs, human oversight records, model cards per agent,
  risk classification per role. *Selling this as a feature is a differentiator (see brainstorm F/G).*
- **Data residency**: MENA/GCC buyers often require in-region hosting — plan an EU/MENA deployment
  option and per-company storage region.
- **Attribution**: a visible "built on open source" page listing MIT/Apache components (good faith +
  marketing).
