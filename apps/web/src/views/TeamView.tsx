/** Team — the demo's roster: people, their roles, their budgets and the model behind them. */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';
import { BudgetMeter } from '../components/BudgetMeter';
import { localized } from '../lib/format';

export function TeamView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [agents, setAgents] = useState<Awaited<ReturnType<typeof api.agents>>['agents'] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    api.agents().then((r) => setAgents(r.agents)).catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : agents ? 'default' : 'loading';

  return (
    <Panel title={t('team', lang)} note={t('teamNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        <div className="roster">
          {agents?.map((agent) => (
            <article className="employee" key={agent.id}>
              <header className="group" style={{ justifyContent: 'space-between' }}>
                <h3 className="employee-name">{localized(agent.name, agent.nameAr, lang)}</h3>
                <span className={`status-dot ${agent.status === 'working' ? '' : agent.status}`}
                      title={agent.status} />
              </header>
              <p className="role">{localized(agent.role, agent.roleAr, lang)}</p>
              {agent.department ? <p className="role">{agent.department}</p> : null}
              <BudgetMeter label={`${agent.name}-budget`} spentCents={agent.budget.spentCents}
                           limitCents={agent.budget.limitCents} lang={lang} />
              {agent.capabilities.length > 0 && (
                <p className="group">
                  {agent.capabilities.map((c) => <span className="tag" key={c}>{c}</span>)}
                </p>
              )}
            </article>
          ))}
        </div>
      </DataState>
    </Panel>
  );
}
