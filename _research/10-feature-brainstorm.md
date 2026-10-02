# 10 — Feature brainstorm: what we can add beyond what exists

Legend for **Status**: ✅ already exists somewhere · 🟡 partial/exists only in one product · 🆕 nobody has it
**Impact**: 🔥 high · ⭐ medium · 💡 nice-to-have · **Effort**: S/M/L/XL

## A. Company design & org structure (the core differentiator)

| # | Idea | Status | Why it matters | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| A1 | **Editable org-graph canvas** — drag employees/agents onto an infinite canvas; edges are *typed*: `reports-to`, `delegates-to`, `reviews`, `informs`, `shares-budget`, `escalates-to` | 🆕 | Every competitor has a *workflow* canvas or a *read-only* tree; this is the product | 🔥 | L |
| A2 | **Auto-org-design**: describe the business goal → AI proposes 3 org structures (lean/balanced/heavy) with role mix, cost estimate and rationale; you accept and drag-edit | 🟡 (teams do this for software only) | Turns a blank canvas into a 60-second first win | 🔥 | M |
| A3 | **Org templates marketplace** (import/export company as JSON/YAML/URL); revenue share for creators | 🟡 (Paperclip has static template repos) | Distribution flywheel — the thing that made Paperclip explode | 🔥 | M |
| A4 | **Org version control (OrgOps/GitOps)**: every structural change is a diff, with approve/reject and one-click rollback | 🆕 | Mirrors what enterprises already trust (PR review) — makes org changes auditable | 🔥 | M |
| A5 | **Matrix & project overlays**: keep the line org, then draw temporary project squads (dotted-line edges) that expire | 🟡 | Real companies run matrix structures; nobody models them | ⭐ | M |
| A6 | **Sub-companies / departments as nested units with their own budgets** + consolidation view | 🟡 | Enables franchises/agencies and holding-company use cases | ⭐ | M |
| A7 | **Role library** (prebuilt role cards from real job descriptions: 500+ roles, localised to Arabic) | 🟡 (TeamDay has ~10 roles) | Faster hiring; SEO surface | ⭐ | M |
| A8 | **Onboarding-from-documents**: upload pitch deck / SOPs / HR files → AI generates the whole company (roles, goals, KPIs, policies) | 🆕 | Zero-setup onboarding; matches Paperclip's weakest point (everything must be configured) | 🔥 | L |
| A9 | **Hiring flow with approval**: manager agent proposes a hire → human approves budget/hire in one click (Paperclip does this) — extend with **interview mode**: you chat with the candidate agent before hiring, it writes its own SOUL/role card | 🟡 | Emotional buy-in; better role definition | ⭐ | S |
| A10 | **Dual-org view**: toggle "structure" (org chart) / "flow" (work + money moving along edges) / "health" (heatmap) | 🆕 | One canvas, three lenses — the demo screenshot | 🔥 | M |

## B. Goals, strategy & alignment

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| B1 | **Goal tree as a first-class object**: mission → objectives → key results → projects → tasks, drag to re-parent, roll-up KPIs | 🟡 (Paperclip links tasks to goals but no cascade visual) | Managers already think in OKR trees | 🔥 | M |
| B2 | **Traceability click-through**: click any KPI or deliverable → the agent runs, prompts, decisions and spend that produced it | 🟡 (audit logs exist; the *chain* is not one click) | This is the answer to the HBR accountability critique | 🔥 | M |
| B3 | **Strategy simulator**: "if I add 3 more agents to marketing, what happens to cost/time/output?" Monte-Carlo a plan before committing | 🆕 | Nobody offers it; huge before-spend anxiety | 🔥 | L |
| B4 | **OKR check-in rituals**: agents self-report progress on a cadence; humans approve/adjust; drift alerts | 🆕 | Turns goals from static fields into a running process | ⭐ | M |
| B5 | **North-star dashboard**: revenue/cost/output per agent, per goal, per department (ROI per AI employee) | 🟡 | The "why am I paying for this?" answer | 🔥 | M |
| B6 | **Goal-gated spending**: no budget released to an agent unless tied to an active goal | 🆕 | Cost discipline by design | ⭐ | S |

