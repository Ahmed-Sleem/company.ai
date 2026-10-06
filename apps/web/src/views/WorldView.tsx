/**
 * World Map — the studio floor, and the build mode that edits it.
 *
 * The owner drew this plan in their demo and asked for it here, ported rather than rebuilt: the
 * rooms, the desk positions, the furniture, the zoom ladder and the desk-click drawer are theirs,
 * read straight out of `layout.data.ts` (generated, drift-checked against their file). What is ours:
 *
 *   · the camera is pure maths (`world/camera.ts`) — the wheel moves a *target* and a frame loop
 *     eases the view toward it, anchored on the pointer, which is the smoother zoom they asked for;
 *   · the numbers are real — staff, working, active tasks and spend come from the same rows every
 *     other screen reads;
 *   · the drawing is tokens — rooms, desks and props are coloured from our variables, so the plan
 *     re-tints with the five palettes and reads in both themes and both languages;
 *   · build mode is a first slice: move a prop or a desk, snap to the owner's 16-unit grid, undo,
 *     reset, and the layout is remembered. The sprite pack has no licence yet, so the art is ours.
 *
 * RTL: the plan does **not** mirror. A floor is the same floor whichever way you read, so the canvas
 * keeps its coordinates and only the chrome around it follows the document.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type TaskRow } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { localized } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';
import { PropArt } from '../world/art';
import { defaultPlan, sprite, type Desk, type Plan, type Room } from '../world/layout.data';
import { WORLD, roomAt, shapeFor, snap } from '../world/plan';
import {
  LADDER, cameraTransform, centreOn, clampCamera, ease, fitCamera, nextRung, panBy, toPlan,
  wheelFactor, zoomAbout, zoomBy, zoomByCentre, type Camera,
} from '../world/camera';

type AgentRow = Awaited<ReturnType<typeof api.agents>>['agents'][number];

export interface Seat {
  desk: Desk;
  agent: AgentRow | null;
  tasks: TaskRow[];
  working: boolean;
}

/**
 * Seat people at desks — in three passes over the whole floor rather than one pass per desk.
 *
 *   1. everyone to a desk of **their own department**;
 *   2. whoever is left to a desk whose **room theme** matches what they do;
 *   3. whoever is still left to **any** free desk.
 *
 * The order is the point. A single pass that falls back early seats an engineer at the first free
 * desk — the executive wing — while their own lab stands empty; the browser showed exactly that
 * before this was rewritten.
 */
export function seatAgents(plan: Plan, agents: AgentRow[], tasks: TaskRow[]): Seat[] {
  const byDesk = new Map<string, AgentRow | null>(plan.desks.map((desk) => [desk.id, null]));
  const free = [...agents];
  const take = (desk: Desk, match: (agent: AgentRow, desk: Desk) => boolean) => {
    if (byDesk.get(desk.id)) return;
    const found = free.find((agent) => match(agent, desk));
    if (!found) return;
    byDesk.set(desk.id, found);
    free.splice(free.indexOf(found), 1);
  };
  const themed = (agent: AgentRow, desk: Desk) => {
    const dept = (agent.department ?? '').toLowerCase();
    const room = desk.dept.toLowerCase();
    if (dept.includes('lead') || dept.includes('exec')) return room === 'executive';
    if (dept.includes('engineer') || dept.includes('model')) return room === 'engineering';
    if (dept.includes('design') || dept.includes('product')) return room === 'design';
    if (dept.includes('operat') || dept.includes('growth')) return room === 'operations';
    return false;
  };

  for (const desk of plan.desks) take(desk, (agent, at) => (agent.department ?? '') === at.dept);
  for (const desk of plan.desks) take(desk, themed);
  for (const desk of plan.desks) take(desk, () => true);

  return plan.desks.map((desk) => {
    const agent = byDesk.get(desk.id) ?? null;
    const mine = agent ? tasks.filter((task) => task.ownerAgentId === agent.id) : [];
    return { desk, agent, tasks: mine, working: mine.some((task) => task.stage === 'progress') };
  });
}

const money = (cents: number) => (cents / 100).toFixed(2);

