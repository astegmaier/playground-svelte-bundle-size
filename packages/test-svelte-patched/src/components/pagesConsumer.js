import { subscribeExternal } from '../hooks/subscribeExternal.js';

export function renderPages(pagesStore, element) {
  const un1 = subscribeExternal(pagesStore.pages, (list) => (element.pages = list));
  const un2 = subscribeExternal(pagesStore.selected, (id) => (element.selectedId = id));
  const un3 = subscribeExternal(pagesStore.selectedPage, (page) => (element.selectedPage = page));
  return () => {
    un1();
    un2();
    un3();
  };
}
