# 03 — Deep profiles: who does exactly what

Verified 2026-10-02. Star counts from the GitHub API snapshot in `data/`.

---

## 3.1 Paperclip — the category leader (the thing to study first)

**paperclipai/paperclip · 95,837★ · 16,248 forks · 6,228 open issues · MIT · TypeScript · created
2026-03-02 · last push 2026-10-02 · latest release v2026.916.1 (2026-09-21)**

Tagline: *"If OpenClaw is an employee, Paperclip is the company."* It is a **Node.js server + React UI**
that orchestrates a team of AI agents "to run a business". It looks like a task manager; underneath:
org charts, budgets, governance, goal alignment, agent coordination.

**How the user's exact request maps to Paperclip:**

| User's ask | Paperclip implementation (from official docs) |
| --- | --- |
| Create a company | Multi-organization: one deployment, many companies, isolated tasks/agents/permissions/history. Import company templates from `paperclipai/companies` |
| Add employees | **Agents = AI employees.** `New Agent` form: Name (e.g. "Ada"), Title ("Backend Engineer"), **Role** (CEO/CTO/manager/worker/general), **Reports to** (manager), **Adapter** (Claude Code, Codex local, Cursor+Cloud, Gemini CLI, OpenCode, OpenClaw gateway, Hermes, Pi, Grok Build, Kimi Code, Bash/HTTP), model, skills, budget. **The first agent is always the CEO** |
| Hierarchy | Agent list has two views: flat list and **Org chart view** (tree mirroring the reporting chain, CEO at top). Roles + reporting lines + escalation chain when blocked |
| Connections | Reporting lines and delegation paths; **Connectors** (68 doc pages): app integrations, model providers, chat channels, per-action permissions, **connection permissions & responsible-user identities**; adapters as the execution connection |
| Goals | **Goal Alignment**: goals → projects → tasks; agents receive the goal context behind their work. Mission → department objectives → work |
| Governance | Human = board of directors. Approve hires (manager proposes, you approve), review/approval stages, pause/reassign/stop, audit log, RBAC, SSO, multi-user login with human roles (owner/admin/operator/viewer), scoped secrets, company boundaries |
| Cost control | Company/agent/project budgets, spend tracking, threshold alerts, **auto-pause at limit** |
| Autonomy | **Heartbeats**: agents wake for assigned work, mentions, schedules, then exit (no idle burn). Delegation flows up/down the org chart |
| Training | Skill Studio, shared org-wide skills, evals & saved test runs, active learning loops, agent performance reviews, skill versioning & restore, reusable team templates |
| Ops | Run history & tracing, sandboxed execution providers (e2b, Cloudflare, Daytona, Modal, Novita, k8s), plugin SDK, REST API, CLI, Docker/Tailscale deploy, export/import |

**Evidence of adoption:** 30k stars in ~3 weeks (March 2026); ~70k by June 2026; 95.8k by October 2026.
Independent reviews consistently call it the most complete implementation of the metaphor and the only
one with sustained momentum; criticism = heavy operational overhead, no included agents/models, no
helpdesk-style vertical features, thousands of open issues, pseudonymous team.

**Weakness to attack:** it is developer-flavoured (CLI/pnpm/Docker, agent runtimes required, everything
must be configured up-front) and its cloud is only a **waitlist with no published price**. Third-party
"PaperclipCloud" charges $21–149/month just to host it — proof of demand for a managed, no-code version.

---

## 3.2 CrewAI — best framework for role-based teams

**crewAIInc/crewAI · 59,271★ · MIT · Python · active (last push 2026-10-01)**

- Mental model: `Agent(role, goal, backstory)` organised into a `Crew` with tasks.
- Two process modes: **sequential** and **hierarchical** (an automatic **manager agent** assigns tasks,
  validates results, decides re-runs) — the closest framework primitive to "hierarchy + goals".
- 100+ built-in tools, memory (short/long/entity), visual Studio, enterprise control plane with RBAC,
  audit, HITL approval gates, tracing, cost accounting; company claims 450M+ agentic workflows/month
  and 65% of the Fortune 500 as users.
- Weaknesses: production error handling coarser than LangGraph; hierarchical chatter is token-hungry.

**Use it if:** you want the fastest path to a working role/hierarchy engine and don't need a graph.

## 3.3 LangGraph — best production orchestration

**langchain-ai/langgraph · 42,585★ · MIT · active**

- Explicit graph: nodes (agents), edges (transitions), shared typed state.
- Durable checkpointing (pause/resume across sessions), time-travel debugging, native
  human-in-the-loop breakpoints, streaming, LangSmith tracing.
- 1.0 shipped Oct 2025; "Deep Agents" abstraction (2026) reduces tokens ~65% for standard runs.
- **Use it if:** reliability, auditability, retries, approvals and long-running state matter more than
  developer convenience. This is the safest engine for a product where a company's work must not be
  lost.

## 3.4 Microsoft AutoGen / AG2 — declining

**microsoft/autogen · 61,252★ · CC-BY-4.0 · last push 2026-04-15 (maintenance mode).** Microsoft moved
to the **Microsoft Agent Framework** (AutoGen + Semantic Kernel). The community fork **ag2ai/ag2**
(4,972★, Apache-2.0, active) continues the conversation-driven design. Do not start new work on
`microsoft/autogen`.

## 3.5 MetaGPT & ChatDev — the research ancestors

