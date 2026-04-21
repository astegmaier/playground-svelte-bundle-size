import { subscribeExternal } from '../hooks/subscribeExternal.js';

export function renderRouter(routerStore, element) {
  const unPath = subscribeExternal(routerStore.currentPath, (path) => {
    element.path = path;
  });
  const unParams = subscribeExternal(routerStore.currentParams, (params) => {
    element.params = params;
  });
  const unLocation = subscribeExternal(routerStore.location, (location) => {
    element.location = location;
  });
  return () => {
    unPath();
    unParams();
    unLocation();
  };
}
