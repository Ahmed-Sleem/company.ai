# 14 — How Obsidian does it (and how we copy it for the GUI)

The user's request: the org hierarchy, the tasks and the chats should all be visualised **like Obsidian's
graph / canvas** — one connected visual space. This document records exactly how Obsidian implements it,
and what we should reuse.

## 14.1 Obsidian's two separate systems (don't confuse them)

Obsidian ships **two different visual systems**:

| | **Graph View** | **Canvas** |
| --- | --- | --- |
| Purpose | Auto-layout network of linked notes | Manual whiteboard of cards and connections |
| Layout | **Force-directed** (physics, nodes move) | **Manual** (you place cards anywhere) |
| Data source | Derived automatically from links | A file you create (`.canvas`) |
| Engine | **d3-force** + **PixiJS (WebGL)** | Obsidian's own canvas app |
| File format | none (derived) | **JSON Canvas** (open spec, MIT) |
| Analog in our app | the "whole company as one network" view | the editable org/task whiteboard |

**Both are relevant to us — for different screens.**

## 14.2 Graph View — exact implementation

Obsidian staff confirmed the stack on their forum: *"We use d3-force for force simulation, and PixiJS for
actually rendering the graph."*

**Physics (d3-force):**

- Forces applied to every node:
  - **Link force** — spring between connected nodes; Hooke's law: `F = (distance − linkDistance) × linkForce`
  - **Repel force** — many-body Coulomb repulsion: `F = −repelForce / distance²`
  - **Center force** — pulls everything toward a movable centre: `F = min(distanceToCenter − centerForce, 0)`
  - **Drag force** — while dragging: applied from the node toward the pointer
- Integration: **semi-implicit Euler**, with **simulated annealing (alpha decay)** — the graph starts
  hot and settles; nodes have initial positions clustered near the origin with a "big bang" feel.
- The four values are exposed to the user as sliders: **Center force, Repel force, Link force, Link
  distance** — this is why users can make a graph tight, spread out, or springy.

**Rendering (PixiJS):**

- WebGL renderer, nodes are coloured shapes/sprites with text labels.
- **Why WebGL:** SVG dies around a few hundred animated nodes; WebGL keeps thousands smooth.

**What advanced community plugins add (the state of the art, Sept 2026):**

- **Force layout moved into a Web Worker** (UI thread never computes physics).
- **graphology** for metrics: PageRank, Louvain clusters → drive node **size / colour / glow**.
- Pixi v8, **edges drawn as a single GPU line-list mesh** with a vertex buffer (not per-edge objects).
- Result: **10,000+ nodes at 50+ FPS**, interactive.
- Another plugin (Deterministic Graph View) replaced physics with **Cytoscape.js breadth-first layout**
  because *"the positions of nodes shift every time you reopen it"* — a real UX complaint worth avoiding.

## 14.3 Canvas — the JSON Canvas format

Obsidian's `.canvas` file format was published as **JSON Canvas** — open spec, **MIT licence**, spec at
`jsoncanvas.org`, code at `obsidianmd/jsoncanvas` (3,708★). It is explicitly meant to be implemented
freely as an **import, export and storage format for any app**.

Spec 1.0 in one page:

```jsonc
{
  "nodes": [                       // optional array
    // type: "text" | "file" | "link" | "group"
    // every node: id, type, x, y, width, height, color?
    { "id": "a1", "type": "text",  "x": 0,   "y": 0, "width": 250, "height": 60, "text": "CEO" },
    { "id": "a2", "type": "text",  "x": 0, "y": 200, "width": 250, "height": 60, "text": "CTO" },
    { "id": "g1", "type": "group", "x": -40, "y": -40, "width": 400, "height": 400, "label": "Engineering" }
  ],
  "edges": [                       // optional array
    { "id": "e1", "fromNode": "a1", "toNode": "a2", "label": "reports to", "color": "1" }
  ]
}
```

**Why this matters for us:** we can adopt **JSON Canvas as our board/export format**, which gives us
free interoperability — a user could open our org/task board in Obsidian, and we can import any JSON
Canvas board. Also useful as a stable, documented storage format instead of inventing one.

## 14.4 How we map Obsidian's ideas onto our three surfaces

