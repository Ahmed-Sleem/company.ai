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
import { FX, LANG_EVENT, LANG_KEY, RAIL, applyAttr, onPrefsChange, readFx, readRail, safeGet, safeSet, saveAttr } from './lib/prefs';
import { downloadSave, parseSave, resetSave } from './lib/savefile';
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
import { LandingView } from './views/LandingView';
import { IntroWizard } from './views/IntroWizard';
import type { DataStateKind } from './components/DataState';



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
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const company = useStore((s) => s.company.name);
  // Phase D (REQ-33): until the intro is finished — or the demo company chosen — the product
  // shows its front door instead of the shell. The save file does not even exist yet.
  const introDone = useStore((s) => s.introDone);
  const introDraft = useStore((s) => s.introDraft);
  const chooseDemo = useStore((s) => s.chooseDemo);
  const [starting, setStarting] = useState(false);
  const people = useStore((s) => s.agents.length);
  const openTasks = useStore((s) => s.tasks.filter((task) => task.stage !== 'done').length);
  const waiting = useStore((s) => s.decisions.filter((d) => d.status === 'pending').length);
  const savedAt = useStore((s) => s.savedAt);

  const [forcedState, setForcedState] = useState<DataStateKind | undefined>(readForcedState);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    safeSet(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    const onLang = (event: Event) => setLang((event as CustomEvent<'en' | 'ar'>).detail);
    window.addEventListener(LANG_EVENT, onLang);
    return () => window.removeEventListener(LANG_EVENT, onLang);
  }, []);

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

  // the phone drawer is body-class driven, exactly like the prototype's open-nav/close-nav
  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    return () => document.body.classList.remove('nav-open');
  }, [navOpen]);

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

  /** The one-file save, both directions (REQ-11) — the logic lives in lib/savefile. */
  const exportSave = () => {
    downloadSave();
    setSaveNote(t('exportSave', lang));
  };
  const importSave = (file: File) => {
    file.text()
      .then((text) => {
        useStore.getState().load(parseSave(text));
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

  /** The prototype's nav button, verbatim in shape: icon, the word, an optional count. */
  const navButton = (item: (typeof VIEWS)[number]) => {
    const label = lang === 'ar' ? item.labelAr : item.label;
    const count = item.id === 'inbox' ? (openDecisions ?? 0) : item.id === 'team' ? useStore.getState().agents.length : 0;
    return (
      <button
        key={item.id}
        type="button"
        className="navitem"
        data-nav={item.id}
        aria-label={count > 0 ? `${label} · ${count}` : label}
        data-rail-label={count > 0 ? `${label} · ${count}` : label}
        title={label}
        aria-current={view === item.id ? 'page' : undefined}
        onClick={() => { navigate(item.id); setNavOpen(false); }}
      >
        <Icon name={item.icon} />
        <span className="itemlabel">{label}</span>
        {count > 0 ? <span className="count">{count}</span> : null}
      </button>
    );
  };

  if (!introDone) {
    const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
    return starting ? (
      <IntroWizard lang={lang} onLanguage={toggleLang} />
    ) : (
      <LandingView
        lang={lang}
        resumable={introDraft !== null}
        onStart={() => setStarting(true)}
        onDemo={chooseDemo}
        onLanguage={toggleLang}
      />
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">{t('skip', lang)}</a>

      {/* ── the sidebar, exactly as the prototype draws it ─────────────────────────────── */}
      <aside className="sidebar" id="sidebar" aria-label={t('brand', lang)}>
        <div className="row">
          <div className="brand grow">
            <span className="brandmark" aria-hidden="true">[a]</span>
            <span>{t('brand', lang)}<small>{t('brandSub', lang)}</small></span>
          </div>
          <button type="button" className="btn ghost iconbtn nav-close" aria-label={t('closeNav', lang)} onClick={() => setNavOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        {/* the company — and, as the product's one-file save (REQ-11), the place where the
            workspace travels: export, import, start over. The demo's button becomes a menu. */}
        <div className="workspace-wrap">
          <button
            type="button"
            className="workspace"
            aria-label={`${company} · ${t('workspace', lang)}`}
            data-rail-label={`${company} · ${t('workspace', lang)}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="box" aria-hidden="true">{company.slice(0, 1).toUpperCase()}</span>
            <span className="grow">{company}</span>
            <Icon name="down" />
          </button>
          {menuOpen ? (
            <div className="workspace-menu" role="menu" aria-label={t('workspace', lang)}>
              <button type="button" role="menuitem" onClick={() => { exportSave(); setMenuOpen(false); }}>{t('exportSave', lang)}</button>
              <label role="menuitem" className="workspace-import">
                {t('importSave', lang)}
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importSave(f); e.target.value = ''; }}
                />
              </label>
              <button type="button" role="menuitem" onClick={() => { resetSave(); setSaveNote(t('startOver', lang)); setMenuOpen(false); }}>
                {t('startOver', lang)}
              </button>
              {saveNote ? <p role="status" className="small muted">{saveNote}</p> : null}
            </div>
          ) : null}
        </div>

        <nav className="navgroup" aria-label={t('workspace', lang)}>
          <p className="navlabel">{t('workspace', lang)}</p>
          {VIEWS.slice(0, 4).map(navButton)}
          <div className="navgap" aria-hidden="true" />
          {navButton(VIEWS[4]!)}
        </nav>

        <div className="sidebar-bottom">
          {navButton(VIEWS[5]!)}
          {navButton(VIEWS[6]!)}
        </div>
      </aside>

      {/* ── the app column: topbar, screen, statusbar — the prototype's .app ───────────── */}
      <div className="app">
        <header className="topbar" id="topbar">
          <div className="row">
            <button
              type="button"
              className="btn ghost iconbtn rail-toggle"
              data-action="rail"
              aria-controls="sidebar"
              aria-expanded={!rail}
              aria-label={rail ? t('expandRail', lang) : t('collapseRail', lang)}
              title={rail ? t('expandRail', lang) : t('collapseRail', lang)}
              onClick={() => saveAttr(RAIL, !rail)}
            >
              <Icon name="menu" />
            </button>
            <button
              type="button"
              className="btn ghost iconbtn mobile-nav"
              aria-controls="sidebar"
              aria-expanded={navOpen}
              aria-label={t('openNav', lang)}
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumb">
              <span>{company}</span>
              <span aria-hidden="true">/</span>
              <strong>{viewLabel(view)}</strong>
            </div>
          </div>
          <div className="top-actions">
            <button type="button" className="btn search-trigger" data-action="search" onClick={() => setSearchOpen(true)}>
              <Icon name="search" />
              <span className="grow">{t('searchTrigger', lang)}</span>
              <kbd className="kbd">⌘ K</kbd>
            </button>
            <button
              type="button"
              className="btn ghost iconbtn"
              data-action="theme"
              aria-label={`${t('theme', lang)}: ${theme}`}
              title={`${t('theme', lang)}: ${theme}`}
              onClick={() => setTheme((current) => nextTheme(current))}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button
              type="button"
              className="btn ghost"
              data-action="language"
              aria-label={lang === 'en' ? 'العربية' : 'English'}
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>
            <button
              type="button"
              className="btn ghost iconbtn notification"
              data-action="notifications"
              aria-label={t('notifications', lang)}
              onClick={() => navigate('inbox')}
            >
              <Icon name="bell" />
              {openDecisions !== null && openDecisions > 0 ? <span className="unread" aria-hidden="true" /> : null}
            </button>
          </div>
        </header>

        <main className="main" id="main" data-view={view}>
          <div className="view-anim" key={view}>
          {view === 'team' && <TeamView {...viewProps} />}
          {view === 'tasks' && <TasksView {...viewProps} />}
          {view === 'inbox' && <InboxView {...viewProps} />}
          {view === 'comms' && <CommsView {...viewProps} />}
          {view === 'network' && <NetworkView {...viewProps} />}
          {view === 'world' && <WorldView {...viewProps} />}
          {view === 'settings' && <SettingsView {...viewProps} />}
          </div>
        </main>

        {fx ? <div className="fx-overlay" data-fx-overlay aria-hidden="true" /> : null}

        <footer className="statusbar">
          <span><span className="dot" aria-hidden="true" />{health ? `${company} · ${t('online', lang)}` : t('loading', lang)}</span>
          <span className="secondary">
            {`${people} ${t('footPeople', lang)} · ${openTasks} ${t('footOpen', lang)} · ${waiting} ${t('footWaiting', lang)}`}
            {savedAt ? ` · ${t('footSaved', lang)} ${new Date(savedAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <span>{`company.ai ${health?.version ?? ''}`}</span>
        </footer>
      </div>

      {navOpen ? <button type="button" className="nav-scrim" aria-label={t('closeNav', lang)} onClick={() => setNavOpen(false)} /> : null}

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
    </>
  );
}
