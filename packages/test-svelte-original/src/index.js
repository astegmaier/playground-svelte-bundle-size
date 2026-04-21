// Mirrors how a private repo uses svelte: as a reactive store library,
// called from non-svelte code, across several independent consumer modules.
// Each consumer mimics a real call site (auth, routing, theming, etc.)
// to keep multiple store code paths live and prevent terser from inlining
// everything down to constants.
import { writable, readable, derived, get } from 'svelte/store';

// --- auth-like module -----------------------------------------------------
const token = writable(null);
const isSignedIn = derived(token, ($token) => $token !== null);
function signIn(value) {
  token.set(value);
}
function signOut() {
  token.set(null);
}

// --- router-like module ---------------------------------------------------
const route = writable({ path: '/', params: {} });
const currentPath = derived(route, ($route) => $route.path);
function navigate(path, params = {}) {
  route.update((prev) => ({ ...prev, path, params }));
}

// --- theme-like module ----------------------------------------------------
const theme = writable('light');
const isDark = derived(theme, ($theme) => $theme === 'dark');
function toggleTheme() {
  theme.update((current) => (current === 'light' ? 'dark' : 'light'));
}

// --- clock-like module ----------------------------------------------------
const clock = readable(new Date(), (set) => {
  const id = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(id);
});

// --- combined view --------------------------------------------------------
const appState = derived(
  [isSignedIn, currentPath, isDark],
  ([$signedIn, $path, $dark]) => ({ signedIn: $signedIn, path: $path, dark: $dark }),
);

// Exercise the API surface so webpack keeps each store alive.
signIn('abc');
navigate('/home');
toggleTheme();

// Assign to window so nothing gets tree-shaken away as completely unused.
window.__demo = {
  token,
  isSignedIn,
  route,
  currentPath,
  theme,
  isDark,
  clock,
  appState,
  actions: { signIn, signOut, navigate, toggleTheme },
  snapshot: get(appState),
};
