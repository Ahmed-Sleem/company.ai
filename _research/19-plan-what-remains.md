# 19 — What remains, what code we take, and the plan

Written 2026-10-03, after the GUI stage closed: the designer's demo is locked as the style, its tokens
are centralized, the prototype carries the change request and the network view, and the four rule
documents govern the work. This is the practical answer to *“what's remaining, what code will we get
and adapt, what is the plan.”*

---

## 19.1 Where we are: the GUI stage is done

| Done | Evidence |
|---|---|
| The designer's demo in place, byte-verified, style locked | `design/designer-demo/` (blob `7dd2e203…`) |
| One design system: every value in one file | `design/tokens/company-os-pixel.css|json` |
| The change request implemented (E1–E8, A1–A6) | `_research/18-changes-implemented.md` |
| The network view — Obsidian-style, pixel style, no overlaps | `design/prototype/` (gate check: worst clearance +10px, hulls clear) |
| Rules received, classified, applied; conflicts resolved in writing | `_research/rules/README.md` |
| A working verification gate | `node design/prototype/verify.mjs` → 10/10, each check seen failing |

**What the GUI stage deliberately did not do:** no framework, no backend, no package installs, no
product repository structure. The prototype proves the interface; the product has to be built.

---

## 19.1b Publish: how the organised work reaches `main`

What is on GitHub today is the **old root layout** (your uploads). Everything organised since —
rules moved, demo renamed and placed, tokens, prototype, gate, plan — exists **only in this sandbox**,
because this session has no network and remote operations are disabled for it. The merge needs a place
with access:

| Route | What happens | Verdict |
|---|---|---|
| **New Arena coding session with GitHub access** | pushes this branch, opens a PR, deletes the leftover root files, and can start P0 in the same session | ⭐ recommended |
| **You apply a patch/zip locally** | the checkpoint zip has the whole tree; you push it | works, but you become the merge tool |
| **Hand-merge in the web editor** | slowest, error-prone, loses history | last resort |

Two hard rules while doing this: **never paste tokens into chat** (a pasted token is a leaked token —
revoke it and let the tool ask for credentials itself), and **do not delete `design/`** when cleaning the
root: it is the product's visual source and must survive deployment.

---

## 19.2 What remains — the whole remaining scope

### A. Decisions (answered 2026-10-03 — see `21-questions-and-decisions.md#answered`)

1. ✅ **Publish path — a new Arena session with GitHub access** pushes this branch, opens the PR,
   deletes the leftover root files, and starts P0 in the same session. Nothing else moves `main`.
2. ✅ **The wedge — organisation-first.** Team + Network (the graph) + Tasks; the graph is the
   differentiator and no competitor claims it (`_research/08` §unclaimed gap). Decisions/chats follow in P2.
3. ✅ **Tenancy — single company first**, multi-tenant modelled in the schema (every row carries a
   company id) but not exposed. `better-auth` org/RBAC lands when multi-tenant does, not in P0.
4. ✅ **Model routing — an internal gateway service from P0**, LiteLLM (MIT) behind our own thin API,
   PostgreSQL for keys/budgets; image digest pinned; per-agent and per-task budget caps; fallback-rate
   alerts. We own the registry, the audit trail and the selection policy.
5. ✅ **Repository — same repository.** The design system and the rules live here, and the harvest plan
   already targets `apps/` + `packages/`.
6. ✅ **Hosting — deferred by decision (2026-10-03): no hosting now.** "Maybe in the future: Railway,
   or our own VPS." The requirement on us is only that the code is **deploy-ready** (containers,
   env-driven config, one PostgreSQL, no hard SaaS dependencies) — Dockerfiles + `docker-compose.yml`
   land in P0/P1 so the deploy stage is a task, not a rewrite. Provider keys: ours, in env, never in git.
7. ☐ **Still open — providers for P0** (Q C3): OpenAI + Anthropic + one cheap lane is the recommendation.

### B. The product build (ordered; nothing here exists yet)

| # | Work | Deliverable | Depends on |
|---|---|---|---|
| B1 | Monorepo scaffold + token pipeline | `apps/web`, `packages/{canvas,graph,company,contracts}`, `services/{api,orchestrator}`, tokens generated from `company-os-pixel.json` | A2 |
| B2 | Verification gate for the product | `scripts/verify.sh` = format, lint, types, unit, a11y, token check, build, licence gate | B1 |
| B3 | Shell + Team + Tasks + Inbox on real state | the prototype's surfaces in the real stack, four data states each, RTL + both themes | B1, B2 |
| B4 | Conversations + model routing | thread list/thread, model selector wired to a real router, mentions, voice notes, message states | B3 |
| B5 | Network view in the product | React Flow (≤1,000 nodes) with the prototype's scopes/layouts/filters/legend; force layout in a worker; **positions persisted server-side** | B3 |
| B6 | Decision trust surface | the policy rule that triggered a request, a diff, bulk approve, audit trail | B3 |
| B7 | i18n as resources, avatar ids, attachment config | the three "product steps" left over from the review | B3 |
| B8 | Orchestration + sandbox | agents actually execute tasks; MCP/A2A; OTel traces | B4, B5 |
| B9 | Ops: server install script, env examples, backups, monitoring notes | `scripts/server-install-and-validate.sh` + deployment doc | B1 |

