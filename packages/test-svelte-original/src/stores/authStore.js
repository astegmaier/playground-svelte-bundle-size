import { writable, readable, derived, get } from 'svelte/store';

export function createAuthStore(initialIdentity) {
  const identity = writable(initialIdentity);
  const serviceState = readable({ status: 'idle' }, (set) => {
    const id = setInterval(() => set({ status: 'idle', at: Date.now() }), 5000);
    return () => clearInterval(id);
  });
  const isSignedIn = derived(identity, ($id) => $id !== null);

  return {
    identity: { subscribe: identity.subscribe, get: () => get(identity) },
    serviceState: { subscribe: serviceState.subscribe },
    isSignedIn: { subscribe: isSignedIn.subscribe },
    signIn: (next) => identity.set(next),
    signOut: () => identity.set(null),
  };
}
