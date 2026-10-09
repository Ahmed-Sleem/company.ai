/**
 * The company graph — a port of the prototype's graph.js (design/prototype/graph.js),
 * reduced to what the app needs: the same deterministic build, the same force maths,
 * the same constants, typed and DOM-free so it runs in the view and in tests.
 *
 * Obsidian-style: people, their tasks and their conversations pull against each other until
 * the picture settles. Same behaviour as the prototype — repulsion with a collision gap,
 * springs per relationship kind, gentle centring on the operator, velocity capped, cooling
 * until it stops moving.
 */
import type { AgentRow, TaskRow, ThreadRow } from '../data/store';

export type NodeKind = 'person' | 'task' | 'thread';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  refId: string;
  label: string;
  sub: string;
  status?: string;
  radius: number;
  depth: number;
  dept: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  fixed?: boolean;
}

export interface GraphEdge {
  s: string;
  t: string;
  kind: 'reports' | 'owns' | 'member';
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Record<string, GraphNode>;
}

/** The prototype's geometry, one definition each (its graph.css --g-* values). */
export const G = {
  youR: 30,
  personR: 27,
  taskR: 14,
  threadR: 18,
  labelGap: 13,
  labelReserve: { person: 16, task: 13, thread: 15 } as Record<NodeKind, number>,
  repel: 5200,
  link: 74,
  linkTask: 52,
  linkMemberExtra: 26,
  gap: 10,
  maxV: 14,
  damp: 0.86,
  alpha: 0.6,
  decay: 0.976,
  seed: { person: 170, thread: 300, task: 370 } as Record<NodeKind, number>,
  ringFlat: 0.66,
  zoomMin: 0.25,
  zoomMax: 2.2,
  fitPad: 28,
  maxDepth: 8,
} as const;

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
};

export const footprint = (n: GraphNode) => n.radius + G.labelReserve[n.kind];

/**
 * Build the graph from the save. Deterministic: the same company always starts from the
 * same positions (even arcs per kind), so the settled picture is stable across reloads.
 */
export function buildGraph(
  operatorName: string,
  agents: AgentRow[],
  tasks: TaskRow[],
  threads: ThreadRow[],
  localize: (en: string, ar: string | null) => string,
): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const byId: Record<string, GraphNode> = {};
  const add = (n: GraphNode) => {
    byId[n.id] = n;
    nodes.push(n);
    return n;
  };

  add({
    id: 'a:you', kind: 'person', refId: 'you', label: operatorName, sub: 'Owner',
    status: 'you', radius: G.youR, depth: 0, dept: '', x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0,
  });

  const index: Record<string, AgentRow> = {};
  for (const a of agents) index[a.id] = a;
  const depthOf = (a: AgentRow): number => {
    if (!a || !a.managerId) return 1;
    const seen: Record<string, boolean> = {};
    let cur: AgentRow | undefined = a;
    let depth = 1;
    let guard = 0;
    while (cur !== undefined && guard++ < G.maxDepth + 2) {
      if (seen[cur.id]) return Math.min(depth, G.maxDepth); // cycle: stop where we are
      seen[cur.id] = true;
      const mid: string | null = cur.managerId;
      if (!mid) return depth;
      const m: AgentRow | undefined = index[mid];
      if (!m) return depth + 1; // manager outside the roster
      cur = m;
      depth++;
    }
    return Math.min(depth, G.maxDepth);
  };

  for (const a of agents) {
    add({
      id: `a:${a.id}`, kind: 'person', refId: a.id,
      label: localize(a.name, a.nameAr), sub: localize(a.role, a.roleAr),
      status: a.status, radius: G.personR, depth: depthOf(a), dept: a.department ?? '',
      x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0,
    });
    // Top of the roster reports to the operator — the prototype's manager === 'you'.
    edges.push({ s: a.managerId ? `a:${a.managerId}` : 'a:you', t: `a:${a.id}`, kind: 'reports' });
  }

  for (const task of tasks) {
    const owner = byId[`a:${task.ownerAgentId}`] ?? byId['a:you'];
    add({
      id: `t:${task.id}`, kind: 'task', refId: task.id,
      label: localize(task.title, task.titleAr ?? null), sub: task.shortRef,
      radius: G.taskR, depth: (owner ? owner.depth : 1) + 1, dept: '',
      x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0,
    });
    edges.push({ s: task.ownerAgentId ? `a:${task.ownerAgentId}` : 'a:you', t: `t:${task.id}`, kind: 'owns' });
  }

  for (const th of threads) {
    const host = th.agentId ? byId[`a:${th.agentId}`] : undefined;
    const depth = host ? host.depth + 1 : 2;
    add({
      id: `x:${th.id}`, kind: 'thread', refId: th.id,
      label: th.title, sub: 'Conversation',
      radius: G.threadR, depth: Math.max(2, depth), dept: '',
      x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0,
    });
    if (host) edges.push({ s: `a:${host.refId}`, t: `x:${th.id}`, kind: 'member' });
  }

  // Deterministic start: equal arcs per kind, so frame one is already free of pile-ups.
  const kinds: Record<NodeKind, GraphNode[]> = { person: [], task: [], thread: [] };
  for (const n of nodes) kinds[n.kind].push(n);
  for (const kind of ['person', 'task', 'thread'] as NodeKind[]) {
    const list = kinds[kind];
    const r = G.seed[kind];
    list.forEach((n, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2;
      n.x = Math.cos(a) * r;
      n.y = Math.sin(a) * r * G.ringFlat;
    });
  }
  const you = byId['a:you']!;
  you.x = 0;
  you.y = 0;

  return { nodes, edges, byId };
}

