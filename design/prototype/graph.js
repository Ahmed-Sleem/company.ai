/* =====================================================================================
   Network view + prototype enhancements — Company OS prototype
   -------------------------------------------------------------------------------------
   Loaded by design/prototype/company-os.html (built from the designer's demo by
   build-prototype.py). It adds exactly three things and touches nothing else:

     1. graphView()          — the "Network" page: a force-directed company graph
                               (Obsidian-style) drawn with the demo's own tokens.
     2. an enhancement layer — the small change request items that live in the demo's
                               markup (AI facts on task cards, the reason block in the
                               inbox, a global "+ New"): applied after each render.
     3. window.__graph        — the pure engine (build/layout/step) exposed for testing.

   Conventions it must respect (see _research/rules/README.md):
     · tokens only, logical properties only (RTL-safe), no raw colours
     · no animation of data; the simulation stops when it settles
     · keyboard operable; the list mode is the accessible equivalent of the canvas
     · every string available in English and Arabic
   ===================================================================================== */
(function(){
'use strict';

var IS_BROWSER = (typeof window !== 'undefined') && (typeof document !== 'undefined');
var W = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' ? global : {});
var STORE_KEY = 'ai-company-graph-v1';

/* ------------------------------------------------------------------ geometry tokens ----
   Every length, distance and limit this view uses comes from a --g-* token in graph.css.
   The values below are the documented fallbacks used before the tokens are read (and in the
   headless test, where no stylesheet exists); they mirror the tokens exactly. */
var T = {
  youR: 30, personR: 27, taskR: 14, threadR: 18, hitPad: 8, labelGap: 13, arrow: 5,
  link: 74, linkTask: 52, linkMemberExtra: 26, repel: 5200, gap: 10, maxV: 14, damp: .86,
  /* label bands: a node's footprint includes the space its label needs, so nothing overlaps a label */
  labelReservePerson: 16, labelReserveTask: 13, labelReserveThread: 15,
  deptGap: 26,           /* minimum free space between two department hulls */
  ringMinArc: 88,        /* minimum arc between two nodes on the same ring */
  packIters: 90,         /* final separation passes once the simulation settles */
  labelMax: 18,          /* characters before a node label is shortened */
  hullLabelMax: 14,
  hullLabelBand: 16,     /* reserved band above a hull for its department label (see hullBoxes) */
  zoomMin: .25, zoomMax: 2.2, fitPad: 28, hullPad: 16, hullLabelGap: 5,
  ringGap: 130, ringOffset: 44, ringFlat: .66, maxDepth: 8,
  seedPerson: 170, seedThread: 300, seedTask: 370,
  alpha: .6, decay: .976
};
function tokenNum(name, fallback){
  if (!IS_BROWSER) return fallback;
  var v = safe(function(){ return window.getComputedStyle(document.documentElement).getPropertyValue(name); }, '');
  var n = parseFloat(v);
  return isFinite(n) ? n : fallback;
}
function readTokens(){
  Object.keys(T).forEach(function(k){
    var cssName = '--g-' + k.replace(/[A-Z]/g, function(c){ return '-' + c.toLowerCase(); });
    T[k] = tokenNum(cssName, T[k]);
  });
}

/* ------------------------------------------------------------------ i18n -------------- */
function gt(en, ar){
  try { if (typeof pref !== 'undefined' && pref && pref.lang === 'ar' && ar) return ar; } catch(e){}
  return en;
}

/* ------------------------------------------------------------------ helpers ----------- */
function qs(sel, root){ try { return (root||document).querySelector(sel); } catch(e){ return null; } }
function qsa(sel, root){ try { return Array.prototype.slice.call((root||document).querySelectorAll(sel)); } catch(e){ return []; } }
function safe(fn, fallback){ try { return fn(); } catch(e){ return fallback; } }
function hash(str){ var h = 2166136261, i; for (i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
function lang(v){ return safe(function(){ return tr(v); }, v && v[1] ? v : v); }
function nameOf(id){
  return safe(function(){
    if (id === 'you') return data.operator;
    var a = agent(id); return a ? lang(a.name) : id;
  }, id);
}
function agentById(id){ return safe(function(){ return agent(id); }, null); }

/* A node's footprint is its own radius plus the band its label needs underneath.
   Two nodes may never sit closer than the sum of their footprints, so no label can land on
   a node and no node can land on a label (the packing pass guarantees it, not just the
   soft repulsion). */
function labelReserve(n){
  return n.kind === 'task' ? T.labelReserveTask
       : n.kind === 'thread' ? T.labelReserveThread
       : T.labelReservePerson;
}
function footprint(n){ return n.radius + labelReserve(n); }

/* Which model an employee actually works with — read from the sample threads (no invention). */
function modelFor(agentId){
  return safe(function(){
    var own = (data.threads || []).filter(function(t){ return t.kind === 'dm' && t.members.length === 1 && t.members[0] === agentId; })[0];
    if (own && own.model) return own.model;
    var grp = (data.threads || []).filter(function(t){ return t.members.indexOf(agentId) > -1 && t.model; })[0];
    return grp ? grp.model : '';
  }, '');
}

/* ------------------------------------------------------------------ the model --------- */
/* Nodes: person | task | thread.  Edges: reports | owns | member.
   Depth drives the "Rings" layout: the operator is ring 0, direct reports ring 1, etc. */
function buildGraph(src, prefLang){
  var d = src || (typeof data !== 'undefined' ? data : { agents: [], tasks: [], threads: [], operator: '' });
  var nodes = [], edges = [], byId = {};
  function add(n){ byId[n.id] = n; nodes.push(n); return n; }

  var people = (d.agents || []).map(function(a){ return a; });
  add({ id: 'a:you', kind: 'person', refId: 'you', label: d.operator || gt('You','أنت'), sub: gt('Operator','المشغّل'),
        status: 'you', radius: T.youR, depth: 0, dept: '' });

  /* Reporting depth, walked iteratively with a visited set: an edited org can contain a
     cycle (A reports to B, B reports to A) or a manager outside the roster, and neither may
     send a node off to a distant ring. */
  var index = {};
  people.forEach(function(a){ index[a.id] = a; });
  function depthOf(a){
    if (!a || a.manager === 'you' || !a.manager) return 1;
    var seen = {}, cur = a, depth = 1, guard = 0;
    while (cur && guard++ < T.maxDepth + 2){
      if (seen[cur.id]) return Math.min(depth, T.maxDepth);   /* cycle: stop where we are */
      seen[cur.id] = 1;
      if (!cur.manager || cur.manager === 'you') return depth;
      var m = index[cur.manager];
      if (!m) return depth + 1;                                /* manager is not in the roster */
      cur = m; depth++;
    }
    return Math.min(depth, T.maxDepth);
  }
  people.forEach(function(a){
    add({ id: 'a:' + a.id, kind: 'person', refId: a.id, label: lang(a.name), sub: lang(a.role),
          status: a.status, avatar: a.avatar, grid: a.grid, dept: a.dept, manager: a.manager,
          spent: a.spent, budget: a.budget, focus: lang(a.focus), skills: a.skills,
          radius: T.personR, depth: depthOf(a) });
    if (a.manager) edges.push({ s: 'a:' + a.manager, t: 'a:' + a.id, kind: 'reports' });
  });

  (d.tasks || []).forEach(function(t){
    var owner = byId['a:' + t.owner] || byId['a:you'];
    add({ id: 't:' + t.id, kind: 'task', refId: t.id, label: lang(t.title), sub: lang(t.description) || '',
          stage: t.stage, priority: t.priority, progress: t.progress, due: t.due, owner: t.owner,
          radius: T.taskR, depth: (owner ? owner.depth : 1) + 1 });
    edges.push({ s: 'a:' + t.owner, t: 't:' + t.id, kind: 'owns' });
  });

  (d.threads || []).forEach(function(th){
    var best = 0;
    add({ id: 'x:' + th.id, kind: 'thread', refId: th.id, label: lang(th.name), sub: th.model || '',
          model: th.model, members: th.members || [], threadKind: th.kind,
          radius: T.threadR, depth: 2 });
    (th.members || []).forEach(function(m){
      var mn = byId['a:' + m];
      if (mn && mn.depth + 1 > best) best = mn.depth + 1;
      edges.push({ s: 'a:' + m, t: 'x:' + th.id, kind: 'member' });
    });
    byId['x:' + th.id].depth = Math.max(2, best);
  });

  /* Deterministic starting positions, spread evenly rather than by chance: nodes of the
     same kind get equal arcs, so the very first frame is already free of pile-ups. */
  var kinds = { person: [], task: [], thread: [] };
  nodes.forEach(function(n){ kinds[n.kind].push(n); });
  Object.keys(kinds).forEach(function(kind){
    var list = kinds[kind];
    var r = kind === 'person' ? T.seedPerson : (kind === 'thread' ? T.seedThread : T.seedTask);
    list.forEach(function(n, i){
      var a = (i / Math.max(1, list.length)) * Math.PI * 2;
      n.x = Math.cos(a) * r;
      n.y = Math.sin(a) * r * T.ringFlat;
      n.vx = 0; n.vy = 0;
    });
  });
  byId['a:you'].x = 0; byId['a:you'].y = 0;
  return { nodes: nodes, edges: edges, byId: byId };
}

/* One simulation step. Pure maths — no DOM — so it can be tested headlessly.
   Returns the largest movement; when that approaches 0 the layout has settled. */
function layoutStep(g, opts){
  var o = opts || {};
  var alpha = o.alpha === undefined ? 0.6 : o.alpha;
  var layout = o.layout || 'force';
  var nodes = g.nodes, edges = g.edges, i, j, n, m, dx, dy, d2, d, f, fx, fy;
  var repel = o.repel || T.repel, maxV = T.maxV, damp = T.damp;
  var link = o.link || T.link, linkTask = o.linkTask || T.linkTask;
  var centerIdx = 'a:you';
  var maxMove = 0;

  nodes.forEach(function(node){ node.fx = 0; node.fy = 0; });

  /* repulsion + collision in one pass (n is small: the company graph, not a social network) */
  for (i = 0; i < nodes.length; i++){
    n = nodes[i];
    for (j = i + 1; j < nodes.length; j++){
      m = nodes[j];
      dx = m.x - n.x; dy = m.y - n.y;
      d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = (hash(n.id) % 7) - 3 || 1; dy = (hash(m.id) % 7) - 3 || 1; d2 = dx * dx + dy * dy; }
      if (d2 > 220000) continue;   /* about 470px: distant pairs do not interact */
      d = Math.sqrt(d2);
      f = repel / d2;
      var ux = dx / d, uy = dy / d;
      n.fx -= ux * f; n.fy -= uy * f;
      m.fx += ux * f; m.fy += uy * f;
      var min = footprint(n) + footprint(m) + (o.gap || T.gap);
      if (d < min){
        f = (min - d) * 0.9;
        n.fx -= ux * f; n.fy -= uy * f;
        m.fx += ux * f; m.fy += uy * f;
      }
      if (dx === 0 && dy === 0) { n.vy += 0.1; }
    }
  }

  /* springs */
  edges.forEach(function(e){
    var a = g.byId[e.s], b = g.byId[e.t];
    if (!a || !b) return;
    dx = b.x - a.x; dy = b.y - a.y;
    d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var want = e.kind === 'owns' ? linkTask : (e.kind === 'member' ? link + T.linkMemberExtra : link);
    f = (d - want) * 0.02;
    var ux = dx / d, uy = dy / d;
    if (e.kind === 'reports'){ f *= 1.15; }
    a.fx += ux * f; a.fy += uy * f;
    b.fx -= ux * f; b.fy -= uy * f;
  });

  /* Rings layout: nodes are spread evenly around their ring (never by chance), and a
     ring grows until every node on it has its own arc — so nothing on a ring collides. */
  if (layout === 'rings'){
    var ringGap = T.ringGap;
    var byRing = {};
    nodes.forEach(function(node){ (byRing[node.depth] = byRing[node.depth] || []).push(node); });
    Object.keys(byRing).forEach(function(depth){
      byRing[depth].sort(function(a, b){ return a.id < b.id ? -1 : 1; });
    });
    nodes.forEach(function(node, idx){
      var ring = byRing[node.depth];
      var at = 0, i;
      for (i = 0; i < ring.length; i++) if (ring[i] === node) at = i;
      var count = ring.length;
      var need = count * T.ringMinArc;
      var ang = (count > 1 ? (at / count) : 0.25) * Math.PI * 2 + Math.min(node.depth, T.maxDepth) * 0.35;
      var ring = Math.min(node.depth, T.maxDepth);
      var want = Math.max(ring * ringGap + (node.kind === 'person' ? 0 : T.ringOffset),
                          need / (Math.PI * 2));
      if (node.id === centerIdx) { node.fx -= node.x * 0.5; node.fy -= node.y * 0.5; return; }
      var tx = Math.cos(ang) * want, ty = Math.sin(ang) * want * T.ringFlat;
      node.fx += (tx - node.x) * 0.16; node.fy += (ty - node.y) * 0.16;
      if (idx < 0) node.fy += 0;
    });
  } else {
    /* gentle centring so nothing drifts away, plus departments that cluster
     their own people and push other departments away — which is what keeps the
     department hulls from overlapping each other. */
    nodes.forEach(function(node){
      if (node.id === centerIdx){ node.fx -= node.x * 0.6; node.fy -= node.y * 0.6; return; }
      node.fx -= node.x * 0.012; node.fy -= node.y * 0.012;
    });
    var groups = departmentGroups(g);
    groups.forEach(function(list){
      var c = centroid(list);
      list.forEach(function(node){
        node.fx += (c.x - node.x) * 0.03;
        node.fy += (c.y - node.y) * 0.03;
      });
    });
    separateDepartments(groups, 0.5);
  }

  nodes.forEach(function(node){
    if (node.fixed) { node.vx = 0; node.vy = 0; return; }
    node.vx = (node.vx + node.fx * alpha) * damp;
    node.vy = (node.vy + node.fy * alpha) * damp;
    var v = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (v > maxV){ node.vx = node.vx / v * maxV; node.vy = node.vy / v * maxV; }
    node.x += node.vx; node.y += node.vy;
    if (Math.abs(node.x) > 6000 || Math.abs(node.y) > 6000){ node.x = 0; node.y = 0; node.vx = 0; node.vy = 0; }
    var mv = Math.abs(node.vx) + Math.abs(node.vy);
    if (mv > maxMove) maxMove = mv;
  });
  return maxMove;
}

/* Group people by department (the operator has no department). */
function departmentGroups(graph){
  var g = graph || G;
  if (!g || !g.nodes) return [];
  var by = {};
  g.nodes.forEach(function(n){
    if (n.kind !== 'person' || !n.dept || n.id === 'a:you') return;
    (by[n.dept] = by[n.dept] || []).push(n);
  });
  return Object.keys(by).map(function(k){ return by[k]; });
}
function centroid(list){
  var x = 0, y = 0;
  list.forEach(function(n){ x += n.x; y += n.y; });
  return { x: x / list.length, y: y / list.length };
}
/* Radius a department needs so its own people (with labels) fit inside one hull. */
function groupRadius(list){
  var r = 0, c = centroid(list);
  list.forEach(function(n){
    r = Math.max(r, Math.sqrt((n.x - c.x) * (n.x - c.x) + (n.y - c.y) * (n.y - c.y)) + footprint(n));
  });
  return r;
}
/* Push two department circles apart until there is `deptGap` of clear space between them.
   strength scales the correction so it can be gentle inside the simulation and firm in
   the final packing pass. */
function separateDepartments(groups, strength){
  var i, j;
  for (i = 0; i < groups.length; i++){
    for (j = i + 1; j < groups.length; j++){
      var a = groups[i], b = groups[j];
      var ca = centroid(a), cb = centroid(b);
      var dx = cb.x - ca.x, dy = cb.y - ca.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      var want = groupRadius(a) + groupRadius(b) + T.deptGap;
      if (d >= want) continue;
      var push = (want - d) * 0.5 * (strength === undefined ? 1 : strength);
      var ux = dx / d, uy = dy / d;
      a.forEach(function(n){ n.x -= ux * push; n.y -= uy * push; });
      b.forEach(function(n){ n.x += ux * push; n.y += uy * push; });
    }
  }
}
/* A department's drawn box, INCLUDING the band its label sits in. One definition, used by the
   renderer, by the keep-out pass below and by the verification gate — so "the box the user sees"
   and "the box we test" can never drift apart. */
function boxForList(list){
  var pad = T.hullPad + labelReserve(list[0]);
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  list.forEach(function(n){
    minX = Math.min(minX, n.x - n.radius); maxX = Math.max(maxX, n.x + n.radius);
    minY = Math.min(minY, n.y - n.radius); maxY = Math.max(maxY, n.y + n.radius);
  });
  var box = { x: minX - pad, y: minY - pad - T.hullLabelBand,
              w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 + T.hullLabelBand,
              labelY: minY - pad - T.hullLabelGap, dept: list[0].dept, list: list };
  box.right = box.x + box.w; box.bottom = box.y + box.h;
  return box;
}
function hullBoxes(g){
  var graph = g || G;
  if (!graph || !graph.nodes) return [];
  return departmentGroups(graph).map(boxForList);
}
/* The hulls the view actually draws: company-ish modes, department with 2+ *shown* members.
   paint() and fitView() both use this, so the framing can never ignore something on screen. */
function drawnHullBoxes(graph, shown){
  var g = graph || G;
  if (!g || !g.nodes) return [];
  if (CTRL.mode === 'work') return [];
  var vis = shown || (function(){
    var m = {};
    g.nodes.forEach(function(n){ if (isVisible(n)) m[n.id] = true; });
    return m;
  })();
  var by = {};
  g.nodes.forEach(function(n){
    if (n.kind !== 'person' || !n.dept || n.refId === 'you' || !vis[n.id]) return;
    (by[n.dept] = by[n.dept] || []).push(n);
  });
  return Object.keys(by).filter(function(d){ return by[d].length >= 2; }).map(function(d){ return boxForList(by[d]); });
}
/* Keep every node out of the label band of a group it does not belong to. Without this a node from
   another department (or the operator) is drawn over a department's name — seen in the first
   screenshots taken after the fit fix, and now measured by the gate's "hull label band" check. */
function clearLabelBands(g){
  var graph = g || G;
  if (!graph || !graph.nodes) return 0;
  var boxes = hullBoxes(graph);
  if (!boxes.length) return 0;
  var moved = 0;
  boxes.forEach(function(box){
    var band = { x: box.x, y: box.y, w: box.w, h: T.hullLabelBand };
    var inGroup = {};
    box.list.forEach(function(n){ inGroup[n.id] = true; });
    graph.nodes.forEach(function(n){
      if (inGroup[n.id]) return;                       /* its own members sit inside by definition */
      var f = footprint(n);
      if (n.x + f < band.x || n.x - f > band.x + band.w) return;
      if (n.y + f < band.y || n.y - f > band.y + band.h) return;
      /* move out through whichever horizontal edge is nearer: the minimal translation that
         clears the band completely (a wrong direction here parks the node *inside* the label) */
      var exitTop = band.y - f - 1;              /* centre y just above the band */
      var exitBottom = band.y + band.h + f + 1;  /* centre y just below it */
      n.y = (n.y - exitTop <= exitBottom - n.y) ? exitTop : exitBottom;
      moved += 1;
    });
  });
  return moved;
}
/* The packing pass: no springs, no centring — only separation. It runs once the
   simulation has settled, so the layout the user sees has no overlaps at all. */
function pack(g, opts){
  var o = opts || {};
  var iters = o.iters || T.packIters;
  var moved = 0;
  for (var it = 0; it < iters; it++){
    moved = 0;
    var nodes = g.nodes, i, j;
    for (i = 0; i < nodes.length; i++){
      for (j = i + 1; j < nodes.length; j++){
        var n = nodes[i], m = nodes[j];
        var dx = m.x - n.x, dy = m.y - n.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.001){ dx = ((hash(n.id) % 5) - 2) || 1; dy = ((hash(m.id) % 5) - 2) || 1; d = Math.sqrt(dx * dx + dy * dy); }
        var want = footprint(n) + footprint(m) + T.gap;
        if (d >= want) continue;
        var ux = dx / d, uy = dy / d;
        var push = (want - d) / 2;
        if (n.fixed || n.id === 'a:you'){ m.x += ux * push * 2; m.y += uy * push * 2; }
        else if (m.fixed){ n.x -= ux * push * 2; n.y -= uy * push * 2; }
        else { n.x -= ux * push; n.y -= uy * push; m.x += ux * push; m.y += uy * push; }
        moved += push;
      }
    }
    /* hulls must not overlap either: keep departments clear of one another */
    var groups = departmentGroups(g);
    if (groups.length > 1) separateDepartments(groups, 0.6);
    /* Hull labels are chrome and must stay readable. Clearing a band moves a node, so this
       participates in the loop instead of running once at the end: the next iteration re-separates
       whatever the band clearance disturbed, and the loop only stops when both hold at once. */
    moved += clearLabelBands(g);
    if (moved < 0.05) break;
  }
  return moved;
}

/* ------------------------------------------------------------------ state ------------- */
var G = null;            /* live graph instance */
var VIEW = { k: 1, tx: 0, ty: 0 };          /* what is on screen right now */
/* Every *control* (wheel, buttons, fit, a layout change) moves VIEW_TARGET, and the frame loop
   walks VIEW toward it. That single change is what makes zoom and pan read as one continuous
   movement instead of a jump per event — and it is why a fast wheel flick cannot overshoot: the
   events compound on the target, not on a camera that is still catching up. */
var VIEW_TARGET = null;                     /* null = nothing to travel towards */
var VIEW_VEL = { x: 0, y: 0 };              /* pan inertia, screen px per 60fps frame */
var EASE_PER_FRAME = 0.18;                  /* fraction of the remaining distance per 60fps frame */
var MOTION = { reduced: false };            /* prefers-reduced-motion: set up at boot */
var CTRL = { mode: 'company', layout: 'force', filter: 'all', frozen: false, list: false };
/* First-paint framing (see startLoop): fit once the layout settles, unless we restored the
   user's own saved view, and keep refitting on resize until the user frames it themselves. */
var NEEDS_FIT = false;       /* set when there is no saved view to restore */
var VIEW_RESTORED = false;   /* a saved zoom/pan was applied — never override it */
var USER_ADJUSTED = false;   /* the user panned, zoomed or fitted by hand */
var selectedId = null, hoverId = null;
var raf = 0, alpha = 0, lastPaint = 0;

function nodesForDatasets(mode){
  if (mode === 'work') return { person: true, task: true, thread: false };
  if (mode === 'company') return { person: true, task: false, thread: true };
  return { person: true, task: true, thread: true };
}
function matchesFilter(n, filter){
  if (filter === 'all') return true;
  if (filter === 'person') return n.kind === 'person';
  if (filter === 'task') return n.kind === 'task';
  if (filter === 'thread') return n.kind === 'thread';
  if (filter === 'attention'){
    if (n.kind === 'task') return n.stage === 'review' || n.priority === 'critical' || n.stage === 'backlog';
    if (n.kind === 'person') return n.status === 'error' || n.status === 'paused';
    return false;
  }
  return true;
}
function isVisible(n){
  if (!nodesForDatasets(CTRL.mode)[n.kind]) return false;
  if (CTRL.mode === 'company' && n.kind === 'person' && n.refId === 'you') return true;
  return matchesFilter(n, CTRL.filter) || n.id === selectedId;
}
function visibleEdges(){
  return G.edges.filter(function(e){
    var a = G.byId[e.s], b = G.byId[e.t];
    if (!a || !b) return false;
    if (!isVisible(a) || !isVisible(b)) return false;
    if (CTRL.mode === 'work' && e.kind === 'member') return false;
    if (CTRL.mode === 'company' && e.kind === 'owns') return false;
    return true;
  });
}

/* ------------------------------------------------------------------ persistence ------- */
function loadState(){
  try {
    var raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch(e){ return null; }
}
function saveState(){
  if (!IS_BROWSER || !G) return;
  try {
    var pos = {};
    G.nodes.forEach(function(n){ pos[n.id] = [Math.round(n.x), Math.round(n.y)]; });
    window.localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 1, pos: pos, view: { k: VIEW.k, tx: Math.round(VIEW.tx), ty: Math.round(VIEW.ty) },
      ctrl: { mode: CTRL.mode, layout: CTRL.layout, filter: CTRL.filter, list: CTRL.list }
    }));
  } catch(e){ /* storage may be unavailable — the view still works */ }
}
function applyState(saved){
  if (!saved || !G) return false;
  var used = 0;
  if (saved.pos) {
    G.nodes.forEach(function(n){
      var p = saved.pos[n.id];
      if (p && isFinite(p[0]) && isFinite(p[1])){ n.x = p[0]; n.y = p[1]; used++; }
    });
  }
  if (saved.ctrl){
    if (['company','work','all'].indexOf(saved.ctrl.mode) > -1) CTRL.mode = saved.ctrl.mode;
    if (['force','rings'].indexOf(saved.ctrl.layout) > -1) CTRL.layout = saved.ctrl.layout;
    if (['all','person','task','thread','attention'].indexOf(saved.ctrl.filter) > -1) CTRL.filter = saved.ctrl.filter;
    CTRL.list = saved.ctrl.list === true;
  }
  if (saved.view && isFinite(saved.view.k)){
    VIEW.k = Math.min(T.zoomMax, Math.max(T.zoomMin, saved.view.k));
    VIEW.tx = saved.view.tx || 0; VIEW.ty = saved.view.ty || 0;
    VIEW_RESTORED = true;
  }
  return used > 0;
}

