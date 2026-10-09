/**
 * Conversations — a normal messenger (owner 2026-10-09: "like ChatGPT: the whole team as
 * contacts in the side, choose one, text him").
 *
 * The rail is every teammate; choosing one opens the one-to-one thread with them — created on
 * first use, like any messenger. Messages are written straight into the save, so a conversation
 * survives a reload and travels with the export. The bubbles, the AI badge and the composer
 * follow the prototype's chat, which the owner picked as the look.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { localized, STATUS_KEY } from '../lib/format';

const statusTone = (status: string) =>
  status === 'working' ? 'accent' : status === 'idle' ? 'neutral' : status === 'error' ? 'danger' : 'warning';

export function CommsView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const agents = useStore((s) => s.agents);
  const threads = useStore((s) => s.threads);
  const operator = useStore((s) => s.operator);
  const addMessage = useStore((s) => s.addMessage);
  const startThread = useStore((s) => s.startThread);

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const current = selected ?? threads[0]?.agentId ?? agents[0]?.id ?? null;
  const agent = agents.find((a) => a.id === current) ?? null;
  const thread = threads.find((th) => th.agentId === current) ?? null;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [thread?.messages.length]);

  const start = () => {
    if (!agent || thread) return;
    startThread(agent.id, localized(agent.name, agent.nameAr, lang));
  };

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !thread) return;
    addMessage(thread.id, 'you', text);
    setDraft('');
  };

  return (
    <>
      <ScreenHead
        eyebrow={`${t('comms', lang)} / ${t('overview', lang)}`}
        title={t('headComms', lang)}
        subtitle={t('commsNote', lang)}
      />
      <div className="pagebody">
        <DataState state={state} lang={lang} onRetry={() => location.reload()}>
          <div className="chat-layout">
            <aside className="threads" aria-label={t('chatTeammates', lang)}>
              <p className="eyebrow">{t('chatTeammates', lang)}</p>
              {agents.map((a) => {
                const th = threads.find((x) => x.agentId === a.id);
                const active = a.id === current;
                return (
                  <button type="button" key={a.id} className={`thread${active ? ' active' : ''}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setSelected(a.id)}>
                    <Avatar index={a.avatar} size="sm" />
                    <span className="thread-text">
                      <span className="thread-name">{localized(a.name, a.nameAr, lang)}</span>
                      <span className="thread-preview">{th?.lastMessage?.text ?? localized(a.role, a.roleAr, lang)}</span>
                    </span>
                    <span className={`status-dot ${a.status}`} title={a.status} />
                  </button>
                );
              })}
            </aside>

            <section className="chat" aria-label={agent ? localized(agent.name, agent.nameAr, lang) : t('comms', lang)}>
              {agent ? (
                <>
                  <header className="chat-head">
                    <Avatar index={agent.avatar} />
                    <span className="grow">
                      <strong className="thread-name">{localized(agent.name, agent.nameAr, lang)}</strong>
                      <span className="small dim" style={{ display: 'block' }}>
                        {localized(agent.role, agent.roleAr, lang)} · {t(STATUS_KEY[agent.status] ?? 'statusIdle', lang)}
                      </span>
                    </span>
                    <Badge tone={statusTone(agent.status)}>{t(STATUS_KEY[agent.status] ?? 'statusIdle', lang)}</Badge>
                  </header>

                  <div className="chat-log" ref={logRef} role="log" aria-live="polite">
                    {thread && thread.messages.map((m) => {
                      const own = m.from === 'you';
                      return (
                        <article className={`message${own ? ' own' : ''}`} key={m.id}>
                          {own
                            ? <span className="initial">{operator.name.charAt(0).toUpperCase()}</span>
                            : <Avatar index={agent.avatar} size="sm" />}
                          <div className="message-body">
                            <div className="message-meta">
                              <strong>{own ? operator.name : localized(agent.name, agent.nameAr, lang)}</strong>
                              <time>{new Date(m.at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
                              {!own ? <span className="badge">AI</span> : null}
                            </div>
                            <div className="message-text">{m.text}</div>
                          </div>
                        </article>
                      );
                    })}
                    {thread && thread.messages.length === 0 ? <p className="small dim">{t('chatNone', lang)}</p> : null}
                    {!thread ? (
                      <div className="chat-start">
                        <p className="small dim">{t('chatNoThread', lang)}</p>
                        <button type="button" className="btn primary" onClick={start}>
                          <Icon name="chat" />{t('chatStart', lang)}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {thread ? (
                    <form className="composer" onSubmit={send}>
                      <label className="sr-only" htmlFor="composer-input">{t('chatPlaceholder', lang)}</label>
                      <textarea id="composer-input" rows={1} value={draft}
                        placeholder={t('chatPlaceholder', lang)}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send(e);
                          }
                        }} />
                      <button type="submit" className="btn primary" disabled={draft.trim() === ''}>
                        <Icon name="send" />{t('chatSend', lang)}
                      </button>
                    </form>
                  ) : null}
                </>
              ) : (
                <DataState state="empty" lang={lang} />
              )}
            </section>
          </div>
        </DataState>
      </div>
    </>
  );
}