export function WorldView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [error, setError] = useState(false);
  const [plan, setPlan] = useState<Plan>(defaultPlan);
  const [selected, setSelected] = useState<{ kind: 'agent' | 'prop' | 'desk'; id: string } | null>(null);
  const [camera, setCamera] = useState<Camera>({ scale: 1, x: 0, y: 0 });
  const [room, setRoom] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [history, setHistory] = useState<Plan[]>([]);

  const viewport = useRef<HTMLDivElement | null>(null);
  const target = useRef<Camera>({ scale: 1, x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  const panning = useRef<{ x: number; y: number; camera: Camera } | null>(null);
  const dragging = useRef<{ kind: 'prop' | 'desk'; id: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    Promise.all([api.agents(), api.tasks()])
      .then(([a, task]) => {
        setAgents(a.agents);
        setTasks(task.tasks);
      })
      .catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : agents && tasks ? 'default' : 'loading';

  const seats = useMemo(
    () => (agents && tasks ? seatAgents(plan, agents, tasks) : []),
    [plan, agents, tasks],
  );

  /**
   * Fit the whole plan the moment the plan exists, and keep it fitted while the viewport resizes.
   *
   * Keyed on the data state, not on `[]`: while the data loads this view renders a skeleton, so the
   * viewport is not in the DOM yet, `viewport.current` is null, and a mount-only effect quietly did
   * nothing — the floor then came up at 100%, cropped, until the owner pressed "Whole plan". The
   * screenshot showed it; now the fit waits for the thing it is fitting.
   */
  useEffect(() => {
    if (state !== 'default') return;
    const node = viewport.current;
    if (!node) return;
    const fit = () => {
      const box = node.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
      const fitted = fitCamera(box.width, box.height);
      target.current = fitted;
      setCamera(fitted);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [state]);

  /** The single frame loop: walk the camera to its target, then stop. */
  const run = useCallback(() => {
    if (frame.current !== null) return;
    const step = () => {
      setCamera((now) => {
        const next = ease(now, target.current);
        if (next === target.current) {
          frame.current = null;
          return next;
        }
        frame.current = requestAnimationFrame(step);
        return next;
      });
    };
    frame.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const boxOf = () => viewport.current?.getBoundingClientRect() ?? { width: 960, height: 640, left: 0, top: 0 };
  const aim = useCallback((next: Camera) => {
    const box = boxOf();
    target.current = clampCamera(next, box.width, box.height);
    run();
  }, [run]);

  const onWheel = (event: React.WheelEvent) => {
    const box = boxOf();
    const factor = wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey);
    aim(zoomBy(target.current, factor, event.clientX - box.left, event.clientY - box.top));
  };

  /**
   * Moving a prop or a desk while building; panning the plan the rest of the time.
   *
   * A gesture that starts **on a desk or a prop** belongs to that element, and the viewport must not
   * capture it: the browser retargets every later event of a captured pointer to the capturer, so a
   * capture here swallowed the desk's `click` and the drawer never opened (observed in the browser,
   * then in the smoke test: pointerdown on the desk, pointerup on the viewport).
   */
  const onPointerDown = (event: React.PointerEvent, grabbed?: { kind: 'prop' | 'desk'; id: string }) => {
    const startedOnFurniture = (event.target as Element).closest?.('.desk, .prop');
    if (startedOnFurniture && !grabbed) return;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    const box = boxOf();
    const plan_ = toPlan(target.current, event.clientX - box.left, event.clientY - box.top);
    if (grabbed && building) {
      const item = grabbed.kind === 'prop'
        ? plan.props.find((p) => p.id === grabbed.id)
        : plan.desks.find((d) => d.id === grabbed.id);
      if (!item) return;
      setHistory((past) => [...past.slice(-19), plan]);
      dragging.current = { ...grabbed, dx: plan_.x - item.x, dy: plan_.y - item.y };
      return;
    }
    panning.current = { x: event.clientX, y: event.clientY, camera: target.current };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const box = boxOf();
    const drag = dragging.current;
    if (drag) {
      const at = toPlan(target.current, event.clientX - box.left, event.clientY - box.top);
      const x = snap(at.x - drag.dx);
      const y = snap(at.y - drag.dy);
      setPlan((current) => ({
        rooms: current.rooms,
        props: current.props.map((prop) => (drag.kind === 'prop' && prop.id === drag.id ? { ...prop, x, y } : prop)),
        desks: current.desks.map((desk) => (drag.kind === 'desk' && desk.id === drag.id ? { ...desk, x, y } : desk)),
      }));
      return;
    }
    const pan = panning.current;
    if (!pan) return;
    aim(panBy(pan.camera, event.clientX - pan.x, event.clientY - pan.y));
  };

  const onPointerUp = () => {
    panning.current = null;
    dragging.current = null;
  };

  const jumpTo = (next: Room | null) => {
    setRoom(next?.id ?? null);
    const box = boxOf();
    if (!next) {
      target.current = fitCamera(box.width, box.height);
    } else {
      const scale = Math.min(2, Math.max(1, Math.min(box.width / (next.w * 1.4), box.height / (next.h * 1.4))));
      target.current = centreOn({ scale, x: 0, y: 0 }, next.x + next.w / 2, next.y + next.h / 2, box.width, box.height);
    }
    run();
  };

  const zoom = (factor: number) => {
    const box = boxOf();
    aim(zoomByCentre(target.current, factor, box.width, box.height));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = 60;
    const box = boxOf();
    const actions: Record<string, () => void> = {
      ArrowLeft: () => aim(panBy(target.current, step, 0)),
      ArrowRight: () => aim(panBy(target.current, -step, 0)),
      ArrowUp: () => aim(panBy(target.current, 0, step)),
      ArrowDown: () => aim(panBy(target.current, 0, -step)),
      '+': () => aim(zoomAbout(target.current, nextRung(target.current.scale, 1), box.width / 2, box.height / 2)),
      '=': () => aim(zoomAbout(target.current, nextRung(target.current.scale, 1), box.width / 2, box.height / 2)),
      '-': () => aim(zoomAbout(target.current, nextRung(target.current.scale, -1), box.width / 2, box.height / 2)),
      '0': () => jumpTo(null),
      Delete: () => deleteSelected(),
      Backspace: () => deleteSelected(),
      Escape: () => setSelected(null),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  /** Build mode: delete what is selected, undo the last move, or start again from the owner's plan. */
  function deleteSelected() {
    if (!building || !selected || selected.kind === 'agent') return;
    setHistory((past) => [...past.slice(-19), plan]);
    setPlan((current) => ({
      rooms: current.rooms,
      props: selected.kind === 'prop' ? current.props.filter((prop) => prop.id !== selected.id) : current.props,
      desks: selected.kind === 'desk' ? current.desks.filter((desk) => desk.id !== selected.id) : current.desks,
    }));
    setSelected(null);
  }

  const undo = () => {
    setHistory((past) => {
      if (past.length === 0) return past;
      setPlan(past[past.length - 1]!);
      return past.slice(0, -1);
    });
  };

  const reset = () => {
    setHistory((past) => [...past.slice(-19), plan]);
    setPlan(defaultPlan());
    setSelected(null);
  };

  /**
   * Is this thing what the drawer is showing?
   *
   * Written as a function on purpose: `selected?.id === seat.agent?.id` is true for every *empty*
   * desk once nothing is selected — `undefined === undefined` — which painted eight "selected" desks
   * on a floor where nothing was selected at all.
   */
  const isChosen = (id: string | null | undefined) => Boolean(selected && id && selected.id === id);
  const chosenAgent = selected?.kind === 'agent' ? seats.find((seat) => seat.agent?.id === selected.id) ?? null : null;
  const working = seats.filter((seat) => seat.working).length;
  const active = (tasks ?? []).filter((task) => task.stage === 'progress' || task.stage === 'review').length;
  const spend = (agents ?? []).reduce((sum, agent) => sum + agent.budget.spentCents, 0);

  return (
    <Panel title={t('world', lang)} note={t('worldNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        <div className="world">
          <div className="world-hud">
            <button type="button" className="btn small" data-world="fit" onClick={() => jumpTo(null)}>
              <Icon name="grid" /> {t('wholePlan', lang)}
            </button>
            {plan.rooms.map((each) => (
              <button
                key={each.id}
                type="button"
                className="btn small"
                data-room={each.id}
                aria-pressed={room === each.id}
                onClick={() => jumpTo(each)}
              >
                {t(roomKey(each.id), lang)}
              </button>
            ))}
            <span className="spacer" style={{ flex: 1 }} />
            <button
              type="button"
              className="btn small"
              data-world="build"
              aria-pressed={building}
              onClick={() => { setBuilding((on) => !on); setSelected(null); }}
            >
              {t('build', lang)}
            </button>
            {/* A minus, not the close icon: the owner's icon set has no minus, and a set that will
                soon be replaced by their sprite pack is the wrong place to add one. */}
            <button type="button" className="btn small icon-btn" data-world="zoom-out" aria-label={t('zoomOut', lang)} onClick={() => zoom(0.5)}>
              <span aria-hidden="true">−</span>
            </button>
            <span className="world-scale" data-world="scale">{`${Math.round(camera.scale * 100)}%`}</span>
            <button type="button" className="btn small icon-btn" data-world="zoom-in" aria-label={t('zoomIn', lang)} onClick={() => zoom(2)}>
              <Icon name="plus" />
            </button>
          </div>

          {building && (
            <div className="world-build" data-world="build-bar">
              <span>{t('buildHint', lang)}</span>
              <button type="button" className="btn small" data-world="undo" onClick={undo} disabled={history.length === 0}>
                {t('undo', lang)}
              </button>
              <button type="button" className="btn small" data-world="reset" onClick={reset}>
                {t('resetPlan', lang)}
              </button>
              <span className="muted" data-world="history">{`${history.length}`}</span>
            </div>
          )}

          <div
            className={`world-viewport${building ? ' world-building' : ''}`}
            ref={viewport}
            tabIndex={0}
            role="application"
            aria-label={t('worldCanvas', lang)}
            data-world="viewport"
            onWheel={onWheel}
            onPointerDown={(event) => onPointerDown(event)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <div className="world-canvas" style={{ transform: cameraTransform(camera), width: WORLD.w, height: WORLD.h }}>
              {plan.rooms.map((each) => (
                <section
                  key={each.id}
                  className={`room room-${each.theme}`}
                  data-room-box={each.id}
                  style={{ insetInlineStart: each.x, insetBlockStart: each.y, inlineSize: each.w, blockSize: each.h }}
                  aria-label={t(roomKey(each.id), lang)}
                >
                  <header className="room-head">
                    <strong>{t(roomKey(each.id), lang)}</strong>
                    {each.sub ? <small>{each.sub}</small> : null}
                  </header>
                </section>
              ))}

              {plan.props.map((prop) => (
                <span
                  key={prop.id}
                  className={`prop prop-${shapeFor(prop.type)}${selected?.kind === 'prop' && selected.id === prop.id ? ' prop-selected' : ''}`}
                  data-prop={prop.id}
                  data-prop-type={prop.type}
                  title={sprite(prop.type)?.l ?? prop.label}
                  style={{ insetInlineStart: prop.x, insetBlockStart: prop.y, inlineSize: prop.w, blockSize: prop.h }}
                  onPointerDown={(event) => building && onPointerDown(event, { kind: 'prop', id: prop.id })}
                  onClick={() => building && setSelected({ kind: 'prop', id: prop.id })}
                >
                  <PropArt prop={prop} />
                </span>
              ))}

              {seats.map((seat) => (
                <button
                  key={seat.desk.id}
                  type="button"
                  className={`desk${seat.agent ? '' : ' desk-empty'}${isChosen(seat.agent?.id) || (building && isChosen(seat.desk.id)) ? ' desk-selected' : ''}`}
                  data-desk={seat.desk.id}
                  data-agent={seat.agent?.id ?? undefined}
                  aria-pressed={seat.agent ? isChosen(seat.agent.id) : undefined}
                  style={{ insetInlineStart: seat.desk.x, insetBlockStart: seat.desk.y, inlineSize: seat.desk.w, blockSize: seat.desk.h }}
                  onPointerDown={(event) => building && onPointerDown(event, { kind: 'desk', id: seat.desk.id })}
                  onClick={() => {
                    if (building) {
                      setSelected({ kind: 'desk', id: seat.desk.id });
                      return;
                    }
                    setSelected((now) => (seat.agent ? (now?.id === seat.agent.id ? null : { kind: 'agent', id: seat.agent.id }) : null));
                  }}
                >
                  {seat.agent ? (
                    <>
                      <Avatar index={seat.agent.avatar ?? undefined} size="sm" />
                      <span className="desk-name">{localized(seat.agent.name, seat.agent.nameAr, lang)}</span>
                      <span className={`desk-status desk-status-${seat.agent.status}`} aria-hidden="true" />
                      {seat.tasks.length > 0 && (
                        <span className="desk-count" aria-label={t('taskCount', lang).replace('{n}', String(seat.tasks.length))}>
                          {seat.tasks.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="desk-name muted">{t('emptyDesk', lang)}</span>
                  )}
                </button>
              ))}

              {/* Where people are, said out loud: the plan is a picture, so a screen reader gets the
                  same facts from one sentence instead of sixteen buttons. */}
              <p className="visually-hidden" data-world="summary">
                {t('worldSummary', lang)
                  .replace('{people}', String(seats.filter((seat) => seat.agent).length))
                  .replace('{rooms}', String(plan.rooms.length))
                  .replace('{furniture}', String(plan.props.length))}
              </p>
            </div>

            {chosenAgent?.agent && (
              <aside className="world-drawer panel" data-world="drawer" aria-label={t('deskDetail', lang)}>
                <div className="drawer-head">
                  <Avatar index={chosenAgent.agent.avatar ?? undefined} />
                  <div>
                    <h3>{localized(chosenAgent.agent.name, chosenAgent.agent.nameAr, lang)}</h3>
                    <p className="muted">
                      {localized(chosenAgent.agent.role, chosenAgent.agent.roleAr, lang)}
                      {chosenAgent.agent.department ? ` · ${chosenAgent.agent.department}` : ''}
                    </p>
                  </div>
                  <button type="button" className="btn small icon-btn" data-world="close-drawer" onClick={() => setSelected(null)} aria-label={t('close', lang)}>
                    <Icon name="close" />
                  </button>
                </div>
                <dl className="drawer-facts">
                  <div><dt>{t('status', lang)}</dt><dd>{t(seatStatusKey(chosenAgent.agent.status), lang)}</dd></div>
                  <div><dt>{t('sitsIn', lang)}</dt><dd>{roomNameAt(plan, chosenAgent.desk, lang)}</dd></div>
                  <div>
                    <dt>{t('budgetSpent', lang)}</dt>
                    <dd>{`$${money(chosenAgent.agent.budget.spentCents)} / $${money(chosenAgent.agent.budget.limitCents)}`}</dd>
                  </div>
                </dl>
                <h4>{t('tasks', lang)}</h4>
                {chosenAgent.tasks.length === 0 ? (
                  <p className="muted">{t('noTasksFor', lang)}</p>
                ) : (
                  <ul className="drawer-tasks">
                    {chosenAgent.tasks.map((task) => (
                      <li key={task.id}>
                        <span className="task-id">{task.shortRef}</span>
                        <span>{localized(task.title, task.titleAr, lang)}</span>
                        <meter className="progress" value={task.progress} min={0} max={100} aria-label={`${t('progress', lang)} ${task.progress}%`} />
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            )}

            <div className="world-stats">
              <span className="stat"><span className="stat-label">{t('staff', lang)}</span><span className="stat-value">{seats.filter((seat) => seat.agent).length}</span></span>
              <span className="stat"><span className="stat-label">{t('workingNow', lang)}</span><span className="stat-value">{working}</span></span>
              <span className="stat"><span className="stat-label">{t('activeTasks', lang)}</span><span className="stat-value">{active}</span></span>
              <span className="stat"><span className="stat-label">{t('monthlySpend', lang)}</span><span className="stat-value">{`$${money(spend)}`}</span></span>
            </div>
          </div>
          <p className="world-hint muted">{t('worldHint', lang)}</p>
        </div>
      </DataState>
    </Panel>
  );
}

/** Rooms are translated by id, so the owner's wording stays the source and Arabic is ours. */
function roomKey(id: string) {
  const keys = { exec: 'roomExec', eng: 'roomEng', board: 'roomBoard', design: 'roomDesign', ops: 'roomOps', lounge: 'roomLounge' } as const;
  return keys[id as keyof typeof keys] ?? 'world';
}

const seatStatusKey = (status: string) =>
  status === 'working' ? 'statusWorking' : status === 'blocked' ? 'statusBlocked' : 'statusIdle';

function roomNameAt(plan: Plan, desk: Desk, lang: Lang) {
  const found = roomAt(plan, desk.x + desk.w / 2, desk.y + desk.h / 2);
  return found ? t(roomKey(found.id), lang) : t('world', lang);
}

export { LADDER };