### C. Quality and verification still owed

- **Browser verification of the prototype** (the gate prints what it does not cover): rendering,
  contrast in both themes, focus order, gestures, screen-reader order, 200% zoom, 320px width.
- **Accessibility audit** on the built product: keyboard paths, names/roles, contrast, reduced motion.
- **Layout matrix** per the rules: 320×568 → 1920×1080, short-height windows, both directions.
- **Performance targets:** network view first paint, filter switch, and 1,000-node behaviour
  (the threshold where `_research/14` says React Flow needs PixiJS instead).
- **Licence gate:** `THIRD_PARTY_LICENSES.md` generated from harvested dependencies, wired into CI.

---

## 19.3 The code we get and adapt

Four modes, and every harvested file enters the repo one of these ways:

| Mode | Meaning |
|---|---|
| **depend** | install as a package; never edited |
| **vendor** | copy into `vendor/` or a package, with a `SOURCE.md` (repo, commit, licence, modifications) |
| **port** | read the pattern, write our own code in our stack and tokens (no copy) |
| **reference** | read-only; never copied (licence or quality) |

### Take code (permissive licences) — what we get from where

| Repo (licence) | What we take | Mode | Lands in |
|---|---|---|---|
| `xyflow/xyflow` — React Flow (MIT) | canvas engine: viewport, nodes, handles, minimap | depend | `packages/canvas` |
| `d3/d3-force` (ISC) | the physics we already prototyped (link, many-body, centre, drag, alpha decay) | depend | `packages/graph` |
| `vasturiano/react-force-graph` (MIT) | quick force-graph path if we want 2D/3D early | depend (optional) | `packages/graph` |
| `dagrejs/dagre` (MIT) | hierarchical layout for the org tree / Rings | depend | `packages/graph` |
| `cytoscape/cytoscape.js` (MIT) | graph algorithms: PageRank, clusters, stable layouts | depend (optional) | `packages/graph` |
| `pixijs/pixijs` (MIT) | WebGL renderer, only past ~1,000 nodes | depend (later) | `packages/graph` |
| `obsidianmd/jsoncanvas` (MIT) | Canvas file format — import/export of boards | depend | `packages/contracts` |
| `shadcn-ui/ui` (MIT) | the component kit, restyled **entirely** from our tokens | depend + port | `apps/web` |
| `better-auth/better-auth` (MIT) | auth, sessions, org/RBAC | depend | `services/api` |
| `paperclipai/paperclip` (MIT) | **domain model**: org chart, reports-to, budgets, approvals, heartbeats, skills, audit — the fields our demo already shows | port (re-implement against our contracts) | `packages/company` |
| `cft0808/edict` (MIT) | mandatory review gate + task state machine + audit stream | port | `packages/company` |
| `langchain-ai/langgraph` (MIT) | durable orchestration: checkpoints, human-in-the-loop pause | depend | `services/orchestrator` |
| `crewAIInc/crewAI` (MIT) | role/goal model + hierarchical manager process | depend (compare with MAF) | `services/orchestrator` |
| `microsoft/agent-framework` (MIT) | enterprise engine, native A2A/MCP, safer licence than AutoGen's CC-BY metadata | depend (alternative) | `services/orchestrator` |
| `langflow-ai/langflow` (MIT) | visual-builder UX patterns: node palette, inspector | port | `packages/canvas` |
| `Arturski/crew-ai-studio` (Apache-2.0) | studio feature blueprint: tools, MCP browser, evals, cost tracking, secrets, code export, dry-run | port | `packages/studio` |
| `OpenBMB/ChatDev` / `DevAll` (Apache-2.0) | drag-drop canvas patterns + replay visualiser | port | `packages/canvas` |
| `All-Hands-AI/OpenHands` (MIT) | sandboxed agent runtime, delegation | port / depend | `services/sandbox` |
| `e2b-dev/E2B` (Apache-2.0) | code-execution sandboxes | depend | `services/sandbox` |
| `BloopAI/vibe-kanban` (Apache-2.0) | kanban + worktree-per-task UX patterns | port | `apps/web` |
| `a2aproject/A2A` (Apache-2.0) | agent-to-agent delegation protocol | depend (spec/libs) | `packages/protocols` |
| `modelcontextprotocol/*` (MIT spec) | tool/data connectors | depend | `packages/protocols` |
| `vercel/ai` (⚠️ Apache-2.0 + notices) | model streaming helpers — **verify terms before shipping** | depend (after check) | `services/api` |

### Read-only reference (never copied)

`langgenius/dify` (multi-tenant restrictions), `flowiseai/Flowise`, `open-webui/open-webui`,
`lobehq/lobehub`, `langfuse/langfuse`, `Arize-ai/phoenix`, `kieler/elkjs` (EPL),
`n8n` (Sustainable Use), `Pane`/`Markus` (AGPL), `paperclipai/companies` (**no licence at all** —
ideas only). These inform UX decisions; their code does not enter the repository.

