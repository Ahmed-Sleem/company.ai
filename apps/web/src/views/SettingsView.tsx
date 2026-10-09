/**
 * Settings — the company and the model registry. The prices shown are the ones the ledger
 * actually bills with, so the number here and the number on an agent's meter can never differ.
 *
 * Appearance carries the palette control borrowed from the owner's demo: five presets, the
 * design source's own colours first, each one working in dark and light. The chosen preset is a
 * preference, not data, so it is applied here and remembered locally — the same as the theme.
 */
import { useState, type CSSProperties } from 'react';
import { t, type Lang } from '../lib/i18n';
import { ScreenHead } from '../components/ScreenHead';
import { DataState, type DataStateKind } from '../components/DataState';
import {
  applyPalette, applyTheme, paletteNameKey, readCustomAccent, readPalette, readTheme, resolvedTheme,
  saveCustomAccent, type PaletteChoice, type Theme, DEFAULT_CUSTOM_ACCENT,
} from '../lib/theme';
import { readFx, readRail, setFx, setLangPref, setRail } from '../lib/prefs';
import { readWorkHours, saveWorkHours } from '../lib/schedule';
import { runTick } from '../lib/engine';
import { downloadSave, parseSave, resetSave } from '../lib/savefile';
import { useStore } from '../data/store';
import { Icon } from '../components/Icon';
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

