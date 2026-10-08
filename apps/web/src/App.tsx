/**
 * The shell — the prototype's organisation, on real data.
 *
 * Sidebar: brand, the workspace menu (save to file / load from file / start over — the one-file
 * save, REQ-11), the nav, and the owner card. Topbar: rail toggle, breadcrumb, search (⌘K),
 * theme, language, and the bell that counts the decisions waiting in the inbox. Footer fixed on
 * every page. The per-screen head (pixel title + one line) lives in each view via ScreenHead,
 * exactly as the prototype draws it.
 */
import { useEffect, useMemo, useState } from 'react';
import { VIEWS, type ViewId } from '@company/contracts';
import { t, type Lang } from './lib/i18n';
import { applyCustomAccent, deriveAccent } from './lib/accent';
import { api } from './lib/api';
import {
  applyPalette, applyTheme, nextTheme, readCustomAccent, readPalette, readTheme, resolvedTheme, type Theme,
} from './lib/theme';
import { FX, RAIL, applyAttr, onPrefsChange, readFx, readRail, safeGet, safeSet, saveAttr } from './lib/prefs';
import { useStore } from './data/store';
import { Icon } from './components/Icon';
import { Dialog } from './components/Dialog';
import { localized } from './lib/format';
import { TeamView } from './views/TeamView';
import { TasksView } from './views/TasksView';
import { InboxView } from './views/InboxView';
import { CommsView } from './views/CommsView';
import { NetworkView } from './views/NetworkView';
import { WorldView } from './views/WorldView';
import { SettingsView } from './views/SettingsView';
import type { DataStateKind } from './components/DataState';

const LANG_KEY = 'company-os.lang';

