/**
 * The landing page (REQ-33) — what a brand-new visitor meets before the product exists for them.
 *
 * Same pixel style as everything else, the product explained in words and in screenshots of
 * itself, and exactly two doors: start your own company, or look around the labelled demo
 * company first. No save file exists yet at this point; choosing a door is what creates one.
 */
import { t, type Lang } from '../lib/i18n';
import { Icon } from '../components/Icon';

const SHOTS = [
  { file: 'shots/board.png', key: 'shotBoard' as const },
  { file: 'shots/world.png', key: 'shotWorld' as const },
  { file: 'shots/network.png', key: 'shotNetwork' as const },
];

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

      <section className="landing-shots" aria-label={t('landingTitle', lang)}>
        {SHOTS.map((shot) => (
          <figure className="landing-shot panel" key={shot.file}>
            <img src={shot.file} alt={t(shot.key, lang)} loading="lazy" />
            <figcaption>{t(shot.key, lang)}</figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}
