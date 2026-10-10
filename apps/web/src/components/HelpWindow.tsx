/**
 * The Help window (REQ-48, owner seventh round) — every explanation and every shortcut the
 * product has, in ONE place, reached from the topbar and from Settings. Expandable sections
 * (native <details>: keyboard-friendly, no script of our own), ordered the way the questions
 * arrive: what the studio is, which keys and gestures drive it, how the models work, and
 * where the data lives.
 */
import { Dialog } from './Dialog';
import { t, type Lang } from '../lib/i18n';

/** The key glyphs are the same in both languages — only their meanings are translated. */
const KEYS = [
  { keys: '⌘K / Ctrl K', label: 'helpKSearch' as const },
  { keys: '↑ ↓', label: 'helpKMove' as const },
  { keys: 'Enter', label: 'helpKRun' as const },
  { keys: 'Esc', label: 'helpKEsc' as const },
  { keys: 'Shift + Enter', label: 'helpKNewline' as const },
  { keys: 'drag', label: 'helpKDrag' as const },
  { keys: 'double-click', label: 'helpKDbl' as const },
  { keys: 'wheel / pinch', label: 'helpKZoom' as const },
];

export function HelpWindow({ open, lang, onClose }: { open: boolean; lang: Lang; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('helpOpen', lang)}
      eyebrow={t('brand', lang)}
      lang={lang}
    >
      <div className="help-sections" data-help="window">
        <details className="help-section" open>
          <summary>{t('helpViewsTitle', lang)}</summary>
          <p>{t('helpViewsBody', lang)}</p>
        </details>
        <details className="help-section">
          <summary>{t('helpKeysTitle', lang)}</summary>
          <dl className="help-keys">
            {KEYS.map((entry) => (
              <div className="help-keyrow" key={entry.keys}>
                <dt><kbd>{entry.keys}</kbd></dt>
                <dd>{t(entry.label, lang)}</dd>
              </div>
            ))}
          </dl>
        </details>
        <details className="help-section">
          <summary>{t('helpModelsTitle', lang)}</summary>
          <p>{t('helpModelsBody', lang)}</p>
        </details>
        <details className="help-section">
          <summary>{t('helpBuildTitle', lang)}</summary>
          <p>{t('helpBuildBody', lang)}</p>
        </details>
        <details className="help-section">
          <summary>{t('helpMailTitle', lang)}</summary>
          <p>{t('helpMailBody', lang)}</p>
        </details>
        <details className="help-section">
          <summary>{t('helpStudiosTitle', lang)}</summary>
          <p>{t('helpStudiosBody', lang)}</p>
        </details>
        <details className="help-section">
          <summary>{t('helpDataTitle', lang)}</summary>
          <p>{t('helpDataBody', lang)}</p>
        </details>
      </div>
    </Dialog>
  );
}
