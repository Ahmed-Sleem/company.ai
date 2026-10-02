# 02 — Competitor matrix (verified 2026-10-02)

All GitHub figures are from the **GitHub REST API on 2026-10-02** and are stored raw in
`data/github-snapshot-2026-10-02.json`. Star counts move daily — treat the snapshot as the citation.

## 2.1 The "company of agents" category (direct competitors)

| # | Project | Stars | License | Lang | Created | Last push | Architecture | Target user | Human-in-loop | Cost control |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **paperclipai/paperclip** | **95,837** | MIT | TypeScript | 2026-03-02 | 2026-10-02 | Task-manager OS + org chart | Entrepreneurs, agent operators | Board approvals, review stages | Per-agent/company/project budgets, auto-pause |
| 2 | **Yeachan-Heo/oh-my-claudecode** | 39,517 | MIT | (skill/harness) | — | active | Harness orchestrator (plan→PRD→execute→verify→fix) | Claude Code power users | Dispatch + verify checkpoints | Model-routing presets |
| 3 | **cft0808/edict** (三省六部) | 16,963 | MIT | HTML/JS | — | active | Hierarchical imperial (Tang dynasty) | OpenClaw users | Mandatory independent review (门下省) | Token metrics only |
| 4 | **alookai/alook** | 1,192 | Apache-2.0 | TypeScript | 2026-04-03 | 2026-10-01 | "Rooms for people and agents" (email-based coordination) | Small AI companies | Human rooms | Not documented |
| 5 | **Miosa-osa/canopy** | 231 | NOASSERTION | Elixir | 2026-03-19 | 2026-09-09 | Workspace protocol ("the office") | Claude Code/OSA users | — | — |
| 6 | **5dive-ai/5dive** | 63 | MIT | Shell | 2026-05-15 | 2026-10-01 | Self-hosted org chart + shared backlog | Self-hosters | Human-decision pings | Budget-gated (per README) |
| 7 | **agems-ai/agems** | 42 | NOASSERTION | TypeScript | 2026-03-07 | 2026-05-26 (stale) | Org chart with humans + agents | AI-native businesses | Meetings/approvals | — |
| 8 | Paperclip-adjacent clones | 0–600 | mostly MIT | various | 2026 | mixed | Paperclip config packs / role templates | Paperclip users | varies | varies |

Also referenced by independent research but not API-verified in this snapshot (star counts from the
June 2026 Ry Walker study): **ClawCompany** (574), **auto-company** (166, dormant), **Markus** (161,
AGPL-3.0, trust-graded governance).

## 2.2 General multi-agent frameworks (build-your-own, not a company out of the box)

| Project | Stars | License | Language | Paradigm | Best for | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **crewAIInc/crewAI** | 59,271 | MIT | Python | Role-based crews; sequential & **hierarchical** (manager agent) | Fast role-based teams | 100+ tools; enterprise control plane; 450M+ workflows/month claimed |
| **microsoft/autogen** | 61,252 | CC-BY-4.0 | Python/.NET | Conversational group chat | Research, conversation patterns | **Maintenance mode** — superseded by Microsoft Agent Framework |
| **FoundationAgents/MetaGPT** | 70,717 | MIT | Python | SOP-driven "AI software company" | Research, software tasks | Last push 2026-01-21 → slowing |
| **OpenBMB/ChatDev** | 34,432 | Apache-2.0 | Python | Chat-chain virtual software company (CEO/CTO/programmer/tester) | Research | ChatDev 2.0 |
| **langchain-ai/langgraph** | 42,585 | MIT | Python/JS | Graph state machine, durable execution | Production, HITL, auditability | Strongest production track record |
| **ag2ai/ag2** (ex-AutoGen) | 4,972 | Apache-2.0 | Python | AgentOS / conversations | Community continuation of AutoGen | Active |
| **camel-ai/camel** | 17,800 | Apache-2.0 | Python | Role-playing agent societies, scaling laws | Research on emergent role division | — |
| **kyegomez/swarms** | 7,227 | Apache-2.0 | Python | Hierarchical director/worker swarms | Enterprise primitives | Community controversy per Ry Walker |
| **google/adk-python** | 21,691 | Apache-2.0 | Python | Code-first agents on Google stack | GCP builders | Active |
| openai/swarm | 22,031 | MIT | Python | Lightweight orchestration | Education | Educational only |

## 2.3 Protocols & infrastructure (the "connections" layer)

