import { subscribeExternal } from '../hooks/subscribeExternal.js';

export function renderTheme(themeStore, element) {
  const un1 = subscribeExternal(themeStore.theme, (t) => (element.theme = t));
  const un2 = subscribeExternal(themeStore.isDark, (d) => (element.dark = d));
  const un3 = subscribeExternal(themeStore.tokens, (t) => (element.tokens = t));
  return () => {
    un1();
    un2();
    un3();
  };
}
