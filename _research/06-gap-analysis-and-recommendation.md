# 06 — Gap analysis & recommendation

## 6.1 Where the market is hollow

| Gap | Evidence | Who feels it |
| --- | --- | --- |
| **No-code, browser-only, multi-tenant "AI company" builder** | Paperclip (leader) requires Node 24/pnpm/Docker, agents, and config before value; its cloud is a waitlist with no price. CrewAI/LangGraph are code-only. Visual builders (Langflow/n8n) have no org/company model | Non-technical founders, agencies, SMB owners |
| **Visual org graph with typed edges** | Paperclip shows an org tree view but the user's "connections between them" as a designable graph (delegates/reviews/informs/shared-budget) is not exposed as a drag-drop canvas anywhere in the category | Operations-minded users |
| **Goal cascade UI with per-action traceability** | Goals exist (Paperclip Goal Alignment) but as task metadata, not as a first-class cascade visualisation (mission → objective → KR → task → run) | Managers/owners who must justify spend |
| **Simulation & evals before hiring** | Paperclip ships evals for skills; no product lets you *dry-run a whole org chart* against a scenario with a cost estimate | Anyone afraid of burning tokens |
| **Arabic-first / RTL / dialect-aware, WhatsApp-native** | Zero occurrences in the category (all direct competitors are English-first or Chinese-first) | MENA SMEs, agencies, government-adjacent, Egypt (110M+) |
| **Trust-first framing** | HBR/HBS accountability critique; enterprise buyers ask "who approved this?" | Regulated/enterprise buyers |
| **Managed hosting at consumer price** | PaperclipCloud charges $21–149/mo to host OSS; TeamDay $19–99/mo | People who won't self-host |

## 6.2 Recommendation

**Do not build "an AI company platform" generically.** Build the **no-code Arabic-first AI company
builder** on top of proven engines — i.e. own the *experience, governance and localization layer*, not
the orchestration primitives.

### Positioning statement
> "Open a browser, drag your company into existence, and every AI employee knows their boss, their
> budget and their goal — with every action approved, traced and reversible. Arabic-first."

### The six differentiators (in build order)
1. **Canvas** — drag-drop org graph: nodes = agents (with role/model/budget), edges = typed relations
   (reports-to, delegates-to, reviews, informs, shares-budget). Export/import as JSON company templates.
2. **Goal tree** — mission → objectives → key results → projects → tasks, with roll-up KPIs and a
   click-through from any goal to the runs that served it.
3. **Simulation mode** — dry-run the org against a scenario for N simulated days; output: cost estimate,
   bottlenecks, failure modes, token burn per agent. "Try before you hire."
4. **Governance & ledger** — approval gates, per-agent/company budgets with hard stops, kill switch,
   append-only "who approved/why" ledger, reversal of any action.
5. **Arabic-first** — RTL UI, Arabic prompts/SOUL files, dialect handling for Egyptian/Gulf, WhatsApp +
   local channel integrations, EGP/AED/SAR billing, data-residency choice.
6. **Templates** — one-click companies for proven local use cases: e-commerce ops, social agency,
   content studio, real-estate lead desk, clinic front desk.

### Engine choice
- **LangGraph** for durable orchestration (checkpoints, HITL, retries) + **CrewAI-style role model** in
  the data model, behind an **adapter layer** so Claude Code / Codex / Cursor / Gemini CLI / OpenClaw /
  HTTP / hosted models all work as "employees".
- **MCP** for tools, **A2A** for cross-system delegation.
- Stack: Next.js + React Flow, Postgres, Temporal/BullMQ, e2b-style sandbox, OpenTelemetry.

### MVP scope (single vertical wedge, ~8–12 weeks)
- Phase 1: Canvas + agents + typed edges + heartbeats + one adapter (hosted model) + budgets.
- Phase 2: Goal tree + approvals + ledger + run transcripts.
- Phase 3: Arabic RTL + WhatsApp connector + 3 templates + simulation mode (cost/failure preview).
- Phase 4: Second adapter (Claude Code/Codex), template marketplace, skill install/evals.

### Success metrics
- Time-to-first-company < 5 min; time-to-first-useful-output < 30 min.
- % of runs attributable to a goal (target 100%); % of spend under budget (target 100%).
- Weekly active companies, runs/company, retention of templates, cost per successful outcome.

## 6.3 Decision matrix: build / fork / wrap

| Option | Effort | Control | Risk | Verdict |
| --- | --- | --- | --- | --- |
| Fork Paperclip and add no-code + Arabic UX | Medium | Medium (MIT allows it) | Upstream moves fast (95k★, monthly releases); thousands of issues | Viable accelerator for **self-host/enterprise** tier |
| Build on CrewAI/LangGraph from scratch | High | High | Slow to parity with Paperclip's feature depth | **Recommended for the SaaS product** |
| Wrap Paperclip as managed hosting | Low | Low | Thin margin, no moat (PaperclipCloud exists) | Quick revenue experiment only |
| Pure vertical SaaS (e.g. AI agency-in-a-box) | Medium | High | Narrow TAM | **Recommended go-to-market wedge inside the product** |

## 6.4 Go / no-go verdict

- **Concept valid?** Yes — proven by adoption, funding and research.
- **Novel?** No — do not pitch it as new to investors who know Paperclip.
- **Winnable?** Only with a specific wedge: **no-code + visual org graph + goals + trust/audit +
  Arabic-first/MENA**, launched vertical-first.
- **Biggest single risk:** shipping a generic clone that loses to Paperclip's 95k-star ecosystem.
