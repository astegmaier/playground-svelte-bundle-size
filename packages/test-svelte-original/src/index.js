import { createAuthStore } from './stores/authStore.js';
import { createRouterStore } from './stores/routerStore.js';
import { createThemeStore } from './stores/themeStore.js';
import { createWorkspacesStore } from './stores/workspacesStore.js';
import { createPagesStore } from './stores/pagesStore.js';

import { renderAuth } from './components/authConsumer.js';
import { renderRouter } from './components/routerConsumer.js';
import { renderTheme } from './components/themeConsumer.js';
import { renderWorkspaces } from './components/workspacesConsumer.js';
import { renderPages } from './components/pagesConsumer.js';

const fakeWorkspaceModel = {
  listeners: new Set(),
  on(_evt, fn) { this.listeners.add(fn); },
  off(_evt, fn) { this.listeners.delete(fn); },
  fetch: async () => [{ id: 'w1', name: 'Team' }],
};

const initialIdentity = location.hash ? { id: location.hash.slice(1) } : null;
const initialTheme = document.cookie.includes('dark') ? 'dark' : 'light';

const authStore = createAuthStore(initialIdentity);
const routerStore = createRouterStore();
const themeStore = createThemeStore(initialTheme);
const workspacesStore = createWorkspacesStore(fakeWorkspaceModel);
const pagesStore = createPagesStore();

const element = {};
const unsubscribers = [
  renderAuth(authStore, element),
  renderRouter(routerStore, element),
  renderTheme(themeStore, element),
  renderWorkspaces(workspacesStore, element),
  renderPages(pagesStore, element),
];

const driver = JSON.parse(location.search.slice(1) || '{"id":"user-1","path":"/home"}');
authStore.signIn({ id: driver.id });
routerStore.navigate(driver.path);
themeStore.toggle();
workspacesStore.refresh();
pagesStore.add({ id: 'p1', title: 'Hello' });

window.__demo = {
  element,
  authStore,
  routerStore,
  themeStore,
  workspacesStore,
  pagesStore,
  unsubscribers,
};
