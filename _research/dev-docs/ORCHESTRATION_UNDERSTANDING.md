# Round 18 — Understanding: how the studio works today, and what "real orchestration" must mean

Written before any orchestration code moves. The owner's brief (uploads/…Developer Brief (1).md)
is the spec; this file is my reading of the CURRENT system against that spec, so the audit and
the diff can be argued line by line.

## 1. What exists today (verified by reading the code, not remembered)

**Data spine — `apps/web/src/data/store.ts` (zustand + persist, key `company.ai.save.v1`).**
One save holds: company profile, operator, agents, threads (one per employee, `messages[]` with
per-thread ids and stamps), tasks, decisions (mail), integrations, world plan, `demoMode`,
`notifyOn`. `pumpThread(threadId, lang)` is the chat turn scheduler: one queued message per
turn, `activeTurns` guard, stamp walk sent → delivered → seen.

**Who actually answers — the round-18 realness rule (shipped this round, tested):**
`live = person && conn && key && model` → real `chatCompletion` (typing dots while it thinks,
honest `— chat failed…` on throw). Else if `demoMode` → the labelled showroom's scripted voice.
Else → the honest "not connected" line. NO placeholder reply exists outside the labelled demo,
and only real or demo calls are written to the diary (`recordCall` in `lib/history.ts`, Dexie,
append-only, opens in a new tab, never summarized away).

**Work loop — `lib/engine.ts`.** A tick picks an open task; an agent wired to a real model gets
a real cycle (`chatTurn` + `lib/prompt.ts` contract: the model answers in ONE structured form,
parsed, clamped, transition-table-checked, note posted to its thread); malformed answer → one
format retry → fallback. `localHeartbeat` (fake progress) now runs ONLY in `demoMode`.

**Tools — `lib/tools.ts` + `lib/toolrun.ts`.** APP_TOOLS includes `message_employee`,
`ask_owner`, mail with attachments, GitHub-only integrations (`lib/integrations.ts`, MCP
handshake in `lib/mcp.ts`). Tools execute in the browser; there is no filesystem yet.

**Prompt — `lib/prompt.ts` `compileSystemPrompt(state, person, lang)`.** Already layers:
company profile + owner answers, identity, reporting line, clock/work hours, tool list,
current task, and the structured-turn contract. This is the seed of the brief's §3 layers.

**History — Dexie `company.ai-history`.** `recordCall` appends `{agentId, at, purpose,
provider, model, system, input, toolCalls, output}`; demo records nothing; the diary opens in
its own tab; the save file never contains it (privacy by separation).

## 2. What the brief demands that does NOT exist yet

| Brief section | Gap in today's build |
| --- | --- |
| §2 decisions, §5 orchestration | No root-manager routing: user-assigned tasks do not pass through the manager; no assigned-by-user vs assigned-by-manager flag on the board; employees can currently "report to owner" as a plain choice. |
| §3 prompt layers | System prompt has no summary-of-older-history block and no `search_history` tool; every call currently ships only what the turn needs, not a cost-aware history window. |
| §4 unified chat | Each view reads threads naturally, but the MODEL's view is not merged: a model does not see its colleague conversations and work-loop notes as one transcript. |
| §6 tasks | Only user creates interface tasks today; sub-managers cannot create tasks for their reports; no queue-and-ask-reply-after-cycle for busy employees beyond the one-per-turn lock. |
| §7 structure | No company workspace folder; file tools absent; no per-company isolated storage root (desktop app territory). |
| §9 code execution | None. Tools are pure JSON; no sandbox exists anywhere in the repo. |
| §10 settings | Integrations/notifications/limits exist; no cost section; no cheaper "summary model" setting. |
| §11 safety | Risky-action approvals exist (mail decisions + owner notes, shipped this round); no global policy/limits enforcement (spend caps, blocked tools). |
| §12 interface | Root-manager intro page exists (wizard step order), but roster management and manager page separation are partial. |

## 3. The desktop question (brief §16)

Everything above that touches files, sandboxed code execution, or background cycles wants a
desktop shell. Two honest candidates: **Electron** (mature, Chromium = the web app runs
unchanged, isolated-vm/node available, heavy binary) or **Tauri** (small, Rust side — the
existing TypeScript engine would need a rewrite or a sidecar). This is a decision for the
owner; the plan keeps the web build as a showroom either way.

## 4. Ground rules I will not break (standing owner constraints)

No mocks outside labelled demoMode · owner watches only the root URL · one-root tree · mail
one-pending-reply lock · stamps + one reply per turn · history in a new tab · no blue
focus/selection · bilingual · reduced-motion · GitHub-only integrations until the brief extends
them · world editing only under Build · tokens only, logical properties, scrollbars hidden but
scrollable.
