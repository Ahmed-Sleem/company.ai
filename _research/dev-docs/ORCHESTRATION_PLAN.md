# Round 18 — Plan: from showroom to real company, in phases, on borrowed shoulders

The build order for the brief's orchestration system. Rule zero (owner): search, read code,
adapt existing repos, credit them in README §Credits — never rebuild what is maintained.
Every phase ends gate-green + pushed + logged in THINGS_DONE.md.

## Phase 0 — the owner's decisions (ANSWERED 2026-10-12, binding)

1. **Desktop shell: TAURI** (owner's pick, over the Electron recommendation). Consequence,
   accepted: the TypeScript engine stays in the webview UI; everything that needs the OS —
   the company workspace folder, sandboxed code execution, background cycles — lives in the
   Rust side. Code sandbox = **deno_core** (see research cycle 5), files = Rust commands.
2. **The online build becomes the demo, only** (owner's words: "make the online thing only
   the demo, just the demo with the download link to the app"). The root URL keeps the
   labelled demo showroom and gains a download section for the desktop app; the wizard and
   the real-company flow move into the desktop app. Landing copy updates accordingly.
3. **Sub-managers do NOT create interface tasks** — only user + root (brief §6 stands).
   Manager-assigned work still happens through the manager's own model decisions, flagged.
4. **The manager IS notified** when the owner chats their report directly — the reporting
   line stays informed; the manager's next cycle sees it in context.

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

## Phase 3 — workspace, files, code execution (Tauri side)

Per-company folder under the app's data dir; file tools (read/write/list) as Rust commands
exposed to the webview engine; risky writes → mail approval (decision pipeline shipped this
round already carries owner notes). Code execution: **deno_core** in the Rust process — one
V8 isolate per code tool call, hard memory ceiling, no injected globals except our file
bridge (research cycles 1 and 5; `node:vm` is documented NOT a security boundary and
vm2-style jails keep breaking). Python stays out of scope until a real need appears.

## Phase 5 — the online build becomes the showroom (owner decision 2)

Root URL = landing + the labelled demo + a download section for the desktop app (links per
OS, version from the release). The wizard/real-company entry points come off the web build
when the first desktop release ships — not before, so the root URL the owner watches never
serves a broken door.

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

### Cycle 5 — the Tauri-side sandbox (2026-10-12, after the owner chose Tauri)
- **deno_core** (crates.io, MIT, 0.412.0 Sep 2026, ~650k downloads/month, powers Deno):
  `JsRuntime` = a V8 isolate with an event loop; Rust functions injected via the
  `extension!` macro are the ONLY bridge — exactly the isolated-vm security story, natively
  in Rust, no Node sidecar to ship. DECISION: deno_core for the code tool; credit denoland
  in README alongside the MCP SDK.

## Definition of done (brief §15, restated)

No mocks anywhere outside labelled demoMode · every employee answers from its own real key or
says honestly that it cannot · routing, memory, files, sandbox, approvals all real · gate
green · README credits every borrowed repo · the owner's four decisions implemented exactly
as answered: Tauri shell, online = demo + download only, tasks from user + root only,
managers informed of direct chats.
