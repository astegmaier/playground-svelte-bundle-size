import { writable, derived } from 'svelte/store';

export function createThemeStore(initial = 'light') {
  const theme = writable(initial);
  const isDark = derived(theme, ($theme) => $theme === 'dark');
  const tokens = derived(theme, ($theme) =>
    $theme === 'dark'
      ? { bg: '#111', fg: '#eee' }
      : { bg: '#fff', fg: '#111' },
  );

  return {
    theme: { subscribe: theme.subscribe },
    isDark: { subscribe: isDark.subscribe },
    tokens: { subscribe: tokens.subscribe },
    setTheme: (next) => theme.set(next),
    toggle: () =>
      theme.update((current) => (current === 'light' ? 'dark' : 'light')),
  };
}
