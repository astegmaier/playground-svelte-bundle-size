#!/usr/bin/env node
// Builds all three packages and prints a side-by-side size comparison.

import { execSync } from 'node:child_process';
import { statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const packages = [
  { dir: 'test-svelte-v4', label: 'svelte v4' },
  { dir: 'test-svelte-v5', label: 'svelte v5' },
  { dir: 'test-svelte-v5-patched', label: 'v5 patched' },
];

for (const { dir } of packages) {
  const cwd = join(here, 'packages', dir);
  console.log(`\n→ Installing ${dir}...`);
  execSync('pnpm install', { cwd, stdio: 'inherit' });
  console.log(`→ Building ${dir}...`);
  execSync('pnpm build', { cwd, stdio: 'inherit' });
}

const sumBy = (dir, suffix) => {
  const out = join(here, 'packages', dir, 'dist');
  return readdirSync(out)
    .filter((f) => f.endsWith(suffix))
    .reduce((sum, f) => sum + statSync(join(out, f)).size, 0);
};

const raw = packages.map((p) => sumBy(p.dir, '.unminified.js'));
const min = packages.map((p) => sumBy(p.dir, '.min.js'));

const fmt = (n) => n.toLocaleString();
const deltaFrom = (base, value) => {
  const d = value - base;
  const sign = d > 0 ? '+' : d < 0 ? '−' : ' ';
  const pct = base === 0 ? '—' : `${((d / base) * 100).toFixed(1)}%`;
  return `${sign}${fmt(Math.abs(d)).padStart(8)} B (${pct})`;
};

const header = ` metric        ` + packages.map((p) => p.label.padStart(18)).join('');
console.log('\n' + header);
console.log(' ' + '─'.repeat(header.length - 1));

const sizeRow = (label, sizes) =>
  ` ${label.padEnd(13)} ` +
  sizes.map((s) => `${fmt(s).padStart(10)} B      `).join('').trimEnd();
console.log(sizeRow('tree-shaken', raw));
console.log(sizeRow('minified', min));

console.log('\n  vs. svelte v4 baseline (minified):');
for (let i = 0; i < packages.length; i++) {
  console.log(`    ${packages[i].label.padEnd(14)} ${deltaFrom(min[0], min[i])}`);
}

console.log('\n  vs. svelte v5 unpatched (minified):');
for (let i = 0; i < packages.length; i++) {
  console.log(`    ${packages[i].label.padEnd(14)} ${deltaFrom(min[1], min[i])}`);
}
console.log();
