/** Theme + palette, the same two preferences the demo exposes, stored the same way. */
export type Theme = 'dark' | 'light' | 'system';

const KEY = 'company-os.theme';

export function readTheme(): Theme {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return stored === 'light' || stored === 'system' ? stored : 'dark';
}

export function applyTheme(theme: Theme) {
  const resolved =
    theme === 'system'
      ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the preference simply does not persist */
  }
  return resolved;
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
}
