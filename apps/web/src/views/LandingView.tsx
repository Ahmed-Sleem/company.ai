/**
 * The landing page (REQ-33) — what a brand-new visitor meets before the product exists for them.
 *
 * Same pixel style as everything else, and exactly two doors: start your own company, or
 * look around the labelled demo company first. No save file exists yet at this point;
 * choosing a door is what creates one.
 *
 * REQ-43 (owner, seventh round): the education is three interactive steps with small
 * animated visuals — minimal, clear, to the point. No screenshots anywhere.
 */
import { useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { Icon } from '../components/Icon';

/** REQ-43: three teachable steps, each with a small animated visual — no screenshots. */
const STEPS = ['found', 'hire', 'run'] as const;

export function LandingView({
  lang,
  resumable,
  studio,
  onStart,
  onDemo,
  onOpen,
  onLanguage,
}: {
  lang: Lang;
  /** A draft from an earlier visit turns the start button into "continue where I left off". */
  resumable: boolean;
  /** REQ-41: when a studio already exists, the landing leads with one door — open it. */
  studio?: string | null;
  onStart: () => void;
  onDemo: () => void;
  onOpen?: () => void;
  onLanguage: () => void;
}) {
  const [step, setStep] = useState(0);
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
        {studio && onOpen ? (
          <div className="row landing-actions">
            <button type="button" className="btn primary" data-landing="open" onClick={onOpen}>
              <Icon name="play" />{t('landingOpen', lang).replace('{company}', studio)}
            </button>
          </div>
        ) : (
          <>
            <div className="row landing-actions">
              <button type="button" className="btn primary" data-landing="start" onClick={onStart}>
                <Icon name="play" />{resumable ? t('landingResume', lang) : t('landingStart', lang)}
              </button>
              <button type="button" className="btn" data-landing="demo" onClick={onDemo}>
                {t('landingDemo', lang)}
              </button>
            </div>
            <p className="small dim landing-demo-note">{t('landingDemoNote', lang)}</p>
          </>
        )}
      </section>

      {/* REQ-43 (owner, seventh round): screenshots are out — the landing teaches the
          product in three interactive steps, minimal and to the point. */}
      <section className="landing-steps panel" aria-label={t('landingHow', lang)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="landing-stepbar" role="tablist" aria-label={t('landingHow', lang)}>
          {STEPS.map((name, i) => (
            <button type="button" key={name} role="tab"
              className={`landing-step${i === step ? ' is-on' : ''}`}
              aria-selected={i === step} data-landing-step={name}
              onClick={() => setStep(i)}>
              <span className="landing-step-n">{i + 1}</span>
              {t(name === 'found' ? 'stepFound' : name === 'hire' ? 'stepHire' : 'stepRun', lang)}
            </button>
          ))}
        </div>
        <div className="landing-stepbody" data-landing-visual={STEPS[step]}>
          {/* Remounting on step change replays the animation — the visual teaches the step. */}
          {STEPS[step] === 'found' ? (
            <div className="lvis" key="found">
              <div className="lvis-check"><i /><b>{lang === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629' : 'Company name'}</b></div>
              <div className="lvis-check"><i /><b>{lang === 'ar' ? '\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644' : 'Business'}</b></div>
              <div className="lvis-check"><i /><b>{lang === 'ar' ? '\u0641\u0631\u064a\u0642 \u0627\u0644\u0628\u062f\u0627\u064a\u0629' : 'First team'}</b></div>
              <div className="lvis-pill">company.ai</div>
            </div>
          ) : STEPS[step] === 'hire' ? (
            <div className="lvis" key="hire">
              <div className="lvis-mate c1"><span /><small>{lang === 'ar' ? '\u062a\u0635\u0645\u064a\u0645' : 'Design'}</small></div>
              <div className="lvis-mate c2"><span /><small>{lang === 'ar' ? '\u0647\u0646\u062f\u0633\u0629' : 'Engineering'}</small></div>
              <div className="lvis-mate c3"><span /><small>{lang === 'ar' ? '\u0645\u0628\u064a\u0639\u0627\u062a' : 'Sales'}</small></div>
              <div className="lvis-mate ai c4"><span /><small>AI</small></div>
            </div>
          ) : (
            <div className="lvis" key="run">
              <div className="lvis-task"><b /><u /><em /></div>
              <div className="lvis-bubble">{lang === 'ar' ? '\u062e\u0644\u0651\u0635\u062a \u0627\u0644\u062a\u0635\u0645\u064a\u0645' : 'Design shipped'}</div>
              <div className="lvis-bubble right">{lang === 'ar' ? '\u0645\u0648\u0627\u0641\u0642 \u2713' : 'Approved \u2713'}</div>
            </div>
          )}
          <p className="landing-stepbody-text">
            {t(STEPS[step] === 'found' ? 'stepFoundBody' : STEPS[step] === 'hire' ? 'stepHireBody' : 'stepRunBody', lang)}
          </p>
        </div>
      </section>
    </div>
  );
}
