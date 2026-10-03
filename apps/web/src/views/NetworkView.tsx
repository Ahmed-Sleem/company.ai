/**
 * Network — the P0 first look at the company graph, drawn from real agents and edges.
 * The layout here is a simple tidy tree; the guaranteed-spacing engine (the thing that makes
 * this view ours) replaces this layout function in P3 without touching the data or the shell.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';
import { OrgTree } from '../components/OrgTree';

export function NetworkView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
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
    <Panel title={t('network', lang)} note={t('networkNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        {agents && <OrgTree agents={agents} lang={lang} />}
      </DataState>
    </Panel>
  );
}
