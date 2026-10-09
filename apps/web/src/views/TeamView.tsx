/**
 * Team — a living roster, not a name list (owner 2026-10-09: "this page needs to be useful").
 *
 * Every card is read from the save the visitor owns: the person, their portrait, their status,
 * who they report to, and the work they actually carry right now. The four statistics above are
 * counted from the same rows, the way the demo counts its board. A card opens the person's
 * profile — their open work with its stages — in a window.
 */
import { useState } from 'react';
import { useStore, type AgentRow } from '../data/store';
import { PORTRAITS } from '../lib/avatars.data';
import { PROVIDERS, testConnection, type ModelConnection, type TestResult } from '../lib/providers';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { localized, STATUS_KEY } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Badge, toneOf } from '../components/Badge';
import { Dialog } from '../components/Dialog';
import { STAGE_LABELS } from '@company/contracts';

const statusTone = (status: string) =>
  status === 'working' ? 'accent' : status === 'idle' ? 'neutral' : status === 'error' ? 'danger' : 'warning';

export function TeamView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const agents = useStore((s) => s.agents);
  const tasks = useStore((s) => s.tasks);
  const [openId, setOpenId] = useState<string | null>(null);
  /** 'add' opens a blank editor; an agent id opens it pre-filled (owner C23 / REQ-17). */
  const [editing, setEditing] = useState<'add' | string | null>(null);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const name = (agent: AgentRow) => localized(agent.name, agent.nameAr, lang);
  const managerOf = (agent: AgentRow) => agents.find((a) => a.id === agent.managerId) ?? null;
  const openTasksOf = (agent: AgentRow) => tasks.filter((task) => task.ownerAgentId === agent.id && task.stage !== 'done');

  const working = agents.filter((a) => a.status === 'working').length;
  /** REQ-40: the strip counts real states. 'Blocked' means blocked loops; a pause is its own
      state and wears its own badge on the card — nothing is editorialised into 'attention'. */
  const attention = agents.filter((a) => a.status === 'error').length;
  const open = tasks.filter((task) => task.stage !== 'done').length;
  const openForced = !forcedState || forcedState === 'default';

  const profile = openId ? agents.find((a) => a.id === openId) ?? null : null;

  return (
    <>
      <ScreenHead
        eyebrow={`${t('team', lang)} / ${t('overview', lang)}`}
        title={t('headTeam', lang)}
        subtitle={t('teamNote', lang)}
      />
      <div className="pagebody">
        <DataState state={state} lang={lang} onRetry={() => location.reload()}>
          {openForced ? (
            <div className="stats" role="presentation">
              <div className="stat"><span className="stat-label">{t('teamPeople', lang)}</span><span className="stat-value">{agents.length}</span></div>
              <div className="stat"><span className="stat-label">{t('teamWorking', lang)}</span><span className="stat-value">{working}</span></div>
              <div className="stat"><span className="stat-label">{t('teamAttention', lang)}</span><span className="stat-value">{attention}</span></div>
              <div className="stat"><span className="stat-label">{t('teamOpen', lang)}</span><span className="stat-value">{open}</span></div>
            </div>
          ) : null}
          <div className="team-actions">
            <button type="button" className="btn primary" data-team="add" onClick={() => setEditing('add')}>
              <Icon name="plus" />{t('teamAdd', lang)}
            </button>
          </div>
          <div className="roster team-roster">
            {agents.map((agent) => {
              const theirs = openTasksOf(agent);
              const manager = managerOf(agent);
              return (
                <button type="button" className="employee team-card" key={agent.id} onClick={() => setOpenId(agent.id)}
                  aria-label={`${name(agent)} · ${t('teamSee', lang)}`}>
                  <header className="team-card-head">
                    <Avatar index={agent.avatar} />
                    <span className="grow">
                      <h3 className="employee-name">{name(agent)}</h3>
                      <span className="role">{localized(agent.role, agent.roleAr, lang)}{agent.department ? ` · ${agent.department}` : ''}</span>
                    </span>
                    <Badge tone={statusTone(agent.status)}>{t(STATUS_KEY[agent.status] ?? 'statusIdle', lang)}</Badge>
                  </header>
                  <p className="role team-manager">
                    {t('teamReports', lang)}: {manager ? name(manager) : t('teamNoManager', lang)}
                  </p>
                  <div className="team-tasks">
                    <p className="sectionhead-mini">{t('teamNow', lang)} · {theirs.length}</p>
                    {theirs.length === 0 ? <p className="small dim">{t('teamNoTasks', lang)}</p> : (
                      <ul className="team-task-list">
                        {theirs.slice(0, 3).map((task) => (
                          <li key={task.id}>
                            <span className="task-id">{task.shortRef}</span>
                            <span className="grow">{localized(task.title, task.titleAr, lang)}</span>
                            <Badge tone={toneOf(task.stage)}>{STAGE_LABELS[task.stage][lang]}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {agent.capabilities.length > 0 ? (
                    <p className="group">
                      {agent.capabilities.map((c) => <span className="tag" key={c}>{c}</span>)}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </DataState>
      </div>

      <Dialog
        open={profile !== null}
        onClose={() => setOpenId(null)}
        title={profile ? name(profile) : ''}
        eyebrow={t('team', lang)}
        lang={lang}
        actions={profile ? (
          <button type="button" className="btn" data-team="edit"
            onClick={() => { const id = profile.id; setOpenId(null); setEditing(id); }}>
            <Icon name="settings" />{t('teamEditBtn', lang)}
          </button>
        ) : null}
      >
        {profile ? (
          <div className="team-profile">
            <header className="team-card-head">
              <Avatar index={profile.avatar} size="lg" />
              <span className="grow">
                <span className="role">{localized(profile.role, profile.roleAr, lang)}</span>
                <span className="small dim" style={{ display: 'block' }}>
                  {t('teamReports', lang)}: {managerOf(profile) ? name(managerOf(profile)!) : t('teamNoManager', lang)}
                </span>
              </span>
              <Badge tone={statusTone(profile.status)}>{t(STATUS_KEY[profile.status] ?? 'statusIdle', lang)}</Badge>
            </header>
            {profile.focus ? <p className="small muted">{localized(profile.focus, profile.focusAr, lang)}</p> : null}
            <p className="sectionhead-mini">{t('teamNow', lang)} · {openTasksOf(profile).length}</p>
            {openTasksOf(profile).length === 0 ? <p className="small dim">{t('teamNoTasks', lang)}</p> : (
              <ul className="team-task-list">
                {openTasksOf(profile).map((task) => (
                  <li key={task.id}>
                    <span className="task-id">{task.shortRef}</span>
                    <span className="grow">{localized(task.title, task.titleAr, lang)}</span>
                    <Badge tone={toneOf(task.stage)}>{STAGE_LABELS[task.stage][lang]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {profile.capabilities.length > 0 ? (
              <p className="group">{profile.capabilities.map((c) => <span className="tag" key={c}>{c}</span>)}</p>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <AgentEditor
        lang={lang}
        open={editing !== null}
        agent={editing !== null && editing !== 'add' ? agents.find((a) => a.id === editing) ?? null : null}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

/**
 * The teammate editor (owner C23 / REQ-17): everything about a person is something the owner
 * types — the name, the role, the details — plus a pixel portrait picked from the sprite set
 * and a place in the hierarchy. The same window adds a new teammate and edits an existing one;
 * both write straight into the save, so the roster, the org chart and the network see it at once.
 */
function AgentEditor({ lang, open, agent, onClose }: {
  lang: Lang;
  open: boolean;
  /** null = adding someone new. */
  agent: AgentRow | null;
  onClose: () => void;
}) {
  const agents = useStore((s) => s.agents);
  const patchAgent = useStore((s) => s.patchAgent);
  const addAgent = useStore((s) => s.addAgent);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [role, setRole] = useState('');
  const [roleAr, setRoleAr] = useState('');
  const [focus, setFocus] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The person's own model connection (REQ-18) — provider, model, key; tested for real (REQ-19). */
  const [conn, setConn] = useState<ModelConnection>({ provider: 'openai', model: '', key: '', baseUrl: null });
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<TestResult | null>(null);
  /** Bumped every time the window opens so the form starts from the row it edits. */
  const [seed, setSeed] = useState(0);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(agent?.name ?? ''); setNameAr(agent?.nameAr ?? '');
      setRole(agent?.role ?? ''); setRoleAr(agent?.roleAr ?? '');
      setFocus(agent?.focus ?? ''); setAvatar(agent?.avatar ?? 0);
      setManagerId(agent?.managerId ?? ''); setError(null);
      setConn(agent?.model ?? { provider: 'openai', model: '', key: '', baseUrl: null });
      setTestRes(null); setTesting(false);
      setSeed(seed + 1);
    }
  }

  const save = () => {
    if (name.trim() === '') { setError(t('teamErrName', lang)); return; }
    if (role.trim() === '') { setError(t('teamErrRole', lang)); return; }
    const fields = {
      name: name.trim(), nameAr: nameAr.trim() === '' ? null : nameAr.trim(),
      role: role.trim(), roleAr: roleAr.trim() === '' ? null : roleAr.trim(),
      focus: focus.trim() === '' ? null : focus.trim(), focusAr: null,
      avatar, managerId: managerId === '' ? null : managerId,
    };
    const model = conn.model.trim() === '' && conn.key.trim() === '' ? null : {
      ...conn, model: conn.model.trim(), key: conn.key.trim(),
      baseUrl: conn.provider === 'custom' ? conn.baseUrl?.trim() || null : null,
    };
    if (agent) patchAgent(agent.id, { ...fields, model }); else addAgent({ ...fields, model });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={open ? (agent ? t('teamEditTitle', lang) : t('teamAddTitle', lang)) : ''}
      eyebrow={open ? t('team', lang) : ''}
      lang={lang}
      actions={open ? (
        <>
          <button type="button" className="btn" onClick={onClose}>{t('cancel', lang)}</button>
          <button type="button" className="btn primary" data-team="save" onClick={save}>{t('saveChanges', lang)}</button>
        </>
      ) : null}
    >
      {/* While closed the window stays in the tree (so closing is animated by the native dialog)
          but holds no content — its manager list must not leak names into the page for tests
          or assistive tech to find behind a closed window. */}
      {open ? <div className="team-form" key={seed}>
        <label className="field">{t('teamNameLabel', lang)}
          <input value={name} data-team="name" onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">{t('teamNameArLabel', lang)}
          <input value={nameAr} dir="rtl" onChange={(e) => setNameAr(e.target.value)} />
        </label>
        <label className="field">{t('teamRoleLabel', lang)}
          <input value={role} data-team="role" onChange={(e) => setRole(e.target.value)} />
        </label>
        <label className="field">{t('teamRoleArLabel', lang)}
          <input value={roleAr} dir="rtl" onChange={(e) => setRoleAr(e.target.value)} />
        </label>
        <label className="field">{t('teamDetailsLabel', lang)}
          <textarea value={focus} rows={2} onChange={(e) => setFocus(e.target.value)} />
        </label>
        <div className="field">
          <span>{t('teamPortraitLabel', lang)}</span>
          <div className="portrait-grid" role="group" aria-label={t('teamPortraitLabel', lang)}>
            {PORTRAITS.map((_, i) => (
              <button type="button" key={i} data-portrait={i} aria-pressed={i === avatar}
                aria-label={`${t('teamPortraitLabel', lang)} ${i + 1}`}
                onClick={() => setAvatar(i)}>
                <Avatar index={i} size="sm" />
              </button>
            ))}
          </div>
        </div>
        <label className="field">{t('teamManagerLabel', lang)}
          <select value={managerId} data-team="manager" onChange={(e) => setManagerId(e.target.value)}>
            <option value="">{t('teamManagerYou', lang)}</option>
            {agents.filter((a) => a.id !== agent?.id).map((a) => (
              <option key={a.id} value={a.id}>{localized(a.name, a.nameAr, lang)}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{t('modelTitle', lang)}</span>
          <div className="answer-row">
            <label className="field">
              <span className="sr-only">{t('providerLabel', lang)}</span>
              <select value={conn.provider} data-team="provider"
                onChange={(e) => setConn({ ...conn, provider: e.target.value as ModelConnection['provider'] })}>
                {PROVIDERS.map((pr) => <option key={pr.id} value={pr.id}>{pr.label}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span className="sr-only">{t('modelIdLabel', lang)}</span>
              <input value={conn.model} placeholder={t('modelIdLabel', lang)} data-team="model-id"
                onChange={(e) => setConn({ ...conn, model: e.target.value })} />
            </label>
          </div>
          <div className="answer-row">
            <label className="field grow">
              <span className="sr-only">{t('keyLabel', lang)}</span>
              <input type="password" value={conn.key} placeholder={t('keyLabel', lang)} data-team="model-key"
                autoComplete="off" onChange={(e) => setConn({ ...conn, key: e.target.value })} />
            </label>
            {conn.provider === 'custom' ? (
              <label className="field grow">
                <span className="sr-only">{t('baseUrlLabel', lang)}</span>
                <input value={conn.baseUrl ?? ''} placeholder={t('baseUrlLabel', lang)} data-team="model-base"
                  onChange={(e) => setConn({ ...conn, baseUrl: e.target.value })} />
              </label>
            ) : null}
          </div>
          <div className="menu-row">
            <button type="button" className="btn small" data-team="test-conn" disabled={testing || conn.key.trim() === ''}
              onClick={() => {
                setTesting(true); setTestRes(null);
                testConnection(conn).then((result) => { setTestRes(result); setTesting(false); });
              }}>
              {testing ? t('testWorking', lang) : t('testConn', lang)}
            </button>
            {testRes ? (
              <span className={`small${testRes.ok ? '' : ' field-error'}`} data-team="test-result" role="status">
                {testRes.ok ? t('testOkMsg', lang) : testRes.message}
              </span>
            ) : null}
          </div>
          <span className="small dim">{t('modelNote', lang)}</span>
        </div>
        {error ? <p className="field-error" data-team="error" role="alert">{error}</p> : null}
      </div> : null}
    </Dialog>
  );
}
