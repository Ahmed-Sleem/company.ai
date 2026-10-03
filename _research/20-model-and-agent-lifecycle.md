# 20 — Model lifecycle, model-to-model conversations, and context management

Deep-dive research for the two things you asked not to miss: **the history of each model and how we
manage it**, and **the chats between models**. Everything here is turn-ed into requirements that fold
into `19-plan-what-remains.md` and into the questions in `21-questions-and-decisions.md`.

Sources are cited inline by number; the reference list is at the end.

---

## 20.1 The model layer: a registry, not scattered model names

### What the industry actually does

- A production model registry is built on a **12-field metadata schema**: `model_id`, `version`,
  `owner`, `use_case`, `dataset_fingerprint`, `training_commit`, `hyperparameters`, `evaluation_metrics`,
  `risk_tier`, `compliance_tags`, `last_review_date`, **`deprecation_target`** — set *at registration*,
  not when the model is already dying. Versions are **immutable** (write-once), promotion is gated,
  and monitoring writes back into the registry so it stays current. [2]
- Deprecation is a staged process: **Legacy → Deprecated → Retired**, with 30+ days in each stage and
  a minimum **90–120 days total lead time** for models with many dependencies. Every deprecated model
  carries a `replaced_by_model_id` link so the replacement chain is traceable in both directions. [1]
- **Pinning is the rule that prevents silent behaviour changes.** "Pin production traffic to dated
  snapshots, never floating aliases, and run the alias in a shadow lane so you see behaviour changes
  before they reach users." A floating alias like `latest` *is still a dependency* — record the
  concrete version it resolved to at evaluation and release time. [3][5]
- **Model IDs live in a routing layer, never at the call site.** The eval suite ships with the agent
  and runs in CI; the rollback path is drilled before handoff. [5]
- Replacing a model is **a release, not a dependency bump**: "the same API shape does not establish
  behavioral, safety, latency or cost equivalence." A frozen, production-shaped decision contract is
  replayed against the candidate before any cutover. [3]
- The dependency inventory must include **aliases, fallbacks, batch jobs, graders, agents, cached
  routing decisions and agent sub-calls** — and must watch out for **SDKs, gateways and orchestration
  libraries that silently substitute a model after an error**, because silent fallback contaminates
  every comparison and hides retirement traffic. [3]
- Migration runbook that works: **inventory → impact/risk tiering → baseline capture → candidate
  evaluation → remediation → shadow → canary → ramp/cut → rollback drill.** Exit criteria are explicit
  at every stage. [5]

### What that means for us

| Requirement | Shape in our product |
|---|---|
| **Model registry** | a first-class table: provider, model id, **pinned snapshot**, context window, price in/out, capabilities (tools/vision/audio), status (active / deprecated / retired), `deprecation_target`, `replaced_by`, owner, last eval score |
| **Routing layer** | model ids never appear in feature code; the model selector in the UI reads the registry and shows *why* each option is offered (cost, capability, status) |
| **Run records** | every agent run stores the **resolved** model + version, prompt version, tools used, tokens, cost, latency, outcome, trace id — this *is* "the history of each model", per company |
| **Lifecycle events** | when a provider announces a retirement we already have the inventory (which agents/tasks use it) — the plan's P0 should not ship without this |
| **Cost attribution** | per agent, per task, per model — the demo already shows budget per employee; the registry supplies the price, the run log supplies the usage |
| **Alias discipline** | our own config may use a friendly name, but the run record always stores what it resolved to; resolution changes trigger a warning |

### Gateways: where the routing layer lives

| Option | Licence / model | Strengths | Watch out for |
|---|---|---|---|
| **LiteLLM** proxy | MIT, self-hosted | 100+ providers, fallback chains, retries/timeouts, per-key + per-team cost tracking, OpenAI-compatible | needs PostgreSQL (Redis optional); ~15–30 ms overhead; **pin the image digest — never `:latest`** (2026 supply-chain incident on this project) [1][2] |
| **Portkey** | gateway open, hosted paid | guardrails, semantic caching, observability [1] | managed dependency |
| **OpenRouter** | hosted only | 500+ models, price-based routing, one balance | per-token margin, **observability limited to activity logs** [1][5] |
| **Bifrost** | open source (Go) | ~11 µs overhead at 5K RPS [4] | younger ecosystem |
| **No gateway, direct SDKs** | — | zero infra | fallback logic duplicated per service, no per-key cost view — explicitly the anti-pattern [2] |

