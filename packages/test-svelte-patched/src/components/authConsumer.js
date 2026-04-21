import { subscribeExternal } from '../hooks/subscribeExternal.js';

// Consumer receives the store as a parameter — terser can't inline.
export function renderAuth(authStore, element) {
  const unsubscribeIdentity = subscribeExternal(authStore.identity, (identity) => {
    element.identity = identity;
  });
  const unsubscribeSignedIn = subscribeExternal(authStore.isSignedIn, (signedIn) => {
    element.signedIn = signedIn;
  });
  const unsubscribeState = subscribeExternal(authStore.serviceState, (state) => {
    element.state = state;
  });
  return () => {
    unsubscribeIdentity();
    unsubscribeSignedIn();
    unsubscribeState();
  };
}
