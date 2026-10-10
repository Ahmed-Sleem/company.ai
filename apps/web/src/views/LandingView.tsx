/**
 * The landing page (REQ-33 · R8 complete page · R10 FULL PRODUCT page) — the shape of the
 * great product pages (hero, facts, features, how-it-works, deep dives, privacy, FAQ, final
 * call, footer) in our own pixel skin, with honest copy only: no invented numbers, no fake
 * customers, every claim true of the shipped app.
 *
 * The doors stay exactly where the drivers expect them: `[data-landing=open|start|demo|
 * companies|new-company|language]` in the hero and the picker. The deep-dive scenes are pure
 * CSS (no screenshots, no external assets), and every string is bilingual.
 */
import { useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { Icon } from '../components/Icon';
import type { StudioMeta } from '../lib/studios';

const VIEW_KEYS = ['landViewTeam', 'landViewTasks', 'landViewInbox', 'landViewComms', 'landViewNetwork', 'landViewWorld', 'landViewSet'] as const;

/** The hero scene: the whole studio in one pixel window — rail, desks, the AI teammate,
    live bubbles, a progress bar and the clock. Pure CSS; honours reduced motion. */
function HeroScene({ lang }: { lang: Lang }) {
  return (
    <div className="lvis-hero" aria-hidden="true">
      <div className="lh-bar"><i /><i /><i /><span>company.ai — {lang === 'ar' ? 'استوديو النيل' : 'Nile Studio'}</span></div>
      <div className="lh-body">
        <div className="lh-rail"><i /><i /><i /><i /><i /></div>
        <div className="lh-floor">
          <span className="lh-desk c1" /><span className="lh-desk c2" /><span className="lh-desk ai" />
          <span className="lh-desk c3" /><span className="lh-desk c1" /><span className="lh-desk c2" />
          <span className="lh-bub">{lang === 'ar' ? 'التصميم خلص ✓' : 'Design shipped ✓'}</span>
          <span className="lh-bub b2">{lang === 'ar' ? '62٪ من الواجهة' : '62% of the UI'}</span>
          <span className="lh-task"><b /><u /></span>
          <span className="lh-clock"><i /></span>
        </div>
      </div>
    </div>
  );
}

/** Tool chips calling, and the studio answering in words — the Phase I story in one scene. */
function ToolScene({ lang }: { lang: Lang }) {
  return (
    <div className="lvis" aria-hidden="true">
      <div className="lvis-chips">
        <span className="lvis-chip">update_progress</span>
        <span className="lvis-chip">message_employee</span>
        <span className="lvis-chip">ask_owner</span>
      </div>
      <div className="lvis-bubble right">{lang === 'ar' ? 'تم التنفيذ ✓' : 'Executed ✓'}</div>
    </div>
  );
}

/** The mailbox letter: one question, options, one decision. */
function MailScene({ lang }: { lang: Lang }) {
  return (
    <div className="lvis" aria-hidden="true">
      <div className="lvis-letter">
        <b>{lang === 'ar' ? 'نحتاج قرارك…' : 'We need your call…'}</b>
        <span className="lvis-opt">A</span><span className="lvis-opt">B</span><span className="lvis-opt">C</span>
      </div>
      <div className="lvis-bubble right">{lang === 'ar' ? 'موافق ✓' : 'Approved ✓'}</div>
    </div>
  );
}

/** The floor: desks in rows, and one teammate mid-walk. */
function FloorScene({ lang }: { lang: Lang }) {
  return (
    <div className="lvis" aria-hidden="true">
      <div className="lvis-floorgrid">
        <i /><i /><i /><i /><i /><i /><i /><i /><i />
        <span className="lvis-walker" />
      </div>
      <div className="lvis-bubble">{lang === 'ar' ? 'رايح للاجتماع' : 'Walking to the meeting'}</div>
    </div>
  );
}

/** Four doors, one for each way in. */
function DoorsScene({ lang }: { lang: Lang }) {
  return (
    <div className="lvis" aria-hidden="true">
      <div className="lvis-doors">
        <span>OpenAI</span><span>Anthropic</span><span>Gemini</span><span>{lang === 'ar' ? 'خصوصي' : 'Custom'}</span>
      </div>
    </div>
  );
}

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
  onDemoView,
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
  /** R11: every section leads somewhere — the demo, dropped into the room it describes. */
  onDemoView: (view: string) => void;
}) {
  /** Start with companies on the device shows the picker first; without, it starts.
      With no active save at all (a cleared or brand-new browser) there is nothing to pick
      between — Start starts. */
  const [picking, setPicking] = useState(false);
  const hasSave = typeof localStorage !== 'undefined' && localStorage.getItem('company.ai.save.v1') !== null;
  // A half-finished wizard always wins over the picker — the draft is the newest intent.
  const start = () => (studios.length > 0 && hasSave && !resumable ? setPicking(true) : onStart());
  const startLabel = resumable && !studio ? t('landingResume', lang) : studios.length > 0 ? t('landingStart', lang) : resumable ? t('landingResume', lang) : t('landingStart', lang);

  const deepDives = [
    { id: 'tools', view: 'tasks', title: t('landBandToolsT', lang), body: t('landBandToolsB', lang), lines: [t('landBandToolsL1', lang), t('landBandToolsL2', lang), t('landBandToolsL3', lang)], scene: <ToolScene lang={lang} /> },
    { id: 'mail', view: 'inbox', title: t('landBandMailT', lang), body: t('landBandMailB', lang), lines: [t('landBandMailL1', lang), t('landBandMailL2', lang), t('landBandMailL3', lang)], scene: <MailScene lang={lang} /> },
    { id: 'world', view: 'world', title: t('landBandWorldT', lang), body: t('landBandWorldB', lang), lines: [t('landBandWorldL1', lang), t('landBandWorldL2', lang), t('landBandWorldL3', lang)], scene: <FloorScene lang={lang} /> },
    { id: 'models', view: 'team', title: t('landBandModelsT', lang), body: t('landBandModelsB', lang), lines: [t('landBandModelsL1', lang), t('landBandModelsL2', lang), t('landBandModelsL3', lang)], scene: <DoorsScene lang={lang} /> },
  ] as const;

  const faqs = [
    { q: t('landFaq1Q', lang), a: t('landFaq1A', lang) },
    { q: t('landFaq2Q', lang), a: t('landFaq2A', lang) },
    { q: t('landFaq3Q', lang), a: t('landFaq3A', lang) },
    { q: t('landFaq4Q', lang), a: t('landFaq4A', lang) },
    { q: t('landFaq5Q', lang), a: t('landFaq5A', lang) },
    { q: t('landFaq6Q', lang), a: t('landFaq6A', lang) },
  ];

  return (
    <div className="landing">
      {/* The product bar: brand, the page's own map, the language flip and the way in. */}
      <header className="landing-top landing-nav">
        <div className="brand">
          <span>{t('brand', lang)}<small>{t('brandSub', lang)}</small></span>
        </div>
        <nav className="landing-links" aria-label={t('brand', lang)}>
          <a href="#product">{t('landNavProduct', lang)}</a>
          <a href="#how">{t('landNavHow', lang)}</a>
          <a href="#inside">{t('landNavInside', lang)}</a>
          <a href="#faq">{t('landNavFaq', lang)}</a>
        </nav>
        <div className="row landing-navcta">
          <button type="button" className="btn ghost" data-landing="language"
            aria-label={lang === 'en' ? 'العربية' : 'English'} onClick={onLanguage}>
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
          <button type="button" className="btn primary" data-landing="start" onClick={start}>
            {startLabel}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">{t('brandSub', lang)}</p>
          <h1 id="page-title" tabIndex={-1}>{t('landHeroTitle', lang)}</h1>
          <p className="landing-body">{t('landHeroBody', lang)}</p>
          <div className="row landing-actions">
            {studio && onOpen ? (
              <button type="button" className="btn primary" data-landing="open" onClick={onOpen}>
                <Icon name="play" />{t('landingOpen', lang).replace('{company}', studio)}
              </button>
            ) : null}
            {studio && onOpen ? (
              <button type="button" className="btn" onClick={start}>{startLabel}</button>
            ) : null}
            <button type="button" className="btn" data-landing="demo" onClick={onDemo}>
              {t('landingDemo', lang)}
            </button>
          </div>
          <ul className="landing-trust">
            <li><Icon name="check" />{t('landTrust1', lang)}</li>
            <li><Icon name="check" />{t('landTrust2', lang)}</li>
            <li><Icon name="check" />{t('landTrust3', lang)}</li>
          </ul>
          <p className="small dim landing-demo-note">{t('landingDemoNote', lang)}</p>
        </div>
        <HeroScene lang={lang} />
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

      {/* The honest facts strip — real numbers about the shipped product, nothing invented. */}
      <section className="landing-facts" aria-label={t('brand', lang)}>
        <div className="landing-fact"><b>4</b><small>{t('landFactDoors', lang)}</small></div>
        <div className="landing-fact"><b>7</b><small>{t('landFactRooms', lang)}</small></div>
        <div className="landing-fact"><b>4</b><small>{t('landFactTools', lang)}</small></div>
        <div className="landing-fact"><b>0</b><small>{t('landFactServers', lang)}</small></div>
      </section>

      {/* The product, in six cards — the story the R8 page told, now a proper grid. */}
      <section className="landing-story" id="product">
        <h2 className="landing-section-title">{t('landGridTitle', lang)}</h2>
        <div className="landing-grid">
          <article className="landing-block panel">
            <div className="lvis" aria-hidden="true">
              <div className="lvis-doors mini"><span>O</span><span>A</span><span>G</span><span>★</span></div>
            </div>
            <div><h2>{t('landFeatModelsT', lang)}</h2><p>{t('landFeatModelsB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('team')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
          <article className="landing-block panel">
            <ToolScene lang={lang} />
            <div><h2>{t('landFeatToolsT', lang)}</h2><p>{t('landFeatToolsB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('tasks')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
          <article className="landing-block panel">
            <div className="lvis" aria-hidden="true">
              <div className="lvis-mate ai c4"><span /><small>{lang === 'ar' ? 'المديرة' : 'Root'}</small></div>
              <div className="lvis-mate c1"><span /><small>A</small></div>
              <div className="lvis-mate c2"><span /><small>B</small></div>
              <div className="lvis-mate c3"><span /><small>C</small></div>
            </div>
            <div><h2>{t('landFeatTreeT', lang)}</h2><p>{t('landFeatTreeB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('network')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
          <article className="landing-block panel">
            <MailScene lang={lang} />
            <div><h2>{t('landFeatMailT', lang)}</h2><p>{t('landFeatMailB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('inbox')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
          <article className="landing-block panel">
            <FloorScene lang={lang} />
            <div><h2>{t('landFeatWorldT', lang)}</h2><p>{t('landFeatWorldB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('world')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
          <article className="landing-block panel">
            <div className="lvis" aria-hidden="true">
              <div className="lvis-check"><i /><b>{lang === 'ar' ? 'جهازك' : 'Your device'}</b></div>
              <div className="lvis-pill">0 {lang === 'ar' ? 'خوادم' : 'servers'}</div>
            </div>
            <div><h2>{t('landFeatLocalT', lang)}</h2><p>{t('landFeatLocalB', lang)}</p><button type="button" className="btn ghost landing-seedemo" data-landing="see-demo" onClick={() => onDemoView('settings')}><Icon name="play" />{t('landSeeDemo', lang)}</button></div>
          </article>
        </div>
      </section>

      {/* How it works — three moves, the wizard to the first tick. */}
      <section className="landing-story" id="how">
        <h2 className="landing-section-title">{t('landStepTitle', lang)}</h2>
        <ol className="landing-steps">
          <li className="landing-block panel">
            <b className="landing-stepnum">1</b>
            <div className="lvis" aria-hidden="true">
              <div className="lvis-check"><i /><b>{lang === 'ar' ? 'اسم الشركة' : 'Company name'}</b></div>
              <div className="lvis-check"><i /><b>{lang === 'ar' ? 'نوع العمل' : 'Business'}</b></div>
              <div className="lvis-pill">company.ai</div>
            </div>
            <div><h2>{t('landStep1T', lang)}</h2><p>{t('landStep1B', lang)}</p></div>
          </li>
          <li className="landing-block panel">
            <b className="landing-stepnum">2</b>
            <div className="lvis" aria-hidden="true">
              <div className="lvis-mate c1"><span /><small>{lang === 'ar' ? 'تصميم' : 'Design'}</small></div>
              <div className="lvis-mate c2"><span /><small>{lang === 'ar' ? 'هندسة' : 'Engineering'}</small></div>
              <div className="lvis-mate ai c4"><span /><small>AI</small></div>
            </div>
            <div><h2>{t('landStep2T', lang)}</h2><p>{t('landStep2B', lang)}</p></div>
          </li>
          <li className="landing-block panel">
            <b className="landing-stepnum">3</b>
            <div className="lvis" aria-hidden="true">
              <div className="lvis-task"><b /><u /><em /></div>
              <div className="lvis-bubble">{lang === 'ar' ? 'خلّصت التصميم' : 'Design shipped'}</div>
              <div className="lvis-bubble right">{lang === 'ar' ? 'موافق ✓' : 'Approved ✓'}</div>
            </div>
            <div><h2>{t('landStep3T', lang)}</h2><p>{t('landStep3B', lang)}</p></div>
          </li>
        </ol>
      </section>

      {/* Inside — the deep dives, alternating scene and story like the great pages do. */}
      <section className="landing-story" id="inside">
        {deepDives.map((dive, i) => (
          <article key={dive.id} className={`landing-deep panel${i % 2 === 1 ? ' flip' : ''}`}>
            <div className="lvis-deep">{dive.scene}</div>
            <div className="landing-deep-copy">
              <h2>{dive.title}</h2>
              <p>{dive.body}</p>
              <ul>{dive.lines.map((line) => <li key={line}><Icon name="check" />{line}</li>)}</ul>
              <button type="button" className="btn ghost landing-seedemo" data-landing="see-demo"
                onClick={() => onDemoView(dive.view)}>
                <Icon name="play" />{t('landSeeDemo', lang)}
              </button>
            </div>
          </article>
        ))}
        <article className="landing-block panel landing-views">
          <h2>{t('landViewsTitle', lang)}</h2>
          <ul>
            {VIEW_KEYS.map((key) => (
              <li key={key}><Icon name="check" />{t(key, lang)}</li>
            ))}
          </ul>
        </article>
      </section>

      {/* Privacy — the promise that makes the rest safe to try. */}
      <section className="landing-privacy panel">
        <h2>{t('landPrivT', lang)}</h2>
        <p>{t('landPrivB', lang)}</p>
      </section>

      {/* FAQ — native details, no scripts, works everywhere. */}
      <section className="landing-faq" id="faq">
        <h2 className="landing-section-title">{t('landFaqTitle', lang)}</h2>
        {faqs.map((faq) => (
          <details key={faq.q} className="panel">
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </section>

      {/* The final call — same two doors, said once more. */}
      <section className="landing-cta-final">
        <h2>{t('landCtaT', lang)}</h2>
        <p className="landing-body">{t('landCtaB', lang)}</p>
        <div className="row landing-actions">
          <button type="button" className="btn primary" onClick={start}>{startLabel}</button>
          <button type="button" className="btn" onClick={onDemo}>{t('landingDemo', lang)}</button>
        </div>
      </section>

      <footer className="landing-foot small dim">
        <span>{t('landFootNote', lang)}</span>
        <button type="button" className="btn ghost" onClick={onLanguage}>
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </footer>
    </div>
  );
}