## C. Work, operations & the "day" of a company

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| C1 | **Heartbeat + ticket system** (agents wake for assigned work, then sleep — zero idle cost) | ✅ (Paperclip) | Table stakes; copy the model | 🔥 | M |
| C2 | **Daily digest**: "what your company did yesterday" — one AI-written briefing with decisions needed | 🟡 (Pancake does it in Slack) | Retention driver; makes autonomy legible | 🔥 | S |
| C3 | **Decision inbox**: one queue for everything that needs a human, with a recommendation, rationale, confidence and cost of delay | 🟡 (Paperclip approvals; nobody has "recommendation + confidence + cost of delay") | Turns the human into an efficient board, not a bottleneck | 🔥 | M |
| C4 | **Shadow mode**: company runs but every action is proposed, not executed, until you flip the switch per agent | 🆕 | Onboarding trust ramp; the safest first week | 🔥 | M |
| C5 | **Routines & SOP library**: visual recurring processes (weekly report, content pipeline, invoice chase) with owners | 🟡 | Converts one-off prompts into company assets | ⭐ | M |
| C6 | **Meetings**: scheduled standups/board meetings where agents post minutes, votes/quorum, and action items | 🟡 (agems tried; dead) | Familiar ritual; useful governance artifact | 💡 | M |
| C7 | **Escalation SLAs**: if an agent is blocked, the block moves up the reporting line automatically after X minutes | 🟡 (Edict has timeout escalation) | Prevents silent stalls | ⭐ | S |
| C8 | **Work replay**: scrub through yesterday like a video, see every agent action | 🟡 (ChatDev replay; LangGraph time-travel for devs) | Demos beautifully; debugging and trust | 🔥 | M |
| C9 | **Human task handoff**: agents can assign work *to humans* in the org with a deadline | 🟡 (Paperclip assigns to people) | True hybrid teams | ⭐ | S |

## D. The AI workforce itself (people-ops for agents)

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| D1 | **Agent profile**: role, title, photo/avatar, manager, skills, model, budget, KPIs, memory, SOUL file | ✅/🟡 | Table stakes | 🔥 | M |
| D2 | **Probation → promotion → trust levels**: new agents start read-only, earn autonomy by track record; auto-demote on failures | 🟡 (Markus only, 161★) | Safe autonomy ramp; sells to risk-averse buyers | 🔥 | M |
| D3 | **Performance reviews for agents** (auto-generated, evidence-linked; humans edit) | 🟡 (Paperclip has performance reviews) | Makes "firing" a data decision | ⭐ | M |
| D4 | **Fire & rehire with knowledge retention**: on termination, distil the agent's memory into an org wiki and hand off its open tasks | 🆕 | Prevents knowledge loss — real pain | 🔥 | M |
| D5 | **Agent-to-agent handoff protocol** with context packing (not raw transcripts) | 🟡 | Quality + cost control | ⭐ | M |
| D6 | **Skill marketplace + evals**: install a skill, run saved evals, version/restore (Paperclip does skills; extend with a public marketplace + ratings) | 🟡 | Ecosystem + content moat | 🔥 | L |
| D7 | **Model routing per role** (cheap model for routine heartbeats, premium for judgement) with automatic A/B on quality | 🟡 | 30–50% cost savings claimed by Oh-My-ClaudeCode | 🔥 | M |
| D8 | **Team cloning**: duplicate a high-performing team into a new region/product | 🟡 | Agency/multi-brand use case | ⭐ | S |