/* ------------------------------------------------------------------ rendering --------- */
function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) Object.keys(attrs).forEach(function(k){ el.setAttribute(k, attrs[k]); });
  return el;
}
function buildScene(){
  var svg = qs('#g-canvas');
  if (!svg || !G) return;
  svg.textContent = '';
  var viewport = svgEl('g', { id: 'g-viewport' });
  svg.appendChild(viewport);
  var hulls = svgEl('g', { id: 'g-hulls' });
  var edges = svgEl('g', { id: 'g-edges' });
  var nodes = svgEl('g', { id: 'g-nodes' });
  viewport.appendChild(hulls); viewport.appendChild(edges); viewport.appendChild(nodes);

  G.edges.forEach(function(e){
    var line = svgEl('line', { 'class': 'g-edge', 'data-kind': e.kind });
    var arrow = e.kind === 'reports' ? svgEl('path', { 'class': 'g-arrow' }) : null;
    e.el = line; e.ar = arrow;
    edges.appendChild(line);
    if (arrow) edges.appendChild(arrow);
  });

  G.nodes.forEach(function(n){
    var g = svgEl('g', { 'class': 'g-node', 'data-id': n.id, 'data-kind': n.kind, 'data-status': n.status || '', 'data-stage': n.stage || '' });
    var r = n.radius;
    g.appendChild(svgEl('circle', { 'class': 'g-hit', r: r + T.hitPad }));
    if (n.kind === 'task'){
      g.appendChild(svgEl('rect', { 'class': 'g-body', x: -r, y: -r, width: r * 2, height: r * 2, rx: 0 }));
      g.appendChild(svgEl('path', { 'class': 'g-stage-mark', d: 'M' + (-r/2) + ' 0h' + r }));
    } else {
      g.appendChild(svgEl('circle', { 'class': 'g-body', r: r }));
      if (n.kind === 'thread'){
        g.appendChild(svgEl('path', { 'class': 'g-glyph', d: 'M' + (-r/2) + ' ' + (-r/5) + 'h' + r + 'v' + (r*0.55) + 'h' + (-r*0.5) + 'l' + (-r*0.28) + ' ' + (r*0.3) + 'z' }));
      }
    }
    if (n.kind === 'person'){
      g.appendChild(svgEl('circle', { 'class': 'g-status', r: r + 4 }));
      var av = null;
      if (typeof n.avatar === 'number' && typeof AVATARS !== 'undefined' && AVATARS[n.avatar]){
        av = AVATARS[n.avatar];
        var inner = svgEl('svg', { 'class': 'g-avatar', x: -r + 4, y: -r + 4, width: r * 2 - 8, height: r * 2 - 8,
                                   viewBox: '-2 -2 ' + (av.grid + 4) + ' ' + (av.grid + 4) });
        inner.appendChild(svgEl('path', { d: av.path, fill: 'currentColor' }));
        g.appendChild(inner);
      }
    }
    var label = svgEl('text', { 'class': 'g-label', y: r + T.labelGap });
    label.textContent = shorten(n.label, T.labelMax);
    var title = svgEl('title');
    title.textContent = n.label + (n.sub ? ' — ' + n.sub : '');
    label.appendChild(title);
    g.appendChild(label);
    n.el = g; n.labelEl = label;
    nodes.appendChild(g);
  });
}
function depthText(n){
  if (n.kind === 'person') return gt('Reports to: ','يرفع تقاريره إلى: ') + (n.refId === 'you' ? gt('—','—') : nameOf(n.manager));
  if (n.kind === 'task') return gt('Owner: ','المسؤول: ') + nameOf(n.owner);
  if (n.kind === 'thread') return (n.members || []).map(function(m){ return nameOf(m); }).join(', ');
  return '';
}
/* ---------------------------------------------------------------- camera maths ---------
   Four pure functions. They are pure — and exported on __graph — because "the zoom is smooth"
   is otherwise a matter of opinion: verify.mjs walks a fake wheel flick through them without a
   browser and asserts the camera eases, settles exactly on its target, never overshoots the
   zoom limits and never drifts. */