| | MetaGPT | ChatDev |
| --- | --- | --- |
| Stars | 70,717 (MIT) | 34,432 (Apache-2.0) |
| Idea | Encode **SOPs** into roles: PM → architect → engineer → QA; "First AI Software Company" | **Chat-chain** of a virtual software company: CEO, CTO, programmer, tester, designer |
| Strength | Structured artifacts (PRD, design, API, code) reduce cascading errors | Very cheap full SDLC for simple apps (<$1 reported); ChatDev 2.0 |
| Weakness | Waterfall, weak feedback loops; last push 2026-01-21 | Struggles with non-trivial projects; role confusion unless inception-prompted |
| Value to us | Canonical role/SOP definitions and artifact pipeline | Evidence that consumers find "watch an AI company work" compelling (replayable conversations) |

## 3.6 Edict (三省六部) — best governance pattern

**cft0808/edict · 16,963★ · MIT · OpenClaw-only.** Models the Tang-dynasty bureaucracy: the user is the
Emperor; Taizi triages; Zhongshu plans; **Menxia reviews and can reject (封驳)**; Shangshu dispatches to
six ministries that execute in parallel; results are memorialised back up. 9-state task machine,
10-panel dashboard, per-agent SOUL/MEMORY/IDENTITY files, permission matrix, timeout/retry/escalation,
full audit trail.
**The transferable idea: an independent, mandatory review agent between planning and execution.**

## 3.7 Oh-My-ClaudeCode — best power-user harness

**Yeachan-Heo/oh-my-claudecode · 39,517★ · MIT.** Wraps Claude Code in a staged team pipeline
(plan → PRD → execute → verify → fix) with 19 specialized parallel Claude Code instances and model
routing presets claimed to save 30–50% tokens. Not a company model — a delivery pipeline.

## 3.8 Alook, 5dive, Canopy, agems, ClawCompany, Markus, auto-company

| Project | What it is | Status |
| --- | --- | --- |
| **alookai/alook** (1,192★, Apache-2.0) | Rooms for people and agents; agents coordinate over **email inboxes**; 4-agent org walkthrough (CEO/PM/engineer/ops) | Active, niche |
| **5dive-ai/5dive** (63★, MIT) | Self-hosted named agents on an org chart + shared backlog; pings you only when a human must decide | Active, tiny |
| **Miosa-osa/canopy** (231★, Elixir) | "The office" — workspace protocol for agent systems | Active, tiny |
| **agems-ai/agems** (42★) | Org chart with AI agents and humans side by side, meetings, tools | Stale since 2026-05-26 |
| **ClawCompany** (574★ per Jun-2026 study) | Role templates, multi-model, chairman reviews | Quiet |
| **Markus** (161★, AGPL-3.0) | Trust-graded org runtime: probation→senior trust levels, mandatory review gates, emergency stop, 3-layer memory | Novel governance, no traction |
| **auto-company** (166★) | 24/7 full autonomy, no human loop | Dormant |

## 3.9 Commercial

- **TeamDay** — the clearest non-technical competitor: named AI employees (Sarah/SEO, Maya/content,
  Nova/CMO, James/data, Daisy/chief-of-staff…), Spaces (multiple AI offices), Missions (scheduled
  recurring work), MCP gateway with OAuth 2.1, sandboxed execution, human review. $19/$49/$99 per month
  with your own Anthropic key, credit top-ups otherwise, $999/mo dedicated. Unlike Paperclip it markets
  outcomes ("best AI employees 2026"), not architecture.
- **Relevance AI** — drag-and-drop Workforce Canvas with handoffs/triggers, sales/GTM focus, $150M
  raised, from $29/mo. Closest to a visual "org designer" in a commercial product.
- **Lindy** — no-code assistants, 200+ integrations, $49.99–199.99/mo; automation-first, not org-first.
- **Microsoft Copilot Studio** — multi-agent orchestration GA 2026: agents inside workflows, Fabric
  agents, M365 Agents SDK, **A2A** delegation, model choice (OpenAI + Anthropic), evaluations API,
  DLP/Entra governance. The enterprise default if the company lives in Microsoft 365.
- **Salesforce Agentforce** — CRM-native agents, ~$2/conversation, trust layer; the enterprise
  alternative.
- **OpenAI Workspace Agents** (2026-04-22) and **Google Gemini Enterprise** — big labs moved *adjacent*,
  not into the org-chart metaphor: team-level shared agents, not a company structure.

## 3.10 Research

Stanford **Generative Agents** (2023) invented believable agent societies; Altera's **Project Sid**
(2024) scaled to 1,000+ agents that autonomously specialized into roles and evolved rules and an
economy; **TheAgentCompany** benchmarks agents on real office work. These validate the concept's
mechanics (roles emerge, coordination works) but produced no product.

## 3.11 The critique every product in this category must answer

HBS's Joseph Fuller ("An Onboarding Plan for AI Agents", March 2026) argues agents should be onboarded
like employees — names, supervisors, boundaries, accountability, performance reviews. A May 2026 study
of 1,261 managers (cited by Ry Walker's category analysis) found the employee framing **shifts
accountability away from humans and erodes review quality**. Ry Walker's conclusion: the category's
central metaphor is now contested; the winning products will compete on **architectural governance
(approvals, audit, reversibility)** rather than on the metaphor. Paperclip's own tagline shift to
"manage AI agents for work" is consistent with this.
