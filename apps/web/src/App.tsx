/**
 * The shell.
 *
 * Structure mirrors the designer's demo exactly — sidebar, topbar, main slot, status strip —
 * and the view ids come from @company/contracts, which a test checks against the demo file.
 * Routing is hash-based (`#tasks`) because that is what the demo does; the difference is that
 * this shell fetches real data from the API.
 *
 * Preferences (theme, language) persist the same way the demo persists them, and Arabic
 * switches the document to `dir="rtl"` so every logical property in the CSS takes effect.
 */
import { useEffect, useState } from 'react';
import { VIEWS, type ViewId } from '@company/contracts';
import { t, type Lang } from './lib/i18n';
import { api } from './lib/api';
import { applyTheme, nextTheme, readTheme, type Theme } from './lib/theme';
import { TeamView } from './views/TeamView';
import { TasksView } from './views/TasksView';
import { InboxView } from './views/InboxView';
import { CommsView } from './views/CommsView';
import { NetworkView } from './views/NetworkView';
import { SettingsView } from './views/SettingsView';
import type { DataStateKind } from './components/DataState';

const LANG_KEY = 'company-os.lang';

function readLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function readView(): ViewId {
  const hash = location.hash.replace('#', '') as ViewId;
  return VIEWS.some((v) => v.id === hash) ? hash : 'team';
}

/** The state preview from the address bar, or nothing. */
function readForcedState(): DataStateKind | undefined {
  const state = new URLSearchParams(location.search).get('state');
  return state === 'loading' || state === 'empty' || state === 'error' || state === 'restricted'
    ? state
    : undefined;
}

export function App() {
  const [view, setView] = useState<ViewId>(readView);
  const [lang, setLang] = useState<Lang>(readLang);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [health, setHealth] = useState<{ version: string; company: string | null } | null>(null);
  const [openDecisions, setOpenDecisions] = useState<number | null>(null);

  /**
   * `?state=empty` in the address bar forces a data state — the demo's state preview, kept.
   * Reading the query is deliberately part of the navigation: the demo resets its preview when
   * someone switches views, and without that a forgotten `?state=error` would follow you around
   * the product (which is exactly how it behaved until the browser check caught it).
   */
  const [forcedState, setForcedState] = useState<DataStateKind | undefined>(readForcedState);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* preference does not persist in private mode */
    }
  }, [lang]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      setView(readView());
      setForcedState(readForcedState());
      // The demo's `head()` focuses its title when a screen changes, so a screen-reader user hears
      // where they have arrived instead of being left at the link they clicked.
      requestAnimationFrame(() => document.getElementById('page-title')?.focus());
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api.health()
      .then((r) => setHealth({ version: r.version, company: r.company }))
      .catch(() => setHealth(null));
    api.decisions('pending')
      .then((r) => setOpenDecisions(r.decisions.length))
      .catch(() => setOpenDecisions(null));
  }, [view]);

  const navigate = (id: ViewId) => {
    location.hash = id;
    setView(id);
  };

  const viewProps = { lang, ...(forcedState ? { forcedState } : {}) };

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{t('skip', lang)}</a>

      <aside className="sidebar" aria-label={t('team', lang)}>
        <div className="brand">
          <span className="brandmark" aria-hidden="true">[a]</span>
          <span>
            {t('brand', lang)}
            <small>{t('brandSub', lang)}</small>
          </span>
        </div>
        <nav>
          <ul className="navlist">
            {VIEWS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="navitem"
                  data-nav={item.id}
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <span>{lang === 'ar' ? item.labelAr : item.label}</span>
                  {item.id === 'inbox' && openDecisions !== null && (
                    <span className="count">{openDecisions}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <header className="topbar">
        <h1>{lang === 'ar' ? VIEWS.find((v) => v.id === view)?.labelAr : VIEWS.find((v) => v.id === view)?.label}</h1>
        <span className="spacer" />
        <button
          type="button"
          className="btn small"
          data-action="theme"
          onClick={() => setTheme((current) => nextTheme(current))}
          aria-label={`${t('theme', lang)}: ${theme}`}
        >
          {theme}
        </button>
        <button
          type="button"
          className="btn small"
          data-action="language"
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        >
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
      </header>

      <main className="main" id="main">
        {view === 'team' && <TeamView {...viewProps} />}
        {view === 'tasks' && <TasksView {...viewProps} />}
        {view === 'inbox' && <InboxView {...viewProps} />}
        {view === 'comms' && <CommsView {...viewProps} />}
        {view === 'network' && <NetworkView {...viewProps} />}
        {view === 'settings' && <SettingsView {...viewProps} />}
      </main>

      <footer className="statusbar">
        <span className="dot" aria-hidden="true">▪</span>
        <span>{health ? `${health.company ?? '—'} · ${t('online', lang)}` : t('loading', lang)}</span>
        <span className="spacer" style={{ flex: 1 }} />
        <span>{`company.os ${health?.version ?? ''}`}</span>
      </footer>
    </div>
  );
}