/** Keep a view inside the zoom limits. */
function clampView(v){
  return { k: Math.min(T.zoomMax, Math.max(T.zoomMin, v.k)), tx: v.tx, ty: v.ty };
}

/** Are these the same view, to the pixel? (used to stop the loop exactly on arrival) */
function viewEquals(a, b){
  return !!a && !!b && Math.abs(a.k - b.k) < 1e-4 && Math.abs(a.tx - b.tx) < 0.2 && Math.abs(a.ty - b.ty) < 0.2;
}

/**
 * One step from `cur` toward `target`, covering `factor` of the remaining distance.
 *
 * The factor is corrected for the frame that actually elapsed (`easeViewOver`), so a 120 Hz phone
 * and a 30 fps laptop both take the same third of a second. Without that correction the same
 * animation is twice as fast on a good screen — the usual reason a "smooth" zoom feels different
 * on every device.
 */
function easeView(cur, target, factor){
  var k = cur.k + (target.k - cur.k) * factor;
  var tx = cur.tx + (target.tx - cur.tx) * factor;
  var ty = cur.ty + (target.ty - cur.ty) * factor;
  /* On arrival: the target **itself**, not a copy of its numbers. The caller can then stop the
     frame loop by identity (`VIEW === VIEW_TARGET`) and never leave the camera a fraction of a
     pixel away from where it was asked to be — the same contract as the app's camera.ease(). */
  return viewEquals({ k: k, tx: tx, ty: ty }, target) ? target : { k: k, tx: tx, ty: ty };
}

