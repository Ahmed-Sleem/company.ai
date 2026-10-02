# 08 — Do they all have a GUI? (verified inventory)

**Short answer: No — but most now do. The important finding is *what kind* of GUI they have.**

Almost every product in the category has *some* graphical surface in 2026. But when you look at what the
GUI actually models, they fall into four families — and **none of them models the organisation itself as
an editable graph**:

| GUI family | What the user manipulates | Examples |
| --- | --- | --- |
| **1. Workflow canvas** | Nodes = steps/agents, edges = **data flow / order of execution** | Langflow, Dify, Flowise, LangGraph Studio, CrewAI Studio, **ChatDev 2.0 (DevAll)**, AutoGen Studio, LangTailor |
| **2. Task board / inbox** | Cards = tasks, columns = status (work, not people) | Paperclip, Vibe Kanban, Conductor, Crystal, Nimbalyst, OpenHands, Pancake (Slack) |
| **3. Org tree (read-only)** | A rendered tree of who reports to whom — you look, you don't design | Paperclip "org chart view", TeamDay "AI org chart", MGX team view |
| **4. Chat / messaging** | Text to an AI CEO or assistant | Tycoon AI ("text Astra"), Copilot Studio, Lindy, Pancake |

**The unclaimed GUI: an editable org graph as the primary surface** — drag employees in, draw the
reporting/delegation/review/budget edges, attach goals to nodes, and watch work + cost flow along those
edges. ChatDev 2.0, Langflow and CrewAI Studio prove users can handle canvas UIs — but all three use
that canvas for *workflow*, not for *org design*.

## 8.1 GUI inventory — open source

| Project | Stars (2026-10-02) | License | GUI? | GUI type | Notes |
| --- | --- | --- | --- | --- | --- |
| **Paperclip** | 95,837 | MIT | ✅ | Task manager + **org chart view** + dashboards | React UI; the org chart is a *view* of agents you create via forms, not a drag-drop canvas |
| **Oh-My-ClaudeCode** | 39,517 | MIT | ❌ | CLI / harness | Terminal workflow |
| **ChatDev 2.0 (DevAll)** | 34,432 | Apache-2.0 | ✅ | **Zero-code drag-drop canvas** (Vue 3 + FastAPI), YAML flows, Python SDK | EMNLP 2026 demo; infinite canvas, loops, nesting; *workflow* semantics |
| **Edict** | 16,963 | MIT | ✅ | Dashboard (10 panels: kanban, agent health, memorial archive, token leaderboard) | Chinese-first; OpenClaw-only |
| **Langflow** | 155,441 | MIT | ✅ | Drag-drop agent/RAG canvas + playground | Huge adoption; generic agent builder, no company model |
| **Dify** | 157,695 | ⚠️ NOASSERTION (custom) | ✅ | Workflow + agent + RAG + BaaS UI | **License restricts multi-tenant SaaS / white-label** — verify before reuse |
| **Flowise** | 55,493 | ⚠️ NOASSERTION (custom) | ✅ | Visual agent builder | Same caution as Dify |
| **LobeHub** | 82,950 | ⚠️ NOASSERTION | ✅ | Multi-agent chat workspace ("Chief Agent Operator") | Rich UI; custom license |
| **OpenHands** | 89,747 | MIT | ✅ | Web GUI for autonomous coding agents, delegation, sandbox | Best permissive full agent platform |
| **Vibe Kanban** | 28,234 | Apache-2.0 | ✅ | Kanban board, one worktree per task, live agent stream | Community-maintained after Bloop shutdown (Apr 2026) |
| **Crystal** | 3,123 | MIT | ✅ | Desktop app, side-by-side run comparison | Deprecated Feb 2026 → successor Nimbalyst |
| **Crew AI Studio** (community) | 3 | Apache-2.0 | ✅ | Browser canvas + 103 tools + MCP + evals + cost + HITL + code export + dry-run | Tiny but **the best feature blueprint for our studio** |
| **PraisonAI** | 9,120 | MIT | ✅ (UI + CLI) | "Hire a 24/7 AI workforce" | Closest OSS to the *workforce* framing |
| **AutoGen Studio** | (in microsoft/autogen) | ⚠️ CC-BY-4.0 in repo | ✅ | No-code multi-agent builder | **Explicitly not production-ready**, no auth |
| **LangGraph Studio v2** | (product, free local) | proprietary product | ✅ | Browser visual IDE: graph render, state inspection, **time-travel debugging**, hot reload | Dev tool, not an end-user product |
| **OpenInsight** | 65 | Apache-2.0 | ✅ | "Enterprise Agent OS" with AI employees | Tiny but same concept |
| **5dive / Canopy / agems / Alook** | 63 / 231 / 42 / 1,192 | MIT / NOASSERT / NOASSERT / Apache-2.0 | mixed | mostly CLI/rooms | Small |

## 8.2 GUI inventory — commercial

| Product | GUI? | GUI type | Non-technical friendly? |
| --- | --- | --- | --- |
| **Tycoon AI** | ✅ | Chat with AI CEO "Astra" + task threads + approvals | ✅ Highest — no API keys, agents out of the box |
| **Pancake** | ✅ | Slack-native org chart (agents as members, daily digest) | ✅ if you live in Slack |
| **TeamDay** | ✅ | Web app: named AI employees, Spaces, Missions, review | ✅ |
| **Relevance AI** | ✅ | **Workforce Canvas** — drag-drop agents, handoffs, triggers | ✅ |
| **Lindy** | ✅ | No-code assistant builder, 200+ integrations | ✅ |
| **Copilot Studio** | ✅ | Visual designer, multi-agent orchestration, A2A (GA 2026) | 🟡 enterprise makers |
| **Salesforce Agentforce** | ✅ | CRM-native agent builder | 🟡 Salesforce admins |
| **MGX (MetaGPT X)** | ✅ | Web "AI dev team" — chat with PM/architect/engineer, visual builder | ✅ but software-dev only |
| **Paperclip Cloud** | 🟡 waitlist | Same React UI when hosted | ❌ still needs agent runtimes |

## 8.3 What the GUI inventory tells us (the strategic read)

1. **"Does it have a GUI?" is no longer a differentiator** — the market caught up in 2026. Even ChatDev
   (a research framework) shipped a zero-code drag-drop console.
2. **The differentiation has moved up a level: GUI *for what*.** Everyone built a GUI for *workflows*.
   Nobody built one for *organisations*.
3. **The closest thing to our idea visually is ChatDev 2.0's canvas + Crew AI Studio's feature set +
   Paperclip's domain model.** Combining those three concepts (canvas UX + studio features + company
   semantics) is the product.
4. **Non-technical friendliness is still rare in OSS.** AutoGen Studio is explicitly non-production;
   CrewAI Studio is a 3-star community project; LangGraph Studio is a developer IDE. The polished,
   hosted, no-code experience is open — and that is exactly what Tycoon AI is monetising.
5. **Licence traps are real** (Dify/Flowise/LobeHub are NOT permissive OSS). See
   `09-reuse-and-licensing-map.md` before copying any UI code.