## E. Trust, cost & governance (the trust wedge)

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| E1 | **Per-agent / per-project / per-company budgets with hard auto-pause** | ✅ (Paperclip) | Table stakes | 🔥 | M |
| E2 | **Cost firewall**: block an action if it would exceed a threshold; require approval above it; alert on anomalies (e.g. spend velocity spikes) | 🟡 | Nobody markets anomaly detection for agent spend | 🔥 | M |
| E3 | **Independent review gate** before execution (an agent whose only job is to reject bad plans — Edict's 门下省) | ✅ (Edict only) | The strongest safety pattern in the category; adopt it | 🔥 | M |
| E4 | **Universal rollback**: every action carries an undo/compensation; "time travel" for the company, not just the graph | 🟡 (LangGraph time-travel is dev-only) | Reversibility is the enterprise objection-killer | 🔥 | L |
| E5 | **Constitution / policy editor**: plain-language guardrails (never email customers without approval, never spend >X, never touch PII) compiled to runtime hooks | 🟡 (Paperclip execution policies) | Legal/compliance friendly; also an AI-safety selling point | 🔥 | M |
| E6 | **Kill switch + blast-radius limits** (max actions per hour, max external recipients, allowlists) | 🟡 | Table stakes for serious buyers | 🔥 | S |
| E7 | **Compliance evidence export**: one-click pack for auditors (who/what/why/when, approvals, model cards, data flows) mapped to ISO 42001 / EU AI Act articles | 🆕 | Nobody sells this to SMEs today | 🔥 | M |
| E8 | **PII redaction + data-loss-prevention hooks** at every model and tool call | 🟡 (Paperclip runtime hooks) | Enterprise requirement | ⭐ | M |
| E9 | **Red-team agent**: a permanent adversarial agent that attacks your company's plans/outputs and reports vulnerabilities | 🆕 | Novel, memorable, genuinely useful | ⭐ | M |
| E10 | **Insurance/liability mode**: per-action receipts + human sign-off trail designed to survive a dispute | 🆕 | Emerging need as agents act in the real world | 💡 | M |

## F. Knowledge, memory & learning

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| F1 | **Company brain**: permissioned knowledge graph of docs, decisions, meetings, customers; every agent reads the slice it's allowed to | 🟡 (Pancake "company brain", Hyperspell for coding) | Memory is the #1 quality lever | 🔥 | L |
| F2 | **Decision log with rationale + citations** (searchable: "why did we choose vendor X?") | 🆕 | Institutional memory; onboarding gold | 🔥 | M |
| F3 | **Learning loop**: outcomes/traces feed skill and prompt improvements automatically (with review) | 🟡 (CrewAI "training"; Paperclip active learning) | Compounding quality | ⭐ | L |
| F4 | **Per-agent memory scopes** (private / team / company) with retention rules | 🟡 | Governance + privacy | ⭐ | M |
| F5 | **"Ask your company"**: chat over the whole org's activity, goals, spend and decisions | 🟡 | The most demo-able feature for owners | 🔥 | M |

## G. Connections & ecosystem

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| G1 | **MCP-native tool connections** (Slack, Drive, GitHub, Notion, Stripe, WhatsApp…) with per-action permissions | ✅/🟡 | Table stakes | 🔥 | M |
| G2 | **Bring your own agent runtime** (Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, HTTP, bash) | ✅ (Paperclip — copy) | Avoids lock-in; huge audience | 🔥 | M |
| G3 | **A2A federation**: your company can subcontract to *another user's AI company* (e.g. buy design services from someone else's org) | 🆕 | Creates the first "AI company economy" — massive story | 🔥 | XL |
| G4 | **Template/Skill marketplace with revenue share** | 🟡 | Ecosystem moat; creators do your content | 🔥 | L |
| G5 | **Public company pages** (share your org as a landing page/demo; embeddable widget) | 🆕 | Viral loop + SEO | ⭐ | S |
| G6 | **API + webhooks + CLI + company-as-code** (full CRUD on org, goals, runs) | 🟡 | Developers + automation | ⭐ | M |
| G7 | **Import from HRIS/CSV/Miro/Notion org charts** to mirror a *human* org and place agents beside people | 🟡 | Hybrid adoption path | 💡 | M |