/** The same step, for a frame that took `dt` milliseconds. */
function easeViewOver(cur, target, dt){
  var frames = Math.max(0.25, Math.min(6, dt / (1000 / 60)));
  return easeView(cur, target, 1 - Math.pow(1 - EASE_PER_FRAME, frames));
}

/** Zoom to `k` about a point on the stage, holding the graph point under it still. */
function zoomedAt(v, k, mx, my){
  var inside = Math.min(T.zoomMax, Math.max(T.zoomMin, k));
  if (inside === v.k) return { k: v.k, tx: v.tx, ty: v.ty };
  return { k: inside, tx: mx - (mx - v.tx) * (inside / v.k), ty: my - (my - v.ty) * (inside / v.k) };
}

/** How strong one wheel event is — the three delta units normalised, as the app's wheelFactor does. */
function wheelStep(deltaY, deltaMode, ctrlKey){
  var perLine = 16, perPage = 400;
  var pixels = deltaMode === 1 ? deltaY * perLine : deltaMode === 2 ? deltaY * perPage : deltaY;
  var capped = Math.max(-240, Math.min(240, pixels));
  return Math.exp(-capped * (ctrlKey ? 0.004 : 0.0016));
}

/** The camera that shows a set of nodes (and their hulls) whole, with a margin. */
function fitted(list, hulls, w, h, pad){
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  list.forEach(function(n){
    minX = Math.min(minX, n.x - n.radius); maxX = Math.max(maxX, n.x + n.radius + 60);
    minY = Math.min(minY, n.y - n.radius); maxY = Math.max(maxY, n.y + n.radius + 18);
  });
  (hulls || []).forEach(function(b){
    minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.right);
    minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.bottom);
  });
  if (!isFinite(minX)) return { k: 1, tx: 0, ty: 0 };
  var k = Math.min((w - pad*2) / Math.max(1, maxX - minX), (h - pad*2) / Math.max(1, maxY - minY));
  k = Math.min(T.zoomMax, Math.max(T.zoomMin, k));
  return { k: k, tx: (w - (maxX - minX) * k) / 2 - minX * k, ty: (h - (maxY - minY) * k) / 2 - minY * k };
}

/** The camera half of paint() — kept apart so a camera-only frame does not rebuild the graph. */
function paintCamera(){
  var svg = qs('#g-canvas');
  if (!svg) return;
  var vp = qs('#g-viewport', svg);
  if (!vp) return;
  vp.setAttribute('transform', 'translate(' + VIEW.tx + ' ' + VIEW.ty + ') scale(' + VIEW.k + ')');
}

function paint(){
  var svg = qs('#g-canvas');
  if (!svg || !G) return;
  var vp = qs('#g-viewport', svg);
  if (!vp) return;
  paintCamera();
  var filter = visibleEdges();
  var shown = {}; filter.forEach(function(e){ shown[e.s] = 1; shown[e.t] = 1; });

  /* neighbourhood highlight */
  var focusSet = {};
  var focus = selectedId || hoverId;
  if (focus){
    focusSet[focus] = 1;
    G.edges.forEach(function(e){ if (e.s === focus) focusSet[e.t] = 1; if (e.t === focus) focusSet[e.s] = 1; });
  }

  G.edges.forEach(function(e){
    if (!e.el){ return; }
    var a = G.byId[e.s], b = G.byId[e.t];
    var on = filter.indexOf(e) > -1;
    e.el.setAttribute('data-dim', focus && !(e.s === focus || e.t === focus) ? 'true' : 'false');
    e.el.setAttribute('data-hi', focus && (e.s === focus || e.t === focus) ? 'true' : 'false');
    e.el.style.display = on ? '' : 'none';
    if (!on) { if (e.ar) e.ar.style.display = 'none'; return; }
    e.el.setAttribute('x1', a.x); e.el.setAttribute('y1', a.y);
    e.el.setAttribute('x2', b.x); e.el.setAttribute('y2', b.y);
    if (e.ar){
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.sqrt(dx*dx + dy*dy));
      var ux = dx / d, uy = dy / d, tip = b.radius + 3;
      var px = b.x - ux * tip, py = b.y - uy * tip;
      var s = T.arrow;
      e.ar.setAttribute('d', 'M' + px + ' ' + py + 'L' + (px - ux*s - uy*s*0.6) + ' ' + (py - uy*s + ux*s*0.6) +
                             'L' + (px - ux*s + uy*s*0.6) + ' ' + (py - uy*s - ux*s*0.6) + 'z');
      e.ar.style.display = '';
      e.ar.setAttribute('data-hi', focus && (e.s === focus || e.t === focus) ? 'true' : 'false');
    }
  });

  /* department hulls (company mode only) — a label, never the only way to know a department */
  var hullsG = qs('#g-hulls', svg);
  if (hullsG){
    hullsG.textContent = '';
    drawnHullBoxes(G, shown).forEach(function(box){
      hullsG.appendChild(svgEl('rect', { 'class': 'g-hull', x: box.x, y: box.y,
        width: box.w, height: box.h, rx: 0 }));
      var t = svgEl('text', { 'class': 'g-hull-label', x: box.x + T.hullLabelGap, y: box.labelY });
      t.textContent = shorten(safe(function(){ return t0(box.dept); }, box.dept), T.hullLabelMax);
      hullsG.appendChild(t);
    });
  }

  G.nodes.forEach(function(n){
    if (!n.el) return;
    var on = isVisible(n);
    n.el.style.display = on ? '' : 'none';
    if (!on) return;
    var crisp = Math.round(n.x) === n.x ? 0 : 0; /* keep sub-pixel positions: drag must feel smooth */
    n.el.setAttribute('transform', 'translate(' + n.x + ' ' + n.y + ')');
    var dim = focus && !focusSet[n.id];
    n.el.setAttribute('data-dim', dim ? 'true' : 'false');
    n.el.setAttribute('data-hi', focus && focusSet[n.id] ? 'true' : 'false');
    n.el.setAttribute('data-selected', n.id === selectedId ? 'true' : 'false');
    var showLabel = n.kind === 'thread' || (n.kind === 'person' && VIEW.k >= 0.8) ||
                    n.id === selectedId || n.id === hoverId;
    n.labelEl.style.display = showLabel ? '' : 'none';
    if (crisp) { /* no-op: documents the intent above */ }
  });
}
function t0(s){ return typeof t === 'function' ? t(s) : s; }

