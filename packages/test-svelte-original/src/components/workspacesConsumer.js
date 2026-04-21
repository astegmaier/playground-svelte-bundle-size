import { subscribeExternal } from '../hooks/subscribeExternal.js';

export function renderWorkspaces(workspacesStore, element) {
  const un1 = subscribeExternal(workspacesStore.workspaces, (list) => (element.list = list));
  const un2 = subscribeExternal(workspacesStore.count, (count) => (element.count = count));
  const un3 = subscribeExternal(workspacesStore.hasAny, (has) => (element.hasAny = has));
  const un4 = subscribeExternal(workspacesStore.events, (event) => (element.lastEvent = event));
  return () => {
    un1();
    un2();
    un3();
    un4();
  };
}
