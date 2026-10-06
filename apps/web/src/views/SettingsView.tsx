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
import { applyPalette, paletteNameKey, readPalette, type PaletteId } from '../lib/theme';
import { palettes } from '@company/tokens';

/**
 * The palette control. A swatch shows the preset's accent, the pressed state is announced rather
 * than coloured in (aria-pressed), and the choice is applied to the document immediately — the
 * same instant response the owner's demo gives, minus the inline colour writing.
 */
function PaletteSetting({ lang }: { lang: Lang }) {
  const [chosen, setChosen] = useState<PaletteId>(readPalette);
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
            onClick={() => setChosen(applyPalette(preset.id))}
          >
            <span className="palette-chip" style={{ '--chip': preset.chip } as CSSProperties} aria-hidden="true" />
            <span>{t(paletteNameKey(preset.id), lang)}</span>
          </button>
        ))}
      </div>
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
    </Panel>
  );
}