### How the harvest runs

```bash
bash _research/harvest/clone-all.sh      # clones every repo above into ~/harvest/ (outside the repo)
```

Then, per package: `depend` → add to `package.json`; `vendor` → copy + `SOURCE.md`; `port` → read,
rewrite in our stack and tokens. Keep `harvest/` out of git; the CI licence gate checks what actually
reaches `package.json`/`vendor/`.

---

## 19.4 The plan, phased

| Phase | Weeks | Goal | Acceptance criteria |
|---|---|---|---|
| **P0** Foundation | 3–4 | monorepo, token pipeline from `company-os-pixel.json`, gate script, auth skeleton, **model registry + gateway + run records** | `scripts/verify.sh` green; a page renders with generated tokens; no raw values; every model call goes through the gateway and is recorded with the resolved model, cost and trace id |
| **P1** Shell + Team + Tasks + Inbox | 3–4 | the prototype's surfaces on real state | parity with `design/prototype/company-os.html`; four data states each; RTL + dark/light verified; browser checks done |
| **P2** Conversations + routing | 4–5 | threads, model selector wired to the registry, mentions, voice notes, **unified conversation store (A2A-shaped messages, `contextId` grouping, per-message model provenance), context manager (budget, compaction at 75%, external memory, snapshots), anti-loop + redaction** | a real model answers in a thread; message states honest; every message shows which model produced it and what it cost; a long thread compacts without losing decisions |
| **P3** Network view | 3 | React Flow canvas with scopes/layouts/filters/legend; worker layout; server-persisted positions | 1,000 nodes at interactive frame rates; positions survive reload; list view equally complete |
| **P4** Decision trust + model lifecycle | 4–5 | policy rule + diff + bulk approve + audit trail; **deprecation watch (registry status, `deprecation_target`, dependency list per retiring model, migration checklist)** | every decision traceable to the rule that raised it; a retiring model shows exactly which agents/tasks depend on it |
| **P5** Orchestration + sandbox | 6–8 | agents execute tasks in sandboxes; MCP tools; **A2A endpoint for external agents with signed cards and per-peer tokens**; OTel traces | a task runs end-to-end with a human approval gate and a replayable trace; an external A2A agent can be delegated to and audited |

MVP = **P0 → P2** (≈ 10–14 weeks with 2–3 developers, the model layer included), with P3 next because it
is the differentiator.

Publishing the organised tree onto `main` is a separate, step-by-step guide for a non-expert:
`23-publish-guide.md` (Route A: a new session does it; Route B: click-by-click in the browser).
Deep repository scan and the one-stack decision: `22-harvest-deep-scan.md`.

Detailed research behind the model and conversation layers: `20-model-and-agent-lifecycle.md`.
Every decision and question, explained with recommendations: `21-questions-and-decisions.md`.

---

## 19.5 Next five actions

1. **Open the new Arena session with GitHub access** and have it: push `arena/01a0f9f3-company-ai`, open
   the PR, delete the leftover root files (`_research/00…16` from the old merge stay under `_research/`,
   the four rules files move to `_research/rules/`), and merge.
2. **In that same session: start P0.** Scaffold TypeScript + React + Vite on the stack chosen in
   `22-harvest-deep-scan.md` §22.2, wire the token pipeline from `design/tokens/company-os-pixel.json`,
   add `scripts/verify.sh` (tokens, lint, tests, **licence gate**), stand up the model gateway +
   registry (LiteLLM behind our API, digest pinned), and add the Dockerfiles + `docker-compose.yml`
   so the project is deploy-ready from the first phase (no hosting yet — the user's decision).
3. **Run the harvest clone script** (`_research/15-code-harvest-plan.md`); vendor nothing until the
   licence gate exists; every vendored file gets a `SOURCE.md` with its licence.
4. **Do the browser verification pass** on the current prototype (the gate lists exactly what is
   unverified) — cheap, and it closes the biggest honesty gap on this stage.
5. **Then P1** — port the prototype's Team/Tasks/Inbox screens onto the real stack, keeping the
   prototype open beside them as the visual reference, screen by screen, tokens only.
6. **Take the screenshots** (`design/screenshots/README.md`): one command on a machine with a browser
   (`npx playwright@latest install chromium && node design/screenshots/shots.mjs`) produces the 12
   PNGs, or take them by hand with the exact names. They become the README gallery; re-take affected
   shots when the prototype changes.
7. **Run harvest v2** (`22-harvest-deep-scan.md`, script `harvest/clone-all.sh`): clone the candidate
   repos side-by-side, keep the licence gate, and start with the P0 set (shadcn/Radix, better-auth,
   Drizzle, pg-boss, LiteLLM, OTel/Langfuse). Everything is adapted, never adopted as-is.

> Practical note on this sandbox: it has **no outbound network** and it re-clones the repository, so
> npm installs and pushing are impossible here. The work is captured in the workspace and in
> `_research/checkpoints/company_ai_phase_d2_network_view.zip`, which can be downloaded from the file
> viewer; a session with network access should push it and then start P0.
