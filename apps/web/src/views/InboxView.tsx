/**
 * Inbox — the owner's mailbox (REQ-46, owner seventh round).
 *
 * Every pending item is one compact line — sender, subject, time — the way a mailbox reads.
 * "Read more" opens the letter: a rule decision shows its facts and takes Approve/Reject; a
 * model's ask shows its question and is answered with one of its options or with the owner's
 * own words, which travel back along the asker's thread. Everything already decided lives in
 * the history table below. Deciding stays idempotent — the API refuses a second verdict.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import { Badge, toneOf } from '../components/Badge';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Markdown } from '../components/Markdown';
import type { MailAttachment } from '../data/store';
import { useStore } from '../data/store';
import { dateTime, localized } from '../lib/format';

type Decision = Awaited<ReturnType<typeof api.decisions>>['decisions'][number];

export function InboxView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  /** REQ-46: at most one letter is open at a time, and its reply draft lives beside it. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const agents = useStore((s) => s.agents);
  /** Phase J: the mailbox is LIVE — a letter filed by a model mid-cycle appears without a
      reload, and a thread's reply closes its letter in front of the owner's eyes. */
  const live = useStore((s) => s.decisions);

  const load = useCallback(() => {
    api.decisions().then((r) => setDecisions(r.decisions)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    load();
  }, [forcedState, load]);

  useEffect(() => {
    if (!error) setDecisions(live);
  }, [live, error]);

  /** REQ-54: an answered letter stays open until the employee's reply closes the loop. */
  const isOpen = (d: Decision) => d.status === 'pending' || d.status === 'answered';
  const pending = decisions?.filter(isOpen) ?? [];
  const history = decisions?.filter((d) => !isOpen(d)) ?? [];

  const agentOf = (d: Decision) => agents.find((a) => a.id === d.agentId) ?? null;

  const decide = (id: string, verdict: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(id);
    api.decide(id, verdict).catch(() => undefined).then(() => {
      setBusy(null);
      setOpenId(null);
      load();
    });
  };

  /** REQ-46: answer a letter — with one of its options, or with the owner's own words. */
  const answer = (id: string, text: string) => {
    if (busy) return;
    setBusy(id);
    api.answerDecision(id, text).catch(() => undefined).then(() => {
      setBusy(null);
      setOpenId(null);
      setReplyText('');
      load();
    });
  };

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : decisions ? 'default' : 'loading';

  return (
    <>
      <ScreenHead
        eyebrow={`${t('inbox', lang)} / ${t('overview', lang)}`}
        title={t('headInbox', lang)}
        subtitle={t('inboxNote', lang)}
      />
      <div className="pagebody">
        <DataState state={state} lang={lang} onRetry={() => location.reload()}>
          {pending.length === 0 && decisions ? <DataState state="empty" lang={lang} /> : null}

          {/* REQ-46: the mailbox — compact one-line letters; "read more" opens one. */}
          {pending.length > 0 ? (
            <ul className="mailbox">
              {pending.map((d) => {
                const by = agentOf(d);
                const open = openId === d.id;
                const who = by ? localized(by.name, by.nameAr, lang) : t('inbox', lang);
                return (
                  <li key={d.id} className={`mail panel${open ? ' open' : ''}`} data-mail={d.id}>
                    <button type="button" className="mail-row" aria-expanded={open}
                      data-mail-toggle={d.id}
                      onClick={() => { setOpenId(open ? null : d.id); setReplyText(''); }}>
                      {by ? <Avatar index={by.avatar} size="sm" /> : <Icon name="inbox" />}
                      <span className="mail-who">{who}</span>
                      <span className="mail-subject">{localized(d.title, d.titleAr, lang)}</span>
                      <span className="grow" />
                      {d.kind === 'ask' ? <span className="tag">{t('mailAskTag', lang)}</span> : null}
                      {d.kind === 'mail' ? <span className="tag">{t('mailMailTag', lang)}</span> : null}
                      {d.status === 'answered' ? <span className="tag warn" data-mail-awaiting={d.id}>{t('mailAwaiting', lang).replace('{name}', who)}</span> : null}
                      {/* R8: the affordance the owner asked for — an actual button word. */}
                      <span className="mail-more">{open ? t('mailClose', lang) : t('mailReadMore', lang)}</span>
                      <time className="mail-time" dateTime={d.audit.raisedAt}>{dateTime(d.audit.raisedAt, lang)}</time>
                    </button>
                    {open ? (
                      <div className="mail-body">
                        {d.status === 'answered' ? (
                          <>
                            <p className="mail-text">{d.body ?? localized(d.diff.summary, d.diff.summaryAr, lang)}</p>
                            <p className="small dim mail-reply-given">{t('mailYouSaid', lang)} {d.reply}</p>
                            <p className="small dim mail-lock-note">{t('mailLockNote', lang)}</p>
                          </>
                        ) : d.kind === 'mail' ? (
                          <MailLetter body={d.body ?? ''} attachments={d.attachments ?? null}
                            busy={busy} onDecide={() => decide(d.id, 'approve')}
                            placeholder={t('mailReplyPlaceholder', lang)} sendLabel={t('mailSend', lang)}
                            acceptLabel={t('approve', lang)} lang={lang}
                            onAnswer={(text) => answer(d.id, text)} />
                        ) : d.kind === 'ask' ? (
                          <>
                            <p className="mail-text">{d.body ?? localized(d.diff.summary, d.diff.summaryAr, lang)}</p>
                            {d.options && d.options.length > 0 ? (
                              <div className="mail-options" role="group" aria-label={t('mailOptionsAria', lang)}>
                                {d.options.map((opt, i) => (
                                  <button key={`${d.id}-opt-${i}`} type="button" className="btn"
                                    data-mail-opt={i} disabled={busy !== null}
                                    onClick={() => answer(d.id, opt)}>
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            <form className="mail-reply"
                              onSubmit={(e) => { e.preventDefault(); if (replyText.trim() !== '') answer(d.id, replyText.trim()); }}>
                              <input value={replyText} data-mail-reply={d.id}
                                placeholder={t('mailReplyPlaceholder', lang)} aria-label={t('mailReplyPlaceholder', lang)}
                                onChange={(e) => setReplyText(e.target.value)} />
                              <button type="submit" className="btn primary" disabled={busy !== null || replyText.trim() === ''}>
                                {t('mailSend', lang)}
                              </button>
                            </form>
                          </>
                        ) : (
                          <>
                            <p className="mail-text">{localized(d.diff.summary, d.diff.summaryAr, lang)}</p>
                            <dl className="mail-facts">
                              <dt>{t('rule', lang)}</dt>
                              <dd>{`${d.rule.id} · ${d.rule.observed} / ${d.rule.threshold} ${d.rule.unit}`}</dd>
                              <dt>{t('change', lang)}</dt>
                              <dd>{`${d.diff.before ?? '—'} → ${d.diff.after ?? '—'}`}</dd>
                              <dt>{t('audit', lang)}</dt>
                              <dd>{dateTime(d.audit.raisedAt, lang)}</dd>
                            </dl>
                            <div className="actions">
                              <button className="btn primary" type="button" disabled={busy !== null}
                                data-mail-decide="approve" onClick={() => decide(d.id, 'approve')}>
                                <Icon name="check" />{t('approve', lang)}
                              </button>
                              <button className="btn danger" type="button" disabled={busy !== null}
                                data-mail-decide="reject" onClick={() => decide(d.id, 'reject')}>
                                <Icon name="close" />{t('reject', lang)}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {decisions ? (
            <section className="spaced">
              <div className="sectionhead">
                <h2>{t('historyTitle', lang)}</h2>
                <span className="small dim">{history.length}</span>
              </div>
              {history.length === 0 ? <p className="small dim">{t('noHistory', lang)}</p> : (
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('histRequest', lang)}</th>
                        <th>{t('histBy', lang)}</th>
                        <th>{t('histStage', lang)}</th>
                        <th>{t('histActivity', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((d) => (
                        <tr key={d.id}>
                          <td>{localized(d.title, d.titleAr, lang)}</td>
                          <td>{agentOf(d) ? localized(agentOf(d)!.name, agentOf(d)!.nameAr, lang) : '—'}</td>
                          <td><Badge tone={toneOf(d.status)}>{d.status}</Badge></td>
                          <td>{d.audit.decidedAt ? dateTime(d.audit.decidedAt, lang) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </DataState>
      </div>
    </>
  );
}

/**
 * REQ-54 (Phase J): a deliverable reads like mail — a markdown body, attachments that open
 * in place, and the two owner moves: accept it, or ask for changes in your own words.
 */
function MailLetter({ body, attachments, busy, onDecide, onAnswer, acceptLabel, placeholder, sendLabel, lang }: {
  body: string;
  attachments: MailAttachment[] | null;
  busy: string | null;
  onDecide: () => void;
  onAnswer: (text: string) => void;
  acceptLabel: string;
  placeholder: string;
  sendLabel: string;
  lang: Lang;
}) {
  const [openAttach, setOpenAttach] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  return (
    <>
      <Markdown text={body} className="mail-text markdown" />
      {attachments && attachments.length > 0 ? (
        <div className="mail-attachments">
          {attachments.map((att, i) => (
            <div key={`${att.name}-${i}`} className="mail-attach">
              <button type="button" className="btn" data-mail-attach={i}
                aria-expanded={openAttach === i}
                onClick={() => setOpenAttach(openAttach === i ? null : i)}>
                <Icon name="inbox" /><span>{att.name}</span>
                <span className="small dim">{openAttach === i ? t('mailClose', lang) : t('mailReadMore', lang)}</span>
              </button>
              {openAttach === i ? <pre className="mail-attach-body">{att.content}</pre> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="actions">
        <button className="btn primary" type="button" disabled={busy !== null}
          data-mail-decide="approve" onClick={onDecide}>
          <Icon name="check" />{acceptLabel}
        </button>
      </div>
      <form className="mail-reply" onSubmit={(e) => { e.preventDefault(); if (reply.trim() !== '') { onAnswer(reply.trim()); setReply(''); } }}>
        <input value={reply} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setReply(e.target.value)} />
        <button type="submit" className="btn" disabled={busy !== null || reply.trim() === ''}>{sendLabel}</button>
      </form>
    </>
  );
}
