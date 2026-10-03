# 21 — Decisions & questions log (nothing gets lost)

Every open question, explained, with a recommendation and a status. **Format:** each question states
*why it matters*, the options, ⭐ the recommendation, and where it is asked (*asked now* / *next round*).
When you answer, record the answer inline under **ANSWER** and move the item to the answered list.

**Rules for this file**
- Nothing is deleted: unanswered questions stay; answered ones keep their answer and date.
- A question that no longer matters is marked *dropped* with the reason.
- Recommendations are opinions, not decisions — they exist so every question is cheap to answer.

Status legend: ☐ open · ⭐ recommended · ✅ answered · — dropped

---

## Group A — Publish, repository, process

### A1. ✅ How does the organised work reach `main`? *(answered 2026-10-03 — see Answered)*
**Why it matters:** what you see on GitHub today is the old root layout; everything done since exists
only in this sandbox, which cannot push. Nothing else can be verified or built until `main` moves.
**Options**
1. ⭐ **A new Arena coding session with GitHub access** pushes this branch and opens a PR; you review the diff and merge. (Cleanest: preserves history, reviewable, and it can also delete the leftover root files.)
2. I produce a **single squashed patch + the checkpoint zip**; you apply it locally and push.
3. You **merge by hand** in GitHub's web editor from the zip's contents (slowest, most error-prone).
**Recommendation:** option 1, and while that session is open, have it do the first product step (P0) too.

### A2. Branch discipline once we build *(next round)*
**Why it matters:** rules require a green gate before any push; a solo builder with a fast loop tends to
skip it. Options: (1) trunk-based with required checks; (2) ⭐ short-lived feature branches + PR per
phase task; (3) long-lived `develop`. **Recommendation:** (2) — matches the rule "never push without a
green gate".

### A3. Checkpoint cadence *(next round)*
Options: per task / ⭐ per phase milestone + before every risky migration / weekly.
**Recommendation:** per milestone, stored in `_research/checkpoints/` (gitignored), exactly as now.

### A4. Who owns the rules *(next round)*
Options: (1) rules only change when you say so; (2) ⭐ you approve, an agent may propose changes in writing
(`_research/rules/README.md` already works this way); (3) agents may edit freely. **Recommendation:** (2).

---

## Group B — What we ship first

### B1. ✅ The wedge *(answered 2026-10-03 — see Answered)*
**Why it matters:** it decides the first three months of work and the first impression.
**Options**
1. ⭐ **Organisation-first** — Team + Network (the graph) + Tasks. The editable org graph is the one
   surface no competitor claims (`_research/08` §unclaimed gap); the demo already renders it.
2. **Cockpit-first** — Inbox (decisions) + Conversations. Best if the pain you feel daily is "approve
   and talk", not "see and organise".
3. **Vertical slice of both** — thin Team + thin Inbox end-to-end. Slower to look impressive, fastest to
   learn whether agents behaving in a real org is useful.
**Recommendation:** (1) if the pitch is *"see your company"*; (3) if you want to validate value before
polish. (2) is the best second phase either way.

