/**
 * Settings — the company and the model registry. The prices shown are the ones the ledger
 * actually bills with, so the number here and the number on an agent's meter can never differ.
 */
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';

export function SettingsView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [models, setModels] = useState<Awaited<ReturnType<typeof api.models>>['models'] | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    Promise.all([api.models(), api.company()])
      .then(([m, c]) => {
        setModels(m.models);
        setCompany(c.company.name);
      })
      .catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : models ? 'default' : 'loading';

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return (
    <Panel title={t('settings', lang)} note={t('settingsNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        <p><strong>{t('company', lang)}:</strong> {company}</p>
        <h3>{t('models', lang)}</h3>
        <table className="models" style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start' }}>{t('models', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('lane', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('inLabel', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('outLabel', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {models?.map((model) => (
              <tr key={model.id}>
                <td>{model.displayName}</td>
                <td><span className="tag">{model.lane}</span></td>
                <td>{`${money(model.inputCentsPerMTok)} ${t('perMillion', lang)}`}</td>
                <td>{`${money(model.outputCentsPerMTok)} ${t('perMillion', lang)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataState>
    </Panel>
  );
}
