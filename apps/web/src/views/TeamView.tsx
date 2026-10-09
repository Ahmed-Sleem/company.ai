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
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { localized, STATUS_KEY } from '../lib/format';
import { Avatar } from '../components/Avatar';
import { Badge, toneOf } from '../components/Badge';
import { Dialog } from '../components/Dialog';
import { STAGE_LABELS } from '@company/contracts';

const statusTone = (status: string) =>
  status === 'working' ? 'accent' : status === 'idle' ? 'neutral' : status === 'error' ? 'danger' : 'warning';

export function TeamView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const agents = useStore((s) => s.agents);
  const tasks = useStore((s) => s.tasks);
  const [openId, setOpenId] = useState<string | null>(null);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const name = (agent: AgentRow) => localized(agent.name, agent.nameAr, lang);
  const managerOf = (agent: AgentRow) => agents.find((a) => a.id === agent.managerId) ?? null;
  const openTasksOf = (agent: AgentRow) => tasks.filter((task) => task.ownerAgentId === agent.id && task.stage !== 'done');

  const working = agents.filter((a) => a.status === 'working').length;
  const attention = agents.filter((a) => a.status === 'error' || a.status === 'paused').length;
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
    </>
  );
}