function ScheduleSetting({ lang }: { lang: Lang }) {
  const [hours, setHours] = useState(readWorkHours);
  const change = (patch: Partial<{ start: number; end: number }>) => {
    const next = { ...hours, ...patch };
    setHours(next);
    saveWorkHours(next);
  };
  const hourOptions = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div className="setting">
      <div>
        <h3>{t('workStart', lang)} / {t('workEnd', lang)}</h3>
      </div>
      <span className="row">
        <select data-settings="work-start" value={hours.start} aria-label={t('workStart', lang)}
          onChange={(e) => change({ start: Number(e.target.value) })}>
          {hourOptions.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
        </select>
        <select data-settings="work-end" value={hours.end} aria-label={t('workEnd', lang)}
          onChange={(e) => change({ end: Number(e.target.value) })}>
          {hourOptions.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
        </select>
      </span>
    </div>
  );
}

export function SettingsView({ lang, forcedState }: { lang: Lang; forcedState?: DataStateKind }) {
  const company = useStore((s) => s.company);
  const operatorName = useStore((s) => s.operator.name);
  const load = useStore((s) => s.load);
  const reopenIntro = useStore((s) => s.reopenIntro);
  const [form, setForm] = useState({
    company: company.name,
    description: company.description,
    answers: company.answers,
    operator: operatorName,
  });
  const [note, setNote] = useState<string | null>(null);

  const state: DataStateKind = forcedState && forcedState !== 'default' ? forcedState : 'default';

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    // The whole profile the intro collected stays editable here (REQ-15) — the team reads it
    // from the same save the wizard wrote (REQ-16).
    load({
      company: {
        name: form.company.trim(),
        description: form.description.trim(),
        answers: form.answers.filter((a) => a.q.trim() !== '' || a.a.trim() !== ''),
      },
      operator: { name: form.operator.trim(), role: 'owner' },
    });
    setNote(t('saveChanges', lang));
  };

  const importFile = (file: File) => {
    file.text()
      .then((text) => {
        load(parseSave(text));
        setNote(t('importSave', lang));
        location.reload();
      })
      .catch(() => setNote('—'));
  };

  return (
    <>
      <ScreenHead
        eyebrow={`${t('settings', lang)} / ${t('overview', lang)}`}
        title={t('headSettings', lang)}
        subtitle={t('settingsNote', lang)}
      />
      <div className="pagebody">
        {/* The state block sits above, never around: appearance is a local preference, so the
            palette, the theme and the toggles stay reachable while a fetch fails or loads. */}
        {state !== 'default' ? <DataState state={state} lang={lang} onRetry={() => location.reload()} /> : null}
        <div className="settings-main">
            <div className="settings-main">
              <section className="panel panel-pad settings-section">
                <h2>{t('appearance', lang)}</h2>
                <ThemeSetting lang={lang} />
                <PaletteSetting lang={lang} />
                <div className="setting">
                  <div>
                    <h3>{t('language', lang)}</h3>
                    <p>{t('languageNote', lang)}</p>
                  </div>
                  <select
                    aria-label={t('language', lang)}
                    value={lang}
                    onChange={(event) => setLangPref(event.target.value === 'ar' ? 'ar' : 'en')}
                  >
                    <option value="en">English · LTR</option>
                    <option value="ar">العربية · RTL</option>
                  </select>
                </div>
                <SkinSetting lang={lang} />
              </section>

              <section className="panel panel-pad settings-section">
                <h2>{t('companyProfile', lang)}</h2>
                <form className="form-grid" onSubmit={saveProfile}>
                  <label className="field">
                    {t('companyNameLabel', lang)}
                    <input
                      required maxLength={40} value={form.company}
                      onChange={(event) => setForm((f) => ({ ...f, company: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    {t('yourNameLabel', lang)}
                    <input
                      required maxLength={40} value={form.operator}
                      onChange={(event) => setForm((f) => ({ ...f, operator: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    {t('companyDescLabel', lang)}
                    <textarea
                      rows={2} value={form.description}
                      onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                    />
                  </label>
                  <div className="field">
                    <span>{t('customAnswersTitle', lang)}</span>
                    {form.answers.map((row, i) => (
                      <div className="answer-row" key={i}>
                        <label className="field">
                          <span className="sr-only">{t('questionLabel', lang)}</span>
                          <input value={row.q} placeholder={t('questionLabel', lang)}
                            onChange={(event) => setForm((f) => ({
                              ...f,
                              answers: f.answers.map((r, j) => (j === i ? { ...r, q: event.target.value } : r)),
                            }))} />
                        </label>
                        <label className="field grow">
                          <span className="sr-only">{t('answerLabel', lang)}</span>
                          <input value={row.a} placeholder={t('answerLabel', lang)}
                            onChange={(event) => setForm((f) => ({
                              ...f,
                              answers: f.answers.map((r, j) => (j === i ? { ...r, a: event.target.value } : r)),
                            }))} />
                        </label>
                        <button type="button" className="btn small ghost"
                          aria-label={`${t('removeRow', lang)} ${row.q}`}
                          onClick={() => setForm((f) => ({ ...f, answers: f.answers.filter((_, j) => j !== i) }))}>
                          <Icon name="close" />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn small"
                      onClick={() => setForm((f) => ({ ...f, answers: [...f.answers, { q: '', a: '' }] }))}>
                      <Icon name="plus" />{t('addAnswer', lang)}
                    </button>
                  </div>
                  <div className="full">
                    <button className="btn" type="submit">{t('saveChanges', lang)}</button>
                  </div>
                </form>
              </section>

              <section className="panel panel-pad settings-section">
                <h2>{t('scheduleTitle', lang)}</h2>
                <p className="small dim">{t('scheduleNote', lang)}</p>
                <ScheduleSetting lang={lang} />
                <div className="setting">
                  <div>
                    <h3>{t('tickTitle', lang)}</h3>
                    <p>{t('tickNote', lang)}</p>
                  </div>
                  <button type="button" className="btn" data-settings="tick"
                    onClick={() => setNote(runTick(lang, true) ?? t('liveIdle', lang))}>
                    <Icon name="play" />{t('tickTitle', lang)}
                  </button>
                </div>
              </section>

              <section className="panel panel-pad settings-section">
                <h2>{t('sessionTitle', lang)}</h2>
                {/* the owner's door back to the front door (C33): the wizard reopens over the
                    current company in edit mode — nothing is lost, everything is re-editable */}
                <div className="setting">
                  <div>
                    <h3>{t('reopenIntro', lang)}</h3>
                    <p>{t('reopenIntroNote', lang)}</p>
                  </div>
                  <button type="button" className="btn" data-settings="reopen-intro" onClick={reopenIntro}>
                    <Icon name="play" />{t('reopenIntro', lang)}
                  </button>
                </div>
                <div className="setting">
                  <div>
                    <h3>{t('exportTitle', lang)}</h3>
                    <p>{t('exportNote', lang)}</p>
                  </div>
                  <button type="button" className="btn" onClick={() => { downloadSave(); setNote(t('exportSave', lang)); }}>
                    <Icon name="file" />{t('exportSave', lang)}
                  </button>
                </div>
                <div className="setting">
                  <div>
                    <h3>{t('importTitle', lang)}</h3>
                    <p>{t('importNote', lang)}</p>
                  </div>
                  <label className="btn filebtn">
                    <Icon name="attach" />{t('importSave', lang)}
                    <input
                      type="file" accept="application/json"
                      onChange={(event) => {
                        const f = event.target.files?.[0];
                        if (f) importFile(f);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <div className="setting">
                  <div>
                    <h3>{t('resetTitle', lang)}</h3>
                    <p>{t('resetNote', lang)}</p>
                  </div>
                  <button type="button" className="btn danger" onClick={() => { resetSave(); setNote(t('startOver', lang)); }}>
                    {t('reset', lang)}
                  </button>
                </div>
                {note ? <p role="status" className="small muted">{note}</p> : null}
              </section>
            </div>

        </div>
      </div>
    </>
  );
}

/** The theme choice as three samples, like the prototype's — pressed state announced, not guessed. */
function ThemeSetting({ lang }: { lang: Lang }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  return (
    <div className="setting">
      <div>
        <h3>{t('themeTitle', lang)}</h3>
        <p>{t('themeNote', lang)}</p>
      </div>
      <div className="theme-options" role="group" aria-label={t('themeTitle', lang)}>
        {(['dark', 'light', 'system'] as Theme[]).map((mode) => (
          <button
            type="button" key={mode} className="theme-option"
            aria-pressed={theme === mode}
            onClick={() => { setTheme(mode); applyTheme(mode); }}
          >
            <span className="theme-sample" data-theme={mode} aria-hidden="true" />
            {t(mode === 'dark' ? 'themeDark' : mode === 'light' ? 'themeLight' : 'themeSystem', lang)}
          </button>
        ))}
      </div>
    </div>
  );
}
