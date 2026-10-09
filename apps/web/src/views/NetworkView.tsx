/**
 * Network — the Obsidian-style graph the owner asked for (2026-10-09), ported from the
 * prototype's graph.js: people pull against their tasks and conversations until the picture
 * settles, then it sits still. Drag the canvas to pan, the wheel to zoom around the pointer,
 * drag a node to move it, hover to see what it touches.
 *
 * The list beside the toggle is the accessible equivalent of the canvas — every node by name,
 * grouped by kind — because a picture alone must never be the only way to read the company.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { Icon } from '../components/Icon';
import { localized } from '../lib/format';
import { buildGraph, layoutStep, fitView, G, type Graph } from '../lib/graph';

interface View { x: number; y: number; k: number }

const EASE = 0.18; // the same gentle approach the world's camera uses — zoom stays smooth

export function NetworkView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const agents = useStore((s) => s.agents);
  const tasks = useStore((s) => s.tasks);
  const threads = useStore((s) => s.threads);
  const operator = useStore((s) => s.operator);

  const local = useMemo(
    () => (en: string, ar: string | null) => localized(en, ar, lang),
    [lang],
  );

  const graph: Graph = useMemo(
    () => buildGraph(operator.name, agents, tasks, threads, local),
    [operator.name, agents, tasks, threads, local],
  );

  const [, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'graph' | 'list'>('graph');

  const stageRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const target = useRef<View>({ x: 0, y: 0, k: 1 });
  const alpha = useRef(G.alpha);
  const running = useRef(false);
  const fitted = useRef(false);
  const dragNode = useRef<string | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const kick = () => {
    if (running.current) return;
    running.current = true;
    const loop = () => {
      const mv = layoutStep(graph, alpha.current);
      alpha.current *= G.decay;
      const v = view.current;
      const tg = target.current;
      v.x += (tg.x - v.x) * EASE;
      v.y += (tg.y - v.y) * EASE;
      v.k += (tg.k - v.k) * EASE;
      setTick((n) => n + 1);
      const viewMoving = Math.abs(tg.x - v.x) > 0.4 || Math.abs(tg.y - v.y) > 0.4 || Math.abs(tg.k - v.k) > 0.002;
      if (mv > 0.05 || viewMoving) {
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

  // First frame: start the simulation and frame the graph once it has a shape.
  useEffect(() => {
    kick();
    const once = window.setTimeout(() => {
      fit();
      fitted.current = true;
    }, 900);
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
    if (event.key === 'ArrowLeft') target.current.x += stepPx;
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

  return (
    <>
      <ScreenHead
        eyebrow={`${t('network', lang)} / ${t('overview', lang)}`}
        title={t('headNetwork', lang)}
        subtitle={t('networkNote', lang)}
      />
      <div className="pagebody">
        <DataState state={state} lang={lang} onRetry={() => location.reload()}>
          <div className="graph-controls" role="toolbar" aria-label={t('network', lang)}>
            <button type="button" className="btn small ghost" aria-pressed={mode === 'graph'}
              onClick={() => setMode('graph')}><Icon name="network" />{t('graphVisual', lang)}</button>
            <button type="button" className="btn small ghost" aria-pressed={mode === 'list'}
              onClick={() => setMode('list')}><Icon name="list" />{t('graphList', lang)}</button>
            <span className="grow" />
            <button type="button" className="btn small ghost" onClick={fit}>{t('graphFit', lang)}</button>
            <button type="button" className="btn small icon-btn" aria-label={t('zoomOut', lang)} onClick={() => zoomAt(1 / 1.4)}>−</button>
            <button type="button" className="btn small icon-btn" aria-label={t('zoomIn', lang)} onClick={() => zoomAt(1.4)}>+</button>
          </div>

          {mode === 'graph' ? (
            <div className="graph-stage" ref={stageRef} data-hover={hover ? 'true' : undefined}>
              <svg
                role="img"
                aria-label={t('headNetwork', lang)}
                tabIndex={0}
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
              <p className="graph-legend" aria-hidden="true">
                <span><i className="legend-line reports" />{t('graphReports', lang)}</span>
                <span><i className="legend-line owns" />{t('graphOwns', lang)}</span>
                <span><i className="legend-line member" />{t('graphMember', lang)}</span>
              </p>
            </div>
          ) : (
            <div className="graph-list">
              {(['person', 'task', 'thread'] as const).map((kind) => (
                <section key={kind}>
                  <h3 className="sectionhead-mini">{kind === 'person' ? t('teamPeople', lang) : kind === 'task' ? t('teamOpen', lang) : t('comms', lang)}</h3>
                  <ul>
                    {graph.nodes.filter((n) => n.kind === kind).map((n) => (
                      <li key={n.id}>
                        <button type="button" className="textbtn" onClick={() => { setSelected(n.id); setMode('graph'); }}>
                          {n.label}
                        </button>
                        <span className="small dim">{n.sub}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {selectedNode ? (
            <p className="graph-info small" role="status">
              <strong>{selectedNode.label}</strong> · {selectedNode.sub}
            </p>
          ) : null}
        </DataState>
      </div>
    </>
  );
}
