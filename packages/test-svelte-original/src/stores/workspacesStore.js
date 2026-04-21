import { writable, derived, readable, get } from 'svelte/store';

export function createWorkspacesStore(workspaceModel) {
  const workspaces = writable([]);
  const count = derived(workspaces, ($ws) => $ws.length);
  const hasAny = derived(count, ($c) => $c > 0);

  const events = readable(null, (set) => {
    workspaceModel.on('change', set);
    return () => workspaceModel.off('change', set);
  });

  async function refresh() {
    const data = await workspaceModel.fetch();
    workspaces.set(data);
  }

  return {
    workspaces: { subscribe: workspaces.subscribe, get: () => get(workspaces) },
    count: { subscribe: count.subscribe },
    hasAny: { subscribe: hasAny.subscribe },
    events: { subscribe: events.subscribe },
    refresh,
  };
}
