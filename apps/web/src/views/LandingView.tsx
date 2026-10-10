/**
 * The landing page (REQ-33, rebuilt R8 owner eighth round) — a COMPLETE page that tells the
 * whole story of the product before a single click: what company.ai is, the team of humans
 * and AI, the engine that moves the work, the mailbox, the seven rooms, and where the data
 * lives. Same pixel style as everything else.
 *
 * The doors: before Start, the page educates. Start opens the picker — every company saved on
 * this device plus "New company" (which reboots into the wizard). With no companies yet, Start
 * walks straight into the wizard. The demo door is always there, and so is the language flip.
 */
import { useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { Icon } from '../components/Icon';
import type { StudioMeta } from '../lib/studios';

const VIEW_KEYS = ['landViewTeam', 'landViewTasks', 'landViewInbox', 'landViewComms', 'landViewNetwork', 'landViewWorld', 'landViewSet'] as const;

export function LandingView({
  lang,
  resumable,
  studio,
  studios,
  onStart,
  onDemo,
  onOpen,
  onOpenStudio,
  onNewStudio,
  onLanguage,
}: {
  lang: Lang;
  /** A draft from an earlier visit turns the start button into "continue where I left off". */
  resumable: boolean;
  /** The company of the active save, when one exists. */
  studio?: string | null;
  /** R8: every company recorded on this device. */
  studios: StudioMeta[];
  onStart: () => void;
  onDemo: () => void;
  onOpen?: () => void;
  onOpenStudio: (id: string) => void;
  onNewStudio: () => void;
  onLanguage: () => void;
}) {
  /** Start with companies on the device shows the picker first; without, it starts.
      With no active save at all (a cleared or brand-new browser) there is nothing to pick
      between — Start starts. */
  const [picking, setPicking] = useState(false);
  const hasSave = typeof localStorage !== 'undefined' && localStorage.getItem('company.ai.save.v1') !== null;
  // A half-finished wizard always wins over the picker — the draft is the newest intent.
  const start = () => (studios.length > 0 && hasSave && !resumable ? setPicking(true) : onStart());

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand">
          <span>{t('brand', lang)}<small>{t('brandSub', lang)}</small></span>
        </div>
        <button type="button" className="btn ghost" data-landing="language"
          aria-label={lang === 'en' ? 'العربية' : 'English'} onClick={onLanguage}>
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
      </header>

      <section className="landing-hero">
        <p className="eyebrow">{t('brandSub', lang)}</p>
        <h1 id="page-title" tabIndex={-1}>{t('landingTitle', lang)}</h1>
        <p className="landing-body">{t('landingBody', lang)}</p>
        <div className="row landing-actions">
          {studio && onOpen ? (
            <button type="button" className="btn primary" data-landing="open" onClick={onOpen}>
              <Icon name="play" />{t('landingOpen', lang).replace('{company}', studio)}
            </button>
          ) : null}
          <button type="button" className={studio ? 'btn' : 'btn primary'} data-landing="start" onClick={start}>
            {resumable && !studio ? t('landingResume', lang) : studios.length > 0 ? t('landingStart', lang) : resumable ? t('landingResume', lang) : t('landingStart', lang)}
          </button>
          <button type="button" className="btn" data-landing="demo" onClick={onDemo}>
            {t('landingDemo', lang)}
          </button>
        </div>
        <p className="small dim landing-demo-note">{t('landingDemoNote', lang)}</p>
      </section>

      {/* R8: after Start — every company on this device, and the door to a new one. */}
      {picking ? (
        <section className="landing-companies panel" data-landing="companies" aria-label={t('landCompaniesTitle', lang)}>
          <h2>{t('landCompaniesTitle', lang)}</h2>
          <ul className="studio-list">
            {studios.map((s) => (
              <li key={s.id} className="studio-row">
                <span className="grow">
                  <strong>{s.name}</strong>
                  <small className="dim">{new Date(s.at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</small>
                </span>
                <button type="button" className="btn" data-studio={s.id}
                  onClick={() => (s.name === studio && onOpen ? onOpen() : onOpenStudio(s.id))}>
                  {t('landOpenC', lang)}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn primary" data-landing="new-company" onClick={onNewStudio}>
            <Icon name="plus" />{t('landNewCompany', lang)}
          </button>
        </section>
      ) : null}

      {/* The story of the product — one full page, section by section. */}
      <section className="landing-story">
        <article className="landing-block panel">
          <div className="lvis" aria-hidden="true">
            <div className="lvis-check"><i /><b>{lang === 'ar' ? 'اسم الشركة' : 'Company name'}</b></div>
            <div className="lvis-check"><i /><b>{lang === 'ar' ? 'نوع العمل' : 'Business'}</b></div>
            <div className="lvis-check"><i /><b>{lang === 'ar' ? 'فريق البداية' : 'First team'}</b></div>
            <div className="lvis-pill">company.ai</div>
          </div>
          <div>
            <h2>{t('landWhatTitle', lang)}</h2>
            <p>{t('landWhatBody', lang)}</p>
          </div>
        </article>

        <article className="landing-block panel">
          <div className="lvis" aria-hidden="true">
            <div className="lvis-mate c1"><span /><small>{lang === 'ar' ? 'تصميم' : 'Design'}</small></div>
            <div className="lvis-mate c2"><span /><small>{lang === 'ar' ? 'هندسة' : 'Engineering'}</small></div>
            <div className="lvis-mate c3"><span /><small>{lang === 'ar' ? 'مبيعات' : 'Sales'}</small></div>
            <div className="lvis-mate ai c4"><span /><small>AI</small></div>
          </div>
          <div>
            <h2>{t('landTeamTitle', lang)}</h2>
            <p>{t('landTeamBody', lang)}</p>
          </div>
        </article>

        <article className="landing-block panel">
          <div className="lvis" aria-hidden="true">
            <div className="lvis-task"><b /><u /><em /></div>
            <div className="lvis-bubble">{lang === 'ar' ? 'خلّصت التصميم' : 'Design shipped'}</div>
            <div className="lvis-bubble right">{lang === 'ar' ? 'موافق ✓' : 'Approved ✓'}</div>
          </div>
          <div>
            <h2>{t('landWorkTitle', lang)}</h2>
            <p>{t('landWorkBody', lang)}</p>
          </div>
        </article>

        <article className="landing-block panel">
          <div className="lvis" aria-hidden="true">
            <div className="lvis-bubble">{lang === 'ar' ? 'نحتاج قرارك…' : 'We need your call…'}</div>
            <div className="lvis-mate c1"><span /><small>A</small></div>
            <div className="lvis-mate c2"><span /><small>B</small></div>
            <div className="lvis-bubble right">{lang === 'ar' ? 'ردّك ↩' : 'Your reply ↩'}</div>
          </div>
          <div>
            <h2>{t('landMailTitle', lang)}</h2>
            <p>{t('landMailBody', lang)}</p>
          </div>
        </article>

        <article className="landing-block panel landing-views">
          <h2>{t('landViewsTitle', lang)}</h2>
          <ul>
            {VIEW_KEYS.map((key) => (
              <li key={key}><Icon name="check" />{t(key, lang)}</li>
            ))}
          </ul>
        </article>

        <article className="landing-block panel">
          <h2>{t('landDataTitle', lang)}</h2>
          <p>{t('landDataBody', lang)}</p>
        </article>
      </section>

      <footer className="landing-foot small dim">
        <span>{t('brand', lang)}</span>
        <button type="button" className="btn ghost" onClick={onLanguage}>
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </footer>
    </div>
  );
}
