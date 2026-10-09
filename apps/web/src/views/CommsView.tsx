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
import { compileSystemPrompt } from '../lib/prompt';
import { chatCompletion } from '../lib/providers';

/** The local teammate voice: what a person says when no provider key is configured yet. */
const localVoice = (agent: { status: string; id: string }, lang: Lang) => {
  const tasks = useStore.getState().tasks.filter((task) => task.ownerAgentId === agent.id && task.stage !== 'done');
  const first = tasks[0];
  if (agent.status === 'error') return t('replyBlocked', lang);
  if (agent.status === 'paused') return t('replyPaused', lang);
  if (agent.status === 'working' && first) {
    return t('replyWorking', lang).replace('{title}', localized(first.title, first.titleAr, lang))
      .replace('{n}', String(first.progress));
  }
  return t('replyIdle', lang);
};

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

  /** After a send the draft empties without an input event — the box returns to one line. */
  useEffect(() => {
    if (draft !== '') return;
    const el = document.getElementById('composer-input');
    if (el instanceof HTMLTextAreaElement) el.style.blockSize = 'auto';
  }, [draft]);

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !thread || !agent) return;
    addMessage(thread.id, 'you', text);
    setDraft('');

    // Phase F: the teammate answers. With a key configured, their OWN provider answers, carrying
    // the company's system prompt (REQ-16); without one, the local voice keeps the studio alive.
    const state = useStore.getState();
    const manager = state.agents.find((a) => a.id === agent.managerId);
    const conn = agent.model;
    const threadId = thread.id;
    const person = agent;
    if (conn && conn.key.trim() !== '' && conn.model.trim() !== '') {
      const system = compileSystemPrompt(state.company, person,
        manager ? localized(manager.name, manager.nameAr, lang) : null);
      chatCompletion(conn, system, text)
        .then((answer) => addMessage(threadId, person.id, answer))
        .catch(() => addMessage(threadId, person.id, localVoice(person, lang)));
    } else {
      setTimeout(() => addMessage(threadId, person.id, localVoice(person, lang)), 800);
    }
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
                      <strong className="thread-name">
                        {localized(agent.name, agent.nameAr, lang)}
                        <span className={`status-dot ${agent.status}`} title={agent.status} />
                      </strong>
                      <span className="small dim" style={{ display: 'block' }}>
                        {localized(agent.role, agent.roleAr, lang)} · {t(STATUS_KEY[agent.status] ?? 'statusIdle', lang)}
                      </span>
                    </span>
                    <Badge tone={statusTone(agent.status)}>{t(STATUS_KEY[agent.status] ?? 'statusIdle', lang)}</Badge>
                  </header>

                  <div className="chat-log" ref={logRef} role="log" aria-live="polite">
                    {thread && thread.messages.map((m, i) => {
                      const own = m.from === 'you';
                      const prev = thread.messages[i - 1];
                      const grouped = prev !== undefined && prev.from === m.from;
                      return (
                        <article className={`message${own ? ' own' : ''}${grouped ? ' grouped' : ''}`} key={m.id}>
                          {grouped
                            ? <span className="avatar-space" aria-hidden="true" />
                            : own
                              ? <span className="initial">{operator.name.charAt(0).toUpperCase()}</span>
                              : <Avatar index={agent.avatar} size="sm" />}
                          <div className="message-body">
                            {grouped ? null : (
                              <div className="message-meta">
                                <strong>{own ? operator.name : localized(agent.name, agent.nameAr, lang)}</strong>
                                <time>{new Date(m.at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</time>
                                {!own ? <span className="badge">AI</span> : null}
                              </div>
                            )}
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

                  {/* REQ-36: one calm unit — a fixed box that scrolls inside itself, a send
                      button, nothing else. Enter sends, Shift+Enter adds a line; the field
                      just works, like every modern messenger. */}
                  {thread ? (
                    <form className="composer" onSubmit={send}>
                      <label className="visually-hidden" htmlFor="composer-input">{t('chatPlaceholder', lang)}</label>
                      {/* REQ-47: one line at first, grows with the typing to three, then
                          scrolls — and the round send button sits centred on it. */}
                      <textarea id="composer-input" rows={1} value={draft}
                        placeholder={t('chatPlaceholder', lang)}
                        onChange={(e) => setDraft(e.target.value)}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.blockSize = 'auto';
                          el.style.blockSize = `${el.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            send(e);
                          }
                        }} />
                      <button type="submit" className="btn primary iconbtn composer-send"
                        disabled={draft.trim() === ''}
                        aria-label={t('chatSend', lang)} title={t('chatSend', lang)}>
                        <Icon name="send" />
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