/* ------------------------------------------------------------------ the loop ---------- */
function startLoop(){
  if (raf) return;
  var last = 0;
  function frame(now){
    raf = 0;
    if (!G) return;
    if (!qs('#g-canvas')) { teardown(); return; }
    var dt = last ? Math.min(64, Math.max(1, (now || 0) - last)) : 1000 / 60;
    last = now || 0;
    var cameraMoved = false;

    if (!CTRL.frozen && alpha > 0.004){
      layoutStep(G, { alpha: alpha, layout: CTRL.layout });
      alpha *= T.decay;
      if (alpha < 0.004){ alpha = 0; pack(G, {}); paint(); saveState(); }
    }

    /* Inertia: a pan that was still moving when the finger left keeps going and slows down. One
       frame of it is skipped when the ease below is also running, so the two never fight — and it
       stops dead at the edge of what is on screen rather than sliding the graph out of reach. */
    if ((VIEW_VEL.x || VIEW_VEL.y) && !panning && !dragging && !MOTION.reduced){
      VIEW = { k: VIEW.k, tx: VIEW.tx + VIEW_VEL.x, ty: VIEW.ty + VIEW_VEL.y };
      VIEW_VEL.x *= 0.92; VIEW_VEL.y *= 0.92;
      if (Math.abs(VIEW_VEL.x) < 0.05) VIEW_VEL.x = 0;
      if (Math.abs(VIEW_VEL.y) < 0.05) VIEW_VEL.y = 0;
      VIEW_TARGET = VIEW_TARGET ? { k: VIEW_TARGET.k, tx: VIEW_TARGET.tx + VIEW_VEL.x, ty: VIEW_TARGET.ty + VIEW_VEL.y } : null;
      cameraMoved = true;
      paintCamera();
    }

    if (VIEW_TARGET && !panning && !dragging && !pinching){
      var before = VIEW;
      VIEW = MOTION.reduced ? VIEW_TARGET : easeViewOver(VIEW, VIEW_TARGET, dt);
      if (viewEquals(VIEW, VIEW_TARGET)){ VIEW = VIEW_TARGET; VIEW_TARGET = null; saveState(); }
      cameraMoved = cameraMoved || !viewEquals(before, VIEW);
      paintCamera();
    }

    paint();
    /* First paint: with no view of its own to restore, the graph must be shown *whole*.
       Without this the nodes render at world coordinates and the stage clips them — found by
       design/prototype/probe-browser.mjs (20 of 22 nodes crossed the stage edge at every
       viewport). Fitting the view moves no node, so the persisted-layout rule of _research/14
       ("recompute only on explicit user action") still holds. */
    /* Re-frame once the layout has settled — but never over a view the user has already framed
       themselves. It used to: a wheel flick during the first second of settling was silently
       undone when the layout stopped moving (the camera glided back to the fit), because the
       deferred fit only checked whether *it* wanted to fit, never whether the user had taken over. */
    if (alpha === 0 && NEEDS_FIT){ NEEDS_FIT = false; if (!USER_ADJUSTED) fitView(); }
    /* Keep going while *anything* on screen is still moving. The camera was left out of this
       condition at first, and the effect was a zoom that stopped a third of the way to where it
       was asked to go (measured: six wheel events produced six frames of movement and then a
       halt). The layout freezing is not the camera stopping either — "Freeze layout" pins the
       nodes, not the view. */
    var still = alpha > 0.004 || dragging || panning || pinching || VIEW_TARGET || VIEW_VEL.x || VIEW_VEL.y;
    if (still) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
function teardown(){
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  G = null;
}
function wake(a){ alpha = Math.max(alpha, a === undefined ? T.alpha : a); startLoop(); }

/* ------------------------------------------------------------------ interaction -------- */
var dragging = null, panning = null, pinching = null, pointers = {}, moved = 0, VIEW_SETTLED_ONCE = false;

/**
 * Capture a pointer, but never let a failed capture break the gesture.
 *
 * `setPointerCapture` throws NotFoundError when the pointer is already gone — which is exactly what
 * a synthetic click (a test, a screen reader, a scripted click) does: pointerdown and pointerup
 * arrive in the same tick. The old code called it bare, so a scripted click on a node logged an
 * error while working anyway. Now the capture is best-effort and the gesture proceeds either way.
 */
function safeCapture(el, pointerId){
  try { el.setPointerCapture(pointerId); } catch(e){ /* the pointer is already gone — the pan/drag below still works */ }
}

function worldPoint(ev){
  var svg = qs('#g-canvas');
  if (!svg) return { x: 0, y: 0 };
  var r = svg.getBoundingClientRect();
  return { x: (ev.clientX - r.left - VIEW.tx) / VIEW.k, y: (ev.clientY - r.top - VIEW.ty) / VIEW.k };
}
function hitTest(p){
  var best = null;
  G.nodes.forEach(function(n){
    if (!isVisible(n)) return;
    var dx = p.x - n.x, dy = p.y - n.y;
    var d = Math.sqrt(dx*dx + dy*dy);
    if (d <= n.radius + 8 && (!best || d < best.d)) best = { n: n, d: d };
  });
  return best ? best.n : null;
}
function attachInteraction(){
  var svg = qs('#g-canvas');
  if (!svg || !G) return;
  svg.addEventListener('pointerdown', function(ev){
    var p = worldPoint(ev);
    var n = hitTest(p);
    moved = 0;
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    /* A second finger on a phone means "pinch", not "drag a node": the touch becomes a view
       gesture, and the node under the first finger is released where it stands. */
    if (Object.keys(pointers).length === 2){
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]], b = pointers[ids[1]];
      dragging = null; panning = null;
      VIEW_TARGET = null; VIEW_VEL.x = 0; VIEW_VEL.y = 0;
      pinching = { dist: Math.max(1, Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y))), view: { k: VIEW.k, tx: VIEW.tx, ty: VIEW.ty } };
      safeCapture(svg, ev.pointerId);
      ev.preventDefault();
      return;
    }
    if (n){
      dragging = { n: n, id: ev.pointerId };
      n.fixed = true;
      safeCapture(svg, ev.pointerId);
    } else {
      panning = { x: ev.clientX, y: ev.clientY, tx: VIEW.tx, ty: VIEW.ty, id: ev.pointerId,
                  lastX: ev.clientX, lastY: ev.clientY, last: 0 };
      VIEW_TARGET = null;                    /* the hand wins over any glide in progress */
      VIEW_VEL.x = 0; VIEW_VEL.y = 0;
      svg.setAttribute('data-panning', 'true');
      safeCapture(svg, ev.pointerId);
    }
    ev.preventDefault();
  });
  svg.addEventListener('pointermove', function(ev){
    var p = worldPoint(ev);
    if (dragging){
      moved += 1;
      dragging.n.x = p.x; dragging.n.y = p.y;
      dragging.n.vx = 0; dragging.n.vy = 0;
      paint();
    } else if (panning){
      moved += 1;
      /* Track how fast the hand is moving, so the release can carry on gently instead of
         stopping dead. `last` is the previous event's timestamp; the two together are the whole
         of the inertia. */
      if (panning.last){
        var gap = Math.max(1, (ev.timeStamp || 0) - panning.last);
        VIEW_VEL.x = (ev.clientX - panning.lastX) / gap * 14;
        VIEW_VEL.y = (ev.clientY - panning.lastY) / gap * 14;
      }
      panning.last = ev.timeStamp || 0;
      panning.lastX = ev.clientX; panning.lastY = ev.clientY;
      VIEW.tx = panning.tx + (ev.clientX - panning.x);
      VIEW.ty = panning.ty + (ev.clientY - panning.y);
      paintCamera();
    } else if (pinching){
      var ids = Object.keys(pointers);
      if (ids.length >= 2){
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.max(1, Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y)));
        var r = svg.getBoundingClientRect();
        VIEW = zoomedAt(pinching.view, pinching.view.k * (dist / pinching.dist),
                        (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        paintCamera();
        moved += 1;
      }
    } else {
      var n = hitTest(p);
      if ((n ? n.id : null) !== hoverId){ hoverId = n ? n.id : null; paint(); }
      svg.style.cursor = n ? 'pointer' : 'grab';
    }
  });
  function endDrag(ev){
    if (dragging){
      dragging.n.fixed = false;
      if (moved < 4) select(dragging.n.id);
      dragging = null;
      wake(0.28); saveState();
    } else if (panning){
      panning = null; svg.setAttribute('data-panning', 'false');
      USER_ADJUSTED = true;            /* the user framed the view themselves */
      saveState();
      /* The glide. A slow, deliberate drag has no velocity worth carrying, so it simply stops;
         a flick keeps going and decays. */
      if (VIEW_VEL.x || VIEW_VEL.y) startLoop();
    }
    if (pinching) pinching = null;
    delete pointers[ev.pointerId];
    try { svg.releasePointerCapture(ev.pointerId); } catch(e){}
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('wheel', function(ev){
    ev.preventDefault();
    var r = svg.getBoundingClientRect();
    var mx = ev.clientX - r.left, my = ev.clientY - r.top;
    /* Anchor the zoom on the pointer — the node under the cursor stays under the cursor, which is
       the difference between zooming *into* the graph and zooming *at* the screen. */
    VIEW_TARGET = zoomedAt(VIEW_TARGET || VIEW, (VIEW_TARGET || VIEW).k * wheelStep(ev.deltaY, ev.deltaMode, ev.ctrlKey), mx, my);
    USER_ADJUSTED = true;
    if (MOTION.reduced){ VIEW = VIEW_TARGET; VIEW_TARGET = null; paintCamera(); saveState(); return; }
    startLoop();
  }, { passive: false });
  svg.addEventListener('dblclick', function(ev){
    /* Double-click zooms one comfortable step about the point that was clicked; shift reverses it,
       which is the convention every map has taught people. */
    var r = svg.getBoundingClientRect();
    var mx = ev.clientX - r.left, my = ev.clientY - r.top;
    USER_ADJUSTED = true;
    aimView(zoomedAt(VIEW, VIEW.k * (ev.shiftKey ? 1/1.7 : 1.7), mx, my));
  });
  svg.addEventListener('keydown', function(ev){
    if (ev.key === 'Enter' || ev.key === ' '){
      if (selectedId){ ev.preventDefault(); openSelected(); }
      return;
    }
    if (ev.key === 'Escape'){ selectedId = null; paint(); renderSide(); return; }
    var dirs = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
    var dxy = dirs[ev.key];
    if (!dxy) {
      if (ev.key === 'f' || ev.key === 'F'){ USER_ADJUSTED = true; fitView(); }
      if (ev.key === 'r' || ev.key === 'R'){ resetLayout(); }
      return;
    }
    ev.preventDefault();
    moveSelection(dxy[0], dxy[1]);
  });
}
function moveSelection(dx, dy){
  var cur = selectedId ? G.byId[selectedId] : null;
  var best = null, bestScore = Infinity;
  G.nodes.forEach(function(n){
    if (!isVisible(n) || n === cur) return;
    var vx = n.x - (cur ? cur.x : 0), vy = n.y - (cur ? cur.y : 0);
    var along = vx * dx + vy * dy;
    if (along <= 0) return;
    var side = Math.abs(vx * dy - vy * dx);
    var score = along + side * 1.6;
    if (score < bestScore){ bestScore = score; best = n; }
  });
  if (best){ select(best.id); }
}
function select(id){
  selectedId = id;
  paint(); renderSide();
  var n = G.byId[id];
  announce(n ? n.label + '. ' + depthText(n) : gt('Selection cleared','تم إلغاء التحديد'));
}
function openSelected(){
  var n = selectedId ? G.byId[selectedId] : null;
  if (!n) return;
  if (n.kind === 'person' && n.refId !== 'you'){ profile(n.refId); return; }
  if (n.kind === 'task'){ taskDialog(n.refId); return; }
  if (n.kind === 'thread'){
    safe(function(){ ui.thread = n.refId; navigate('comms'); });
  }
}
/**
 * The view that shows everything — or null when there is nothing to show.
 *
 * The department hulls and their labels are on screen too: fitting without them clips them
 * (measured once: the rings layout overflowed the stage at every viewport before this).
 */
