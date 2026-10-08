/**
 * Conversations — the thread list with the model that wrote each message.
 * P0 shows the list and the last message; streaming replies arrive with the messaging phase.
 */
import { useEffect, useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { api } from '../lib/api';
import { ScreenHead } from '../components/ScreenHead';
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
    api.threads()
      .then((body) => setThreads(body.threads as ThreadSummary[]))
      .catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : threads ? 'default' : 'loading';

  return (
    <>
    <ScreenHead
      eyebrow={`${t('comms', lang)} / ${t('overview', lang)}`}
      title={t('headComms', lang)}
      subtitle={t('commsNote', lang)}
    />
    <div className="pagebody">
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
    </div>
    </>
  );
}
