import { writable, readable, derived, get } from 'svelte/store';

const count = writable(0);
const doubled = derived(count, ($count) => $count * 2);
const clock = readable(new Date(), (set) => {
  const id = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(id);
});

count.set(5);

window.__demo = { count, doubled, clock, value: get(doubled) };
