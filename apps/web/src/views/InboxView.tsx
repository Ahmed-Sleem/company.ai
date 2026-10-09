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

  const load = useCallback(() => {
    api.decisions().then((r) => setDecisions(r.decisions)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    load();
  }, [forcedState, load]);

  const pending = decisions?.filter((d) => d.status === 'pending') ?? [];
  const history = decisions?.filter((d) => d.status !== 'pending') ?? [];

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
          {decisions && (
            <div className="queue-summary">
              <Icon name="inbox" />
              <span className="grow">{`${pending.length} ${t('waitingYou', lang)}`}</span>
              <span className="small dim">{t('localOnly', lang)}</span>
            </div>
          )}

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
                      <time className="mail-time" dateTime={d.audit.raisedAt}>{dateTime(d.audit.raisedAt, lang)}</time>
                    </button>
                    {open ? (
                      <div className="mail-body">
                        {d.kind === 'ask' ? (
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
