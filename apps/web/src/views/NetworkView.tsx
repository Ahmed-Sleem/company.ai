/**
 * Network — the Obsidian-style graph (owner 2026-10-09, refined the same evening):
 *
 *  · a controls window chooses WHICH graph to look at — everything, just the people and how
 *    they report, the people and their tasks, or the people and their conversations;
 *  · clicking a node opens its details with real controls: a person's status can be changed,
 *    a task can be moved along its stages (the shared transition table decides what is legal)
 *    and re-prioritised, a conversation opens in the messenger;
 *  · the graph is alive: the simulation never fully freezes, it settles into a slow drift the
 *    way Obsidian's does — unless the visitor asked for reduced motion, and then it holds still.
 *
 * The list beside the toggle stays the accessible equivalent of the canvas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { Badge, toneOf } from '../components/Badge';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { localized, STATUS_KEY } from '../lib/format';
import { buildGraph, layoutStep, fitView, G, type Graph, type GraphNode } from '../lib/graph';
import { TASK_TRANSITIONS, STAGE_LABELS, TASK_PRIORITIES, PRIORITY_LABELS, type TaskStage } from '@company/contracts';

interface View { x: number; y: number; k: number }

const EASE = 0.18; // the same gentle approach the world's camera uses — zoom stays smooth
const LIVE_ALPHA = 0.012; // the floor the simulation cools to: a slow Obsidian-like drift

type GraphMode = 'all' | 'people' | 'tasks' | 'threads';

export function NetworkView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const agents = useStore((s) => s.agents);
  const tasks = useStore((s) => s.tasks);
  const threads = useStore((s) => s.threads);
  const operator = useStore((s) => s.operator);
  const patchTask = useStore((s) => s.patchTask);
  const patchAgent = useStore((s) => s.patchAgent);

  const local = useMemo(() => (en: string, ar: string | null) => localized(en, ar, lang), [lang]);

  const [mode, setMode] = useState<GraphMode>('all');

  /** The chosen graph, derived from the one true build by keeping the nodes it needs. */
  const graph: Graph = useMemo(() => {
    const full = buildGraph(operator.name, agents, tasks, threads, local);
    if (mode === 'all') return full;
    const keepKind = mode === 'people' ? ['person'] : mode === 'tasks' ? ['person', 'task'] : ['person', 'thread'];
    const nodes = full.nodes.filter((n) => keepKind.includes(n.kind));
    const ids = new Set(nodes.map((n) => n.id));
    const keepEdge = mode === 'people' ? ['reports'] : mode === 'tasks' ? ['reports', 'owns'] : ['reports', 'member'];
    const edges = full.edges.filter((e) => keepEdge.includes(e.kind) && ids.has(e.s) && ids.has(e.t));
    const byId: Record<string, GraphNode> = {};
    for (const n of nodes) byId[n.id] = n;
    return { nodes, edges, byId };
  }, [operator.name, agents, tasks, threads, local, mode]);

  const [, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [listing, setListing] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const target = useRef<View>({ x: 0, y: 0, k: 1 });
  const alpha = useRef<number>(G.alpha);
  const running = useRef(false);
  const dragNode = useRef<string | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);
  /** The drift pauses while the pointer is over the canvas — you cannot click a moving target,
      and neither Obsidian nor a person wants to. */
  const pointerIn = useRef(false);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const kick = () => {
    if (running.current) return;
    running.current = true;
    const loop = () => {
      const mv = pointerIn.current ? 0 : layoutStep(graph, alpha.current);
      // Cool toward the live floor instead of to zero: the picture keeps breathing.
      alpha.current = Math.max(alpha.current * G.decay, reduced ? 0 : LIVE_ALPHA);
      const v = view.current;
      const tg = target.current;
      v.x += (tg.x - v.x) * EASE;
      v.y += (tg.y - v.y) * EASE;
      v.k += (tg.k - v.k) * EASE;
      setTick((n) => n + 1);
      const viewMoving = Math.abs(tg.x - v.x) > 0.4 || Math.abs(tg.y - v.y) > 0.4 || Math.abs(tg.k - v.k) > 0.002;
      const alive = !reduced && (alpha.current > 0 || pointerIn.current);
      if (mv > 0.05 || viewMoving || alive) {
        requestAnimationFrame(loop);
      } else {
        running.current = false;
      }
    };
    requestAnimationFrame(loop);
  };

  const size = () => {
    const el = stageRef.current;
    return { w: el?.clientWidth ?? 800, h: el?.clientHeight ?? 640 };
  };

  const fit = () => {
    const { w, h } = size();
    target.current = fitView(graph, w, h);
    kick();
  };

  // A new graph (first paint, or the visitor chose another one): simulate, then frame it.
  useEffect(() => {
    alpha.current = G.alpha;
    setSelected(null);
    kick();
    const once = window.setTimeout(fit, 900);
    return () => window.clearTimeout(once);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const { w, h } = size();
    const mx = cx ?? w / 2;
    const my = cy ?? h / 2;
    const tg = target.current;
    const k = Math.min(G.zoomMax, Math.max(G.zoomMin, tg.k * factor));
    target.current = { k, x: mx - ((mx - tg.x) * k) / tg.k, y: my - ((my - tg.y) * k) / tg.k };
    kick();
  };

  const neighbours = useMemo(() => {
    const set = new Set<string>();
    if (!hover) return set;
    set.add(hover);
    for (const e of graph.edges) {
      if (e.s === hover) set.add(e.t);
      if (e.t === hover) set.add(e.s);
    }
    return set;
  }, [hover, graph]);

  const toGraph = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (clientX - rect.left - v.x) / v.k, y: (clientY - rect.top - v.y) / v.k };
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    panning.current = { x: event.clientX, y: event.clientY };
  };

  const onNodePointerDown = (id: string) => (event: React.PointerEvent) => {
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragNode.current = id;
    graph.byId[id]!.fixed = true;
    alpha.current = Math.max(alpha.current, 0.25); // a grabbed node wakes the graph up
    setSelected(id);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragNode.current) {
      const n = graph.byId[dragNode.current]!;
      const p = toGraph(event.clientX, event.clientY);
      n.x = p.x;
      n.y = p.y;
      n.vx = 0;
      n.vy = 0;
      kick();
      return;
    }
    if (panning.current) {
      const dx = event.clientX - panning.current.x;
      const dy = event.clientY - panning.current.y;
      panning.current = { x: event.clientX, y: event.clientY };
      target.current = { ...target.current, x: target.current.x + dx, y: target.current.y + dy };
      view.current = { ...view.current, x: view.current.x + dx, y: view.current.y + dy };
      kick();
    }
  };

  const onPointerUp = () => {
    if (dragNode.current) {
      graph.byId[dragNode.current]!.fixed = false;
      dragNode.current = null;
    }
    panning.current = null;
  };

  const onWheel = (event: React.WheelEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const step = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0015));
    zoomAt(event.ctrlKey ? 1 + (step - 1) * 2 : step, event.clientX - rect.left, event.clientY - rect.top);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const stepPx = 40;
    if (event.key === 'Escape') setSelected(null);
    else if (event.key === 'ArrowLeft') target.current.x += stepPx;
    else if (event.key === 'ArrowRight') target.current.x -= stepPx;
    else if (event.key === 'ArrowUp') target.current.y += stepPx;
    else if (event.key === 'ArrowDown') target.current.y -= stepPx;
    else if (event.key === '+' || event.key === '=') zoomAt(1.4);
    else if (event.key === '-' || event.key === '_') zoomAt(1 / 1.4);
    else if (event.key === '0') fit();
    else return;
    event.preventDefault();
    kick();
  };

  const selectedNode = selected ? graph.byId[selected] ?? null : null;
  const v = view.current;

  const MODES: { id: GraphMode; key: 'graphAll' | 'graphPeople' | 'graphTasks' | 'graphThreads' }[] = [
    { id: 'all', key: 'graphAll' },
    { id: 'people', key: 'graphPeople' },
    { id: 'tasks', key: 'graphTasks' },
    { id: 'threads', key: 'graphThreads' },
  ];

  return (
    <>
      <ScreenHead
        eyebrow={`${t('network', lang)} / ${t('overview', lang)}`}
        title={t('headNetwork', lang)}
        subtitle={t('networkNote', lang)}
      />
      <div className="pagebody">
        <DataState state={state} lang={lang} onRetry={() => location.reload()}>
          {listing ? (
            <div className="graph-list">
              <div className="graph-controls" role="toolbar" aria-label={t('network', lang)}>
                <button type="button" className="btn small ghost" onClick={() => setListing(false)}>
                  <Icon name="network" />{t('graphVisual', lang)}
                </button>
              </div>
              {(['person', 'task', 'thread'] as const).map((kind) => (
                <section key={kind}>
                  <h3 className="sectionhead-mini">{kind === 'person' ? t('teamPeople', lang) : kind === 'task' ? t('teamOpen', lang) : t('comms', lang)}</h3>
                  <ul>
                    {graph.nodes.filter((n) => n.kind === kind).map((n) => (
                      <li key={n.id}>
                        <button type="button" className="textbtn" onClick={() => { setSelected(n.id); setListing(false); }}>
                          {n.label}
                        </button>
                        <span className="small dim">{n.sub}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="graph-stage" ref={stageRef} data-hover={hover ? 'true' : undefined}>
              <svg
                role="img"
                aria-label={t('headNetwork', lang)}
                tabIndex={0}
                onMouseEnter={() => { pointerIn.current = true; }}
                onMouseLeave={() => { pointerIn.current = false; kick(); }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
                onKeyDown={onKeyDown}
              >
                <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`}>
                  {graph.edges.map((e, i) => {
                    const a = graph.byId[e.s];
                    const b = graph.byId[e.t];
                    if (!a || !b) return null;
                    const hi = hover !== null && (e.s === hover || e.t === hover);
                    return (
                      <line key={i} className={`gedge ${e.kind}${hi ? ' hi' : ''}`}
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                    );
                  })}
                  {graph.nodes.map((n) => {
                    const hi = hover === null || neighbours.has(n.id);
                    return (
                      <g key={n.id}
                        className={`gnode ${n.kind}${n.refId === 'you' ? ' you' : ''}${hi ? ' hi' : ''}${selected === n.id ? ' sel' : ''}`}
                        transform={`translate(${n.x} ${n.y})`}
                        onPointerDown={onNodePointerDown(n.id)}
                        onMouseEnter={() => setHover(n.id)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => setSelected(n.id)}
                      >
                        <circle r={n.radius} />
                        <text y={n.radius + G.labelGap}>{n.label}</text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* the controls window: which graph to look at, and the camera */}
              <div className="graph-window panel" role="group" aria-label={t('graphWindowTitle', lang)}>
                <p className="menu-label">{t('graphWindowTitle', lang)}</p>
                <div className="menu-rows">
                  {MODES.map((m) => (
                    <button type="button" key={m.id} className="btn small" data-graph-mode={m.id}
                      aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                      {t(m.key, lang)}
                    </button>
                  ))}
                </div>
                <div className="menu-row">
                  <button type="button" className="btn small" onClick={fit}>{t('graphFit', lang)}</button>
                  <button type="button" className="btn small icon-btn" aria-label={t('zoomOut', lang)} onClick={() => zoomAt(1 / 1.4)}>−</button>
                  <button type="button" className="btn small icon-btn" aria-label={t('zoomIn', lang)} onClick={() => zoomAt(1.4)}>+</button>
                  <button type="button" className="btn small ghost" onClick={() => setListing(true)}>
                    <Icon name="list" />{t('graphList', lang)}
                  </button>
                </div>
              </div>

              {selectedNode ? (
                <NodeWindow node={selectedNode} graph={graph} lang={lang} onClose={() => setSelected(null)}
                  patchTask={patchTask} patchAgent={patchAgent} agents={agents} tasks={tasks} />
              ) : null}

              <p className="graph-legend" aria-hidden="true">
                <span><i className="legend-line reports" />{t('graphReports', lang)}</span>
                <span><i className="legend-line owns" />{t('graphOwns', lang)}</span>
                <span><i className="legend-line member" />{t('graphMember', lang)}</span>
              </p>
            </div>
          )}
        </DataState>
      </div>
    </>
  );
}

/**
 * The details window for the clicked node — with the controls that belong to it. A person's
 * status is changed here; a task moves along the shared transition table (the same one the
 * board obeys, so the graph can never make an illegal move); a conversation opens in comms.
 */
function NodeWindow({ node, graph, lang, onClose, patchTask, patchAgent, agents, tasks }: {
  node: GraphNode;
  graph: Graph;
  lang: Lang;
  onClose: () => void;
  patchTask: ReturnType<typeof useStore.getState>['patchTask'];
  patchAgent: ReturnType<typeof useStore.getState>['patchAgent'];
  agents: ReturnType<typeof useStore.getState>['agents'];
  tasks: ReturnType<typeof useStore.getState>['tasks'];
}) {
  if (node.kind === 'person' && node.refId !== 'you') {
    const agent = agents.find((a) => a.id === node.refId);
    if (!agent) return null;
    const openTasks = tasks.filter((task) => task.ownerAgentId === agent.id && task.stage !== 'done');
    return (
      <aside className="node-window panel" aria-label={node.label}>
        <header className="node-head">
          <Avatar index={agent.avatar} size="sm" />
          <span className="grow">
            <strong>{node.label}</strong>
            <span className="small dim" style={{ display: 'block' }}>{node.sub}</span>
          </span>
          <button type="button" className="btn small icon-btn" aria-label={t('close', lang)} onClick={onClose}><Icon name="close" /></button>
        </header>
        <label className="field">
          {t('status', lang)}
          <select value={agent.status} onChange={(event) => patchAgent(agent.id, { status: event.target.value })}>
            {['working', 'idle', 'error', 'paused'].map((s) => (
              <option key={s} value={s}>{t(STATUS_KEY[s] ?? 'statusIdle', lang)}</option>
            ))}
          </select>
        </label>
        <p className="sectionhead-mini">{`${t('teamNow', lang)} · ${openTasks.length}`}</p>
        {openTasks.length === 0 ? <p className="small dim">{t('teamNoTasks', lang)}</p> : (
          <ul className="node-tasks">
            {openTasks.slice(0, 4).map((task) => (
              <li key={task.id}>
                <span className="task-id">{task.shortRef}</span>
                <span className="grow">{localized(task.title, task.titleAr, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    );
  }

  if (node.kind === 'task') {
    const task = tasks.find((x) => x.id === node.refId);
    if (!task) return null;
    const next = TASK_TRANSITIONS[task.stage as TaskStage] ?? [];
    return (
      <aside className="node-window panel" aria-label={node.label}>
        <header className="node-head">
          <span className="grow">
            <strong>{node.label}</strong>
            <span className="small dim" style={{ display: 'block' }}>{task.shortRef}</span>
          </span>
          <button type="button" className="btn small icon-btn" aria-label={t('close', lang)} onClick={onClose}><Icon name="close" /></button>
        </header>
        <p className="node-row"><Badge tone={toneOf(task.stage)}>{STAGE_LABELS[task.stage][lang]}</Badge></p>
        {next.length > 0 ? (
          <div className="menu-row">
            {next.map((stage) => (
              <button type="button" key={stage} className="btn small" onClick={() => patchTask(task.id, { stage })}>
                {STAGE_LABELS[stage][lang]}
              </button>
            ))}
          </div>
        ) : null}
        <label className="field">
          {t('priority', lang)}
          <select value={task.priority} onChange={(event) => patchTask(task.id, { priority: event.target.value as typeof task.priority })}>
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p][lang]}</option>)}
          </select>
        </label>
      </aside>
    );
  }

  if (node.kind === 'thread') {
    const degree = graph.edges.filter((e) => e.s === node.id || e.t === node.id).length;
    return (
      <aside className="node-window panel" aria-label={node.label}>
        <header className="node-head">
          <span className="grow">
            <strong>{node.label}</strong>
            <span className="small dim" style={{ display: 'block' }}>{node.sub}</span>
          </span>
          <button type="button" className="btn small icon-btn" aria-label={t('close', lang)} onClick={onClose}><Icon name="close" /></button>
        </header>
        <p className="small dim">{`${degree} ${t('graphLinks', lang)}`}</p>
        <button type="button" className="btn primary small" onClick={() => { location.hash = 'comms'; }}>
          <Icon name="chat" />{t('graphOpenChat', lang)}
        </button>
      </aside>
    );
  }

  // the operator's own node
  return (
    <aside className="node-window panel" aria-label={node.label}>
      <header className="node-head">
        <span className="grow"><strong>{node.label}</strong></span>
        <button type="button" className="btn small icon-btn" aria-label={t('close', lang)} onClick={onClose}><Icon name="close" /></button>
      </header>
      <p className="small dim">{t('graphYouNote', lang)}</p>
    </aside>
  );
}