**Recommendation:** a **thin internal gateway service from P0**, with LiteLLM as the engine behind it
(MIT, self-hosted, licence-safe). Our own API in front so we can own the registry, the audit trail and
the model-selection policy rather than inherit someone else's. Budget caps and fallback-rate alerts
(>5% fallback, >2× baseline cost per request) are part of the same service. [1][4]

---

## 20.2 Model-to-model conversations: what to record, how to group it

### What the industry actually does

- **A2A (Agent2Agent)** is the open protocol (v0.3 stable → v1.0, Linux Foundation stewarded) for
  agents crossing process, machine or framework boundaries. Four shapes matter to us: **Agent Card**
  (identity, capabilities, auth), **Task** (id + state machine: submitted / working / completed /
  failed / cancelled), **Message** (role + parts: text, files, images, structured data), **Artifact**
  (immutable output). A **Context** groups a conversation across agents. [1][2][3]
- **Grouping is by `contextId`**: the first response mints it, every later message carries it, and
  tracing tools then collapse the whole multi-agent conversation into one thread. [4]
- **Everything is traceable by design**: A2A spec-level auth (OAuth2/API keys/mTLS), signed Agent
  Cards, per-task and per-message records, structured logs/metrics over OpenTelemetry. [1][2]
- **Guardrails that production deployments add on top:** per-context **turn caps** so two agents
  cannot ping-pong forever; **prompt-injection filtering** of inbound peer text (treated as untrusted);
  **outbound redaction** of credential-shaped strings; an append-only **audit log** per exchange. [3]
- **When *not* to use A2A:** for agents on the same machine, prefer in-process delegation or a durable
  work queue (their kanban example) — A2A is for crossing boundaries. That maps exactly onto our
  design: the org's internal agents share our orchestrator; A2A is for *external* or partner agents. [3]
- **MCP connects agents to tools; A2A connects agents to each other.** They are complementary, not
  alternatives. [2]

### What that means for us

1. **One message model, two transports.** Our internal agent chats and external A2A chats use the same
   stored shape (sender, parts, artifact refs, status, model used, cost, contextId). Internal = fast
   path through the orchestrator; external = A2A endpoint. The UI then has one conversation view with
   provenance on every message — *which agent, which model, which run, what it cost*.
2. **Every message carries provenance.** `contextId` groups a thread; each message records the model
   snapshot that produced it (this is the "chats between models" requirement, literally).
3. **The audit trail is append-only** and exportable per company/user — this also gives the decision
   inbox its evidence (the run + messages that produced a recommendation).
4. **Anti-loop and injection guardrails from day one** (turn caps per context, treat peer text as
   untrusted, redact secrets outbound). Cheap now, impossible to retrofit once agents talk freely.