| Project | Stars | License | What it standardizes | Why it matters for this idea |
| --- | --- | --- | --- | --- |
| **modelcontextprotocol/servers** (MCP) | 90,938 | NOASSERTION | Tool/data access for agents | The de-facto way agents connect to Slack, Drive, DBs, browsers |
| **a2aproject/A2A** | 25,987 | Apache-2.0 | Agent-to-agent messaging & delegation | Cross-vendor agent interop — the "reporting line" between companies/vendors |
| Paperclip adapters | — | MIT | Agent runtime abstraction (Claude Code, Codex, Cursor, Gemini, OpenClaw, Hermes, OpenCode, Pi, Grok, Kimi, HTTP/Bash) | "If it can receive a heartbeat, it's hired" |

## 2.4 Commercial SaaS (non-developer buyers)

| Product | Type | Org/hierarchy model | Pricing (published) | Open source | Notes |
| --- | --- | --- | --- | --- | --- |
| **TeamDay** | AI employees in spaces | Pre-built roles ("AI org chart") + Missions + MCP gateway | $19–$99/mo BYO key; $0 pay-as-you-go (credits + 50% fee); $999/mo dedicated | No | Closest SMB "hire AI employees" experience |
| **Relevance AI** | AI workforce | Drag-and-drop **Workforce Canvas**, handoffs, triggers | Free tier; from $29/mo; credits | SDK only | Sales/GTM focused; $150M raised |
| **Lindy** | Personal/team assistants | Assistants + trigger-action | $49.99–$199.99/mo | No | General automation, not org-chart-native |
| **Microsoft Copilot Studio** | Enterprise agent platform | Multi-agent orchestration, parent/child, **A2A GA 2026**, M365 Agents SDK, Fabric | Message packs + M365 licensing | No | The enterprise incumbent; governance/DLP/Entra |
| **Salesforce Agentforce** | CRM-native agents | Agentforce + agent-to-agent inside CRM | ~$2/conversation + licensing | No | Best if the company already runs on Salesforce |
| **OpenAI Workspace Agents** | ChatGPT team agents | Team agents, schedules, Slack | Seat-based; Business/Enterprise only; credits from May 2026 | No | Launched 2026-04-22 (research preview) |
| **Google Gemini Enterprise / Vertex Agent Builder** | GCP agents | Agent builder + A2A | Usage-based | Partial (ADK) | Enterprise GCP shops |
| **UiPath Maestro / IBM watsonx Orchestrate / Kore.ai / Aisera / OneReach** | Enterprise orchestration/governance | Process/BPMN-centric multi-agent | Enterprise contracts | No | Adjacent: orchestration & governance, not "your own AI company" |
| **PaperclipCloud** (3rd-party) | Managed hosting of Paperclip | Inherits Paperclip org chart | $21/$69/$149 per month | Hosts OSS | Evidence that people will pay to avoid self-hosting |

## 2.4b SaaS newcomers that are org-chart-native (2026 launches, non-developer buyers)

These matter because they are the closest thing to the user's idea already on the market as a product:

| Product | Position | Org model | Evidence | Status |
| --- | --- | --- | --- | --- |
| **Tycoon AI** (tycoon.us) | "Run one-person companies entirely with AI agents" | **AI CEO "Astra"** + 10+ ready agents (CMO, CTO, research, finance, legal); goals → plan → assignment → progress review → approval; task threads keep feedback; custom agents with own role/approval boundaries | **#1 Product Hunt daily 2026-05-21**, 536 weekly upvotes; founder claims prior AI-CEO-run companies reaching 100K+ users and $1M ARR in 30 days | Live |
| **Pancake** (getpancake.ai) | "Full AI org chart in Slack" across GTM, product, ops | Hire agents one by one, each matched to a real goal; company brain syncs meeting notes + Slack; **open-source Squad templates**; 23 agents × 3 tasks/day in the founders' own company | Product Hunt launch 2026-05-20 | Live |
| **OctoClaw** | "Hire AI specialists for marketing, sales, support" | Specialist agents, no code, guardrails | PH Mar 2026, top-10 of week; $9.99/mo | Live |
| **MakersClaw** | "Hire AI employees that live in your Slack, Teams, Telegram" | Agents inside chat platforms | PH Jun 2026 | Live |
| **Vokal** | "Collaboration space for 10x teammates with their AI agents" | Space where humans + agents work together | PH Jun 2026 | Live |
| **LobeHub** | "Your Chief Agent Operator for multi-agent work" | Multi-agent operator | PH May 2026 | Live |
| **Soloop** | "Approval-first Agent OS for solo founders" | Approval-gated agents | PH 2026 | Live |
| **Soren** (YC F2025) | "Builds the AI workforce for business operations" | AI workforce | YC directory | YC-backed |
| **Nexus** (YC F2025) | No-code production AI agents for non-technical teams | Agents, not full org chart | YC directory | YC-backed |
| **Ceetos/ClawCompany/others** | Paperclip-style role templates | Org chart | GitHub, 0–600★ | Small |

