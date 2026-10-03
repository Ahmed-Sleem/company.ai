/**
 * Inbox — the decision queue. A decision shows its rule, its change and its audit trail,
 * because the product's promise is that approvals are never a bare yes/no.
 * Approving is idempotent: the API refuses a second decision, and the UI shows it as decided.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';

type Decision = Awaited<ReturnType<typeof api.decisions>>['decisions'][number];

export function InboxView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    api.decisions('pending').then((r) => setDecisions(r.decisions)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    load();
  }, [forcedState, load]);

  const decide = async (id: string, verdict: 'approve' | 'reject') => {
    setBusy(id);
    try {
      const result = await api.decide(id, verdict);
      setNote(result.applied?.outcome ?? (verdict === 'approve' ? t('approve', lang) : t('reject', lang)));
      load();
    } catch (error) {
      const apiError = (error as { apiError?: { code: string } }).apiError;
      setNote(apiError?.code === 'already_decided' ? t('decided', lang) : t('errorBody', lang));
      load();
    } finally {
      setBusy(null);
    }
  };

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : decisions ? 'default' : 'loading';

  return (
    <Panel title={t('inbox', lang)} note={t('inboxNote', lang)}>
      {note && <p role="status" className="tag">{note}</p>}
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        {decisions && decisions.length === 0 && <DataState state="empty" lang={lang} />}
        {decisions?.map((decision) => (
          <article className="decision" key={decision.id} style={{ marginBlockEnd: 'var(--s4)' }}>
            <div>
              <h3>{decision.title}</h3>
              <p>{decision.diff.summary}</p>
              <dl>
                <dt>{t('rule', lang)}</dt>
                <dd>{`${decision.rule.id} · ${decision.rule.observed} / ${decision.rule.threshold} ${decision.rule.unit}`}</dd>
                <dt>{t('change', lang)}</dt>
                <dd>{`${decision.diff.before ?? '—'} → ${decision.diff.after ?? '—'}`}</dd>
                <dt>{t('audit', lang)}</dt>
                <dd>{new Date(decision.audit.raisedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</dd>
              </dl>
            </div>
            <div className="meta">
              <span className="tag">{decision.kind}</span>
              <span>{decision.status}</span>
            </div>
            <div className="actions">
              <button className="btn primary" type="button" disabled={busy === decision.id}
                      onClick={() => decide(decision.id, 'approve')}>
                {t('approve', lang)}
              </button>
              <button className="btn" type="button" disabled={busy === decision.id}
                      onClick={() => decide(decision.id, 'reject')}>
                {t('reject', lang)}
              </button>
            </div>
          </article>
        ))}
      </DataState>
    </Panel>
  );
}
