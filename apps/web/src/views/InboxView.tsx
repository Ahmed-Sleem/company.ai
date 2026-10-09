/**
 * Inbox — the decision queue as a deck of slides (owner 2026-10-09: "each decision like a slide").
 *
 * One pending decision fills the screen at a time: the ask, the rule behind it, the change it
 * makes, who raised it. Approve or reject and the deck slides to the next one. Everything already
 * decided lives in the history table below, the way the prototype keeps its own history.
 * Deciding stays idempotent — the API refuses a second verdict and the queue just moves on.
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
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState<'approve' | 'reject' | null>(null);
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
  const slide = pending[Math.min(index, Math.max(pending.length - 1, 0))] ?? null;

  const agentOf = (d: Decision) => agents.find((a) => a.id === d.agentId) ?? null;

  const decide = (id: string, verdict: 'approve' | 'reject') => {
    if (busy || exiting) return;
    setBusy(id);
    setExiting(verdict);
    api.decide(id, verdict).catch(() => undefined).then(() => {
      window.setTimeout(() => {
        setExiting(null);
        setBusy(null);
        load();
      }, 180);
    });
  };

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : decisions ? 'default' : 'loading';

  const by = slide ? agentOf(slide) : null;

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

          {slide ? (
            <article
              className={`panel decision-slide${exiting ? ` out-${exiting}` : ''}`}
              key={slide.id}
              aria-label={`${t('inbox', lang)} ${index + 1}/${pending.length}`}
            >
              <header className="slide-head">
                <p className="task-id">{slide.shortRef}</p>
                <span className="grow" />
                <span className="tag">{slide.kind}</span>
                <Badge tone={toneOf(slide.risk)}>{slide.risk}</Badge>
              </header>
              <h3 className="slide-title">{localized(slide.title, slide.titleAr, lang)}</h3>
              <p className="slide-ask">{localized(slide.diff.summary, slide.diff.summaryAr, lang)}</p>
              <p className="slide-by">
                {by ? <Avatar index={by.avatar} size="sm" /> : null}
                <span className="grow">
                  {by ? `${localized(by.name, by.nameAr, lang)} · ${localized(by.role, by.roleAr, lang)}` : t('teamNoManager', lang)}
                </span>
              </p>
              <dl className="slide-facts">
                <dt>{t('rule', lang)}</dt>
                <dd>{`${slide.rule.id} · ${slide.rule.observed} / ${slide.rule.threshold} ${slide.rule.unit}`}</dd>
                <dt>{t('change', lang)}</dt>
                <dd>{`${slide.diff.before ?? '—'} → ${slide.diff.after ?? '—'}`}</dd>
                <dt>{t('audit', lang)}</dt>
                <dd>{dateTime(slide.audit.raisedAt, lang)}</dd>
              </dl>
              <div className="slide-foot">
                <div className="actions">
                  <button className="btn primary" type="button" disabled={busy !== null}
                    onClick={() => decide(slide.id, 'approve')}>
                    <Icon name="check" />{t('approve', lang)}
                  </button>
                  <button className="btn danger" type="button" disabled={busy !== null}
                    onClick={() => decide(slide.id, 'reject')}>
                    <Icon name="close" />{t('reject', lang)}
                  </button>
                </div>
                <div className="deck-nav" role="group" aria-label={t('deckNav', lang)}>
                  <button type="button" className="iconbtn ghost" aria-label={t('prev', lang)}
                    disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                    <Icon name="arrow" className="flip" />
                  </button>
                  <span className="deck-count" aria-live="polite">{`${index + 1} / ${pending.length}`}</span>
                  <button type="button" className="iconbtn ghost" aria-label={t('next', lang)}
                    disabled={index >= pending.length - 1} onClick={() => setIndex((i) => Math.min(pending.length - 1, i + 1))}>
                    <Icon name="arrow" />
                  </button>
                </div>
              </div>
            </article>
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
