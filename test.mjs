#!/usr/bin/env node
// Builds both packages (minified + unminified) and prints bundle sizes.

import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const packages = ['test-svelte-original', 'test-svelte-patched'];

for (const pkg of packages) {
  const cwd = join(here, 'packages', pkg);
  console.log(`\n→ Installing ${pkg}...`);
  execSync('pnpm install', { cwd, stdio: 'inherit' });
  console.log(`→ Building ${pkg}...`);
  execSync('pnpm build', { cwd, stdio: 'inherit' });
}

const size = (pkg, file) =>
  statSync(join(here, 'packages', pkg, 'dist', file)).size;

const raw = packages.map((pkg) => size(pkg, 'bundle.unminified.js'));
const min = packages.map((pkg) => size(pkg, 'bundle.min.js'));
const fmt = (n) => n.toLocaleString();
const pct = (from, to) => (((from - to) / from) * 100).toFixed(1);

const row = (label, a, b) =>
  `  ${label.padEnd(14)}  ${fmt(a).padStart(10)} B   ${fmt(b).padStart(10)} B   ${fmt(a - b).padStart(9)} B   (${pct(a, b).padStart(4)}%)`;

console.log('\n  metric          original         patched       savings');
console.log('  ─────────────────────────────────────────────────────────────');
console.log(row('tree-shaken', raw[0], raw[1]));
console.log(row('minified', min[0], min[1]));
console.log();
console.log('  tree-shaken = bytes webpack kept after tree-shaking, before');
console.log('                terser ran. Shows the sideEffects impact directly.');
console.log('  minified    = realistic production output. Understated here');
console.log('                because terser can DCE most unreachable code in');
console.log('                a tiny self-contained bundle. Scales up in large');
console.log('                apps (a private repo saw ~6 KB minified savings).');
console.log();