| Our surface | Layout approach | Rendering | Notes |
| --- | --- | --- | --- |
| **Org hierarchy** (people) | **Hierarchical / tree layout** (dagre or ELK), not pure force — stable and readable; optional force for clusters | React Flow (MIT) | Force layouts re-shuffle and destroy trust in a hierarchy; trees don't |
| **Tasks** | Board (kanban) **plus** an optional graph of dependencies (`blocks`, `relates`, `part-of`) | React Flow | Card layout is familiar; the graph is additive |
| **Chats / activity** | **Force-directed** (this is where Obsidian's look belongs): conversations, mentions and hand-offs form the emergent network | **d3-force (worker) + PixiJS** | This is the "wow" screen: the company as a living network |
| **One network view ("the company as a graph")** | Force with **typed edges**: reports-to (solid), delegates-to (dashed), reviews (dotted), chats (thin) | d3-force + PixiJS, or react-force-graph | Node size = workload/cost; colour = department; glow = live activity |
| **Board persistence / sharing** | Manual positions | — | Store as **JSON Canvas** for interop |

**Design rule learned from Obsidian's complaints:** positions must be **persistent and deterministic**.
Persist the layout, offer a "freeze layout" switch, and only re-run physics on demand or when the user
adds a node. Nobody wants their org chart to rearrange itself overnight.

## 14.5 Library shortlist (verified 2026-10-02 on GitHub API)

| Library | Stars | Licence | Renderer | Best for | Verdict |
| --- | --- | --- | --- | --- | --- |
| **xyflow / React Flow** | 38,564 | **MIT** | DOM/SVG (viewport-culled) | Editable node diagrams, org charts, boards | ✅ **Primary canvas** |
| **d3-force** | 2,002 | **ISC** | — (physics only) | The exact physics Obsidian uses | ✅ Physics engine |
| **PixiJS** (pixijs/pixijs) | — | **MIT** | WebGL | High-node-count rendering | ✅ Renderer at scale |
| **vasturiano/react-force-graph** | 3,317 | **MIT** | WebGL (2D/3D/VR) | Fastest path to an Obsidian-like graph in React | ✅ Alternative / prototype |
| **Cytoscape.js** | 11,229 | **MIT** | Canvas | Graph algorithms, deterministic layouts | 🟡 Optional (analysis, stable layouts) |
| **Sigma.js** | 12,175 | **MIT** | WebGL | Tens of thousands of nodes | 🟡 Only if we ever need huge graphs |
| **dagre** | 5,810 | **MIT** | — (layout) | Hierarchy/tree layout for the org chart | ✅ Org layout |
| **elkjs** | 2,793 | ⚠️ EPL (NOASSERTION) | — (layout) | Advanced layered layouts | ⚠️ Check licence before use |
| **react-force-graph** | 3,317 | MIT | WebGL | see above | ✅ |
| **reaflow** | 2,491 | Apache-2.0 | SVG | Workflow editors | ⚠️ Last push 2025-06 — stale |
| **obsidianmd/jsoncanvas** | 3,708 | **MIT** | — (format) | Board storage/export | ✅ Adopt the format |
| **shadcn/ui** | 124,973 | **MIT** | UI components | App shell, lists, forms, dialogs | ✅ UI kit |
| **Better Auth** | 30,147 | **MIT** | — | Auth, sessions, RBAC base | ✅ Auth |

**Recommended split:**
`React Flow` for everything the user *edits* (org, tasks, boards) + `d3-force in a Web Worker + PixiJS`
for the *emergent network* view (chats, activity, the whole company) + `JSON Canvas` as the
storage/export format.

## 14.6 Performance guidance (from the Obsidian ecosystem)

1. Physics always in a **Web Worker**; never on the UI thread.
2. Switch renderer by scale: React Flow ≤ ~1,000 nodes; PixiJS/WebGL beyond that.
3. Batch edges into a single GPU mesh instead of one object per edge.
4. Throttle label rendering — labels only for hovered/selected/clustered nodes at high counts.
5. Freeze/persist layouts; recompute only on explicit user action.
6. Provide **stable alternatives**: a tree layout for hierarchy, a board for tasks — not everything
   should be a hairball.