5. **Human-in-the-loop is a first-class state**, not an error: a task waiting for approval is a normal
   state machine node (the demo's "needs approval" already models this).

---

## 20.3 Context and memory: making long agent conversations survive

The problem: a task runs for days; the window is finite; summarising everything loses the details that
mattered; and compaction **invalidates prompt caches**, so it has a real cost. [1]

What the field has settled on:

| Technique | When it wins | Cost |
|---|---|---|
| Keep system prompt + recent turns verbatim, summarise the middle | general chat and mixed work [1] | one extra call per compaction |
| **Structured/anchored summarisation** (fixed section template) | long-lived sessions; keeps fidelity | extra call, needs a template |
| **External memory offload** (facts written on-write, not at compaction) | durable facts: decisions, preferences, conventions | a store + retrieval |
| **Observation masking / tool-output compression** | tool-heavy agents: 26–54% token reduction at 95%+ accuracy — *the decision matters more than the raw output* [5] | none |
| **Hand-off instead of compaction** (spawn a fresh agent with a task summary) | very long tasks with clear milestones [5] | must capture all essential state |
| Retrieval over turns (episodic memory) | cross-session continuity | embedding + retrieval per step |

Numbers worth remembering: trigger compaction at **70–80% of the window**, not 95%+ — compacting late
leaves no room for a good summary ("context anxiety"). Keep a **pre-compaction snapshot** the agent can
re-read. Watch for the two classic failures: **context rot** (quality decays as the window fills) and
**context collapse** (repeated rewrites erode detail). [1][2][5]

**Design for us:** a per-thread token budget; compaction at 75% with an anchored template; durable
facts (decisions, budgets, conventions) written to an external memory store *when they happen*; tool
outputs masked rather than summarised; pre-compaction snapshots kept and linked from the thread; and
hand-off when a task crosses a milestone boundary. All of it visible in the UI as a "context" panel,
because you asked to see the history — not just for debugging, but as part of the product's trust story.

---

## 20.4 How this folds into the phases

Added to `19-plan-what-remains.md`:

- **P0** gains the **model registry + gateway + run records** (registry table, LiteLLM behind our API,
  price/cost columns, fallback chains with alerts, image digest pinning).
- **P2** gains the **unified conversation store** (A2A-shaped messages, `contextId` grouping, per-message
  model provenance, turn caps, redaction) and the **context manager** (budgeting, compaction at 75%,
  external memory, snapshots).
- **P4** gains lifecycle tooling: **deprecation watch** (registry status + `deprecation_target`, a
  screen showing which agents/tasks depend on a retiring model, and the migration runbook checklist).
- **P5** adds the real **A2A endpoint** for external agents, with signed cards and per-peer tokens.

---

## References

1. Deprecated model lifecycle management — stages, lead times, replacement linkage. https://artificial-intelligence-wiki.com/mlops-devops/model-versioning-and-registry/deprecated-model-lifecycle-management/
2. MLflow — AI model registry management checklist (12-field schema, immutability, promotion gates, retirement). https://mlflow.org/articles/tags/model-management-best-practices
3. LLM model deprecation migration runbook (pinning, alias recording, silent substitution risk, gated cutover). https://www.accessallgpt.com/research/llm-model-deprecation-migration-runbook
4. Arize — AI model lifecycle management: 7 stages, controls, tools (lineage as a dependency graph, supplier controls). https://arize.com/resources/ai-model-lifecycle-management/
5. Model deprecation migration runbook — 9-stage table, pin-to-snapshot rule, CI evals, rollback drill. https://opennash.com/blog/model-deprecation-migration-build-the-runbook-before-the/
6. A2A — definitive introduction (Agent Card, Task, Message, Artifact, Context; OTLP observability). https://agentdevpro.com/protocols/a2a/
7. InfoWorld — how A2A works; MCP vs A2A; auditability. https://www.infoworld.com/article/4088217/what-is-a2a-how-the-agent-to-agent-protocol-enables-autonomous-collaboration.html
8. Hermes — A2A plugin: per-peer tokens, prompt-injection filtering, outbound redaction, per-context turn caps, audit log. https://hermes-agent.nousresearch.com/docs/user-guide/messaging/a2a
9. LangChain — A2A endpoint: `contextId` grouping across agents into one trace thread. https://docs.langchain.com/langsmith/server-a2a
10. LiteLLM vs Portkey vs OpenRouter (routing, fallbacks, cost tracking, deployment models). https://www.developersdigest.tech/blog/llm-router-comparison-2026
11. LiteLLM gateway architecture (Postgres for keys/budgets, Redis optional, digest pinning, fallback chains). https://markaicode.com/architecture/litellm-gateway-architecture/
12. LLM fallback strategies (chain design, cost explosion, alert thresholds). https://www.buildmvpfast.com/blog/llm-fallback-strategies-primary-model-secondary-model-2026
13. Context compaction for long-running sessions (four strategies, cache tension, 75% threshold, snapshot). https://zylos.ai/research/2026-04-21-agent-context-compaction-long-running-sessions/
14. Context engineering practitioner guide (memory hierarchy, rot/collapse, tool scoping). https://www.ayautomate.com/blog/context-engineering
15. Compaction vs summarization (observation masking 26–54% savings at 95%+ accuracy; hand-off pattern; 80% threshold). https://www.morphllm.com/compaction-vs-summarization
