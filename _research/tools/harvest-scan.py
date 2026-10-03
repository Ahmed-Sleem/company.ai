#!/usr/bin/env python3
"""harvest-scan.py — the mix-and-match sweep.

Purpose (user instruction, 2026-10-03): before building anything ourselves, sweep GitHub
wide and deep, then assemble our product from the best existing pieces — depend / vendor /
port / reference — with licences verified mechanically, never by memory.

This is the tool that produces `_research/24-mix-and-match-inventory.md`. It is re-runnable:
every claim in that document can be regenerated with the command printed at the end.

Stages
  meta    repository metadata for every candidate (licence, stars, activity, description)
  trees   the file tree of the shortlist, filtered to component-ish paths (file-level picks)
  fetch   download the picked files for close reading (never into the git repo)
  report  write the markdown tables used by document 24

Usage
  GITHUB_TOKEN=... python3 harvest-scan.py meta
  GITHUB_TOKEN=... python3 harvest-scan.py trees --only langgraph,librechat,xyflow
  GITHUB_TOKEN=... python3 harvest-scan.py report

Outputs (outside the git repo, by design — see _research/15-code-harvest-plan.md):
  ~/harvest/scan/metadata.json        raw API objects, one per repo
  ~/harvest/scan/trees/<repo>.json    filtered file paths
  ~/harvest/scan/fetched/<repo>/...   file contents for reading
  ~/harvest/scan/metadata.md          the readable table

Licence handling: the API's SPDX id is trusted only when it is a recognised identifier; when
it is absent or 'NOASSERTION' the LICENSE file is fetched and sniffed, because "no licence"
is a fact we must never guess (paperclipai/companies taught us that).
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.expanduser("~/harvest/scan")
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN", "")

# ─────────────────────────────────────────────────────────────────────────────
# The candidate universe. `status` is one of:
#   take      — permissive, code may be shipped (after the CI licence gate confirms)
#   reference — read for patterns only (copyleft / weak-copyleft / source-available)
#   blocked   — never take code (no licence, or a licence that forbids our use)
# `role` says what part of OUR product this repo could serve. That is the whole point:
# a repository is only interesting as a donor for a named screen or subsystem.
# ─────────────────────────────────────────────────────────────────────────────
REPOS: list[tuple[str, str, str, str]] = [
    # ── shell, design system, UI primitives ────────────────────────────────
    ("shadcn-ui/ui", "shell-ui", "take", "the base of every screen: components copied in and restyled from our tokens"),
    ("radix-ui/primitives", "shell-ui", "take", "headless behaviour + focus management under every overlay"),
    ("mui/base-ui", "shell-ui", "take", "second headless primitive set; compare for the ones Radix lacks"),
    ("origin-space/originui", "shell-ui", "blocked", "denser shadcn-compatible component variants (tables, filters)"),
    ("shadcnblocks/kibo", "shell-ui", "take", "kanban + gantt + editor + dropzone primitives we would otherwise write"),
    ("magicuidesign/magicui", "shell-ui", "take", "motion patterns for empty/loading states"),
    ("nolly-studio/cult-ui", "shell-ui", "take", "agentic UI patterns: approval card, streaming text, toolbar"),
    ("CopilotKit/CopilotKit", "shell-ui", "take", "in-app agent surfaces + AG-UI glue for the chat dock"),
    ("pacocoursey/cmdk", "shell-ui", "take", "command palette — the fastest keyboard path through six views"),
    ("emilkowalski/sonner", "shell-ui", "take", "toasts on top of the four data states"),
    ("emilkowalski/vaul", "shell-ui", "take", "drawer for the mobile shell (RTL-safe)"),
    ("tremorlabs/tremor", "shell-ui", "take", "dashboard blocks: the cost + usage panels"),

    # ── data display, charts, interaction ──────────────────────────────────
    ("TanStack/table", "data-display", "take", "task board and audit tables: sorting/filter/selection headless"),
    ("TanStack/virtual", "data-display", "take", "long message + run lists without the DOM dying"),
    ("recharts/recharts", "data-display", "take", "default charts (SVG, RTL-able, token-friendly)"),
    ("airbnb/visx", "data-display", "take", "charts that need to be drawn to spec rather than themed"),
    ("plouc/nivo", "data-display", "take", "alternative chart set; compare on RTL labels"),
    ("apache/echarts", "data-display", "take", "heavy analytics (spend over time, per-agent rollups)"),
    ("clauderic/dnd-kit", "data-display", "take", "the drag layer (board columns, palette reorder)"),
    ("bvaughn/react-resizable-panels", "data-display", "take", "the three-pane shell (nav / canvas / inspector)"),
    ("lucide-icons/lucide", "data-display", "take", "icon set already used by the demo"),
    ("tabler/tabler-icons", "data-display", "take", "fallback icons where Lucide lacks a glyph"),
    ("phosphor-icons/react", "data-display", "take", "avatar/role glyphs"),
    ("framer/motion", "data-display", "take", "130ms state motion, reduce-motion aware"),
    ("vercel/streamdown", "data-display", "take", "streaming markdown renderer for agent output"),

    # ── tasks, kanban, boards ──────────────────────────────────────────────
    ("janhesters/shadcn-kanban-board", "tasks-kanban", "take", "accessibility-first board: keyboard DnD + announcements"),
    ("Georgegriff/react-dnd-kit-tailwind-shadcn-ui", "tasks-kanban", "take", "second board implementation to compare (dnd-kit)"),
    ("BloopAI/vibe-kanban", "tasks-kanban", "take", "agent-run-per-card UX: worktree, diff, review, merge"),
    ("wekan/wekan", "tasks-kanban", "take", "mature board semantics: swimlanes, checklists, activity feed"),
    ("usekaneo/kaneo", "tasks-kanban", "take", "modern small board — good for reading component structure"),
    ("RedPlanetHQ/tegon", "tasks-kanban", "blocked", "closest dev-first tracker UX; AGPL — ideas only"),
    ("makeplane/plane", "tasks-kanban", "blocked", "the closest UX to our board — screenshots and lessons only, AGPL"),
    ("hcengineering/platform", "tasks-kanban", "reference", "Huly: tasks + docs + HR in one shell; EPL, ideas only"),

    # ── the company / org model ────────────────────────────────────────────
    ("paperclipai/paperclip", "org-model", "take", "AI-company domain model: agents as employees, roles, reporting"),
    ("paperclipai/companies", "org-model", "blocked", "ready-made company definitions — NO LICENCE FILE: ideas only"),
    ("tokens-studio/figma-plugin", "design-tokens", "take", "designer-side token export format (MIT)"),
    ("bumbeishvili/org-chart", "org-model", "take", "d3 org chart: collapse, minimap, zoom (MIT)"),
    ("daniel-hauser/react-organizational-chart", "org-model", "take", "simple React hierarchy for the Team tree"),
    ("bkrem/react-d3-tree", "org-model", "take", "alternative tree renderer with pan/zoom"),
    ("microsoft/TinyTroupe", "org-model", "take", "persona-based simulation: how agents keep consistent identity"),
    ("camel-ai/camel", "org-model", "take", "role-playing agent society + memory patterns"),
    ("FoundationAgents/MetaGPT", "org-model", "take", "SOP-as-roles: the company metaphor with流程 contracts"),
    ("crewAIInc/crewAI", "org-model", "take", "role/goal/backstory definitions — the shape of our agent records"),
    ("OpenBMB/ChatDev", "org-model", "take", "software-company simulation with a visible canvas"),
    ("markfulton/ai-employees", "org-model", "take", "8 ready AI-employee definitions as plain text (routines, contracts)"),
    ("langchain-ai/open_deep_research", "org-model", "take", "multi-agent supervisor pattern with a real UI"),
    ("All-Hands-AI/OpenHands", "org-model", "take", "sandboxed agent runtime with a task/step UI"),
    ("microsoft/autogen", "org-model", "take", "conversation patterns: group chat, handoff, termination (MIT code; CC-BY docs)"),
    ("google/adk-python", "org-model", "take", "agent definition + tool wiring conventions"),
    ("OpenAI/openai-agents-js", "org-model", "take", "handoffs, guardrails, tracing — the smallest correct shape"),
    ("geekan/MetaGPT", "org-model", "take", "alias of FoundationAgents/MetaGPT — kept for link stability"),

    ("Agent-Analytics/awesome-multi-agent-orchestrators", "org-model", "reference",
     "the current index of agent-orchestrator projects — use it to re-scan quarterly"),

    # ── conversations ──────────────────────────────────────────────────────
    ("danny-avila/LibreChat", "conversations", "take", "model selector, subagents, token spend, trace viewer (MIT)"),
    ("assistant-ui/assistant-ui", "conversations", "take", "chat primitives: streaming, tools, attachments, approvals"),
    ("vercel/ai-chatbot", "conversations", "take", "reference chat app on the same stack we chose"),
    ("langchain-ai/agent-chat-ui", "conversations", "take", "minimal LangGraph chat client — close to our data flow"),
    ("huggingface/chat-ui", "conversations", "take", "multi-model chat with per-message model switching"),
    ("mckaywrigley/chatbot-ui", "conversations", "take", "clean chat shell patterns"),
    ("lobehub/lobe-chat", "conversations", "reference", "polished multi-provider UX; verify licence before any code"),

    # ── models, gateway, cost ──────────────────────────────────────────────
    ("BerriAI/litellm", "models-gateway", "take", "the gateway engine: providers, fallbacks, spend tracking"),
    ("maximhq/bifrost", "models-gateway", "take", "Go gateway, µs overhead, MCP governance — the speed option"),
    ("Portkey-AI/gateway", "models-gateway", "take", "guardrails/caching gateway core (verify licence file)"),
    ("Helicone/helicone", "models-gateway", "take", "per-request logging + cost dashboards (Apache-2.0)"),
    ("openmeterio/openmeter", "models-gateway", "take", "metering primitive if cost reporting outgrows our tables"),
    ("lm-sys/RouteLLM", "models-gateway", "take", "cost-aware router: cheap lane vs strong lane decisions"),
    ("aurelio-labs/semantic-router", "models-gateway", "take", "semantic routing of requests to models/agents"),
    ("ollama/ollama", "models-gateway", "take", "the cheap open lane, locally"),
    ("vllm-project/vllm", "models-gateway", "take", "serving the open lane with throughput (if we host it)"),
    ("sgl-project/sglang", "models-gateway", "take", "alternative open-lane server"),
    ("ggml-org/llama.cpp", "models-gateway", "take", "smallest possible local lane for tests"),
    ("open-webui/open-webui", "models-gateway", "blocked", "branding-restricted licence: reference only"),

    # ── orchestration + durability ─────────────────────────────────────────
    ("langchain-ai/langgraph", "orchestration", "take", "the orchestrator (Python side) — graph, checkpoint, HITL"),
    ("langchain-ai/langgraphjs", "orchestration", "take", "the orchestrator on our stack (TypeScript)"),
    ("mastra-ai/mastra", "orchestration", "take", "TS agent framework with workflows + evals (cross-check)"),
    ("microsoft/agent-framework", "orchestration", "take", "enterprise engine: A2A, MCP, multi-agent patterns"),
    ("temporalio/sdk-typescript", "orchestration", "take", "durable execution if tasks outlive requests by days"),
    ("dbos-inc/dbos-transact-ts", "orchestration", "take", "Postgres-native durable workflows — no new infra"),
    ("triggerdotdev/trigger.dev", "orchestration", "take", "self-hostable background jobs with a real UI"),
    ("timgit/pg-boss", "orchestration", "take", "simplest Postgres queue — P0 default"),
    ("graphile/worker", "orchestration", "take", "second Postgres queue; compare on cron + backoff"),
    ("taskforcesh/bullmq", "orchestration", "take", "redis queue (only if redis arrives for other reasons)"),
    ("hatchet-dev/hatchet", "orchestration", "take", "durable task engine (verify licence)"),
    ("kestra-io/kestra", "orchestration", "take", "declarative workflow engine, Apache-2.0 (heavy)"),
    ("activepieces/activepieces", "orchestration", "take", "no-code automation UI patterns (MIT core, verify)"),
    ("n8n-io/n8n", "orchestration", "blocked", "fair-code: forbidden for our use"),
    ("inngest/inngest", "orchestration", "blocked", "server not open source: forbidden"),

    # ── memory + context ───────────────────────────────────────────────────
    ("pgvector/pgvector", "memory", "take", "embeddings inside our own Postgres — no extra service"),
    ("getzep/graphiti", "memory", "take", "temporal knowledge graph for 'what changed when'"),
    ("mem0ai/mem0", "memory", "take", "memory write/read pipeline patterns"),
    ("letta-ai/letta", "memory", "take", "stateful agent memory (heavy; read the model)"),
    ("chroma-core/chroma", "memory", "take", "vector store option if Postgres is not enough"),
    ("qdrant/qdrant", "memory", "take", "vector store, Rust, self-hosted"),
    ("weaviate/weaviate", "memory", "reference", "vector store, BSD-3"),
    ("lancedb/lancedb", "memory", "take", "embedded vector store for the local-first story"),

    # ── execution + sandbox ────────────────────────────────────────────────
    ("e2b-dev/E2B", "execution", "take", "microVM sandboxes for agent code (self-host path documented)"),
    ("microsandbox/microsandbox", "execution", "take", "self-hosted libkrun sandboxes — no cloud dependency"),
    ("firecracker-microvm/firecracker", "execution", "take", "the primitive if we run our own fleet"),
    ("google/gvisor", "execution", "take", "container isolation primitive (alternative)"),
    ("daytonaio/daytona", "execution", "blocked", "licence changed: do not depend"),

    # ── the network view (our differentiator) ──────────────────────────────
    ("xyflow/xyflow", "network-view", "take", "canvas engine: viewport, panning, minimap, custom nodes"),
    ("d3/d3-force", "network-view", "take", "the physics Obsidian-class graphs use"),
    ("vasturiano/react-force-graph", "network-view", "take", "WebGL force graph for very large companies"),
    ("vasturiano/force-graph", "network-view", "take", "canvas force graph (2D/3D building block)"),
    ("cytoscape/cytoscape.js", "network-view", "take", "graph algorithms: clustering, shortest path, ego nets"),
    ("dagrejs/dagre", "network-view", "take", "hierarchy layout for the tree-shaped scopes"),
    ("obsidianmd/jsoncanvas", "network-view", "take", "open canvas format — Obsidian interop, free export"),
    ("rakshit087/obsidian-graph-react", "network-view", "blocked", "Obsidian-style canvas graph: controls, local depth, drag"),
    ("graphology/graphology", "network-view", "take", "graph data structure + metrics (centrality, communities)"),
    ("jacomyal/sigma.js", "network-view", "take", "WebGL renderer over graphology for the big case"),
    ("excalidraw/excalidraw", "network-view", "take", "freeform layer (optional), MIT"),
    ("tldraw/tldraw", "network-view", "blocked", "paid licence: forbidden"),
    ("jagenjo/litegraph.js", "network-view", "take", "node-graph editor UX (wiring, sockets) for later"),
    ("antvis/G6", "network-view", "take", "graph engine with rich interactions (compare with xyflow)"),
    ("antvis/X6", "network-view", "take", "diagram engine (compare for the canvas)"),

    # ── approvals, decisions, permissions ──────────────────────────────────
    ("sekera-radim/impri", "approvals", "take", "approval inbox for agents: proposal→decision→receipt, MIT"),
    ("agentkitai/agentgate", "approvals", "take", "policy engine + approval dashboard on Hono/PG (our stack)"),
    ("novuhq/novu", "approvals", "take", "notification fan-out (inbox + email + chat) for decisions"),
    ("Infisical/infisical", "approvals", "take", "approval-gated secrets: the flow our permissions mirror"),
    ("permify/permify", "approvals", "blocked", "rebac service if row-level rules outgrow Postgres"),
    ("openfga/openfga", "approvals", "take", "Google Zanzibar model for 'who may approve what'"),
    ("casbin/casbin", "approvals", "take", "lightweight policy engine (library, no service)"),
    ("open-policy-agent/opa", "approvals", "take", "policy-as-code for decision rules + audit evidence"),

    # ── i18n, RTL, accessibility, type ─────────────────────────────────────
    ("i18next/i18next", "i18n-rtl", "take", "translation runtime for EN/AR with plurals"),
    ("amannn/next-intl", "i18n-rtl", "take", "typed ICU messages (we use Vite: take the message model)"),
    ("formatjs/formatjs", "i18n-rtl", "reference", "ICU message + number/date formatting"),
    ("dequelabs/axe-core", "i18n-rtl", "take", "automated a11y audit in CI (MPL-2.0: unmodified npm dependency only)"),
    ("jsx-eslint/eslint-plugin-jsx-a11y", "i18n-rtl", "take", "a11y lint while we write"),
    ("google/fonts", "i18n-rtl", "take", "Arabic + Latin families under OFL (Plex Sans Arabic, Noto, Cairo)"),
    ("ibm/plex", "i18n-rtl", "take", "IBM Plex Sans Arabic — matches the demo's typography"),

    # ── notes, docs, canvas editing ────────────────────────────────────────
    ("ueberdosis/tiptap", "notes-editor", "take", "rich text for decision memos (MIT)"),
    ("udecode/plate", "notes-editor", "take", "second editor (headless, powerful, MIT)"),
    ("steven-tey/novel", "notes-editor", "take", "notion-style editor on tiptap (Apache-2.0)"),
    ("TypeCellOS/BlockNote", "notes-editor", "reference", "MPL-2.0: separate unmodified files only"),
    ("Milkdown/milkdown", "notes-editor", "take", "plugin-based markdown editor (MIT)"),
    ("ProseMirror/prosemirror", "notes-editor", "take", "the model under both editors"),
    ("remarkjs/react-markdown", "notes-editor", "take", "safe markdown rendering for messages/logs"),
    ("shikijs/shiki", "notes-editor", "take", "code highlighting in conversations (MIT)"),
    ("yjs/yjs", "notes-editor", "take", "CRDT if multi-cursor editing ever ships"),
    ("automerge/automerge", "notes-editor", "take", "alternative CRDT with a nicer history model"),

    # ── forms + validation ─────────────────────────────────────────────────
    ("react-hook-form/react-hook-form", "forms", "take", "every form in Settings and the task composer"),
    ("colinhacks/zod", "forms", "take", "one schema for API, form and DB boundary checks"),
    ("edmundhung/conform", "forms", "take", "progressive-enhancement form patterns"),
    ("TanStack/form", "forms", "take", "alternative form engine (compare on RTL + a11y)"),

    # ── auth, tenancy ──────────────────────────────────────────────────────
    ("better-auth/better-auth", "auth", "take", "sessions, orgs, RBAC — chosen in doc 22"),
    ("ory/kratos", "auth", "take", "identity service if auth becomes self-hosted infra"),
    ("keycloak/keycloak", "auth", "take", "enterprise SSO if a customer demands it (heavy)"),
    ("zitadel/zitadel", "auth", "blocked", "modern alternative to Keycloak"),
    ("SuperTokens/supertokens-core", "auth", "take", "third auth option (verify licence)"),

    # ── notifications, email ───────────────────────────────────────────────
    ("resend/react-email", "notifications", "take", "decision emails that look like the product"),
    ("axllent/mailpit", "notifications", "take", "capture outbound mail in dev/test"),

    # ── search, files, storage ─────────────────────────────────────────────
    ("meilisearch/meilisearch", "search-storage", "take", "message + task search (MIT)"),
    ("oramasearch/orama", "search-storage", "take", "in-process search for small datasets (Apache-2.0)"),
    ("seaweedfs/seaweedfs", "search-storage", "take", "S3-compatible storage without MinIO's licence (Apache-2.0)"),
    ("minio/minio", "search-storage", "blocked", "AGPL: forbidden for our hosted use"),
    ("typesense/typesense", "search-storage", "blocked", "GPL-3.0: forbidden"),

    # ── analytics + ops (self-observation) ─────────────────────────────────
    ("PostHog/posthog", "analytics", "take", "product analytics (MIT core; EE folders excluded)"),
    ("umami-software/umami", "analytics", "take", "privacy-light analytics alternative (MIT)"),
    ("plausible/analytics", "analytics", "blocked", "AGPL: forbidden"),

    # ── testing + quality ──────────────────────────────────────────────────
    ("microsoft/playwright", "testing", "take", "the browser probe + e2e for every view"),
    ("vitest-dev/vitest", "testing", "take", "unit tests next to the code"),
    ("mapbox/pixelmatch", "testing", "take", "visual diffing for the gallery"),
    ("testcontainers/testcontainers-node", "testing", "take", "real Postgres in tests"),
    ("mswjs/msw", "testing", "take", "network mocking for provider calls"),
    ("storybookjs/storybook", "testing", "take", "component workshop (optional)"),
    ("faker-js/faker", "testing", "take", "realistic company fixtures (people, tasks, spend)"),

    # ── protocols ──────────────────────────────────────────────────────────
    ("modelcontextprotocol/modelcontextprotocol", "protocols", "take", "MCP: the tool-connection standard we implement"),
    ("a2aproject/A2A", "protocols", "take", "A2A: external agent-to-agent, P5"),
    ("ag-ui-protocol/ag-ui", "protocols", "take", "AG-UI: agent↔frontend event stream (CopilotKit family)"),

    # ── tokens + styling pipeline ──────────────────────────────────────────
    ("amzn/style-dictionary", "design-tokens", "take", "token pipeline: our JSON → CSS/Tailwind/TS types"),
    
    ("tailwindlabs/tailwindcss", "design-tokens", "take", "v4 theme layer fed from the tokens"),
    ("postcss/postcss", "design-tokens", "take", "build-time CSS discipline (raw value ban)"),

    # ── docs site co-pilots ────────────────────────────────────────────────
    ("fuma-nama/fumadocs", "docs-site", "take", "self-hosted docs/help centre (MIT)"),
    ("shuding/nextra", "docs-site", "take", "alternative docs framework"),
    ("withastro/starlight", "docs-site", "take", "alternative docs framework"),

    # ── client shells for later phases ─────────────────────────────────────
    ("expo/expo", "clients", "take", "the mobile client when P5+ arrives"),
    ("tauri-apps/tauri", "clients", "take", "desktop shell if an installable app is wanted"),
    ("facebook/react-native", "clients", "take", "shared component layer for mobile"),
]


# ─────────────────────────────────────────────────────────────────────────────
# API plumbing
# ─────────────────────────────────────────────────────────────────────────────
def api(path: str, raw: bool = False, retries: int = 3):
    url = path if path.startswith("http") else API + path
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json",
        "User-Agent": "company-ai-harvest-scan",
        **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}),
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req) as r:
                body = r.read().decode("utf-8", "replace")
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and attempt < retries - 1:
                reset = e.headers.get("x-ratelimit-reset")
                wait = 20 if e.code == 429 else 30
                print(f"    rate-limited ({e.code}); sleeping {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if e.code == 404:
                return None
            raise
    return None


# Recognised permissive / copyleft identifiers. Anything else → inspect the LICENSE text.
PERMISSIVE = {"MIT", "Apache-2.0", "ISC", "BSD-2-Clause", "BSD-3-Clause", "0BSD",
              "CC0-1.0", "Unlicense", "PostgreSQL", "MIT-0", "Zlib", "OFL-1.1"}
COPYLEFT = {"AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later", "GPL-2.0", "GPL-3.0",
            "GPL-3.0-only", "GPL-3.0-or-later", "LGPL-3.0", "SSPL-1.0"}
WEAK = {"MPL-2.0", "EPL-2.0", "EUPL-1.2"}
SOURCE_AVAILABLE = {"Elastic-2.0", "Elastic-2.0-only", "BSL-1.1", "BUSL-1.1", "SSPL-1.0"}
RESTRICTED = {"NOASSERTION", "Other", None, ""}


def licence_verdict(spdx: str | None, sniffed: str | None) -> tuple[str, str]:
    """Return (verdict, note). Verdict ∈ permissive | weak-copyleft | copyleft | source-available | unknown."""
    s = (spdx or "").strip()
    if s in PERMISSIVE:
        return "permissive", s
    if s in WEAK:
        return "weak-copyleft", s
    if s in COPYLEFT:
        return "copyleft", s
    if s in SOURCE_AVAILABLE:
        return "source-available", s
    t = (sniffed or "").lower()
    if "mit license" in t or "permission is hereby granted, free of charge" in t:
        return "permissive", "MIT (from LICENSE text)"
    if "apache license" in t and "2.0" in t:
        return "permissive", "Apache-2.0 (from LICENSE text)"
    if "mozilla public license" in t:
        return "weak-copyleft", "MPL-2.0 (from LICENSE text)"
    if "gnu affero" in t:
        return "copyleft", "AGPL (from LICENSE text)"
    if "gnu general public" in t:
        return "copyleft", "GPL (from LICENSE text)"
    if "elastic license" in t:
        return "source-available", "Elastic-2.0 (from LICENSE text)"
    if not t:
        return "unknown", "no licence file found — all rights reserved by default"
    first = " ".join(t.split())[:90]
    return "unknown", f"unrecognised licence text: {first}…"


def stage_meta(only: list[str] | None = None):
    os.makedirs(ROOT, exist_ok=True)
    out, missing = {}, []
    existing = {}
    if only and os.path.exists(f"{ROOT}/metadata.json"):
        existing = json.load(open(f"{ROOT}/metadata.json"))["repos"]
    for i, (repo, cat, status, role) in enumerate(REPOS, 1):
        if only and not any(k == repo or k in repo for k in only):
            continue
        print(f"[{i:3}/{len(REPOS)}] {repo}")
        meta = api(f"/repos/{repo}")
        if meta is None:
            missing.append((repo, cat, status, role))
            continue
        spdx = (meta.get("license") or {}).get("spdx_id")
        sniffed = None
        if (spdx or "").strip() in {"", "NOASSERTION"}:
            for fname in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING", "COPYING.md",
                          "LICENSE-MIT", "LICENSE-APACHE", "LICENSE.rst", "licenses/LICENSE"):
                txt = api(f"/repos/{repo}/contents/{fname}", raw=True)
                if txt:
                    sniffed = txt
                    break
        verdict, note = licence_verdict(spdx, sniffed)
        out[repo] = {
            "category": cat, "status_planned": status, "role": role,
            "full_name": meta.get("full_name"), "description": meta.get("description"),
            "stars": meta.get("stargazers_count"), "forks": meta.get("forks_count"),
            "language": meta.get("language"), "pushed_at": meta.get("pushed_at"),
            "created_at": meta.get("created_at"), "archived": meta.get("archived"),
            "default_branch": meta.get("default_branch"), "size_kb": meta.get("size"),
            "topics": meta.get("topics", []), "homepage": meta.get("homepage"),
            "spdx": spdx, "licence_verdict": verdict, "licence_note": note,
            "html_url": meta.get("html_url"),
        }
        time.sleep(0.15)
    if only:
        out = {**existing, **out}
        missing = []
    with open(f"{ROOT}/metadata.json", "w") as f:
        json.dump({"scanned_at": datetime.now(timezone.utc).isoformat(),
                   "count": len(out), "repos": out, "not_found": missing}, f, indent=1)
    print(f"\n{len(out)} repos scanned, {len(missing)} not found → {ROOT}/metadata.json")
    for m in missing:
        print("  NOT FOUND:", m[0])
    write_report()


def write_report():
    data = json.load(open(f"{ROOT}/metadata.json"))
    repos = data["repos"]
    by_cat: dict[str, list] = {}
    for repo, r in repos.items():
        by_cat.setdefault(r["category"], []).append((repo, r))
    badge = {"permissive": "✅", "weak-copyleft": "⚠️", "copyleft": "⛔",
             "source-available": "⛔", "unknown": "❓"}
    lines = [f"# Harvest scan — {len(repos)} repositories, verified "
             f"{data['scanned_at'][:10]}", "",
             "Generated by `_research/tools/harvest-scan.py meta`. Licence = GitHub SPDX id, or the "
             "LICENSE text sniffed when GitHub reports none.", ""]
    order = list(dict.fromkeys([cat for _, cat, _, _ in REPOS]))
    for cat in order:
        items = by_cat.get(cat, [])
        if not items:
            continue
        lines += [f"## {cat}", "", "| repo | ★ | pushed | licence | verdict | what it is for |",
                  "|---|---|---|---|---|---|"]
        for repo, r in sorted(items, key=lambda x: -(x[1]["stars"] or 0)):
            lic = r["spdx"] or r["licence_note"]
            lines.append(f"| [{repo}]({r['html_url']}) | {r['stars']} | {str(r['pushed_at'])[:10]} | "
                         f"{lic} | {badge[r['licence_verdict']]} {r['licence_verdict']} | {r['role']} |")
        lines.append("")
    open(f"{ROOT}/metadata.md", "w").write("\n".join(lines))
    # licence anomalies
    anom = [(repo, r) for repo, r in repos.items()
            if r["licence_verdict"] in {"copyleft", "source-available", "unknown", "weak-copyleft"}]
    with open(f"{ROOT}/licence-anomalies.md", "w") as f:
        f.write("# Licence anomalies — the list that must stay empty of surprises\n\n")
        for repo, r in sorted(anom):
            f.write(f"- **{repo}** — {r['licence_verdict']} ({r['licence_note']}) · "
                    f"planned status: {r['status_planned']}\n")
    print(f"report → {ROOT}/metadata.md · {len(anom)} licence anomalies → {ROOT}/licence-anomalies.md")


# ─────────────────────────────────────────────────────────────────────────────
# File-tree stage: find the component-ish files worth reading in a shortlist
# ─────────────────────────────────────────────────────────────────────────────
PATTERNS = re.compile(
    r"(org|team|board|kanban|task|inbox|approval|decision|graph|canvas|force|layout|"
    r"chat|message|thread|model|provider|gateway|cost|usage|spend|budget|registry|"
    r"trace|run|agent|role|company|employee|empty|error|skeleton|a11y|rtl|i18n|token)",
    re.I)
SKIP_DIRS = re.compile(r"(^|/)(node_modules|\.git|dist|build|vendor|test|tests|__tests__|"
                       r"docs?|examples?|fixtures|mocks|e2e|\.github|locales|i18n/|assets|"
                       r"public|static|scripts?|migrations?)(/|$)", re.I)
WANT_EXT = re.compile(r"\.(tsx?|jsx?|vue|svelte|py|go|rs|md|json|css|scss|sql|yaml|yml)$", re.I)


def stage_trees(only: list[str] | None):
    os.makedirs(f"{ROOT}/trees", exist_ok=True)
    data = json.load(open(f"{ROOT}/metadata.json"))["repos"]
    picked = [r for r in data if not only or any(k in r for k in only)]
    for repo in picked:
        r = data[repo]
        tree = api(f"/repos/{repo}/git/trees/{r['default_branch']}?recursive=1")
        if not tree or "tree" not in tree:
            print(f"  {repo}: no tree ({'truncated' if tree and tree.get('truncated') else 'error'})")
            continue
        files = []
        for t in tree["tree"]:
            if t["type"] != "blob":
                continue
            p = t["path"]
            if SKIP_DIRS.search(p) and "/" in p:
                continue
            if not WANT_EXT.search(p):
                continue
            if len(p) > 160:
                continue
            hit = PATTERNS.search(p)
            files.append({"path": p, "size": t.get("size", 0), "match": bool(hit)})
        strong = [f for f in files if f["match"]]
        json.dump({"repo": repo, "branch": r["default_branch"], "truncated": tree.get("truncated"),
                   "total_blobs": len(tree["tree"]), "candidates": strong,
                   "all_filtered": len(files)},
                  open(f"{ROOT}/trees/{repo.replace('/', '__')}.json", "w"), indent=1)
        print(f"  {repo}: {len(tree['tree'])} blobs → {len(strong)} component-ish candidates")
        time.sleep(0.15)


def stage_fetch(manifest_path: str):
    """Download every file in the manifest for reading. Never into the git repo."""
    import urllib.request
    manifest = json.load(open(manifest_path))["files"]
    data = json.load(open(f"{ROOT}/metadata.json"))["repos"]
    total = ok = 0
    for repo, paths in manifest.items():
        branch = data.get(repo, {}).get("default_branch", "main")
        dest = os.path.join(ROOT, "fetched", repo.replace("/", "__"))
        os.makedirs(dest, exist_ok=True)
        for path in paths:
            total += 1
            url = f"https://raw.githubusercontent.com/{repo}/{branch}/{path}"
            try:
                req = urllib.request.Request(url, headers={
                    "User-Agent": "company-ai-harvest-scan",
                    **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})})
                with urllib.request.urlopen(req) as r:
                    body = r.read().decode("utf-8", "replace")
            except Exception as e:
                print(f"  MISS {repo}/{path} — {e}")
                continue
            with open(os.path.join(dest, path.replace("/", "__")), "w") as f:
                f.write(body)
            ok += 1
            print(f"  ok   {repo}/{path}  ({len(body):,} chars)")
            time.sleep(0.1)
    print(f"\n{ok}/{total} files → {ROOT}/fetched")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in {"meta", "trees", "report", "fetch"}:
        print(__doc__)
        sys.exit(1)
    stage = sys.argv[1]
    if stage == "meta":
        only = None
        if "--only" in sys.argv:
            only = sys.argv[sys.argv.index("--only") + 1].split(",")
        stage_meta(only)
    elif stage == "trees":
        only = None
        if "--only" in sys.argv:
            only = sys.argv[sys.argv.index("--only") + 1].split(",")
        stage_trees(only)
    elif stage == "fetch":
        default = os.path.join(os.path.dirname(os.path.abspath(__file__)), "harvest-files.json")
        stage_fetch(sys.argv[2] if len(sys.argv) > 2 else default)
    elif stage == "report":
        write_report()


if __name__ == "__main__":
    main()
