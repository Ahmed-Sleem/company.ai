/**
 * Conversations — the thread list with the model that wrote each message.
 * P0 shows the list and the last message; streaming replies arrive with the messaging phase.
 */
import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';

interface ThreadSummary {
  id: string;
  title: string;
  internal: boolean;
  lastMessage: { text: string; authorKind: string } | null;
}

export function CommsView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    fetch('/api/threads')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((body: { threads: ThreadSummary[] }) => setThreads(body.threads))
      .catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : threads ? 'default' : 'loading';

  return (
    <Panel title={t('comms', lang)} note={t('commsNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        {threads && threads.length === 0 && <DataState state="empty" lang={lang} />}
        {threads?.map((thread) => (
          <article className="card" key={thread.id} style={{ marginBlockEnd: 'var(--s3)' }}>
            <h3>{thread.title}</h3>
            {thread.lastMessage && <p className="role">{thread.lastMessage.text}</p>}
            <div className="meta">
              <span className="tag">{thread.internal ? 'internal' : 'shared'}</span>
              <span>{thread.lastMessage?.authorKind ?? '—'}</span>
            </div>
          </article>
        ))}
      </DataState>
    </Panel>
  );
}
