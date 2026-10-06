/**
 * Settings — the company and the model registry. The prices shown are the ones the ledger
 * actually bills with, so the number here and the number on an agent's meter can never differ.
 *
 * Appearance carries the palette control borrowed from the owner's demo: five presets, the
 * design source's own colours first, each one working in dark and light. The chosen preset is a
 * preference, not data, so it is applied here and remembered locally — the same as the theme.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { t, type Lang } from '../lib/i18n';
import { Panel } from '../components/Panel';
import { DataState, type DataStateKind } from '../components/DataState';
import {
  applyPalette, paletteNameKey, readCustomAccent, readPalette, resolvedTheme, saveCustomAccent,
  type PaletteChoice,
  DEFAULT_CUSTOM_ACCENT,
} from '../lib/theme';
import { readFx, readRail, setFx, setRail } from '../lib/prefs';
import { applyCustomAccent, deriveAccent, validHex } from '../lib/accent';
import { palettes } from '@company/tokens';

/**
 * The palette control. A swatch shows the preset's accent, the pressed state is announced rather
 * than coloured in (aria-pressed), and the choice is applied to the document immediately — the
 * same instant response the owner's demo gives, minus the inline colour writing.
 */
function PaletteSetting({ lang }: { lang: Lang }) {
  const [chosen, setChosen] = useState<PaletteChoice>(readPalette);
  const [accent, setAccent] = useState(readCustomAccent);

  /**
   * Deriving here as well as in the shell is deliberate: the person has to see *what they will
   * get* while they drag the colour picker — including how far the colour had to move to stay
   * readable. The shell does the same derivation on boot and on a theme change.
   */
  const derived = deriveAccent(accent, resolvedTheme(), accentSurfaces());

  const pick = (choice: PaletteChoice) => {
    const applied = applyPalette(choice);
    setChosen(applied);
    if (choice === 'custom') applyAccent(accent);
    else applyCustomAccent(null);
  };

  const applyAccent = (hex: string) => {
    saveCustomAccent(hex);
    setAccent(hex);
    applyCustomAccent(deriveAccent(hex, resolvedTheme(), accentSurfaces()));
  };

  return (
    <section className="palette-setting">
      <h3 id="palette-heading">{t('colorPalette', lang)}</h3>
      <p>{t('paletteNote', lang)}</p>
      <div className="palette-options" role="group" aria-labelledby="palette-heading">
        {palettes.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className="palette-option"
            aria-pressed={preset.id === chosen}
            onClick={() => pick(preset.id)}
          >
            <span className="palette-chip" style={{ '--chip': preset.chip } as CSSProperties} aria-hidden="true" />
            <span>{t(paletteNameKey(preset.id), lang)}</span>
          </button>
        ))}
        <button
          type="button"
          className="palette-option"
          aria-pressed={chosen === 'custom'}
          data-palette-option="custom"
          onClick={() => pick('custom')}
        >
          <span
            className="palette-chip"
            style={{ '--chip': validHex(accent) ? accent : DEFAULT_CUSTOM_ACCENT } as CSSProperties}
            aria-hidden="true"
          />
          <span>{t('customAccent', lang)}</span>
        </button>
      </div>

      {/* The colour picker is shown whenever the custom accent is the chosen palette, so the
          control that owns the choice is always in view — not only while it is being dragged. */}
      {chosen === 'custom' && (
        <div className="accent-picker">
          <label className="field">
            <span>{t('pickAccent', lang)}</span>
            <input
              type="color"
              name="accent"
              value={validHex(accent) ? accent : DEFAULT_CUSTOM_ACCENT}
              onChange={(event) => applyAccent(event.target.value)}
            />
          </label>
          <p className="muted" data-accent-note>
            {derived.walked > 0 ? t('accentAdjusted', lang) : t('accentExact', lang)}
            {derived.walked > 0 ? ` — ${derived.accent}` : ''}
          </p>
          <span className="palette-chip" style={{ '--chip': derived.accent } as CSSProperties} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}

/** The five surfaces an accent is drawn against, read from the document as it is painted. */
function accentSurfaces() {
  const styles = getComputedStyle(document.documentElement);
  return ['--bg', '--side', '--surface', '--raised', '--hover']
    .map((name) => styles.getPropertyValue(name).trim())
    .filter(Boolean);
}

/** The owner's two toggles, both defaulting to on: the screen effect and the collapsed rail. */
function SkinSetting({ lang }: { lang: Lang }) {
  const [fx, setFxOn] = useState(readFx);
  const [rail, setRailOn] = useState(readRail);
  return (
    <section className="palette-setting">
      <h3>{t('appearance', lang)}</h3>
      <label className="switch">
        <input
          type="checkbox"
          name="fx"
          checked={fx}
          onChange={(event) => setFxOn(setFx(event.target.checked))}
        />
        <span>
          {t('screenEffect', lang)}
          <small>{t('screenEffectNote', lang)}</small>
        </span>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          name="rail"
          checked={rail}
          onChange={(event) => setRailOn(setRail(event.target.checked))}
        />
        <span>
          {t('collapsedRail', lang)}
          <small>{t('collapsedRailNote', lang)}</small>
        </span>
      </label>
    </section>
  );
}

export function SettingsView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const [models, setModels] = useState<Awaited<ReturnType<typeof api.models>>['models'] | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (forcedState && forcedState !== 'default') return;
    Promise.all([api.models(), api.company()])
      .then(([m, c]) => {
        setModels(m.models);
        setCompany(c.company.name);
      })
      .catch(() => setError(true));
  }, [forcedState]);

  const state: DataStateKind = forcedState && forcedState !== 'default'
    ? forcedState
    : error ? 'error' : models ? 'default' : 'loading';

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return (
    <Panel title={t('settings', lang)} note={t('settingsNote', lang)}>
      <DataState state={state} lang={lang} onRetry={() => location.reload()}>
        <p><strong>{t('company', lang)}:</strong> {company}</p>
        <h3>{t('models', lang)}</h3>
        <table className="models" style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start' }}>{t('models', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('lane', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('inLabel', lang)}</th>
              <th style={{ textAlign: 'start' }}>{t('outLabel', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {models?.map((model) => (
              <tr key={model.id}>
                <td>{model.displayName}</td>
                <td><span className="tag">{model.lane}</span></td>
                <td>{`${money(model.inputCentsPerMTok)} ${t('perMillion', lang)}`}</td>
                <td>{`${money(model.outputCentsPerMTok)} ${t('perMillion', lang)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataState>
      {/* Outside the data states on purpose: the palette is a local preference, so it must be
          reachable even while the company and the model list are still loading or unreachable. */}
      <PaletteSetting lang={lang} />
      <SkinSetting lang={lang} />
    </Panel>
  );
}
