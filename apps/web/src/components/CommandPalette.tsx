/**
 * The command palette (REQ-44, owner seventh round) — one window for every jump and every
 * match, VS Code style: type to filter commands (go to a view, flip the theme or language,
 * open Help) and matches (people, tasks, threads) together; ↑↓ to move, Enter to run,
 * Esc to close, ⌘K to summon. The box wears the task-dialog language: centred, bordered,
 * dark field on top.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { t, type Lang } from '../lib/i18n';
import { localized } from '../lib/format';
import { useStore } from '../data/store';
import { VIEWS, type ViewId } from '@company/contracts';
import { Icon } from './Icon';

type Item = {
  key: string;
  /** 'command' entries run an action; 'match' entries are things found in the company. */
  group: 'command' | 'match';
  kind: string;
  label: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  lang,
  onClose,
  onNavigate,
  onToggleTheme,
  onToggleLanguage,
  onHelp,
}: {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  onNavigate: (id: ViewId) => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onHelp: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  /** A fresh opening starts clean — no stale query, selection back on top. */
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    // Focus after the box mounts so the caret is ready before the first keystroke.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Item[] = [];

    // Commands first — the palette is a launcher before it is a search.
    for (const v of VIEWS) {
      const label = lang === 'ar' ? v.labelAr : v.label;
      if (!q || `${v.label} ${v.labelAr}`.toLowerCase().includes(q)) {
        out.push({ key: `view-${v.id}`, group: 'command', kind: t('palGo', lang), label, run: () => onNavigate(v.id) });
      }
    }
    const toggles: Item[] = [
      { key: 'cmd-theme', group: 'command', kind: t('palDo', lang), label: t('theme', lang), run: onToggleTheme },
      { key: 'cmd-lang', group: 'command', kind: t('palDo', lang), label: lang === 'en' ? 'العربية' : 'English', run: onToggleLanguage },
      { key: 'cmd-help', group: 'command', kind: t('palDo', lang), label: t('helpOpen', lang), run: onHelp },
    ];
    for (const item of toggles) {
      if (!q || item.label.toLowerCase().includes(q)) out.push(item);
    }

    // Then the company itself: people, tasks, threads.
    if (q) {
      const state = useStore.getState();
      for (const a of state.agents) {
        if (`${a.name} ${a.role} ${a.nameAr ?? ''}`.toLowerCase().includes(q)) {
          out.push({ key: `agent-${a.id}`, group: 'match', kind: t('palPerson', lang), label: localized(a.name, a.nameAr, lang), run: () => onNavigate('team') });
        }
      }
      for (const task of state.tasks) {
        if (`${task.title} ${task.shortRef} ${task.titleAr ?? ''}`.toLowerCase().includes(q)) {
          out.push({ key: `task-${task.id}`, group: 'match', kind: t('palTask', lang), label: `${task.shortRef} · ${localized(task.title, task.titleAr, lang)}`, run: () => onNavigate('tasks') });
        }
      }
      for (const thread of state.threads) {
        if (thread.title.toLowerCase().includes(q)) {
          out.push({ key: `thread-${thread.id}`, group: 'match', kind: t('palThread', lang), label: thread.title, run: () => onNavigate('comms') });
        }
      }
    }
    return out.slice(0, 30);
  }, [query, lang, onNavigate, onToggleTheme, onToggleLanguage, onHelp]);

  /** The selection never points past the end of a shrinking list. */
  useEffect(() => {
    if (selected >= items.length) setSelected(Math.max(0, items.length - 1));
  }, [items, selected]);

  /** Keep the highlighted row in view as the arrows move it. */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const runItem = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(items[selected]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="palette-backdrop" data-palette="backdrop" onClick={onClose} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="palette panel" role="dialog" aria-modal="true" aria-label={t('searchTitle', lang)}
        data-palette="box" onClick={(e) => e.stopPropagation()}>
        <div className="palette-field">
          <Icon name="search" />
          <input
            ref={inputRef}
            data-action="search"
            value={query}
            placeholder={t('searchTrigger', lang)}
            aria-label={t('searchTitle', lang)}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
          />
        </div>
        <ul className="palette-list" ref={listRef} aria-live="polite">
          {items.map((item, i) => (
            <li key={item.key} data-index={i}>
              <button type="button" data-palette-item={item.key}
                className={i === selected ? 'is-on' : ''}
                onMouseEnter={() => setSelected(i)}
                onClick={() => runItem(item)}>
                <span className="tag">{item.kind}</span>
                <span className="palette-label">{item.label}</span>
              </button>
            </li>
          ))}
          {items.length === 0 ? <li className="palette-empty dim">{t('palEmpty', lang)}</li> : null}
        </ul>
        <p className="palette-foot small dim">{t('palFoot', lang)}</p>
      </div>
    </div>
  );
}