### B2. ✅ Single company or multi-tenant SaaS? *(answered 2026-10-03 — see Answered)*
**Why it matters:** it changes auth, data model, cost accounting, and three licence traps (Dify's
multi-tenant restriction, open-webui's branding clause — we avoid them, but the *design* changes too).
Options: (1) ⭐ single company / internal first, multi-tenant modelled but not exposed; (2) multi-tenant
from day one; (3) single-tenant per customer (one deployment each).
**Recommendation:** (1) — cheapest path to a real product; `better-auth` org/RBAC is already in the plan
for when multi-tenant matters.

### B3. Mobile *(next round)*
Options: (1) desktop-only, graceful degradation; (2) ⭐ desktop-first, mobile = chat + approvals +
read-only board (per the development rules' mobile policy template); (3) full parity.
**Recommendation:** (2) — the demo already collapses well; canvas work is not a mobile job.

### B4. Is there a marketplace/plugin story? *(next round)*
Options: (1) no, internal tools only; (2) ⭐ MCP tools as the only extension point at first; (3) public
marketplace later. **Recommendation:** (2) — MCP is already planned, and a marketplace is a product
decision that needs users first.

---

## Group C — The model layer

### C1. ✅ Gateway now or later? *(answered 2026-10-03 — see Answered)*
**Why it matters:** it is the difference between "model names scattered in code" (the anti-pattern that
makes every provider change a migration) and one place that owns routing, cost and fallbacks.
**Options**
1. ⭐ **Internal gateway service from P0**, LiteLLM (MIT) as the engine behind our own thin API.
2. Direct provider SDKs now, gateway when a second provider arrives.
3. Hosted gateway (OpenRouter / Portkey) and inherit its routing.
**Recommendation:** (1). Evidence: fallback logic duplicated per service and no per-key cost view is the
documented anti-pattern (`_research/20` §20.1); self-hosting keeps licences and data in our control;
pin the image digest.

### C2. Model pinning policy *(asked now)*
**Why it matters:** a floating alias (`latest`) can change your product's behaviour without a deploy on
your side — the single most common silent regression in AI products.
**Options**
1. ⭐ **Pin dated snapshots in production; run the alias in a shadow lane**; record the resolved version
   in every run record; resolution changes trigger a re-qualification flag.
2. Follow aliases everywhere, re-evaluate monthly.
3. Pin only for the most critical agents.
**Recommendation:** (1) — cheap now, impossible to reconstruct later.

### C3. Which providers/models to support at P0 *(next round)*
Options: OpenAI + Anthropic only / ⭐ those two + a cheap open model (or local via vLLM) for routine work /
all major clouds through the gateway. **Recommendation:** the middle option, because the registry and
fallback chain only get honest with two very different providers plus one cheap lane.

### C4. Who owns evals? *(next round)*
Options: (1) nobody yet (fly blind); (2) ⭐ a small golden-set eval per agent type that runs in CI on
model change (the plan's `scripts/verify.sh` grows an eval job); (3) full offline eval platform.
**Recommendation:** (2) — the research is emphatic that the eval suite ships with the agent and runs in CI;
start with a golden set of real inputs per agent type.

### C5. Budget enforcement *(next round)*
Options: (1) report only; (2) ⭐ hard per-agent and per-task caps in the gateway, with the demo's budget
bar as the UI; (3) company-wide cap only. **Recommendation:** (2) — the demo already shows `spent/budget`
per employee; making it real is a small step and prevents the classic "fallback cost explosion".

---

## Group D — Model-to-model conversations

### D1. How visible are agent-to-agent chats? *(next round — high interest)*
**Why it matters:** you asked to see the chats between models; but full transcripts can drown a human.
Options
1. ⭐ **Thread view (full, playable, per-message provenance: agent, model, cost) + a digest summary** at
   the top and a "decisions only" filter.
2. Summaries and decisions only.
3. Full transcripts, no digest.
**Recommendation:** (1) — matches how people use Slack + read receipts: skim the digest, open the thread
when it matters.

### D2. Internal vs external agent comms *(next round)*
Options: (1) internal only (our orchestrator) for now; (2) ⭐ internal now, **A2A endpoint at P5** with
signed Agent Cards and per-peer tokens; (3) A2A from day one.
**Recommendation:** (2) — the research is explicit that same-machine agents should use in-process
delegation or a durable queue, and A2A is for crossing boundaries (`_research/20` §20.2).

### D3. Retention of agent conversations *(next round)*
Options: (1) forever; (2) ⭐ default: full transcripts 30–90 days, **decisions and their evidence kept
permanently**, everything exportable; (3) configurable per company from day one.
**Recommendation:** (2) with a per-company setting available by the time we have a second customer.

### D4. Anti-loop and injection guardrails *(next round)*
Options: (1) ⭐ per-context turn caps + peer text treated as untrusted + outbound secret redaction —
from day one; (2) add them when we open up to external agents. **Recommendation:** (1), it is cheap now.

### D5. Human-in-the-loop points *(next round)*
Options: (1) only when a policy rule triggers; (2) ⭐ that, plus explicit "ask a human" states an agent
can enter on its own; (3) everything requires approval (kills autonomy).
**Recommendation:** (2) — the demo's inbox already models both.

---

## Group E — Context, memory, cost

### E1. Context strategy *(next round)*
Options: (1) raw history until it breaks; (2) ⭐ budget + anchored compaction at 75% + external memory
written on-write + masked tool output + pre-compaction snapshots; (3) hand-off to a fresh agent instead
of compaction. **Recommendation:** (2) now, (3) for very long tasks later — the research says production
platforms combine them.

### E2. Where memory lives *(next round)*
Options: (1) ⭐ PostgreSQL + pgvector (already in the plan) with a small structured memory table for
durable facts; (2) a dedicated memory service; (3) files in the workspace.
**Recommendation:** (1) — one store, one backup story, no new dependency.

### E3. Cost transparency in the UI *(next round)*
Options: (1) company total only; (2) ⭐ per employee (already in the demo), per task, per conversation,
and "cost of delay" next to decisions; (3) also a full billing export. **Recommendation:** (2) now, (3)
when someone asks for an invoice.

---

## Group F — Design details still open with the designer

### F1. Board stage names — lock `Backlog / In progress / Review / Done`? *(next round)*
### F2. May the pixel face render **numerals** inside Arabic text? *(next round)*
**Recommendation:** numbers stay in the interface's readable face (pixel face suppressed under `ar`),
because Arabic letter joining plus pixel numerals reads poorly at 11–13px.
### F3. Avatar art: re-cut the 16 thirty-two-grid portraits at 48×48, or keep two deliberate sets? *(next round)*
**Recommendation:** re-cut — the runtime normalisation is a stopgap.
### F4. How many palettes ship? *(next round)* Six presets + custom are in the demo; more is a maintenance cost.
### F5. Should the prototype open on the Network page instead of Team? *(next round)* Trivial change; affects first impressions only.
### F6. Attachment limit 2 MB — keep? *(next round)*

---

## Answered — 2026-10-03 (round 1)

| # | Question | Answer | Consequence |
|---|---|---|---|
| A.6 | Hosting + data | ✅ **No hosting for now** — *"maybe in the future, railway or our own VPS; now we just have to code the project, ready for the deploy stage"* | Nothing is deployed now. P0/P1 add Dockerfiles + `docker-compose.yml` (app, PostgreSQL + pgvector, LiteLLM, Langfuse) and env-driven config, so deployment later is a task, not a rewrite |
| New | Screenshots for the README | ✅ **Real screenshots of the GUI must be saved into the repo** for later use in the README | `design/screenshots/` + `shots.mjs` capture script + the fixed 12-shot list; the README gallery is filled after the shots are taken (needs a machine with a browser — this sandbox has none) |
| A1 | How does the organised work reach `main`? | ✅ **A new Arena session with GitHub access** pushes the branch, opens the PR, deletes the leftover root files, then starts P0 | `main` moves only through that session; nothing else can be verified until it does |
| B1 | What do we ship first? | ✅ **Organisation-first** — Team + Network (graph) + Tasks | P1 = shell + Team/Tasks, P2 = conversations, P3 = the network view on the real stack; the graph is the pitch |
| B2 | Single company or multi-tenant SaaS? | ✅ **Single company first**; every table carries a company id, `better-auth` org/RBAC waits | Cheaper auth and data model now; no licence risk from multi-tenant clauses; multi-tenant stays a switch, not a rewrite |
| C1 | Where does model routing live? | ✅ **Internal gateway service from P0**, LiteLLM (MIT) as the engine behind our own API | P0 gains the registry, gateway, run records, budget caps, fallback alerts; provider keys stay ours |

Questions A1/B1/B2/C1 above are marked ✅ accordingly. Next round: C3 (providers), C4 (evals), C5
(budgets), D1–D5 (agent conversations), E1–E3 (context/memory/cost), F1–F6 (design details), and the
remaining hosting/data question in `19` §19.2 A.6.