**Read:** the "hire AI employees / run a company with AI" idea is being launched **weekly** on Product
Hunt. Differentiation cannot be the concept — it must be execution, localization, governance or a
vertical.

## 2.4c MENA / Arabic platforms (adjacent, not org-chart products)

| Product | Country | What it does | Why it is not a full competitor |
| --- | --- | --- | --- |
| **Teammates.ai** | MENA | Named Arabic AI teammates: Raya (support), Adam (sales), Sara (recruiting); 4+ dialects; WhatsApp/email/phone | CX-only, no org chart/goals cascade |
| **tkana** | Saudi | AI agents on WhatsApp/web; "virtual employees (AIDA)" for sales, support, marketing | Vertical CX agent platform |
| **Wittify AI** | MENA | Arabic-first no-code voice/chat agents, 25+ dialects, ISO-certified, on-prem | CX automation |
| **Thikaa** | MENA | WhatsApp chatbot + voice agent, Salla integration, dialect support | E-commerce CX |
| **ChatSA / Misraj / Musaid / Arabic.AI** | Saudi / MENA | No-code Arabic agent builders, sovereign LLMs, government/enterprise focus | Agent builders, not company/org platforms |
| **Baseer** | Saudi | Directory/portal of Saudi AI agents | Content platform |

**Conclusion for the region:** Arabic **AI-agent and CX** platforms are numerous and funded
(Aligator raised $1.2M for PR agents, Oct 2026). Arabic **AI-company / org-chart + goals** platforms do
not exist yet. That is the unclaimed flank.

## 2.5b Games & simulators (the consumer-facing cousin of the idea)

| Title | Platform | What it is |
| --- | --- | --- |
| **AI Lab Tycoon** | Steam, 2026 | Management sim: hire researchers, manage research/finances, rival labs |
| **AI Company: Startup Simulator** | iOS | CEO of an AI startup: products, team, morale, reputation |
| **My AI Company: Build Your Startup** | Android | Idle/tycoon: hire devs/designers, offices, funding, rival startups |
| **AI Tycoon** | Android | Decision-driven AI company competition |
| **business-tycoon** | Browser (open source) | Isometric AI office simulator, hire specialists, build rooms, ship products |

These prove **consumer appetite for the metaphor**; several of them are more polished than the actual
B2B products in this category — relevant if a lightweight/educational tier is ever considered.

## 2.5 Research & simulations

| Work | What it proves | Link |
| --- | --- | --- |
| Stanford **Generative Agents** (2023) | Believable societies of agents with memory/reflection/planning | arXiv 2304.03442 |
| Altera **Project Sid** (2024) | 10–1,000+ agents autonomously develop specialized roles, rules, economy | arXiv 2411.00114 |
| **MetaGPT** (2023) | SOP-driven multi-agent "software company" beats single-agent baselines | arXiv 2308.00352 |
| **ChatDev** (2023/24) | Chat-chain virtual software company, full SDLC in minutes for <$1 (simple apps) | arXiv 2307.07924 |
| **TheAgentCompany** benchmark | Realistic office-work evaluation of agents | benchmark |
| HBS/HBR **Fuller, "An Onboarding Plan for AI Agents"** (Mar 2026) + 1,261-manager study cited by Ry Walker | The employee metaphor works but **erodes accountability/review quality** — governance must be architectural | hbs.edu |

## 2.6 Concentration / momentum read

- **Paperclip = ~2.4× the next-largest direct competitor** (95.8k vs Oh-My-ClaudeCode 39.5k) and the
  only one with a company behind it, monthly dated releases, an adapter ecosystem and a hosted cloud
  coming.
- The rest of the direct category is either **niche (OpenClaw/Claude-Code specific)** or **small and
  stalling** (agems last push 2026-05-26).
- The **general frameworks are healthier than the company-clone layer** — CrewAI, LangGraph and Google
  ADK all had commits within the last day; MetaGPT's last push was 2026-01-21 (slowing).
- **Enterprise is being taken by Microsoft/Salesforce from above**, while Paperclip takes developers
  and prosumers from below. The unclaimed middle is the **no-code, non-technical, localized SaaS**.