function fitCandidate(){
  var svg = qs('#g-canvas');
  if (!svg || !G) return null;
  var list = G.nodes.filter(isVisible);
  if (!list.length) return null;
  var box = svg.getBoundingClientRect();
  var w = box.width || svg.clientWidth || 800, h = box.height || svg.clientHeight || 520;
  return fitted(list, drawnHullBoxes(G), w, h, T.fitPad);
}

/** Move to a view: instantly, or gracefully. Every control goes through here. */
function aimView(next, immediate){
  if (!next) return;
  var shouldJump = immediate === true || MOTION.reduced || !IS_BROWSER;
  if (shouldJump){
    VIEW = next; VIEW_TARGET = null;
    if (IS_BROWSER) { paintCamera(); saveState(); }
    return;
  }
  VIEW_TARGET = next;
  startLoop();
}

function fitView(immediate){
  var next = fitCandidate();
  if (!next) return;
  /* The very first framing is not animated: the graph must appear whole on frame one, and an
     ease from the default view would show it clipped on the way there. Everything after it —
     the F key, a double-click, a layout change — glides. */
  if (immediate === undefined) immediate = !VIEW_SETTLED_ONCE;
  aimView(next, immediate);
  VIEW_SETTLED_ONCE = true;
}
function resetLayout(){
  if (!G) return;
  var kinds = { person: [], task: [], thread: [] };
  G.nodes.forEach(function(n){ n.vx = 0; n.vy = 0; n.fixed = false; kinds[n.kind].push(n); });
  Object.keys(kinds).forEach(function(kind){
    var list = kinds[kind];
    var r = kind === 'person' ? T.seedPerson : (kind === 'thread' ? T.seedThread : T.seedTask);
    list.forEach(function(n, i){
      var a = (i / Math.max(1, list.length)) * Math.PI * 2;
      n.x = Math.cos(a) * r; n.y = Math.sin(a) * r * T.ringFlat;
    });
  });
  G.byId['a:you'].x = 0; G.byId['a:you'].y = 0;
  try { window.localStorage.removeItem(STORE_KEY); } catch(e){}
  CTRL.frozen = false;
  USER_ADJUSTED = false; NEEDS_FIT = true;   /* re-frame once the new layout settles */
  wake(1);
  paint(); renderSide();
  notifySafe(gt('Layout restarted','تمت إعادة ترتيب التخطيط'));
}
function notifySafe(msg){
  safe(function(){ if (typeof notify === 'function') notify(msg); });
}
function announce(msg){
  var el = qs('#g-live');
  if (el) el.textContent = msg;
}
function zoomBy(factor){
  var svg = qs('#g-canvas'); if (!svg) return;
  USER_ADJUSTED = true;
  var box = svg.getBoundingClientRect();
  var w = (box.width || 800) / 2, h = (box.height || 520) / 2;
  aimView(zoomedAt(VIEW_TARGET || VIEW, (VIEW_TARGET || VIEW).k * factor, w, h));
}
function setFrozen(v){
  CTRL.frozen = v === undefined ? !CTRL.frozen : v;
  if (!CTRL.frozen) wake(0.4); else { VIEW_TARGET = null; paintCamera(); }
  updateControls(); saveState();
  announce(CTRL.frozen ? gt('Layout frozen','تم تثبيت التخطيط') : gt('Layout running','التخطيط يعمل'));
}

/* ------------------------------------------------------------------ side panel --------- */
/* The panel markup is a pure function so the initial page render already contains it
   (no empty column while the graph initialises) and the testable path covers both cases. */
function sideHTML(n){
  if (!n){
    return '<section class="panel"><h3>' + gt('Nothing selected','لم يتم تحديد شيء') + '</h3>' +
      '<p class="g-hint">' + gt('Choose a node on the graph, or use the list view and press Enter.','اختر عقدة على الرسم، أو استخدم عرض القائمة واضغط Enter.') + '</p></section>' +
      helpPanel();
  }
  return sideBody(n);
}
function renderSide(){
  var host = qs('#g-side');
  if (!host) return;
  var n = selectedId && G ? G.byId[selectedId] : null;
  host.innerHTML = sideHTML(n);
  var btn = qs('#g-open');
  if (btn) btn.addEventListener('click', openSelected);
}
function sideBody(n){
  var rows = [];
  rows.push(['Type', n.kind === 'person' ? gt('Person','شخص') : n.kind === 'task' ? gt('Task','مهمة') : gt('Conversation','محادثة')]);
  if (n.kind === 'person'){
    rows.push([gt('Role','الدور'), n.sub]);
    rows.push([gt('Status','الحالة'), statusText(n.status)]);
    if (n.dept) rows.push([gt('Department','القسم'), safe(function(){ return t0(n.dept); }, n.dept)]);
    rows.push([gt('Reports to','يرفع تقاريره إلى'), n.refId === 'you' ? '—' : nameOf(n.manager)]);
    if (typeof n.budget === 'number') rows.push([gt('Monthly budget','الميزانية الشهرية'), safe(function(){ return money(n.spent) + ' / ' + money(n.budget); }, n.spent + '/' + n.budget)]);
    if (n.focus) rows.push([gt('Current focus','العمل الحالي'), n.focus]);
    var m = modelFor(n.refId); if (m) rows.push([gt('Model','النموذج'), m]);
  } else if (n.kind === 'task'){
    rows.push([gt('Owner','المسؤول'), nameOf(n.owner)]);
    rows.push([gt('Stage','المرحلة'), stageText(n.stage)]);
    rows.push([gt('Priority','الأولوية'), statusText(n.priority)]);
    if (typeof n.progress === 'number') rows.push([gt('Progress','التقدم'), safe(function(){ return num(n.progress) + '%'; }, n.progress + '%')]);
    if (n.due) rows.push([gt('Due','الاستحقاق'), safe(function(){ return date(n.due); }, n.due)]);
  } else {
    if (n.model) rows.push([gt('Model','النموذج'), n.model]);
    rows.push([gt('Members','الأعضاء'), (n.members || []).map(nameOf).join(', ')]);
  }
  rows.push([gt('Links','الروابط'), linksText(n)]);
  return '<section class="panel"><h3>' + escSafe(n.label) + '</h3><dl>' +
    rows.map(function(r){ return '<dt>' + escSafe(r[0]) + '</dt><dd>' + escSafe(r[1] == null ? '—' : String(r[1])) + '</dd>'; }).join('') +
    '</dl><div class="row spaced">' + openButton(n) + '</div></section>' + helpPanel();
}
function linksText(n){
  if (!G) return '';
  var rel = G.edges.filter(function(e){ return e.s === n.id || e.t === n.id; });
  return gt('reports to ','يرتبط بـ ') + rel.length + gt(' links',' روابط');
}
function statusText(s){
  var map = {
    working: gt('Working','يعمل'), idle: gt('Idle','خامل'), paused: gt('Paused','متوقف'),
    error: gt('Needs attention','يحتاج انتباهاً'), you: gt('You','أنت'),
    low: gt('Low','منخفضة'), medium: gt('Medium','متوسطة'), high: gt('High','عالية'),
    critical: gt('Critical','حرجة'), sent: gt('Sent','أُرسلت')
  };
  return map[s] || s || '—';
}
function stageText(s){
  var map = { backlog: gt('Backlog','قائمة الانتظار'), progress: gt('In progress','قيد التنفيذ'),
              review: gt('In review','قيد المراجعة'), done: gt('Done','مكتملة') };
  return map[s] || s || '—';
}
function openButton(n){
  if (!n || n.kind === 'person' && n.refId === 'you') return '';
  var label = n.kind === 'person' ? gt('Open profile','فتح الملف') : n.kind === 'task' ? gt('Open task','فتح المهمة') : gt('Open conversation','فتح المحادثة');
  return '<button class="btn primary" id="g-open" type="button">' + label + '</button>';
}
function helpPanel(){
  return '<section class="panel"><h3>' + gt('Keyboard and pointer','لوحة المفاتيح والمؤشر') + '</h3><div class="g-kbdlist">' +
    '<span>' + gt('Move selection','تحريك التحديد') + '</span><span class="mono">' + gt('Arrow keys','مفاتيح الأسهم') + '</span>' +
    '<span>' + gt('Open','فتح') + '</span><span class="mono">Enter</span>' +
    '<span>' + gt('Clear','إلغاء') + '</span><span class="mono">Esc</span>' +
    '<span>' + gt('Fit to content','احتواء المحتوى') + '</span><span class="mono">F</span>' +
    '<span>' + gt('Reset layout','إعادة الترتيب') + '</span><span class="mono">R</span>' +
    '<span>' + gt('Zoom','تكبير/تصغير') + '</span><span class="mono">' + gt('Wheel or + / −','عجلة الفأرة أو + / −') + '</span>' +
    '<span>' + gt('Move a node','تحريك عقدة') + '</span><span>' + gt('Drag','اسحب') + '</span>' +
    '<span>' + gt('Pan the view','تحريك العرض') + '</span><span>' + gt('Drag the background','اسحب الخلفية') + '</span>' +
    '</div><p class="g-hint spaced">' + gt('Positions are local to this browser. The list view carries the same content.','المواضع محفوظة في هذا المتصفح فقط. عرض القائمة يحمل المحتوى نفسه.') + '</p></section>';
}
/* Shorten a label to fit the space its footprint reserves; the full text stays in the
   <title> (and in the side panel), so nothing is lost by shortening. */