/**
 * One simulation step — the prototype's layoutStep, pure maths. Returns the largest
 * movement this frame; when it approaches zero the layout has settled.
 */
export function layoutStep(g: Graph, alpha: number): number {
  const { nodes, edges, byId } = g;
  for (const n of nodes) {
    n.fx = 0;
    n.fy = 0;
  }

  // Repulsion + collision in one pass (the company graph is small by design).
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const m = nodes[j]!;
      let dx = m.x - n.x;
      let dy = m.y - n.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        dx = ((hash(n.id) % 7) - 3) || 1;
        dy = ((hash(m.id) % 7) - 3) || 1;
        d2 = dx * dx + dy * dy;
      }
      if (d2 > 220000) continue; // about 470px: distant pairs do not interact
      const d = Math.sqrt(d2);
      let f = G.repel / d2;
      const ux = dx / d;
      const uy = dy / d;
      n.fx -= ux * f;
      n.fy -= uy * f;
      m.fx += ux * f;
      m.fy += uy * f;
      const min = footprint(n) + footprint(m) + G.gap;
      if (d < min) {
        f = (min - d) * 0.9;
        n.fx -= ux * f;
        n.fy -= uy * f;
        m.fx += ux * f;
        m.fy += uy * f;
      }
    }
  }

  // Springs: every relationship pulls its two ends toward its own length.
  for (const e of edges) {
    const a = byId[e.s];
    const b = byId[e.t];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const want = e.kind === 'owns' ? G.linkTask : e.kind === 'member' ? G.link + G.linkMemberExtra : G.link;
    let f = (d - want) * 0.02;
    if (e.kind === 'reports') f *= 1.15;
    const ux = dx / d;
    const uy = dy / d;
    a.fx += ux * f;
    a.fy += uy * f;
    b.fx -= ux * f;
    b.fy -= uy * f;
  }

  // Gentle centring so nothing drifts away; the operator is the anchor.
  for (const n of nodes) {
    if (n.id === 'a:you') {
      n.fx -= n.x * 0.6;
      n.fy -= n.y * 0.6;
    } else {
      n.fx -= n.x * 0.012;
      n.fy -= n.y * 0.012;
    }
  }

  let maxMove = 0;
  for (const n of nodes) {
    if (n.fixed) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx = (n.vx + n.fx * alpha) * G.damp;
    n.vy = (n.vy + n.fy * alpha) * G.damp;
    const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (v > G.maxV) {
      n.vx = (n.vx / v) * G.maxV;
      n.vy = (n.vy / v) * G.maxV;
    }
    n.x += n.vx;
    n.y += n.vy;
    if (Math.abs(n.x) > 6000 || Math.abs(n.y) > 6000) {
      n.x = 0;
      n.y = 0;
      n.vx = 0;
      n.vy = 0;
    }
    const mv = Math.abs(n.vx) + Math.abs(n.vy);
    if (mv > maxMove) maxMove = mv;
  }
  return maxMove;
}

/** The view transform that frames the whole graph with an even margin. */
export function fitView(g: Graph, w: number, h: number) {
  if (g.nodes.length === 0) return { x: 0, y: 0, k: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of g.nodes) {
    const r = footprint(n);
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  }
  const gw = Math.max(1, maxX - minX + G.fitPad * 2);
  const gh = Math.max(1, maxY - minY + G.fitPad * 2);
  const k = Math.min(G.zoomMax, Math.max(G.zoomMin, Math.min(w / gw, h / gh)));
  return { x: w / 2 - ((minX + maxX) / 2) * k, y: h / 2 - ((minY + maxY) / 2) * k, k };
}
