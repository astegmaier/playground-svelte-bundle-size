# playground-svelte-bundle-size

Minimal reproduction demonstrating the bundle-size impact of adding a
`"sideEffects"` field to Svelte's `package.json`. The change is upstream
candidate work — see the motivation section below.

## TL;DR

Two identical packages bundle `svelte/store` with webpack. They differ in
one thing: `test-svelte-patched` applies a `pnpm patch` to Svelte's
`package.json` that declares most of the package as side-effect-free.
That single change lets webpack tree-shake the unused parts of Svelte's
v5 runtime.

```
  metric          original         patched       savings
  ─────────────────────────────────────────────────────────────
  tree-shaken        275,329 B       37,610 B     237,719 B   (86.3%)
  minified             2,653 B        2,214 B         439 B   (16.5%)
```

The **tree-shaken** row is the direct signature of the patch working:
webpack drops 237 KB of Svelte source from the module graph. The
**minified** delta is smaller here because terser can eliminate most
unreachable code in a tiny, fully-inlineable demo bundle. The same
mechanism saves ~6 KB minified in a real-world app (see the private
repo measurements below).

## Run it

```bash
pnpm test
```

That script:

1. Runs `pnpm install` in each package (applies the patch for the
   patched one — you can verify with
   `cat packages/test-svelte-patched/node_modules/svelte/package.json`).
2. Runs `webpack --mode production` twice per package — once with
   minification off (to reveal the tree-shaking effect), once with it
   on (realistic production output).
3. Prints a side-by-side comparison.

## Layout

```
playground-svelte-bundle-size/
├── package.json               # root: just a test script
├── test.mjs                   # builds both and prints sizes
├── packages/
│   ├── test-svelte-original/  # plain svelte install
│   │   ├── package.json
│   │   ├── webpack.config.js
│   │   └── src/index.js
│   └── test-svelte-patched/   # same code; pnpm patch on svelte
│       ├── package.json       # ← declares pnpm.patchedDependencies
│       ├── patches/svelte@5.55.4.patch
│       ├── webpack.config.js
│       └── src/index.js
```

Each package is its own independent `pnpm` project (no workspace). This
keeps the two dependency graphs cleanly separate so the patch on one
can't leak into the other.

## The patch

`packages/test-svelte-patched/patches/svelte@5.55.4.patch`:

```diff
--- a/package.json
+++ b/package.json
@@ -19,6 +19,12 @@
   ],
   "module": "src/index-client.js",
   "main": "src/index-client.js",
+  "sideEffects": [
+    "./src/internal/disclose-version.js",
+    "./src/internal/flags/legacy.js",
+    "./src/internal/flags/async.js",
+    "./src/internal/flags/tracing.js"
+  ],
   "exports": {
```

This says: **every file in Svelte is side-effect-free, except these four
flag-setting modules.** The four exceptions mutate globals at import time
(`disclose-version.js` writes `window.__svelte`; the flag files toggle
runtime modes), so they must be preserved even when no one imports their
named exports.

### Why this claim is safe

Svelte's own CI already runs
[`check-treeshakeability.js`](https://github.com/sveltejs/svelte/blob/main/packages/svelte/scripts/check-treeshakeability.js)
before each publish. It walks `package.json#exports`, bundles
`import "svelte/<entry>"` through Rollup, and fails if the result isn't
empty. The upstream contract matches the `sideEffects` declaration
exactly — the patch just tells webpack what Rollup's CI has been
enforcing all along.

## What the usage in `src/index.js` demonstrates

The demo mirrors how a private repo uses Svelte: only as a reactive
store library, called from non-Svelte code. Zero `.svelte` files. The
consumers (`auth`, `router`, `theme`, `clock`) each use a subset of
`writable` / `readable` / `derived` / `get` — the same four functions
the real codebase imports.

## Why the numbers differ between minified and tree-shaken

- **Tree-shaken** (275 KB → 38 KB): the raw webpack output before terser.
  Shows exactly which modules the bundler kept. The patch reduces Svelte
  source going into the bundle from 241 KB to 33 KB. This is the
  sideEffects mechanism doing its job.
- **Minified** (2.6 KB → 2.2 KB): after terser. In a tiny self-contained
  demo like this, terser can prove most of the unused code unreachable
  through inlining alone, so the sideEffects hint adds only a marginal
  improvement. Terser can't do this in a large app with many modules,
  chunks, and consumer variations.

## Real-world validation

A private repo applies the same conceptual fix via webpack `module.rules`
(a downstream workaround equivalent to this upstream patch). Measured in
its production chunk that bundles `svelte/store`:

| Build                | Chunk size | vs baseline |
|----------------------|-----------:|------------:|
| Svelte v4 (baseline) | 38,255 B   | —           |
| Svelte v5, no fix    | 43,887 B   | +5,632 B    |
| **Svelte v5, fixed** | **37,858 B** | **−397 B**  |

The upstream `sideEffects` patch would save ~6 KB minified there and let
them delete the downstream webpack-rules workaround.

## Proposed upstream PR

This patch could go directly into
[`sveltejs/svelte`](https://github.com/sveltejs/svelte) at
`packages/svelte/package.json`. It's a ~5-line change with:

- A pre-existing CI contract (`check-treeshakeability.js`) that already
  enforces the invariant it declares.
- No runtime code changes.
- Universal bundler support — webpack, Rollup, Vite, esbuild all honor
  the `sideEffects` array form.

Existing issue for context (still open, not "no fix planned"):
[sveltejs/svelte#13855](https://github.com/sveltejs/svelte/issues/13855).