function shorten(text, max){
  var v = String(text == null ? '' : text);
  return v.length > max ? v.slice(0, max - 1).trimEnd() + '…' : v;
}

function escSafe(v){
  return safe(function(){ return esc(String(v)); }, String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
}

/* ------------------------------------------------------------------ list view ---------- */
function renderList(){
  var host = qs('#g-list');
  if (!host || !G) return;
  var list = G.nodes.filter(isVisible);
  if (!list.length){
    host.innerHTML = '<p class="empty-inline">' + gt('No node matches this filter.','لا توجد عقدة مطابقة لهذا التصفية.') + '</p>' +
      '<div class="row spaced"><button class="btn" type="button" data-g="filter" data-value="all">' + gt('Show everything','عرض الكل') + '</button></div>';
    return;
  }
  var order = { person: 0, task: 1, thread: 2 };
  list.sort(function(a, b){
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    return String(a.label).localeCompare(String(b.label));
  });
  host.innerHTML = list.map(function(n){
    var sub = n.kind === 'person' ? n.sub : (n.kind === 'task' ? stageText(n.stage) + ' · ' + nameOf(n.owner) : (n.model || ''));
    return '<button class="g-row" type="button" data-g="select" data-id="' + n.id + '" aria-current="' + (n.id === selectedId) + '">' +
      '<span class="g-swatch" data-swatch="' + (n.kind === 'person' ? 'thread' : n.kind === 'task' ? 'task-' + n.stage : 'thread') + '" aria-hidden="true"></span>' +
      '<span><span class="g-row-name">' + escSafe(n.label) + '</span><br><span class="g-row-sub">' + escSafe(sub || '') + '</span></span>' +
      '<span class="small dim">' + escSafe(n.kind === 'person' ? statusText(n.status) : n.kind === 'task' ? statusText(n.priority) : gt('Thread','محادثة')) + '</span>' +
      '</button>';
  }).join('');
}

/* ------------------------------------------------------------------ controls ----------- */
function segGroup(label, name, options, current){
  return '<div class="segmented" role="group" aria-label="' + escSafe(label) + '">' + options.map(function(o){
    return '<button type="button" data-g="' + name + '" data-value="' + o[0] + '" aria-pressed="' + (current === o[0]) + '">' + escSafe(o[1]) + '</button>';
  }).join('') + '</div>';
}
function updateControls(){
  qsa('[data-g]').forEach(function(b){
    var group = b.dataset.g;
    if (group === 'mode' || group === 'layout') b.setAttribute('aria-pressed', String(CTRL[group] === b.dataset.value));
    if (group === 'filter') b.setAttribute('aria-pressed', String(CTRL.filter === b.dataset.value));
    if (group === 'list') b.setAttribute('aria-pressed', String(CTRL.list === (b.dataset.value === 'true')));
  });
  var stage = qs('#g-stage'), list = qs('#g-list');
  if (stage) stage.hidden = CTRL.list;
  if (list) list.hidden = !CTRL.list;
  var fz = qs('[data-g="freeze"]');
  if (fz){
    fz.textContent = CTRL.frozen ? gt('Resume layout','تشغيل التخطيط') : gt('Freeze layout','تثبيت التخطيط');
    fz.setAttribute('aria-pressed', String(CTRL.frozen));
  }
}
function wireControls(){
  var root = qs('#g-root');
  if (!root || root.dataset.wired === '1') return;
  root.dataset.wired = '1';
  root.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('[data-g]') : null;
    if (!b) return;
    var action = b.dataset.g, value = b.dataset.value;
    /* Switching scope or layout rearranges the whole picture, so the old framing no longer means
       anything: re-frame once the new layout settles (the user can still zoom and pan afterwards). */
    if (action === 'mode'){ CTRL.mode = value; NEEDS_FIT = true; alpha = Math.max(alpha, 0.5); if (!CTRL.frozen) startLoop(); }
    else if (action === 'layout'){ CTRL.layout = value; NEEDS_FIT = true; alpha = Math.max(alpha, 0.85); if (!CTRL.frozen) startLoop(); }
    else if (action === 'filter'){ CTRL.filter = value; }
    else if (action === 'list'){ CTRL.list = value === 'true'; }
    else if (action === 'freeze'){ setFrozen(); }
    else if (action === 'fit'){ USER_ADJUSTED = true; fitView(); }
    else if (action === 'reset'){ resetLayout(); }
    else if (action === 'zoom-in'){ zoomBy(1.15); }
    else if (action === 'zoom-out'){ zoomBy(1/1.15); }
    else if (action === 'select'){ select(value); if (CTRL.list) renderList(); return; }
    else if (action === 'open'){ openSelected(); return; }
    paint(); updateControls(); renderList(); saveState();
  });
}

/* ------------------------------------------------------------------ the page ----------- */
function graphShell(){
  var legend = [
    ['thread', gt('Person','شخص')],
    ['task-backlog', gt('Backlog','قائمة الانتظار')],
    ['task-progress', gt('In progress','قيد التنفيذ')],
    ['task-review', gt('In review','قيد المراجعة')],
    ['task-done', gt('Done','مكتملة')],
    ['thread', gt('Conversation','محادثة')],
    ['reports', gt('Reports to','رفع التقارير')],
    ['owns', gt('Works on','يعمل على')]
  ];
  return '<div class="g-wrap" id="g-root">' +
    '<div class="stack">' +
      '<div class="toolbar">' +
        segGroup(gt('What to show','ما يُعرض'), 'mode', [
          ['company', gt('Company','الشركة')], ['work', gt('Work','العمل')], ['all', gt('Everything','الكل')]
        ], CTRL.mode) +
        segGroup(gt('Layout','التخطيط'), 'layout', [['force', gt('Force','قوى')], ['rings', gt('Rings','حلقات')]], CTRL.layout) +
        '<span class="grow"></span>' +
        segGroup(gt('View','العرض'), 'list', [['false', gt('Graph','رسم')], ['true', gt('List','قائمة')]], String(CTRL.list)) +
      '</div>' +
      '<div class="toolbar">' +
        segGroup(gt('Filter','التصفية'), 'filter', [
          ['all', gt('All','الكل')], ['person', gt('People','الأشخاص')], ['task', gt('Tasks','المهام')],
          ['thread', gt('Conversations','المحادثات')], ['attention', gt('Needs attention','يحتاج انتباهاً')]
        ], CTRL.filter) +
        '<span class="grow"></span>' +
        '<button class="btn small" type="button" data-g="freeze" aria-pressed="false">' + gt('Freeze layout','تثبيت التخطيط') + '</button>' +
        '<button class="btn small" type="button" data-g="fit">' + gt('Fit','احتواء') + '</button>' +
        '<button class="btn small" type="button" data-g="reset">' + gt('Reset layout','إعادة الترتيب') + '</button>' +
        '<span class="segmented"><button type="button" data-g="zoom-out" aria-label="' + gt('Zoom out','تصغير') + '">−</button>' +
        '<button type="button" data-g="zoom-in" aria-label="' + gt('Zoom in','تكبير') + '">+</button></span>' +
      '</div>' +
      '<section class="g-stage" id="g-stage">' +
        '<svg class="g-canvas" id="g-canvas" tabindex="0" role="group" aria-labelledby="g-canvas-label"></svg>' +
        '<span class="sr-only" id="g-canvas-label">' + gt('Company network. Use arrow keys to move between nodes, Enter to open, F to fit, R to reset.','شبكة الشركة. استخدم مفاتيح الأسهم للتنقل بين العقد، وEnter للفتح، وF للاحتواء، وR لإعادة الترتيب.') + '</span>' +
        '<div class="g-legend">' + legend.map(function(l){
          return '<span><i class="g-swatch" data-swatch="' + l[0] + '"></i>' + escSafe(l[1]) + '</span>';
        }).join('') + '</div>' +
      '</section>' +
      '<div class="g-list" id="g-list" hidden></div>' +
      '<p class="g-hint" id="g-live" role="status"></p>' +
    '</div>' +
    '<aside class="g-side" id="g-side">' + sideHTML(null) + '</aside>' +
  '</div>';
}

function graphView(){
  var base = safe(function(){
    return head(gt('See the whole company at once.','شاهد الشركة كاملة في لمحة.'),
                gt('People, work and conversations in one view.','الأشخاص والعمل والمحادثات في عرض واحد.'));
  }, '');
  if (typeof ui !== 'undefined' && ui.state !== 'default'){
    return base + safe(function(){ return stateBlock(ui.state); }, '');
  }
  var hasData = safe(function(){ return !!(data && data.agents && data.agents.length); }, false);
  if (!hasData){
    return base + safe(function(){ return stateBlock('empty'); }, '');
  }
  if (IS_BROWSER) queueInit();
  return base + graphShell();
}

