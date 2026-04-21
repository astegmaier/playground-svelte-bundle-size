import { writable, derived, get } from 'svelte/store';

export function createRouterStore() {
  const location = writable({ path: '/', params: {} });
  const currentPath = derived(location, ($loc) => $loc.path);
  const currentParams = derived(location, ($loc) => $loc.params);

  return {
    location: { subscribe: location.subscribe, get: () => get(location) },
    currentPath: { subscribe: currentPath.subscribe },
    currentParams: { subscribe: currentParams.subscribe },
    navigate: (path, params = {}) => location.set({ path, params }),
    replace: (updater) => location.update(updater),
  };
}