function readLang(): Lang {
  try {
    return safeGet(LANG_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function readView(): ViewId {
  const hash = location.hash.replace('#', '') as ViewId;
  return VIEWS.some((v) => v.id === hash) ? hash : 'team';
}

function applyCustomAccentForTheme() {
  if (readPalette() !== 'custom') {
    applyCustomAccent(null);
    return;
  }
  const styles = getComputedStyle(document.documentElement);
  const surfaces = ['--bg', '--side', '--surface', '--raised', '--hover']
    .map((name) => styles.getPropertyValue(name).trim())
    .filter(Boolean);
  applyCustomAccent(deriveAccent(readCustomAccent(), resolvedTheme(), surfaces));
}

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
  const [fx, setFx] = useState(readFx);
  const [rail, setRail] = useState(readRail);
  const [health, setHealth] = useState<{ version: string; company: string | null } | null>(null);
  const [openDecisions, setOpenDecisions] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const company = useStore((s) => s.company.name);
  const operator = useStore((s) => s.operator);

  const [forcedState, setForcedState] = useState<DataStateKind | undefined>(readForcedState);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    safeSet(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyPalette(readPalette());
  }, []);

  useEffect(() => {
    applyAttr(FX, readFx());
    applyAttr(RAIL, readRail());
    setFx(readFx());
    setRail(readRail());
    const reload = () => {
      setFx(readFx());
      setRail(readRail());
      applyCustomAccentForTheme();
    };
    return onPrefsChange(reload);
  }, []);

  useEffect(() => {
    applyCustomAccentForTheme();
  }, [theme, view]);

  useEffect(() => {
    const onHash = () => {
      setView(readView());
      setForcedState(readForcedState());
      requestAnimationFrame(() => document.getElementById('page-title')?.focus());
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
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

  /** The one-file save, both directions (REQ-11). */
  const exportSave = () => {
    const { company: c, operator: o, agents, tasks, decisions, threads, models } = useStore.getState();
    const payload = { product: 'company.ai', version: 1, exportedAt: new Date().toISOString(), company: c, operator: o, agents, tasks, decisions, threads, models };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'company.ai-save.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setSaveNote(t('exportSave', lang));
  };
  const importSave = (file: File) => {
    file.text()
      .then((text) => {
        const data = JSON.parse(text) as Record<string, unknown>;
        if (!data || typeof data !== 'object' || !('company' in data) || !Array.isArray((data as { agents?: unknown }).agents)) {
          throw new Error('not a company.ai save');
        }
        useStore.getState().load(data);
        setSaveNote(t('importSave', lang));
        location.reload();
      })
      .catch(() => setSaveNote('—'));
  };

  const viewLabel = (id: ViewId) => {
    const item = VIEWS.find((v) => v.id === id);
    return lang === 'ar' ? item?.labelAr ?? id : item?.label ?? id;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const state = useStore.getState();
    const out: Array<{ kind: string; label: string; to: ViewId }> = [];
    for (const v of VIEWS) {
      if (`${v.label} ${v.labelAr}`.toLowerCase().includes(q)) out.push({ kind: 'page', label: lang === 'ar' ? v.labelAr : v.label, to: v.id });
    }
    for (const a of state.agents) {
      if (`${a.name} ${a.role} ${a.nameAr ?? ''}`.toLowerCase().includes(q)) out.push({ kind: 'person', label: localized(a.name, a.nameAr, lang), to: 'team' });
    }
    for (const task of state.tasks) {
      if (`${task.title} ${task.shortRef} ${task.titleAr ?? ''}`.toLowerCase().includes(q)) out.push({ kind: 'task', label: `${task.shortRef} · ${localized(task.title, task.titleAr, lang)}`, to: 'tasks' });
    }
    for (const thread of state.threads) {
      if (thread.title.toLowerCase().includes(q)) out.push({ kind: 'thread', label: thread.title, to: 'comms' });
    }
    return out.slice(0, 9);
  }, [query, lang]);

  const viewProps = { lang, ...(forcedState ? { forcedState } : {}) };

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{t('skip', lang)}</a>

      <aside className="sidebar" aria-label={t('brand', lang)}>
        <div className="brand">
          <img className="brandmark-img" src="./icon.svg" alt="" aria-hidden="true" />
          <span className="brand-text">
            {t('brand', lang)}
            <small>{t('brandSub', lang)}</small>
          </span>
        </div>

        <details className="workspace">
          <summary aria-label={t('workspace', lang)}>
            <span className="workspace-mark" aria-hidden="true">{company.slice(0, 1)}</span>
            <span className="workspace-name">{company}</span>
            <Icon name="menu" />
          </summary>
          <div className="workspace-menu" role="menu">
            <button type="button" role="menuitem" onClick={exportSave}>{t('exportSave', lang)}</button>
            <label role="menuitem" className="workspace-import">
              {t('importSave', lang)}
              <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importSave(f); e.target.value = ''; }} />
            </label>
            <button type="button" role="menuitem" onClick={() => { useStore.getState().reset(); setSaveNote(t('startOver', lang)); }}>{t('startOver', lang)}</button>
            {saveNote ? <p role="status" className="muted small">{saveNote}</p> : null}
          </div>
        </details>

        <nav>
          <ul className="navlist">
            {VIEWS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="navitem"
                  data-nav={item.id}
                  aria-label={lang === 'ar' ? item.labelAr : item.label}
                  title={lang === 'ar' ? item.labelAr : item.label}
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <Icon name={item.icon} />
                  <span className="navlabel">{lang === 'ar' ? item.labelAr : item.label}</span>
                  {item.id === 'inbox' && openDecisions !== null && openDecisions > 0 && (
                    <span className="count">{openDecisions}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="owner-card">
          <span className="workspace-mark" aria-hidden="true">{operator.name.slice(0, 1)}</span>
          <span>
            <strong>{operator.name}</strong>
            <small>{t('owner', lang)}</small>
          </span>
        </div>
      </aside>

      <header className="topbar">
        <button
          type="button"
          className="rail-toggle icon-btn"
          data-action="rail"
          aria-expanded={!rail}
          aria-label={rail ? t('expandRail', lang) : t('collapseRail', lang)}
          onClick={() => saveAttr(RAIL, !rail)}
        >
          <Icon name="menu" />
        </button>
        <div className="breadcrumb" aria-label={company}>
          <span>{company}</span>
          <span aria-hidden="true">/</span>
          <strong>{viewLabel(view)}</strong>
        </div>
        <span className="spacer" />
        <button type="button" className="btn small search-trigger" data-action="search" onClick={() => setSearchOpen(true)}>
          <Icon name="search" />
          <span className="search-words">{t('searchTrigger', lang)}</span>
          <kbd className="kbd"> K</kbd>
        </button>
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
        <button
          type="button"
          className="btn small icon-btn bell"
          data-action="notifications"
          aria-label={t('notifications', lang)}
          onClick={() => navigate('inbox')}
        >
          <Icon name="inbox" />
          {openDecisions !== null && openDecisions > 0 && <span className="unread" aria-hidden="true" />}
        </button>
      </header>

      <main className="main" id="main">
        {view === 'team' && <TeamView {...viewProps} />}
        {view === 'tasks' && <TasksView {...viewProps} />}
        {view === 'inbox' && <InboxView {...viewProps} />}
        {view === 'comms' && <CommsView {...viewProps} />}
        {view === 'network' && <NetworkView {...viewProps} />}
        {view === 'world' && <WorldView {...viewProps} />}
        {view === 'settings' && <SettingsView {...viewProps} />}
      </main>

      {fx && <div className="fx-overlay" data-fx-overlay aria-hidden="true" />}

      <footer className="statusbar">
        <span className="dot" aria-hidden="true">▪</span>
        <span>{health ? `${health.company ?? '—'} · ${t('online', lang)}` : t('loading', lang)}</span>
        <span className="spacer" style={{ flex: 1 }} />
        <span>{`company.ai ${health?.version ?? ''}`}</span>
      </footer>

      <Dialog open={searchOpen} onClose={() => { setSearchOpen(false); setQuery(''); }} title={t('searchTitle', lang)} eyebrow={t('workspace', lang)} lang={lang}>
        <label className="field">
          <span className="small muted">{t('searchNote', lang)}</span>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchTrigger', lang)}
            aria-label={t('searchTrigger', lang)}
          />
        </label>
        <ul className="search-results" aria-live="polite">
          {results.map((r) => (
            <li key={`${r.kind}-${r.label}`}>
              <button type="button" onClick={() => { navigate(r.to); setSearchOpen(false); setQuery(''); }}>
                <span className="tag">{r.kind}</span> {r.label}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