function queueInit(){
  var tries = 0;
  (function attempt(){
    var svg = qs('#g-canvas');
    if (!svg){ if (tries++ < 8) requestAnimationFrame(attempt); return; }
    init();
  })();
}
function init(){
  var src = safe(function(){ return data; }, null);
  if (!src) return;
  if (G && qs('#g-canvas') && qs('#g-canvas').childNodes.length) { updateControls(); return; }
  readTokens();
  G = buildGraph(src);
  var saved = loadState();
  var restored = applyState(saved);
  NEEDS_FIT = !VIEW_RESTORED;   /* nothing of the user's own to restore -> show the whole graph */
  wireControls();
  buildScene();
  attachInteraction();
  renderSide();
  renderList();
  updateControls();
  paint();
  /* Frame 1: show the whole graph from the very first paint, not just once it settles — otherwise
     the user watches a clipped graph for the length of the settle. The fit is repeated when the
     simulation stops (startLoop), so the final framing is the settled one. */
  if (NEEDS_FIT) fitView();
  if (!restored || alpha === 0){ /* settle the layout, then stop: data is never animated forever */
    wake(restored ? 0.5 : 1);
  }
}

/* ------------------------------------------------------------------ enhancements -------- */
/* The product renders these directly (see _research/18-changes-implemented.md);
   here they are applied over the demo's markup so the demo itself stays untouched. */
function runRuns(task){
  var n = hash(task.id) % 5;
  return n;
}
function enhance(){
  if (!IS_BROWSER) return;
  addTopbarNew();
  addTaskFacts();
  addInboxReason();
  normalizeAvatars();
}
/* Review item E4 — one logical grid for the avatar art.
   The demo holds 49 portraits on a 48×48 grid and 16 on a 32×32 grid; at the same display size
   the second set looks chunkier. Map the 32-grid art onto the 48-grid with a 1.5× scale so every
   portrait shares one grid. (The proper fix is a re-cut of those 16 at 48×48 — designer task.) */
function normalizeAvatars(){
  qsa('.avatar svg').forEach(function(svg){
    if (svg.dataset.gNorm === '1') return;
    var vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (vb.length !== 4 || !isFinite(vb[2])) return;
    if (vb[2] >= 52 - 4) { svg.dataset.gNorm = '1'; return; }        /* already on the 48 grid */
    var path = svg.firstElementChild;
    if (!path) return;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'scale(1.5)');
    svg.replaceChild(g, path);
    g.appendChild(path);
    svg.setAttribute('viewBox', '-2 -2 52 52');
    svg.dataset.gNorm = '1';
  });
}
function addTopbarNew(){
  var host = qs('.top-actions');
  if (!host || qs('#g-new')) return;
  var btn = document.createElement('button');
  btn.className = 'btn small';
  btn.id = 'g-new';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.textContent = gt('+ New','+ جديد');
  btn.addEventListener('click', function(){
    safe(function(){
      openDialog(gt('Create','إنشاء'),
        '<div class="stack"><p class="small muted">' + gt('What would you like to create?','ما الذي تريد إنشاءه؟') + '</p>' +
        '<div class="row wrap">' +
        '<button class="btn primary" type="button" id="g-new-task">' + gt('New task','مهمة جديدة') + '</button>' +
        '<button class="btn" type="button" id="g-new-person">' + gt('New employee','موظف جديد') + '</button>' +
        '<button class="btn" type="button" id="g-new-thread">' + gt('New conversation','محادثة جديدة') + '</button>' +
        '</div></div>', '', 'New');
      var a = qs('#g-new-task'), b = qs('#g-new-person'), c = qs('#g-new-thread');
      if (a) a.addEventListener('click', function(){ closeDialog(); taskForm('you'); });
      if (b) b.addEventListener('click', function(){ closeDialog(); employeeForm(); });
      if (c) c.addEventListener('click', function(){ closeDialog(); threadForm(); });
    });
  });
  host.insertBefore(btn, host.firstChild);
}
function addTaskFacts(){
  qsa('#main .task, main .task').forEach(function(card){
    if (card.dataset.gFacts === '1') return;
    var id = card.dataset.id;
    var task = safe(function(){ return data.tasks.filter(function(x){ return x.id === id; })[0]; }, null);
    if (!task) return;
    card.dataset.gFacts = '1';
    var owner = agentById(task.owner);
    var facts = [];
    var model = task.owner === 'you' ? '' : modelFor(task.owner);
    if (model) facts.push({ child: '<span class="badge">' + escSafe(model) + '</span>',
                            title: gt('Model that works on this task','النموذج الذي يعمل على هذه المهمة') });
    if (task.stage === 'review') facts.push({ child: '<span class="badge approval">' + gt('Needs approval','يحتاج موافقة') + '</span>',
                            title: gt('Waiting for your decision','بانتظار قرارك') });
    if (owner && owner.status === 'error') facts.push({ child: '<span class="badge error">' + gt('Blocked','متوقفة') + '</span>',
                            title: (owner.focus ? lang(owner.focus) : gt('Owner needs attention','المسؤول يحتاج انتباهاً')) });
    var runs = runRuns(task);
    facts.push({ child: '<span class="task-id">' + safe(function(){ return num(runs); }, runs) + ' ' + gt('runs','محاولات') + '</span>',
                 title: gt('Sample run count','عدد محاولات تجريبي') });
    var row = document.createElement('span');
    row.className = 'row wrap g-facts';
    row.setAttribute('data-g-enh', '1');
    row.innerHTML = facts.map(function(f){ return '<span title="' + f.title + '">' + f.child + '</span>'; }).join('');
    card.appendChild(row);
  });
}
function addInboxReason(){
  var cards = qsa('.decision-card');
  cards.forEach(function(card){
    if (card.dataset.gReason === '1') return;
    var trigger = qs('[data-action=decision]', card) || qs('[data-id]', card);
    if (!trigger) return;
    var id = trigger.dataset.id;
    var d = safe(function(){ return data.decisions.filter(function(x){ return x.id === id; })[0]; }, null);
    if (!d) return;
    card.dataset.gReason = '1';
    var rule = d.cost > 0 ? gt('Budget change','تغيير في الميزانية')
             : /access|read|صلاحية/i.test(lang(d.title)) ? gt('Access request','طلب صلاحية')
             : gt('Change request','طلب تغيير');
    var block = document.createElement('div');
    block.className = 'g-reason small';
    block.setAttribute('data-g-enh', '1');
    block.innerHTML = '<div><span class="dim">' + gt('Reason: ','السبب: ') + '</span>' + escSafe(rule) +
      ' · <span class="dim">' + gt('Risk: ','المخاطر: ') + '</span>' + escSafe(statusText(d.risk)) + '</div>' +
      '<div class="spaced"><span class="dim">' + gt('What changes: ','ما سيتغير: ') + '</span>' + escSafe(lang(d.ask) || '') + '</div>';
    card.appendChild(block);
  });
  if (!cards.length) return;
  var summary = qs('.queue-summary');
  if (!summary || qs('#g-bulk')) return;
  var low = safe(function(){ return data.decisions.filter(function(d){ return d.risk === 'low'; }); }, []);
  if (!low.length) return;
  var btn = document.createElement('button');
  btn.className = 'btn small';
  btn.type = 'button';
  btn.id = 'g-bulk';
  btn.textContent = gt('Approve all low-risk','موافقة على كل منخفض المخاطر') + ' (' + low.length + ')';
  btn.addEventListener('click', function(){
    low.forEach(function(d){ safe(function(){ decide(d.id, 'approve'); }); });
  });
  summary.appendChild(btn);
}
var enhanceTimer = 0;
function scheduleEnhance(){
  if (!IS_BROWSER) return;
  clearTimeout(enhanceTimer);
  enhanceTimer = setTimeout(function(){ safe(enhance); }, 60);
}

/* ------------------------------------------------------------------ boot --------------- */
if (IS_BROWSER){
  /* prefers-reduced-motion is a preference about *comfort*, not a nicety: when it is set, every
     control still works and nothing glides — the camera arrives immediately. A pinch or a drag
     stays 1:1 either way, because that one is the hand, not an animation. */
  MOTION.reduced = safe(function(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, false);
  safe(function(){
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', function(e){ MOTION.reduced = !!e.matches; });
  });
  W.graphView = graphView;
  document.addEventListener('visibilitychange', function(){
    if (document.hidden){ if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else if (G && !CTRL.frozen && alpha > 0.004) startLoop();
  });
  window.addEventListener('resize', function(){
    if (!qs('#g-canvas')) return;
    if (!USER_ADJUSTED && !VIEW_RESTORED && !CTRL.list) fitView(); else paint();
  });
  var obs = new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i++){
      var t = muts[i].target;
      if (t && t.dataset && t.dataset.gEnh) continue;      /* our own edits */
      scheduleEnhance();
      return;
    }
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', function(){ obs.observe(document.body, { childList: true, subtree: true }); });
  document.addEventListener('DOMContentLoaded', scheduleEnhance);
  setTimeout(scheduleEnhance, 0);
} else {
  /* no DOM (headless tests): the view function is still real — queueInit() is browser-guarded,
     so it returns markup without touching the document. */
  W.graphView = graphView;
}

/* test surface (used by the headless verification, not by the UI) */
W.__graph = { build: buildGraph, step: layoutStep, pack: pack, footprint: footprint,
  camera: { clampView: clampView, viewEquals: viewEquals, easeView: easeView, easeViewOver: easeViewOver,
            zoomedAt: zoomedAt, wheelStep: wheelStep, fitted: fitted },
              labelReserve: labelReserve, deptGroups: departmentGroups, hash: hash,
              hullBoxes: hullBoxes, boxesFor: boxForList, clearLabelBands: clearLabelBands,
              band: function(){ return T.hullLabelBand; }, version: 2 };

})();
