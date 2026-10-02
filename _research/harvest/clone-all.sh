#!/usr/bin/env bash
# Harvest helper — clones all reusable open-source projects OUTSIDE the git repo.
# Usage:  bash clone-all.sh [target-dir]     (default: ~/harvest)
#
# Why outside the repo: keeps the git repo small, avoids accidentally committing
# third-party code, and makes licence auditing explicit (see ../15-code-harvest-plan.md).
#
# IMPORTANT: only the Tier-1 repositories below are permissively licensed (MIT / Apache-2.0 / ISC).
# Tier-2 repositories are cloned for READING ONLY — their licences do not allow shipping their code.

set -euo pipefail

TARGET="${1:-$HOME/harvest}"
mkdir -p "$TARGET"
cd "$TARGET"

clone() {  # clone <owner/repo> <depth>
  local repo="$1" depth="${2:-1}"
  if [ -d "$(basename "$repo")" ]; then
    echo "skip   $repo (already present)"
  else
    echo "clone  $repo"
    git clone --depth "$depth" "https://github.com/$repo.git" "$(basename "$repo")" >/dev/null 2>&1 || \
      echo "  !! failed: $repo"
  fi
}

echo "=== Tier 1: permissive (MIT / Apache-2.0 / ISC) — code may be reused ==="

# --- Visual system (org canvas + Obsidian-style network) ---
clone xyflow/xyflow                 # React Flow  (MIT)  — editable canvas
clone d3/d3-force                   # d3-force    (ISC)  — the physics Obsidian uses
clone vasturiano/react-force-graph  # WebGL force graph (MIT)
clone cytoscape/cytoscape.js        # graph algorithms + stable layouts (MIT)
clone dagrejs/dagre                 # hierarchical/tree layout (MIT)
clone obsidianmd/jsoncanvas         # JSON Canvas open format (MIT)

# --- Domain model & orchestration ---
clone paperclipai/paperclip         # company/org model reference (MIT)
clone langchain-ai/langgraph        # durable orchestration (MIT)
clone crewAIInc/crewAI              # role/goal/backstory model (MIT)
clone microsoft/agent-framework     # enterprise engine, A2A/MCP (MIT)
clone cft0808/edict                 # review-gate state machine (MIT)

# --- Studio & canvas patterns ---
clone langflow-ai/langflow          # visual builder UX (MIT)
clone Arturski/crew-ai-studio       # studio feature blueprint (Apache-2.0)
clone OpenBMB/ChatDev               # zero-code canvas + replay (Apache-2.0)
clone BloopAI/vibe-kanban           # kanban + worktrees UX (Apache-2.0)

# --- Runtime, sandbox, protocols, UI kit, auth ---
clone All-Hands-AI/OpenHands        # sandboxed agent runtime (MIT)
clone e2b-dev/E2B                   # code execution sandboxes (Apache-2.0)
clone a2aproject/A2A                # agent-to-agent protocol (Apache-2.0)
clone modelcontextprotocol/modelcontextprotocol  # MCP spec (MIT)
clone shadcn-ui/ui                  # UI components (MIT)
clone better-auth/better-auth       # auth/organizations/RBAC (MIT)

echo
echo "=== Tier 2: READ-ONLY reference (custom / weak-copyleft licences) ==="
echo "    Do NOT copy code from these into a hosted product. Concepts only."
for r in langgenius/dify flowiseai/Flowise open-webui/open-webui lobehq/lobehub; do
  echo "  - $r  (read the licence in the repo before even reading the code)"
done

echo
echo "=== Tier 3: content with NO licence — do not copy ==="
echo "  - paperclipai/companies (no licence file = all rights reserved; ideas only)"

echo
echo "Harvested into: $TARGET"
echo "Next: record commit SHAs + licences in THIRD_PARTY_LICENSES.md (see ../15-code-harvest-plan.md)"
