// Mimics the shape of React's `useSyncExternalStore` adapter. In the real
// codebase, a Readable is passed in from a caller, so terser can't prove
// which concrete store implementation is used.
export function subscribeExternal(store, onSnapshot) {
  // Destructure `.subscribe` so it's pulled off the store as a method
  // reference — the very pattern used in the real codebase.
  const { subscribe } = store;
  return subscribe((value) => onSnapshot(value));
}
