# Round 18 — Plan: from showroom to real company, in phases, on borrowed shoulders

The build order for the brief's orchestration system. Rule zero (owner): search, read code,
adapt existing repos, credit them in README §Credits — never rebuild what is maintained.
Every phase ends gate-green + pushed + logged in THINGS_DONE.md.

## Phase 0 — the owner's decisions (BLOCKER, asked this round)

1. **Desktop shell: Electron vs Tauri.** Recommendation: **Electron** — the entire TypeScript
   engine, Dexie history, and web UI move unchanged; Node gives file tools + isolated-vm;
   Tauri would force a Rust rewrite or sidecar of the engine we already have.
2. **Keep the web build as the public showroom?** Recommendation: yes — the root URL the
   owner watches keeps working; desktop adds the real workspace on top of the same code.
3. **Sub-managers create interface tasks?** Assumed NO (brief §6: only user + root) — confirm.
4. **Manager notified when the user chats an employee directly?** Assumed YES — confirm.

## Phase 1 — orchestration truth (web-safe, no shell needed)

- Root is the only door for the owner's instructions: `sendOwnerMessage` on a non-root thread
  routes through the root's thread with a mandatory-relay contract in the system prompt;
  root assigns with `assignedBy: 'user' | 'manager'` stamped on the task; board shows the flag.
- Employees never report to the user: wizard + settings restrict `managerId` choices; root
  delivers by mail only (existing `ask_owner` path).
- Busy employee: queue exists (one-per-turn lock); add "will answer after the cycle" state +
  notification on arrival (notify.ts already shipped).
- Tests: routing test (user→employee lands in root thread), flag test, busy-defer test.

## Phase 2 — the model's real memory

- Per-employee transcript stays append-only (Dexie, shipped). Add to `compileSystemPrompt`:
  fixed context + summary-of-older-history + recent messages.
- Summary model = a cheaper `ModelConnection` in Settings (new section); summarizer writes a
  rolling summary row — the raw rows are NEVER deleted (brief §4, standing rule).
- `search_history` tool: Phase 2a = Dexie keyword search (zero deps); Phase 2b (desktop) =
  embeddings. Research below picks the store.

## Phase 3 — workspace, files, code execution (desktop-gated)

Per-company folder under the app's userData; file tools (read/write/list) exposed as app
tools; risky writes → mail approval (decision pipeline shipped this round already carries
owner notes). Code execution: **isolated-vm** (V8 isolates; sub-ms startup, hard memory
ceiling; `node:vm` is documented NOT a security boundary and vm2-style jails keep breaking —
research cycle 1). Python stays out of scope until a real need appears.

## Phase 4 — settings completeness + safety

Cost section (per-model price table, spend cap, pause-and-ask on breach), limits section
(max tool calls per cycle, blocked tools), integrations grow MCP servers beyond GitHub per
brief §10 (owner said GitHub-only "until the brief extends them" — the brief does).

## Research cycles (appended as they run; sources kept in the doc, code credited in README)

### Cycle 1 — sandboxed code execution on-device (2026-10-12)
- `node:vm` is explicitly not a security mechanism; prototype-chain escapes are trivial
  (dev.to comparison, Oct 2026). `worker_threads` = isolation of crashes, not security.
- **isolated-vm** = real V8::Isolate per sandbox (what Cloudflare Workers/Deno build on):
  <1ms startup, hard memory ceilings, only the host functions you inject can escape
  (stackoverflow, canonical answer; dev.to matrix 2026). DECISION: isolated-vm in Electron
  main process, one isolate per code tool call, no injected globals except our file bridge.

### Cycle 2 — MCP as the connector standard (2026-10-12)
- `@modelcontextprotocol/sdk` (MIT): `Client` + `StdioClientTransport` (local servers) or
  `StreamableHTTPClientTransport` (remote), then `listTools()`/`callTool()` — maps 1:1 onto
  our existing `integrationToolDefs` + `runToolAsync` shape (nerdleveltech tutorial Jun 2026;
  modelcontextprotocol.info node tutorial). DECISION: adopt the official SDK, keep our
  handshake UX; credit in README.

### Cycle 3 — one key, many models (2026-10-12)
- OpenRouter: one OpenAI-compatible endpoint, 400–500+ models, change `base_url` + key only,
  built-in fallback routing, no per-token markup (apiscout Mar 2026; freeapihub Jul 2026).
  DECISION: add "openrouter" as a provider option beside openai/anthropic/gemini/custom —
  zero new code paths, it IS the custom path with a known base URL; document it in the
  wizard. Direct provider keys stay first-class (privacy-minded owners).

### Cycle 4 — history that stays raw but answers fast (2026-10-12)
- PGlite + pgvector + Transformers.js (gte-small) = fully local semantic search in-browser,
  IndexedDB-backed (supabase.com/blog/in-browser-semantic-search-pglite; tbrockman/
  pglite-vector-search). sqlite-vec = same idea on SQLite, `vec0` virtual tables, 384-dim
  MiniLM (dev.to Mar 2026).
- DECISION: keep Dexie as the append-only diary of record (shipped, tested); add PGlite+
  pgvector ONLY as a derived search index inside the desktop workspace — rebuilding it from
  the diary must always be possible, so "never deleted by summarizing" stays literally true.

## Definition of done (brief §15, restated)

No mocks anywhere outside labelled demoMode · every employee answers from its own real key or
says honestly that it cannot · routing, memory, files, sandbox, approvals all real · gate
green · README credits every borrowed repo · owner's four decisions implemented as answered.