## H. UX, visualization & delight

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| H1 | **Org heatmap**: overload, idle time, cost burn, error rate, blocked work — colour the graph | 🆕 | Managers instantly see bottlenecks | 🔥 | M |
| H2 | **Live "money flow" animation** along edges (spend per delegation) | 🆕 | Unforgettable demo | ⭐ | S |
| H3 | **Mobile app / PWA + voice**: "Hey, how's my company? Approve the marketing plan" | 🟡 (Paperclip mentions phone management) | Approvals happen away from desks | 🔥 | M |
| H4 | **Arabic-first RTL UI** with dialect-aware prompts, Hijri dates, Arabic numerals formatting | 🆕 | Total whitespace in this category | 🔥 | M |
| H5 | **WhatsApp-native control plane** (approvals, digests, commands) | 🟡 (region uses WhatsApp heavily; competitors don't do org control) | Distribution channel for MENA | 🔥 | M |
| H6 | **Onboarding in 5 minutes**: pick a template → name your company → watch first output | 🟡 | Time-to-value decides activation | 🔥 | M |
| H7 | **Dark/light, keyboard-first, accessibility (WCAG 2.2 AA), RTL + LTR mirroring** | 🟡 | Enterprise procurement requirement | ⭐ | M |
| H8 | **Company calendar / Gantt of agent work** | 🟡 | Planning view | 💡 | M |

## I. Business model & ecosystem

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| I1 | **BYO-key + platform subscription** (like TeamDay: $19–99/mo, zero platform fee with your key) | ✅ | Lowest friction; avoids token markup anger | 🔥 | S |
| I2 | **Managed credits** with transparent markup for non-technical users | ✅ | Margin + simplicity | ⭐ | S |
| I3 | **Outcome-based pricing** ("$X per qualified lead") | 🟡 | Aligns with value; harder to meter | ⭐ | L |
| I4 | **Agency / white-label mode**: manage many client companies in one dashboard | 🟡 | High-ARPU segment (agencies) | 🔥 | M |
| I5 | **Marketplace take-rate** on templates, skills, and AI-company subcontracting (G3) | 🆕 | Ecosystem revenue | 🔥 | L |
| I6 | **Enterprise tier**: SSO, RBAC, audit export, on-prem/self-host (fork Paperclip there) | 🟡 | Big contracts | ⭐ | L |
| I7 | **Education/game tier**: a lightweight "run an AI company" experience for students/teams | 🟡 (tycoon games prove appetite) | Funnel + fun marketing | 💡 | M |

## J. Advanced / experimental (watch list, build later)

| # | Idea | Status | Why | Impact | Effort |
| --- | --- | --- | --- | --- | --- |
| J1 | **Self-improving org**: the company proposes its own restructuring each quarter, with justification | 🆕 | The logical end-state of A2/A4 | 🔥 | XL |
| J2 | **Cross-company benchmarking** (anonymised: "companies like yours spend X per lead") | 🆕 | Data moat | ⭐ | XL |
| J3 | **Negotiation between departments** for budget/resources, mediated by the CEO agent | 🆕 | Fun + realistic; emergent behaviour | 💡 | L |
| J4 | **Local/offline mode** with Ollama for privacy-first buyers | 🟡 | Sells in regulated markets | ⭐ | L |
| J5 | **Agent identity & reputation** (portable credentials, signed actions, verified track record) | 🆕 | Foundation for the AI labour market | 💡 | XL |
| J6 | **Simulation "sandbox city"** for testing org behaviour under stress (revenue drop, viral spike, outage) | 🟡 (research only) | De-risks deployments | ⭐ | L |

## 10.1 Top 12 to build first (highest novelty × value × feasibility)

| Rank | Feature | Why it wins |
| --- | --- | --- |
| 1 | **A1 Editable org-graph canvas (typed edges)** | The category's missing primary surface; instantly demo-able |
| 2 | **B1 + B2 Goal tree with one-click traceability** | Directly answers "why is this agent doing this and what did it cost?" |
| 3 | **C3 Decision inbox (recommendation + confidence + cost of delay)** | Makes the human an effective board, not a bottleneck |
| 4 | **A2 Auto-org-design from a goal** | 60-second time-to-value; beats "configure 8 roles before anything happens" |
| 5 | **B3 Strategy simulator (cost/failure forecast before hiring)** | Nobody has it; removes the biggest purchase anxiety |
| 6 | **E3 Independent review gate + E5 policy editor** | Safety architecture = the enterprise/HBR critique answer |
| 7 | **A4 Org version control (diff/approve/rollback)** | Trust + audit + it feels like real software engineering |
| 8 | **D2 Probation → promotion trust levels** | New way to safely escalate autonomy; almost nobody has it |
| 9 | **C8 Work replay + C2 daily digest** | Trust, debugging, retention, and the best demo reel |
| 10 | **H4 + H5 Arabic-first RTL + WhatsApp control plane** | Uncontested market; distribution advantage |
| 11 | **A3 + D6 Template & skill marketplace** | The growth loop that made Paperclip explode |
| 12 | **E7 Compliance evidence export** | Premium pricing + enterprise door-opener |

## 10.2 Deliberately NOT building (yet)

- A general-purpose workflow builder (Langflow/Dify own that; compete on org, not flow).
- Our own agent runtime/harness (use adapters — Paperclip proved this is the winning move).
- Our own LLM (use adapters + routers).
- Computer-use browser control from scratch (reuse `browser-use`).
- Our own vector DB or observability stack (reuse pgvector + Langfuse/OTel).
