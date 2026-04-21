import { writable, derived, get } from 'svelte/store';

export function createPagesStore() {
  const pages = writable([]);
  const selected = writable(null);
  const selectedPage = derived([pages, selected], ([$pages, $selected]) =>
    $pages.find((page) => page.id === $selected),
  );

  return {
    pages: { subscribe: pages.subscribe, get: () => get(pages) },
    selected: { subscribe: selected.subscribe },
    selectedPage: { subscribe: selectedPage.subscribe },
    select: (id) => selected.set(id),
    add: (page) => pages.update((list) => [...list, page]),
    remove: (id) => pages.update((list) => list.filter((p) => p.id !== id)),
  };
}
